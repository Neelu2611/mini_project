# Phase 10 report

## Model Analytics

The canonical notebook was inspected as saved. Cells 49 and 80 record an 80/20 encounter-level stratified split with seed 42. Cells 185 and 211 give the selected Balanced XGBoost results on 20,354 holdout encounters. The model-information API agrees with the recorded selected-model metrics at its published precision.

| Metric | Notebook result |
|---|---:|
| Overall accuracy | 51.7687% |
| Early-readmission precision, class 2 | 20.4856% |
| Early-readmission recall, class 2 | 41.5933% |
| Early-readmission F1, class 2 | 27.4510% |
| Macro precision / recall / F1 | 0.46 / 0.48 / 0.45 |
| Support-weighted precision / recall / F1 | 0.56 / 0.52 / 0.53 |
| ROC-AUC | No recorded value |

Average metrics are rounded as printed in cell 185. The confusion matrix has actual rows and predicted columns in the order `NO`, `>30`, `<30`.

| Actual / predicted | NO | >30 | <30 |
|---|---:|---:|---:|
| NO | 6,813 | 2,337 | 1,823 |
| >30 | 2,485 | 2,779 | 1,845 |
| <30 | 650 | 677 | 945 |

The comparison table uses 11 directly evaluated notebook runs with cell references. Its chart compares class 2 recall and F1 for five selected runs. Historical evaluation has not been independently reproduced. Encounter-level splitting may put repeat patients on both sides, and the holdout also informed model selection.

## Dataset Overview and About

The working CSV has 1,879 data rows and 46 columns. Each row has the same width as the header. None of the column names exactly matches the 47 required model fields. The supplied workbook serves as a compatibility inventory, with historical training and holdout statistics presented separately. The frontend exposes column names and aggregate counts. Synthetic fixtures provide schema-compatible demo inputs.

About the System presents the Next.js, FastAPI, fitted Python preprocessor and Balanced XGBoost architecture, with the class definitions and academic limitations. Browser checks verified all three pages and mobile layout. See [analytics](../screenshots/04-model-analytics.png), [dataset](../screenshots/05-dataset-overview.png) and [about](../screenshots/06-about-system.png).
