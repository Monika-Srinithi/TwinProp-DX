import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Gauge,
  Activity,
  Send,
  Layers,
  ShieldAlert,
  Clock,
  History,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Plane
} from 'lucide-react';

export default function Sidebar({ systemHealth = { status: 'healthy', database: 'connected' } }) {
  const isOnline = systemHealth.status === 'healthy' && systemHealth.database === 'connected';

  const navItems = [
    { to: '/', label: 'Dashboard', icon: Gauge },
    { to: '/monitoring', label: 'Engine Monitoring', icon: Activity },
    { to: '/missions', label: 'Missions', icon: Send },
    { to: '/digital-twin', label: 'Digital Twin', icon: Layers },
    { to: '/fault-diagnosis', label: 'Fault Diagnosis', icon: ShieldAlert },
    { to: '/rul', label: 'RUL Estimation', icon: Clock },
    { to: '/mission-replay', label: 'Mission Replay', icon: History },
  ];

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100vh',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      flexShrink: 0,
      userSelect: 'none',
      transition: 'background-color 0.28s ease, border-color 0.28s ease'
    }}>
      {/* Brand Header */}
      <div>
        <div style={{
          padding: '1.25rem 1.25rem 1rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-copper), #9a3412)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 12px rgba(234, 88, 12, 0.35)',
            flexShrink: 0
          }}>
            <Cpu size={22} color="#ffffff" />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <h1 className="font-display" style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: 'var(--text-main)',
                lineHeight: 1.1
              }}>
                TwinProp-DX
              </h1>
            </div>
            <p style={{
              fontSize: '0.725rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              Rotax 914 F Digital Twin
            </p>
          </div>
        </div>

        {/* Airframe & Engine Tag Strip */}
        <div style={{
          padding: '0.65rem 1.25rem',
          backgroundColor: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
          color: 'var(--text-muted)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Plane size={13} color="var(--accent-copper)" />
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>MALE UAV</span>
          </div>
          <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--accent-copper)' }}>
            TAPAS SERIES
          </span>
        </div>

        {/* Navigation Menu */}
        <nav style={{ padding: '0.75rem 0.75rem' }}>
          <div style={{
            fontSize: '0.675rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-dim)',
            padding: '0.5rem 0.75rem 0.35rem',
            fontFamily: 'var(--font-display)'
          }}>
            Platform Modules
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.835rem',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    color: isActive ? 'var(--accent-copper)' : 'var(--text-muted)',
                    backgroundColor: isActive ? 'var(--accent-copper-subtle)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--accent-copper)' : '3px solid transparent',
                    transition: 'all 0.15s ease'
                  })}
                  className={({ isActive }) => (isActive ? 'nav-item-active' : 'nav-item-idle')}
                >
                  <Icon size={17} style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Sidebar Footer / System Telemetry Status */}
      <div style={{
        padding: '1rem',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.65rem',
          borderRadius: '6px',
          backgroundColor: isOnline ? 'var(--status-active-subtle)' : 'var(--status-warning-subtle)',
          border: `1px solid ${isOnline ? 'var(--status-active-border)' : 'var(--status-warning-border)'}`,
          marginBottom: '0.75rem'
        }}>
          {isOnline ? (
            <CheckCircle2 size={14} color="var(--status-active)" />
          ) : (
            <AlertCircle size={14} color="var(--status-warning)" />
          )}
          <span className="font-mono" style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: isOnline ? 'var(--status-active)' : 'var(--status-warning)'
          }}>
            {isOnline ? 'SYS ONLINE • DB READY' : 'SYS OFFLINE'}
          </span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.675rem',
          color: 'var(--text-dim)',
          fontFamily: 'var(--font-mono)'
        }}>
          <span>SIH 2026: SIH26054</span>
          <span>v1.5.0</span>
        </div>
      </div>
    </aside>
  );
}
