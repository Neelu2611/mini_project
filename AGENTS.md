# Patient Readmission Prediction System

This repository is currently in the planning phase. Begin application development only after the user approves the plan in [Implementation plan](docs/IMPLEMENTATION_PLAN.md).

- Preserve the confirmed canonical notebook, `notebooks/patient_readmission_review2_backup.ipynb`.
- Use the supplied trusted Balanced XGBoost bundle and its fitted preprocessor. Preserve the original export and fit.
- Keep exact feature names, order, data types, missing-value rules and class mapping from [Project audit](docs/PROJECT_AUDIT.md). Verify fitted metadata before publishing the inference contract.
- Deserialise only trusted artifacts with documented provenance. Keep raw data and model files outside frontend assets and source control unless the user approves inclusion.
- Predictions shown to users must originate from the Python inference service. Use synthetic or de-identified inputs for development and verification. Avoid persisting or logging encounter payloads.
- Present the product as an academic prototype. Label historical evaluation and uncalibrated model scores clearly, and publish metrics with their source and model version.
- Use the supplied dataset only where records satisfy the verified input contract. Preserve the source and keep any converted working copy local. Use explicitly labelled synthetic fixtures for incomplete inputs.
- Historical training dataset verification is deferred. Phase 2 requires a working Python environment and successful independent inference, including fitted schema and parity checks. Obtain user approval before beginning Phase 3.
- Follow the proposed Next.js and FastAPI boundaries in [Architecture](docs/ARCHITECTURE.md). Keep the first release stateless. Use [Required files](docs/REQUIRED_FILES.md) for intake and recovery.
