$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidDir = Join-Path $projectRoot "android"
$sdkRoot = "C:\Users\maman\AppData\Local\Android\Sdk"
$ndkRoot = Join-Path $sdkRoot "ndk\25.1.8937393"

& (Join-Path $PSScriptRoot "apply-local-patches.ps1")

$env:NODE_ENV = "production"
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:ANDROID_NDK_HOME = $ndkRoot
$env:GRADLE_USER_HOME = Join-Path $projectRoot ".gradle-home-release"
$env:ANDROID_USER_HOME = Join-Path $projectRoot ".android-release"
$env:GRADLE_OPTS = "-Duser.home=$projectRoot"

Push-Location $androidDir
try {
  & .\gradlew assembleRelease --no-daemon
  if ($LASTEXITCODE -ne 0) {
    throw "La commande gradlew assembleRelease a echoue avec le code $LASTEXITCODE."
  }
} finally {
  Pop-Location
}

$releaseApk = Join-Path $projectRoot "android\app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $releaseApk)) {
  throw "APK release introuvable: $releaseApk"
}

$jarExe = Join-Path $env:JAVA_HOME "bin\jar.exe"
if (-not (Test-Path $jarExe)) {
  throw "jar.exe introuvable dans JAVA_HOME: $jarExe"
}

$bundleEntry = & $jarExe tf $releaseApk | Select-String -SimpleMatch "assets/index.android.bundle"
if (-not $bundleEntry) {
  throw "L APK release ne contient pas assets/index.android.bundle. Refuser cette build."
}

$packageJson = Get-Content (Join-Path $projectRoot "package.json") | ConvertFrom-Json
$appJson = Get-Content (Join-Path $projectRoot "app.json") | ConvertFrom-Json
$appName = if ($appJson.expo.name) { $appJson.expo.name } else { $packageJson.name }
$version = if ($appJson.expo.version) { $appJson.expo.version } else { $packageJson.version }
$safeAppName = ($appName -replace '[^A-Za-z0-9._-]', '-').Trim('-')

$deliverDir = Join-Path $projectRoot "dist\android"
New-Item -ItemType Directory -Force -Path $deliverDir | Out-Null

$deliverApk = Join-Path $deliverDir "$safeAppName-$version-release.apk"
Copy-Item -LiteralPath $releaseApk -Destination $deliverApk -Force

Write-Host ""
Write-Host "APK release verifiee et copitee ici:"
Write-Host $deliverApk
