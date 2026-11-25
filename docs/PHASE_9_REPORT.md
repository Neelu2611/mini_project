# Phase 9 report

The results page presents the live FastAPI outcome and prediction status, the model name, and two Recharts views of the three scores. The donut chart and horizontal bar chart share the exact validated response data. Text rows preserve the fitted order `NO`, `>30`, and `<30` and offer an accessible alternative to the charts.

The page explains the selected category without interpreting the model score as calibrated clinical risk. The demo badge and academic disclaimer remain visible. Return and start-new actions reuse the existing in-memory workflow. Refresh or direct navigation shows the empty state, and the route has loading and error fallbacks.

**Print summary** uses the browser print dialog. The print layout retains the outcome, model, score rows, demo label and disclaimer, with navigation and charts hidden. No automatic export is created.

The browser verified both charts, desktop and mobile layout, printable content, and the live demo score parity within `1e-6`. See [results](../screenshots/03-prediction-results.png), [mobile results](../screenshots/08-mobile-results.png) and the [Phase 11 report](PHASE_11_REPORT.md).
