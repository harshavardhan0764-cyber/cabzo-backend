import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import 'leaflet/dist/leaflet.css'

// Proactive startup cleanup: Guarantee clean light theme and zero API key warnings
try {
  // Remove any lingering or invalid Google Maps keys so no "API key required" popup or watermark ever appears
  localStorage.removeItem('GOOGLE_MAPS_API_KEY');
} catch (_) {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
