import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sun, Moon, Clock, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Header() {
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();
  const [utcTime, setUtcTime] = useState('');

  // Live UTC Clock for aerospace mission operations
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const getPageMeta = (pathname) => {
    switch (pathname) {
      case '/':
        return {
          title: 'Engine Telemetry Command Dashboard',
          category: 'Rotax 914 F Powertrain Baseline',
        };
      case '/monitoring':
        return {
          title: 'Multi-Channel Telemetry Stream',
          category: 'Real-Time Sensor Ingestion & Histograms',
        };
      case '/missions':
        return {
          title: 'Sortie Operations & Flight Records',
          category: 'MALE UAV Mission Profiles',
        };
      case '/digital-twin':
        return {
          title: 'Physics-Informed Digital Twin',
          category: 'Thermodynamics & Residual Matrix',
        };
      case '/fault-diagnosis':
        return {
          title: 'Fault Diagnostics & XAI Dossier',
          category: 'Hybrid Rule-Physics Diagnostic Engine',
        };
      case '/rul':
        return {
          title: 'Remaining Useful Life (RUL) Prognostics',
          category: 'Cumulative Multi-Physics Degradation Modeling',
        };
      case '/mission-replay':
        return {
          title: 'Flight Data Recorder & Mission Replay',
          category: 'Synchronized FDR Playback & Anomaly Timelines',
        };
      default:
        return {
          title: 'TwinProp-DX Platform',
          category: 'Aero Piston Powertrain',
        };
    }
  };

  const meta = getPageMeta(location.pathname);

  return (
    <header style={{
      height: 'var(--header-height)',
      backgroundColor: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 30,
      backdropFilter: 'blur(8px)',
      transition: 'background-color 0.28s ease, border-color 0.28s ease'
    }}>
      {/* Left: Breadcrumbs & Dynamic Title */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
          <span style={{ fontWeight: 600, color: 'var(--accent-copper)' }}>TwinProp-DX</span>
          <span>/</span>
          <span>{meta.category}</span>
        </div>
        <h2 className="font-display" style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          letterSpacing: '0.03em',
          color: 'var(--text-main)',
          lineHeight: 1.2
        }}>
          {meta.title}
        </h2>
      </div>

      {/* Right Controls: Mission Clock, SIH Identifier & Animated Theme Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* UTC Flight Clock */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.65rem',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '7px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <Clock size={13} color="var(--accent-copper)" />
          <span className="font-mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
            {utcTime || '00:00:00 UTC'}
          </span>
        </div>

        {/* SIH Identifier */}
        <div className="badge badge-copper" style={{ padding: '0.35rem 0.65rem' }}>
          <ShieldCheck size={13} />
          <span>SIH 2026</span>
        </div>

        {/* Smooth Dark/Light Theme Toggle Switch */}
        <button
          type="button"
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            cursor: 'pointer',
            color: 'var(--text-main)',
            fontSize: '0.75rem',
            fontWeight: 600,
            transition: 'all 0.25s ease',
            boxShadow: 'var(--shadow-sm)'
          }}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        >
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: isDark ? 'rgba(234, 88, 12, 0.2)' : 'rgba(234, 88, 12, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-copper)',
            transition: 'transform 0.25s ease'
          }}>
            {isDark ? <Sun size={13} /> : <Moon size={13} />}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.725rem' }}>
            {isDark ? 'DARK' : 'LIGHT'}
          </span>
        </button>
      </div>
    </header>
  );
}
