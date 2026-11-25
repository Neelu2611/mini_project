# Phase 4 report

The FastAPI backend is complete and ready for Phase 5 frontend integration after approval. It reuses the Phase 3 model and inference service.

## Implementation

- `backend/app/main.py` defines the ASGI app and model lifecycle. It loads one trusted bundle at startup and releases the service reference at shutdown. Failed loading leaves readiness false.
- `backend/app/config.py` and `backend/.env.example` define the model path and explicit CORS allowed origins.
- `backend/app/api/routes.py` exposes health, model information, feature metadata, synthetic fixture and prediction routes. `backend/app/api/errors.py` maps errors to JSON with no submitted feature values.
- `backend/app/schemas/api.py` provides the typed OpenAPI request and response contracts. The request fields derive from the existing feature schema.
- `backend/tests/test_api.py` covers lifecycle, endpoint behavior, error sanitization, class ordering, CORS and parity with standalone inference.

## Runtime and verification

Installed FastAPI 0.165.0, Uvicorn 0.54.0, Pydantic 2.14.4 and HTTPX 0.28.1 in the existing Python 3.13.7 environment. The seven ML pins were preserved and `pip check` reported no broken requirements. The API suite uses standard-library unittest and FastAPI's test client.

| Suite | Passed | Failed |
|---|---:|---:|
| Existing Phase 3 tests | 16 | 0 |
| New API tests | 17 | 0 |
| Total | 33 | 0 |

The installed Starlette test client emitted a deprecation warning for its HTTPX compatibility path. The suite still passed.

Uvicorn served localhost port 8000. Health, model information, features, the sample patient, Swagger UI and the OpenAPI document all returned HTTP 200 over the local network interface. Both verified fixtures returned HTTP 200 from `POST /api/predict`.

| Synthetic fixture | Predicted class and token | NO | >30 | <30 | Max absolute delta from standalone |
|---|---|---:|---:|---:|---:|
| Measured labs | 0, NO | 0.581769 | 0.254700 | 0.163531 | 0.0 |
| Missing labs and literal markers | 0, NO | 0.619841 | 0.200651 | 0.179508 | 0.0 |

The API and standalone scores matched exactly in this run, within the required `1e-6` tolerance. The scores shown are rounded and uncalibrated.

## Integrity and limitations

The original trained bundle retains SHA-256 `b02e31c9b52df551202a0378e4539bc01ac666c17675dffd011490f9370eaad6`. The canonical notebook, supplied workbook, working CSV, mapping and published schema retain their verified checksums. Historical evaluation reproduction remains deferred. The prototype is intended for academic use and has no demonstrated clinical validation or score calibration. The backend binds to loopback and has no authentication.

There are no Phase 4 blockers. See the [API contract](API_DOCUMENTATION.md) and [README](../README.md) for environment settings, startup, testing and integration instructions.
