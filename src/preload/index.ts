import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  backupSave: (data: string, defaultPath: string) => ipcRenderer.invoke('backup:save', data, defaultPath) as Promise<string | null>,
  backupChooseFolder: () => ipcRenderer.invoke('backup:choose-folder') as Promise<string | null>,
  backupRead: () => ipcRenderer.invoke('backup:read') as Promise<{ path: string; content: string } | null>,
  backupReadPath: (filePath: string) => ipcRenderer.invoke('backup:read-path', filePath) as Promise<string | null>,
  windowMinimize: () => ipcRenderer.invoke('window:minimize') as Promise<void>,
  windowToggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize') as Promise<boolean>,
  windowIsMaximized: () => ipcRenderer.invoke('window:is-maximized') as Promise<boolean>,
  windowClose: () => ipcRenderer.invoke('window:close') as Promise<void>,
  onWindowMaximizedChange: (cb: (maximized: boolean) => void) => {
    const listener = (_event: IpcRendererEvent, maximized: boolean) => cb(maximized)
    ipcRenderer.on('window:maximized-changed', listener)
    return () => {
      ipcRenderer.removeListener('window:maximized-changed', listener)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch {
    throw new Error('No se pudo inicializar la API de Electron')
  }
} else {
  window.electron = electronAPI
  window.api = api
}
