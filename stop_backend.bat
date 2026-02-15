@echo off
setlocal

echo [INFO] Stopping process listening on :8787...
set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8787 ^| findstr LISTENING') do (
  set FOUND=1
  echo [INFO] Killing PID %%a
  taskkill /F /PID %%a >nul 2>nul
)

if "%FOUND%"=="0" (
  echo [INFO] No listening process found on port 8787.
)

echo [INFO] Done.
endlocal
