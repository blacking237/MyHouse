$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

Push-Location $projectRoot
try {
  Write-Host '[MyHouse] Export web bundle...'
  cmd /c npm run web:prod

  Write-Host '[MyHouse] Build Windows desktop package...'
  Push-Location $scriptDir
  try {
    $env:ELECTRON_RUN_AS_NODE = ''
    cmd /c npm run pack:win
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}
