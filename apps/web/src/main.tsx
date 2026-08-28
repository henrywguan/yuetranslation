import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import './bi.css'
import App from './App.tsx'
import { initDiagnostics, setDiagnosticError } from './lib/diagnostics'
import { useYueStore } from './lib/store'
import { ThemeProvider } from './lib/theme'

initDiagnostics()

let prevStoreError: string | null = useYueStore.getState().error
useYueStore.subscribe((state) => {
  if (state.error !== prevStoreError) {
    prevStoreError = state.error
    setDiagnosticError(state.error)
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
      <Analytics />
    </ThemeProvider>
  </StrictMode>,
)
