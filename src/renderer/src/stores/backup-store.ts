import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type BackupInterval = 'never' | 'daily' | 'weekly' | 'monthly'

export interface BackupEntry {
  path: string
  date: string
  label: string
}

interface BackupState {
  interval: BackupInterval
  backupPath: string
  lastBackup: string | null
  history: BackupEntry[]
  setInterval: (interval: BackupInterval) => void
  setBackupPath: (path: string) => void
  addBackup: (entry: BackupEntry) => void
  removeBackup: (path: string) => void
}

export const useBackupStore = create<BackupState>()(
  persist(
    (set) => ({
      interval: 'never',
      backupPath: '',
      lastBackup: null,
      history: [],
      setInterval: (interval) => set({ interval }),
      setBackupPath: (path) => set({ backupPath: path }),
      addBackup: (entry) =>
        set((state) => ({
          lastBackup: entry.date,
          history: [entry, ...state.history].slice(0, 20)
        })),
      removeBackup: (path) =>
        set((state) => ({
          history: state.history.filter((e) => e.path !== path)
        }))
    }),
    { name: 'finance-backups' }
  )
)
