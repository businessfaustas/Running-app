// Must run before the backend loads: Supabase clears auth results from the URL as it reads them.
import './lib/authRedirect'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { MaintenancePage } from './components/MaintenancePage'
import { initMonitoring } from './lib/monitoring'

void initMonitoring()

// Kill switch: set VITE_MAINTENANCE_MESSAGE on Vercel and redeploy to take the app offline.
const maintenance = import.meta.env.VITE_MAINTENANCE_MESSAGE?.trim()

createRoot(document.getElementById('root')!).render(
  <StrictMode>{maintenance ? <MaintenancePage message={maintenance} /> : <App />}</StrictMode>,
)
