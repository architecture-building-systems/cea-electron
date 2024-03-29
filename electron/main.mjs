import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path, { dirname } from 'path';

import {
  isCEAAlive,
  createCEAProcess,
  killCEAProcess,
} from './cea/process.mjs';
import { fileURLToPath } from 'url';
import { getAutoUpdater } from './updater.mjs';
import {
  checkCEAenv,
  createCEAenv,
  getCEAenvVersion,
  updateCEAenv,
} from './cea/env.mjs';
import { CEAError } from './cea/errors.mjs';
import { initLog } from './log.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = !app.isPackaged;
const appVersion = app.getVersion();
const CEA_HOST = '127.0.0.1';
const CEA_PORT = '5050';
const CEA_URL = `http://${CEA_HOST}:${CEA_PORT}`;

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow;
let splashWindow;

const gotTheLock = app.requestSingleInstanceLock();
const autoUpdater = getAutoUpdater();
initLog();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('ready', () => {
    createSplashWindow(CEA_URL);
  });

  app.on('activate', () => {
    if (!BrowserWindow.getAllWindows().length) {
      createMainWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('will-quit', async (event) => {
    event.preventDefault();

    mainWindow && mainWindow.close();
    splashWindow && splashWindow.close();

    const shutdown = async () => {
      try {
        const resp = await fetch(`${CEA_URL}/server/shutdown`, {
          method: 'POST',
        });
        const content = await resp.json();
        console.log(content);
      } catch (error) {
        console.error(error);
      } finally {
        // Make sure CEA process is killed
        killCEAProcess();
      }
    };

    await shutdown();
    app.exit();
  });
}

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    show: false,
    backgroundColor: 'white',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, './preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: isDev,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // Only check if not dev
    autoUpdater.checkForUpdatesAndNotify();
  }

  mainWindow.once('ready-to-show', () => {
    splashWindow && splashWindow.close();
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    mainWindow.loadURL(url);
  });
};

function createSplashWindow(url) {
  splashWindow = new BrowserWindow({
    height: 300,
    width: 500,
    resizable: false,
    maximizable: false,
    show: false,
    frame: false,
    backgroundColor: '#2e2c29',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, './preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    },
  });

  // hides the traffic lights for macOS
  if (process.platform == 'darwin')
    splashWindow.setWindowButtonVisibility(false);

  if (isDev) {
    splashWindow.loadURL('http://localhost:5173/splash');
    splashWindow.openDevTools();
  } else {
    splashWindow.loadURL(
      `file://${path.join(__dirname, '../dist/index.html#splash')}`,
    );
  }

  splashWindow.once('ready-to-show', async () => {
    splashWindow.show();
    console.debug(`Starting CEA GUI ${appVersion}`);

    const preflightChecks = async () => {
      const sendPreflightEvent = (message) => {
        splashWindow.webContents.send('preflightEvents', message);
      };

      // Check for CEA
      sendPreflightEvent('Checking for CEA environment...');
      var ceaEnvExists = true;
      try {
        await checkCEAenv();
      } catch (error) {
        // Will throw CEAError if env does not exist
        if (error instanceof CEAError) ceaEnvExists = false;
        // Exit on any other errors
        else throw error;
      }

      // Create CEA env is does not exist
      if (!ceaEnvExists) {
        sendPreflightEvent(
          `Creating CEA environment(${appVersion})...\n(this might take a while)`,
        );
        // Fetch CEA version that is the same as the app
        await createCEAenv(`v${appVersion}`);
      }

      // Check CEA version
      const ceaVersion = await getCEAenvVersion();
      console.debug({ appVersion, ceaVersion });

      // Update CEA if outdated
      if (ceaVersion != appVersion) {
        sendPreflightEvent(`Updating CEA environment(${ceaVersion})...`);
        await updateCEAenv(`v${appVersion}`);
      }

      // Check if CEA server is already running, only start if not
      sendPreflightEvent('Starting CEA Dashboard...');
      const alive = await isCEAAlive(url);
      if (alive) {
        console.log('cea dashboard already running...');
        createMainWindow();
      } else {
        console.log('cea dashboard not running, starting...');
        createCEAProcess(url, splashWindow, () => {
          console.log('cea dashboard process created...');
          createMainWindow();
        });
      }
    };

    try {
      await preflightChecks();
    } catch (error) {
      dialog.showMessageBoxSync(splashWindow, {
        type: 'error',
        title: 'CEA Error',
        message: 'CEA has encounted an error on startup',
        detail: error.toString(),
        buttons: ['Exit CEA'],
      });
      app.exit();
    }
  });

  splashWindow.on('closed', () => {
    !mainWindow && killCEAProcess();
    splashWindow = null;
  });
}

ipcMain.handle('open-dialog', async (_, arg) => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, arg);
  return filePaths;
});

ipcMain.handle('open-external', async (_, { url }) => {
  shell.openExternal(url);
});
