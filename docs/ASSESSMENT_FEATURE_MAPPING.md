# Assessment feature-to-question mapping

The form groups fields for staff review and assembles the payload in the verified schema order. All 47 keys are required. Blank controls are unanswered. Hospital staff should use the documented categories and verify recorded counts.

Feature meaning was checked against the canonical notebook and the variable descriptions in the original study. Admission, discharge and referral labels come from the supplied ID mapping as published in the verified schema. Where two ID descriptions are identical, the options also show their recorded codes. Diagnosis reference titles for all 899 non-missing fitted diagnosis strings come from the CDC 2008 ICD-9-CM tabular release and CMS v32 title list. The lookup does not translate ICD-10 or alter what the model receives.

[Original study and feature definitions](https://doi.org/10.1155/2014/781670) · [CDC 2008 ICD-9-CM tabular files](https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD9-CM/2008/) · [CMS diagnosis title releases](https://www.cms.gov/medicare/coding-billing/icd-10-codes/icd-9-cm-diagnosis-procedure-codes-abbreviated-and-full-code-titles)

## Patient demographics

| Model feature | Displayed question | Answer source | Control | Submitted value |
|---|---|---|---|---|
| `race` | How is the patient’s race or ethnicity recorded? | Patient or chart | Dropdown | `?`, `AfricanAmerican`, `Asian`, `Caucasian`, `Hispanic`, `Other` |
| `gender` | What gender is recorded for this encounter? | Patient or chart | Radio buttons | `Female`, `Male`, `Unknown/Invalid` |
| `age` | Which age range was the patient in at admission? | Patient or chart | Dropdown | `[0-10)`, `[10-20)`, `[20-30)`, `[30-40)`, `[40-50)`, `[50-60)`, `[60-70)`, `[70-80)`, `[80-90)`, `[90-100)` |
| `weight` | Which weight range was recorded for this stay? | Hospital records | Dropdown | `>200`, `?`, `[0-25)`, `[100-125)`, `[125-150)`, `[150-175)`, `[175-200)`, `[25-50)`, `[50-75)`, `[75-100)` |

## Hospital admission and discharge

| Model feature | Displayed question | Answer source | Control | Submitted value |
|---|---|---|---|---|
| `admission_type_id` | How was this admission classified? | Hospital records | Dropdown | Integer ID for the selected mapping description |
| `discharge_disposition_id` | What was the patient’s discharge destination or status? | Hospital records | Dropdown | Integer ID for the selected mapping description |
| `admission_source_id` | Where was the patient admitted from? | Hospital records | Dropdown | Integer ID for the selected mapping description |
| `time_in_hospital` | How many days was the patient in hospital? | Hospital records | Whole-number input | Nonnegative JSON integer |
| `payer_code` | Which payer category was recorded for this stay? | Hospital records | Dropdown | Exact fitted string, including `?` |
| `medical_specialty` | What was the admitting clinician’s recorded specialty? | Hospital records | Dropdown | Exact fitted string, including `?` |
| `num_procedures` | How many non-laboratory procedures were recorded during this stay? | Hospital records | Whole-number input | Nonnegative JSON integer |

## Previous hospital visits and medical history

| Model feature | Displayed question | Answer source | Control | Submitted value |
|---|---|---|---|---|
| `number_outpatient` | How many outpatient visits did the patient have in the 12 months before admission? | Patient history + records | Whole-number input | Nonnegative JSON integer |
| `number_emergency` | How many emergency department visits did the patient have in the 12 months before admission? | Patient history + records | Whole-number input | Nonnegative JSON integer |
| `number_inpatient` | How many inpatient visits did the patient have in the 12 months before admission? | Patient history + records | Whole-number input | Nonnegative JSON integer |

## Clinical diagnoses

| Model feature | Displayed question | Answer source | Control | Submitted value |
|---|---|---|---|---|
| `diag_1` | What was the primary diagnosis for this stay? | Hospital records | Search + diagnosis dropdown | Exact fitted ICD-9-CM string or `?` |
| `diag_2` | What was the second recorded diagnosis? | Hospital records | Search + diagnosis dropdown | Exact fitted ICD-9-CM string or `?` |
| `diag_3` | What was the third recorded diagnosis? | Hospital records | Search + diagnosis dropdown | Exact fitted ICD-9-CM string or `?` |
| `number_diagnoses` | How many diagnoses were recorded for this stay? | Hospital records | Whole-number input | Nonnegative JSON integer |

## Laboratory test results

| Model feature | Displayed question | Answer source | Control | Submitted value |
|---|---|---|---|---|
| `num_lab_procedures` | How many laboratory procedures were performed during this stay? | Hospital records | Whole-number input | Nonnegative JSON integer |
| `max_glu_serum` | What was the recorded maximum serum glucose category? | Hospital records | Dropdown | `>200`, `>300`, `Norm`, `Not measured`; explicit `null` also accepted by the wire contract |
| `A1Cresult` | What was the recorded HbA1c result category? | Hospital records | Dropdown | `>7`, `>8`, `Norm`, `Not measured`; explicit `null` also accepted by the wire contract |

## Medication and treatment information

| Model feature | Displayed question | Answer source | Control | Submitted value |
|---|---|---|---|---|
| `num_medications` | How many distinct medications were administered during this stay? | Hospital records | Whole-number input | Nonnegative JSON integer |
| `metformin` | What was the recorded status of metformin? | Hospital records | Medication status dropdown | `Down`, `No`, `Steady`, `Up` |
| `repaglinide` | What was the recorded status of repaglinide? | Hospital records | Medication status dropdown | `Down`, `No`, `Steady`, `Up` |
| `nateglinide` | What was the recorded status of nateglinide? | Hospital records | Medication status dropdown | `Down`, `No`, `Steady`, `Up` |
| `chlorpropamide` | What was the recorded status of chlorpropamide? | Hospital records | Medication status dropdown | `Down`, `No`, `Steady`, `Up` |
| `glimepiride` | What was the recorded status of glimepiride? | Hospital records | Medication status dropdown | `Down`, `No`, `Steady`, `Up` |
| `acetohexamide` | What was the recorded status of acetohexamide? | Hospital records | Medication status dropdown | `No`, `Steady` |
| `glipizide` | What was the recorded status of glipizide? | Hospital records | Medication status dropdown | `Down`, `No`, `Steady`, `Up` |
| `glyburide` | What was the recorded status of glyburide? | Hospital records | Medication status dropdown | `Down`, `No`, `Steady`, `Up` |
| `tolbutamide` | What was the recorded status of tolbutamide? | Hospital records | Medication status dropdown | `No`, `Steady` |
| `pioglitazone` | What was the recorded status of pioglitazone? | Hospital records | Medication status dropdown | `Down`, `No`, `Steady`, `Up` |
| `rosiglitazone` | What was the recorded status of rosiglitazone? | Hospital records | Medication status dropdown | `Down`, `No`, `Steady`, `Up` |
| `acarbose` | What was the recorded status of acarbose? | Hospital records | Medication status dropdown | `Down`, `No`, `Steady`, `Up` |
| `miglitol` | What was the recorded status of miglitol? | Hospital records | Medication status dropdown | `Down`, `No`, `Steady`, `Up` |
| `troglitazone` | What was the recorded status of troglitazone? | Hospital records | Medication status dropdown | `No`, `Steady` |
| `tolazamide` | What was the recorded status of tolazamide? | Hospital records | Medication status dropdown | `No`, `Steady`, `Up` |
| `examide` | What was the recorded status of examide? | Hospital records | Medication status dropdown | `No` |
| `citoglipton` | What was the recorded status of citoglipton? | Hospital records | Medication status dropdown | `No` |
| `insulin` | What was the recorded status of insulin? | Hospital records | Medication status dropdown | `Down`, `No`, `Steady`, `Up` |
| `glyburide-metformin` | What was the recorded status of the glyburide–metformin combination? | Hospital records | Medication status dropdown | `Down`, `No`, `Steady`, `Up` |
| `glipizide-metformin` | What was the recorded status of the glipizide–metformin combination? | Hospital records | Medication status dropdown | `No`, `Steady` |
| `glimepiride-pioglitazone` | What was the recorded status of the glimepiride–pioglitazone combination? | Hospital records | Medication status dropdown | `No`, `Steady` |
| `metformin-rosiglitazone` | What was the recorded status of the metformin–rosiglitazone combination? | Hospital records | Medication status dropdown | `No`, `Steady` |
| `metformin-pioglitazone` | What was the recorded status of the metformin–pioglitazone combination? | Hospital records | Medication status dropdown | `No` |
| `change` | Did any diabetes medication or dose change during this stay? | Hospital records | Radio buttons | `Ch`, `No` |
| `diabetesMed` | Was any diabetes medication prescribed during this stay? | Hospital records | Radio buttons | `No`, `Yes` |

## Final review and confirmation

The review lists all answers with readable labels. Confirmation is a UI state and adds no wire field. Lab selectors submit the explicit `Not measured` category when chosen. The builder can also preserve an explicitly supplied null for the two nullable labs. The preprocessor applies its existing normalization.
