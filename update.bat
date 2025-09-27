@echo off
REM --- Script Git Pull ---

REM Ambil direktori lokasi file .bat ini
set BASEDIR=%~dp0

echo ============ Git Pull Root Repo ============
cd /d "%BASEDIR%"
git pull
if %errorlevel% neq 0 (
    echo Gagal git pull!
    pause
    exit /b %errorlevel%
)

echo ============ Selesai Git Pull ============
pause
