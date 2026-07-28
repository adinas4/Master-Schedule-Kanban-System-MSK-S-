$ErrorActionPreference = "Stop"

$service = Get-CimInstance Win32_Service -Filter "Name='cloudflared'"
if (-not $service -or -not $service.PathName) {
  throw "cloudflared service is not installed."
}

$command = [string]$service.PathName
$exeMatch = [regex]::Match($command, '^(.*?cloudflared\.exe)')
$tokenMatch = [regex]::Match($command, '--token\s+([^\s]+)')
if (-not $exeMatch.Success -or -not $tokenMatch.Success) {
  throw "cloudflared service command/token could not be read."
}

$exe = $exeMatch.Groups[1].Value.Trim('"')
$env:TUNNEL_TOKEN = $tokenMatch.Groups[1].Value

& $exe tunnel --protocol http2 run
