import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Bell, Check, X } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { EmptyState, StatusBadge, Spinner, Pagination } from '../../components/ui';
import { patientAPI } from '../../services/api';

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [responding, setResponding] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [approveForm, setApproveForm] = useState({ scope: 'SUMMARY', expiryDays: 7 });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const res = await patientAPI.listRequests('ALL', page);
    if (res.success) {
      setRequests(res.data?.requests || []);
      setTotal(res.data?.pagination?.total || 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleReject = async (requestId) => {
    setResponding(requestId);
    const res = await patientAPI.respondToRequest(requestId, { action: 'REJECT' });
    if (res.success) { toast.success('Request rejected'); loadRequests(); }
    else toast.error(res.error || 'Failed to reject');
    setResponding(null);
  };

  const handleApprove = async () => {
    if (!approveModal) return;
    setResponding(approveModal);
    const res = await patientAPI.respondToRequest(approveModal, {
      action: 'APPROVE',
      scope: approveForm.scope,
      expiryDays: approveForm.expiryDays,
    });
    if (res.success) { toast.success('Access approved!'); loadRequests(); }
    else toast.error(res.error || 'Failed to approve');
    setResponding(null);
    setApproveModal(null);
  };

  return (
    <DashboardLayout title="Access Requests">
      <div className="page-header">
        <h1>Access Requests</h1>
        <p>Review and respond to doctors requesting access to your medical data</p>
      </div>

      <div className="card">
        {loading ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-10)' }}><Spinner size={28} /></div>
        ) : requests.length === 0 ? (
          <EmptyState icon={Bell} title="No Requests" description="You don't have any access requests from doctors" />
        ) : (
          <>
            {isMobile ? (
              <div className="mobile-card-list">
                {requests.map((r) => (
                  <div key={r.requestId} className="mobile-card-item">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{r.doctorName || '—'}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{r.doctorEmail}</div>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Scope</span>
                      <span className="badge badge-info">{r.scope}</span>
                    </div>
                    {r.reason && (
                      <div>
                        <span className="mobile-card-label">Reason</span>
                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: '4px 0 0' }}>{r.reason}</p>
                      </div>
                    )}
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Duration</span>
                      <span className="mobile-card-value">{r.requestedDays} days</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Status</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Received</span>
                      <span className="mobile-card-value">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    {r.status === 'PENDING' && (
                      <div className="mobile-card-actions">
                        <button className="btn btn-sm" style={{ color: 'var(--color-success-600)', background: 'var(--color-success-50)', flex: 1, justifyContent: 'center' }}
                          onClick={() => { setApproveModal(r.requestId); setApproveForm({ scope: r.scope, expiryDays: r.requestedDays }); }}
                          disabled={responding === r.requestId}>
                          <Check size={14} /> Approve
                        </button>
                        <button className="btn btn-sm" style={{ color: 'var(--color-danger-600)', background: 'var(--color-danger-50)', flex: 1, justifyContent: 'center' }}
                          onClick={() => handleReject(r.requestId)}
                          disabled={responding === r.requestId}>
                          {responding === r.requestId ? <Spinner size={14} /> : <><X size={14} /> Reject</>}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="data-table-responsive">
                <table className="data-table">
                  <thead>
                    <tr><th>Doctor</th><th>Scope</th><th>Reason</th><th>Days</th><th>Status</th><th>Received</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.requestId}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{r.doctorName || '—'}</div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{r.doctorEmail}</div>
                        </td>
                        <td><span className="badge badge-info">{r.scope}</span></td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--font-size-sm)' }}>{r.reason}</td>
                        <td>{r.requestedDays}d</td>
                        <td><StatusBadge status={r.status} /></td>
                        <td style={{ fontSize: 'var(--font-size-xs)' }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                        <td>
                          {r.status === 'PENDING' && (
                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                              <button className="btn btn-sm" style={{ color: 'var(--color-success-600)', background: 'var(--color-success-50)' }}
                                onClick={() => { setApproveModal(r.requestId); setApproveForm({ scope: r.scope, expiryDays: r.requestedDays }); }}
                                disabled={responding === r.requestId}>
                                <Check size={14} /> Approve
                              </button>
                              <button className="btn btn-sm" style={{ color: 'var(--color-danger-600)', background: 'var(--color-danger-50)' }}
                                onClick={() => handleReject(r.requestId)}
                                disabled={responding === r.requestId}>
                                {responding === r.requestId ? <Spinner size={14} /> : <><X size={14} /> Reject</>}
                              </button>
                            </div>
                          )}
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

      {/* Approve Modal — patient can adjust scope and duration */}
      <Modal
        isOpen={!!approveModal}
        onClose={() => setApproveModal(null)}
        title="Approve Access Request"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setApproveModal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleApprove} disabled={!!responding}>
              {responding ? <Spinner size={16} /> : 'Approve'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          You can adjust the scope and duration before approving:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="input-group">
            <label>Access Scope</label>
            <select className="input-field" value={approveForm.scope}
              onChange={(e) => setApproveForm(f => ({ ...f, scope: e.target.value }))}>
              <option value="SUMMARY">Summary</option>
              <option value="FULL_PROFILE">Full Profile</option>
              <option value="FULL_WITH_WRITE">Full + Write</option>
            </select>
          </div>
          <div className="input-group">
            <label>Duration (days)</label>
            <input className="input-field" type="number" min="1" max="365" value={approveForm.expiryDays}
              onChange={(e) => setApproveForm(f => ({ ...f, expiryDays: parseInt(e.target.value) || 7 }))} />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
