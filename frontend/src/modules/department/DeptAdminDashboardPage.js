import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Upload, Stethoscope,
  Clock, CheckCircle, Send, RefreshCw, FileText, X,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Spinner, Skeleton } from '../../components/ui';
import Modal from '../../components/ui/Modal';
import { deptAdminAPI, orgAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const DOCTOR_ROLES = ['OWNER', 'CONSULTANT', 'RESIDENT'];
const DESIGNATIONS = ['Nurse', 'Receptionist', 'Lab Technician', 'Pharmacist', 'Radiologist', 'Ward Boy', 'Billing Staff', 'Admin Staff', 'Other'];

// ─── Metric Card ───
function MetricCard({ icon: Icon, iconColor, value, label, loading }) {
  const colorMap = {
    blue:   { bg: 'rgba(59,130,246,0.1)',  text: '#2563eb',  border: 'rgba(59,130,246,0.2)' },
    purple: { bg: 'rgba(139,92,246,0.1)',  text: '#7c3aed',  border: 'rgba(139,92,246,0.2)' },
    orange: { bg: 'rgba(249,115,22,0.1)',  text: '#ea580c',  border: 'rgba(249,115,22,0.2)' },
    green:  { bg: 'rgba(34,197,94,0.1)',   text: '#16a34a',  border: 'rgba(34,197,94,0.2)' },
  };
  const c = colorMap[iconColor] || colorMap.blue;
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${c.border}`,
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-5)',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: c.bg, color: c.text, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
        <Icon size={20} />
      </div>
      {loading
        ? <Skeleton width="60%" height={24} style={{ marginBottom: 4 }} />
        : <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{value ?? '—'}</div>
      }
      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function DeptAdminDashboardPage() {
  const { user, organizations } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [modalType, setModalType] = useState(null);

  // Form state
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CONSULTANT');
  const [designation, setDesignation] = useState('');
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkResults, setBulkResults] = useState(null);

  // Metrics
  const [metrics, setMetrics] = useState({ doctors: null, staff: null, pendingInvites: null });

  // Resolve orgId from the organizations stored at login
  // Fallback: fetch via API for existing sessions that pre-date the fix
  const orgId = (organizations && organizations.length > 0)
    ? (organizations[0]?.id || organizations[0]?._id)
    : null;

  const [fallbackOrgId, setFallbackOrgId] = useState(null);
  const resolvedOrgId = orgId || fallbackOrgId;

  useEffect(() => {
    if (!orgId) {
      orgAPI.listMine().then(res => {
        if (res.success) {
          const orgs = Array.isArray(res.data) ? res.data : [res.data];
          if (orgs[0]) setFallbackOrgId(orgs[0]._id || orgs[0].id);
        }
      });
    }
  }, [orgId]);

  const loadMetrics = useCallback(async () => {
    if (!resolvedOrgId) return;
    setMetricsLoading(true);
    const res = await orgAPI.getAnalytics(resolvedOrgId);
    if (res.success && res.data) {
      setMetrics({
        doctors: res.data.doctors,
        staff: res.data.staff,
        pendingInvites: res.data.pendingInvites,
      });
    }
    setMetricsLoading(false);
  }, [resolvedOrgId]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const handleCloseModal = () => {
    setModalType(null);
    setEmail('');
    setRole('CONSULTANT');
    setDesignation('');
    setBulkFile(null);
    setBulkResults(null);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Email is required'); return; }
    if (modalType === 'invite-staff' && !designation) { toast.error('Designation is required'); return; }

    setLoading(true);
    let res;
    if (modalType === 'invite-doctor') {
      res = await deptAdminAPI.inviteDoctor(resolvedOrgId, { email, role });
    } else if (modalType === 'invite-staff') {
      res = await deptAdminAPI.inviteStaff(resolvedOrgId, { email, designation });
    }

    if (res?.success) {
      toast.success(`Invitation sent to ${email}`);
      handleCloseModal();
      loadMetrics();
    } else {
      toast.error(res?.error || 'Failed to send invitation');
    }
    setLoading(false);
  };

  const handleBulkInvite = async (e) => {
    e.preventDefault();
    if (!bulkFile) { toast.error('Please select a CSV file'); return; }

    setLoading(true);
    const formData = new FormData();
    formData.append('csv', bulkFile);

    const res = await deptAdminAPI.inviteBulk(resolvedOrgId, formData);
    if (res?.success) {
      const results = res.raw?.data || res.data;
      setBulkResults(Array.isArray(results) ? results : []);
      const successCount = (Array.isArray(results) ? results : []).filter(r => r.success).length;
      const failCount = (Array.isArray(results) ? results : []).length - successCount;
      toast.success(`Bulk invite: ${successCount} sent${failCount ? `, ${failCount} failed` : ''}`);
      loadMetrics();
    } else {
      toast.error(res?.error || 'Bulk invite failed');
    }
    setLoading(false);
  };

  return (
    <DashboardLayout title="Department Admin Dashboard">
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.name || 'Department Admin'}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Manage your department, invite doctors, and onboard staff.
          </p>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={loadMetrics} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── Metrics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {[
          { icon: Stethoscope, iconColor: 'blue', value: metrics.doctors, label: 'Doctors' },
          { icon: Users, iconColor: 'purple', value: metrics.staff, label: 'Staff Members' },
          { icon: Clock, iconColor: 'orange', value: metrics.pendingInvites, label: 'Pending Invites' },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <MetricCard {...m} loading={metricsLoading} />
          </motion.div>
        ))}
      </div>

      {/* ── Quick Actions Card ── */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="card-header">
          <h3>Quick Actions</h3>
        </div>
        <div className="card-body" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setModalType('invite-doctor')}>
            <Stethoscope size={16} /> Invite Doctor
          </button>
          <button className="btn btn-secondary" onClick={() => setModalType('invite-staff')}>
            <Users size={16} /> Invite Staff
          </button>
          <button className="btn btn-secondary" onClick={() => setModalType('bulk-invite')}
            style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-700)', border: '1px solid var(--color-primary-200)' }}>
            <Upload size={16} /> Bulk Invite (CSV)
          </button>
        </div>
      </div>

      {/* ── Invite Doctor Modal ── */}
      <Modal
        isOpen={modalType === 'invite-doctor'}
        onClose={handleCloseModal}
        title="Invite Doctor"
        footer={<>
          <button className="btn btn-secondary" onClick={handleCloseModal} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleInvite} disabled={loading}>
            {loading ? <Spinner size={16} /> : <><Send size={14} /> Send Invite</>}
          </button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="input-group">
            <label>Doctor Email *</label>
            <input type="email" className="input-field" placeholder="doctor@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="input-group">
            <label>Role</label>
            <select className="input-field" value={role} onChange={e => setRole(e.target.value)}>
              {DOCTOR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* ── Invite Staff Modal ── */}
      <Modal
        isOpen={modalType === 'invite-staff'}
        onClose={handleCloseModal}
        title="Invite Staff"
        footer={<>
          <button className="btn btn-secondary" onClick={handleCloseModal} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleInvite} disabled={loading}>
            {loading ? <Spinner size={16} /> : <><Send size={14} /> Send Invite</>}
          </button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="input-group">
            <label>Staff Email *</label>
            <input type="email" className="input-field" placeholder="staff@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="input-group">
            <label>Designation *</label>
            <select className="input-field" value={designation} onChange={e => setDesignation(e.target.value)}>
              <option value="">Select designation...</option>
              {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* ── Bulk Invite Modal ── */}
      <Modal
        isOpen={modalType === 'bulk-invite'}
        onClose={handleCloseModal}
        title="Bulk Invite via CSV"
        footer={!bulkResults ? (
          <>
            <button className="btn btn-secondary" onClick={handleCloseModal} disabled={loading}>Cancel</button>
            <button className="btn btn-primary" onClick={handleBulkInvite} disabled={loading || !bulkFile}>
              {loading ? <Spinner size={16} /> : <><Upload size={14} /> Upload & Invite</>}
            </button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={handleCloseModal}>Done</button>
        )}
      >
        {bulkResults ? (
          /* ── Results View ── */
          <div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: 'var(--space-3)', background: 'rgba(34,197,94,0.08)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{bulkResults.filter(r => r.success).length}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: '#16a34a' }}>Sent</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: 'var(--space-3)', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{bulkResults.filter(r => !r.success).length}</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: '#dc2626' }}>Failed</div>
              </div>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {bulkResults.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 8px', borderRadius: 'var(--radius-md)',
                  background: r.success ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                  marginBottom: 4, fontSize: 'var(--font-size-xs)',
                }}>
                  {r.success
                    ? <CheckCircle size={13} color="#16a34a" />
                    : <AlertCircle size={13} color="#dc2626" />
                  }
                  <span style={{ flex: 1, fontWeight: 500 }}>{r.email}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{r.message}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Upload View ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{
              padding: 'var(--space-3)',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
                <FileText size={14} /> CSV Format
              </div>
              <p style={{ margin: 0, fontSize: 'var(--font-size-xs)' }}>
                One person per line, no header row:<br />
                <code style={{ background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: 4 }}>email,type</code><br />
                <span style={{ color: 'var(--text-tertiary)' }}>Example: <code style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 3 }}>doctor@example.com,DOCTOR</code></span>
              </p>
            </div>
            <div className="input-group">
              <label>CSV File *</label>
              <input
                type="file"
                accept=".csv"
                className="input-field"
                onChange={e => setBulkFile(e.target.files[0])}
                required
              />
            </div>
            {bulkFile && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: 'var(--space-2) var(--space-3)',
                background: 'rgba(37,99,235,0.06)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(37,99,235,0.2)',
                fontSize: 'var(--font-size-xs)',
              }}>
                <FileText size={13} color="#2563eb" />
                <span style={{ flex: 1, color: '#2563eb', fontWeight: 500 }}>{bulkFile.name}</span>
                <button onClick={() => setBulkFile(null)} style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
