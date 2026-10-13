import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { writeFile, readFile } from 'fs/promises'
import { is } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: process.platform === 'darwin' ? true : false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 12 },
    backgroundColor: '#0f0f13',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  const sendMaximizedState = () => {
    mainWindow?.webContents.send('window:maximized-changed', mainWindow.isMaximized())
  }
  mainWindow.on('maximize', sendMaximizedState)
  mainWindow.on('unmaximize', sendMaximizedState)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (!is.dev) return
    const isDevToolsToggle =
      input.key === 'F12' ||
      (input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'i')
    if (isDevToolsToggle) {
      event.preventDefault()
      mainWindow!.webContents.toggleDevTools()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window:toggle-maximize', () => {
  if (!mainWindow) return false
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
    return false
  }
  mainWindow.maximize()
  return true
})

ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false)

ipcMain.handle('window:close', () => {
  mainWindow?.close()
})

ipcMain.handle('backup:save', async (_event, data: string, defaultPath: string) => {
  if (!mainWindow) return null
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [{ name: 'JSON Backup', extensions: ['json'] }]
  })
  if (result.canceled || !result.filePath) return null
  await writeFile(result.filePath, data, 'utf-8')
  return result.filePath
})

ipcMain.handle('backup:choose-folder', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('backup:read', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'JSON Backup', extensions: ['json'] }],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const content = await readFile(result.filePaths[0], 'utf-8')
  return { path: result.filePaths[0], content }
})

ipcMain.handle('backup:read-path', async (_event, filePath: string) => {
  try {
    return await readFile(filePath, 'utf-8')
  } catch {
    return null
  }
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
