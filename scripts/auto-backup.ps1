param(
  [int]$RetentionDays = 30,
  [string]$CloudDir = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
$BackupDir = Join-Path $ProjectRoot "backups"
$LogDir = Join-Path $ProjectRoot "logs"
$UploadsDir = Join-Path $ProjectRoot "server\uploads"
$ServerEnv = Join-Path $ProjectRoot "server\.env"

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = Join-Path $LogDir "backup_$stamp.log"

function Write-BackupLog {
  param([string]$Message)
  $line = "$(Get-Date -Format "yyyy-MM-dd HH:mm:ss") $Message"
  Add-Content -Path $logFile -Value $line
  Write-Host $line
}

function Read-EnvValue {
  param(
    [string]$Path,
    [string]$Key
  )
  if (-not (Test-Path $Path)) { return "" }
  $line = Get-Content -Path $Path | Where-Object { $_ -match "^\s*$Key\s*=" } | Select-Object -First 1
  if (-not $line) { return "" }
  return (($line -replace "^\s*$Key\s*=", "").Trim() -replace '^["'']|["'']$', "")
}

function Resolve-BackupCloudDir {
  param([string]$RequestedCloudDir)

  if ($RequestedCloudDir) {
    return $RequestedCloudDir
  }

  $configuredCloudDir = Read-EnvValue -Path $ServerEnv -Key "BACKUP_CLOUD_DIR"
  if ($configuredCloudDir) {
    return $configuredCloudDir
  }

  if ($env:BACKUP_CLOUD_DIR) {
    return $env:BACKUP_CLOUD_DIR
  }

  $candidates = @(
    $env:OneDriveCommercial,
    $env:OneDriveConsumer,
    $env:OneDrive,
    (Join-Path $env:USERPROFILE "OneDrive"),
    (Join-Path $env:USERPROFILE "Google Drive")
  ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

  foreach ($drive in Get-PSDrive -PSProvider FileSystem) {
    $myDrive = Join-Path $drive.Root "My Drive"
    if (Test-Path $myDrive) {
      $candidates += $myDrive
    }
  }

  $syncRoot = $candidates | Select-Object -First 1
  if (-not $syncRoot) {
    return ""
  }

  return (Join-Path $syncRoot "Monitoring Supplier Backups")
}

try {
  Write-BackupLog "Starting database backup"
  Push-Location $ProjectRoot
  try {
    $env:BACKUP_RETENTION_DAYS = [string]$RetentionDays
    & npm --prefix server run backup 2>&1 | ForEach-Object {
      Write-BackupLog ([string]$_)
    }
    $backupExitCode = $LASTEXITCODE
    if ($backupExitCode -ne 0) {
      throw "Database backup failed with exit code $backupExitCode"
    }
  } finally {
    Pop-Location
  }

  $createdFiles = @()
  $latestDump = Get-ChildItem -Path $BackupDir -Filter "*.dump" -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($latestDump) {
    $createdFiles += $latestDump.FullName
    Write-BackupLog "Latest database backup: $($latestDump.FullName)"
  }

  $uploadChildren = @()
  if (Test-Path $UploadsDir) {
    $uploadChildren = @(Get-ChildItem -Path $UploadsDir -Force)
  }
  if ($uploadChildren.Count -gt 0) {
    $uploadZip = Join-Path $BackupDir "uploads_$stamp.zip"
    Write-BackupLog "Starting uploads backup"
    Compress-Archive -Path (Join-Path $UploadsDir "*") -DestinationPath $uploadZip -Force
    $createdFiles += $uploadZip
    Write-BackupLog "Uploads backup created: $uploadZip"
  } else {
    Write-BackupLog "Uploads backup skipped: no files found"
  }

  if ($RetentionDays -gt 0) {
    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -Path $BackupDir -File |
      Where-Object { ($_.Extension -in @(".dump", ".zip")) -and $_.LastWriteTime -lt $cutoff } |
      ForEach-Object {
        Remove-Item -LiteralPath $_.FullName -Force
        Write-BackupLog "Deleted old backup: $($_.FullName)"
      }
  }

  $CloudDir = Resolve-BackupCloudDir -RequestedCloudDir $CloudDir

  if ($CloudDir) {
    New-Item -ItemType Directory -Force -Path $CloudDir | Out-Null
    foreach ($file in $createdFiles) {
      Copy-Item -LiteralPath $file -Destination $CloudDir -Force
      Write-BackupLog "Copied backup to cloud sync folder: $CloudDir"
    }
  } else {
    Write-BackupLog "Cloud copy skipped: no BACKUP_CLOUD_DIR and no OneDrive/Google Drive sync folder found"
  }

  Write-BackupLog "Backup completed"
} catch {
  Write-BackupLog "Backup failed: $($_.Exception.Message)"
  exit 1
}
