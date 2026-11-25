# Phase 11 report

The final verification exercised all six routes in Microsoft Edge, including 47-field conformance, seven-step review, synthetic demo loading, reset, live prediction, CORS, score order and parity, the two results charts, print layout, and the analytics, dataset and architecture pages. It also exercised duplicate prevention, backend errors, retry, direct navigation and refresh, new-assessment clearing, keyboard navigation and mobile layout. Browser storage was compared before and after the live prediction, and the results URL was verified to contain no input values.

| Check | Result |
|---|---|
| TypeScript | Passed |
| ESLint with zero warnings allowed | Passed |
| Backend unittest | 33 passed, 0 failed |
| Full Playwright run | 15 passed, 1 test-selector failure |
| Targeted rerun | 1 passed, 0 failed |
| Unique Playwright cases after correction | 16 passed, 0 remaining failures |
| Final Next.js production build | Passed. All six application routes prerendered. |

The analytics chart test initially matched two legend SVGs as well as the plotting surface. The chart rendered correctly. The selector was narrowed to the plotting surface, and only that affected test was rerun.

Run from the repository root in Windows PowerShell:

```powershell
& .\.venv\Scripts\python.exe -m unittest discover -s backend/tests -v
Push-Location frontend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
Pop-Location
```

The Playwright suite expects both local services at ports 3000 and 8000. A real synthetic submission returned `0 / NO` with scores `0.5817686319351196`, `0.25470006465911865`, and `0.1635313332080841`. Browser score rows matched direct FastAPI output within `1e-6`.
