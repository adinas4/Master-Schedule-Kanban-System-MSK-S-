param(
  [string]$TaskName = "MonitoringSupplierDailyBackup",
  [string]$At = "23:00",
  [int]$RetentionDays = 30,
  [string]$CloudDir = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackupScript = Resolve-Path (Join-Path $ScriptDir "auto-backup.ps1")

$argumentList = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", "`"$BackupScript`"",
  "-RetentionDays", "$RetentionDays"
)

if ($CloudDir) {
  $argumentList += @("-CloudDir", "`"$CloudDir`"")
}

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ($argumentList -join " ")
$trigger = New-ScheduledTaskTrigger -Daily -At $At
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Force | Out-Null

Write-Host "Scheduled task installed: $TaskName"
Write-Host "Schedule: daily at $At"
Write-Host "Script: $BackupScript"
