param([switch]$Production)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'scripts/local-server.ps1')
if (Test-ProjectServerAlreadyRunning -Name Frontend -Port 3000) { return }

$frontend = Join-Path $PSScriptRoot 'frontend'
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm -or -not (Test-Path -LiteralPath (Join-Path $frontend 'node_modules/.bin/next.cmd'))) {
    throw 'Node.js or the installed frontend dependencies are unavailable. See docs/DEPLOYMENT_GUIDE.md.'
}
if ($Production -and -not (Test-Path -LiteralPath (Join-Path $frontend '.next/BUILD_ID'))) {
    throw 'The production build is unavailable. Run npm.cmd run build from frontend first.'
}
$script = if ($Production) { 'start' } else { 'dev' }
Push-Location -LiteralPath $frontend
try {
    & $npm.Source run $script
    if ($LASTEXITCODE -ne 0) { throw "Next.js exited with code $LASTEXITCODE." }
} finally {
    Pop-Location
}
