"""Inference for the patient-group evaluated short diabetes discharge model."""
import base64
import logging
import os
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import numpy as np
from xgboost.core import XGBoostError
from xgboost import XGBClassifier

from ..api.errors import ModelUnavailableError
from .prediction import CATEGORY_NAMES, CLASS_TOKENS
from .validation import InputValidationError

ROOT = Path(__file__).resolve().parents[3]


@lru_cache(maxsize=1)
def load_short_model():
    try:
        meta = json.loads((ROOT / "docs/diabetes-short-v1.json").read_text())
        secret_path = os.environ.get("READMISSION_SHORT_MODEL_B64_FILE")
        if secret_path:
            encoded = Path(secret_path).read_bytes()
            data = base64.b64decode(b"".join(encoded.split()), validate=True)
        else:
            data = (ROOT / "artifacts/diabetes-short-v1.ubj").read_bytes()
        if hashlib.sha256(data).hexdigest() != meta["model_sha256"]:
            logging.getLogger(__name__).error("Short model checksum mismatch.")
            raise ModelUnavailableError
        model = XGBClassifier()
        model.load_model(bytearray(data))
        return meta, model
    except (OSError, ValueError, XGBoostError, KeyError) as error:
        logging.getLogger(__name__).error("Short model load failed (%s).", type(error).__name__)
        raise ModelUnavailableError from error


def short_prediction(answers):
    meta, model = load_short_model()
    if set(answers) != set(meta["fields"]):
        raise InputValidationError("Complete every question using the current assessment.")
    for name, value in answers.items():
        if name in meta["bounds"]:
            low, high = meta["bounds"][name]
            if type(value) is not int or not low <= value <= high:
                raise InputValidationError(f"{name} must be a whole number from {low} to {high}.")
        if name in meta["allowed"] and value not in meta["allowed"][name]:
            raise InputValidationError(f"Unsupported answer for {name}.")
    vector = []
    for column in meta["columns"]:
        field, separator, category = column.partition("=")
        vector.append(str(answers[field]) == category if separator else answers[field])
    scores = model.predict_proba(np.array([vector], dtype=float))[0]
    index = int(scores.argmax())
    token = CLASS_TOKENS[index]
    return dict(predicted_class=index, outcome_label=token, category=CATEGORY_NAMES[token],
                probabilities=[dict(class_id=i, outcome_label=CLASS_TOKENS[i], score=float(s)) for i, s in enumerate(scores)],
                model_name=meta["version"], disclaimer="Academic prototype. Uncalibrated scores. Do not use for clinical decisions.")
