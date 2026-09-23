import React, { useState, useEffect } from 'react';
import {
  Send,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  Compass,
  Mountain,
  Plane,
  ShieldCheck,
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { getMissions, createMission, getEngines } from '../services/api';

const toLocalDatetimeString = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const mins = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
};

const getNextMissionId = (missionsList = []) => {
  const safeList = Array.isArray(missionsList) ? missionsList : [];
  const currentYear = new Date().getFullYear();
  const prefix = `MSN-${currentYear}-`;
  let maxSeq = 0;
  safeList.forEach((m) => {
    if (m && m.mission_id && typeof m.mission_id === 'string') {
      const match = m.mission_id.match(new RegExp(`^${prefix}(\\d+)$`));
      if (match) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  });
  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
};

export default function Missions() {
  const [missions, setMissions] = useState([]);
  const [engines, setEngines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [missionForm, setMissionForm] = useState({
    mission_id: '',
    engine_id: '',
    mission_type: 'High-Altitude Surveillance',
    start_time: toLocalDatetimeString(new Date()),
    end_time: '',
    altitude: 5500,
    payload: 'EO/IR High-Res Optical Pod (45kg)',
    environment: 'High Altitude Sub-Zero (-18°C)',
    status: 'PLANNED',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      setError('');
      const [missionData, engineData] = await Promise.all([
        getMissions(),
        getEngines(),
      ]);
      const validMissions = Array.isArray(missionData) ? missionData : [];
      const validEngines = Array.isArray(engineData) ? engineData : [];
      setMissions(validMissions);
      setEngines(validEngines);
      if (validEngines.length > 0 && !missionForm.engine_id) {
        setMissionForm((prev) => ({ ...prev, engine_id: validEngines[0].engine_id }));
      }
    } catch (err) {
      setError(`Failed to load mission data: ${err.message}`);
      setMissions([]);
      setEngines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    const nextId = getNextMissionId(missions);
    setMissionForm((prev) => ({
      ...prev,
      mission_id: nextId,
      start_time: toLocalDatetimeString(new Date()),
      engine_id: prev.engine_id || (engines.length > 0 ? engines[0].engine_id : ''),
    }));
    setShowCreateModal(true);
  };

  const handleCreateMission = async (e) => {
    e.preventDefault();
    try {
      setError('');
      if (!missionForm.engine_id) {
        setError('Please assign an engine to the mission.');
        return;
      }
      const rawMissionId = (missionForm.mission_id || '').trim();
      const payload = {
        ...missionForm,
        ...(rawMissionId ? { mission_id: rawMissionId } : {}),
        altitude: Number(missionForm.altitude),
        start_time: new Date(missionForm.start_time).toISOString(),
        end_time: missionForm.end_time ? new Date(missionForm.end_time).toISOString() : null,
      };
      if (!rawMissionId) {
        delete payload.mission_id;
      }

      const created = await createMission(payload);
      setSuccessMsg(`Mission ${created?.mission_id || payload.mission_id || 'new'} created successfully.`);
      setShowCreateModal(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(`Failed to create mission: ${err.message}`);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'badge-operational';
      case 'IN_PROGRESS':
      case 'ACTIVE':
        return 'badge-copper';
      case 'PLANNED':
        return 'badge-steel';
      default:
        return 'badge-inactive';
    }
  };

  // Calculate Fleet Readiness dynamically from registered engines
  const validEngines = Array.isArray(engines)
    ? engines.filter((e) => e && typeof e.status === 'string' && e.status.trim().length > 0)
    : [];
  const hasValidInputs = validEngines.length > 0;
  const operationalCount = hasValidInputs
    ? validEngines.filter((e) => e.status.trim().toUpperCase() === 'OPERATIONAL').length
    : 0;
  const readinessPct = hasValidInputs
    ? Math.round((operationalCount / validEngines.length) * 100)
    : null;

  const readinessValue = hasValidInputs ? `${readinessPct}%` : 'N/A';
  const readinessUnit = hasValidInputs ? 'Ready' : 'Unavailable';
  const readinessStatus = !hasValidInputs
    ? 'inactive'
    : readinessPct >= 80
      ? 'active'
      : readinessPct >= 50
        ? 'warning'
        : 'critical';
  const readinessRange = hasValidInputs
    ? `${operationalCount} of ${validEngines.length} Ready for Sortie Dispatch`
    : 'No fleet engines registered';

  return (
    <div className="page-container">
      {/* Top Header & Controls */}
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
            UAV Flight Mission Sortie Registry
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Mission Profiles, Operating Envelopes, and Powertrain Assignment
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            title="Refresh"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={openCreateModal}
          >
            <PlusCircle size={14} />
            <span>Create Sortie</span>
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

      {/* Sortie Summary Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <MetricCard
          title="Registered Sorties"
          value={missions.length}
          unit="Missions"
          status="normal"
          nominalRange="Flight Archive Active"
          icon={Compass}
          hasData={true}
        />
        <MetricCard
          title="Active Engines"
          value={operationalCount}
          unit="Powerplants"
          status={operationalCount > 0 ? "normal" : "warning"}
          nominalRange={engines.length > 0 ? `${operationalCount} of ${engines.length} Operational` : 'No Engines Registered'}
          icon={Plane}
          hasData={true}
        />
        <MetricCard
          title="Max Flight Ceiling"
          value={missions.length > 0 ? Math.max(...missions.map((m) => m.altitude || 0)) : 0}
          unit="m"
          status="normal"
          nominalRange="Standard Rotax 914 F Ceiling"
          icon={Mountain}
          hasData={missions.length > 0}
        />
        <MetricCard
          title="Fleet Readiness"
          value={readinessValue}
          unit={readinessUnit}
          status={readinessStatus}
          nominalRange={readinessRange}
          icon={readinessStatus === 'critical' ? AlertCircle : ShieldCheck}
          hasData={true}
        />
      </div>

      {/* Missions Table Card */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          <div>
            <h3 className="font-display" style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: 700 }}>
              Scheduled & Historical Mission Sorties
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Operational flight envelopes and telemetry-correlated missions
            </p>
          </div>
          <span className="badge badge-copper font-mono">
            {missions.length} REGISTERED
          </span>
        </div>

        <div className="data-table-container" style={{ border: 'none', borderRadius: '0', boxShadow: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Mission ID</th>
                <th>Engine ID</th>
                <th>Mission Profile</th>
                <th>Altitude</th>
                <th>Payload Spec</th>
                <th>Atmosphere / Weather</th>
                <th>Status</th>
                <th>Departure (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {missions.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-dim)' }}>
                    No missions created yet. Click "Create Sortie" above to register an operational flight envelope.
                  </td>
                </tr>
              ) : (
                missions.map((m) => (
                  <tr key={m.mission_id || m.id}>
                    <td style={{ color: 'var(--accent-copper)', fontWeight: 700 }}>
                      {m.mission_id}
                    </td>
                    <td style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                      {m.engine_id}
                    </td>
                    <td style={{ color: 'var(--text-main)' }}>
                      {m.mission_type}
                    </td>
                    <td>
                      {m.altitude != null ? `${m.altitude} m` : 'N/A'}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {m.payload || 'Standard Avionics'}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {m.environment || 'Standard ISA'}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(m.status)}`}>
                        {m.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {m.start_time ? new Date(m.start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Pending'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Sortie Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={20} color="var(--accent-copper)" />
                <h3 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Plan UAV Mission Sortie
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCreateModal(false)}
                style={{ padding: '0.25rem 0.5rem' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateMission}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Sortie Identifier</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Auto-generated if blank (e.g. MSN-2026-002)"
                    value={missionForm.mission_id}
                    onChange={(e) => setMissionForm({ ...missionForm, mission_id: e.target.value })}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
                    Leave blank to auto-generate unique sequential ID
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned Powertrain</label>
                  <select
                    className="form-select"
                    value={missionForm.engine_id}
                    onChange={(e) => setMissionForm({ ...missionForm, engine_id: e.target.value })}
                    required
                  >
                    <option value="">Select Engine</option>
                    {engines.map((eng) => (
                      <option key={eng.engine_id} value={eng.engine_id}>
                        {eng.engine_id} ({eng.aircraft_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Mission Profile</label>
                  <input
                    type="text"
                    className="form-input"
                    value={missionForm.mission_type}
                    onChange={(e) => setMissionForm({ ...missionForm, mission_type: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Planned Departure (Local)</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={missionForm.start_time}
                    onChange={(e) => setMissionForm({ ...missionForm, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cruise Altitude (m)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={missionForm.altitude}
                    onChange={(e) => setMissionForm({ ...missionForm, altitude: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Payload Specification</label>
                  <input
                    type="text"
                    className="form-input"
                    value={missionForm.payload}
                    onChange={(e) => setMissionForm({ ...missionForm, payload: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Operating Atmosphere / Environment</label>
                  <input
                    type="text"
                    className="form-input"
                    value={missionForm.environment}
                    onChange={(e) => setMissionForm({ ...missionForm, environment: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Register Sortie Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
