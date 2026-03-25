const { app, BrowserWindow, ipcMain, shell } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');

let localServer = null;
const logFilePath = path.join(__dirname, 'desktop-runtime.log');
const desktopIconPath = path.join(__dirname, 'MyHouse.png');

function appendDesktopLog(line) {
  const timestamp = new Date().toISOString();
  const payload = `[${timestamp}] ${line}\n`;
  try {
    fs.appendFileSync(logFilePath, payload, 'utf8');
  } catch (error) {
    console.error(`Unable to write desktop log: ${error.message}`);
  }
  console.log(line);
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.ttf': return 'font/ttf';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    case '.ico': return 'image/x-icon';
    default: return 'application/octet-stream';
  }
}

async function startLocalServer(directoryPath) {
  if (localServer) {
    return localServer;
  }

  const root = path.resolve(directoryPath);
  const server = http.createServer((req, res) => {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
    appendDesktopLog(`[desktop-http-request] ${req.method} ${requestPath}`);
    const normalized = requestPath === '/'
      ? 'index.html'
      : requestPath.replace(/^\/+/, '');

    let filePath = path.resolve(root, normalized);
    if (!filePath.startsWith(root)) {
      appendDesktopLog(`[desktop-http-forbidden] ${requestPath}`);
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(root, 'index.html');
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        appendDesktopLog(`[desktop-http-miss] ${filePath}`);
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      appendDesktopLog(`[desktop-http-hit] ${filePath}`);
      res.writeHead(200, {
        'Content-Type': getMimeType(filePath),
        'Cache-Control': 'no-store',
      });
      res.end(content);
    });
  });

  const port = await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Unable to resolve local server port'));
        return;
      }
      resolve(address.port);
    });
  });

  localServer = {
    server,
    root,
    url: `http://127.0.0.1:${port}`,
  };
  return localServer;
}

function resolveStartTarget() {
  if (process.env.MYHOUSE_WEB_URL) {
    return { type: 'url', value: process.env.MYHOUSE_WEB_URL };
  }

  const candidates = [
    path.join(__dirname, '..', 'dist'),
    path.join(__dirname, '..', 'web-build'),
  ];

  const localEntry = candidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html')));
  if (localEntry) {
    return { type: 'directory', value: localEntry };
  }

  return { type: 'url', value: 'http://localhost:19006' };
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1200,
    minHeight: 780,
    title: 'MyHouse Desktop',
    icon: fs.existsSync(desktopIconPath) ? desktopIconPath : undefined,
    backgroundColor: '#0D1B2A',
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.on('page-title-updated', (event) => {
    event.preventDefault();
    win.setTitle('MyHouse');
  });

  win.webContents.on('console-message', (_event, level, message) => {
    appendDesktopLog(`[renderer:${level}] ${message}`);
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    appendDesktopLog(`[desktop-load-failed] ${errorCode} ${errorDescription} ${validatedURL}`);
  });

  win.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      void win.webContents.executeJavaScript(`
        (() => {
          const root = document.getElementById('root');
          return JSON.stringify({
            location: window.location.href,
            title: document.title,
            bodyChildren: document.body.children.length,
            rootExists: Boolean(root),
            rootChildCount: root ? root.childNodes.length : -1,
            rootText: root ? (root.textContent || '').slice(0, 160) : '',
            bodyClass: document.body.className || ''
          });
        })();
      `, true).then((snapshot) => {
        appendDesktopLog(`[desktop-dom] ${snapshot}`);
      }).catch((error) => {
        appendDesktopLog(`[desktop-dom-error] ${error.message}`);
      });
    }, 1500);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    appendDesktopLog(`[desktop-render-gone] ${JSON.stringify(details)}`);
  });

  const startTarget = resolveStartTarget();
  appendDesktopLog(`[desktop-start-target] ${JSON.stringify(startTarget)}`);

  if (startTarget.type === 'directory') {
    const { url } = await startLocalServer(startTarget.value);
    appendDesktopLog(`[desktop-server] ${url} -> ${startTarget.value}`);
    await win.loadURL(url);
  } else {
    await win.loadURL(startTarget.value);
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.MYHOUSE_DESKTOP_DEBUG === '1') {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.myhouse.desktop');
  fs.writeFileSync(logFilePath, '', 'utf8');

  ipcMain.handle('myhouse:openExternal', async (_event, url) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return false;
    }
    await shell.openExternal(url);
    return true;
  });

  ipcMain.on('myhouse:renderer-log', (_event, payload) => {
    appendDesktopLog(`[renderer-event] ${payload}`);
  });

  void createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (localServer) {
    localServer.server.close();
    localServer = null;
  }
  if (process.platform !== 'darwin') app.quit();
});
