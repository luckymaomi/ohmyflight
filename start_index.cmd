@echo off
setlocal

cd /d "%~dp0"

echo [ohmyflight] Building dist and source archive...
call npm.cmd run build
if errorlevel 1 (
  echo [ohmyflight] Build failed.
  exit /b 1
)

echo [ohmyflight] Opening local site...
start "" msedge --inprivate http://localhost:4567/index.html
python -m http.server 4567 --directory dist
