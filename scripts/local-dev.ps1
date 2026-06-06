param(
  [ValidateSet("status", "restart-backend", "restart-frontend", "restart-all", "logs-backend", "logs-frontend")]
  [string]$Action = "status"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$apiName = "monitoring-supplier-api"
$uiName = "monitoring-supplier"

function Test-CommandAvailable {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-HttpStatusCode {
  param([string]$Url)
  try {
    $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 8
    return [int]$response.StatusCode
  } catch {
    if ($_.Exception.Response) {
      return [int]$_.Exception.Response.StatusCode
    }
    return -1
  }
}

function Test-Pm2AppExists {
  param([string]$Name)
  & pm2 describe $Name *> $null
  return ($LASTEXITCODE -eq 0)
}

function Ensure-Pm2App {
  param(
    [string]$Name,
    [string]$ScriptPath,
    [string]$Cwd
  )

  if (Test-Pm2AppExists -Name $Name) {
    & pm2 restart $Name --update-env
    return
  }

  & pm2 start $ScriptPath --name $Name --cwd $Cwd
}

function Show-Status {
  Write-Host ""
  Write-Host "PM2 Process:"
  & pm2 list

  Write-Host ""
  Write-Host "Port status:"
  $ports = 3000, 4000
  foreach ($port in $ports) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) {
      Write-Host ("- :" + $port + " -> LISTEN pid " + $listener.OwningProcess)
    } else {
      Write-Host ("- :" + $port + " -> NOT LISTENING")
    }
  }

  Write-Host ""
  Write-Host "HTTP check:"
  $apiStatus = Get-HttpStatusCode -Url "http://127.0.0.1:4000/api/auth/me"
  $uiStatus = Get-HttpStatusCode -Url "http://127.0.0.1:3000"
  Write-Host ("- API /api/auth/me: " + $apiStatus + " (401 expected if no token)")
  Write-Host ("- UI /: " + $uiStatus)
}

if (-not (Test-CommandAvailable -Name "pm2")) {
  Write-Error "PM2 tidak ditemukan di PATH. Install PM2 atau jalankan manual: server(npm run start) + ui(npm run host)."
}

switch ($Action) {
  "restart-backend" {
    Ensure-Pm2App -Name $apiName -ScriptPath (Join-Path $repoRoot "server/index.js") -Cwd (Join-Path $repoRoot "server")
    Show-Status
  }
  "restart-all" {
    Ensure-Pm2App -Name $apiName -ScriptPath (Join-Path $repoRoot "server/index.js") -Cwd (Join-Path $repoRoot "server")
    Ensure-Pm2App -Name $uiName -ScriptPath (Join-Path $repoRoot "pm2-runner.js") -Cwd $repoRoot
    & pm2 save
    Show-Status
  }
  "restart-frontend" {
    Ensure-Pm2App -Name $uiName -ScriptPath (Join-Path $repoRoot "pm2-runner.js") -Cwd $repoRoot
    Show-Status
  }
  "logs-backend" {
    & pm2 logs $apiName --lines 120
  }
  "logs-frontend" {
    & pm2 logs $uiName --lines 120
  }
  default {
    Show-Status
  }
}
