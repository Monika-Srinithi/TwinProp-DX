import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Flame,
  Droplet,
  Zap,
  Gauge,
  CheckCircle,
  RefreshCw,
  Sliders,
  Check,
  Info,
  Clock,
  Radio,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import MetricCard from '../components/MetricCard';
import { useTheme } from '../context/ThemeContext';
import {
  getEngines,
  getEngineDiagnosis,
  getFaults,
  acknowledgeFault,
  simulateFault,
} from '../services/api';

export default function FaultDiagnosis() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [engines, setEngines] = useState([]);
  const [selectedEngineId, setSelectedEngineId] = useState('');
  const [diagnosis, setDiagnosis] = useState(null);
  const [faultLogs, setFaultLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [autoPoll, setAutoPoll] = useState(true);

  // Load engines on mount
  const fetchEngines = async () => {
    try {
      setError('');
      const data = await getEngines();
      setEngines(data);
      if (data.length > 0 && !selectedEngineId) {
        setSelectedEngineId(data[0].engine_id);
      }
    } catch (err) {
      setError('Could not connect to TwinProp backend to retrieve engine fleet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEngines();
  }, []);

  // Fetch diagnosis and fault logs for selected engine
  const fetchDiagnosticData = async () => {
    if (!selectedEngineId) return;
    try {
      const [diagData, logsData] = await Promise.all([
        getEngineDiagnosis(selectedEngineId),
        getFaults(selectedEngineId, 30),
      ]);
      setDiagnosis(diagData);
      setFaultLogs(logsData);
    } catch (err) {
      console.error('Failed to load diagnosis data:', err);
    }
  };

  useEffect(() => {
    fetchDiagnosticData();
    if (!autoPoll) return;
    const interval = setInterval(fetchDiagnosticData, 5000);
    return () => clearInterval(interval);
  }, [selectedEngineId, autoPoll]);

  // Acknowledge a fault alert
  const handleAcknowledge = async (faultId) => {
    try {
      await acknowledgeFault(faultId);
      setSuccessMsg(`Alert #${faultId} acknowledged by operator.`);
      fetchDiagnosticData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(`Failed to acknowledge alert: ${err.message}`);
    }
  };

  // Trigger interactive fault simulation
  const handleSimulate = async (scenario, severity = 'WARNING') => {
    if (!selectedEngineId) return;
    setSimulating(true);
    try {
      setError('');
      const res = await simulateFault(selectedEngineId, scenario, severity);
      setDiagnosis(res);
      setSuccessMsg(`[SIMULATION ACTIVE]: Injected ${scenario} packet. Real-time diagnosis updated.`);
      await fetchDiagnosticData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  // Prepare XAI attribution chart data
  const xaiData = diagnosis?.feature_attributions
    ? Object.entries(diagnosis.feature_attributions)
        .map(([key, value]) => {
          const names = {
            rpm: 'RPM',
            cht: 'CHT',
            egt: 'EGT',
            oil_pressure: 'Oil Press',
            oil_temperature: 'Oil Temp',
            fuel_flow: 'Fuel Flow',
            vibration: 'Vibration',
            throttle: 'Throttle',
            battery_voltage: 'Battery',
          };
          return {
            name: names[key] || key,
            rawKey: key,
            attribution: Number(value) || 0,
          };
        })
        .sort((a, b) => b.attribution - a.attribution)
    : [];

  const getSeverityBadgeClass = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'badge-critical';
      case 'WARNING':
        return 'badge-warning';
      case 'ADVISORY':
        return 'badge-phase';
      default:
        return 'badge-operational';
    }
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'var(--status-error)';
      case 'WARNING':
        return 'var(--status-warning)';
      case 'ADVISORY':
        return 'var(--accent-copper)';
      default:
        return 'var(--status-active)';
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem', animation: 'pageFadeIn 0.35s ease' }}>
      {/* Top Header & Tactical Controls */}
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
              AI Anomaly Detection & Fault Classification
            </h2>
            <span className="badge badge-phase">PHASE 3 PROTOTYPE</span>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Physics-Informed Residual Scoring • Deterministic Multi-Class Diagnostic Engine • Explainable AI (XAI)
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
            className={`btn btn-sm ${autoPoll ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAutoPoll(!autoPoll)}
            title="Toggle live 5s telemetry polling"
          >
            <Activity size={14} />
            <span>{autoPoll ? '5s Polling: ON' : 'Polling: PAUSED'}</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchDiagnosticData}
            title="Refresh Diagnostics"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Prototype Engineering Disclaimer Banner */}
      <div style={{
        padding: '0.85rem 1.25rem',
        backgroundColor: isDark ? 'rgba(234, 88, 12, 0.08)' : 'rgba(234, 88, 12, 0.06)',
        border: '1px solid var(--accent-copper-border)',
        borderRadius: '12px',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.25rem',
        fontFamily: 'var(--font-mono)',
      }}>
        <Info size={16} color="var(--accent-copper)" style={{ flexShrink: 0 }} />
        <span>
          <strong style={{ color: 'var(--text-main)' }}>PROTOTYPE ARCHITECTURE:</strong> Implements physics-informed baseline residuals, statistical deviation aggregation, and SHAP-like attribution vectors. Thresholds reflect simulated academic modeling for MALE UAV aero-pistons and are not certified OEM limits.
        </span>
      </div>

      {/* Status Notifications */}
      {successMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
          border: '1px solid var(--status-active)',
          borderRadius: '10px',
          color: 'var(--status-active)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
        }}>
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

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

      {/* 4 Key Summary Diagnostic Gauges */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <MetricCard
          title="Powertrain Health Index"
          value={diagnosis?.health_index != null ? `${diagnosis.health_index.toFixed(1)}%` : 'N/A'}
          status={
            diagnosis?.health_index >= 85
              ? 'normal'
              : diagnosis?.health_index >= 60
              ? 'warning'
              : 'critical'
          }
          nominalRange="> 85.0% Optimal"
          icon={diagnosis?.health_index >= 85 ? ShieldCheck : ShieldAlert}
          hasData={!!diagnosis}
        />

        <MetricCard
          title="Composite Anomaly Index"
          value={diagnosis?.anomaly_score != null ? diagnosis.anomaly_score.toFixed(2) : '0.00'}
          status={
            diagnosis?.anomaly_score < 0.25
              ? 'normal'
              : diagnosis?.anomaly_score < 0.60
              ? 'warning'
              : 'critical'
          }
          nominalRange="< 0.25 Nominal"
          icon={AlertTriangle}
          hasData={!!diagnosis}
        />

        <MetricCard
          title="Diagnostic State"
          value={diagnosis ? diagnosis.severity : 'STANDBY'}
          status={
            diagnosis?.severity === 'NORMAL'
              ? 'normal'
              : diagnosis?.severity === 'CRITICAL'
              ? 'critical'
              : 'warning'
          }
          nominalRange="NORMAL"
          icon={Activity}
          hasData={!!diagnosis}
        />

        <MetricCard
          title="Excursion Channels"
          value={diagnosis ? `${diagnosis.active_anomalies_count} CHANNELS` : '0'}
          status={diagnosis?.active_anomalies_count === 0 ? 'normal' : 'warning'}
          nominalRange="0 Channels"
          icon={Sliders}
          hasData={!!diagnosis}
        />
      </div>

      {/* Active Fault Diagnostic Dossier */}
      <div className="card" style={{
        marginBottom: '1.5rem',
        borderLeft: `5px solid ${getSeverityColor(diagnosis?.severity)}`,
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
              <span className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {diagnosis?.primary_fault
                  ? diagnosis.primary_fault.replace(/_/g, ' ')
                  : 'NOMINAL ENVELOPE (NO ACTIVE FAULTS)'}
              </span>
              {diagnosis?.fault_code && (
                <span className="badge badge-warning font-mono" style={{ fontSize: '0.75rem' }}>
                  {diagnosis.fault_code}
                </span>
              )}
              {diagnosis?.is_simulated && (
                <span className="badge font-mono" style={{ backgroundColor: isDark ? 'rgba(168, 85, 247, 0.18)' : 'rgba(168, 85, 247, 0.12)', color: '#a855f7', border: '1px solid #a855f7' }}>
                  SIMULATION ACTIVE
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {diagnosis?.description || 'Evaluating powertrain telemetry stream.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="badge font-mono" style={{ padding: '0.35rem 0.75rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
              <span>CONFIDENCE: {diagnosis ? `${(diagnosis.confidence * 100).toFixed(0)}%` : '0%'}</span>
            </div>
            <div className={`badge ${getSeverityBadgeClass(diagnosis?.severity)}`} style={{ padding: '0.35rem 0.85rem' }}>
              <span>{diagnosis?.severity || 'NORMAL'}</span>
            </div>
          </div>
        </div>

        {/* Root Cause & Pilot Advisory Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-color)',
        }}>
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span className="font-display" style={{ fontSize: '0.75rem', color: 'var(--accent-copper)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
              Root Cause Hypothesis
            </span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              {diagnosis?.root_cause || 'All baseline thermal and mechanical correlations match expected bounds.'}
            </p>
          </div>

          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span className="font-display" style={{ fontSize: '0.75rem', color: 'var(--status-warning)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
              GCS Pilot / Tactical Maintenance Advisory
            </span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              {diagnosis?.recommended_action || 'Continue standard flight protocol. No corrective action required.'}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Fault Simulation Bench */}
      <div className="card" style={{
        marginBottom: '1.5rem',
        border: `1px dashed ${isDark ? 'rgba(234, 88, 12, 0.4)' : 'rgba(234, 88, 12, 0.5)'}`,
        backgroundColor: isDark ? 'rgba(234, 88, 12, 0.03)' : 'rgba(234, 88, 12, 0.02)',
      }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} color="var(--accent-copper)" />
              <h3 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                GCS Fault Injection Bench
              </h3>
              <span className="badge font-mono" style={{ backgroundColor: 'rgba(234, 88, 12, 0.12)', color: 'var(--accent-copper)', border: '1px solid var(--accent-copper-border)' }}>
                SIMULATION MODE
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Inject realistic synthetic fault-mode packets to verify live anomaly detection and XAI feature attribution.
            </p>
          </div>

          {simulating && (
            <span className="badge badge-phase font-mono">
              <RefreshCw size={12} className="animate-spin" />
              <span>INJECTING SIMULATION...</span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm font-mono"
            onClick={() => handleSimulate('IGNITION_MISFIRE', 'WARNING')}
            disabled={simulating || !selectedEngineId}
            title="Inject combustion misfire with high vibration and dropped EGT"
          >
            ⚡ Ignition Misfire (Spark Fouling)
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm font-mono"
            onClick={() => handleSimulate('OIL_SYSTEM_DEGRADATION', 'CRITICAL')}
            disabled={simulating || !selectedEngineId}
            title="Inject rapid oil pressure loss and thermal runaway"
          >
            🛢️ Oil Pressure Loss & Runaway
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm font-mono"
            onClick={() => handleSimulate('TURBO_BOOST_LEAK', 'WARNING')}
            disabled={simulating || !selectedEngineId}
            title="Inject manifold boost leak causing RPM lag at high throttle"
          >
            💨 Turbocharger Boost Leak
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm font-mono"
            onClick={() => handleSimulate('COOLING_DEGRADATION', 'CRITICAL')}
            disabled={simulating || !selectedEngineId}
            title="Inject CHT thermal runaway excursion >140°C"
          >
            🔥 Cylinder Head Overheat (CHT)
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm font-mono"
            onClick={() => handleSimulate('FUEL_STARVATION', 'CRITICAL')}
            disabled={simulating || !selectedEngineId}
            title="Inject fuel flow restriction and extreme lean EGT spike"
          >
            ⛽ Fuel Starvation (Lean Detonation)
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm font-mono"
            onClick={() => handleSimulate('ELECTRICAL_UNDERVOLTAGE', 'WARNING')}
            disabled={simulating || !selectedEngineId}
            title="Inject 28V tactical bus undervoltage sag"
          >
            🔋 Bus Undervoltage Sag
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm font-mono"
            onClick={() => handleSimulate('NOMINAL', 'NORMAL')}
            disabled={simulating || !selectedEngineId}
            title="Restore engine to nominal operating point"
          >
            ✅ Restore Nominal Cruise
          </button>
        </div>
      </div>

      {/* Two-Column Analytics: XAI Feature Attribution & Sensor Residual Matrix */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        {/* Column 1: Explainable AI Feature Attribution Chart */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '0.5rem' }}>
            <div>
              <h3 className="font-display" style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 600 }}>
                Explainable AI (XAI) Feature Attribution
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Normalized deviation weight percentage driving the anomaly decision
              </p>
            </div>
            <span className="badge badge-phase font-mono">
              SHAP-STYLE XAI
            </span>
          </div>

          <div style={{ height: '300px', width: '100%', marginTop: '0.5rem' }}>
            {xaiData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={xaiData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "var(--border-color)" : "rgba(0,0,0,0.06)"} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    unit="%"
                    stroke={isDark ? "var(--border-color)" : "rgba(0,0,0,0.15)"}
                    tick={{ fill: isDark ? 'var(--text-muted)' : 'var(--text-dim)', fontSize: 10 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke={isDark ? "var(--border-color)" : "rgba(0,0,0,0.15)"}
                    tick={{ fill: isDark ? 'var(--text-main)' : 'var(--text-main)', fontSize: 11 }}
                    width={80}
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
                    formatter={(value) => [`${value}% attribution`, 'Contribution']}
                  />
                  <Bar dataKey="attribution" radius={[0, 4, 4, 0]}>
                    {xaiData.map((entry, index) => {
                      let fillColor = 'var(--accent-copper)';
                      if (entry.attribution > 30) fillColor = 'var(--status-error)';
                      else if (entry.attribution > 15) fillColor = 'var(--status-warning)';
                      return <Cell key={`cell-${index}`} fill={fillColor} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                No attribution data available.
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Sensor Deviation Residual Matrix */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="font-display" style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 600 }}>
                Sensor Residual Deviation Matrix
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Observed telemetry vs estimated physics-informed nominal baselines
              </p>
            </div>
            <span className="badge badge-phase font-mono">
              {diagnosis?.deviations?.length || 0} SENSORS
            </span>
          </div>

          <div className="data-table-container" style={{ border: 'none', borderRadius: '0', maxHeight: '300px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sensor Channel</th>
                  <th>Observed</th>
                  <th>Baseline</th>
                  <th>Delta (Δ%)</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {(!diagnosis?.deviations || diagnosis.deviations.length === 0) ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                      No deviation matrix available.
                    </td>
                  </tr>
                ) : (
                  diagnosis.deviations.map((d) => (
                    <tr key={d.sensor}>
                      <td style={{ color: 'var(--text-main)', fontWeight: 500 }}>{d.label}</td>
                      <td style={{ color: 'var(--accent-copper)', fontWeight: 600 }}>
                        {d.actual.toFixed(1)} {d.unit}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {d.expected_nominal.toFixed(1)} {d.unit}
                      </td>
                      <td style={{
                        color: Math.abs(d.residual_pct) > 20
                          ? 'var(--status-error)'
                          : Math.abs(d.residual_pct) > 10
                          ? 'var(--status-warning)'
                          : 'var(--text-main)',
                        fontWeight: 600,
                      }}>
                        {d.residual_pct > 0 ? `+${d.residual_pct.toFixed(1)}%` : `${d.residual_pct.toFixed(1)}%`}
                      </td>
                      <td>
                        <span className={`badge ${
                          d.status === 'CRITICAL'
                            ? 'badge-critical'
                            : d.status === 'WARNING'
                            ? 'badge-warning'
                            : 'badge-operational'
                        }`} style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Historical & Active Fault Event Log */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="font-display" style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 600 }}>
              Diagnostic Alert History & Audit Trail
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Logged anomaly classifications, severity history, and operator acknowledgment audit trail
            </p>
          </div>
          <span className="badge badge-phase font-mono">
            {faultLogs.length} EVENTS RECORDED
          </span>
        </div>

        <div className="data-table-container" style={{ border: 'none', borderRadius: '0' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Fault Code</th>
                <th>Classification</th>
                <th>Severity</th>
                <th>Anomaly Index</th>
                <th>Confidence</th>
                <th>Origin</th>
                <th>Operator Action</th>
              </tr>
            </thead>
            <tbody>
              {faultLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
                    No anomaly events recorded in fault registry for {selectedEngineId || 'active engine'}.
                  </td>
                </tr>
              ) : (
                faultLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ color: 'var(--status-warning)', fontWeight: 600 }}>{log.fault_code}</td>
                    <td style={{ color: 'var(--text-main)', fontWeight: 500 }}>{log.fault_type.replace(/_/g, ' ')}</td>
                    <td>
                      <span className={`badge ${getSeverityBadgeClass(log.severity)}`} style={{ fontSize: '0.65rem' }}>
                        {log.severity}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{log.anomaly_score.toFixed(2)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{(log.confidence * 100).toFixed(0)}%</td>
                    <td>
                      {log.is_simulated ? (
                        <span className="badge font-mono" style={{ backgroundColor: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                          SIMULATION
                        </span>
                      ) : (
                        <span className="badge font-mono badge-operational">
                          LIVE
                        </span>
                      )}
                    </td>
                    <td>
                      {log.is_acknowledged ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--status-active)', fontSize: '0.75rem', fontWeight: 600 }}>
                          <Check size={14} />
                          <span>ACKNOWLEDGED</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm font-mono"
                          style={{ padding: '0.2rem 0.6rem', fontSize: '0.7rem' }}
                          onClick={() => handleAcknowledge(log.id)}
                        >
                          Acknowledge
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
