# Phase 6 report

The existing dashboard now has a welcome panel, a **Start Patient Assessment** link, a three-step workflow, and a visible academic-use notice. The panel layout uses light surfaces, navy navigation, teal accents and Lucide icons. On mobile, panels stack and the sidebar remains available through the existing keyboard-accessible menu.

The header distinguishes backend connectivity from model readiness using the existing health hook. A single model-information request supplies both the overview and historical evaluation. The live overview showed Balanced XGBoost, 47 inputs, 2,396 transformed features and three classes. The evaluation displayed 51.77% accuracy and early-readmission precision 20.49%, recall 41.59% and F1 27.45%. These are notebook results from 20,354 holdout encounters, attributed to the notebook cells and model bundle. Historical reproduction remains deferred, and the scores are uncalibrated.

## Verification

- TypeScript and ESLint passed.
- Microsoft Edge at localhost:3000 verified live metadata, the assessment link, the workflow, and desktop and mobile layout at 1440 px and 390 px. Browser checks also verified loading, a valid evaluation with no holdout encounters, degraded readiness, loss of contact and retry recovery. The state checks used browser interception of API responses.
- Captured [desktop](../frontend/test-results/phase6-desktop.png) and [mobile](../frontend/test-results/phase6-mobile.png) screenshots of the live dashboard.
- FastAPI, the model, and installed dependencies were left untouched. This frontend-only phase used targeted checks.

No Phase 6 blockers remain. The assessment link opens the existing route foundation. Detailed form implementation awaits Phase 7 approval.
