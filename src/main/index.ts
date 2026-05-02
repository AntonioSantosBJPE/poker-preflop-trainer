import { existsSync } from 'node:fs';
import { app, BrowserWindow, session } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import log from 'electron-log';
import { registerAllIpc } from './ipc/register';
import { initDatabase } from './db/client';

/** Isolamento de dados e auth em testes E2E (Playwright / CI sem keyring). */
const e2eUserData = process.env['PT_E2E_USER_DATA'];
if (e2eUserData) {
  app.setPath('userData', e2eUserData);
}

log.transports.file.level = 'info';
Object.assign(console, log.functions);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Ícone da janela (Linux/Windows); tenta build `out/renderer` ou fonte `public` em dev. */
function resolveWindowIcon(): string | undefined {
  const built = path.join(__dirname, '../renderer/assets/logo/icon.png');
  if (existsSync(built)) return built;
  const fromSrc = path.join(app.getAppPath(), 'src/renderer/public/assets/logo/icon.png');
  if (existsSync(fromSrc)) return fromSrc;
  return undefined;
}

function setupCsp(): void {
  // Em dev o renderer vem do servidor Vite (HMR, WebSocket, etc.). CSP estrita quebra a página em branco.
  if (process.env['ELECTRON_RENDERER_URL']) {
    return;
  }
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp =
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });
}

function createWindow(): void {
  const icon = resolveWindowIcon();
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  const devUrl = process.env['ELECTRON_RENDERER_URL'];
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  setupCsp();
  initDatabase();
  registerAllIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
