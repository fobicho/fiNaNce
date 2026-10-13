import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string): string | undefined {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
              return 'charts'
            }
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
              return 'motion'
            }
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
              return 'react'
            }
            if (id.includes('lucide-react')) {
              return 'icons'
            }
            if (id.includes('dexie')) {
              return 'db'
            }
            // `clsx` / `tailwind-merge` los usa `cn()` en casi todos los
            // componentes, incluido el shell. Sin esta linea Rollup los
            // empaquetaba dentro de `charts` (recharts) porque su primer
            // consumidor aparece antes, y el entry acababa importando
            // estaticamente 861 KB de graficas solo para arrancar.
            if (
              id.includes('clsx') ||
              id.includes('/tailwind-merge/') ||
              id.includes('tailwind-merge')
            ) {
              return 'utils'
            }
            return undefined
          }
        }
      }
    }
  }
})
