import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { loadConfig, saveConfig } from './config';
import { setEnvVariables, getEnvVariables, deleteEnvVariables } from './env';

function createWindow() {
  const win = new BrowserWindow({
    width: 300,
    height: 550,
    resizable: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('close-window', () => app.quit());
  ipcMain.handle('get-providers', () => loadConfig());
  ipcMain.handle('get-env', () => getEnvVariables());

  ipcMain.handle('save-provider', (event, providerData) => {
    saveConfig([providerData]);
    return true;
  });

  ipcMain.handle('set-env', async (event, vars) => await setEnvVariables(vars));
  ipcMain.handle('delete-env', async (event, keys) => await deleteEnvVariables(keys));

  ipcMain.handle('fetch-models', async (event, { baseUrl, authToken, customHeaders }) => {
    try {
      const modelsUrl = baseUrl.endsWith('/') ? `${baseUrl}v1/models` : `${baseUrl}/v1/models`;

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      };

      if (customHeaders) {
        const parts = customHeaders.split(':');
        if (parts.length === 2) {
          headers[parts[0].trim()] = parts[1].trim();
        }
      }

      const response = await fetch(modelsUrl, { method: 'GET', headers });
      if (!response.ok) {
        return { error: `API returned ${response.status}: ${response.statusText}`, status: response.status };
      }
      return await response.json();
    } catch (e: any) {
      return { error: e.message };
    }
  });

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
