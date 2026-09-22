import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  History,
  Activity,
  AlertTriangle,
  Flame,
  Wind,
  Droplet,
  Zap,
  Gauge,
  Clock,
  Layers,
  Wrench,
  ShieldAlert,
  Info,
  CheckCircle2,
  Calendar,
  Crosshair,
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
  ReferenceLine,
} from 'recharts';
import MetricCard from '../components/MetricCard';
import { useTheme } from '../context/ThemeContext';
import {
  getReplayMissions,
  getMissionReplay,
} from '../services/api';

export default function MissionReplay() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [missions, setMissions] = useState([]);
  const [selectedMissionId, setSelectedMissionId] = useState('');
  const [replayPackage, setReplayPackage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Replay playback engine state: single source of truth currentFrameIndex
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1.0); // 0.5, 1.0, 2.0, 5.0, 10.0
  const [selectedFaultEvent, setSelectedFaultEvent] = useState(null);

  const timerRef = useRef(null);

  // 1. Fetch available missions on mount
  useEffect(() => {
    const fetchMissions = async () => {
      try {
        setError('');
        const data = await getReplayMissions();
        setMissions(data);
        if (data.length > 0 && !selectedMissionId) {
          setSelectedMissionId(data[0].mission_id);
        }
      } catch (err) {
        setError('Failed to retrieve mission sorties list from backend.');
      } finally {
        setLoading(false);
      }
    };
    fetchMissions();
  }, []);

  // 2. Fetch full mission replay package when selectedMissionId changes
  useEffect(() => {
    if (!selectedMissionId) return;
    const loadMissionData = async () => {
      setLoading(true);
      setIsPlaying(false);
      setCurrentFrameIndex(0);
      setSelectedFaultEvent(null);
      try {
        setError('');
        const pkg = await getMissionReplay(selectedMissionId);
        setReplayPackage(pkg);
        if (pkg.frames.length > 0 && pkg.frames[0].fault) {
          setSelectedFaultEvent(pkg.frames[0].fault);
        }
      } catch (err) {
        setError(`Failed to load replay package: ${err.message}`);
        setReplayPackage(null);
      } finally {
        setLoading(false);
      }
    };
    loadMissionData();
  }, [selectedMissionId]);

  const frames = replayPackage?.frames || [];
  const totalFrames = frames.length;
  const currentFrame = frames[currentFrameIndex] || null;

  // 3. Playback interval timer: drives single source of truth currentFrameIndex
  useEffect(() => {
    if (!isPlaying || totalFrames === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.max(80, Math.round(1000 / playSpeed));
    timerRef.current = setInterval(() => {
      setCurrentFrameIndex((prevIndex) => {
        if (prevIndex >= totalFrames - 1) {
          setIsPlaying(false);
          return prevIndex;
        }
        return prevIndex + 1;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playSpeed, totalFrames]);

  // Update selected fault event when current frame has a fault
  useEffect(() => {
    if (currentFrame?.fault) {
      setSelectedFaultEvent(currentFrame.fault);
    }
  }, [currentFrameIndex, currentFrame]);

  // Playback control actions
  const handlePlayPause = () => {
    if (currentFrameIndex >= totalFrames - 1 && !isPlaying) {
      setCurrentFrameIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrameIndex(0);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setCurrentFrameIndex((prev) => Math.min(totalFrames - 1, prev + 1));
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    setCurrentFrameIndex((prev) => Math.max(0, prev - 1));
  };

  const handleScrubberChange = (e) => {
    setIsPlaying(false);
    setCurrentFrameIndex(Number(e.target.value));
  };

  const handleJumpToFaultMarker = (marker) => {
    setIsPlaying(false);
    setCurrentFrameIndex(marker.frame_index);
    if (frames[marker.frame_index]?.fault) {
      setSelectedFaultEvent(frames[marker.frame_index].fault);
    }
  };

  // Prepare chart time-series data
  const chartData = frames.map((f, idx) => ({
    frameIndex: idx,
    elapsed: Math.round(f.elapsed_seconds),
    timeStr: new Date(f.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    rpm: f.telemetry.rpm,
    throttle: f.telemetry.throttle,
    cht: f.telemetry.cht,
    egt: f.telemetry.egt,
    oilPressure: f.telemetry.oil_pressure,
    oilTemp: f.telemetry.oil_temperature,
    vibration: f.telemetry.vibration,
    powerKw: f.digital_twin.power_kw,
    mapInHg: f.digital_twin.map_inhg,
  }));

  const tele = currentFrame?.telemetry;
  const twin = currentFrame?.digital_twin;
  const rul = currentFrame?.rul_state;
  const summary = replayPackage?.summary;
  const markers = replayPackage?.fault_markers || [];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem', animation: 'pageFadeIn 0.35s ease' }}>
      {/* Top Header & Mission Selector */}
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
              Flight Data Recorder (FDR) & Mission Replay
            </h2>
            <span className="badge badge-phase font-mono">PHASE 5 PROTOTYPE</span>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Chronological Telemetry Playback • Fault Event Timeline Pins • Synchronized Digital Twin & RUL Tracking
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label className="form-label" style={{ margin: 0, fontSize: '0.78rem' }}>Select Mission:</label>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '240px' }}
              value={selectedMissionId}
              onChange={(e) => setSelectedMissionId(e.target.value)}
              disabled={missions.length === 0}
            >
              {missions.length === 0 ? (
                <option value="">No Missions Available</option>
              ) : (
                missions.map((m) => (
                  <option key={m.mission_id} value={m.mission_id}>
                    {m.mission_id} ({m.engine_id}) - {m.telemetry_count} frames
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Academic Prototype Notice */}
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
          <strong style={{ color: 'var(--text-main)' }}>FLIGHT DATA RECORDER REPLAY:</strong> Replays authentic recorded sortie telemetry frames and logged fault events from database history. Frame provenance is strictly distinguished between authentic recorded telemetry and simulated fault injection tests.
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

      {/* Mission Sortie Metadata Strip */}
      {replayPackage && (
        <div className="card" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          fontSize: '0.8rem',
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Sortie / Engine</span>
            <span className="font-mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
              {replayPackage.mission_id} • {replayPackage.engine_id}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Mission Profile</span>
            <span style={{ color: 'var(--accent-copper)', fontWeight: 600 }}>
              {replayPackage.mission_type}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Recorded Frames / Duration</span>
            <span className="font-mono" style={{ color: 'var(--text-main)' }}>
              {summary?.total_frames || 0} frames ({summary?.flight_duration_seconds || 0}s)
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Peak RPM / CHT</span>
            <span className="font-mono" style={{ color: 'var(--text-main)' }}>
              {summary?.peak_rpm || 0} RPM • {summary?.peak_cht || 0}°C
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Anomaly Events</span>
            <span className="font-mono" style={{ color: markers.length > 0 ? 'var(--status-warning)' : 'var(--status-active)', fontWeight: 600 }}>
              {markers.length} EVENTS PINNED
            </span>
          </div>
        </div>
      )}

      {/* Master Replay Control Bar & Timeline Scrubber */}
      <div className="card" style={{
        marginBottom: '1.5rem',
        padding: '1.25rem 1.5rem',
      }}>
        {/* Playback Controls & Frame Status */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}>
          {/* Transport Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleReset}
              title="Reset to beginning"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleStepBackward}
              disabled={currentFrameIndex <= 0}
              title="Step 1 frame backward"
            >
              <SkipBack size={14} />
            </button>
            <button
              type="button"
              className={`btn btn-sm ${isPlaying ? 'btn-warning' : 'btn-primary'}`}
              style={{ minWidth: '95px' }}
              onClick={handlePlayPause}
              disabled={totalFrames === 0}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleStepForward}
              disabled={currentFrameIndex >= totalFrames - 1}
              title="Step 1 frame forward"
            >
              <SkipForward size={14} />
            </button>
          </div>

          {/* Playback Speed Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Speed:</span>
            {[0.5, 1.0, 2.0, 5.0, 10.0].map((spd) => (
              <button
                key={spd}
                type="button"
                className={`btn btn-sm font-mono ${playSpeed === spd ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
                onClick={() => setPlaySpeed(spd)}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Data Provenance Badge & Time Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {currentFrame?.is_simulated ? (
              <span className="badge font-mono" style={{ backgroundColor: isDark ? 'rgba(168, 85, 247, 0.18)' : 'rgba(168, 85, 247, 0.12)', color: '#a855f7', border: '1px solid #a855f7' }}>
                SIMULATED INJECTION
              </span>
            ) : (
              <span className="badge font-mono badge-operational">
                RECORDED TELEMETRY
              </span>
            )}
            <span className="badge font-mono" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
              FRAME: {totalFrames > 0 ? currentFrameIndex + 1 : 0} / {totalFrames}
            </span>
            <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--accent-copper)', fontWeight: 600 }}>
              T+ {currentFrame ? `${currentFrame.elapsed_seconds.toFixed(1)}s` : '0.0s'}
            </span>
          </div>
        </div>

        {/* Scrubber Slider & Timeline Fault Markers Track */}
        <div style={{ position: 'relative', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="range"
            min={0}
            max={Math.max(0, totalFrames - 1)}
            value={currentFrameIndex}
            onChange={handleScrubberChange}
            disabled={totalFrames <= 1}
            style={{
              width: '100%',
              height: '8px',
              accentColor: 'var(--accent-copper)',
              cursor: 'pointer',
            }}
          />

          {/* Visual Event Markers overlay on timeline track */}
          {markers.length > 0 && totalFrames > 1 && (
            <div style={{
              position: 'relative',
              width: '100%',
              height: '24px',
              marginTop: '4px',
            }}>
              {markers.map((m, idx) => {
                const leftPct = (m.frame_index / (totalFrames - 1)) * 100;
                const isCrit = m.severity === 'CRITICAL';
                return (
                  <button
                    key={`marker-${idx}`}
                    type="button"
                    onClick={() => handleJumpToFaultMarker(m)}
                    style={{
                      position: 'absolute',
                      left: `calc(${leftPct}% - 7px)`,
                      top: '2px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: isCrit ? 'var(--status-error)' : 'var(--status-warning)',
                      border: '2px solid var(--bg-card)',
                      boxShadow: '0 0 6px rgba(0,0,0,0.3)',
                      cursor: 'pointer',
                      padding: 0,
                      zIndex: 10,
                    }}
                    title={`Jump to Fault: ${m.fault_code} (${m.severity}) at T+${m.elapsed_seconds.toFixed(0)}s`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Synchronized Replay Gauges Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <MetricCard
          title="Replay Engine Speed"
          value={tele ? `${tele.rpm.toFixed(0)} RPM` : '0 RPM'}
          status={tele?.rpm > 5800 ? 'warning' : tele?.rpm > 4500 ? 'normal' : 'inactive'}
          nominalRange="4500 - 5800 RPM"
          icon={Gauge}
          hasData={!!currentFrame}
        />
        <MetricCard
          title="Replay CHT / EGT"
          value={tele ? `${tele.cht.toFixed(1)}°C / ${tele.egt.toFixed(0)}°C` : 'N/A'}
          status={tele?.cht > 135 ? 'critical' : 'normal'}
          nominalRange="CHT < 135°C • EGT < 850°C"
          icon={Flame}
          hasData={!!currentFrame}
        />
        <MetricCard
          title="Twin Shaft Power"
          value={twin ? `${twin.power_kw.toFixed(1)} kW (${twin.power_hp.toFixed(1)} HP)` : '0 kW'}
          status={twin?.power_kw > 0 ? 'normal' : 'inactive'}
          nominalRange={twin ? `${twin.operating_regime.replace(/_/g, ' ')}` : 'Power Output'}
          icon={Zap}
          hasData={!!currentFrame}
        />
        <MetricCard
          title="Twin MAP / TCU"
          value={twin?.map_inhg != null ? `${twin.map_inhg.toFixed(1)} inHg` : 'N/A'}
          status={twin?.map_inhg > 39.9 ? 'critical' : 'normal'}
          nominalRange={twin ? `${twin.tcu_state.replace(/_/g, ' ')}` : 'Boost State'}
          icon={Wind}
          hasData={!!currentFrame}
        />
        <MetricCard
          title="Projected RUL"
          value={rul ? `${rul.estimated_rul_hours.toFixed(0)} HRS` : 'N/A'}
          status={rul?.prognostic_status === 'CRITICAL_INSPECTION_MANDATORY' ? 'critical' : 'normal'}
          nominalRange={rul ? `Burn: ${rul.damage_rate_multiplier.toFixed(2)}x • ${(rul.prognostic_confidence * 100).toFixed(0)}% Conf` : 'Advisory Estimate'}
          icon={Clock}
          hasData={!!currentFrame}
        />
      </div>

      {/* Synchronized Multi-Channel Historical Flight Charts with Cursor Indicator */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(520px, 1fr))',
        gap: '1.5rem',
        marginBottom: '1.5rem',
      }}>
        {/* Chart 1: RPM & Throttle Profile */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '0.75rem' }}>
            <div>
              <h3 className="font-display" style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 600 }}>
                Engine Speed (RPM) & Commanded Throttle (%)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Power demand vs propulsion response across sortie timeline
              </p>
            </div>
            <span className="badge font-mono badge-phase">
              CURSOR: T+{currentFrame ? `${currentFrame.elapsed_seconds.toFixed(0)}s` : '0s'}
            </span>
          </div>

          <div style={{ height: '260px', width: '100%' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "var(--border-color)" : "rgba(0,0,0,0.06)"} vertical={false} />
                  <XAxis dataKey="elapsed" stroke={isDark ? "var(--border-color)" : "rgba(0,0,0,0.15)"} tick={{ fill: isDark ? 'var(--text-muted)' : 'var(--text-dim)', fontSize: 10 }} unit="s" />
                  <YAxis yAxisId="rpm" domain={[0, 6500]} stroke={isDark ? "var(--border-color)" : "rgba(0,0,0,0.15)"} tick={{ fill: 'var(--accent-copper)', fontSize: 10 }} unit=" RPM" />
                  <YAxis yAxisId="thr" orientation="right" domain={[0, 100]} stroke={isDark ? "var(--border-color)" : "rgba(0,0,0,0.15)"} tick={{ fill: 'var(--status-warning)', fontSize: 10 }} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '10px', boxShadow: 'var(--card-shadow)', color: 'var(--text-main)', fontSize: '0.75rem' }} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Line yAxisId="rpm" type="monotone" dataKey="rpm" name="Engine RPM" stroke="var(--accent-copper)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line yAxisId="thr" type="monotone" dataKey="throttle" name="Throttle %" stroke="var(--status-warning)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  {/* Moving Cursor Reference Line */}
                  <ReferenceLine
                    yAxisId="rpm"
                    x={chartData[currentFrameIndex]?.elapsed}
                    stroke="var(--status-error)"
                    strokeWidth={2}
                    label={{ value: 'REPLAY', fill: 'var(--status-error)', fontSize: 9, position: 'insideTopLeft' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                No telemetry frames.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Cylinder Head Temp (CHT) & Exhaust Gas Temp (EGT) */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '0.75rem' }}>
            <div>
              <h3 className="font-display" style={{ fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 600 }}>
                Thermodynamic Cycle: CHT & EGT (°C)
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Combustion thermal dissipation and cylinder thermal stress
              </p>
            </div>
            <span className="badge font-mono badge-warning">
              THERMAL TRACE
            </span>
          </div>

          <div style={{ height: '260px', width: '100%' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "var(--border-color)" : "rgba(0,0,0,0.06)"} vertical={false} />
                  <XAxis dataKey="elapsed" stroke={isDark ? "var(--border-color)" : "rgba(0,0,0,0.15)"} tick={{ fill: isDark ? 'var(--text-muted)' : 'var(--text-dim)', fontSize: 10 }} unit="s" />
                  <YAxis yAxisId="cht" domain={[50, 160]} stroke={isDark ? "var(--border-color)" : "rgba(0,0,0,0.15)"} tick={{ fill: 'var(--status-error)', fontSize: 10 }} unit="°C" />
                  <YAxis yAxisId="egt" orientation="right" domain={[600, 950]} stroke={isDark ? "var(--border-color)" : "rgba(0,0,0,0.15)"} tick={{ fill: '#818cf8', fontSize: 10 }} unit="°C" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '10px', boxShadow: 'var(--card-shadow)', color: 'var(--text-main)', fontSize: '0.75rem' }} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                  <Line yAxisId="cht" type="monotone" dataKey="cht" name="CHT (°C)" stroke="var(--status-error)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line yAxisId="egt" type="monotone" dataKey="egt" name="EGT (°C)" stroke="#818cf8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  {/* CHT Warning Threshold line */}
                  <ReferenceLine yAxisId="cht" y={135} stroke="var(--status-error)" strokeDasharray="3 3" />
                  {/* Moving Cursor Reference Line */}
                  <ReferenceLine
                    yAxisId="cht"
                    x={chartData[currentFrameIndex]?.elapsed}
                    stroke="var(--status-error)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                No telemetry frames.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Synchronized Multi-Subsystem Inspector Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem',
      }}>
        {/* Subsystem 1: Digital Twin State at Current Frame */}
        <div className="card" style={{ borderTop: '3px solid var(--accent-copper)' }}>
          <div className="card-header" style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="var(--accent-copper)" />
              <h3 className="font-display" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Synchronized Digital Twin
              </h3>
            </div>
            <span className="badge font-mono badge-phase" style={{ fontSize: '0.7rem' }}>
              {twin?.twin_fidelity_score != null ? `${twin.twin_fidelity_score.toFixed(0)}% FIDELITY` : 'N/A'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.825rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Shaft Power:</span>
              <span className="font-mono" style={{ color: 'var(--accent-copper)', fontWeight: 600 }}>
                {twin ? `${twin.power_kw.toFixed(1)} kW (${twin.power_hp.toFixed(1)} HP)` : '0 kW'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>TCU Boost Target:</span>
              <span className="font-mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                {twin?.map_inhg != null && twin?.map_bar != null
                  ? `${twin.map_inhg.toFixed(1)} inHg (${twin.map_bar.toFixed(2)} bar)`
                  : 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Wastegate Position:</span>
              <span className="font-mono" style={{ color: 'var(--text-main)' }}>
                {twin ? `${twin.wastegate_position_pct.toFixed(0)}% Open` : '100%'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>CHT Thermal Headroom:</span>
              <span className="font-mono" style={{ color: twin?.cht_thermal_headroom_c < 10 ? 'var(--status-error)' : 'var(--status-active)', fontWeight: 600 }}>
                {twin ? `+${twin.cht_thermal_headroom_c.toFixed(1)}°C` : 'N/A'} (135°C limit)
              </span>
            </div>
          </div>
        </div>

        {/* Subsystem 2: Synchronized Prognostic RUL State at Current Frame */}
        <div className="card" style={{ borderTop: '3px solid #818cf8' }}>
          <div className="card-header" style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="#818cf8" />
              <h3 className="font-display" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Synchronized Prognostic RUL
              </h3>
            </div>
            <span className={`badge font-mono ${rul?.prognostic_status === 'CRITICAL_INSPECTION_MANDATORY' ? 'badge-critical' : 'badge-operational'}`} style={{ fontSize: '0.7rem' }}>
              {rul ? rul.prognostic_status.replace(/_/g, ' ') : 'NOMINAL'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.825rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Projected RUL:</span>
              <span className="font-mono" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                {rul ? `${rul.estimated_rul_hours.toFixed(0)} Hours` : 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>90% Confidence Interval:</span>
              <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                {rul ? `[${rul.confidence_interval_90_lower.toFixed(0)} - ${rul.confidence_interval_90_upper.toFixed(0)}] h` : 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Prognostic Confidence:</span>
              <span className="font-mono" style={{ color: 'var(--accent-copper)', fontWeight: 600 }}>
                {rul ? `${(rul.prognostic_confidence * 100).toFixed(0)}%` : 'N/A'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Damage Acceleration:</span>
              <span className="font-mono" style={{ color: rul?.damage_rate_multiplier > 1.8 ? 'var(--status-error)' : 'var(--accent-copper)', fontWeight: 600 }}>
                {rul ? `${rul.damage_rate_multiplier.toFixed(2)}x` : '1.00x'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Dominant Degrading Part:</span>
              <span className="font-mono" style={{ color: 'var(--text-main)' }}>
                {rul?.dominant_degrading_subsystem || 'Cylinder Head'}
              </span>
            </div>
          </div>
        </div>

        {/* Subsystem 3: Fault Event Dossier Inspector */}
        <div className="card" style={{
          borderTop: `3px solid ${selectedFaultEvent?.severity === 'CRITICAL' ? 'var(--status-error)' : 'var(--status-warning)'}`,
        }}>
          <div className="card-header" style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={18} color={selectedFaultEvent?.severity === 'CRITICAL' ? 'var(--status-error)' : 'var(--status-warning)'} />
              <h3 className="font-display" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Timeline Event Inspector
              </h3>
            </div>
            {selectedFaultEvent && (
              <span className="badge font-mono" style={{
                backgroundColor: selectedFaultEvent.is_simulated
                  ? (isDark ? 'rgba(168, 85, 247, 0.18)' : 'rgba(168, 85, 247, 0.12)')
                  : (isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.12)'),
                color: selectedFaultEvent.is_simulated ? '#a855f7' : 'var(--status-warning)',
                fontSize: '0.7rem'
              }}>
                {selectedFaultEvent.is_simulated ? 'SIMULATED' : 'LIVE ALERT'}
              </span>
            )}
          </div>

          {selectedFaultEvent ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.825rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Fault Code:</span>
                <span className="font-mono" style={{ color: 'var(--status-warning)', fontWeight: 700 }}>
                  {selectedFaultEvent.fault_code} ({selectedFaultEvent.severity})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Classification:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>
                  {selectedFaultEvent.fault_type.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Root Cause:</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.45', margin: 0 }}>
                  {selectedFaultEvent.root_cause || selectedFaultEvent.description}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.825rem' }}>
              No fault event active at current frame. Click a pin on the timeline scrubber to inspect.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
