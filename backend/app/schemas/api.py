"""Request and response contracts for the HTTP boundary."""

from typing import Literal, NotRequired, TypedDict

from pydantic import BaseModel, ConfigDict, Field, create_model

from ..services.validation import FEATURES


def patient_field(field):
    name = field["column"]
    label = field["display_name"]
    if field["type"] == "integer":
        return int, Field(alias=name, description=label, ge=0, le=2**63 - 1)
    annotation = str
    if field["validation"]["nullable"]:
        annotation = annotation | None
    return annotation, Field(alias=name, description=label)


PatientRequest = create_model(
    "PatientRequest",
    __config__=ConfigDict(extra="forbid", strict=True),
    **{f"field_{index}": patient_field(field) for index, field in enumerate(FEATURES)},
)

Outcome = Literal["NO", ">30", "<30"]
ClassId = Literal[0, 1, 2]


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    model_ready: bool
    service_available: bool


class OutcomeClass(BaseModel):
    class_id: ClassId
    outcome_label: Outcome
    category: str


class HistoricalEvaluation(BaseModel):
    status: Literal["recorded_not_independently_reproduced"]
    source: str
    cells: list[int]
    holdout_encounters: int
    accuracy: float
    early_readmission_precision: float
    early_readmission_recall: float
    early_readmission_f1: float


class ModelInfoResponse(BaseModel):
    project_name: str
    model_name: str
    model_sha256: str
    input_feature_count: int
    transformed_feature_count: int
    outcome_classes: list[OutcomeClass]
    historical_evaluation: HistoricalEvaluation
    disclaimer: str


class MissingValueRule(TypedDict):
    token: str | None
    action: Literal["reject_null", "replace_null", "preserve_literal_marker"]


class FieldValidation(TypedDict):
    rule: str
    nullable: bool
    required: bool


class FeatureDefinition(TypedDict):
    position: int
    column: str
    display_name: str
    type: Literal["string", "integer"]
    section: str
    supported_categorical_values: list[str] | None
    vocabulary_status: str
    missing: MissingValueRule
    validation: FieldValidation
    reference_codes: NotRequired[dict[str, str]]
    reference_code_source: NotRequired[str]


class FeatureOutcome(TypedDict):
    id: ClassId
    token: Outcome


class FeatureSchema(TypedDict):
    schema_version: str
    status: Literal["verified"]
    source: str
    artifact_sha256: str
    transformed_width_reported: int
    target_classes: list[FeatureOutcome]
    features: list[FeatureDefinition]


class SamplePatientResponse(BaseModel):
    fixture: str
    synthetic: Literal[True]
    patient: PatientRequest


class Probability(BaseModel):
    class_id: ClassId
    outcome_label: Outcome
    score: float = Field(ge=0, le=1)


class PredictionResponse(BaseModel):
    predicted_class: ClassId
    outcome_label: Outcome
    category: str
    probabilities: list[Probability] = Field(min_length=3, max_length=3)
    model_name: str
    disclaimer: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    fields: list[str] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    error: ErrorDetail
