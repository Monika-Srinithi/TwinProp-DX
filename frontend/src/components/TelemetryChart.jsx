import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Activity } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function TelemetryChart({ telemetryData = [] }) {
  const hasData = telemetryData && telemetryData.length > 0;
  const { isDark } = useTheme();

  // Metric channel visibility state
  const [channels, setChannels] = useState({
    rpm: true,
    cht: true,
    egt: true,
    oil: true,
    vib: true,
  });

  const toggleChannel = (key) => {
    setChannels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Format data for chart (chronological order)
  const chartData = [...telemetryData]
    .reverse()
    .map((item) => ({
      time: new Date(item.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      RPM: item.rpm != null ? Number(item.rpm) : null,
      CHT: item.cht != null ? Number(item.cht) : null,
      EGT: item.egt != null ? Number(item.egt) : null,
      OilPressure: item.oil_pressure != null ? Number(item.oil_pressure) : null,
      Vibration: item.vibration != null ? Number(item.vibration) : null,
    }));

  const gridColor = isDark ? '#282c37' : '#e5e7eb';
  const axisColor = isDark ? '#6b7280' : '#9ca3af';
  const tooltipBg = isDark ? '#171920' : '#ffffff';
  const tooltipBorder = isDark ? '#3e4455' : '#cbd5e1';

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 className="font-display" style={{ fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 700 }}>
            Real-Time Telemetry Dynamics
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            High-frequency multi-channel sensor telemetry (RPM, CHT, EGT, Oil Pressure, Vibration)
          </p>
        </div>

        {/* Channel Filter Chips & Packet Count */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            <button
              type="button"
              onClick={() => toggleChannel('rpm')}
              className="badge font-mono"
              style={{
                cursor: 'pointer',
                background: channels.rpm ? 'var(--accent-copper-subtle)' : 'transparent',
                color: channels.rpm ? 'var(--accent-copper)' : 'var(--text-dim)',
                border: `1px solid ${channels.rpm ? 'var(--accent-copper-border)' : 'var(--border-color)'}`,
                transition: 'all 0.15s ease',
              }}
              title="Toggle RPM line"
            >
              RPM
            </button>
            <button
              type="button"
              onClick={() => toggleChannel('cht')}
              className="badge font-mono"
              style={{
                cursor: 'pointer',
                background: channels.cht ? 'var(--status-active-subtle)' : 'transparent',
                color: channels.cht ? 'var(--status-active)' : 'var(--text-dim)',
                border: `1px solid ${channels.cht ? 'var(--status-active-border)' : 'var(--border-color)'}`,
                transition: 'all 0.15s ease',
              }}
              title="Toggle CHT line"
            >
              CHT (°C)
            </button>
            <button
              type="button"
              onClick={() => toggleChannel('egt')}
              className="badge font-mono"
              style={{
                cursor: 'pointer',
                background: channels.egt ? 'var(--status-warning-subtle)' : 'transparent',
                color: channels.egt ? 'var(--status-warning)' : 'var(--text-dim)',
                border: `1px solid ${channels.egt ? 'var(--status-warning-border)' : 'var(--border-color)'}`,
                transition: 'all 0.15s ease',
              }}
              title="Toggle EGT line"
            >
              EGT (°C)
            </button>
            <button
              type="button"
              onClick={() => toggleChannel('oil')}
              className="badge font-mono"
              style={{
                cursor: 'pointer',
                background: channels.oil ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                color: channels.oil ? '#6366f1' : 'var(--text-dim)',
                border: `1px solid ${channels.oil ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-color)'}`,
                transition: 'all 0.15s ease',
              }}
              title="Toggle Oil Pressure line"
            >
              Oil (bar)
            </button>
            <button
              type="button"
              onClick={() => toggleChannel('vib')}
              className="badge font-mono"
              style={{
                cursor: 'pointer',
                background: channels.vib ? 'var(--status-error-subtle)' : 'transparent',
                color: channels.vib ? 'var(--status-error)' : 'var(--text-dim)',
                border: `1px solid ${channels.vib ? 'var(--status-error-border)' : 'var(--border-color)'}`,
                transition: 'all 0.15s ease',
              }}
              title="Toggle Vibration line"
            >
              Vib (mm/s)
            </button>
          </div>

          <span className="badge badge-copper font-mono">
            {hasData ? `${chartData.length} PACKETS LOGGED` : 'STREAM READY'}
          </span>
        </div>
      </div>

      <div style={{ height: '340px', width: '100%', marginTop: '0.5rem' }}>
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="time" stroke={axisColor} tick={{ fill: axisColor, fontSize: 11 }} />

              {/* Left Y-Axes: RPM as primary; CHT has dedicated domain and appears if RPM is hidden */}
              <YAxis
                yAxisId="rpm"
                stroke="var(--accent-copper)"
                orientation="left"
                domain={['auto', 'auto']}
                tick={{ fill: 'var(--accent-copper)', fontSize: 11 }}
                hide={!channels.rpm}
              />
              <YAxis
                yAxisId="cht"
                stroke="var(--status-active)"
                orientation="left"
                domain={[50, 160]}
                tick={{ fill: 'var(--status-active)', fontSize: 11 }}
                hide={channels.rpm || !channels.cht}
              />

              {/* Right Y-Axes: EGT (high temp) and Dynamics (Oil/Vib: low range 0-25) */}
              <YAxis
                yAxisId="egt"
                stroke="var(--status-warning)"
                orientation="right"
                domain={[600, 950]}
                tick={{ fill: 'var(--status-warning)', fontSize: 11 }}
                hide={!channels.egt}
              />
              <YAxis
                yAxisId="dynamics"
                stroke="#6366f1"
                orientation="right"
                domain={[0, 25]}
                tick={{ fill: '#6366f1', fontSize: 11 }}
                hide={channels.egt || (!channels.oil && !channels.vib)}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--text-main)',
                  boxShadow: 'var(--shadow-elevation)'
                }}
                formatter={(value, name) => {
                  if (value == null) return ['N/A', name];
                  const num = Number(value).toFixed(1);
                  switch (name) {
                    case 'RPM':
                      return [`${num} RPM`, 'Speed'];
                    case 'CHT (°C)':
                      return [`${num} °C`, 'Cylinder Head'];
                    case 'EGT (°C)':
                      return [`${num} °C`, 'Exhaust Gas'];
                    case 'Oil Press (bar)':
                      return [`${num} bar`, 'Oil Pressure'];
                    case 'Vibration (mm/s)':
                      return [`${num} mm/s`, 'Vibration RMS'];
                    default:
                      return [num, name];
                  }
                }}
              />
              <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />

              {channels.rpm && (
                <Line
                  yAxisId="rpm"
                  type="monotone"
                  dataKey="RPM"
                  stroke="var(--accent-copper)"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  name="RPM"
                  isAnimationActive={false}
                />
              )}
              {channels.cht && (
                <Line
                  yAxisId="cht"
                  type="monotone"
                  dataKey="CHT"
                  stroke="var(--status-active)"
                  strokeWidth={1.5}
                  dot={false}
                  name="CHT (°C)"
                  isAnimationActive={false}
                />
              )}
              {channels.egt && (
                <Line
                  yAxisId="egt"
                  type="monotone"
                  dataKey="EGT"
                  stroke="var(--status-warning)"
                  strokeWidth={1.5}
                  dot={false}
                  name="EGT (°C)"
                  isAnimationActive={false}
                />
              )}
              {channels.oil && (
                <Line
                  yAxisId="dynamics"
                  type="monotone"
                  dataKey="OilPressure"
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  dot={false}
                  name="Oil Press (bar)"
                  isAnimationActive={false}
                />
              )}
              {channels.vib && (
                <Line
                  yAxisId="dynamics"
                  type="monotone"
                  dataKey="Vibration"
                  stroke="var(--status-error)"
                  strokeWidth={1.5}
                  dot={false}
                  name="Vibration (mm/s)"
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed var(--border-color)',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-muted)',
            gap: '0.75rem'
          }}>
            <Activity size={36} color="var(--accent-copper)" style={{ opacity: 0.6 }} />
            <p className="font-mono" style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
              No telemetry packets ingested yet.
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', maxWidth: '400px', textAlign: 'center' }}>
              Submit telemetry through the Engine Monitoring page or POST to <code style={{ color: 'var(--accent-copper)' }}>/api/telemetry</code> to activate live visualization.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
