# MyHouse Desktop Shell

This folder packages the MyHouse web console into a desktop application.

## Product rule
The desktop application must stay aligned with the web console:
- same business logic
- same UI system
- same API contracts
- desktop-native features only when they add clear value

## Current behavior
The shell loads MyHouse in this order:
1. `MYHOUSE_WEB_URL` if provided
2. local exported web build in `../dist/index.html`
3. local exported web build in `../web-build/index.html`
4. fallback dev server `http://localhost:19006`

It also exposes a minimal secure bridge in `window.MyHouseDesktop`:
- `isDesktop`
- `platform`
- `versions`
- `openExternal(url)`

## Local workflows
Install the shell dependencies:

```powershell
npm install --prefix .\desktop-shell
```

Run against the Expo web dev server:

```powershell
npm run web
npm run desktop:remote
```

Run against a local exported web build:

```powershell
npm run web:prod
npm run desktop:local
```

If the machine forces `ELECTRON_RUN_AS_NODE=1`, use the dedicated launchers instead of the npm wrapper:

```powershell
.\desktop-shell\launch-local.cmd
```

or

```powershell
.\desktop-shell\launch-remote.cmd
```

For a debug launch with Chromium devtools:

```powershell
npm --prefix .\desktop-shell run launch:debug
```

Runtime logs are also written to:

```powershell
.\desktop-shell\desktop-runtime.log
```

## Windows installer
To build a Windows installer and a portable desktop executable:

```powershell
npm install --prefix .\desktop-shell
powershell -ExecutionPolicy Bypass -File .\desktop-shell\build-desktop-win.ps1
```

Artifacts are generated in:

```powershell
.\desktop-shell\dist-desktop
```

Available outputs:
- `MyHouse-<version>-x64.exe` via NSIS installer
- `MyHouse-<version>-x64-portable.exe` for portable usage

## Why Electron here
Electron is acceptable for the first MyHouse desktop rollout because:
- Windows support is straightforward
- the team can reuse the web console quickly
- packaging and future auto-update are well understood

If installer size and runtime footprint become strategic constraints later, this shell can be migrated to Tauri after the web console is stable.
