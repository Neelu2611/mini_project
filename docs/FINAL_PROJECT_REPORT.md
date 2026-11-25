# Final project report

The Patient Readmission Prediction System is ready for a local academic review. A staff-assisted Next.js assessment submits 47 verified inputs to FastAPI. Python applies the original fitted transformer and trained Balanced XGBoost classifier and returns three uncalibrated scores.

## Completion

| Phase | Status | Deliverable |
|---|---|---|
| 9 | Complete | Outcome card, actual score charts, accessible score rows, print summary, and responsive results. |
| 10 | Complete | Historical model analytics, supplied dataset inventory and system architecture. |
| 11 | Complete | Browser, API and fitted model verification, with a final production build. |
| 12 | Complete | Local launchers, environment and deployment instructions, user and demo guides, and screenshots. |

## Architecture and stack

```text
Next.js assessment  →  FastAPI validation  →  fitted Python transformer  →  Balanced XGBoost
    47 raw fields         exact typed JSON           2,396 columns          3 ordered scores
Next.js results     ←  outcome, original class token and uncalibrated scores
```

The frontend uses Next.js 16.4.6, React 19.3.1, TypeScript 5.9.3, Tailwind CSS 4.3.5, Lucide React 1.79.0 and Recharts 3.11.1. The backend uses Python 3.13.7, FastAPI 0.165.0, Pydantic 2.14.4, Uvicorn 0.54.0 and the verified ML pins, including XGBoost 3.4.1. The browser stores the draft and result only in memory. The API exposes health, model information, feature schema, a verified sample and prediction. See the [API contract](API_DOCUMENTATION.md).

## Live result and historical performance

The measured-lab synthetic fixture returned class 0 (`NO`), **No recorded readmission**. The live FastAPI scores were `0.5817686319351196` for `NO`, `0.25470006465911865` for `>30`, and `0.1635313332080841` for `<30`. The browser matched direct inference within `1e-6`. This result belongs to a synthetic demonstration and is not a clinical prediction for a real patient.

The canonical notebook records **51.7687% accuracy** on 20,354 holdout encounters, with early-readmission precision **20.4856%**, recall **41.5933%** and F1 **27.4510%**. The report includes macro and weighted averages, the 3×3 confusion matrix and 11 experiment rows. ROC-AUC was not recorded. Historical evaluation has not been independently reproduced. See the [historical analysis](PHASE_10_REPORT.md).

The supplied workbook and its working CSV contain 1,879 data rows and 46 columns, with zero exact model-input column matches. The inventory on screen contains aggregate counts and headers. No evaluation metrics were calculated from the supplied dataset.

## Verification and integrity

TypeScript and ESLint passed. All 33 backend tests passed. The complete Playwright run had 15 passes and one ambiguous chart selector. After a test-only selector fix, its targeted rerun passed, giving 16 unique passing frontend cases and zero outstanding failures. One final Next.js production build passed and prerendered all six application routes.

The original fitted model and canonical notebook retain SHA-256 hashes `b02e31c9b52df551202a0378e4539bc01ac666c17675dffd011490f9370eaad6` and `d0505d311c3be45f25916ca21d3c43d78d927fb65ee2cb5952cf373dd110e969`, respectively. The supplied workbook, working CSV, ID mapping and verified schema also retain their recorded hashes.

## Start and review

```powershell
& .\start-project.ps1
```

Open [frontend](http://localhost:3000), [health](http://localhost:8000/api/health), and [Swagger](http://localhost:8000/docs). The [README](../README.md) shows the directory structure. The [deployment guide](DEPLOYMENT_GUIDE.md) covers local production mode and troubleshooting. The [demo guide](PROJECT_DEMO_GUIDE.md) provides the review sequence.

## Screenshots

| View | Capture |
|---|---|
| Dashboard | [Desktop](../screenshots/01-dashboard.png) |
| Patient Assessment | [Desktop](../screenshots/02-patient-assessment.png) |
| Actual synthetic Prediction Results | [Desktop](../screenshots/03-prediction-results.png) |
| Model Analytics | [Desktop](../screenshots/04-model-analytics.png) |
| Dataset Overview | [Desktop](../screenshots/05-dataset-overview.png) |
| About the System | [Desktop](../screenshots/06-about-system.png) |
| Dashboard on mobile | [390 px](../screenshots/07-mobile-dashboard.png) |
| Actual synthetic result on mobile | [390 px](../screenshots/08-mobile-results.png) |

## Remaining limitations

The prototype has no demonstrated clinical validation or score calibration. The historical split was by encounter and the same holdout informed model selection. The notebook did not establish a rule for encounters exactly at day 30, so the interface preserves its source labels. The supplied dataset cannot reproduce the historical evaluation. The service is configured for loopback and has no authentication or persistent encounter storage. Public hosting is outside the completed local review.
