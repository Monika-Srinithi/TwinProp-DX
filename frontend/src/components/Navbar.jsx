import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Activity, 
  Gauge, 
  Layers, 
  ShieldAlert, 
  Clock, 
  History, 
  Send, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { getSystemHealth } from '../services/api';

export default function Navbar() {
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

  const navItems = [
    { to: '/', label: 'Dashboard', icon: Gauge, phase: 'Phase 1' },
    { to: '/monitoring', label: 'Engine Monitoring', icon: Activity, phase: 'Phase 1' },
    { to: '/missions', label: 'Missions', icon: Send, phase: 'Phase 1' },
    { to: '/digital-twin', label: 'Digital Twin', icon: Layers, phase: 'Phase 2' },
    { to: '/fault-diagnosis', label: 'Fault Diagnosis', icon: ShieldAlert, phase: 'Phase 3' },
    { to: '/rul', label: 'RUL Estimation', icon: Clock, phase: 'Phase 4' },
    { to: '/mission-replay', label: 'Mission Replay', icon: History, phase: 'Phase 5' },
  ];

  const isOnline = health.status === 'healthy' && health.database === 'connected';

  return (
    <header style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
      {/* Top Brand Banner */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0.75rem 1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #1e3a8a, #0284c7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #38bdf8'
          }}>
            <Activity size={24} color="#38bdf8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.05em', color: '#f8fafc' }}>
                TwinProp-DX
              </h1>
              <span className="badge badge-phase">PHASE 1 FOUNDATION</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.03em' }}>
              MALE UAV Aero Piston Engine Health Platform • Rotax 914 F Digital Twin
            </p>
          </div>
        </div>

        {/* Backend & DB Health Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className={`badge ${isOnline ? 'badge-operational' : 'badge-warning'}`} style={{ padding: '0.35rem 0.75rem' }}>
            {isOnline ? (
              <>
                <CheckCircle2 size={14} />
                <span>SYS ONLINE • DB CONNECTED</span>
              </>
            ) : (
              <>
                <AlertCircle size={14} />
                <span>SYS {health.status.toUpperCase()} • DB {health.database.toUpperCase()}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav style={{
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-primary)',
        overflowX: 'auto'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          gap: '0.25rem',
          padding: '0 1rem'
        }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-tab ${isActive ? 'nav-tab-active' : ''}`
                }
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 0.95rem',
                  fontSize: '0.825rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  borderBottom: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                  backgroundColor: isActive ? 'rgba(56, 189, 248, 0.06)' : 'transparent',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                })}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.phase !== 'Phase 1' && (
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '0.1rem 0.35rem',
                    backgroundColor: (item.to === '/fault-diagnosis' || item.to === '/digital-twin' || item.to === '/rul' || item.to === '/mission-replay') ? 'rgba(56, 189, 248, 0.15)' : 'rgba(100, 116, 139, 0.2)',
                    color: (item.to === '/fault-diagnosis' || item.to === '/digital-twin' || item.to === '/rul' || item.to === '/mission-replay') ? '#38bdf8' : '#94a3b8',
                    border: (item.to === '/fault-diagnosis' || item.to === '/digital-twin' || item.to === '/rul' || item.to === '/mission-replay') ? '1px solid rgba(56, 189, 248, 0.3)' : 'none',
                    borderRadius: '3px'
                  }}>
                    {item.to === '/digital-twin' ? 'Phase 2 Live' : item.to === '/fault-diagnosis' ? 'Phase 3 Live' : item.to === '/rul' ? 'Phase 4 Live' : item.to === '/mission-replay' ? 'Phase 5 Live' : item.phase}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
