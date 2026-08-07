import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './Landing'
import MasterDashboard from './MasterDashboard'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* Заменяем старую панель админа на новый MasterDashboard */}
        <Route path="/axio-hq-secret-access" element={<MasterDashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
