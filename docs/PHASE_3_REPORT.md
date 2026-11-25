# Phase 3 report

Phase 3 is complete. The standalone inference service passed all 16 automated tests on Python 3.13.7. It is ready for FastAPI integration in Phase 4, pending user approval.

| Module | Responsibility |
|---|---|
| `backend/app/services/model_loader.py` | Resolve the artifact, verify its SHA-256 before deserialization, and check the fitted bundle against the schema. |
| `backend/app/services/validation.py` | Require all 47 fields, validate exact categories and integer values, reject extra fields, and restore fitted order. |
| `backend/app/services/preprocessing.py` | Normalize explicit null labs, preserve supported markers and integer dtypes, and apply the fitted transformer with a 2,396-column check. |
| `backend/app/services/prediction.py` | Reuse one bundle per instance and return JSON-serializable single or batch predictions in fitted class order. |
| `backend/tests/test_inference.py` | Run validation and artifact tests using the Phase 2 synthetic fixtures and synthetic variants. |

## Actual synthetic predictions

| Fixture | Predicted class | Outcome | NO | >30 | <30 |
|---|---:|---|---:|---:|---:|
| Measured labs | 0 | NO | 0.581769 | 0.254700 | 0.163531 |
| Missing labs and literal markers | 0 | NO | 0.619841 | 0.200651 | 0.179508 |

Both fixtures produced the readable category “No recorded readmission.” Scores are uncalibrated and rounded to six decimal places. Single and batch predictions agreed, and the service matched the reference labels and direct classifier and Booster scores within `1e-6`.

## Verification and remaining work

- The automated suite finished with **16 passed, 0 failed**. It checks artifact loading and error cases, the raw contract, missing-value handling, sparse transformed shape, actual predictions, probability alignment and normalization, parity, repeatability, and JSON serialization.
- Standalone predictions also ran from the `backend` directory, confirming working-directory-independent artifact and schema resolution.
- The original bundle still has SHA-256 `b02e31c9b52df551202a0378e4539bc01ac666c17675dffd011490f9370eaad6`. The notebook, supplied workbook, CSV working copy and ID mapping still match their Phase 2 hashes. The verified schema was used as published.
- Historical evaluation reproduction remains deferred. The supplied dataset lacks the required fields, so the tests use the two labelled synthetic fixtures from the [Phase 2 evidence](phase2-verification.json). The model is an academic prototype without demonstrated clinical validation or score calibration.
- No Phase 3 blockers remain. FastAPI lifecycle and HTTP contracts are Phase 4 work.

See [model integration](MODEL_INTEGRATION.md) for the callable interface and standalone command.
