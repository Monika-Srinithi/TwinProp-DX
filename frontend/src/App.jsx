import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import EngineMonitoring from './pages/EngineMonitoring';
import Missions from './pages/Missions';
import DigitalTwin from './pages/DigitalTwin';
import FaultDiagnosis from './pages/FaultDiagnosis';
import RULPrediction from './pages/RULPrediction';
import MissionReplay from './pages/MissionReplay';
import { getSystemHealth } from './services/api';

function AppContent() {
  const [health, setHealth] = useState({ status: 'checking', database: 'checking' });

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await getSystemHealth();
        if (isMounted) setHealth(res);
      } catch (err) {
        if (isMounted) setHealth({ status: 'offline', database: 'disconnected' });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="app-layout">
      {/* Left Aerospace Sidebar */}
      <Sidebar systemHealth={health} />

      {/* Main Content Area */}
      <div className="main-content-wrapper">
        {/* Sticky Top Header with Theme Toggle */}
        <Header />

        {/* Routed Page Content */}
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/monitoring" element={<EngineMonitoring />} />
            <Route path="/missions" element={<Missions />} />
            <Route path="/digital-twin" element={<DigitalTwin />} />
            <Route path="/fault-diagnosis" element={<FaultDiagnosis />} />
            <Route path="/rul" element={<RULPrediction />} />
            <Route path="/mission-replay" element={<MissionReplay />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Aerospace Tactical Footer */}
        <footer style={{
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          padding: '0.85rem 1.5rem',
          fontSize: '0.725rem',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)',
          transition: 'background-color 0.28s ease, border-color 0.28s ease'
        }}>
          <div style={{
            maxWidth: '1380px',
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div>
              <span style={{ color: 'var(--accent-copper)', fontWeight: 600 }}>TwinProp-DX v1.5.0</span>
              <span> • MALE UAV Digital Twin Platform</span>
              <span> • Smart India Hackathon: SIH26054</span>
            </div>
            <div>
              <span>Airframe: TAPAS Series</span>
              <span> • Powertrain: Rotax 914 F Turbocharged Piston Engine</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </BrowserRouter>
  );
}
