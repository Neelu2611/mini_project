# Proposed architecture

## Runtime design

FastAPI exposes a stateless HTTP interface on loopback port 8000. Its lifespan loads the checksum-verified fitted bundle through one Phase 3 service instance per process. If loading fails, health and valid prediction requests report HTTP 503. On shutdown the application clears its service reference. Request bodies and prediction results are neither logged nor stored by the application.

Pydantic checks required wire keys and strict JSON types. The standalone validator checks exact fitted category membership, then preprocessing normalizes the two explicit lab nulls to `Not measured` and preserves literal markers and numeric types. The saved transformer yields a sparse 2,396-column matrix for the fitted model. Synchronous routes keep inference off the event loop.

Phase 5 will add a Next.js App Router frontend. A same-origin Next.js server proxy can forward requests to FastAPI using a server-only URL and bounded timeouts. Local manual browser testing can use the explicit CORS allowlist, which defaults to `http://localhost:3000`. The first release requires no persistence.

## Implemented API

| Method and route | Purpose |
|---|---|
| GET `/api/health` | Model readiness and inference availability. |
| GET `/api/model-info` | Fitted model identity, outcome classes and historical notebook metrics. |
| GET `/api/features` | Verified field metadata and fitted vocabularies. |
| GET `/api/sample-patient` | Labelled synthetic fixture for the form. |
| POST `/api/predict` | Actual prediction and uncalibrated scores in fitted class order. |
| GET `/docs` and `/openapi.json` | Swagger and the machine-readable contract for TypeScript. |

See the [API contract](API_DOCUMENTATION.md) for detailed wire types and configuration.

## Frontend design and pages

Use off-white surfaces, navy text and teal accents, with high contrast, a responsive navigation rail and compact dashboard cards. Pair outcome colors with text and icons. Give tables, charts and validation messages accessible labels and visible keyboard focus.

| Page | Content and interactions |
|---|---|
| `/` Overview | Project purpose, API readiness, three possible outcomes, a short academic-use notice and a link to start a prediction. |
| `/predict` Prediction | Group fields into demographics, admission and discharge, hospital activity, diagnoses and labs, and medications. Use searchable diagnosis and specialty dropdowns, clear units and explicit missing values. Review the form before submission. Offer a labeled synthetic example after the feature contract is verified. |
| `/predict` Result | Present the returned class and three scores as a horizontal bar chart and accessible text. Describe scores as uncalibrated model outputs. Handle loading, validation, retry and service unavailability with clear messages. Keep submissions in component memory and clear stale results when inputs change. |
| `/model` Model evaluation | Show the model version, holdout size, class metrics and an accessible confusion matrix. Use labeled bars for any verified comparison runs. Mark notebook-only results as historical and distinguish them from artifact-verified evaluation. |
| `/about` Methodology | Cite the dataset, explain the three-class model and preprocessing, and describe intended academic use and limitations. |

## Backend and planned frontend structure

```text
AGENTS.md
README.md
docs/                         Planning, provenance and run instructions
notebooks/                    Preserved source notebook, if added
artifacts/                    Local bundle and shareable provenance manifest
Dataset/                      Local raw CSV and mapping
backend/
  requirements.txt            Pinned ML and API dependencies
  app/
    main.py                   FastAPI startup and route wiring
    config.py                 Model path and runtime settings
    api/                      Health, metadata and prediction routes
    schemas/                  Pydantic contracts and wire aliases
    services/                Bundle loading, preprocessing and inference
  verify_phase2.py            Offline model verification
  tests/                      Unit, contract and real-artifact parity
frontend/
  src/app/                    Pages and same-origin API proxy
  src/components/             Form, model charts and shadcn/ui
  src/lib/                    Generated API types and request client
  tests/                      Component and browser journeys
```
