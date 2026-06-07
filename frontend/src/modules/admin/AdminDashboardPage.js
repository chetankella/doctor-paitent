import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, Activity, Clock, CheckCircle, XCircle, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DashboardLayout from '../../layouts/DashboardLayout';
import { StatCard, EmptyState, Spinner, Skeleton } from '../../components/ui';
import Modal from '../../components/ui/Modal';
import { adminAPI } from '../../services/api';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null); // { type: 'approve'|'reject', request }
  const [rejectionReason, setRejectionReason] = useState('');
  const [acting, setActing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [statsRes, pendingRes] = await Promise.allSettled([
      adminAPI.getPlatformStats(),
      adminAPI.getOrgRequests('PENDING'),
    ]);
    if (statsRes.status === 'fulfilled' && statsRes.value.success) {
      setStats(statsRes.value.data);
    }
    if (pendingRes.status === 'fulfilled' && pendingRes.value.success) {
      const data = pendingRes.value.data;
      setPendingRequests(data?.requests || data?.organizationRequests || (Array.isArray(data) ? data : []));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async () => {
    if (!actionModal) return;
    setActing(true);
    const res = await adminAPI.approveOrgRequest(actionModal.request._id || actionModal.request.id);
    if (res.success) {
      toast.success('Organization approved! Setup email sent.');
      setActionModal(null);
      loadData();
    } else {
      toast.error(res.error || 'Approval failed');
    }
    setActing(false);
  };

  const handleReject = async () => {
    if (!actionModal || !rejectionReason.trim()) { toast.error('Please provide a rejection reason (min 10 characters)'); return; }
    if (rejectionReason.trim().length < 10) { toast.error('Rejection reason must be at least 10 characters'); return; }
    setActing(true);
    const res = await adminAPI.rejectOrgRequest(actionModal.request._id || actionModal.request.id, rejectionReason.trim());
    if (res.success) {
      toast.success('Request rejected.');
      setActionModal(null);
      setRejectionReason('');
      loadData();
    } else {
      toast.error(res.error || 'Rejection failed');
    }
    setActing(false);
  };

  const statCards = [
    { icon: Building2, iconColor: 'blue', value: stats?.totalOrganizations ?? stats?.organizations ?? '—', label: 'Organizations' },
    { icon: Users, iconColor: 'green', value: stats?.totalDoctors ?? stats?.doctors ?? '—', label: 'Doctors' },
    { icon: Activity, iconColor: 'orange', value: stats?.totalPatients ?? stats?.patients ?? '—', label: 'Patients' },
    { icon: Clock, iconColor: 'red', value: pendingRequests.length, label: 'Pending Requests' },
  ];

  return (
    <DashboardLayout title="Platform Dashboard">
      <div className="page-header">
        <h1>Platform Dashboard</h1>
        <p>Monitor and manage organizations, requests, and platform activity</p>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card"><div className="stat-card"><Skeleton width={44} height={44} /><div><Skeleton width={60} height={24} /><Skeleton width={100} height={14} style={{ marginTop: 8 }} /></div></div></div>
          ))
        ) : (
          statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <StatCard {...s} />
            </motion.div>
          ))
        )}
      </div>

      {/* Pending Org Requests */}
      <div className="card">
        <div className="card-header">
          <h3>Pending Organization Requests</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/org-requests')}>View All</button>
        </div>

        {loading ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-10)' }}><Spinner size={28} /></div>
        ) : pendingRequests.length === 0 ? (
          <EmptyState icon={CheckCircle} title="No Pending Requests" description="All organization requests have been reviewed" />
        ) : (
          <div className="data-table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Super Admin</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.slice(0, 10).map((req) => (
                  <tr key={req._id || req.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{req.organizationName || req.name}</div>
                      {req.registrationNumber && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Reg: {req.registrationNumber}</div>}
                    </td>
                    <td><span className="badge badge-info">{req.organizationType || req.type}</span></td>
                    <td style={{ fontSize: 'var(--font-size-sm)' }}>{[req.city, req.state].filter(Boolean).join(', ') || '—'}</td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{req.superAdminName || req.adminName || '—'}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{req.superAdminEmail || req.adminEmail}</div>
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button className="btn btn-sm" style={{ background: 'var(--color-success-50)', color: 'var(--color-success-600)' }}
                          onClick={() => setActionModal({ type: 'approve', request: req })}>
                          <Check size={14} /> Approve
                        </button>
                        <button className="btn btn-sm" style={{ background: 'var(--color-danger-50)', color: 'var(--color-danger-600)' }}
                          onClick={() => { setRejectionReason(''); setActionModal({ type: 'reject', request: req }); }}>
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={actionModal?.type === 'approve'}
        onClose={() => setActionModal(null)}
        title="Approve Organization Request"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleApprove} disabled={acting}>
              {acting ? <Spinner size={16} /> : <><Check size={14} /> Confirm Approval</>}
            </button>
          </>
        }
      >
        {actionModal?.request && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              You are approving <strong>{actionModal.request.organizationName || actionModal.request.name}</strong>. A setup invitation email will be sent to:
            </p>
            <div style={{ padding: 'var(--space-3)', background: 'var(--color-success-50)', borderRadius: 'var(--radius-md)', fontWeight: 600, color: 'var(--color-success-600)' }}>
              {actionModal.request.superAdminEmail || actionModal.request.adminEmail}
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={actionModal?.type === 'reject'}
        onClose={() => setActionModal(null)}
        title="Reject Organization Request"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleReject} disabled={acting}>
              {acting ? <Spinner size={16} /> : <><XCircle size={14} /> Reject Request</>}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Provide a reason for rejecting <strong>{actionModal?.request?.organizationName || actionModal?.request?.name}</strong>. This will be shown to the applicant.
          </p>
          <div className="input-group">
            <label>Rejection Reason (min 10 characters) *</label>
            <textarea className="input-field" rows={4} placeholder="e.g. Missing required documentation, incomplete GST number..."
              value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
