# Project audit

## Evidence and scope

The workspace contained no files or folders at inventory time, including hidden entries. The requested `patient_readmission_review2_backup(1).ipynb` was unavailable. The only matching notebook found was `C:/Users/Lenovo/Downloads/patient_readmission_review2_backup.ipynb` (400,802 bytes, SHA-256 `D0505D311C3BE45F25916CA21D3C43D78D927FB65EE2CB5952CF373DD110E969`). This audit uses that copy provisionally. All 212 cells were reviewed through their Markdown, code and saved outputs, including the three embedded plots. References below use zero-based cell indexes. The notebook was left in place and was never executed. Both the model and dataset were absent from the workspace and the local Downloads, OneDrive and Documents filename search.

## Dataset and target

Cells 9–31 show 101,766 encounters, 50 columns and zero exact duplicate rows. `encounter_id`, `patient_nbr` and `readmitted` are removed from the predictors. The outcome counts and canonical mapping come from cells 25 and 31.

| ID | Dataset label | Meaning | Full dataset | Test |
|---|---|---|---:|---:|
| 0 | `NO` | No recorded readmission | 54,864 | 10,973 |
| 1 | `>30` | Readmitted after 30 days | 35,545 | 7,109 |
| 2 | `<30` | Early readmission, described in the notebook as within 30 days | 11,357 | 2,272 |

The early-readmission label must retain the source token. Some Markdown misprints `>30`. The notebook does not establish how an encounter on exactly day 30 is classified.

## Raw feature contract

The 47 raw columns below are in dataset order. Categorical features are strings, including diagnosis codes. The three ID codes listed as integer features represent categories in the source domain and pass through numerically in this model. Verify exact order against the recovered transformer's `feature_names_in_`.

| Positions | Type | Columns in order |
|---|---|---|
| 1–4 | String | `race`, `gender`, `age`, `weight` |
| 5–8 | Integer | `admission_type_id`, `discharge_disposition_id`, `admission_source_id`, `time_in_hospital` |
| 9–10 | String | `payer_code`, `medical_specialty` |
| 11–16 | Integer | `num_lab_procedures`, `num_procedures`, `num_medications`, `number_outpatient`, `number_emergency`, `number_inpatient` |
| 17–19 | String | `diag_1`, `diag_2`, `diag_3` |
| 20 | Integer | `number_diagnoses` |
| 21–22 | String | `max_glu_serum`, `A1Cresult` |
| 23–47 | String | `metformin`, `repaglinide`, `nateglinide`, `chlorpropamide`, `glimepiride`, `acetohexamide`, `glipizide`, `glyburide`, `tolbutamide`, `pioglitazone`, `rosiglitazone`, `acarbose`, `miglitol`, `troglitazone`, `tolazamide`, `examide`, `citoglipton`, `insulin`, `glyburide-metformin`, `glipizide-metformin`, `glimepiride-pioglitazone`, `metformin-rosiglitazone`, `metformin-pioglitazone`, `change`, `diabetesMed` |

## Training and inference preprocessing

1. Read `Dataset/diabetic_data.csv` with pandas defaults. Replace nulls in `max_glu_serum` and `A1Cresult` with `Not measured`. Cells 19 and 21 distinguish parsed nulls from literal `?` in race, weight, payer, specialty and diagnosis fields. Preserve the latter tokens.
2. Use an encounter-level 80/20 stratified train/test split with seed 42 (cells 49 and 80). The final section relies on existing split variables. Training has 81,412 rows and testing has 20,354.
3. Fit `preprocessor_xgb` on the original training split (cell 173). It uses `ColumnTransformer` with `OneHotEncoder(handle_unknown='ignore')` on 36 strings and integer passthrough on 11 fields. The two matrices have 2,396 columns. Preserve the transformer's sparse output and column order during inference.
4. Fit `xgb_model_balanced` on encoded original training rows with `compute_sample_weight(class_weight='balanced', y=y_train)` (cells 181 and 183). Parameters are 100 estimators, max depth 5, learning rate 0.1, `multi:softprob`, three classes, `mlogloss`, seed 42 and `n_jobs=-1`. SMOTE, SMOTENC and scaling belong to comparison experiments.
5. Cells 199–211 export and reload a Joblib dictionary with `preprocessor` and `model`; the recorded file size is 743,281 bytes. The saved notebook reports identical loaded and in-memory test labels. The bundle does not include null normalization, label mapping or UI metadata.

