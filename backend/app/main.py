"""FastAPI application and fitted model lifespan."""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .api.errors import error_response, register_error_handlers
from .api.routes import PROJECT_NAME, router
from .config import Settings
from .services.model_loader import ModelLoadError
from .services.prediction import PredictionService


logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_environment()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        try:
            app.state.prediction_service = PredictionService(settings.model_path)
        except ModelLoadError:
            logger.error("Trusted model could not be loaded. Prediction service unavailable.")
        try:
            yield
        finally:
            app.state.prediction_service = None

    app = FastAPI(
        title=PROJECT_NAME,
        version="1.0.0",
        description="Stateless inference API for an academic prototype. Swagger examples use verified synthetic fixtures.",
        lifespan=lifespan,
    )
    app.state.prediction_service = None
    register_error_handlers(app)

    @app.middleware("http")
    async def safe_error_boundary(request: Request, call_next):
        try:
            return await call_next(request)
        except Exception:
            logger.error("Unexpected API request failure.")
            return error_response(500, "internal_error", "The request could not be completed.")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )
    app.include_router(router)
    return app


app = create_app()
