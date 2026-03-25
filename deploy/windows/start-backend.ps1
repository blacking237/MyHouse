$env:SPRING_PROFILES_ACTIVE='production'
$envFile = Join-Path $PSScriptRoot '..\..\backend\.env.production'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $pair = $_ -split '=', 2
    if ($pair.Length -eq 2) {
      [System.Environment]::SetEnvironmentVariable($pair[0], $pair[1], 'Process')
    }
  }
}

Push-Location (Join-Path $PSScriptRoot '..\..\backend')
try {
  .\mvnw.cmd clean package
  java -jar .\target\ambercity-backend-0.0.1-SNAPSHOT.jar
} finally {
  Pop-Location
}
