"""Standalone inference with the trusted Balanced XGBoost model."""

from collections.abc import Iterable, Mapping
from pathlib import Path
from threading import Lock

import numpy as np

from .model_loader import DEFAULT_MODEL_PATH, load_model_bundle
from .preprocessing import preprocess_patients
from .validation import SCHEMA, validate_patient


MODEL_NAME = "Balanced XGBoost"
CATEGORY_NAMES = {
    "NO": "No recorded readmission",
    ">30": "Readmitted after 30 days",
    "<30": "Early readmission",
}
CLASS_TOKENS = {item["id"]: item["token"] for item in SCHEMA["target_classes"]}


class PredictionError(RuntimeError):
    """The fitted model could not produce a valid prediction."""


class PredictionService:
    """Load one fitted bundle and reuse it for all predictions on this instance."""

    def __init__(self, model_path: str | Path = DEFAULT_MODEL_PATH):
        self.bundle = load_model_bundle(model_path)

    def predict_patient(self, patient: Mapping[str, object]) -> dict:
        return self.predict_batch([patient])[0]

    def predict_batch(self, patients: Iterable[Mapping[str, object]]) -> list[dict]:
        validated = [validate_patient(patient) for patient in patients]
        if not validated:
            return []
        matrix = preprocess_patients(validated, self.bundle.preprocessor)
        model = self.bundle.model
        try:
            labels = model.predict(matrix)
            scores = model.predict_proba(matrix)
        except Exception as error:
            raise PredictionError("The fitted classifier could not generate predictions.") from error

        classes = tuple(int(value) for value in model.classes_)
        if (
            labels.shape != (len(validated),)
            or scores.shape != (len(validated), len(classes))
            or not np.isin(labels, classes).all()
            or not np.isfinite(scores).all()
            or not ((0 <= scores) & (scores <= 1)).all()
            or not np.allclose(scores.sum(axis=1), 1, atol=1e-6, rtol=0)
        ):
            raise PredictionError("The classifier returned invalid labels or probabilities.")

        results = []
        for label, row in zip(labels, scores, strict=True):
            class_id = int(label)
            token = CLASS_TOKENS[class_id]
            results.append({
                "predicted_class": class_id,
                "category": CATEGORY_NAMES[token],
                "outcome_label": token,
                "probabilities": [
                    {"class_id": key, "outcome_label": CLASS_TOKENS[key], "score": float(score)}
                    for key, score in zip(classes, row, strict=True)
                ],
                "model_name": MODEL_NAME,
            })
        return results


_default_service = None
_default_lock = Lock()


def predict_patient(patient: Mapping[str, object]) -> dict:
    """Predict one encounter using the lazily initialized process-default service."""
    global _default_service
    with _default_lock:
        if _default_service is None:
            _default_service = PredictionService()
        service = _default_service
    return service.predict_patient(patient)
