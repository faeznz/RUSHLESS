@echo off
REM --- Script Jalankan Semua Project ---
set BASEDIR=%~dp0

REM Buka BE-EXAM
start cmd /k "cd /d %BASEDIR%\RUSHLESS-BE-EXAM && npm install && node server.js"

REM Buka BE-MASTER
start cmd /k "cd /d %BASEDIR%\RUSHLESS-BE-MASTER && npm install && node server.js"

REM Buka FE
start cmd /k "cd /d %BASEDIR%\RUSHLESS-FE && set PORT=4000 && npm install && npm start"

REM Run Tunnel
start cmd /k "cloudflared tunnel run a6f8a35a-852c-4b78-acc3-65ab9c0bd04e"
