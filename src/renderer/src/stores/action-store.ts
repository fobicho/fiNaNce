import { create } from 'zustand'

interface ActionState {
  trigger: number
  action: 'new-transaction' | null
  requestAction: (action: 'new-transaction') => void
  clearAction: () => void
}

export const useActionStore = create<ActionState>((set) => ({
  trigger: 0,
  action: null,
  requestAction: (action) => set({ action, trigger: Date.now() }),
  clearAction: () => set({ action: null })
}))
