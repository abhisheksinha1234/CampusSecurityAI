
@echo off
title Campus Security AI Launcher

echo ==========================================
echo       CAMPUS SECURITY AI
echo ==========================================

echo Starting Backend Server...

start "Campus Security Backend" cmd /k "cd /d ""%~dp0"" && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server...

start "Campus Security Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo Waiting for servers to initialize...
timeout /t 7 /nobreak >nul

echo Opening Campus Security AI...

start "" "http://localhost:5173"

echo Website launch commands completed!
