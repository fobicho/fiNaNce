/// <reference types="vite/client" />

interface BackupAPI {
  backupSave: (data: string, defaultPath: string) => Promise<string | null>
  backupChooseFolder: () => Promise<string | null>
  backupRead: () => Promise<{ path: string; content: string } | null>
  backupReadPath: (filePath: string) => Promise<string | null>
  windowMinimize: () => Promise<void>
  windowToggleMaximize: () => Promise<boolean>
  windowIsMaximized: () => Promise<boolean>
  windowClose: () => Promise<void>
  onWindowMaximizedChange: (cb: (maximized: boolean) => void) => () => void
}

interface Window {
  electron: import('@electron-toolkit/preload').ElectronAPI
  api: BackupAPI
}
