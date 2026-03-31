import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { MaintenanceGuard } from './components/MaintenanceGuard.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MaintenanceGuard systemId="ext-2">
      <App />
    </MaintenanceGuard>
  </StrictMode>,
)
