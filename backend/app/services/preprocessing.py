"""Prepare validated encounters for the fitted classifier."""

import pandas as pd

from .model_loader import TRANSFORMED_WIDTH
from .validation import FEATURE_NAMES, INTEGER_FIELDS, NULL_REPLACEMENTS


class PreprocessingError(RuntimeError):
    """The fitted transformer could not prepare model input."""


def preprocess_patients(patients, preprocessor):
    """Build an ordered frame and transform it without changing its representation."""
    try:
        frame = pd.DataFrame.from_records(patients, columns=FEATURE_NAMES)
        frame = frame.astype(dict.fromkeys(INTEGER_FIELDS, "int64"))
        for field, token in NULL_REPLACEMENTS.items():
            frame[field] = frame[field].fillna(token)
        transformed = preprocessor.transform(frame)
    except Exception as error:
        raise PreprocessingError("Unable to transform validated patient features.") from error
    if transformed.shape != (len(patients), TRANSFORMED_WIDTH):
        raise PreprocessingError("Transformed input must have 2,396 features per encounter.")
    return transformed
