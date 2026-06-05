import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import electronUpdater from 'electron-updater'
import { initDb } from './db'
import { initPrefs } from './prefs'
import { registerIpc } from './ipc'

const { autoUpdater } = electronUpdater

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    show: false,
    backgroundColor: '#E8EDE6',
    title: 'Neroli Sales App',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  // Open external links in the OS browser, never inside the app shell.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const userData = app.getPath('userData')
  initDb(join(userData, 'neroli.sqlite'))
  initPrefs(join(userData, 'preferences.json'))
  registerIpc()
  createWindow()

  // Background update check (§9.2) — silent, non-blocking, fails gracefully offline.
  autoUpdater.autoDownload = true
  autoUpdater.checkForUpdatesAndNotify().catch(() => {
    /* offline or no feed configured — retry on next launch */
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
