@echo off
setlocal
cd /d "C:\Users\matra\monitoring-supplier"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\local-dev.ps1" -Action restart-frontend
if %errorlevel% neq 0 (
  echo Gagal menjalankan mode PM2. Fallback ke mode manual (vite host)...
  npm run host
)
echo.
echo Aplikasi selesai atau error.
pause>nul
