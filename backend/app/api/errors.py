"""Translate internal errors to payload-safe API responses."""

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from ..services.prediction import PredictionError
from ..services.preprocessing import PreprocessingError
from ..services.validation import FEATURE_SET, InputValidationError


class ModelUnavailableError(RuntimeError):
    """Inference is unavailable until the model has loaded."""


def error_response(status, code, message, fields=(), headers=None):
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "fields": list(fields)}},
        headers=headers,
    )


def register_error_handlers(app):
    @app.exception_handler(RequestValidationError)
    async def request_error(request: Request, error: RequestValidationError):
        issues = error.errors()
        if any(issue["type"] == "json_invalid" for issue in issues):
            return error_response(400, "invalid_json", "Request body contains malformed JSON.")
        fields = dict.fromkeys(
            part for issue in issues for part in issue["loc"]
            if isinstance(part, str) and part in FEATURE_SET
        )
        return error_response(422, "invalid_input", "Request does not match the required patient fields and types.", fields)

    @app.exception_handler(InputValidationError)
    async def input_error(request: Request, error: InputValidationError):
        return error_response(422, "invalid_input", str(error))

    @app.exception_handler(ModelUnavailableError)
    async def unavailable(request: Request, error: ModelUnavailableError):
        return error_response(503, "model_unavailable", "The prediction model is unavailable.")

    @app.exception_handler(PreprocessingError)
    @app.exception_handler(PredictionError)
    async def inference_error(request: Request, error: Exception):
        return error_response(500, "inference_failed", "The prediction could not be completed.")

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, error: HTTPException):
        return error_response(error.status_code, "http_error", "The request could not be completed.", headers=error.headers)
