param(
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"

$certDir = Join-Path $RepoRoot ".certs"
$pfxPath = Join-Path $certDir "monitoring-supplier-dev.pfx"
$cerPath = Join-Path $certDir "monitoring-supplier-dev.cer"
$friendlyName = "Monitoring Supplier Dev HTTPS"
$subject = "CN=monitoring-supplier-dev"
$passwordPlainText = "monitoring-supplier-dev"

function Remove-LocalDevCertificates {
  param([string]$FriendlyName)
  foreach ($storePath in @("Cert:\CurrentUser\My", "Cert:\CurrentUser\Root")) {
    Get-ChildItem -Path $storePath -ErrorAction SilentlyContinue |
      Where-Object { $_.FriendlyName -eq $FriendlyName } |
      ForEach-Object {
        try {
          Remove-Item -Path $_.PSPath -Force -ErrorAction Stop
        } catch {
          Write-Warning "Gagal menghapus sertifikat lama dari ${storePath}: $($_.Exception.Message)"
        }
      }
  }
}

function Get-LocalIpv4Addresses {
  $addresses = @()
  try {
    $addresses = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
      Where-Object {
        $_.IPAddress -and
        $_.IPAddress -ne '127.0.0.1' -and
        $_.IPAddress -notlike '169.254.*' -and
        $_.IPAddress -ne '0.0.0.0' -and
        $_.SkipAsSource -ne $true
      } |
      Select-Object -ExpandProperty IPAddress -Unique
  } catch {
    $addresses = @()
  }
  return @($addresses | Where-Object { $_ })
}

New-Item -ItemType Directory -Path $certDir -Force | Out-Null
Remove-LocalDevCertificates -FriendlyName $friendlyName
Remove-Item -LiteralPath $pfxPath -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $cerPath -Force -ErrorAction SilentlyContinue

$dnsNames = @(
  'localhost'
  '127.0.0.1'
  $env:COMPUTERNAME
) | Where-Object { $_ } | Select-Object -Unique
if ($env:COMPUTERNAME) {
  $dnsNames += "$($env:COMPUTERNAME).local"
}

$ipAddresses = @('127.0.0.1') + (Get-LocalIpv4Addresses)
$sanParts = @()
foreach ($dns in $dnsNames) {
  $sanParts += "dns=$dns"
}
foreach ($ip in ($ipAddresses | Select-Object -Unique)) {
  $sanParts += "ipaddress=$ip"
}

if ($sanParts.Count -eq 0) {
  throw "Tidak ada SAN yang bisa dipakai untuk sertifikat HTTPS."
}

$sanText = ($sanParts -join '&')
$securePassword = ConvertTo-SecureString $passwordPlainText -AsPlainText -Force

$cert = New-SelfSignedCertificate `
  -Subject $subject `
  -FriendlyName $friendlyName `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -KeyAlgorithm RSA `
  -KeyLength 2048 `
  -HashAlgorithm SHA256 `
  -KeyExportPolicy Exportable `
  -KeyUsage DigitalSignature,KeyEncipherment `
  -Type SSLServerAuthentication `
  -NotAfter (Get-Date).AddYears(2) `
  -TextExtension @("2.5.29.17={text}$sanText")

if (-not $cert) {
  throw "Gagal membuat sertifikat HTTPS dev."
}

Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePassword | Out-Null
Export-Certificate -Cert $cert -FilePath $cerPath | Out-Null

$localIps = $ipAddresses | Select-Object -Unique
Write-Host "Sertifikat HTTPS dev siap."
Write-Host "Buka aplikasi di:"
Write-Host "  https://localhost:3000"
foreach ($ip in $localIps) {
  Write-Host "  https://${ip}:3000"
}
Write-Host "Gunakan launcher browser dev agar sertifikat lokal tidak menghambat akses."
