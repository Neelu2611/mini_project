# Project demonstration and viva

## Review walkthrough

1. Run `& .\start-project.ps1` and open [Dashboard](http://localhost:3000). Point out the model readiness indicator and the live model metadata.
2. Open **Patient Assessment** and load the synthetic demo. Show why admission descriptions and ICD-9-CM titles are readable while the transmitted values remain exact.
3. Review all seven steps, confirm, and predict. Point out the synthetic badge, completed outcome, both charts, the three score rows and the academic-use notice.
4. Explain that the measured-lab demo returned class `0` or `NO` from the original Balanced XGBoost model. Its scores were about 0.58177, 0.25470 and 0.16353.
5. Show **Model Analytics**. Describe class 2 recall and the confusion matrix. Distinguish historical performance from live model inference.
6. Show **Dataset Overview** and distinguish the supplied workbook from the notebook data. Open **About the System** and trace the architecture.
7. Start a new assessment, then revisit **Prediction Results** to show the empty state. Open [Swagger](http://localhost:8000/docs) to demonstrate the typed API contract.

## Viva summary

**What does the system predict?** It chooses one of three historical readmission categories from structured discharge-encounter features. It returns the three uncalibrated scores used by the trained classifier.

**How does the pipeline work?** Next.js checks the draft and posts 47 fields. FastAPI validates the request. Python applies the saved missing-value rule and fitted transformer, producing 2,396 columns. The saved Balanced XGBoost model returns the class and ordered scores.

**Why Balanced XGBoost?** In the notebook, it had higher early-readmission recall and F1 than the unweighted run, with lower overall accuracy. The same historical holdout informed that selection.

**What was verified?** Actual synthetic requests exercised the original model, API and browser. Displayed scores matched direct inference. The supplied CSV has incompatible fields, so it was inventoried without computing accuracy from it.

**Can these scores guide care?** The project is an academic prototype. The scores are uncalibrated, and no clinical validation or independent reproduction of historical metrics has been established.

See the [screenshot index](FINAL_PROJECT_REPORT.md#screenshots) and [API documentation](API_DOCUMENTATION.md).
