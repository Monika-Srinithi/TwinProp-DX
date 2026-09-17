import React, { useState, useEffect } from 'react';
import {
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Info,
  Flame,
  Zap,
  Droplet,
  Wind,
  Wrench,
  ShieldCheck,
  TrendingDown,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import MetricCard from '../components/MetricCard';
import { useTheme } from '../context/ThemeContext';
import {
  getEngines,
  getEngineRUL,
  getEngineRULTrajectory,
} from '../services/api';

export default function RULPrediction() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [engines, setEngines] = useState([]);
  const [selectedEngineId, setSelectedEngineId] = useState('');
  const [rulState, setRulState] = useState(null);
  const [trajectoryData, setTrajectoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoPoll, setAutoPoll] = useState(true);

  // Fetch engines
  const fetchEngines = async () => {
    try {
      setError('');
      const data = await getEngines();
      setEngines(data);
      if (data.length > 0 && !selectedEngineId) {
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

  // Fetch RUL assessment and projected trajectory
  const fetchRULData = async () => {
    if (!selectedEngineId) return;
    try {
      const [rulRes, trajRes] = await Promise.all([
        getEngineRUL(selectedEngineId),
        getEngineRULTrajectory(selectedEngineId),
      ]);
      setRulState(rulRes);

      if (trajRes?.trajectory) {
        const formatted = trajRes.trajectory.map((p) => ({
          hours: p.flight_hours,
          wear: p.projected_wear_pct,
          lower: p.lower_bound_pct,
          upper: p.upper_bound_pct,
          tboLimit: p.tbo_threshold_pct,
        }));
        setTrajectoryData(formatted);
      }
    } catch (err) {
      console.error('Failed to retrieve RUL prognostics:', err);
    }
  };

  useEffect(() => {
    fetchRULData();
    if (!autoPoll) return;
    const interval = setInterval(fetchRULData, 5000);
    return () => clearInterval(interval);
  }, [selectedEngineId, autoPoll]);

  const milestones = rulState?.milestones;
  const stress = rulState?.stress_multipliers;
  const wear = rulState?.subsystem_wear;

  const getMetricStatus = (status) => {
    switch (status) {
      case 'CRITICAL_INSPECTION_MANDATORY':
        return 'critical';
      case 'OVERHAUL_REQUIRED':
      case 'MAINTENANCE_ADVISORY':
        return 'warning';
      default:
        return 'normal';
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem', animation: 'pageFadeIn 0.35s ease' }}>
      {/* Header & Tactical Controls */}
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
              Remaining Useful Life (RUL) & Prognostic Health
            </h2>
            <span className="badge badge-phase font-mono">PHASE 4 PROTOTYPE</span>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Cumulative Multi-Physics Stress Modeling • 90% Confidence Intervals • Component Wear Trajectory Projection
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
              {engines.length === 0 ? (
                <option value="">No Engines</option>
              ) : (
                engines.map((eng) => (
                  <option key={eng.engine_id} value={eng.engine_id}>
                    {eng.engine_id} ({eng.aircraft_id})
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="button"
            className={`btn btn-sm ${autoPoll ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAutoPoll(!autoPoll)}
            title="Toggle live 5s prognostics polling"
          >
            <Activity size={14} />
            <span>{autoPoll ? '5s LIVE' : 'PAUSED'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchRULData}
            title="Refresh RUL Calculations"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Mandatory Airworthiness & Academic Prototype Notice */}
      <div style={{
        padding: '0.85rem 1.25rem',
        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.06)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.25rem',
        fontFamily: 'var(--font-mono)',
      }}>
        <AlertTriangle size={18} color="var(--status-warning)" style={{ flexShrink: 0 }} />
        <span>
          <strong style={{ color: 'var(--text-main)' }}>ADVISORY PHM NOTICE (NOT AN AIRWORTHINESS RELEASE):</strong> Remaining Useful Life (RUL) estimates are condition-based academic approximations derived from cumulative thermal, cyclic, and lubrication stress modeling calibrated to the Rotax 914 F 2,000-hour TBO reference assumption. This software does NOT override, replace, or extend certified OEM, FAA, or EASA mandatory scheduled maintenance limits (100h / 500h / 2,000h TBO).
        </span>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
          border: '1px solid var(--status-error)',
          borderRadius: '10px',
          color: 'var(--status-error)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
        }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Executive RUL & Prognostic Gauges */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {/* Estimated RUL Hours */}
        <MetricCard
          title="Projected Remaining Life"
          value={rulState ? `${rulState.estimated_rul_hours.toFixed(0)} HRS` : 'N/A'}
          status={getMetricStatus(rulState?.prognostic_status)}
          nominalRange={
            rulState
              ? `90% CI: [${rulState.confidence_interval_90_lower.toFixed(0)} - ${rulState.confidence_interval_90_upper.toFixed(0)}] h`
              : '2,000 h Ref TBO'
          }
          icon={Clock}
          hasData={!!rulState}
        />

        {/* Prognostic Model Confidence */}
        <MetricCard
          title="Prognostic Confidence"
          value={rulState ? `${(rulState.prognostic_confidence * 100).toFixed(0)}%` : '0%'}
          status={rulState?.prognostic_confidence >= 0.80 ? 'normal' : 'warning'}
          nominalRange="> 80% High Fidelity"
          icon={ShieldCheck}
          hasData={!!rulState}
        />

        {/* Damage Acceleration Multiplier */}
        <MetricCard
          title="Damage Acceleration"
          value={rulState ? `${rulState.damage_rate_multiplier.toFixed(2)}x` : '1.00x'}
          status={
            rulState?.damage_rate_multiplier > 2.0
              ? 'critical'
              : rulState?.damage_rate_multiplier > 1.3
              ? 'warning'
              : 'normal'
          }
          nominalRange="1.00x Nominal Cruise"
          icon={TrendingDown}
          hasData={!!rulState}
        />

        {/* Prognostic Health Status */}
        <MetricCard
          title="Prognostic State"
          value={rulState ? rulState.prognostic_status.replace(/_/g, ' ') : 'STANDBY'}
          status={getMetricStatus(rulState?.prognostic_status)}
          nominalRange="OPTIMAL / NOMINAL"
          icon={Activity}
          hasData={!!rulState}
        />
      </div>

      {/* Actionable Maintenance Guidance Card */}
      <div className="card" style={{
        marginBottom: '1.5rem',
        borderLeft: '5px solid var(--accent-copper)',
        padding: '1.25rem 1.5rem',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wrench size={18} color="var(--accent-copper)" />
            <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Condition-Based Maintenance Advisory
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              PRIMARY DEGRADATION DRIVER:
            </span>
            <span className="badge badge-phase font-mono">
              {wear?.dominant_degrading_subsystem || 'Nominal Subsystem Aging'}
            </span>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.55' }}>
          {rulState?.maintenance_advisory || 'Evaluating component stress accumulation.'}
        </p>
      </div>

      {/* Scheduled Inspection Milestones & Stress Multipliers Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        {/* Left Card: Scheduled Maintenance Countdown Milestones */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="var(--accent-copper)" />
              <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Inspection & Overhaul Milestones
              </h3>
            </div>
            <span className="badge font-mono badge-phase" style={{ fontSize: '0.72rem' }}>
              {milestones ? `${milestones.accumulated_service_hours.toFixed(1)} HRS LOGGED` : '0 HRS'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', fontSize: '0.825rem' }}>
            {/* 100-Hr Minor Inspection */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>100-Hour Minor Line Service:</span>
                <span className="font-mono" style={{ color: 'var(--accent-copper)', fontWeight: 600 }}>
                  {milestones ? `${milestones.hours_to_100h_inspection.toFixed(1)} h remaining` : 'N/A'}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <div style={{
                  width: `${milestones ? Math.max(5, 100 - (milestones.hours_to_100h_inspection / 100) * 100) : 0}%`,
                  height: '100%',
                  backgroundColor: 'var(--accent-copper)',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            {/* 500-Hr Intermediate Inspection */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>500-Hour Borescope & Valve Clearance:</span>
                <span className="font-mono" style={{ color: '#818cf8', fontWeight: 600 }}>
                  {milestones ? `${milestones.hours_to_500h_inspection.toFixed(1)} h remaining` : 'N/A'}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <div style={{
                  width: `${milestones ? Math.max(5, 100 - (milestones.hours_to_500h_inspection / 500) * 100) : 0}%`,
                  height: '100%',
                  backgroundColor: '#818cf8',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            {/* 2,000-Hr Reference TBO */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>2,000-Hour Reference Major Overhaul (TBO):</span>
                <span className="font-mono" style={{ color: 'var(--status-warning)', fontWeight: 600 }}>
                  {milestones ? `${milestones.hours_to_tbo_overhaul.toFixed(1)} h remaining` : 'N/A'}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <div style={{
                  width: `${milestones ? Math.max(5, (milestones.accumulated_service_hours / 2000) * 100) : 0}%`,
                  height: '100%',
                  backgroundColor: 'var(--status-warning)',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Equivalent Operating Hours (EOH):</span>
              <span className="font-mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                {milestones ? `${milestones.equivalent_operating_hours.toFixed(1)} EOH` : '0 EOH'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Card: Multi-Physics Stress Multiplier Gauges */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} color="var(--status-warning)" />
              <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Instantaneous Degradation Multipliers
              </h3>
            </div>
            <span className="badge font-mono badge-warning" style={{ fontSize: '0.72rem' }}>
              {stress ? `${stress.composite_damage_rate.toFixed(2)}x RATE` : '1.0x'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.8rem' }}>
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                <Flame size={14} color="var(--status-error)" />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Thermal Stress:</span>
              </div>
              <span className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: stress?.thermal > 1.5 ? 'var(--status-error)' : 'var(--text-main)' }}>
                {stress ? `${stress.thermal.toFixed(2)}x` : '1.00x'}
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                <Activity size={14} color="#818cf8" />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Mechanical Fatigue:</span>
              </div>
              <span className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: stress?.mechanical > 1.5 ? 'var(--status-warning)' : 'var(--text-main)' }}>
                {stress ? `${stress.mechanical.toFixed(2)}x` : '1.00x'}
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                <Wind size={14} color="var(--accent-copper)" />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Turbo Boost Stress:</span>
              </div>
              <span className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: stress?.turbo_boost > 1.5 ? 'var(--status-warning)' : 'var(--text-main)' }}>
                {stress ? `${stress.turbo_boost.toFixed(2)}x` : '1.00x'}
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                <Droplet size={14} color="var(--status-active)" />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Lubrication Film:</span>
              </div>
              <span className="font-mono" style={{ fontSize: '1.15rem', fontWeight: 700, color: stress?.lubrication > 1.5 ? 'var(--status-error)' : 'var(--text-main)' }}>
                {stress ? `${stress.lubrication.toFixed(2)}x` : '1.00x'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Component Subsystem Wear Meters */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="var(--accent-copper)" />
            <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Subsystem Component Wear Breakdown
            </h3>
          </div>
          <span className="badge badge-phase font-mono">
            4 CRITICAL SUB-ASSEMBLIES
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', fontSize: '0.825rem' }}>
          {/* Cylinder Head & Valve Train */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem 1.15rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Cylinder & Valves:</span>
              <span className="font-mono" style={{ color: 'var(--status-error)', fontWeight: 600 }}>
                {wear ? `${wear.cylinder_valves_wear_pct.toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <div style={{ width: `${wear?.cylinder_valves_wear_pct || 0}%`, height: '100%', backgroundColor: 'var(--status-error)', transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block' }}>
              Thermal cycling & guide clearance
            </span>
          </div>

          {/* Piston Rings & Cylinder Bore */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem 1.15rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Piston Rings & Liner:</span>
              <span className="font-mono" style={{ color: 'var(--status-warning)', fontWeight: 600 }}>
                {wear ? `${wear.piston_rings_wear_pct.toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <div style={{ width: `${wear?.piston_rings_wear_pct || 0}%`, height: '100%', backgroundColor: 'var(--status-warning)', transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block' }}>
              Bore friction & blow-by sealing
            </span>
          </div>

          {/* Turbocharger & Wastegate */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem 1.15rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Turbo & Wastegate:</span>
              <span className="font-mono" style={{ color: 'var(--accent-copper)', fontWeight: 600 }}>
                {wear ? `${wear.turbocharger_actuator_wear_pct.toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <div style={{ width: `${wear?.turbocharger_actuator_wear_pct || 0}%`, height: '100%', backgroundColor: 'var(--accent-copper)', transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block' }}>
              Compressor bearings & spindle play
            </span>
          </div>

          {/* Journal Bearings & Lubrication */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem 1.15rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Journal Bearings:</span>
              <span className="font-mono" style={{ color: 'var(--status-active)', fontWeight: 600 }}>
                {wear ? `${wear.journal_bearings_wear_pct.toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <div style={{ width: `${wear?.journal_bearings_wear_pct || 0}%`, height: '100%', backgroundColor: 'var(--status-active)', transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block' }}>
              Hydrodynamic journal contact wear
            </span>
          </div>
        </div>
      </div>

      {/* Projected Degradation Trajectory Chart */}
      <div className="card">
        <div className="card-header" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h3 className="font-display" style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 600 }}>
              Projected Lifecycle Degradation Trajectory & 90% Confidence Envelope
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Projected cumulative engine wear progression across flight operating hours up to the 2,000-hr TBO limit
            </p>
          </div>
          <span className="badge badge-phase font-mono">
            TBO = 2,000 FLIGHT HOURS
          </span>
        </div>

        <div style={{ height: '340px', width: '100%', marginTop: '0.75rem' }}>
          {trajectoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trajectoryData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "var(--border-color)" : "rgba(0,0,0,0.06)"} vertical={false} />
                <XAxis
                  dataKey="hours"
                  stroke={isDark ? "var(--border-color)" : "rgba(0,0,0,0.15)"}
                  tick={{ fill: isDark ? 'var(--text-muted)' : 'var(--text-dim)', fontSize: 10 }}
                  unit=" h"
                />
                <YAxis
                  domain={[0, 120]}
                  stroke={isDark ? "var(--border-color)" : "rgba(0,0,0,0.15)"}
                  tick={{ fill: isDark ? 'var(--text-main)' : 'var(--text-main)', fontSize: 10 }}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    borderRadius: '10px',
                    boxShadow: 'var(--card-shadow)',
                    color: 'var(--text-main)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                  }}
                  formatter={(value, name) => {
                    const labels = {
                      wear: 'Projected Nominal Wear',
                      upper: '90% Upper Bound',
                      lower: '90% Lower Bound',
                      tboLimit: 'TBO Limit Threshold',
                    };
                    return [`${value}%`, labels[name] || name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '0.5rem' }} />

                {/* 90% Confidence Envelope Area */}
                <Area
                  type="monotone"
                  dataKey="upper"
                  stroke="none"
                  fill="var(--accent-copper)"
                  fillOpacity={isDark ? 0.15 : 0.12}
                  name="90% Upper Bound"
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  stroke="none"
                  fill={isDark ? "var(--bg-card)" : "#ffffff"}
                  fillOpacity={0.5}
                  name="90% Lower Bound"
                />

                {/* Projected Nominal Wear Line */}
                <Line
                  type="monotone"
                  dataKey="wear"
                  name="Projected Nominal Wear"
                  stroke="var(--accent-copper)"
                  strokeWidth={2.5}
                  dot={false}
                />

                {/* Reference 100% TBO Limit Line */}
                <ReferenceLine
                  y={100}
                  stroke="var(--status-error)"
                  strokeDasharray="4 4"
                  label={{ value: '100% Reference TBO Limit (2,000h)', fill: 'var(--status-error)', fontSize: 10, position: 'insideTopRight' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
              Loading projected degradation trajectory...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
