# Phase 2 verification report

Phase 2 is complete for application integration. Python 3.13.7 and the pinned libraries ran successfully in the existing project virtual environment. The original fitted bundle passed independent inference verification. Phase 3 awaits user approval. Historical training dataset verification is deferred.

| File | Result | SHA-256 |
|---|---|---|
| `artifacts/patient_readmission_model.pkl` | Trusted user-supplied export. Its 743,281 bytes match the notebook's export size. Static inspection found the expected preprocessor and model identifiers. | `B02E31C9B52DF551202A0378E4539BC01AC666C17675DFFD011490F9370EAAD6` |
| `notebooks/patient_readmission_review2_backup.ipynb` | Canonical revision confirmed by the user. | `D0505D311C3BE45F25916CA21D3C43D78D927FB65EE2CB5952CF373DD110E969` |
| `Dataset/IDS_mapping.csv` | Verified 8 admission type, 30 discharge disposition and 25 admission source code labels. Blank separator rows were excluded. | `F1BB82B471CB34649352597572C9B1FB00BD27F77B9F5A22A03DC3EB1039749E` |
| `Dataset/diabetic_data.csv` | Supplied Excel Open XML workbook with a CSV extension. Original preserved. | `B660C536486E984954A14AC7016660B4148386D62B744B89CA9106FFBCD8DC66` |
| `Dataset/diabetic_data.working.csv` | Local UTF-8 CSV. Verified 1,879 data rows and 46 columns. Reparsed and compared every cell to its source worksheet value. | `5B156AA30348A0EDC5B6B4868E5FE5218D915E2876162B41DD4EA7228C155D50` |

## Supplied dataset compatibility

An exact, case-sensitive header comparison against the verified feature schema found all 47 expected fields absent and all 46 source columns additional. The complete lists are the `column` entries in the [feature schema](../backend/app/schemas/features.json) and the working CSV header, respectively. The only case-insensitive overlaps are `Age` and `Gender`. Both source columns contain numeric values in all 1,879 records. The draft expects age-band and gender strings. Numeric `HbA1c` also differs from the categorical `A1Cresult` field, and `Diagnosis` supplies no exact counterpart for the three diagnosis code fields. Zero supplied rows qualify. Independent inference used explicitly labelled synthetic fixtures. No patient values were imputed.

## Runtime and inference results

Python 3.13.7 ran from the existing virtual environment. All seven pinned libraries imported at their recorded versions and pip check found no broken requirements. The trusted bundle hash matched before deserialization. Both fitted objects loaded, and the XGBoost parameters and 100 boosting rounds matched the canonical notebook.

The fitted ColumnTransformer accepts 47 ordered fields. Its one-hot encoder produced 2,385 columns from 36 categorical fields, and its remainder branch preserved the 11 integer fields, producing 2,396 columns in total. The width matched the fitted booster. The two synthetic fixtures exercised measured labs, null labs normalized to Not measured, and literal question-mark markers. The fitted class and probability order was 0 (NO), 1 (>30), 2 (<30).

| Synthetic fixture | Predicted token | NO | >30 | <30 |
|---|---|---:|---:|---:|
| Measured labs | NO | 0.581769 | 0.254700 | 0.163531 |
| Missing labs and literal markers | NO | 0.619841 | 0.200651 | 0.179508 |

These scores are uncalibrated. Both rows had finite probabilities that summed to one within 1e-6, and their predicted labels matched the probability argmax. Single-row and batch inference agreed. Classifier probabilities also agreed with direct Booster inference within 1e-6.

See the [structured verification results](phase2-verification.json) for exact scores and the synthetic fixtures. To repeat the check from the project root, run the verifier with the existing interpreter.

```powershell
& .\.venv\Scripts\python.exe .\backend\verify_phase2.py
```

## Historical evaluation

Use the canonical notebook's Balanced XGBoost results for the future analytics page. Cells 185 and 211 record 51.7687% accuracy, early-readmission precision 0.204856, recall 0.415933 and F1 0.274510 on the historical holdout. Attribute those figures to the notebook and identify the model bundle by its recorded hash. The historical evaluation has not been independently reproduced. The supplied workbook was used for compatibility checks only.
