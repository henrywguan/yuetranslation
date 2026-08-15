import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './bi.css'
import App from './App.tsx'
import { ThemeProvider } from './lib/theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
