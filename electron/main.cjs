const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const {
  checkForUpdates, downloadAndInstall, cancelDownload, launchUpdatedApp,
  canSelfUpdate, getReleasesUrl,
} = require('./updater.cjs');

const isDev = process.argv.includes('--dev') || !!process.env.C3D_DEV;
const isTest = !!process.env.C3D_TEST;
let mainWindow = null;

// Las pruebas automáticas usan un perfil temporal: nunca tocan las creaciones
// reales guardadas en ~/.config/creador-3d.
if (isTest) {
  app.setPath('userData', path.join(app.getPath('temp'), 'creador-3d-test-profile'));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1080,
    minHeight: 680,
    backgroundColor: '#f5f2ea',
    title: 'Creador 3D',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      spellcheck: false,
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Enlaces externos solo bajo demanda, nunca navegación dentro de la app.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file:')) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Atajos de ventana que no dependen del menú nativo.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
    if (input.type === 'keyDown' && input.key === 'F12' && isDev) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
}

function sanitizeName(name) {
  return String(name || 'creacion')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'creacion';
}

ipcMain.handle('project:save', async (_e, { data, name }) => {
  const base = sanitizeName(name);
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Guardar creación 3D',
    defaultPath: path.join(app.getPath('documents'), `${base}.c3d`),
    filters: [
      { name: 'Creación de Creador 3D', extensions: ['c3d'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  await fs.writeFile(result.filePath, data, 'utf8');
  return { canceled: false, path: result.filePath };
});

ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Abrir una creación 3D',
    properties: ['openFile'],
    filters: [
      { name: 'Creación de Creador 3D', extensions: ['c3d', 'json'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  const filePath = result.filePaths[0];
  const content = await fs.readFile(filePath, 'utf8');
  return { canceled: false, path: filePath, content };
});

ipcMain.handle('file:save', async (_e, { base64, suggestedName, filters, title }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: title || 'Exportar',
    defaultPath: path.join(app.getPath('documents'), sanitizeName(suggestedName)),
    filters: filters || [{ name: 'Todos los archivos', extensions: ['*'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  const buffer = Buffer.from(base64, 'base64');
  await fs.writeFile(result.filePath, buffer);
  return { canceled: false, path: result.filePath };
});

ipcMain.handle('image:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Elegir una imagen',
    properties: ['openFile'],
    filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }],
  });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  const filePath = result.filePaths[0];
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  return { canceled: false, dataUrl: `data:image/${mime};base64,${buffer.toString('base64')}`, name: path.basename(filePath) };
});

ipcMain.handle('window:fullscreen', async () => {
  if (!mainWindow) return false;
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
  return mainWindow.isFullScreen();
});

ipcMain.handle('app:info', async () => ({
  version: app.getVersion(),
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  canSelfUpdate: canSelfUpdate(),
  isAppImage: Boolean(process.env.APPIMAGE),
}));

ipcMain.handle('updates:check', async () => checkForUpdates());

ipcMain.handle('updates:install', async () => {
  const result = await downloadAndInstall((progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updates:progress', progress);
    }
  });
  if (result.ok) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updates:progress', { phase: 'launching', version: result.version, percent: 100 });
    }
    setTimeout(() => {
      launchUpdatedApp(result.path);
      app.quit();
    }, 900);
  }
  return result;
});

ipcMain.handle('updates:cancel', async () => cancelDownload());

ipcMain.handle('updates:open-releases', async () => {
  await shell.openExternal(getReleasesUrl());
  return { ok: true };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ----- Modo de pruebas automatizadas (captura de pantalla + consola) -----
if (process.env.C3D_TEST) {
  const testDir = process.env.C3D_TEST_DIR || '/tmp/opencode/c3d-test';
  const run = async () => {
    const fsSync = require('node:fs');
    fsSync.mkdirSync(testDir, { recursive: true });
    const logs = [];
    const attach = (win) => {
      win.webContents.on('console-message', (_e, level, message, line, source) => {
        logs.push({ level, message, line, source });
      });
      win.webContents.on('render-process-gone', (_e, details) => {
        logs.push({ level: 3, message: 'render-process-gone ' + JSON.stringify(details) });
      });
    };
    const capture = async (win, name) => {
      await new Promise((r) => setTimeout(r, 800));
      const img = await win.webContents.capturePage();
      fsSync.writeFileSync(path.join(testDir, name), img.toPNG());
    };
    app.whenReady().then(async () => {
      // Esperar a que la ventana esté lista.
      const waitWin = setInterval(async () => {
        const wins = BrowserWindow.getAllWindows();
        if (!wins.length) return;
        clearInterval(waitWin);
        const win = wins[0];
        attach(win);
        win.webContents.once('did-finish-load', async () => {
          try {
            await new Promise((r) => setTimeout(r, 2500));
            if (process.env.C3D_TEST_SCRIPT) {
              const scriptPath = process.env.C3D_TEST_SCRIPT;
              const code = fsSync.readFileSync(scriptPath, 'utf8');
              const result = await win.webContents.executeJavaScript(code, true);
              fsSync.writeFileSync(path.join(testDir, 'result.json'), JSON.stringify(result, null, 2));
            }
            await capture(win, process.env.C3D_TEST_SHOT || 'shot.png');
            if (process.env.C3D_TEST_SHOT2) {
              await win.webContents.executeJavaScript(process.env.C3D_TEST_SHOT2, true);
              await capture(win, 'shot2.png');
            }
          } catch (err) {
            logs.push({ level: 3, message: 'TEST ERROR: ' + (err && err.stack ? err.stack : String(err)) });
          } finally {
            fsSync.writeFileSync(path.join(testDir, 'console.json'), JSON.stringify(logs, null, 2));
            app.quit();
          }
        });
      }, 100);
    });
  };
  run();
}
