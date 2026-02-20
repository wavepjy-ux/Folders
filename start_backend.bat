@echo off
setlocal

cd /d %~dp0\server

if not exist .venv\Scripts\python.exe (
  echo [INFO] Creating virtual environment...
  py -3 -m venv .venv
  if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment.
    pause
    exit /b 1
  )
)

echo [INFO] Installing dependencies...
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 (
  echo [ERROR] Failed to install requirements.
  pause
  exit /b 1
)

echo [INFO] Starting backend at http://127.0.0.1:8787
.venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8787

endlocal
