"""Load and verify the original fitted model bundle."""

from dataclasses import dataclass
from hashlib import sha256
from io import BytesIO
from pathlib import Path

import joblib
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.utils.validation import check_is_fitted
from xgboost import XGBClassifier

from .validation import FEATURE_NAMES, FEATURES, INTEGER_FIELDS, SCHEMA


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MODEL_PATH = PROJECT_ROOT / "artifacts/patient_readmission_model.pkl"
TRUSTED_SHA256 = "b02e31c9b52df551202a0378e4539bc01ac666c17675dffd011490f9370eaad6"
TRANSFORMED_WIDTH = SCHEMA["transformed_width_reported"]
CLASS_IDS = tuple(item["id"] for item in SCHEMA["target_classes"])


class ModelLoadError(RuntimeError):
    """The trusted inference artifact could not be loaded."""


@dataclass(frozen=True)
class ModelBundle:
    preprocessor: ColumnTransformer
    model: XGBClassifier
    checksum: str


def load_model_bundle(path: str | Path = DEFAULT_MODEL_PATH) -> ModelBundle:
    """Read, authenticate and deserialize the same bytes, then verify fitted metadata."""
    artifact = PROJECT_ROOT / Path(path)
    try:
        contents = artifact.read_bytes()
    except FileNotFoundError as error:
        raise ModelLoadError(f"Model artifact is missing: {artifact}") from error
    except OSError as error:
        raise ModelLoadError(f"Model artifact could not be read: {artifact}") from error
    digest = sha256(contents).hexdigest()
    if digest != TRUSTED_SHA256:
        raise ModelLoadError("Model checksum mismatch. The artifact is corrupted or differs from the trusted export.")
    if SCHEMA["artifact_sha256"] != digest:
        raise ModelLoadError("Feature schema checksum differs from the trusted model checksum.")
    try:
        bundle = joblib.load(BytesIO(contents))
    except Exception as error:
        raise ModelLoadError("Trusted model artifact could not be deserialized with this runtime.") from error

    try:
        if not isinstance(bundle, dict) or set(bundle) != {"preprocessor", "model"}:
            raise ValueError("Expected preprocessor and model bundle keys.")
        preprocessor, model = bundle["preprocessor"], bundle["model"]
        if not isinstance(preprocessor, ColumnTransformer) or not isinstance(model, XGBClassifier):
            raise ValueError("Expected a ColumnTransformer and XGBClassifier.")
        check_is_fitted(preprocessor)
        check_is_fitted(model)
        if preprocessor.n_features_in_ != 47 or tuple(preprocessor.feature_names_in_) != FEATURE_NAMES:
            raise ValueError("Raw feature names or order differ from the verified schema.")
        encoder = preprocessor.named_transformers_["categorical"]
        string_fields = [field for field in FEATURES if field["type"] == "string"]
        if (
            not isinstance(encoder, OneHotEncoder)
            or encoder.handle_unknown != "ignore"
            or list(encoder.feature_names_in_) != [field["column"] for field in string_fields]
            or [list(values) for values in encoder.categories_]
            != [field["supported_categorical_values"] for field in string_fields]
        ):
            raise ValueError("Fitted categorical encoder differs from the verified schema.")
        if preprocessor.remainder != "passthrough" or tuple(preprocessor.transformers_[-1][2]) != INTEGER_FIELDS:
            raise ValueError("Integer passthrough differs from the verified schema.")
        if len(preprocessor.get_feature_names_out()) != TRANSFORMED_WIDTH or model.get_booster().num_features() != TRANSFORMED_WIDTH:
            raise ValueError("Transformer and classifier must agree on 2,396 transformed features.")
        if tuple(model.classes_) != CLASS_IDS:
            raise ValueError("Fitted class order differs from the verified schema.")
    except (AttributeError, IndexError, KeyError, TypeError, ValueError) as error:
        raise ModelLoadError(f"Incompatible fitted model bundle. {error}") from error
    return ModelBundle(preprocessor, model, digest)
