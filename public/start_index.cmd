@echo off
cd /d "%~dp0"

start "" msedge --inprivate http://localhost:4567/index.html
python -m http.server 4567
