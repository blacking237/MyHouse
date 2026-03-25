$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

function Update-FileContent {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Transform
  )

  if (-not (Test-Path $Path)) {
    Write-Host "Skip missing file: $Path"
    return
  }

  $before = Get-Content $Path -Raw
  $after = & $Transform $before
  if ($after -ne $before) {
    Set-Content -Path $Path -Value $after -NoNewline
    Write-Host "Patched: $Path"
  } else {
    Write-Host "Already patched: $Path"
  }
}

Update-FileContent -Path (Join-Path $root "node_modules\react-native\gradle\libs.versions.toml") -Transform {
  param($content)
  $content -replace 'ndkVersion = "26\.1\.10909125"', 'ndkVersion = "25.1.8937393"'
}

Update-FileContent -Path (Join-Path $root "node_modules\expo-sqlite\android\build.gradle") -Transform {
  param($content)
  if ($content -match 'ndkVersion "25\.1\.8937393"') {
    return $content
  }
  $content -replace "android \{", "android {`r`n  ndkVersion `"25.1.8937393`""
}

Update-FileContent -Path (Join-Path $root "node_modules\expo-modules-core\android\ExpoModulesCorePlugin.gradle") -Transform {
  param($content)
  if ($content -match 'def releaseComponent = components\.findByName\("release"\)') {
    return $content
  }
  $content -replace [regex]::Escape("        release(MavenPublication) {
          from components.release
        }"), @'
        def releaseComponent = components.findByName("release")
        if (releaseComponent != null) {
          release(MavenPublication) {
            from releaseComponent
          }
        }
'@
}

Write-Host "Local Android patches applied."
