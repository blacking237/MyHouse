const { contextBridge, ipcRenderer } = require('electron');

function forward(type, value) {
  try {
    ipcRenderer.send('myhouse:renderer-log', JSON.stringify({ type, value }));
  } catch (_error) {
    // Ignore preload logging errors.
  }
}

window.addEventListener('error', (event) => {
  forward('window.error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  forward('window.unhandledrejection', {
    reason: String(event.reason),
  });
});

const originalConsoleError = console.error.bind(console);
console.error = (...args) => {
  forward('console.error', args.map((arg) => String(arg)).join(' '));
  originalConsoleError(...args);
};

contextBridge.exposeInMainWorld('MyHouseDesktop', {
  isDesktop: true,
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node,
  },
  openExternal: (url) => ipcRenderer.invoke('myhouse:openExternal', url),
});
