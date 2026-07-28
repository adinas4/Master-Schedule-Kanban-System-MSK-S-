param(
  [string]$Token = "",
  [string]$InstallCommand = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
$Cloudflared = Join-Path $ProjectRoot ".tools\cloudflared\cloudflared.exe"

if (-not (Test-Path $Cloudflared)) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Cloudflared) | Out-Null
  Invoke-WebRequest `
    -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" `
    -OutFile $Cloudflared
}

if (-not $Token -and $InstallCommand) {
  if ($InstallCommand -match "service\s+install\s+([A-Za-z0-9_\-\.=]+)") {
    $Token = $Matches[1]
  }
}

if (-not $Token) {
  Write-Host "Token kosong."
  Write-Host "Buka Cloudflare Dashboard > Zero Trust > Networks > Tunnels > Create tunnel."
  Write-Host "Pilih Windows, lalu copy token/command install dan jalankan script ini dengan -Token atau -InstallCommand."
  exit 1
}

Write-Host "cloudflared:"
& $Cloudflared --version

Write-Host "Installing Cloudflare Tunnel service..."
& $Cloudflared service install $Token

Write-Host "Cloudflare Tunnel service installed."
