import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, AlertTriangle, Pill, Phone, Activity } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Spinner } from '../../components/ui';
import { doctorAPI } from '../../services/api';

export default function PatientViewPage() {
  const { grantId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const res = await doctorAPI.viewPatientProfile(grantId);
    if (res.success) {
      setData(res.data);
    } else {
      setError(res.error || 'Failed to load patient profile');
    }
    setLoading(false);
  }, [grantId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  if (loading) return <DashboardLayout title="Patient Profile"><div style={{ textAlign: 'center', padding: 'var(--space-16)' }}><Spinner size={32} /></div></DashboardLayout>;
  if (error) return (
    <DashboardLayout title="Patient Profile">
      <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
        <p style={{ color: 'var(--color-danger-500)', marginBottom: 'var(--space-4)' }}>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate('/doctor/dashboard')}>Back to Dashboard</button>
      </div></div>
    </DashboardLayout>
  );

  const patient = data?.patient || {};
  const grant = data?.grant || {};

  const InfoRow = ({ label, value }) => value ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-light)', fontSize: 'var(--font-size-sm)' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  ) : null;

  const ListSection = ({ title, items, icon: Icon, color }) => items?.length > 0 ? (
    <div className="card" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
      <div className="card-header"><h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Icon size={16} style={{ color }} />{title}</h3></div>
      <div className="card-body">
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {items.map((item, i) => (
            <li key={i} style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-2)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              {typeof item === 'string' ? item : `${item.name || ''} ${item.dosage || ''} ${item.frequency || ''}`.trim()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  ) : null;

  return (
    <DashboardLayout title="Patient Profile">
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', width: isMobile ? '100%' : 'auto' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/doctor/dashboard')}><ArrowLeft size={20} /></button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: isMobile ? 'var(--font-size-xl)' : 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>{patient.name || 'Patient'}</h1>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{patient.email} · Grant: <code>{grant.grantId}</code></p>
          </div>
        </div>
        <div style={{ textAlign: isMobile ? 'left' : 'right', width: isMobile ? '100%' : 'auto', paddingLeft: isMobile ? '44px' : 0 }}>
          <span className="badge badge-info">{grant.scope}</span>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>
            Expires {new Date(grant.expiresAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Basic Info */}
        <div className="card">
          <div className="card-header"><h3>Basic Information</h3></div>
          <div className="card-body">
            <InfoRow label="Date of Birth" value={patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : null} />
            <InfoRow label="Gender" value={patient.gender} />
            <InfoRow label="Blood Group" value={patient.bloodGroup} />
            <InfoRow label="Height" value={patient.heightCm ? `${patient.heightCm} cm` : null} />
            <InfoRow label="Weight" value={patient.weightKg ? `${patient.weightKg} kg` : null} />
            <InfoRow label="Phone" value={patient.phoneNumber} />
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="card" style={{ borderLeftColor: '#ef4444', borderLeftWidth: 3 }}>
          <div className="card-header"><h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Phone size={16} style={{ color: '#ef4444' }} />Emergency Contact</h3></div>
          <div className="card-body">
            <InfoRow label="Name" value={patient.emergencyContact?.name} />
            <InfoRow label="Relation" value={patient.emergencyContact?.relation} />
            <InfoRow label="Phone" value={patient.emergencyContact?.phone} />
          </div>
        </div>
      </div>

      {/* Medical Lists */}
      <div className="grid-2" style={{ marginTop: 'var(--space-4)' }}>
        <ListSection title="Allergies" items={patient.allergies} icon={AlertTriangle} color="#f59e0b" />
        <ListSection title="Chronic Conditions" items={patient.chronicConditions} icon={Heart} color="#ef4444" />
        <ListSection title="Current Medications" items={patient.currentMedications} icon={Pill} color="#3b82f6" />
        <ListSection title="Critical Alerts" items={patient.criticalAlerts} icon={AlertTriangle} color="#dc2626" />
      </div>

      {patient.pastSurgeries?.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <ListSection title="Past Surgeries" items={patient.pastSurgeries} icon={Activity} color="#64748b" />
        </div>
      )}
    </DashboardLayout>
  );
}
