"""Check private model delivery and endpoint isolation using synthetic requests."""
import base64
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.app.api.routes import FIXTURES, SHORT_EXAMPLE
from backend.app.main import create_app
from backend.app.services.short_prediction import ROOT, load_short_model


class ShortDeploymentTests(unittest.TestCase):
    def test_secret_file_matches_local_predictions_and_fails_closed(self):
        with TemporaryDirectory() as directory, TestClient(create_app()) as client:
            secret = Path(directory) / "model.b64"
            model = (ROOT / "artifacts/diabetes-short-v1.ubj").read_bytes()
            self.addCleanup(load_short_model.cache_clear)
            with patch.dict(os.environ, READMISSION_SHORT_MODEL_B64_FILE=""):
                load_short_model.cache_clear()
                reference = client.post("/api/diabetes/predict", json=SHORT_EXAMPLE)
                self.assertEqual(reference.status_code, 200)
            with patch.dict(os.environ, READMISSION_SHORT_MODEL_B64_FILE=str(secret)):
                secret.write_bytes(base64.encodebytes(model))
                load_short_model.cache_clear()
                self.assertEqual(client.post("/api/diabetes/predict", json=SHORT_EXAMPLE).json(), reference.json())
                for value in [b"invalid!", base64.b64encode(b"wrong artifact"), None]:
                    if value is None:
                        secret.unlink()
                    else:
                        secret.write_bytes(value)
                    load_short_model.cache_clear()
                    failure = client.post("/api/diabetes/predict", json=SHORT_EXAMPLE)
                    self.assertEqual(failure.status_code, 503)
                    self.assertEqual(failure.json()["error"]["code"], "model_unavailable")
                self.assertEqual(client.post("/api/predict", json=FIXTURES[0]["synthetic_input"]).status_code, 200)
