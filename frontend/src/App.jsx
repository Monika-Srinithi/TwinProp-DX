
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
  const [health, setHealth] = useState({
    status: 'checking',
    database: 'checking',
  });

  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      try {
        const res = await getSystemHealth();

        if (isMounted) {
          setHealth(res);
        }
      } catch (err) {
        if (isMounted) {
          setHealth({
            status: 'offline',
            database: 'disconnected',
          });
        }
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

      <Sidebar systemHealth={health} />

      <div className="main-content-wrapper">

        <Header />

        <main style={{ flex: 1 }}>
          <Routes>

            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/monitoring"
              element={<EngineMonitoring />}
            />

            <Route
              path="/missions"
              element={<Missions />}
            />

            <Route
              path="/digital-twin"
              element={<DigitalTwin />}
            />

            <Route
              path="/fault-diagnosis"
              element={<FaultDiagnosis />}
            />

            <Route
              path="/rul"
              element={<RULPrediction />}
            />

            <Route
              path="/mission-replay"
              element={<MissionReplay />}
            />

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />

          </Routes>
        </main>

        <footer
          style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            fontSize: '12px',
            textAlign: 'center',
          }}
        >
          TwinProp-DX • Real-Time Health Monitoring & Digital Twin Platform
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

