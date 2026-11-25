$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'scripts/local-server.ps1')
if (Test-ProjectServerAlreadyRunning -Name Backend -Port 8000) { return }

$python = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $python -PathType Leaf)) {
    throw 'The project virtual environment is unavailable. See docs/DEPLOYMENT_GUIDE.md.'
}
Push-Location -LiteralPath $PSScriptRoot
try {
    & $python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --no-access-log
    if ($LASTEXITCODE -ne 0) { throw "Uvicorn exited with code $LASTEXITCODE." }
} finally {
    Pop-Location
}
