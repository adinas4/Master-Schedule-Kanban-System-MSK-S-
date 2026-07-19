@echo off
setlocal
set ROOT_DIR=C:\Users\matra\monitoring-supplier

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%\scripts\local-dev.ps1" -Action restart-all

if %errorlevel% neq 0 (
  echo Gagal menjalankan mode PM2. Fallback ke mode manual CMD...
  start "Monitoring Supplier API" cmd /k "cd /d %ROOT_DIR%\server && npm run start"
  start "Monitoring Supplier UI" cmd /k "cd /d %ROOT_DIR% && npm run host"
) else (
  echo Backend + Frontend berhasil dijalankan via PM2.
)

timeout /t 6 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%\scripts\open-dev-browser.ps1"
