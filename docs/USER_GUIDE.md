# User guide

Start the application with `& .\start-project.ps1` from the project root and open [the dashboard](http://localhost:3000). Wait for **Model ready** in the header. The refresh icon rechecks reachability and readiness.

1. Open **Start Patient Assessment**.
2. Choose **Load Demo Patient** for a verified synthetic example.
3. Review the six input sections. The labels indicate whether an answer comes from the patient or the hospital record. For demonstrations, use synthetic or de-identified data only.
4. Use **Next** to validate each section, then confirm the final review. **Previous** and **Edit** return to earlier answers.
5. Choose **Predict Readmission** and wait for the result. If submission fails, follow the message and retry. The draft remains available.
6. Read the class, category and three uncalibrated scores. **Print summary** opens the browser print dialog. The printout excludes assessment inputs.
7. Use **Return to assessment** to revisit the draft or **Start new assessment** to clear both the draft and result. **Reset Form** also clears the current session. A full reload clears in-memory data.

Model Analytics describes notebook metrics and their limits. Dataset Overview describes the supplied workbook by counts and columns. About the System shows the component flow. For error recovery, see the [deployment guide](DEPLOYMENT_GUIDE.md).
