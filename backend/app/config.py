"""Process configuration for the local inference API."""

from dataclasses import dataclass
import os
from pathlib import Path

from .services.model_loader import DEFAULT_MODEL_PATH


@dataclass(frozen=True)
class Settings:
    model_path: Path = DEFAULT_MODEL_PATH
    allowed_origins: tuple[str, ...] = ("http://localhost:3000",)

    @classmethod
    def from_environment(cls):
        model_path = Path(os.getenv("READMISSION_MODEL_PATH") or DEFAULT_MODEL_PATH)
        origins = os.getenv("READMISSION_ALLOWED_ORIGINS", "http://localhost:3000")
        allowed_origins = tuple(origin.strip() for origin in origins.split(",") if origin.strip())
        if "*" in allowed_origins:
            raise ValueError("Configure explicit CORS origins without a wildcard.")
        return cls(model_path=model_path, allowed_origins=allowed_origins)
