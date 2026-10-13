import ReactDOM from 'react-dom/client'
import App from './App'
import { syncDocumentTheme, useThemeStore } from './stores/theme-store'
import './index.css'

syncDocumentTheme(useThemeStore.getState())

document.addEventListener('wheel', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type === 'number') {
    e.target.blur()
  }
}, { passive: true })

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
