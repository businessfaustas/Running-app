// Must run before the backend loads: Supabase clears auth results from the URL as it reads them.
import './lib/authRedirect'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initMonitoring } from './lib/monitoring'

void initMonitoring()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
