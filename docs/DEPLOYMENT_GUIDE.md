# Local deployment preparation

## Environment

The verified Windows setup uses Python 3.13.7, Node.js 22.15.1 and npm 11.14.1. Next.js 16.4.6 requires Node.js 20.9 or newer. Keep the original trusted model at `artifacts/patient_readmission_model.pkl`. The loader checks its SHA-256 before deserialization.

Use the existing environment. For a fresh local checkout that lacks the environment or dependencies, provision them once:

```powershell
py -3.13 -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
Push-Location frontend
npm.cmd ci
Pop-Location
```

Use [backend/.env.example](../backend/.env.example) as a template for process environment variables. `READMISSION_MODEL_PATH` defaults to the project artifact path. `READMISSION_ALLOWED_ORIGINS` defaults to `http://localhost:3000`. Set `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` using [frontend/.env.example](../frontend/.env.example) as a template. The default is `http://localhost:8000`. The public browser variable is embedded at build time. Rebuild after changing it for production.

## Boot and build

```powershell
& .\start-project.ps1
```

This launches missing services in the background, using ignored `.runtime/` logs, and reuses recognized project servers. For foreground logs and Ctrl+C, run from separate terminals:

```powershell
& .\start-backend.ps1
```

```powershell
& .\start-frontend.ps1
```

For a local production-style frontend, run:

```powershell
Push-Location frontend
npm.cmd run build
Pop-Location
& .\start-project.ps1 -Production
```

Production mode starts `next start` when port 3000 is free. If a dev server is already running, the launcher reuses it. To switch modes, first stop your own dev server from its original terminal. FastAPI remains bound to loopback with access logging disabled.

## Troubleshooting

| Symptom | Check |
|---|---|
| Port already in use | Check `Get-NetTCPConnection -LocalPort 3000,8000 -State Listen`. The launcher leaves an unrecognized listener alone. |
| Model unavailable | Read [health](http://localhost:8000/api/health) and the backend log. Verify the model path, artifact checksum, and local Python dependencies. |
| Browser cannot reach FastAPI | Keep the frontend at `http://localhost:3000`, verify the backend URL, and check the explicit CORS origin in backend configuration. |
| Combined launcher fails | Inspect `.runtime/*err.log` or run the individual scripts in foreground terminals. |
| Results disappear on refresh | Start or resubmit an assessment. The browser keeps encounter data in memory. |
| No production build | Run the frontend build command before starting with `-Production`. |

The prepared configuration is for local review. A future hosted deployment needs separate approval, controlled access, deployment-specific CORS and routing, and an approved data-handling plan. No hosted resources are provisioned.

## Render Free: ten-question diabetes model

The backend's regular health endpoint reports the original Balanced XGBoost service. The short questionnaire loads its separate, checksum-verified artifact on first use. A Git checkout contains its metadata but excludes the private UBJ. Supply its bytes through a backend-only Render secret file.

1. On the trusted Windows machine, from the repository root, run the following PowerShell command. It copies the encoded artifact directly to the clipboard without printing it.

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path 'artifacts/diabetes-short-v1.ubj').Path)) | Set-Clipboard
   ```

2. In the Render backend, open **Environment > Secret Files > Add file**. Name it `diabetes-short-v1.b64` and paste the clipboard contents. Clear your clipboard and any retained clipboard history. Treat the encoded text as private model data.
3. Set backend `READMISSION_SHORT_MODEL_B64_FILE=/etc/secrets/diabetes-short-v1.b64`. The encoded file is 577,824 bytes. Render allows 1 MB combined for all secret files per service or environment group. See [Render secret files](https://render.com/docs/configure-environment-variables#secret-files).
4. Keep Python 3.12.12, root directory blank, build `pip install -r backend/requirements.txt`, and start `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port "$PORT" --no-access-log`. Deploy the revision containing the secret-file loader.
5. On the frontend, use root `frontend`, build `npm ci && npm run build`, start `npx next start --hostname 0.0.0.0 --port "$PORT"`, and set `NEXT_PUBLIC_API_BASE_URL=https://mini-project-backend-4hbr.onrender.com` before building. Rebuild after changing this variable. Set backend `READMISSION_ALLOWED_ORIGINS` to the exact frontend HTTPS origin (no path or trailing slash), then redeploy the backend. Separate multiple trusted origins with commas.
6. Use the synthetic examples in the backend's `/docs` to run both POST prediction routes. Expect HTTP 200 for each. Open the frontend's assessment and verify its network request reaches the backend's `/api/diabetes/predict` and displays the returned result.
