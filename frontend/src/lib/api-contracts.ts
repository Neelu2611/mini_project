import type { components } from "./api.generated";

type Schemas = components["schemas"];
export type Health = Schemas["HealthResponse"];
export type ModelInfo = Schemas["ModelInfoResponse"];
export type Features = Schemas["FeatureSchema"];
export type SamplePatient = Schemas["SamplePatientResponse"];
export type Patient = Schemas["PatientRequest"];
export type Prediction = Schemas["PredictionResponse"];
