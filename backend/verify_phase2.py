"""Verify the original fitted bundle offline and write structured evidence."""

import hashlib
import importlib
import importlib.metadata
import json
from datetime import datetime, timezone
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / "artifacts/patient_readmission_model.pkl"
SCHEMA = ROOT / "backend/app/schemas/features.json"
REPORT = ROOT / "docs/phase2-verification.json"
TRUSTED_SHA256 = "b02e31c9b52df551202a0378e4539bc01ac666c17675dffd011490f9370eaad6"
CLASS_TOKENS = {0: "NO", 1: ">30", 2: "<30"}
LAB_FIELDS = {"max_glu_serum", "A1Cresult"}
INTEGER_FIXTURE = {
    "admission_type_id": 1,
    "discharge_disposition_id": 1,
    "admission_source_id": 7,
    "time_in_hospital": 3,
    "num_lab_procedures": 35,
    "num_procedures": 1,
    "num_medications": 10,
    "number_outpatient": 0,
    "number_emergency": 0,
    "number_inpatient": 0,
    "number_diagnoses": 5,
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def verify(report):
    report["stage"] = "runtime"
    require(sys.version_info[:3] == (3, 13, 7), "Expected Python 3.13.7")
    pins = dict(
        line.split("==", 1)
        for line in (ROOT / "backend/requirements.txt").read_text().splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    )
    report["dependencies"] = {}
    for name, expected in pins.items():
        installed = importlib.metadata.version(name)
        evidence = {"expected": expected, "installed": installed, "imported": False}
        report["dependencies"][name] = evidence
        require(installed == expected, f"{name} must be {expected}, found {installed}")
        module = importlib.import_module("sklearn" if name == "scikit-learn" else name)
        evidence["imported"] = True
        require(
            getattr(module, "__version__", installed) == expected,
            f"{name} import version differs from its pin",
        )

    import joblib
    import numpy as np
    import pandas as pd
    import xgboost as xgb
    from sklearn.compose import ColumnTransformer
    from sklearn.preprocessing import OneHotEncoder
    from sklearn.utils.validation import check_is_fitted

    report["stage"] = "trusted_bundle"
    digest = hashlib.sha256(ARTIFACT.read_bytes()).hexdigest()
    report["artifact_sha256"] = digest
    require(digest == TRUSTED_SHA256, "Artifact checksum differs from trusted export")
    bundle = joblib.load(ARTIFACT)
    require(isinstance(bundle, dict) and set(bundle) == {"preprocessor", "model"},
            "Unexpected bundle structure")
    preprocessor, model = bundle["preprocessor"], bundle["model"]
    require(isinstance(preprocessor, ColumnTransformer), "Expected ColumnTransformer")
    require(isinstance(model, xgb.XGBClassifier), "Expected XGBClassifier")
    check_is_fitted(preprocessor)
    check_is_fitted(model)
    booster = model.get_booster()
    expected_params = {
        "n_estimators": 100, "max_depth": 5, "learning_rate": 0.1,
        "objective": "multi:softprob", "eval_metric": "mlogloss",
        "random_state": 42, "n_jobs": -1,
    }
    params = {key: model.get_params().get(key) for key in expected_params}
    require(params == expected_params, f"Unexpected notebook model parameters: {params}")
    require(booster.num_boosted_rounds() == 100, "Unexpected fitted boosting rounds")
    report["bundle"] = {
        "preprocessor": type(preprocessor).__name__,
        "model": type(model).__name__,
        "parameters": params,
        "fit_identity": "Trusted export SHA-256 and canonical notebook parameters",
    }

    report["stage"] = "schema"
    draft = json.loads(SCHEMA.read_text(encoding="utf-8-sig"))
    features = draft["features"]
    columns = [field["column"] for field in features]
    require(len(columns) == len(set(columns)) == preprocessor.n_features_in_ == 47,
            "Expected 47 distinct raw features")
    require(list(preprocessor.feature_names_in_) == columns, "Raw feature order differs")
    string_fields = [field["column"] for field in features if field["type"] == "string"]
    integer_fields = [field["column"] for field in features if field["type"] == "integer"]
    require(len(string_fields) == 36 and set(integer_fields) == set(INTEGER_FIXTURE),
            "Unexpected raw feature types")
    fitted = [(transformer, list(names)) for name, transformer, names in preprocessor.transformers_
              if len(names)]
    encoders = [(transformer, names) for transformer, names in fitted
                if isinstance(transformer, OneHotEncoder)]
    require(len(fitted) == 2 and len(encoders) == 1, "Unexpected fitted transformer branches")
    encoder, encoded_names = encoders[0]
    require(encoded_names == string_fields and encoder.handle_unknown == "ignore",
            "Unexpected one-hot encoder inputs or unknown handling")
    numeric_names = next(names for transformer, names in fitted
                         if not isinstance(transformer, OneHotEncoder))
    require(numeric_names == integer_fields and (preprocessor.remainder == "passthrough" or any(
        transformer == "passthrough" and list(names) == integer_fields
        for _, transformer, names in preprocessor.transformers if isinstance(transformer, str)
    )), "Integer features do not pass through in the expected order")
    require(len(encoder.categories_) == 36, "Expected 36 fitted category lists")
    categories = dict(zip(encoded_names, map(list, encoder.categories_), strict=True))
    for name, values in categories.items():
        require(values and all(isinstance(value, str) for value in values),
                f"{name} is missing fitted string categories")
    for field in features:
        name = field["column"]
        action = field["missing"]["action"]
        if name in categories:
            require(field["supported_categorical_values"] == categories[name],
                    f"{name} published categories differ from the fitted encoder")
        if action == "preserve_literal_marker":
            require("?" in categories[name], f"{name} lacks fitted literal '?'")
        if name in LAB_FIELDS:
            require(field["validation"]["nullable"] and action == "replace_null"
                    and field["missing"]["token"] == "Not measured"
                    and "Not measured" in categories[name],
                    f"{name} lacks notebook lab normalization support")
        else:
            require(not field["validation"]["nullable"], f"Unexpected nullable feature: {name}")
    width = len(preprocessor.get_feature_names_out())
    require(width == booster.num_features() == draft["transformed_width_reported"] == 2396,
            "Transformed feature width differs from 2,396")
    classes = [int(value) for value in model.classes_]
    require(classes == list(CLASS_TOKENS), f"Unexpected fitted class order: {classes}")
    require({item["id"]: item["token"] for item in draft["target_classes"]} == CLASS_TOKENS,
            "Draft outcome tokens differ from the notebook mapping")
    report["schema"] = {
        "feature_order": columns,
        "integer_passthrough": integer_fields,
        "categorical_values": categories,
        "missing_rules": {field["column"]: field["missing"] for field in features},
        "transformed_width": width,
        "probability_columns": [{"id": value, "token": CLASS_TOKENS[value]} for value in classes],
    }

    report["stage"] = "synthetic_inference"
    observed = {
        name: next((value for value in values if value not in {"?", "Not measured"}), values[0])
        for name, values in categories.items()
    }
    missing = observed.copy()
    for field in features:
        name = field["column"]
        if field["missing"]["action"] == "preserve_literal_marker":
            missing[name] = "?"
    for name in LAB_FIELDS:
        require(observed[name] != "Not measured", f"{name} lacks a measured category")
        missing[name] = None
    fixtures = {"synthetic_measured_labs": observed | INTEGER_FIXTURE,
                "synthetic_missing_labs_and_markers": missing | INTEGER_FIXTURE}
    normalized = pd.DataFrame.from_records(list(fixtures.values()), columns=columns)
    for name in LAB_FIELDS:
        normalized[name] = normalized[name].fillna("Not measured")
    require(all(pd.api.types.is_integer_dtype(normalized[name]) for name in integer_fields),
            "Synthetic input lost integer dtypes")
    matrix = preprocessor.transform(normalized)
    require(matrix.shape == (len(fixtures), width), "Unexpected batch transform dimensions")
    numeric_matrix = matrix[:, -len(integer_fields):]
    if hasattr(numeric_matrix, "toarray"):
        numeric_matrix = numeric_matrix.toarray()
    np.testing.assert_array_equal(numeric_matrix, normalized[integer_fields].to_numpy())
    batch_labels = model.predict(matrix)
    batch_scores = model.predict_proba(matrix)
    require(batch_scores.shape == (len(fixtures), len(classes)), "Unexpected probability shape")
    require(np.all(np.isfinite(batch_scores)) and np.all((0 <= batch_scores) & (batch_scores <= 1)),
            "Invalid probabilities")
    np.testing.assert_allclose(batch_scores.sum(axis=1), 1, rtol=0, atol=1e-6)
    np.testing.assert_array_equal(batch_labels, np.asarray(classes)[batch_scores.argmax(axis=1)])
    booster_scores = booster.predict(xgb.DMatrix(matrix))
    np.testing.assert_allclose(batch_scores, booster_scores, rtol=0, atol=1e-6)

    report["synthetic_predictions"] = []
    for index, (name, raw) in enumerate(fixtures.items()):
        direct = {key: "Not measured" if key in LAB_FIELDS and value is None else value
                  for key, value in raw.items()}
        row = pd.DataFrame({key: [direct[key]] for key in columns})
        transformed = preprocessor.transform(row)
        require(transformed.shape == (1, width), "Unexpected single-row transform dimensions")
        np.testing.assert_array_equal(model.predict(transformed), batch_labels[index:index + 1])
        np.testing.assert_allclose(model.predict_proba(transformed)[0], batch_scores[index],
                                   rtol=0, atol=1e-6)
        label = int(batch_labels[index])
        report["synthetic_predictions"].append({
            "fixture": name, "synthetic_input": raw, "predicted_id": label,
            "predicted_token": CLASS_TOKENS[label],
            "uncalibrated_scores_in_class_order": batch_scores[index].tolist(),
        })
    report["parity"] = {
        "single_row_vs_batch": "passed",
        "classifier_vs_direct_booster": "passed",
        "absolute_tolerance": 1e-6,
    }


def main():
    report = {"status": "failed", "timestamp_utc": datetime.now(timezone.utc).isoformat(),
              "python": sys.version, "executable": sys.executable,
              "historical_evaluation": "deferred"}
    try:
        verify(report)
    except Exception as error:
        report["error"] = {"type": type(error).__name__, "message": str(error)}
    else:
        report.update(status="passed", stage="complete")
    temporary = REPORT.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temporary.replace(REPORT)
    print(f"{report['status']}: {REPORT}")
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
