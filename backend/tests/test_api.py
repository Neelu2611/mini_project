"""Verify FastAPI contracts with the trusted model and synthetic fixtures."""

import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
import numpy as np

from backend.app.api.routes import FIXTURES
from backend.app.config import Settings
from backend.app.main import create_app
from backend.app.services.prediction import PredictionError, PredictionService
from backend.app.services.validation import FEATURE_NAMES, SCHEMA


PATIENT = FIXTURES[0]["synthetic_input"]


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app(Settings())
        cls.client = cls.enterClassContext(TestClient(cls.app))

    def assert_api_error(self, response, status, code):
        self.assertEqual(response.status_code, status, response.text)
        error = response.json()["error"]
        self.assertEqual(error["code"], code)
        self.assertEqual(set(error), {"code", "message", "fields"})
        return error

    def test_health(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "model_ready": True, "service_available": True})

    def test_model_info(self):
        response = self.client.get("/api/model-info")
        self.assertEqual(response.status_code, 200)
        info = response.json()
        self.assertEqual(info["model_name"], "Balanced XGBoost")
        self.assertEqual(info["model_sha256"], SCHEMA["artifact_sha256"])
        self.assertEqual((info["input_feature_count"], info["transformed_feature_count"]), (47, 2396))
        self.assertEqual([item["outcome_label"] for item in info["outcome_classes"]], ["NO", ">30", "<30"])
        self.assertEqual(info["historical_evaluation"]["status"], "recorded_not_independently_reproduced")
        self.assertEqual(info["historical_evaluation"]["accuracy"], 0.517687)

    def test_features(self):
        response = self.client.get("/api/features")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), SCHEMA)

    def test_sample_patient(self):
        response = self.client.get("/api/sample-patient")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "fixture": FIXTURES[0]["fixture"], "synthetic": True, "patient": PATIENT,
        })
        self.assertEqual(set(response.json()["patient"]), set(FEATURE_NAMES))

    def test_prediction_serialization_order_and_parity(self):
        for fixture in FIXTURES:
            with self.subTest(fixture=fixture["fixture"]):
                patient = fixture["synthetic_input"]
                response = self.client.post("/api/predict", json=patient)
                self.assertEqual(response.status_code, 200, response.text)
                self.assertIn("application/json", response.headers["content-type"])
                result = response.json()
                direct = self.app.state.prediction_service.predict_patient(patient)
                self.assertEqual(result["predicted_class"], fixture["predicted_id"])
                for field in ("predicted_class", "category", "outcome_label", "model_name"):
                    self.assertEqual(result[field], direct[field])
                self.assertIn("Academic prototype", result["disclaimer"])
                rows = result["probabilities"]
                self.assertEqual([entry["class_id"] for entry in rows], [0, 1, 2])
                self.assertEqual([entry["outcome_label"] for entry in rows], ["NO", ">30", "<30"])
                scores = [entry["score"] for entry in rows]
                self.assertTrue(all(0 <= score <= 1 for score in scores))
                self.assertAlmostEqual(sum(scores), 1, delta=1e-6)
                np.testing.assert_allclose(scores, [entry["score"] for entry in direct["probabilities"]], rtol=0, atol=1e-6)
                self.assertEqual(json.loads(json.dumps(result, allow_nan=False)), result)

    def test_missing_required_nullable_field(self):
        patient = PATIENT.copy()
        del patient["A1Cresult"]
        error = self.assert_api_error(self.client.post("/api/predict", json=patient), 422, "invalid_input")
        self.assertEqual(error["fields"], ["A1Cresult"])

    def test_unexpected_field(self):
        response = self.client.post("/api/predict", json=PATIENT | {"private-key": "private-value"})
        self.assert_api_error(response, 422, "invalid_input")
        self.assertNotIn("private-", response.text)

    def test_invalid_categorical_value(self):
        response = self.client.post("/api/predict", json=PATIENT | {"race": "private-value"})
        self.assert_api_error(response, 422, "invalid_input")
        self.assertNotIn("private-value", response.text)

    def test_invalid_numerical_values(self):
        for value in (-1, 2**63, "1", 1.0, True):
            with self.subTest(value=value):
                response = self.client.post("/api/predict", json=PATIENT | {"num_procedures": value})
                self.assert_api_error(response, 422, "invalid_input")

    def test_unsupported_null(self):
        response = self.client.post("/api/predict", json=PATIENT | {"race": None})
        self.assert_api_error(response, 422, "invalid_input")

    def test_malformed_json(self):
        response = self.client.post("/api/predict", content='{"private-key":', headers={"Content-Type": "application/json"})
        self.assert_api_error(response, 400, "invalid_json")
        self.assertNotIn("private-key", response.text)

    def test_cors_allowed_and_disallowed_origins(self):
        headers = {"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "Content-Type"}
        allowed = self.client.options("/api/predict", headers=headers | {"Origin": "http://localhost:3000"})
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(allowed.headers["access-control-allow-origin"], "http://localhost:3000")
        denied = self.client.options("/api/predict", headers=headers | {"Origin": "https://unapproved.example"})
        self.assertEqual(denied.status_code, 400)
        self.assertNotIn("access-control-allow-origin", denied.headers)

    def test_inference_failure_is_sanitized(self):
        with patch.object(self.app.state.prediction_service, "predict_patient", side_effect=PredictionError("private")):
            response = self.client.post("/api/predict", json=PATIENT)
        self.assert_api_error(response, 500, "inference_failed")
        self.assertNotIn("private", response.text)

    def test_openapi_and_swagger(self):
        self.assertEqual(self.client.get("/docs").status_code, 200)
        document = self.client.get("/openapi.json").json()
        request = document["paths"]["/api/predict"]["post"]["requestBody"]["content"]["application/json"]
        self.assertEqual(len(request["examples"]), 2)
        schema = document["components"]["schemas"]["PatientRequest"]
        self.assertEqual(set(schema["required"]), set(FEATURE_NAMES))
        self.assertIn("glyburide-metformin", schema["properties"])
        self.assertIn("FeatureDefinition", document["components"]["schemas"])


class LifecycleTests(unittest.TestCase):
    def test_startup_loads_once_and_shutdown_releases_model(self):
        app = create_app(Settings())
        self.assertIsNone(app.state.prediction_service)
        with patch("backend.app.main.PredictionService", wraps=PredictionService) as load:
            with TestClient(app) as client:
                self.assertTrue(client.get("/api/health").json()["model_ready"])
                self.assertTrue(client.get("/api/health").json()["model_ready"])
                load.assert_called_once()
        self.assertIsNone(app.state.prediction_service)

    def test_model_unavailable_returns_503(self):
        with TemporaryDirectory() as directory:
            app = create_app(Settings(model_path=Path(directory) / "missing.pkl"))
            with TestClient(app) as client:
                health = client.get("/api/health")
                self.assertEqual(health.status_code, 503)
                self.assertEqual(health.json(), {"status": "degraded", "model_ready": False, "service_available": False})
                response = client.post("/api/predict", json=PATIENT)
                self.assertEqual(response.status_code, 503)
                self.assertEqual(response.json()["error"]["code"], "model_unavailable")
                self.assertNotIn("missing.pkl", response.text)

    def test_environment_configuration(self):
        with patch.dict(os.environ, {
            "READMISSION_MODEL_PATH": "artifacts/patient_readmission_model.pkl",
            "READMISSION_ALLOWED_ORIGINS": "https://example.test, http://localhost:4000",
        }):
            settings = Settings.from_environment()
        self.assertEqual(settings.model_path, Path("artifacts/patient_readmission_model.pkl"))
        self.assertEqual(settings.allowed_origins, ("https://example.test", "http://localhost:4000"))
