# FastAPI contract

The local base URL is `http://localhost:8000`. [Swagger UI](http://localhost:8000/docs) presents the [OpenAPI document](http://localhost:8000/openapi.json) and two verified synthetic request examples. The documented example response is a recorded reference. Every successful runtime prediction invokes the real model.

## Configuration

Start from the repository root in Windows PowerShell.

```powershell
& .\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

The values in [backend/.env.example](../backend/.env.example) are defaults that can be set as process environment variables. The file is a template and is loaded only if you export its values.

| Variable | Default | Behavior |
|---|---|---|
| `READMISSION_MODEL_PATH` | `artifacts/patient_readmission_model.pkl` | Absolute paths work, and relative paths resolve from the project root. The artifact must match the trusted checksum. |
| `READMISSION_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated explicit browser origins. An empty value disables cross-origin access. The wildcard is rejected. |

CORS permits GET and POST with the Content-Type header from configured origins. Browser credentials are disabled. There is no API authentication in this localhost prototype.

## Endpoints

| Method and path | Response |
|---|---|
| GET `/api/health` | 200 with `status: "ok"`, `model_ready: true`, and `service_available: true`. If the model fails to load, returns 503 with `status: "degraded"` and both flags false. |
| GET `/api/model-info` | Project and model names, model SHA-256, counts of 47 input and 2,396 transformed features, ordered classes with readable labels, historical evaluation, and disclaimer. |
| GET `/api/features` | The verified feature schema with version, model fingerprint, notebook source, transformed width, target classes and the ordered `features` array. |
| GET `/api/sample-patient` | An object containing `fixture` (string), `synthetic` (true) and `patient` (the complete measured-lab synthetic fixture). |
| POST `/api/predict` | A typed prediction response for one encounter. |
| GET `/docs`, GET `/openapi.json` | Swagger UI and the OpenAPI contract for future TypeScript generation. |

Historical evaluation carries `status: "recorded_not_independently_reproduced"`, the notebook path, cells 185 and 211, and 20,354 holdout encounters. It reports accuracy 0.517687 and early-readmission precision 0.204856, recall 0.415933 and F1 0.274510. All values are historical notebook results on a 0–1 scale.

### Feature metadata

Use the `features` array in order. Each entry gives `position`, exact wire key `column`, `display_name`, `section`, `type` (`string` or `integer`), `supported_categorical_values`, `vocabulary_status`, `missing` (`token`, `action`) and `validation` (`rule`, `nullable`, `required`). The three numeric ID fields also have optional `reference_codes` and `reference_code_source`. These are label references. Historical training ranges and exhaustive code coverage are deferred.

### Prediction request

Send an object with all 47 exact feature keys as the JSON body. There is no wrapper. The sample endpoint wraps the fixture for labelling, so send the contents of its `patient` property.

Use exact fitted strings, including diagnosis codes and supported literal `?` values. Only the two required lab keys, `max_glu_serum` and `A1Cresult`, accept explicit null. The service normalizes them to `Not measured`. Numeric features require nonnegative JSON integers in the signed 64-bit range. JavaScript clients must avoid lossy number conversion and use safe integers for form inputs. Keys with hyphens retain their spelling in OpenAPI and JSON. Request key order may vary.

```powershell
$sample = Invoke-RestMethod http://localhost:8000/api/sample-patient
Invoke-RestMethod http://localhost:8000/api/predict -Method Post -ContentType 'application/json' -Body ($sample.patient | ConvertTo-Json -Depth 4 -Compress)
```

### Prediction response

```json
{
  "predicted_class": 0,
  "outcome_label": "NO",
  "category": "No recorded readmission",
  "probabilities": [
    {"class_id": 0, "outcome_label": "NO", "score": 0.5817686319351196},
    {"class_id": 1, "outcome_label": ">30", "score": 0.25470006465911865},
    {"class_id": 2, "outcome_label": "<30", "score": 0.1635313332080841}
  ],
  "model_name": "Balanced XGBoost",
  "disclaimer": "Academic prototype. Scores are uncalibrated. Do not use for clinical decisions."
}
```

This is the recorded measured-lab synthetic example. Probability entries are in fitted order (`NO`, `>30`, `<30`) and sum to one within numerical tolerance.

### Error responses

Endpoint errors use the envelope `{"error":{"code":"invalid_input","message":"...","fields":[]}}`. The optional detail about affected inputs is limited to known field names. Error bodies omit submitted values and stack traces.

| HTTP status | Code | Meaning |
|---|---|---|
| 400 | `invalid_json` | Malformed JSON. |
| 422 | `invalid_input` | Missing or unexpected fields, invalid types, unknown categories or unsupported nulls. |
| 503 | `model_unavailable` | Prediction model unavailable. The health route uses its readiness object instead. |
| 500 | `inference_failed` or `internal_error` | Transformation, prediction or other internal failure. |
| 404 or 405 | `http_error` | Unknown route or wrong method. |

The service is stateless and does not store encounter inputs. Use synthetic fixtures for development.
