import React, { useState, useEffect } from 'react';
import {
  Activity,
  PlusCircle,
  Database,
  RefreshCw,
  Sliders,
  AlertCircle,
  CheckCircle2,
  X,
  Gauge,
  Thermometer,
  Flame,
  Droplet,
  Wind,
  Zap,
  Mountain,
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import TelemetryChart from '../components/TelemetryChart';
import {
  getEngines,
  getTelemetry,
  getLatestTelemetry,
  createTelemetry,
  createEngine,
} from '../services/api';

export default function EngineMonitoring() {
  const [engines, setEngines] = useState([]);
  const [selectedEngineId, setSelectedEngineId] = useState('');
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const [telemetryList, setTelemetryList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal states
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Ingestion form state
  const [telemetryForm, setTelemetryForm] = useState({
    rpm: 5200,
    cht: 108.5,
    egt: 812.0,
    oil_pressure: 3.4,
    oil_temperature: 88.0,
    fuel_flow: 24.5,
    vibration: 7.8,
    throttle: 85.0,
    ambient_temperature: 15.0,
    altitude: 2500,
    battery_voltage: 28.2,
  });

  // Engine registration form state
  const [engineForm, setEngineForm] = useState({
    engine_id: 'ENG-ROTAX-914-01',
    engine_type: 'Rotax 914 F Turbocharged',
    aircraft_id: 'UAV-MALE-TAPAS-01',
    status: 'OPERATIONAL',
  });

  // Fetch engines
  const fetchEngines = async () => {
    try {
      const data = await getEngines();
      const engineList = Array.isArray(data) ? data : [];
      setEngines(engineList);
      if (engineList.length > 0 && !selectedEngineId) {
        setSelectedEngineId(engineList[0].engine_id);
      }
    } catch (err) {
      setError('Failed to retrieve engines from backend.');
      setEngines([]);
    }
  };

  useEffect(() => {
    fetchEngines();
  }, []);

  // Fetch telemetry history & latest
  const fetchTelemetryData = async () => {
    if (!selectedEngineId) return;
    setLoading(true);
    try {
      setError('');
      const [listData, latestData] = await Promise.allSettled([
        getTelemetry(selectedEngineId, 50),
        getLatestTelemetry(selectedEngineId),
      ]);
      if (listData.status === 'fulfilled') setTelemetryList(listData.value);
      else setTelemetryList([]);

      if (latestData.status === 'fulfilled') setLatestTelemetry(latestData.value);
      else setLatestTelemetry(null);
    } catch (err) {
      setTelemetryList([]);
      setLatestTelemetry(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetryData();
    const interval = setInterval(fetchTelemetryData, 5000);
    return () => clearInterval(interval);
  }, [selectedEngineId]);

  // Numeric change handler
  const handleNumericChange = (field, value) => {
    setTelemetryForm((prev) => ({
      ...prev,
      [field]: value === '' ? '' : value,
    }));
  };

  // Ingest telemetry
  const handleInjectTelemetry = async (e) => {
    e.preventDefault();
    if (!selectedEngineId) {
      setError('Please select or register an engine first.');
      return;
    }

    const fieldValidations = [
      { key: 'rpm', label: 'Engine RPM' },
      { key: 'cht', label: 'Cylinder Head Temp (CHT)' },
      { key: 'egt', label: 'Exhaust Gas Temp (EGT)' },
      { key: 'oil_pressure', label: 'Oil Pressure' },
      { key: 'oil_temperature', label: 'Oil Temperature' },
      { key: 'fuel_flow', label: 'Fuel Flow' },
      { key: 'vibration', label: 'Vibration RMS' },
      { key: 'throttle', label: 'Throttle Position' },
      { key: 'altitude', label: 'Flight Altitude' },
      { key: 'ambient_temperature', label: 'Ambient Temperature' },
      { key: 'battery_voltage', label: 'Battery Voltage' },
    ];

    for (const field of fieldValidations) {
      const val = telemetryForm[field.key];
      if (val === '' || val === null || val === undefined || isNaN(Number(val))) {
        setError(`Validation Error: Please enter a valid number for ${field.label}.`);
        return;
      }
    }

    try {
      setError('');
      const payload = {
        engine_id: selectedEngineId,
        rpm: Number(telemetryForm.rpm),
        cht: Number(telemetryForm.cht),
        egt: Number(telemetryForm.egt),
        oil_pressure: Number(telemetryForm.oil_pressure),
        oil_temperature: Number(telemetryForm.oil_temperature),
        fuel_flow: Number(telemetryForm.fuel_flow),
        vibration: Number(telemetryForm.vibration),
        throttle: Number(telemetryForm.throttle),
        altitude: Number(telemetryForm.altitude),
        ambient_temperature: Number(telemetryForm.ambient_temperature),
        battery_voltage: Number(telemetryForm.battery_voltage),
      };

      await createTelemetry(payload);
      setSuccessMsg(`Telemetry packet ingested for ${selectedEngineId}`);
      setShowInjectModal(false);
      fetchTelemetryData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(`Failed to inject telemetry: ${err.message}`);
    }
  };

  // Register engine
  const handleRegisterEngine = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const created = await createEngine(engineForm);
      setSuccessMsg(`Engine ${created.engine_id} registered successfully.`);
      setShowRegisterModal(false);
      await fetchEngines();
      setSelectedEngineId(created.engine_id);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(`Failed to register engine: ${err.message}`);
    }
  };

  // Status evaluators
  const t = latestTelemetry;
  const hasData = t !== null;

  return (
    <div className="page-container">
      {/* Header & Controls Bar */}
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
            Multi-Channel Telemetry Stream & Sensors
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-Time Powertrain Acquisition & Archival Matrix for MALE UAV Sorties
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label className="form-label" style={{ margin: 0 }}>Engine:</label>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '180px' }}
              value={selectedEngineId}
              onChange={(e) => setSelectedEngineId(e.target.value)}
              disabled={engines.length === 0}
            >
              {engines.length === 0 ? (
                <option value="">No Engines</option>
              ) : (
                engines.map((eng) => (
                  <option key={eng.engine_id} value={eng.engine_id}>
                    {eng.engine_id}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchTelemetryData}
            title="Refresh Table"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowInjectModal(true)}
            disabled={!selectedEngineId}
          >
            <Activity size={14} />
            <span>Inject Telemetry</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowRegisterModal(true)}
          >
            <PlusCircle size={14} />
            <span>Register Engine</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--status-active-subtle)',
          border: '1px solid var(--status-active-border)',
          borderRadius: '10px',
          color: 'var(--status-active)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

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

      {/* 11 Primary Telemetry Channels Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* 1. RPM */}
        <MetricCard
          title="Engine RPM"
          value={t?.rpm}
          unit="RPM"
          status={t?.rpm > 5800 ? 'warning' : t?.rpm > 4500 ? 'normal' : 'inactive'}
          nominalRange="4500 - 5800 RPM"
          icon={Gauge}
          hasData={hasData}
        />

        {/* 2. CHT */}
        <MetricCard
          title="Cylinder CHT"
          value={t?.cht}
          unit="°C"
          status={t?.cht > 135 ? 'critical' : t?.cht < 90 ? 'warning' : 'normal'}
          nominalRange="90 - 135 °C"
          icon={Thermometer}
          hasData={hasData}
        />

        {/* 3. EGT */}
        <MetricCard
          title="Exhaust EGT"
          value={t?.egt}
          unit="°C"
          status={t?.egt > 880 ? 'warning' : t?.egt < 750 ? 'warning' : 'normal'}
          nominalRange="750 - 880 °C"
          icon={Flame}
          hasData={hasData}
        />

        {/* 4. Oil Pressure */}
        <MetricCard
          title="Oil Pressure"
          value={t?.oil_pressure}
          unit="bar"
          status={t?.oil_pressure < 2.0 || t?.oil_pressure > 5.0 ? 'warning' : 'normal'}
          nominalRange="2.0 - 5.0 bar"
          icon={Droplet}
          hasData={hasData}
        />

        {/* 5. Oil Temperature */}
        <MetricCard
          title="Oil Temp"
          value={t?.oil_temperature}
          unit="°C"
          status={t?.oil_temperature > 110 ? 'warning' : t?.oil_temperature < 70 ? 'warning' : 'normal'}
          nominalRange="80 - 110 °C"
          icon={Thermometer}
          hasData={hasData}
        />

        {/* 6. Fuel Flow */}
        <MetricCard
          title="Fuel Flow"
          value={t?.fuel_flow}
          unit="L/h"
          status="normal"
          nominalRange="18.0 - 28.0 L/h"
          icon={Wind}
          hasData={hasData}
        />

        {/* 7. Vibration */}
        <MetricCard
          title="Vibration RMS"
          value={t?.vibration}
          unit="mm/s"
          status={t?.vibration > 15.0 ? 'critical' : t?.vibration > 12.0 ? 'warning' : 'normal'}
          nominalRange="< 12.0 mm/s"
          icon={Activity}
          hasData={hasData}
        />

        {/* 8. Throttle Position */}
        <MetricCard
          title="Throttle Angle"
          value={t?.throttle}
          unit="%"
          status="normal"
          nominalRange="0 - 100%"
          icon={Sliders}
          hasData={hasData}
        />

        {/* 9. Battery Voltage */}
        <MetricCard
          title="Bus Voltage"
          value={t?.battery_voltage}
          unit="V"
          status={t?.battery_voltage < 25.0 ? 'warning' : 'normal'}
          nominalRange="26.0 - 30.0 V"
          icon={Zap}
          hasData={hasData}
        />

        {/* 10. Estimated MAP */}
        <MetricCard
          title="Manifold MAP"
          value={t ? (t.throttle > 80 ? 35.2 : 29.9) : null}
          unit="inHg"
          status="normal"
          nominalRange="29.0 - 39.9 inHg"
          icon={Wind}
          hasData={hasData}
        />

        {/* 11. Flight Altitude */}
        <MetricCard
          title="Altitude"
          value={t?.altitude}
          unit="m"
          status="normal"
          nominalRange="0 - 7,000 m"
          icon={Mountain}
          hasData={hasData}
        />
      </div>

      {/* Historical Telemetry Chart */}
      <TelemetryChart telemetryData={telemetryList} />

      {/* Historical Ingestion Table */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <div>
            <h3 className="font-display" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Historical Telemetry Logs ({telemetryList.length} Packets)
            </h3>
            <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              Chronological sensor frames recorded for {selectedEngineId}
            </p>
          </div>
          <span className="badge badge-copper font-mono">
            LIVE BUFFER
          </span>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Packet ID</th>
                <th>Timestamp (UTC)</th>
                <th>RPM</th>
                <th>CHT (°C)</th>
                <th>EGT (°C)</th>
                <th>Oil P (bar)</th>
                <th>Oil T (°C)</th>
                <th>Fuel (L/h)</th>
                <th>Vib (mm/s)</th>
                <th>Throttle %</th>
                <th>Alt (m)</th>
                <th>Volt (V)</th>
              </tr>
            </thead>
            <tbody>
              {telemetryList.length === 0 ? (
                <tr>
                  <td colSpan="12" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                    No telemetry records available for this engine.
                  </td>
                </tr>
              ) : (
                telemetryList.slice(0, 30).map((row) => (
                  <tr key={row.id}>
                    <td>#{row.id}</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td style={{ color: row.rpm > 5800 ? 'var(--status-warning)' : 'var(--accent-copper)', fontWeight: 600 }}>
                      {row.rpm.toFixed(1)}
                    </td>
                    <td style={{ color: row.cht > 135 ? 'var(--status-error)' : 'var(--status-active)' }}>
                      {row.cht.toFixed(1)}
                    </td>
                    <td style={{ color: row.egt > 880 ? 'var(--status-warning)' : 'var(--text-main)' }}>
                      {row.egt.toFixed(1)}
                    </td>
                    <td>{row.oil_pressure.toFixed(2)}</td>
                    <td>{row.oil_temperature.toFixed(1)}</td>
                    <td>{row.fuel_flow.toFixed(1)}</td>
                    <td style={{ color: row.vibration > 12 ? 'var(--status-warning)' : 'var(--text-main)' }}>
                      {row.vibration.toFixed(2)}</td>
                    <td>{row.throttle.toFixed(0)}%</td>
                    <td>{row.altitude.toFixed(0)}</td>
                    <td>{row.battery_voltage.toFixed(1)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Telemetry Injection Modal */}
      {showInjectModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={20} color="var(--accent-copper)" />
                <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Manual Telemetry Ingestion
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowInjectModal(false)}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleInjectTelemetry}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Engine RPM (4500-5800)</label>
                  <input
                    type="number"
                    step="1"
                    className="form-input"
                    value={telemetryForm.rpm}
                    onChange={(e) => handleNumericChange('rpm', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cylinder CHT (°C, max 135)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={telemetryForm.cht}
                    onChange={(e) => handleNumericChange('cht', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Exhaust EGT (°C, max 880)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={telemetryForm.egt}
                    onChange={(e) => handleNumericChange('egt', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Oil Pressure (bar, 2-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={telemetryForm.oil_pressure}
                    onChange={(e) => handleNumericChange('oil_pressure', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Oil Temp (°C, 80-110)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={telemetryForm.oil_temperature}
                    onChange={(e) => handleNumericChange('oil_temperature', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fuel Flow (L/h, 18-28)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={telemetryForm.fuel_flow}
                    onChange={(e) => handleNumericChange('fuel_flow', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Vibration RMS (mm/s, &lt;12)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={telemetryForm.vibration}
                    onChange={(e) => handleNumericChange('vibration', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Throttle Position (%)</label>
                  <input
                    type="number"
                    step="1"
                    className="form-input"
                    value={telemetryForm.throttle}
                    onChange={(e) => handleNumericChange('throttle', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Flight Altitude (m)</label>
                  <input
                    type="number"
                    step="10"
                    className="form-input"
                    value={telemetryForm.altitude}
                    onChange={(e) => handleNumericChange('altitude', e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Battery Voltage (V)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={telemetryForm.battery_voltage}
                    onChange={(e) => handleNumericChange('battery_voltage', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowInjectModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Transmit Telemetry Frame
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Engine Modal */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusCircle size={20} color="var(--accent-copper)" />
                <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Register Powertrain Asset
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowRegisterModal(false)}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRegisterEngine}>
              <div className="form-group">
                <label className="form-label">Engine Identifier</label>
                <input
                  type="text"
                  className="form-input"
                  value={engineForm.engine_id}
                  onChange={(e) => setEngineForm({ ...engineForm, engine_id: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Powertrain Model</label>
                <input
                  type="text"
                  className="form-input"
                  value={engineForm.engine_type}
                  onChange={(e) => setEngineForm({ ...engineForm, engine_type: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Target Airframe</label>
                <input
                  type="text"
                  className="form-input"
                  value={engineForm.aircraft_id}
                  onChange={(e) => setEngineForm({ ...engineForm, aircraft_id: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Operational Status</label>
                <select
                  className="form-select"
                  value={engineForm.status}
                  onChange={(e) => setEngineForm({ ...engineForm, status: e.target.value })}
                >
                  <option value="OPERATIONAL">OPERATIONAL</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="STANDBY">STANDBY</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Register Engine Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
