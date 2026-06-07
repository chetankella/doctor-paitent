import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Building2, Search, Check, X, Eye, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../layouts/DashboardLayout';
import { EmptyState, StatusBadge, Spinner, Pagination } from '../../components/ui';
import Modal from '../../components/ui/Modal';
import { adminAPI } from '../../services/api';

const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

export default function OrgRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null); // detail view
  const [actionModal, setActionModal] = useState(null); // { type, request }
  const [rejectionReason, setRejectionReason] = useState('');
  const [acting, setActing] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const res = await adminAPI.getOrgRequests(statusFilter === 'ALL' ? '' : statusFilter, search);
    if (res.success) {
      const data = res.data?.requests || res.data?.organizationRequests || (Array.isArray(res.data) ? res.data : []);
      setRequests(data);
      setTotal(res.data?.pagination?.total || data.length);
    }
    setLoading(false);
  }, [statusFilter, search]);

  useEffect(() => { setPage(1); loadRequests(); }, [loadRequests]);

  const handleApprove = async () => {
    if (!actionModal) return;
    setActing(true);
    const res = await adminAPI.approveOrgRequest(actionModal.request._id || actionModal.request.id);
    if (res.success) {
      toast.success('Organization approved! Setup email sent.');
      setActionModal(null);
      setSelected(null);
      loadRequests();
    } else toast.error(res.error || 'Approval failed');
    setActing(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 10) { toast.error('Reason must be at least 10 characters'); return; }
    setActing(true);
    const res = await adminAPI.rejectOrgRequest(actionModal.request._id || actionModal.request.id, rejectionReason.trim());
    if (res.success) {
      toast.success('Request rejected.');
      setActionModal(null);
      setRejectionReason('');
      setSelected(null);
      loadRequests();
    } else toast.error(res.error || 'Rejection failed');
    setActing(false);
  };

  return (
    <DashboardLayout title="Organization Requests">
      <div className="page-header">
        <h1>Organization Requests</h1>
        <p>Review, approve, or reject clinic and hospital registration requests</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="card-body" style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input className="input-field" placeholder="Search organization name..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36 }} />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {STATUS_FILTERS.map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-secondary'}`}>
                {f}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={loadRequests} title="Refresh"><RefreshCw size={16} /></button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-10)' }}><Spinner size={28} /></div>
        ) : requests.length === 0 ? (
          <EmptyState icon={Building2} title="No Requests Found" description="No organization requests match your current filter" />
        ) : (
          <>
            <div className="data-table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <motion.tr key={req._id || req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{req.organizationName || req.name}</div>
                        {req.GSTNumber && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>GST: {req.GSTNumber}</div>}
                      </td>
                      <td><span className="badge badge-info">{req.organizationType || req.type || '—'}</span></td>
                      <td style={{ fontSize: 'var(--font-size-sm)' }}>{[req.city, req.state].filter(Boolean).join(', ') || '—'}</td>
                      <td style={{ fontSize: 'var(--font-size-sm)' }}>
                        <div>{req.superAdminName || req.adminName || '—'}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{req.superAdminEmail || req.adminEmail}</div>
                      </td>
                      <td><StatusBadge status={req.status || 'PENDING'} /></td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <button className="btn btn-ghost btn-icon btn-sm" title="View Details" onClick={() => setSelected(req)}><Eye size={14} /></button>
                          {(!req.status || req.status === 'PENDING') && (
                            <>
                              <button className="btn btn-sm" style={{ background: 'var(--color-success-50)', color: 'var(--color-success-600)' }}
                                onClick={() => setActionModal({ type: 'approve', request: req })}><Check size={14} /></button>
                              <button className="btn btn-sm" style={{ background: 'var(--color-danger-50)', color: 'var(--color-danger-600)' }}
                                onClick={() => { setRejectionReason(''); setActionModal({ type: 'reject', request: req }); }}><X size={14} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Organization Details"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', width: '100%' }}>
            <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            {(!selected?.status || selected?.status === 'PENDING') && (
              <>
                <button className="btn btn-sm" style={{ background: 'var(--color-danger-50)', color: 'var(--color-danger-600)' }}
                  onClick={() => { setRejectionReason(''); setActionModal({ type: 'reject', request: selected }); setSelected(null); }}>Reject</button>
                <button className="btn btn-primary btn-sm"
                  onClick={() => { setActionModal({ type: 'approve', request: selected }); setSelected(null); }}>Approve</button>
              </>
            )}
          </div>
        }
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
            {[
              ['Organization', selected.organizationName || selected.name],
              ['Type', selected.organizationType || selected.type],
              ['Registration No.', selected.registrationNumber || '—'],
              ['GST Number', selected.GSTNumber || '—'],
              ['Contact Email', selected.contactEmail || '—'],
              ['Contact Phone', selected.contactPhone || '—'],
              ['Website', selected.website || '—'],
              ['Address', [selected.addressLine1, selected.addressLine2, selected.city, selected.state, selected.pincode].filter(Boolean).join(', ') || '—'],
              ['Super Admin Name', selected.superAdminName || selected.adminName || '—'],
              ['Super Admin Email', selected.superAdminEmail || selected.adminEmail || '—'],
              ['Status', selected.status || 'PENDING'],
              ['Submitted', selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 'var(--space-2)' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                <span style={{ color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
            {selected.additionalNotes && (
              <div>
                <div style={{ color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 'var(--space-1)' }}>Notes</div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>{selected.additionalNotes}</div>
              </div>
            )}
            {selected.rejectionReason && (
              <div>
                <div style={{ color: 'var(--color-danger-600)', fontWeight: 500, marginBottom: 'var(--space-1)' }}>Rejection Reason</div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--color-danger-50)', borderRadius: 'var(--radius-md)', color: '#991b1b' }}>{selected.rejectionReason}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal isOpen={actionModal?.type === 'approve'} onClose={() => setActionModal(null)} title="Confirm Approval"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApprove} disabled={acting}>{acting ? <Spinner size={16} /> : 'Approve & Send Email'}</button>
        </>}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          Approve <strong>{actionModal?.request?.organizationName || actionModal?.request?.name}</strong> and send setup email to <strong>{actionModal?.request?.superAdminEmail || actionModal?.request?.adminEmail}</strong>?
        </p>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={actionModal?.type === 'reject'} onClose={() => setActionModal(null)} title="Reject Request"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleReject} disabled={acting}>{acting ? <Spinner size={16} /> : 'Reject'}</button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Provide a reason for rejecting <strong>{actionModal?.request?.organizationName || actionModal?.request?.name}</strong>:
          </p>
          <div className="input-group">
            <label>Rejection Reason *</label>
            <textarea className="input-field" rows={4} placeholder="Explain why the request is being rejected (min 10 characters)..."
              value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
