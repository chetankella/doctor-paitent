import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, FileText, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { StatCard, EmptyState, Spinner, Pagination } from '../../components/ui';
import { doctorAPI } from '../../services/api';

export default function DoctorDashboardPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    const res = await doctorAPI.listPatients(page);
    if (res.success) {
      setPatients(res.data?.patients || []);
      setTotal(res.data?.pagination?.total || 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  return (
    <DashboardLayout title="Doctor Dashboard">
      <div className="page-header">
        <h1>Doctor Dashboard</h1>
        <p>View and manage your patients and access history</p>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-6)' }}>
        <StatCard icon={Users} iconColor="blue" value={total} label="Active Patients" />
        <motion.div
          className="card" style={{ cursor: 'pointer' }}
          whileHover={{ scale: 1.01 }}
          onClick={() => navigate('/doctor/request-access')}
        >
          <div className="stat-card">
            <div className="stat-icon stat-icon-orange"><Search /></div>
            <div>
              <div className="stat-value" style={{ fontSize: 'var(--font-size-base)' }}>Request Access</div>
              <div className="stat-label">Search by patient email</div>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="card" style={{ cursor: 'pointer' }}
          whileHover={{ scale: 1.01 }}
          onClick={() => navigate('/doctor/access-logs')}
        >
          <div className="stat-card">
            <div className="stat-icon stat-icon-green"><Activity /></div>
            <div>
              <div className="stat-value" style={{ fontSize: 'var(--font-size-base)' }}>Access History</div>
              <div className="stat-label">View your access logs</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Patient List */}
      <div className="card">
        <div className="card-header"><h3>My Patients</h3></div>
        {loading ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-10)' }}><Spinner size={28} /></div>
        ) : patients.length === 0 ? (
          <EmptyState icon={Users} title="No patients yet" description="Request access to a patient to get started"
            action={<button className="btn btn-primary" onClick={() => navigate('/doctor/request-access')}><Search size={16} /> Request Access</button>} />
        ) : (
          <>
            {isMobile ? (
              <div className="mobile-card-list">
                {patients.map((p) => (
                  <div key={p.grantId} className="mobile-card-item">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{p.patientName || '—'}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{p.patientEmail}</div>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Scope</span>
                      <span className="badge badge-info">{p.scope}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Source</span>
                      <span className="badge badge-neutral">{p.source}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Granted</span>
                      <span className="mobile-card-value">{new Date(p.grantedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Expires</span>
                      <span className="mobile-card-value">{new Date(p.expiresAt).toLocaleDateString()}</span>
                    </div>
                    <div className="mobile-card-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/doctor/patients/${p.grantId}`)}>
                        View Profile
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/doctor/patients/${p.grantId}/notes`)}>
                        <FileText size={14} /> Notes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="data-table-responsive">
                <table className="data-table">
                  <thead><tr><th>Patient</th><th>Scope</th><th>Source</th><th>Granted</th><th>Expires</th><th>Actions</th></tr></thead>
                  <tbody>
                    {patients.map(p => (
                      <tr key={p.grantId}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{p.patientName || '—'}</div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{p.patientEmail}</div>
                        </td>
                        <td><span className="badge badge-info">{p.scope}</span></td>
                        <td><span className="badge badge-neutral">{p.source}</span></td>
                        <td style={{ fontSize: 'var(--font-size-xs)' }}>{new Date(p.grantedAt).toLocaleDateString()}</td>
                        <td style={{ fontSize: 'var(--font-size-xs)' }}>{new Date(p.expiresAt).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/doctor/patients/${p.grantId}`)}>
                              View Profile
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/doctor/patients/${p.grantId}/notes`)}>
                              <FileText size={14} /> Notes
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
