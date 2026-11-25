# Patient Readmission Prediction System

The live diabetes discharge assessment sends ten answers to the trained Diabetes discharge XGBoost v1 model through FastAPI. The original notebook model remains available at /api/predict.

## Start locally

From the project root in Windows PowerShell, with the existing Python and Node environments:

```powershell
& .\start-project.ps1
```

The launcher reuses recognized project listeners and leaves other processes alone. Alternatively, run `& .\start-backend.ps1` and `& .\start-frontend.ps1` in separate terminals.

- [Dashboard](http://localhost:3000)
- [Backend health](http://localhost:8000/api/health)
- [Swagger UI](http://localhost:8000/docs)

## Application workflow

Open **Patient Assessment**, enter ten de-identified discharge details, and select **Predict Readmission**. Live inference uses POST /api/diabetes/predict. Evaluation and source details are in docs/diabetes-short-v1.json. Rebuild the local model from Dataset/uci296-public.zip using the project Python environment and scripts/train_diabetes_short.py.

Model Analytics shows recorded notebook evaluation. Dataset Overview documents the supplied 1,879-row workbook and its compatibility limits. About the System explains how the application passes the 47 fields through the fitted pipeline to produce 2,396 transformed columns and three ordered outcomes.

## Project structure

```text
start-project.ps1       Starts or reuses both local servers
start-backend.ps1       FastAPI launcher
start-frontend.ps1      Next.js launcher with an optional production mode
scripts/                Shared localhost listener checks
backend/app/            FastAPI routes, schema and fitted inference services
backend/tests/          API and direct inference tests
frontend/src/app/       Six application routes
frontend/src/components/  Assessment, results charts and workspace UI
frontend/src/lib/       API client, fitted metadata and recorded report data
frontend/tests/         Playwright integration and browser tests
artifacts/              Local trusted model bundle
Dataset/                Local workbook, working CSV and ID mapping
notebooks/              Preserved canonical notebook
docs/                   Runbooks, API contracts and verification reports
screenshots/            Final browser captures using synthetic data
```

## Verification and guides

Final verification recorded 33 backend passes and 16 unique frontend passes. The full frontend run had one test-selector failure, and the corrected test passed on its targeted rerun. TypeScript, ESLint and the single final production build passed. See the [verification report](docs/PHASE_11_REPORT.md) for exact commands and evidence.

- [User guide](docs/USER_GUIDE.md)
- [Deployment preparation and troubleshooting](docs/DEPLOYMENT_GUIDE.md)
- [Demo and viva guide](docs/PROJECT_DEMO_GUIDE.md)
- [API contracts](docs/API_DOCUMENTATION.md)
- [Final report and screenshot index](docs/FINAL_PROJECT_REPORT.md)

Historical evaluation was recorded in the notebook and has not been independently reproduced. This project is intended for academic demonstration. Model outputs are uncalibrated and must not guide clinical decisions.
