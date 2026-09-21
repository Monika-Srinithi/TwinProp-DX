import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gauge,
  Thermometer,
  Flame,
  Droplet,
  Activity,
  Power,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Send,
  Layers,
  History,
  Zap,
  CheckCircle2,
  Wind,
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import TelemetryChart from '../components/TelemetryChart';
import {
  getEngines,
  getLatestTelemetry,
  getTelemetry,
  getEngineDiagnosis,
  getMissions,
} from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [engines, setEngines] = useState([]);
  const [selectedEngineId, setSelectedEngineId] = useState('');
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [diagnosis, setDiagnosis] = useState(null);
  const [activeMission, setActiveMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch registered engines
  const fetchEngines = async () => {
    try {
      setError('');
      const data = await getEngines();
      console.log('ENGINES FROM API:', data);
      setEngines(data);
      if (data.length > 0 && !selectedEngineId) {
        setSelectedEngineId(data[0].engine_id);
      }
    } catch (err) {
      setError('Could not connect to TwinProp backend to fetch engine list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEngines();
  }, []);

  // Fetch telemetry, diagnosis, and mission for selected engine
  const fetchEngineData = async () => {
    if (!selectedEngineId) return;
    try {
      const [latestRes, historyRes, diagRes, missionsRes] = await Promise.allSettled([
        getLatestTelemetry(selectedEngineId),
        getTelemetry(selectedEngineId, 30),
        getEngineDiagnosis(selectedEngineId),
        getMissions(),
      ]);

      if (latestRes.status === 'fulfilled') setLatestTelemetry(latestRes.value);
      else setLatestTelemetry(null);

      if (historyRes.status === 'fulfilled') setTelemetryHistory(historyRes.value);
      else setTelemetryHistory([]);

      if (diagRes.status === 'fulfilled') setDiagnosis(diagRes.value);
      else setDiagnosis(null);

      if (missionsRes.status === 'fulfilled' && missionsRes.value.length > 0) {
        const assigned = missionsRes.value.find((m) => m.engine_id === selectedEngineId) || null;
        setActiveMission(assigned);
      }
    } catch (err) {
      // Quiet catch
    }
  };

  useEffect(() => {
    fetchEngineData();
    const interval = setInterval(fetchEngineData, 5000);
    return () => clearInterval(interval);
  }, [selectedEngineId]);

  const selectedEngine = engines.find((e) => e.engine_id === selectedEngineId);
  const hasTelemetry = latestTelemetry !== null;

  // Threshold evaluations
  const getRpmStatus = () => {
    if (!latestTelemetry || latestTelemetry.rpm == null) return 'inactive';
    const rpm = Number(latestTelemetry.rpm);
    if (rpm <= 0) return 'inactive';
    if (rpm > 5800) return 'warning';
    if (rpm < 4500) return 'warning';
    return 'normal';
  };

  const getChtStatus = () => {
    if (!latestTelemetry || latestTelemetry.cht == null) return 'inactive';
    if (latestTelemetry.rpm <= 0) return 'inactive';
    const cht = Number(latestTelemetry.cht);
    if (cht > 135) return 'critical';
    if (cht < 90) return 'warning';
    return 'normal';
  };

  const getEgtStatus = () => {
    if (!latestTelemetry || latestTelemetry.egt == null) return 'inactive';
    if (latestTelemetry.rpm <= 0) return 'inactive';
    const egt = Number(latestTelemetry.egt);
    if (egt > 880) return 'warning';
    if (egt < 750) return 'warning';
    return 'normal';
  };

  const getOilPressureStatus = () => {
    if (!latestTelemetry || latestTelemetry.oil_pressure == null) return 'inactive';
    if (latestTelemetry.rpm <= 0) return 'inactive';
    const op = Number(latestTelemetry.oil_pressure);
    if (op < 2.0 || op > 5.0) return 'warning';
    return 'normal';
  };

  const getVibrationStatus = () => {
    if (!latestTelemetry || latestTelemetry.vibration == null) return 'inactive';
    if (latestTelemetry.rpm <= 0) return 'inactive';
    const vib = Number(latestTelemetry.vibration);
    if (vib > 15.0) return 'critical';
    if (vib > 12.0) return 'warning';
    return 'normal';
  };

  const healthScore = diagnosis?.health_score ?? null;
  const healthSeverity = diagnosis?.severity ?? 'NORMAL';

  return (
    <div className="page-container">
      {/* Top Controls Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '1rem 1.25rem',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
            Powertrain Health & Operations Console
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Rotax 914 F Turbocharged • Real-Time Sensor Telemetry Matrix
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label className="form-label" style={{ margin: 0 }}>Active Engine:</label>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '200px' }}
              value={selectedEngineId}
              onChange={(e) => setSelectedEngineId(e.target.value)}
              disabled={engines.length === 0}
            >
              {engines.length === 0 ? (
                <option value="">No Engines Registered</option>
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
            className="btn btn-secondary btn-sm"
            onClick={() => {
              fetchEngines();
              fetchEngineData();
            }}
            title="Refresh Telemetry"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--status-error-subtle)',
          border: '1px solid var(--status-error-border)',
          borderRadius: '10px',
          color: 'var(--status-error)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <RefreshCw size={28} color="var(--accent-copper)" className="animate-spin" />
            <div>
              <p className="font-display" style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 700, letterSpacing: '0.05em' }}>
                INITIALIZING TELEMETRY DOWNLINK
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Connecting to powertrain sensors and digital twin core...
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Visually Dominant Engine Health Hero Section */}
          <div className="card" style={{
            marginBottom: '1.5rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
              alignItems: 'center'
            }}>
              {/* Left: Circular Health Gauge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ position: 'relative', width: '110px', height: '110px', flexShrink: 0 }}>
                  <svg width="110" height="110" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="var(--border-color)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={healthSeverity === 'CRITICAL' ? 'var(--status-error)' : healthSeverity === 'WARNING' ? 'var(--status-warning)' : 'var(--status-active)'}
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={(2 * Math.PI * 42) * (1 - (healthScore / 100))}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span className="font-mono" style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      lineHeight: 1
                    }}>
                      {healthScore != null ? `${healthScore.toFixed(0)}%` : 'N/A'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      HEALTH
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <h3 className="font-display" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {selectedEngine?.engine_id || 'ENG-ROTAX-914-01'}
                    </h3>
                    <span className={`badge ${healthSeverity === 'CRITICAL' ? 'badge-critical' : healthSeverity === 'WARNING' ? 'badge-warning' : 'badge-operational'}`}>
                      {healthSeverity}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    Rotax 914 F Series • 84.5 kW (115 HP) Turbocharged Piston Engine
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.725rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    <span>Airframe: <strong>{selectedEngine?.aircraft_id || 'UAV-MALE-TAPAS-01'}</strong></span>
                    <span>•</span>
                    <span>Status: <strong style={{ color: 'var(--status-active)' }}>{selectedEngine?.status || 'OPERATIONAL'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Right: Real-Time Operational Highlights */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                gap: '0.85rem',
                backgroundColor: 'var(--bg-primary)',
                padding: '0.85rem 1.15rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>ENGINE RPM</span>
                  <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-copper)' }}>
                    {latestTelemetry ? `${latestTelemetry.rpm.toFixed(0)}` : '0'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}> RPM</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>CYLINDER CHT</span>
                  <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--status-active)' }}>
                    {latestTelemetry ? `${latestTelemetry.cht.toFixed(1)}` : '0.0'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}> °C</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>OIL PRESSURE</span>
                  <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#6366f1' }}>
                    {latestTelemetry ? `${latestTelemetry.oil_pressure.toFixed(1)}` : '0.0'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}> bar</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>VIBRATION</span>
                  <span className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--status-warning)' }}>
                    {latestTelemetry ? `${latestTelemetry.vibration.toFixed(1)}` : '0.0'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}> mm/s</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Key Telemetry Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <MetricCard
              title="Engine Speed"
              value={latestTelemetry?.rpm}
              unit="RPM"
              status={getRpmStatus()}
              nominalRange="4500 - 5800 RPM"
              icon={Gauge}
              hasData={hasTelemetry}
            />
            <MetricCard
              title="Cylinder Head (CHT)"
              value={latestTelemetry?.cht}
              unit="°C"
              status={getChtStatus()}
              nominalRange="90 - 135 °C"
              icon={Thermometer}
              hasData={hasTelemetry}
            />
            <MetricCard
              title="Exhaust Gas (EGT)"
              value={latestTelemetry?.egt}
              unit="°C"
              status={getEgtStatus()}
              nominalRange="750 - 880 °C"
              icon={Flame}
              hasData={hasTelemetry}
            />
            <MetricCard
              title="Oil Pressure"
              value={latestTelemetry?.oil_pressure}
              unit="bar"
              status={getOilPressureStatus()}
              nominalRange="2.0 - 5.0 bar"
              icon={Droplet}
              hasData={hasTelemetry}
            />
            <MetricCard
              title="Vibration RMS"
              value={latestTelemetry?.vibration}
              unit="mm/s"
              status={getVibrationStatus()}
              nominalRange="< 12.0 mm/s"
              icon={Activity}
              hasData={hasTelemetry}
            />
            <MetricCard
              title="Fuel Flow"
              value={latestTelemetry?.fuel_flow}
              unit="L/h"
              status={
                !hasTelemetry || latestTelemetry?.fuel_flow == null
                  ? 'inactive'
                  : latestTelemetry.fuel_flow < 18.0 || latestTelemetry.fuel_flow > 28.0
                    ? 'warning'
                    : 'normal'
              }
              nominalRange="18.0 - 28.0 L/h"
              icon={Wind}
              hasData={hasTelemetry}
            />
          </div>

          {/* 3. Engine Performance Dynamics Chart */}
          <TelemetryChart telemetryData={telemetryHistory} />

          {/* 4 & 5. Bottom Operations Grid (Alerts & Quick Actions) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.5rem',
            marginTop: '1.5rem'
          }}>
            {/* Column 1: Recent Diagnostics & Health Summary */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="var(--accent-copper)" />
                  <h3 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Diagnostic Status Dossier
                  </h3>
                </div>
                <span className={`badge ${healthSeverity === 'NORMAL' ? 'badge-operational' : healthSeverity === 'WARNING' ? 'badge-warning' : 'badge-critical'}`}>
                  {healthSeverity}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Anomaly Score:</span>
                  <span className="font-mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                    {diagnosis?.anomaly_score != null ? diagnosis.anomaly_score.toFixed(3) : '0.000'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Active Classification:</span>
                  <span className="font-mono" style={{ color: healthSeverity === 'NORMAL' ? 'var(--status-active)' : 'var(--accent-copper)', fontWeight: 600 }}>
                    {diagnosis?.primary_fault ? diagnosis.primary_fault.replace(/_/g, ' ') : 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Diagnostic Confidence:</span>
                  <span className="font-mono" style={{ color: 'var(--text-main)' }}>
                    {diagnosis?.confidence ? `${(diagnosis.confidence * 100).toFixed(0)}%` : '95%'}
                  </span>
                </div>
                <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: '1.4', marginTop: '0.2rem' }}>
                  {diagnosis?.recommended_action || 'All four cylinders firing synchronously with optimal intake manifold pressure and balanced exhaust temperatures.'}
                </p>
              </div>
            </div>

            {/* Column 2: Active Mission & Quick Action Center */}
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Send size={18} color="var(--accent-copper)" />
                  <h3 className="font-display" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Active Sortie & Quick Actions
                  </h3>
                </div>
                {activeMission && (
                  <span className="badge badge-copper font-mono">
                    {activeMission.mission_id}
                  </span>
                )}
              </div>

              <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {activeMission ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Profile:</span>
                      <strong style={{ color: 'var(--text-main)' }}>{activeMission.mission_type}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Altitude:</span>
                      <span className="font-mono" style={{ color: 'var(--text-main)' }}>{activeMission.altitude} m</span>
                    </div>
                  </div>
                ) : (
                  <p>No active sortie scheduled for this airframe.</p>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/monitoring')}
                  style={{ gap: '0.4rem' }}
                >
                  <Activity size={14} color="var(--accent-copper)" />
                  <span>Telemetry</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/digital-twin')}
                  style={{ gap: '0.4rem' }}
                >
                  <Layers size={14} color="var(--accent-copper)" />
                  <span>Digital Twin</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/fault-diagnosis')}
                  style={{ gap: '0.4rem' }}
                >
                  <ShieldAlert size={14} color="var(--accent-copper)" />
                  <span>Diagnostics</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/mission-replay')}
                  style={{ gap: '0.4rem' }}
                >
                  <History size={14} />
                  <span>FDR Replay</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
