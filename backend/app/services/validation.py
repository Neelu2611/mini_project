"""Validate raw encounters against the published feature contract."""

from collections.abc import Mapping
import json
from pathlib import Path


SCHEMA = json.loads(
    (Path(__file__).resolve().parents[1] / "schemas/features.json").read_text(encoding="utf-8")
)
FEATURES = tuple(SCHEMA["features"])
FEATURE_NAMES = tuple(field["column"] for field in FEATURES)
FEATURE_SET = frozenset(FEATURE_NAMES)
INTEGER_FIELDS = tuple(field["column"] for field in FEATURES if field["type"] == "integer")
CATEGORIES = {
    field["column"]: frozenset(field["supported_categorical_values"])
    for field in FEATURES if field["type"] == "string"
}
NULL_REPLACEMENTS = {
    field["column"]: field["missing"]["token"]
    for field in FEATURES if field["validation"]["nullable"]
}


class InputValidationError(ValueError):
    """The encounter does not satisfy the verified input contract."""


def validate_patient(patient: Mapping[str, object]) -> dict[str, str | int | None]:
    """Return a validated copy in fitted feature order, retaining explicit nulls."""
    if not isinstance(patient, Mapping):
        raise InputValidationError("Patient input must be a mapping of feature names to values.")
    missing = [name for name in FEATURE_NAMES if name not in patient]
    unexpected = any(key not in FEATURE_SET for key in patient)
    if missing or unexpected:
        issues = []
        if missing:
            issues.append(f"Missing required fields: {', '.join(missing)}")
        if unexpected:
            issues.append("Unexpected fields present")
        raise InputValidationError(". ".join(issues))

    result = {}
    for field in FEATURES:
        name = field["column"]
        value = patient[name]
        if name in CATEGORIES:
            if value is None and name in NULL_REPLACEMENTS:
                result[name] = None
                continue
            if not isinstance(value, str) or value not in CATEGORIES[name]:
                raise InputValidationError(f"{name} must be an exact fitted category.")
        elif type(value) is not int or not 0 <= value <= 2**63 - 1:
            raise InputValidationError(f"{name} must be a nonnegative signed 64-bit integer.")
        result[name] = value
    return result
