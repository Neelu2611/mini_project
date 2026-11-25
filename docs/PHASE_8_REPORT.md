# Phase 8 report

The seven-step form now validates all 47 fields and submits the exact verified payload to `POST /api/predict` after explicit review. It uses the existing typed client and trained Balanced XGBoost backend. The in-flight guard and disabled controls prevent duplicate submission. Validation, connectivity, timeout, unavailable model and inference errors leave the draft available for review or retry.

The basic results page displays the predicted class, backend category, three ordered scores, model name and academic-use disclaimer. It identifies results from the demo fixture as synthetic. A shared in-memory provider allows return to the assessment and clears the draft and result when starting a new one. A full reload or a fresh visit to the results route shows the empty state. Assessment data never enters browser storage or route parameters.

## Actual synthetic prediction

The measured-lab demo fixture returned class `0`, token `NO`, category **No recorded readmission**. Scores are uncalibrated.

| Class and outcome | Direct FastAPI score |
|---|---:|
| 0 · `NO` · No recorded readmission | 0.5817686319351196 |
| 1 · `>30` · Readmission after 30 days | 0.25470006465911865 |
| 2 · `<30` · Readmission within 30 days | 0.1635313332080841 |

## Verification

- TypeScript and ESLint passed.
- Eight targeted Playwright tests passed in Microsoft Edge. The browser submitted the same 47 fields as the verified fixture, displayed all three scores within `1e-6` of direct FastAPI inference, and supported return to the draft, reset, and the empty results state after reload or direct navigation.
- Browser error checks covered HTTP 422, 503 and 500, an invalid response, loss of connectivity, and a request timeout. The form retained the reviewed answers, blocked a second submit while the first was pending, and recovered through a real retry.
- [Screenshot of the actual synthetic result](../frontend/test-results/phase8-results.png).
- The FastAPI code and installed dependencies were preserved. The trained model, notebook and feature schema retain their verified checksums.

## Changed files

- `frontend/src/components/assessment/assessment-session.tsx` and `frontend/src/app/layout.tsx` provide the in-memory route handoff.
- `frontend/src/components/assessment/assessment-form.tsx` submits and retries predictions through `frontend/src/lib/api.ts`.
- `frontend/src/components/assessment/prediction-result.tsx`, `frontend/src/app/results/page.tsx` and `frontend/src/app/results/results.css` render the basic results and empty state.
- `frontend/tests/prediction.spec.ts` covers the live workflow and error cases. `frontend/tests/assessment.spec.ts` now checks that confirmation enables live submission.

No Phase 8 blockers remain. The advanced results dashboard awaits Phase 9 approval.
