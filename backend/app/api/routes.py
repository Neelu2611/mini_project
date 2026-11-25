"""HTTP routes for model metadata and stateless inference."""

import json
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Body, Request, Response

from ..schemas.api import (
    ErrorResponse,
    FeatureSchema,
    HealthResponse,
    ModelInfoResponse,
    PatientRequest,
    PredictionResponse,
    SamplePatientResponse,
)
from ..services.model_loader import TRANSFORMED_WIDTH, TRUSTED_SHA256
from ..services.prediction import CATEGORY_NAMES, CLASS_TOKENS, MODEL_NAME
from ..services.validation import FEATURE_NAMES, SCHEMA
from .errors import ModelUnavailableError


PROJECT_NAME = "Patient Readmission Prediction System"
DISCLAIMER = "Academic prototype. Scores are uncalibrated. Do not use for clinical decisions."
FIXTURES = json.loads(
    (Path(__file__).resolve().parents[3] / "docs/phase2-verification.json").read_text(encoding="utf-8")
)["synthetic_predictions"]
OUTCOMES = [
    {"class_id": key, "outcome_label": token, "category": CATEGORY_NAMES[token]}
    for key, token in CLASS_TOKENS.items()
]
REQUEST_EXAMPLES = {
    item["fixture"]: {
        "summary": f"Verified synthetic fixture: {item['fixture']}",
        "value": item["synthetic_input"],
    }
    for item in FIXTURES
}
FIRST_FIXTURE = FIXTURES[0]
SAMPLE = {
    "fixture": FIRST_FIXTURE["fixture"],
    "synthetic": True,
    "patient": FIRST_FIXTURE["synthetic_input"],
}
PREDICTION_EXAMPLE = {
    "predicted_class": FIRST_FIXTURE["predicted_id"],
    "outcome_label": FIRST_FIXTURE["predicted_token"],
    "category": CATEGORY_NAMES[FIRST_FIXTURE["predicted_token"]],
    "probabilities": [
        {"class_id": key, "outcome_label": token, "score": score}
        for (key, token), score in zip(
            CLASS_TOKENS.items(), FIRST_FIXTURE["uncalibrated_scores_in_class_order"], strict=True
        )
    ],
    "model_name": MODEL_NAME,
    "disclaimer": DISCLAIMER,
}

router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse, responses={
    200: {"content": {"application/json": {"example": {
        "status": "ok", "model_ready": True, "service_available": True,
    }}}},
    503: {"model": HealthResponse},
})
def health(request: Request, response: Response):
    """Report model and service readiness. HTTP 503 indicates failed model startup."""
    ready = request.app.state.prediction_service is not None
    if not ready:
        response.status_code = 503
    return {"status": "ok" if ready else "degraded", "model_ready": ready, "service_available": ready}


@router.get("/model-info", response_model=ModelInfoResponse)
def model_info():
    """Describe the verified model and historical notebook evaluation."""
    return {
        "project_name": PROJECT_NAME,
        "model_name": MODEL_NAME,
        "model_sha256": TRUSTED_SHA256,
        "input_feature_count": len(FEATURE_NAMES),
        "transformed_feature_count": TRANSFORMED_WIDTH,
        "outcome_classes": OUTCOMES,
        "historical_evaluation": {
            "status": "recorded_not_independently_reproduced",
            "source": "notebooks/patient_readmission_review2_backup.ipynb",
            "cells": [185, 211],
            "holdout_encounters": 20354,
            "accuracy": 0.517687,
            "early_readmission_precision": 0.204856,
            "early_readmission_recall": 0.415933,
            "early_readmission_f1": 0.274510,
        },
        "disclaimer": DISCLAIMER,
    }


@router.get("/features", response_model=FeatureSchema)
def features():
    """Return the full verified feature schema in fitted field order."""
    return SCHEMA


@router.get("/sample-patient", response_model=SamplePatientResponse, responses={
    200: {"content": {"application/json": {"example": SAMPLE}}},
})
def sample_patient():
    """Return a measured-lab fixture explicitly identified as synthetic."""
    return SAMPLE


@router.post(
    "/predict",
    response_model=PredictionResponse,
    responses={
        200: {"content": {"application/json": {"examples": {
            "recorded_synthetic_example": {
                "summary": "Recorded reference output (documentation example)",
                "value": PREDICTION_EXAMPLE,
            },
        }}}},
        400: {"model": ErrorResponse, "description": "Malformed JSON"},
        422: {"model": ErrorResponse, "description": "Invalid patient fields or values"},
        503: {"model": ErrorResponse, "description": "Prediction model unavailable"},
        500: {"model": ErrorResponse, "description": "Inference failed"},
    },
)
def predict(request: Request, patient: Annotated[PatientRequest, Body(openapi_examples=REQUEST_EXAMPLES)]):
    """Run a live prediction on one 47-field encounter and return ordered model scores."""
    service = request.app.state.prediction_service
    if service is None:
        raise ModelUnavailableError
    prediction = service.predict_patient(patient.model_dump(by_alias=True))
    return prediction | {"disclaimer": DISCLAIMER}

SHORT_EXAMPLE = {
    "age": "[60-70)", "time_in_hospital": 4, "number_inpatient": 1,
    "number_emergency": 0, "discharge_disposition_id": 1, "number_outpatient": 0,
    "num_medications": 12, "number_diagnoses": 6, "insulin": "Steady", "change": "No",
}


@router.post("/diabetes/predict", response_model=PredictionResponse, responses={503: {"model": ErrorResponse}})
def predict_diabetes(answers: Annotated[dict, Body(openapi_examples={
    "synthetic_discharge": {"summary": "Synthetic ten-question diabetes discharge", "value": SHORT_EXAMPLE}
})]):
    """Predict using only the short discharge questionnaire."""
    from ..services.short_prediction import short_prediction
    return short_prediction(answers)
