param(
  [switch]$StartServices
)

$ErrorActionPreference = "Stop"

if ([System.Threading.Thread]::CurrentThread.ApartmentState -ne "STA") {
  $scriptPath = $MyInvocation.MyCommand.Path
  $argumentList = @(
    "-NoProfile",
    "-STA",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$scriptPath`""
  )
  if ($StartServices) {
    $argumentList += "-StartServices"
  }
  Start-Process -FilePath "powershell.exe" -ArgumentList ($argumentList -join " ") -WindowStyle Hidden
  exit
}

$createdNew = $false
$mutex = New-Object System.Threading.Mutex($true, "MonitoringSupplierTrayController", [ref]$createdNew)
if (-not $createdNew) {
  exit
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
$LocalDevScript = Join-Path $ProjectRoot "scripts\local-dev.ps1"
$OpenBrowserScript = Join-Path $ProjectRoot "scripts\open-dev-browser.ps1"
$IconPath = Join-Path $ProjectRoot "launcher-icon.ico"

function Show-Balloon {
  param(
    [System.Windows.Forms.NotifyIcon]$NotifyIcon,
    [string]$Title,
    [string]$Message,
    [System.Windows.Forms.ToolTipIcon]$Icon = [System.Windows.Forms.ToolTipIcon]::Info
  )
  $NotifyIcon.BalloonTipTitle = $Title
  $NotifyIcon.BalloonTipText = $Message
  $NotifyIcon.BalloonTipIcon = $Icon
  $NotifyIcon.ShowBalloonTip(3500)
}

function Invoke-LocalDev {
  param(
    [System.Windows.Forms.NotifyIcon]$NotifyIcon,
    [string]$Action,
    [string]$Label
  )
  try {
    Show-Balloon -NotifyIcon $NotifyIcon -Title "Monitoring Supplier" -Message "$Label sedang dijalankan..."
    $argumentList = @(
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", "`"$LocalDevScript`"",
      "-Action", $Action
    )
    $process = Start-Process -FilePath "powershell.exe" -ArgumentList ($argumentList -join " ") -WindowStyle Hidden -Wait -PassThru
    if ($process.ExitCode -eq 0) {
      Show-Balloon -NotifyIcon $NotifyIcon -Title "Monitoring Supplier" -Message "$Label selesai." -Icon ([System.Windows.Forms.ToolTipIcon]::Info)
    } else {
      Show-Balloon -NotifyIcon $NotifyIcon -Title "Monitoring Supplier" -Message "$Label gagal. Exit code: $($process.ExitCode)" -Icon ([System.Windows.Forms.ToolTipIcon]::Error)
    }
  } catch {
    Show-Balloon -NotifyIcon $NotifyIcon -Title "Monitoring Supplier" -Message $_.Exception.Message -Icon ([System.Windows.Forms.ToolTipIcon]::Error)
  }
}

function Open-App {
  param([System.Windows.Forms.NotifyIcon]$NotifyIcon)
  try {
    Start-Process -FilePath "powershell.exe" -ArgumentList @(
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", "`"$OpenBrowserScript`""
    ) -WindowStyle Hidden | Out-Null
  } catch {
    Show-Balloon -NotifyIcon $NotifyIcon -Title "Monitoring Supplier" -Message $_.Exception.Message -Icon ([System.Windows.Forms.ToolTipIcon]::Error)
  }
}

function Get-HttpStatusCode {
  param([string]$Url)
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
    return [int]$response.StatusCode
  } catch {
    if ($_.Exception.Response) {
      return [int]$_.Exception.Response.StatusCode
    }
    return -1
  }
}

function Show-AppStatus {
  param([System.Windows.Forms.NotifyIcon]$NotifyIcon)
  $uiStatus = Get-HttpStatusCode -Url "http://127.0.0.1:3000"
  $apiStatus = Get-HttpStatusCode -Url "http://127.0.0.1:4000/api/auth/me"
  $uiLabel = if ($uiStatus -eq 200) { "OK" } else { "ERROR $uiStatus" }
  $apiLabel = if ($apiStatus -in @(200, 401, 403)) { "OK" } else { "ERROR $apiStatus" }
  $icon = if ($uiLabel -eq "OK" -and $apiLabel -eq "OK") {
    [System.Windows.Forms.ToolTipIcon]::Info
  } else {
    [System.Windows.Forms.ToolTipIcon]::Warning
  }
  Show-Balloon -NotifyIcon $NotifyIcon -Title "Monitoring Supplier Status" -Message "UI: $uiLabel`nAPI: $apiLabel" -Icon $icon
}

$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Text = "Monitoring Supplier"
try {
  $notifyIcon.Icon = New-Object System.Drawing.Icon($IconPath)
} catch {
  $notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
}
$notifyIcon.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip

$openItem = New-Object System.Windows.Forms.ToolStripMenuItem("Buka Aplikasi")
$openItem.add_Click({ Open-App -NotifyIcon $notifyIcon })
[void]$menu.Items.Add($openItem)

$statusItem = New-Object System.Windows.Forms.ToolStripMenuItem("Status")
$statusItem.add_Click({ Show-AppStatus -NotifyIcon $notifyIcon })
[void]$menu.Items.Add($statusItem)

[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

$restartAllItem = New-Object System.Windows.Forms.ToolStripMenuItem("Restart Semua")
$restartAllItem.add_Click({ Invoke-LocalDev -NotifyIcon $notifyIcon -Action "restart-all" -Label "Restart semua service" })
[void]$menu.Items.Add($restartAllItem)

$restartFrontendItem = New-Object System.Windows.Forms.ToolStripMenuItem("Restart Frontend")
$restartFrontendItem.add_Click({ Invoke-LocalDev -NotifyIcon $notifyIcon -Action "restart-frontend" -Label "Restart frontend" })
[void]$menu.Items.Add($restartFrontendItem)

$restartBackendItem = New-Object System.Windows.Forms.ToolStripMenuItem("Restart Backend")
$restartBackendItem.add_Click({ Invoke-LocalDev -NotifyIcon $notifyIcon -Action "restart-backend" -Label "Restart backend" })
[void]$menu.Items.Add($restartBackendItem)

[void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))

$exitItem = New-Object System.Windows.Forms.ToolStripMenuItem("Keluar Tray")
$exitItem.add_Click({
  $notifyIcon.Visible = $false
  $notifyIcon.Dispose()
  [System.Windows.Forms.Application]::Exit()
})
[void]$menu.Items.Add($exitItem)

$notifyIcon.ContextMenuStrip = $menu
$notifyIcon.add_DoubleClick({ Open-App -NotifyIcon $notifyIcon })

if ($StartServices) {
  Invoke-LocalDev -NotifyIcon $notifyIcon -Action "restart-all" -Label "Start service"
}

Show-Balloon -NotifyIcon $notifyIcon -Title "Monitoring Supplier" -Message "Tray controller aktif. Klik kanan untuk restart atau buka aplikasi."
[System.Windows.Forms.Application]::Run()

$mutex.ReleaseMutex()
$mutex.Dispose()
