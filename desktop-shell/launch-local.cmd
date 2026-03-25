@echo off
setlocal
set "ELECTRON_RUN_AS_NODE="
set "MYHOUSE_WEB_URL="
powershell -ExecutionPolicy Bypass -File "%~dp0launch-local.ps1"
