@echo off
REM --- Script Jalankan Semua Project ---
set BASEDIR=%~dp0

REM --- Jalankan BE-EXAM ---
start "" cmd /k "cd /d %BASEDIR%RUSHLESS-BE-EXAM && npm install && node server.js"

REM --- Jalankan BE-MASTER ---
start "" cmd /k "cd /d %BASEDIR%RUSHLESS-BE-MASTER && npm install && node server.js"

REM --- Build & Serve FE ---
start "" cmd /k "cd /d %BASEDIR%RUSHLESS-FE && npm install && npm run build && npx serve -s build -l 4000"

REM --- Jalankan Cloudflare Tunnel ---
start "" cmd /k "cloudflared tunnel run a6f8a35a-852c-4b78-acc3-65ab9c0bd04e"
