param([switch]$Production)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'scripts/local-server.ps1')
$targets = @(
    @{ Name = 'Backend'; Port = 8000; Entry = 'start-backend.ps1' },
    @{ Name = 'Frontend'; Port = 3000; Entry = 'start-frontend.ps1' }
)
$toStart = @()
foreach ($target in $targets) {
    if (-not (Test-ProjectServerAlreadyRunning -Name $target.Name -Port $target.Port)) {
        $toStart += $target
    }
}

if ($toStart.Count) {
    $logDir = Join-Path $PSScriptRoot '.runtime'
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $powerShell = (Get-Process -Id $PID).Path
    foreach ($target in $toStart) {
        $entry = Join-Path $PSScriptRoot $target.Entry
        $arguments = @('-NoProfile', '-File', ('"{0}"' -f $entry))
        if ($Production -and $target.Name -eq 'Frontend') { $arguments += '-Production' }
        $outputLog = Join-Path $logDir "$($target.Name.ToLowerInvariant()).out.log"
        $errorLog = Join-Path $logDir "$($target.Name.ToLowerInvariant()).err.log"
        $target.Process = Start-Process -FilePath $powerShell -ArgumentList $arguments -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $outputLog -RedirectStandardError $errorLog
        $target.ErrorLog = $errorLog
        Write-Host "Starting $($target.Name). Logs are in $logDir."
    }
    foreach ($target in $toStart) {
        $deadline = [DateTime]::UtcNow.AddSeconds(180)
        while (-not ((Test-LocalPortUsed -Port $target.Port) -and (Test-ProjectServer -Name $target.Name))) {
            if ($target.Process.HasExited) { throw "$($target.Name) stopped during startup. See $($target.ErrorLog)." }
            if ([DateTime]::UtcNow -ge $deadline) { throw "$($target.Name) did not become reachable. See $($target.ErrorLog)." }
            Start-Sleep -Seconds 1
        }
    }
}

try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 8 -ErrorAction Stop
    if ($health.model_ready -ne $true -or $health.service_available -ne $true) {
        Write-Warning 'The backend is reachable, but inference is unavailable.'
    }
} catch {
    Write-Warning 'The backend did not report model readiness. Check /api/health and the backend logs.'
}
Write-Host 'Frontend  http://localhost:3000'
Write-Host 'Backend   http://localhost:8000'
Write-Host 'Swagger   http://localhost:8000/docs'
