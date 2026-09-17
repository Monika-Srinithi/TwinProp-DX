import React from 'react';

export default function MetricCard({
  title,
  value,
  unit,
  status = 'normal',
  nominalRange,
  icon: Icon,
  hasData = true,
  subtitle,
}) {
  const getStatusColor = () => {
    if (!hasData) return 'var(--text-dim)';
    switch (status) {
      case 'active':
      case 'normal':
        return 'var(--status-active)';
      case 'warning':
        return 'var(--status-warning)';
      case 'alert':
      case 'critical':
        return 'var(--status-error)';
      case 'inactive':
        return 'var(--text-muted)';
      default:
        return 'var(--accent-copper)';
    }
  };

  const getStatusBg = () => {
    if (status === 'critical' || status === 'alert') return 'var(--status-error-subtle)';
    if (status === 'warning') return 'var(--status-warning-subtle)';
    return 'transparent';
  };

  return (
    <div
      className="card card-interactive"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        backgroundColor: getStatusBg() !== 'transparent' ? getStatusBg() : 'var(--bg-card)',
        borderColor: status === 'critical' ? 'var(--status-error-border)' : status === 'warning' ? 'var(--status-warning-border)' : 'var(--border-color)',
        padding: '1.15rem'
      }}
    >
      <div className="card-header" style={{ marginBottom: '0.4rem' }}>
        <span style={{
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-muted)',
          fontWeight: 700,
          fontFamily: 'var(--font-display)'
        }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: 'var(--accent-copper-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={16} color="var(--accent-copper)" />
          </div>
        )}
      </div>

      <div style={{ margin: '0.4rem 0 0.6rem' }}>
        {hasData ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span
              className="font-mono"
              style={{
                fontSize: '1.85rem',
                fontWeight: 700,
                color: getStatusColor(),
                lineHeight: 1.1,
                letterSpacing: '-0.02em'
              }}
            >
              {typeof value === 'number' ? value.toFixed(1) : value}
            </span>
            {unit && (
              <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {unit}
              </span>
            )}
          </div>
        ) : (
          <div style={{
            fontSize: '0.825rem',
            color: 'var(--text-dim)',
            fontStyle: 'italic',
            padding: '0.4rem 0'
          }}>
            No live telemetry available
          </div>
        )}
        {subtitle && (
          <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>
            {subtitle}
          </span>
        )}
      </div>

      <div style={{
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '0.5rem',
        marginTop: '0.2rem',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.725rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)'
      }}>
        <span style={{ color: 'var(--text-dim)' }}>Target / Nominal:</span>
        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{nominalRange || 'N/A'}</span>
      </div>
    </div>
  );
}