## Evaluation

The final model was selected for early-readmission recall and F1 among the recorded experiments. The figures below are notebook results, with no independent rerun of the artifact.

| Experiment | Accuracy | Class 2 recall | Class 2 F1 | Cell |
|---|---:|---:|---:|---:|
| Random Forest, balanced weights | 58.01% | 0.01 | 0.01 | 57 |
| Random Forest, custom weights | 58.04% | 0.01 | 0.02 | 61 |
| Random Forest with SMOTE | 58.09% | 0.01 | 0.03 | 69 |
| Random Forest with SMOTENC | 54.43% | 0.15 | 0.17 | 94 |
| Logistic Regression with SMOTENC | 50.41% | 0.27 | 0.21 | 100 |
| Scaled Logistic Regression with SMOTENC | 49.93% | 0.25 | 0.21 | 110 |
| Tuned Random Forest with SMOTENC | 49.83% | 0.28 | 0.20 | 114 |
| Weighted Logistic Regression with SMOTENC | 50.41% | 0.27 | 0.21 | 128 |
| XGBoost with SMOTENC | 52.57% | 0.25 | 0.20 | 142 |
| Unweighted XGBoost, original training split | 59.48% | 0.02 | 0.04 | 179 |
| **Balanced XGBoost, exported** | **51.7687%** | **0.415933** | **0.274510** | 185, 211 |

Balanced XGBoost early-class precision is 0.204856. In class order 0, 1, 2, the confusion matrix (actual rows, predicted columns) is `[[6813,2337,1823],[2485,2779,1845],[650,677,945]]`. The rounded class 0 and 1 precision/recall/F1 are 0.68/0.62/0.65 and 0.48/0.39/0.43. Macro F1 is 0.45 and weighted F1 is 0.53. The early class had 945 true positives out of 2,272 actual and 4,613 predicted early encounters. Always predicting class 0 yields 53.91% accuracy on this test split (10,973 / 20,354).

## Reproducibility and integration risks

- Cell 187 and its plots use a manually entered table whose generic XGBoost row corresponds to the SMOTENC run (cell 142). The conclusion cites 59.48% for the distinct unweighted run (cell 179). Use the direct evaluation cells with explicit run names. Cell 195 matches the final confusion matrix but labels counts as patients. Use encounter counts.
- Cell 167 describes a split without code in that section. Later cells depend on objects defined earlier. The run has an unexecuted diagnostic and gaps in execution counts. Recreate the selected path in a clean process only if recovery fails and regeneration is approved. Earlier logistic baselines reported convergence warnings, and balanced weights on already balanced labels add little distinction.
- The split was by encounter rather than grouped by patient. Repeated patients could cross it despite zero exact duplicate rows. The same holdout informed selection. External, temporal, patient-grouped and subgroup validation were not shown.
- Missingness is substantial in lab and administrative fields. Unknown categories produce all-zero encodings for their feature. Diagnosis vocabulary, missing sentinels, pandas CSV parsing, sparse representation and exact package versions can affect parity. Verify mappings against the bundle.
- Discharge disposition and hospital-course fields imply a discharge-time demo. Historic diabetes encounters, limited early-class precision and recall, use of race and gender, and lack of demonstrated calibration limit applicability. Treat outputs as academic model scores with no clinical use.

See [Required files](REQUIRED_FILES.md) for environment and artifact recovery.
