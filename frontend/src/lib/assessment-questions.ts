import type { Patient } from "./api-contracts";

export const sections = [
  { id: "demographics", title: "Patient demographics", short: "Demographics", detail: "Confirm age, race and recorded gender with the patient or chart. Use the hospital record for weight." },
  { id: "encounter", title: "Hospital admission and discharge", short: "Hospital stay", detail: "Use the registration, billing and discharge records for this hospital stay." },
  { id: "history", title: "Previous hospital visits and medical history", short: "Prior visits", detail: "The patient can help identify visits. Verify the counts against records for the 12 months before this admission." },
  { id: "diagnoses", title: "Clinical diagnoses", short: "Diagnoses", detail: "Use the encounter’s coded discharge diagnoses. Search the fitted ICD-9-CM options by recorded code or available reference title. Ask coding staff if the chart uses a different coding system." },
  { id: "labs", title: "Laboratory test results", short: "Lab results", detail: "Select the documented laboratory categories for this stay. Use Not measured only when the test was not performed." },
  { id: "medications", title: "Medication and treatment information", short: "Medications", detail: "Use the medication record for this stay. Confirm each drug or combination separately. Use Not prescribed only when the record confirms that status." },
] as const;

export type FeatureKey = keyof Patient;
type Source = "Patient or chart" | "Patient history + records" | "Hospital records";
type Control = "select" | "radio" | "integer" | "diagnosis" | "medication";
type Question = {
  section: (typeof sections)[number]["id"];
  question: string;
  control: Control;
  source: Source;
  help?: string;
};

const records = "Hospital records";
const patient = "Patient or chart";
const history = "Patient history + records";
const drug = (name: string): Question => ({
  section: "medications", question: `What was the recorded status of ${name}?`, control: "medication", source: records,
});

export const questions = {
  race: { section: "demographics", question: "How is the patient’s race or ethnicity recorded?", control: "select", source: patient, help: "Use the patient’s reported information and the available historical categories." },
  gender: { section: "demographics", question: "What gender is recorded for this encounter?", control: "radio", source: patient, help: "Use the documented category from the encounter record." },
  age: { section: "demographics", question: "Which age range was the patient in at admission?", control: "select", source: patient, help: "Choose an age band in years." },
  weight: { section: "demographics", question: "Which weight range was recorded for this stay?", control: "select", source: records, help: "Use the recorded weight in pounds (lb)." },
  admission_type_id: { section: "encounter", question: "How was this admission classified?", control: "select", source: records, help: "Select the registration category, such as emergency, urgent or elective." },
  discharge_disposition_id: { section: "encounter", question: "What was the patient’s discharge destination or status?", control: "select", source: records, help: "Use the discharge summary. The status can include transfer, home care or another recorded outcome." },
  admission_source_id: { section: "encounter", question: "Where was the patient admitted from?", control: "select", source: records, help: "Use the recorded referral or transfer source." },
  time_in_hospital: { section: "encounter", question: "How many days was the patient in hospital?", control: "integer", source: records, help: "Enter the recorded whole days between admission and discharge." },
  payer_code: { section: "encounter", question: "Which payer category was recorded for this stay?", control: "select", source: records, help: "Use the billing record’s historical payer category. The source does not provide names for every abbreviation." },
  medical_specialty: { section: "encounter", question: "What was the admitting clinician’s recorded specialty?", control: "select", source: records },
  num_procedures: { section: "encounter", question: "How many non-laboratory procedures were recorded during this stay?", control: "integer", source: records, help: "Exclude laboratory procedures, which are entered separately." },
  number_outpatient: { section: "history", question: "How many outpatient visits did the patient have in the 12 months before admission?", control: "integer", source: history, help: "Outpatient visits did not involve being admitted to the hospital." },
  number_emergency: { section: "history", question: "How many emergency department visits did the patient have in the 12 months before admission?", control: "integer", source: history, help: "Use the recorded emergency visit count." },
  number_inpatient: { section: "history", question: "How many inpatient visits did the patient have in the 12 months before admission?", control: "integer", source: history, help: "Use the recorded inpatient admission count. Exclude the stay being assessed." },
  diag_1: { section: "diagnoses", question: "What was the primary diagnosis for this stay?", control: "diagnosis", source: records, help: "Use the first diagnosis recorded in the coded encounter." },
  diag_2: { section: "diagnoses", question: "What was the second recorded diagnosis?", control: "diagnosis", source: records, help: "Use the second diagnosis slot in the coded encounter." },
  diag_3: { section: "diagnoses", question: "What was the third recorded diagnosis?", control: "diagnosis", source: records, help: "Use the third diagnosis slot in the coded encounter." },
  number_diagnoses: { section: "diagnoses", question: "How many diagnoses were recorded for this stay?", control: "integer", source: records, help: "Use the total in the encounter record, including diagnoses beyond the three slots above." },
  num_lab_procedures: { section: "labs", question: "How many laboratory procedures were performed during this stay?", control: "integer", source: records, help: "Use the total count from the laboratory record." },
  max_glu_serum: { section: "labs", question: "What was the recorded maximum serum glucose category?", control: "select", source: records, help: "Serum glucose measures blood sugar. Use the recorded category for this stay, with thresholds in mg/dL." },
  A1Cresult: { section: "labs", question: "What was the recorded HbA1c result category?", control: "select", source: records, help: "HbA1c reflects average blood sugar over roughly 2–3 months. Use the documented result category for this stay, expressed as a percentage." },
  num_medications: { section: "medications", question: "How many distinct medications were administered during this stay?", control: "integer", source: records, help: "Count distinct medications across the stay, including medications unrelated to diabetes." },
  metformin: drug("metformin"),
  repaglinide: drug("repaglinide"),
  nateglinide: drug("nateglinide"),
  chlorpropamide: drug("chlorpropamide"),
  glimepiride: drug("glimepiride"),
  acetohexamide: drug("acetohexamide"),
  glipizide: drug("glipizide"),
  glyburide: drug("glyburide"),
  tolbutamide: drug("tolbutamide"),
  pioglitazone: drug("pioglitazone"),
  rosiglitazone: drug("rosiglitazone"),
  acarbose: drug("acarbose"),
  miglitol: drug("miglitol"),
  troglitazone: drug("troglitazone"),
  tolazamide: drug("tolazamide"),
  examide: drug("examide"),
  citoglipton: drug("citoglipton"),
  insulin: drug("insulin"),
  "glyburide-metformin": drug("the glyburide–metformin combination"),
  "glipizide-metformin": drug("the glipizide–metformin combination"),
  "glimepiride-pioglitazone": drug("the glimepiride–pioglitazone combination"),
  "metformin-rosiglitazone": drug("the metformin–rosiglitazone combination"),
  "metformin-pioglitazone": drug("the metformin–pioglitazone combination"),
  change: { section: "medications", question: "Did any diabetes medication or dose change during this stay?", control: "radio", source: records, help: "Include a change in the diabetes medication or its dose." },
  diabetesMed: { section: "medications", question: "Was any diabetes medication prescribed during this stay?", control: "radio", source: records },
} satisfies Record<FeatureKey, Question>;

export const questionFor = (key: FeatureKey): Question => questions[key];
