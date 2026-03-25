@echo off
setlocal
set "ELECTRON_RUN_AS_NODE="
set "MYHOUSE_WEB_URL=http://localhost:19006"
powershell -ExecutionPolicy Bypass -File "%~dp0launch-remote.ps1"
