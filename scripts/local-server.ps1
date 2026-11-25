function Test-LocalPortUsed {
    param([int]$Port)
    $listeners = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners()
    return [bool]($listeners | Where-Object Port -EQ $Port | Select-Object -First 1)
}

function Test-ProjectServer {
    param([ValidateSet('Backend', 'Frontend')][string]$Name)
    try {
        if ($Name -eq 'Backend') {
            $spec = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/openapi.json' -TimeoutSec 8 -ErrorAction Stop
            return ($spec.info.title -eq 'Patient Readmission Prediction System' -and $null -ne $spec.paths.'/api/predict'.post)
        }
        $page = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/' -TimeoutSec 8 -UseBasicParsing -ErrorAction Stop
        return ($page.Content -match '<title>Patient Readmission Prediction System</title>')
    } catch {
        return $false
    }
}

function Test-ProjectServerAlreadyRunning {
    param([ValidateSet('Backend', 'Frontend')][string]$Name, [int]$Port)
    if (-not (Test-LocalPortUsed -Port $Port)) { return $false }
    if (Test-ProjectServer -Name $Name) {
        Write-Host "$Name already running at http://localhost:$Port."
        return $true
    }
    throw "Port $Port is in use and could not be verified as the project $Name. Check the listener before starting."
}
