import React from 'react';
import { Layers, ShieldAlert, Clock, History, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PlaceholderModule({
  title,
  phase,
  description,
  moduleType,
  plannedFeatures = []
}) {
  const getIcon = () => {
    switch (moduleType) {
      case 'digital-twin':
        return <Layers size={48} color="#38bdf8" />;
      case 'fault-diagnosis':
        return <ShieldAlert size={48} color="#f59e0b" />;
      case 'rul':
        return <Clock size={48} color="#10b981" />;
      case 'mission-replay':
        return <History size={48} color="#818cf8" />;
      default:
        return <Layers size={48} color="#38bdf8" />;
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }}>
      <div className="card" style={{
        padding: '3rem 2rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px dashed var(--border-highlight)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(30, 46, 80, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-color)'
        }}>
          {getIcon()}
        </div>

        <span className="badge badge-phase" style={{ marginBottom: '1rem', padding: '0.4rem 0.85rem' }}>
          {phase.toUpperCase()}
        </span>

        <h2 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.75rem' }}>
          {title}
        </h2>

        <p style={{ maxWidth: '650px', color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
          {description}
        </p>

        <div style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '1.25rem',
          textAlign: 'left',
          marginBottom: '2rem'
        }}>
          <h4 className="font-display" style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Planned Architectural Scope:
          </h4>
          <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
            {plannedFeatures.map((feat, idx) => (
              <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--accent-cyan)' }}>›</span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/" className="btn btn-primary">
            <span>Return to Live Dashboard</span>
            <ArrowRight size={14} />
          </Link>
          <Link to="/monitoring" className="btn btn-secondary">
            View Engine Monitoring
          </Link>
        </div>
      </div>
    </div>
  );
}
