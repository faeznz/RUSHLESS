@echo off
set BASEDIR=%~dp0

wt ^
  new-tab cmd /k "cd /d %BASEDIR%\RUSHLESS-BE-EXAM && npm install && node server.js" ^
  ; new-tab cmd /k "cd /d %BASEDIR%\RUSHLESS-BE-MASTER && npm install && node server.js" ^
  ; new-tab cmd /k "cd /d %BASEDIR%\RUSHLESS-FE && set PORT=4000 && npm install && npm start" ^
  ; new-tab cmd /k "cloudflared tunnel run a6f8a35a-852c-4b78-acc3-65ab9c0bd04e"
