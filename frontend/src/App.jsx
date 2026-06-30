import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Overview from './pages/Overview.jsx'
import NetworkMap from './pages/NetworkMap.jsx'
import Devices from './pages/Devices.jsx'
import Alerts from './pages/Alerts.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-slate-900">
        <Navbar />
        <main className="flex-1 p-4 md:p-6">
          <Routes>
            <Route path="/"           element={<Overview />} />
            <Route path="/map"        element={<NetworkMap />} />
            <Route path="/devices"    element={<Devices />} />
            <Route path="/alerts"     element={<Alerts />} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
