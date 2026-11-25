"""Offline tests using the original fitted bundle and Phase 2 synthetic fixtures."""

import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd
from scipy.sparse import issparse
import xgboost as xgb

from backend.app.services.model_loader import ModelLoadError, TRUSTED_SHA256, load_model_bundle
from backend.app.services.prediction import PredictionError, PredictionService, predict_patient
from backend.app.services.preprocessing import preprocess_patients
from backend.app.services.validation import FEATURE_NAMES, InputValidationError, validate_patient


ROOT = Path(__file__).resolve().parents[2]
FIXTURES = json.loads((ROOT / "docs/phase2-verification.json").read_text(encoding="utf-8"))[
    "synthetic_predictions"
]
MEASURED, MISSING = [fixture["synthetic_input"] for fixture in FIXTURES]


class InferenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.service = PredictionService()

    def test_loads_original_fitted_model(self):
        self.assertEqual(self.service.bundle.checksum, TRUSTED_SHA256)
        self.assertEqual(tuple(self.service.bundle.preprocessor.feature_names_in_), FEATURE_NAMES)
        self.assertEqual(self.service.bundle.model.get_booster().num_features(), 2396)

    def test_missing_model(self):
        with TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ModelLoadError, "artifact is missing"):
                load_model_bundle(Path(directory) / "missing.pkl")

    def test_corrupted_model_rejected_before_deserialization(self):
        with TemporaryDirectory() as directory:
            file = Path(directory) / "corrupt.pkl"
            file.write_bytes(b"invalid")
            with patch("backend.app.services.model_loader.joblib.load") as deserialize:
                with self.assertRaisesRegex(ModelLoadError, "checksum mismatch"):
                    load_model_bundle(file)
                deserialize.assert_not_called()

    def test_service_loads_once(self):
        with patch("backend.app.services.prediction.load_model_bundle", return_value=self.service.bundle) as load:
            service = PredictionService()
            service.predict_patient(MEASURED)
            service.predict_patient(MISSING)
            load.assert_called_once()

    def test_all_features_validate_in_fitted_order(self):
        reversed_input = dict(reversed(list(MEASURED.items())))
        result = validate_patient(reversed_input)
        self.assertEqual(len(result), 47)
        self.assertEqual(tuple(result), FEATURE_NAMES)
        self.assertEqual(result, MEASURED)

    def test_missing_required_field(self):
        record = MISSING.copy()
        del record["A1Cresult"]
        with self.assertRaisesRegex(InputValidationError, "A1Cresult"):
            validate_patient(record)

    def test_unexpected_field(self):
        with self.assertRaisesRegex(InputValidationError, "Unexpected"):
            validate_patient(MEASURED | {"patient_id": "synthetic"})

    def test_invalid_categorical_values(self):
        for change in ({"gender": "unknown category"}, {"diag_1": 250}, {"race": None}):
            with self.subTest(change=change), self.assertRaises(InputValidationError):
                validate_patient(MEASURED | change)

    def test_invalid_numerical_values(self):
        for value in (-1, 1.0, "1", True, None, float("inf"), float("nan"), 2**63):
            with self.subTest(value=value), self.assertRaisesRegex(InputValidationError, "num_procedures"):
                validate_patient(MEASURED | {"num_procedures": value})

    def test_missing_value_handling(self):
        record = validate_patient(MISSING)
        self.assertIsNone(record["A1Cresult"])
        self.assertIsNone(record["max_glu_serum"])
        self.assertEqual(record["diag_1"], "?")
        explicit = record | {"A1Cresult": "Not measured", "max_glu_serum": "Not measured"}
        expected = self.service.predict_patient(explicit)
        self.assertEqual(self.service.predict_patient(record), expected)

    def test_transform_width_and_representation(self):
        matrix = preprocess_patients([validate_patient(MEASURED)], self.service.bundle.preprocessor)
        self.assertEqual(matrix.shape, (1, 2396))
        self.assertTrue(issparse(matrix))

    def test_phase2_predictions_and_probability_mapping(self):
        readable = {0: "No recorded readmission", 1: "Readmitted after 30 days", 2: "Early readmission"}
        for fixture in FIXTURES:
            with self.subTest(fixture=fixture["fixture"]):
                result = self.service.predict_patient(fixture["synthetic_input"])
                self.assertEqual(result["predicted_class"], fixture["predicted_id"])
                self.assertEqual(result["outcome_label"], fixture["predicted_token"])
                self.assertEqual(result["category"], readable[result["predicted_class"]])
                self.assertEqual(result["model_name"], "Balanced XGBoost")
                probabilities = result["probabilities"]
                self.assertEqual([item["class_id"] for item in probabilities], [0, 1, 2])
                self.assertEqual([item["outcome_label"] for item in probabilities], ["NO", ">30", "<30"])
                scores = [item["score"] for item in probabilities]
                self.assertTrue(all(0 <= score <= 1 for score in scores))
                self.assertAlmostEqual(sum(scores), 1, delta=1e-6)
                np.testing.assert_allclose(scores, fixture["uncalibrated_scores_in_class_order"], atol=1e-6, rtol=0)

    def test_single_and_batch_consistency(self):
        results = self.service.predict_batch([MEASURED, MISSING])
        for result, record in zip(results, (MEASURED, MISSING), strict=True):
            single = self.service.predict_patient(record)
            self.assertEqual(result["predicted_class"], single["predicted_class"])
            np.testing.assert_allclose(
                [item["score"] for item in result["probabilities"]],
                [item["score"] for item in single["probabilities"]], atol=1e-6, rtol=0,
            )

    def test_direct_inference_parity(self):
        bundle = self.service.bundle
        records = [MEASURED, MISSING]
        direct = pd.DataFrame(records, columns=bundle.preprocessor.feature_names_in_)
        direct["A1Cresult"] = direct["A1Cresult"].fillna("Not measured")
        direct["max_glu_serum"] = direct["max_glu_serum"].fillna("Not measured")
        matrix = bundle.preprocessor.transform(direct)
        direct_labels = bundle.model.predict(matrix)
        direct_scores = bundle.model.predict_proba(matrix)
        booster_scores = bundle.model.get_booster().predict(xgb.DMatrix(matrix))
        results = self.service.predict_batch(records)
        labels = [item["predicted_class"] for item in results]
        scores = [[item["score"] for item in row["probabilities"]] for row in results]
        np.testing.assert_array_equal(labels, direct_labels)
        np.testing.assert_allclose(scores, direct_scores, atol=1e-6, rtol=0)
        np.testing.assert_allclose(scores, booster_scores, atol=1e-6, rtol=0)

    def test_repeated_prediction_and_json_serialization(self):
        first = predict_patient(MEASURED)
        self.assertEqual(first, predict_patient(MEASURED))
        self.assertEqual(first, json.loads(json.dumps(first, allow_nan=False)))

    def test_prediction_failure_has_clear_error(self):
        with patch.object(self.service.bundle.model, "predict", side_effect=ValueError):
            with self.assertRaisesRegex(PredictionError, "could not generate predictions"):
                self.service.predict_patient(MEASURED)
