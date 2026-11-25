# Required files and provenance

| File or evidence | Status and purpose |
|---|---|
| `notebooks/patient_readmission_review2_backup.ipynb` | Confirmed canonical notebook. Preserve it as the source of historical metrics and preprocessing evidence. |
| `artifacts/patient_readmission_model.pkl` | Supplied trusted Joblib export with fitted preprocessor and model. Preserve its bytes and fit. See the Phase 2 report for its checksum. |
| `Dataset/IDS_mapping.csv` | Supplied lookup for admission and discharge codes. |
| `Dataset/diabetic_data.csv` | Supplied Excel workbook. Preserve it and use the local `Dataset/diabetic_data.working.csv` copy for compatibility checks. |
| Python environment | Prefer CPython 3.13.7 and the recorded pins in `backend/requirements.txt`. Record installed versions and verify imports before deserializing. |
| Historical training dataset | Verification deferred. The fitted bundle, compatible Python environment and schema-derived inputs are sufficient for independent inference. |

Keep the bundle and datasets out of public assets and source control. See [Phase 2 report](PHASE_2_REPORT.md) for setup and verification status.
