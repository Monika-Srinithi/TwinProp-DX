import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Activity,
  Gauge,
  Zap,
  Flame,
  Droplet,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info,
  TrendingUp,
  Cpu,
  Wind,
  ShieldCheck,
  ShieldAlert,
  Disc,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import {
  getEngines,
  getDigitalTwinState,
  getDigitalTwinHistory,
} from '../services/api';

// Safe formatting utilities that NEVER throw TypeErrors
const fmt = (val, decimals = 1, fallback = 'N/A') => {
  if (val === null || val === undefined || isNaN(Number(val))) return fallback;
  return Number(val).toFixed(decimals);
};

const fmtPct = (val, decimals = 1, fallback = '0%') => {
  if (val === null || val === undefined || isNaN(Number(val))) return fallback;
  return `${Number(val).toFixed(decimals)}%`;
};

export default function DigitalTwin() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [engines, setEngines] = useState([]);
  const [selectedEngineId, setSelectedEngineId] = useState('');
  const [twinState, setTwinState] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoPoll, setAutoPoll] = useState(true);

  // Animated counters for smooth UI presentation
  const [displayFidelity, setDisplayFidelity] = useState(0);
  const [barsAnimated, setBarsAnimated] = useState(false);

  // Fetch registered engines on mount
  const fetchEngines = async () => {
    try {
      setError('');
      const data = await getEngines();
      setEngines(data || []);
      if (data && data.length > 0 && !selectedEngineId) {
        setSelectedEngineId(data[0].engine_id);
      }
    } catch (err) {
      setError('Could not connect to backend to retrieve engine fleet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEngines();
  }, []);

  // Fetch twin state and historical trajectory for selected engine
  const fetchTwinData = async () => {
    if (!selectedEngineId) return;
    try {
      setError('');
      const [stateRes, histRes] = await Promise.all([
        getDigitalTwinState(selectedEngineId),
        getDigitalTwinHistory(selectedEngineId, 25),
      ]);
      setTwinState(stateRes);

      if (histRes?.states && Array.isArray(histRes.states)) {
        const formatted = histRes.states.map((s, idx) => {
          const rpmObs = s.residuals?.find((r) => r.channel === 'rpm')?.observed ?? 0;
          const rpmExp = s.residuals?.find((r) => r.channel === 'rpm')?.twin_expected ?? 0;
          const thrObs = s.residuals?.find((r) => r.channel === 'throttle')?.observed ?? 0;
          const pwr = s.thermodynamics?.power_kw ?? 0;
          const trq = s.thermodynamics?.torque_nm ?? 0;
          const map = s.turbocharger?.map_inhg ?? 0;

          return {
            index: idx + 1,
            time: s.timestamp ? new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : `T-${idx}`,
            rpmActual: rpmObs,
            rpmTwin: rpmExp,
            mapInHg: map,
            throttle: thrObs,
            powerKw: pwr,
            torqueNm: trq,
          };
        });
        setHistoryData(formatted);
      }
    } catch (err) {
      console.error('Failed to retrieve Digital Twin data:', err);
      setError(`Failed to retrieve Digital Twin state for ${selectedEngineId}: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEngineId) {
      fetchTwinData();
    }
    if (!autoPoll || !selectedEngineId) return;
    const interval = setInterval(fetchTwinData, 5000);
    return () => clearInterval(interval);
  }, [selectedEngineId, autoPoll]);

  // Smooth counter animation for fidelity gauge
  useEffect(() => {
    if (twinState?.twin_fidelity_score == null) return;
    const target = twinState.twin_fidelity_score;
    let start = displayFidelity;
    const duration = 900; // ms
    const startTime = performance.now();

    const animateCount = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      setDisplayFidelity(current);

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      } else {
        setDisplayFidelity(target);
      }
    };

    requestAnimationFrame(animateCount);
    // Trigger health bar animations after mount
    setTimeout(() => setBarsAnimated(true), 150);
  }, [twinState?.twin_fidelity_score]);

  const thermo = twinState?.thermodynamics;
  const turbo = twinState?.turbocharger;
  const subs = twinState?.subsystems;
  const residuals = Array.isArray(twinState?.residuals) ? twinState.residuals : [];

  const getFidelityStatus = (score) => {
    if (score == null) return { text: 'STANDBY', badge: 'badge-inactive', color: 'var(--status-inactive)' };
    if (score >= 85) return { text: 'OPTIMAL SYNC', badge: 'badge-operational', color: 'var(--status-active)' };
    if (score >= 65) return { text: 'HIGH FIDELITY', badge: 'badge-warning', color: 'var(--status-warning)' };
    return { text: 'DEVIATION', badge: 'badge-critical', color: 'var(--status-error)' };
  };

  const getSubsystemStatus = (score) => {
    if (score == null) return { text: 'STANDBY', badge: 'badge-inactive', color: 'var(--status-inactive)' };
    if (score >= 85) return { text: 'OPTIMAL', badge: 'badge-operational', color: 'var(--status-active)' };
    if (score >= 65) return { text: 'CAUTION', badge: 'badge-warning', color: 'var(--status-warning)' };
    return { text: 'CRITICAL', badge: 'badge-critical', color: 'var(--status-error)' };
  };

  const getResidualBadge = (status) => {
    switch (status) {
      case 'EXCURSION':
        return 'badge-critical';
      case 'DEVIATION':
        return 'badge-warning';
      default:
        return 'badge-operational';
    }
  };

  const gridColor = isDark ? 'var(--chart-grid)' : 'var(--chart-grid)';
  const axisColor = isDark ? 'var(--chart-axis)' : 'var(--chart-axis)';

  // Safe loading skeleton state
  if (loading && !twinState) {
    return (
      <div className="page-container" style={{ animation: 'pageFadeIn 0.35s ease-out' }}>
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="skeleton-box" style={{ width: '220px', height: '28px', marginBottom: '8px' }} />
              <div className="skeleton-box" style={{ width: '380px', height: '16px' }} />
            </div>
            <div className="skeleton-box" style={{ width: '180px', height: '36px' }} />
          </div>
        </div>

        {/* Row 1 Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ height: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div className="skeleton-box" style={{ width: '120px', height: '120px', borderRadius: '50%', marginBottom: '12px' }} />
            <div className="skeleton-box" style={{ width: '140px', height: '18px' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="card" style={{ height: '90px', padding: '1rem' }}>
                <div className="skeleton-box" style={{ width: '80px', height: '14px', marginBottom: '8px' }} />
                <div className="skeleton-box" style={{ width: '110px', height: '24px' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ height: '340px' }}>
            <div className="skeleton-box" style={{ width: '100%', height: '100%' }} />
          </div>
          <div className="card" style={{ height: '340px' }}>
            <div className="skeleton-box" style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  // Safe error state
  if (error && !twinState) {
    return (
      <div className="page-container" style={{ animation: 'pageFadeIn 0.35s ease-out' }}>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '640px', margin: '4rem auto', border: '1px solid var(--status-error)' }}>
          <AlertTriangle size={48} color="var(--status-error)" style={{ margin: '0 auto 1.25rem' }} />
          <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Digital Twin Stream Unavailable
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {error}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={fetchTwinData}
            >
              <RefreshCw size={14} />
              <span>Retry Telemetry Ingestion</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchEngines}
            >
              Reload Fleet List
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Safe empty state
  if (engines.length === 0 && !loading) {
    return (
      <div className="page-container" style={{ animation: 'pageFadeIn 0.35s ease-out' }}>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '640px', margin: '4rem auto' }}>
          <Layers size={48} color="var(--accent-copper)" style={{ margin: '0 auto 1.25rem' }} />
          <h2 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            No Engines Registered
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Register an engine in Engine Monitoring or ingest baseline telemetry packets to initialize the Digital Twin state.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={fetchEngines}
          >
            <RefreshCw size={14} />
            <span>Check Fleet Connection</span>
          </button>
        </div>
      </div>
    );
  }

  const fidelity = twinState?.twin_fidelity_score ?? null;
  const fidelityInfo = getFidelityStatus(fidelity);
  const strokeDashoffset = 314 - (314 * Math.min(100, Math.max(0, displayFidelity))) / 100;

  return (
    <div className="page-container" style={{ animation: 'pageFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      {/* =====================================================================
          HEADER SECTION: Digital Twin & Tactical Engine Controls
          ===================================================================== */}
      <div className="card" style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.25rem',
        padding: '1.25rem 1.5rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <h2 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em' }}>
              Digital Twin
            </h2>
            <span className="badge badge-phase font-mono">PHASE 2 MODEL</span>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Physics-informed engine state synchronization
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label className="form-label" style={{ margin: 0, fontSize: '0.78rem' }}>Active Engine:</label>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '190px' }}
              value={selectedEngineId}
              onChange={(e) => setSelectedEngineId(e.target.value)}
              disabled={engines.length === 0}
            >
              {engines.map((eng) => (
                <option key={eng.engine_id} value={eng.engine_id}>
                  {eng.engine_id} ({eng.aircraft_id})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className={`btn btn-sm ${autoPoll ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAutoPoll(!autoPoll)}
            title="Toggle live 5s telemetry synchronization"
          >
            <Activity size={14} />
            <span>{autoPoll ? 'Twin Sync: 5s LIVE' : 'Twin Sync: PAUSED'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchTwinData}
            title="Refresh Digital Twin calculations"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Academic Prototype Notice */}
      <div style={{
        padding: '0.85rem 1.25rem',
        backgroundColor: isDark ? 'rgba(249, 115, 22, 0.08)' : 'rgba(234, 88, 12, 0.06)',
        border: '1px solid var(--accent-copper-border)',
        borderRadius: '12px',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        fontFamily: 'var(--font-mono)',
        transition: 'background-color 0.3s ease, border-color 0.3s ease',
      }}>
        <Info size={16} color="var(--accent-copper)" style={{ flexShrink: 0 }} />
        <span>
          <strong style={{ color: 'var(--text-main)' }}>ACADEMIC DIGITAL TWIN PROTOTYPE:</strong> Implements standard International Standard Atmosphere (ISA) barometric lapse, Rotax 914 F TCU boost regulation curves, thermodynamic shaft power/torque, and hydrodynamic lubrication modeling. All calculated metrics reflect academic approximations and are not certified OEM/FAA operational limits.
        </span>
      </div>

      {/* =====================================================================
          ROW 1 — TWIN STATUS
          Large Dominant Twin Fidelity Gauge Alongside High-Level State Cards
          ===================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 340px) 1fr',
        gap: '1.25rem',
        marginBottom: '1.5rem',
      }}>
        {/* Dominant Circular Fidelity Gauge Card */}
        <div className="card" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem 1.25rem',
          textAlign: 'center',
          position: 'relative',
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>
            Twin Model Fidelity Score
          </span>

          <div style={{
            position: 'relative',
            width: '144px',
            height: '144px',
            margin: '0.25rem 0',
            filter: `drop-shadow(0 0 10px ${fidelityInfo.color}33)`,
            transition: 'filter 0.4s ease',
          }}>
            <svg width="144" height="144" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background Ring */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={isDark ? 'var(--border-color)' : '#e2e8f0'}
                strokeWidth="10"
              />
              {/* Animated Progress Ring */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={fidelityInfo.color}
                strokeWidth="10"
                strokeDasharray="314"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s ease',
                }}
              />
            </svg>

            {/* Inner Circular Value Display */}
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span className="font-mono" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1, transition: 'color 0.3s ease' }}>
                {displayFidelity != null ? `${fmt(displayFidelity, 1)}` : 'N/A'}
              </span>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>PERCENT</span>
            </div>
          </div>

          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`badge ${fidelityInfo.badge}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}>
              {fidelityInfo.text}
            </span>
          </div>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
            Correlated across 9 multi-physics channels
          </span>
        </div>

        {/* Alongside 5 High-Level Metric Tiles */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignContent: 'center',
        }}>
          {/* Operating Regime */}
          <div className="card" style={{ padding: '1rem 1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Regime</span>
              <Activity size={16} color="var(--accent-copper)" />
            </div>
            <div className="font-display" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem', transition: 'color 0.3s ease' }}>
              {twinState?.operating_regime?.replace(/_/g, ' ') || 'STANDBY'}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              {twinState?.is_operational ? 'Powertrain Active' : 'Off-Nominal'}
            </span>
          </div>

          {/* Shaft Power */}
          <div className="card" style={{ padding: '1rem 1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shaft Power</span>
              <Zap size={16} color="var(--accent-copper)" />
            </div>
            <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-copper)', marginBottom: '0.2rem', transition: 'color 0.3s ease' }}>
              {thermo ? `${fmt(thermo.power_kw, 1)} kW` : '0.0 kW'}
            </div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              {thermo ? `${fmt(thermo.power_hp, 1)} HP output` : '0.0 HP'}
            </span>
          </div>

          {/* MAP / Pressure Ratio */}
          <div className="card" style={{ padding: '1rem 1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MAP / Ratio</span>
              <Gauge size={16} color="var(--status-warning)" />
            </div>
            <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem', transition: 'color 0.3s ease' }}>
              {turbo?.map_inhg != null ? `${fmt(turbo.map_inhg, 1)} inHg` : 'N/A'}
            </div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              {turbo ? `${fmt(turbo.pressure_ratio, 2)} Pressure Ratio` : '1.00 PR'}
            </span>
          </div>

          {/* TCU Boost State */}
          <div className="card" style={{ padding: '1rem 1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TCU Boost</span>
              <Wind size={16} color="var(--accent-teal)" />
            </div>
            <div className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.2rem', transition: 'color 0.3s ease' }}>
              {turbo?.tcu_state?.replace(/_/g, ' ') || 'IDLE'}
            </div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
              {turbo ? `${fmt(turbo.map_bar, 2)} bar target` : 'N/A'}
            </span>
          </div>

          {/* Wastegate Position */}
          <div className="card" style={{ padding: '1rem 1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wastegate</span>
              <Sliders size={16} color="var(--accent-copper)" />
            </div>
            <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem', transition: 'color 0.3s ease' }}>
              {turbo?.wastegate_position_pct != null
                ? `${fmt(turbo.wastegate_position_pct, 0)}%`
                : 'N/A'}
              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '0.25rem' }}>Open</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: isDark ? 'var(--border-color)' : '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                width: `${turbo?.wastegate_position_pct != null ? Math.min(100, Math.max(0, turbo.wastegate_position_pct)) : 100}%`,
                height: '100%',
                backgroundColor: 'var(--accent-copper)',
                transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          ROW 2 — ENGINE VISUAL + ENGINE STATE
          Left: Technical Rotax 914 F Aero Engine SVG Schematic (with live pulsing pins)
          Right: Thermodynamic Operating State Panel
          ===================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(420px, 1.15fr) 1fr',
        gap: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        {/* Left: Rotax 914 F Technical Schematic */}
        <div className="card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Rotax 914 F Propulsion Architecture
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Turbo-Normalized 4-Cylinder Boxer Aero-Piston with TCU Servo Linkage
              </p>
            </div>
            <span className="badge badge-copper font-mono" style={{ fontSize: '0.7rem' }}>
              TAPAS UAV POWERPLANT
            </span>
          </div>

          {/* SVG Aero Engine Visualization with live telemetry nodes */}
          <div className="animate-engine-float" style={{
            width: '100%',
            height: '270px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? '#14171e' : '#f8fafc',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            position: 'relative',
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
          }}>
            <svg viewBox="0 0 540 280" style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="crankGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isDark ? "#242a38" : "#cbd5e1"} />
                  <stop offset="100%" stopColor={isDark ? "#181d28" : "#94a3b8"} />
                </linearGradient>
                <linearGradient id="cylGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={isDark ? "#2c3445" : "#94a3b8"} />
                  <stop offset="100%" stopColor={isDark ? "#1e2430" : "#64748b"} />
                </linearGradient>
                <linearGradient id="copperGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#c2410c" />
                </linearGradient>
              </defs>

              {/* Central Crankcase Housing */}
              <rect x="200" y="85" width="140" height="110" rx="10" fill="url(#crankGrad)" stroke="var(--border-color)" strokeWidth="2" />
              <circle cx="270" cy="140" r="34" fill={isDark ? "#15171c" : "#e2e8f0"} stroke="var(--accent-copper)" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="270" cy="140" r="14" fill="var(--accent-copper)" />
              <text x="270" y="144" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="var(--font-mono)" fontWeight="700">CRANK</text>

              {/* PSRU Gearbox & Prop Shaft Output */}
              <path d="M 340 105 L 390 120 L 390 160 L 340 175 Z" fill={isDark ? "#1d2330" : "#cbd5e1"} stroke="var(--border-color)" strokeWidth="2" />
              <rect x="390" y="132" width="45" height="16" rx="3" fill="var(--accent-copper)" />
              <text x="412" y="143" textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="var(--font-mono)">PROP 1:2.43</text>

              {/* Cylinder 1 & Cylinder 3 (Top/Left and Top/Right Boxer configuration) */}
              <rect x="100" y="70" width="100" height="52" rx="4" fill="url(#cylGrad)" stroke="var(--border-color)" strokeWidth="2" />
              <line x1="115" y1="70" x2="115" y2="122" stroke="var(--border-color)" strokeWidth="2" />
              <line x1="130" y1="70" x2="130" y2="122" stroke="var(--border-color)" strokeWidth="2" />
              <line x1="145" y1="70" x2="145" y2="122" stroke="var(--border-color)" strokeWidth="2" />
              <line x1="160" y1="70" x2="160" y2="122" stroke="var(--border-color)" strokeWidth="2" />
              <text x="145" y="100" textAnchor="middle" fill="var(--text-main)" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">CYL 1 / 3</text>

              {/* Cylinder 2 & Cylinder 4 (Bottom Boxer configuration) */}
              <rect x="100" y="158" width="100" height="52" rx="4" fill="url(#cylGrad)" stroke="var(--border-color)" strokeWidth="2" />
              <line x1="115" y1="158" x2="115" y2="210" stroke="var(--border-color)" strokeWidth="2" />
              <line x1="130" y1="158" x2="130" y2="210" stroke="var(--border-color)" strokeWidth="2" />
              <line x1="145" y1="158" x2="145" y2="210" stroke="var(--border-color)" strokeWidth="2" />
              <line x1="160" y1="158" x2="160" y2="210" stroke="var(--border-color)" strokeWidth="2" />
              <text x="145" y="188" textAnchor="middle" fill="var(--text-main)" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">CYL 2 / 4</text>

              {/* Turbocharger & Wastegate Unit */}
              <circle cx="95" cy="140" r="32" fill={isDark ? "#171c26" : "#e2e8f0"} stroke="var(--accent-copper)" strokeWidth="2" />
              <circle cx="95" cy="140" r="16" fill="url(#copperGrad)" />
              <path d="M 65 140 Q 40 110 50 80 L 70 80 Q 60 110 95 125" fill="none" stroke="var(--status-warning)" strokeWidth="3" />
              <text x="95" y="144" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="var(--font-mono)" fontWeight="700">TURBO</text>

              {/* Exhaust Manifold to Turbo */}
              <path d="M 120 70 Q 70 40 50 80" fill="none" stroke="var(--status-error)" strokeWidth="3" strokeDasharray="4 2" />
              <path d="M 120 210 Q 70 240 50 200 L 70 160" fill="none" stroke="var(--status-error)" strokeWidth="3" strokeDasharray="4 2" />

              {/* Intake Airbox Manifold */}
              <rect x="230" y="42" width="80" height="24" rx="6" fill={isDark ? "#222a3a" : "#cbd5e1"} stroke="var(--border-color)" strokeWidth="1.5" />
              <text x="270" y="58" textAnchor="middle" fill="var(--text-main)" fontSize="9" fontFamily="var(--font-mono)">AIRBOX / TCU</text>
              <line x1="270" y1="66" x2="270" y2="85" stroke="var(--accent-copper)" strokeWidth="2" />

              {/* Callout 1: Live CHT Pin (Pulsing) */}
              <g className="animate-pin-pulse" transform="translate(145, 30)">
                <rect x="-35" y="-12" width="70" height="20" rx="4" fill="var(--bg-card)" stroke="var(--status-warning)" strokeWidth="1.5" />
                <text x="0" y="2" textAnchor="middle" fill="var(--text-main)" fontSize="9" fontFamily="var(--font-mono)" fontWeight="700">
                  CHT {fmt(residuals.find(r => r.channel === 'cht')?.observed, 1)}°C
                </text>
                <line x1="0" y1="8" x2="0" y2="40" stroke="var(--status-warning)" strokeWidth="1" strokeDasharray="2 2" />
              </g>

              {/* Callout 2: Live MAP Pin (Pulsing) */}
              <g className="animate-pin-pulse" transform="translate(45, 235)">
                <rect x="-35" y="-12" width="80" height="20" rx="4" fill="var(--bg-card)" stroke="var(--accent-copper)" strokeWidth="1.5" />
                <text x="5" y="2" textAnchor="middle" fill="var(--accent-copper)" fontSize="9" fontFamily="var(--font-mono)" fontWeight="700">
                  MAP {fmt(turbo?.map_inhg, 1)} inHg
                </text>
                <line x1="5" y1="-12" x2="55" y2="-65" stroke="var(--accent-copper)" strokeWidth="1" strokeDasharray="2 2" />
              </g>

              {/* Callout 3: Live RPM Pin (Pulsing) */}
              <g className="animate-pin-pulse" transform="translate(445, 140)">
                <rect x="-30" y="-12" width="75" height="20" rx="4" fill="var(--bg-card)" stroke="var(--status-active)" strokeWidth="1.5" />
                <text x="7" y="2" textAnchor="middle" fill="var(--status-active)" fontSize="9" fontFamily="var(--font-mono)" fontWeight="700">
                  {fmt(residuals.find(r => r.channel === 'rpm')?.observed, 0)} RPM
                </text>
                <line x1="-30" y1="0" x2="-55" y2="0" stroke="var(--status-active)" strokeWidth="1" strokeDasharray="2 2" />
              </g>
            </svg>
          </div>
        </div>

        {/* Right: Engine State Scannable Telemetry Panel */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div>
              <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Thermodynamic State Vectors
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Physics-based shaft brake output, combustion torque, and thermal dissipation
              </p>
            </div>
            <span className="badge badge-operational font-mono" style={{ fontSize: '0.7rem' }}>
              ONLINE
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {/* Shaft Power */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Shaft Power</span>
              <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-copper)', transition: 'color 0.3s ease' }}>
                {thermo ? `${fmt(thermo.power_kw, 1)} kW` : 'N/A'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>
                ({thermo ? `${fmt(thermo.power_hp, 1)} HP` : 'N/A'})
              </span>
            </div>

            {/* Torque */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Brake Torque</span>
              <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', transition: 'color 0.3s ease' }}>
                {thermo ? `${fmt(thermo.torque_nm, 1)} N·m` : 'N/A'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>Crankshaft Output</span>
            </div>

            {/* Engine RPM */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Engine Speed</span>
              <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', transition: 'color 0.3s ease' }}>
                {fmt(residuals.find(r => r.channel === 'rpm')?.observed, 0)} RPM
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>Prop: {fmt(Number(residuals.find(r => r.channel === 'rpm')?.observed || 0) / 2.43, 0)} RPM</span>
            </div>

            {/* MAP Absolute */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Manifold Pressure</span>
              <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', transition: 'color 0.3s ease' }}>
                {turbo ? `${fmt(turbo.map_inhg, 1)} inHg` : 'N/A'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>({turbo ? `${fmt(turbo.map_bar, 2)} bar` : 'N/A'})</span>
            </div>

            {/* Boost Pressure Ratio */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Boost Pressure Ratio</span>
              <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--status-active)', transition: 'color 0.3s ease' }}>
                {turbo ? `${fmt(turbo.pressure_ratio, 2)} PR` : 'N/A'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>P2 / P1 Absolute</span>
            </div>

            {/* Wastegate Position */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Wastegate Actuator</span>
              <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', transition: 'color 0.3s ease' }}>
                {turbo ? `${fmt(turbo.wastegate_position_pct, 0)}%` : 'N/A'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>TCU Servo Command</span>
            </div>

            {/* Thermal Efficiency */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Thermal Efficiency</span>
              <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--status-active)', transition: 'color 0.3s ease' }}>
                {thermo ? `${fmt(thermo.thermal_efficiency_pct, 1)}%` : 'N/A'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>Cycle Conversion</span>
            </div>

            {/* BSFC */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid var(--border-color)', transition: 'background-color 0.3s ease, border-color 0.3s ease' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>Specific Fuel (BSFC)</span>
              <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', transition: 'color 0.3s ease' }}>
                {thermo ? `${fmt(thermo.bsfc_g_kwh, 1)}` : 'N/A'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>g / kWh</span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          ROW 3 — FOUR SUBSYSTEM HEALTH CARDS (Staggered Animation)
          Core, Turbocharger, Lubrication, Cooling
          ===================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem',
      }}>
        {/* Subsystem 1: CORE */}
        {(() => {
          const statusInfo = getSubsystemStatus(subs?.core_health);
          const barWidth = barsAnimated && subs?.core_health != null ? Math.min(100, Math.max(0, subs.core_health)) : 0;
          return (
            <div className="card" style={{ borderTop: `4px solid ${statusInfo.color}`, padding: '1.25rem', animationDelay: '60ms' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Cpu size={18} color={statusInfo.color} />
                  <h4 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Core Powertrain
                  </h4>
                </div>
                <span className={`badge ${statusInfo.badge}`} style={{ fontSize: '0.7rem' }}>
                  {statusInfo.text}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span className="font-mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', transition: 'color 0.3s ease' }}>
                  {subs ? `${fmt(subs.core_health, 0)}%` : 'N/A'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>HEALTH</span>
              </div>

              <div style={{ width: '100%', height: '6px', backgroundColor: isDark ? 'var(--border-color)' : '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.85rem' }}>
                <div style={{
                  width: `${barWidth}%`,
                  height: '100%',
                  backgroundColor: statusInfo.color,
                  transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Shaft Power / Torque:</span>
                <span className="font-mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                  {thermo ? `${fmt(thermo.power_kw, 0)} kW · ${fmt(thermo.torque_nm, 0)} N·m` : 'Nominal'}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Subsystem 2: TURBOCHARGER */}
        {(() => {
          const statusInfo = getSubsystemStatus(subs?.turbo_health);
          const barWidth = barsAnimated && subs?.turbo_health != null ? Math.min(100, Math.max(0, subs.turbo_health)) : 0;
          return (
            <div className="card" style={{ borderTop: `4px solid ${statusInfo.color}`, padding: '1.25rem', animationDelay: '120ms' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Wind size={18} color={statusInfo.color} />
                  <h4 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Turbocharger & TCU
                  </h4>
                </div>
                <span className={`badge ${statusInfo.badge}`} style={{ fontSize: '0.7rem' }}>
                  {statusInfo.text}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span className="font-mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', transition: 'color 0.3s ease' }}>
                  {subs ? `${fmt(subs.turbo_health, 0)}%` : 'N/A'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>HEALTH</span>
              </div>

              <div style={{ width: '100%', height: '6px', backgroundColor: isDark ? 'var(--border-color)' : '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.85rem' }}>
                <div style={{
                  width: `${barWidth}%`,
                  height: '100%',
                  backgroundColor: statusInfo.color,
                  transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Target MAP / Ratio:</span>
                <span className="font-mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                  {turbo ? `${fmt(turbo.map_inhg, 1)} inHg · ${fmt(turbo.pressure_ratio, 2)} PR` : 'Nominal'}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Subsystem 3: LUBRICATION */}
        {(() => {
          const statusInfo = getSubsystemStatus(subs?.lubrication_health);
          const barWidth = barsAnimated && subs?.lubrication_health != null ? Math.min(100, Math.max(0, subs.lubrication_health)) : 0;
          return (
            <div className="card" style={{ borderTop: `4px solid ${statusInfo.color}`, padding: '1.25rem', animationDelay: '180ms' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Droplet size={18} color={statusInfo.color} />
                  <h4 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Hydro Lubrication
                  </h4>
                </div>
                <span className={`badge ${statusInfo.badge}`} style={{ fontSize: '0.7rem' }}>
                  {statusInfo.text}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span className="font-mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', transition: 'color 0.3s ease' }}>
                  {subs ? `${fmt(subs.lubrication_health, 0)}%` : 'N/A'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>HEALTH</span>
              </div>

              <div style={{ width: '100%', height: '6px', backgroundColor: isDark ? 'var(--border-color)' : '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.85rem' }}>
                <div style={{
                  width: `${barWidth}%`,
                  height: '100%',
                  backgroundColor: statusInfo.color,
                  transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Film Stability Index:</span>
                <span className="font-mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                  {subs?.oil_film_stability_index != null ? `${fmt(subs.oil_film_stability_index, 2)} Stability` : '0.95 Index'}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Subsystem 4: COOLING */}
        {(() => {
          const statusInfo = getSubsystemStatus(subs?.cooling_health);
          const barWidth = barsAnimated && subs?.cooling_health != null ? Math.min(100, Math.max(0, subs.cooling_health)) : 0;
          return (
            <div className="card" style={{ borderTop: `4px solid ${statusInfo.color}`, padding: '1.25rem', animationDelay: '240ms' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Flame size={18} color={statusInfo.color} />
                  <h4 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Thermal Cooling
                  </h4>
                </div>
                <span className={`badge ${statusInfo.badge}`} style={{ fontSize: '0.7rem' }}>
                  {statusInfo.text}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span className="font-mono" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', transition: 'color 0.3s ease' }}>
                  {subs ? `${fmt(subs.cooling_health, 0)}%` : 'N/A'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>HEALTH</span>
              </div>

              <div style={{ width: '100%', height: '6px', backgroundColor: isDark ? 'var(--border-color)' : '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginBottom: '0.85rem' }}>
                <div style={{
                  width: `${barWidth}%`,
                  height: '100%',
                  backgroundColor: statusInfo.color,
                  transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Thermal Headroom:</span>
                <span className="font-mono" style={{ color: (subs?.cht_thermal_headroom_c ?? 10) < 5 ? 'var(--status-error)' : 'var(--status-active)', fontWeight: 600 }}>
                  {subs?.cht_thermal_headroom_c != null ? `+${fmt(subs.cht_thermal_headroom_c, 1)}°C margin` : '+15.0°C'}
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* =====================================================================
          ROW 4 — ENGINEERING ANALYSIS
          Left: Residual Deviation Matrix Table (sequential slide-in + abnormal pulse)
          Right: Thermodynamic / Performance Analysis Chart
          ===================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        {/* Left: Physical Residual Matrix Table */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{
            padding: '1.15rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-secondary)',
          }}>
            <div>
              <h3 className="font-display" style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 700 }}>
                Sensor Residual Deviation Matrix
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Live observed telemetry vs physics-informed nominal baselines
              </p>
            </div>
            <span className="badge badge-copper font-mono">
              {residuals.length} CHANNELS
            </span>
          </div>

          <div className="data-table-container" style={{ border: 'none', borderRadius: '0', boxShadow: 'none', maxHeight: '320px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Observed</th>
                  <th>Nominal</th>
                  <th>Delta (Δ)</th>
                  <th>Deviation %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {residuals.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                      No active telemetry residuals. Stream active packets to compute deviations.
                    </td>
                  </tr>
                ) : (
                  residuals.map((r, idx) => {
                    const isAbnormal = r.status === 'EXCURSION' || r.status === 'DEVIATION';
                    return (
                      <tr key={idx} className="row-fade-in" style={{ animationDelay: `${idx * 40}ms` }}>
                        <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>{r.label || r.channel}</td>
                        <td className="font-mono">{fmt(r.observed, 1)} {r.unit}</td>
                        <td className="font-mono" style={{ color: 'var(--text-muted)' }}>{fmt(r.twin_expected, 1)} {r.unit}</td>
                        <td className={`font-mono ${isAbnormal ? 'animate-abnormal' : ''}`} style={{
                          color: r.status === 'EXCURSION' ? 'var(--status-error)' : r.status === 'DEVIATION' ? 'var(--status-warning)' : 'var(--text-main)',
                          fontWeight: 600,
                        }}>
                          {r.residual > 0 ? `+${fmt(r.residual, 2)}` : fmt(r.residual, 2)} {r.unit}
                        </td>
                        <td className="font-mono">{fmt(r.residual_pct, 1)}%</td>
                        <td>
                          <span className={`badge ${getResidualBadge(r.status)}`} style={{ fontSize: '0.65rem' }}>
                            {r.status || 'NOMINAL'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Thermodynamic Performance Chart */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="card-header" style={{ marginBottom: '0.75rem' }}>
            <div>
              <h3 className="font-display" style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 700 }}>
                Shaft Power & Torque Progression
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Dynamometer shaft power (kW) and combustion torque response (N·m)
              </p>
            </div>
            <span className="badge badge-phase font-mono">
              THERMO ANALYSIS
            </span>
          </div>

          <div style={{ height: '265px', width: '100%', marginTop: '0.5rem' }}>
            {historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="time" stroke={axisColor} tick={{ fill: axisColor, fontSize: 10 }} />
                  <YAxis yAxisId="pwr" stroke="var(--accent-copper)" tick={{ fill: 'var(--accent-copper)', fontSize: 10 }} unit=" kW" domain={['auto', 'auto']} />
                  <YAxis yAxisId="trq" orientation="right" stroke="var(--accent-teal)" tick={{ fill: 'var(--accent-teal)', fontSize: 10 }} unit=" N·m" domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--chart-tooltip-bg)',
                      borderColor: 'var(--chart-tooltip-border)',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      color: 'var(--text-main)',
                      fontFamily: 'var(--font-mono)',
                      boxShadow: 'var(--shadow-card)',
                      transition: 'background-color 0.25s ease, border-color 0.25s ease',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Line yAxisId="pwr" type="monotone" dataKey="powerKw" name="Shaft Power (kW)" stroke="var(--accent-copper)" strokeWidth={2.5} dot={false} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out" />
                  <Line yAxisId="trq" type="monotone" dataKey="torqueNm" name="Engine Torque (N·m)" stroke="var(--accent-teal)" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                Telemetry stream initializing...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          ROW 5 — SYNCHRONIZED TRAJECTORY (FULL WIDTH)
          Observed Speed vs Twin Expected Speed across Timeline
          ===================================================================== */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div className="card-header" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h3 className="font-display" style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 700 }}>
              Full Synchronized Trajectory: Observed Telemetry vs Twin Baseline Model
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Real-time validation tracking powertrain thermodynamic response across chronological telemetry frames
            </p>
          </div>
          <span className="badge badge-copper font-mono">
            {historyData.length} FRAMES SYNCHRONIZED
          </span>
        </div>

        <div style={{ height: '300px', width: '100%', marginTop: '0.5rem' }}>
          {historyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 25, left: -5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="time" stroke={axisColor} tick={{ fill: axisColor, fontSize: 10 }} />
                <YAxis yAxisId="rpm" stroke="var(--accent-copper)" tick={{ fill: 'var(--accent-copper)', fontSize: 10 }} domain={['auto', 'auto']} unit=" RPM" />
                <YAxis yAxisId="map" orientation="right" stroke="var(--accent-teal)" tick={{ fill: 'var(--accent-teal)', fontSize: 10 }} domain={['auto', 'auto']} unit=" inHg" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--chart-tooltip-bg)',
                    borderColor: 'var(--chart-tooltip-border)',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    color: 'var(--text-main)',
                    fontFamily: 'var(--font-mono)',
                    boxShadow: 'var(--shadow-card)',
                    transition: 'background-color 0.25s ease, border-color 0.25s ease',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                <Line yAxisId="rpm" type="monotone" dataKey="rpmActual" name="Observed Actual RPM" stroke="var(--accent-copper)" strokeWidth={2.5} dot={{ r: 2 }} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                <Line yAxisId="rpm" type="monotone" dataKey="rpmTwin" name="Twin Model Expected RPM" stroke="var(--status-active)" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                <Line yAxisId="map" type="monotone" dataKey="mapInHg" name="Manifold Pressure (inHg)" stroke="var(--accent-teal)" strokeWidth={1.5} dot={false} isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              No historical trajectory frames recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
