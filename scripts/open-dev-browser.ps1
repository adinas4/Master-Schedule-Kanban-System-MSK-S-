param(
  [string]$Url = ""
)

$ErrorActionPreference = "Stop"

function Get-PrimaryLocalIp {
  try {
    $ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
      Where-Object {
        $_.IPAddress -and
        $_.IPAddress -ne '127.0.0.1' -and
        $_.IPAddress -notlike '169.254.*' -and
        $_.IPAddress -ne '0.0.0.0' -and
        $_.SkipAsSource -ne $true
      } |
      Select-Object -ExpandProperty IPAddress -Unique)
    $preferred = $ips | Where-Object { $_ -like '192.168.1.*' } | Select-Object -First 1
    if ($preferred) { return $preferred }
    $lanCandidate = $ips | Where-Object { $_ -like '192.168.*' -and $_ -notlike '192.168.137.*' } | Select-Object -First 1
    if ($lanCandidate) { return $lanCandidate }
    return @($ips | Select-Object -First 1)
  } catch {
    return $null
  }
}

if (-not $Url) {
  $primaryIp = Get-PrimaryLocalIp
  if ($primaryIp) {
    $Url = "http://${primaryIp}:3000"
  } else {
    $Url = "http://localhost:3000"
  }
}

$trustedOrigins = @(
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  $Url
) | Select-Object -Unique
$trustedOriginList = ($trustedOrigins -join ',')

$edgeCandidates = @(
  (Get-Command "msedge.exe" -ErrorAction SilentlyContinue).Source,
  "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

$chromeCandidates = @(
  (Get-Command "chrome.exe" -ErrorAction SilentlyContinue).Source,
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

$browser = $edgeCandidates
if (-not $browser) {
  $browser = $chromeCandidates
}

if ($browser) {
  Start-Process -FilePath $browser -ArgumentList @(
    "--new-window",
    "--user-data-dir=$env:TEMP\monitoring-supplier-dev-browser",
    "--unsafely-treat-insecure-origin-as-secure=$trustedOriginList",
    $Url
  ) | Out-Null
  Write-Host "Browser dev dibuka ke $Url"
  return
}

Start-Process $Url | Out-Null
Write-Host "Browser default dibuka ke $Url"
