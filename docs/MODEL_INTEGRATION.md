# Standalone model integration

The service uses the original fitted Balanced XGBoost bundle, Python 3.13.7 and the pinned packages in `backend/requirements.txt`.

Import `predict_patient` from `backend.app.services.prediction` for a lazily initialized process-default service. For explicit lifecycle management, construct `PredictionService()` once and reuse its `predict_patient(patient)` and `predict_batch(patients)` methods.

The artifact and schema paths resolve from the project files. A custom artifact path may be absolute or project-relative. The loader verifies the trusted SHA-256 before deserializing the same bytes and checks the fitted types, raw field order, categories, integer passthrough, transformed width, and class order. Artifact failures raise `ModelLoadError`.

## Input and output

- Supply all 47 exact keys from the [published schema](../backend/app/schemas/features.json). The validator rejects extra fields and reorders valid input to match the fitted transformer.
- Send exact fitted categorical strings, including diagnosis codes, whitespace and supported literal `?` markers. Integer fields require nonnegative signed 64-bit integers. Booleans, floats, numeric strings, nulls and overflows are rejected. The ID mapping gives reference labels. Historical training ranges and code coverage are deferred.
- Both lab keys are required and accept explicit null. The service replaces those nulls with `Not measured`, builds an ordered pandas frame, and applies the saved transformer. Its sparse output is passed directly to the classifier after checking for 2,396 columns.
- Validation, transformation and inference failures raise `InputValidationError`, `PreprocessingError` and `PredictionError`, respectively.
- Results contain `predicted_class`, `category`, `outcome_label`, `model_name`, and `probabilities`. The probability list contains `class_id`, `outcome_label`, and `score` in fitted order 0 (`NO`), 1 (`>30`), 2 (`<30`). The scores are uncalibrated.

## Run a standalone prediction

From the project root in PowerShell, run the service on the labelled synthetic fixtures saved in Phase 2.

```powershell
& .\.venv\Scripts\python.exe -c "import json; from pathlib import Path; from backend.app.services.prediction import PredictionService; fixtures = json.loads(Path('docs/phase2-verification.json').read_text(encoding='utf-8'))['synthetic_predictions']; results = PredictionService().predict_batch(item['synthetic_input'] for item in fixtures); print(json.dumps(dict(zip((item['fixture'] for item in fixtures), results, strict=True)), indent=2, allow_nan=False))"
```

See the [Phase 3 report](PHASE_3_REPORT.md) for actual results and FastAPI integration readiness.
