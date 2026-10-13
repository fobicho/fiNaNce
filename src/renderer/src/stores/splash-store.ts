import { create } from 'zustand'

type SplashState = {
  phase: 'wait' | 'nan' | 'full' | 'split' | 'done'
  setPhase: (phase: SplashState['phase']) => void
}

export const useSplashStore = create<SplashState>()((set) => ({
  phase: 'wait',
  setPhase: (phase) => set({ phase })
}))