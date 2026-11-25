# Readmission prediction frontend

The Phase 5 Next.js workspace includes six route foundations, live backend readiness, and a model overview.

Use the existing project environment. From the repository root, open two Windows PowerShell terminals.

**Terminal 1 — FastAPI**

```powershell
& .\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

**Terminal 2 — Next.js**

```powershell
Set-Location frontend
npm.cmd ci
npm.cmd run dev
```

Open [the dashboard](http://localhost:3000). The default backend URL is `http://localhost:8000`. To change it, set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` using [.env.example](.env.example) as a template. Use the localhost frontend origin for the default CORS configuration.

## Checks

From `frontend/`, run:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

The Playwright suite expects both development servers to be running. It uses Microsoft Edge by default. To use an installed Chrome instance, set `$env:PLAYWRIGHT_BROWSER_CHANNEL = 'chrome'`. The tests save dashboard screenshots to `test-results/`.

See the [frontend architecture](../docs/FRONTEND_ARCHITECTURE.md), [API contract](../docs/API_DOCUMENTATION.md), and [Phase 5 report](../docs/PHASE_5_REPORT.md).
