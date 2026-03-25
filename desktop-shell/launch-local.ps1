$ErrorActionPreference = 'Stop'

$shellRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $shellRoot '..')
$electronExe = Join-Path $shellRoot 'node_modules\electron\dist\electron.exe'

if (-not (Test-Path $electronExe)) {
  throw "Electron executable not found at $electronExe"
}

Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
Remove-Item Env:MYHOUSE_WEB_URL -ErrorAction SilentlyContinue

Start-Process -FilePath $electronExe -ArgumentList $shellRoot -WorkingDirectory $projectRoot
