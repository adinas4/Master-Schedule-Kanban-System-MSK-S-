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
    if ($Url.StartsWith("https://") -and (Test-CommandAvailable -Name "curl.exe")) {
      $responseCode = & curl.exe -k -s -o NUL -w "%{http_code}" $Url
      if ($LASTEXITCODE -eq 0 -and $responseCode) {
        return [int]$responseCode
      }
      return -1
    }
    $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 8
    return [int]$response.StatusCode
  } catch {
    if ($_.Exception.Response) {
      return [int]$_.Exception.Response.StatusCode
    }
    return -1
  }
}

function Get-HttpPostStatusCode {
  param([string]$Url)
  try {
    if ($Url.StartsWith("https://") -and (Test-CommandAvailable -Name "curl.exe")) {
      $responseCode = & curl.exe -k -s -o NUL -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "{}" $Url
      if ($LASTEXITCODE -eq 0 -and $responseCode) {
        return [int]$responseCode
      }
      return -1
    }
    $response = Invoke-WebRequest -Uri $Url -Method POST -UseBasicParsing -TimeoutSec 8 -ContentType "application/json" -Body "{}"
    return [int]$response.StatusCode
  } catch {
    if ($_.Exception.Response) {
      return [int]$_.Exception.Response.StatusCode
    }
    return -1
  }
}

function Ensure-PostgresAvailable {
  $listener = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    return
  }

  $service = Get-CimInstance Win32_Service -Filter "Name='postgresql-x64-17'" -ErrorAction SilentlyContinue
  if (-not $service -or -not $service.PathName) {
    Write-Host "PostgreSQL service tidak ditemukan. Lewati auto-start database."
    return
  }

  try {
    Start-Service -Name $service.Name -ErrorAction Stop
    Start-Sleep -Seconds 3
  } catch {
    Write-Host ("Start-Service PostgreSQL gagal, coba pg_ctl manual: " + $_.Exception.Message)
  }

  $listener = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    return
  }

  $exeMatch = [regex]::Match([string]$service.PathName, '^(.*?pg_ctl\.exe)')
  $dataMatch = [regex]::Match([string]$service.PathName, '-D\s+"([^"]+)"')
  if (-not $exeMatch.Success -or -not $dataMatch.Success) {
    Write-Host "Command PostgreSQL service tidak bisa dibaca untuk pg_ctl fallback."
    return
  }

  $pgCtl = $exeMatch.Groups[1].Value.Trim('"')
  $dataDir = $dataMatch.Groups[1].Value
  $logFile = Join-Path $repoRoot "logs\postgres-start.log"
  Write-Host "Menyalakan PostgreSQL via pg_ctl..."
  & $pgCtl start -D $dataDir -l $logFile -w
}

function Test-Pm2AppExists {
  param([string]$Name)
  # PM2 writes the normal "doesn't exist" result to stderr. With
  # $ErrorActionPreference = "Stop", invoking pm2.ps1 directly turns that
  # expected result into a terminating NativeCommandError before we can read
  # the exit code. Run the probe through cmd so a missing app simply returns
  # a non-zero status and Ensure-Pm2App can create it.
  & cmd.exe /d /c "pm2 describe `"$Name`" >NUL 2>&1"
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
  $checkDoStatus = Get-HttpPostStatusCode -Url "http://127.0.0.1:4000/api/receive-notes/check-do"
  $uiStatus = Get-HttpStatusCode -Url "http://127.0.0.1:3000"
  Write-Host ("- API /api/auth/me: " + $apiStatus + " (401 expected if no token)")
  Write-Host ("- API POST /api/receive-notes/check-do: " + $checkDoStatus + " (401/403 expected; 404 means backend lama atau route belum deploy)")
  Write-Host ("- UI /: " + $uiStatus)
}

if (-not (Test-CommandAvailable -Name "pm2")) {
  Write-Error "PM2 tidak ditemukan di PATH. Install PM2 atau jalankan manual: server(npm run start) + ui(npm run host)."
}

switch ($Action) {
  "restart-backend" {
    Ensure-PostgresAvailable
    Ensure-Pm2App -Name $apiName -ScriptPath (Join-Path $repoRoot "server/index.js") -Cwd (Join-Path $repoRoot "server")
    Show-Status
  }
  "restart-all" {
    Ensure-PostgresAvailable
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
