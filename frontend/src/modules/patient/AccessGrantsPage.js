import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Key, Plus, Trash2, Copy } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { EmptyState, StatusBadge, Spinner, Pagination } from '../../components/ui';
import { patientAPI } from '../../services/api';

export default function AccessGrantsPage() {
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [showRevoke, setShowRevoke] = useState(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [form, setForm] = useState({ doctorEmail: '', scope: 'FULL_PROFILE', expiryDays: 30, reason: '' });
  const [newToken, setNewToken] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadGrants = useCallback(async () => {
    setLoading(true);
    const res = await patientAPI.listGrants('ALL', page);
    if (res.success) {
      setGrants(res.data?.grants || []);
      setTotal(res.data?.pagination?.total || 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { loadGrants(); }, [loadGrants]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.doctorEmail) { toast.error('Doctor email is required'); return; }
    setCreating(true);
    const res = await patientAPI.createGrant(form);
    if (res.success) {
      toast.success('Access granted successfully!');
      setNewToken(res.data?.accessToken);
      setShowCreate(false);
      setForm({ doctorEmail: '', scope: 'FULL_PROFILE', expiryDays: 30, reason: '' });
      loadGrants();
    } else {
      toast.error(res.error || 'Failed to create grant');
    }
    setCreating(false);
  };

  const handleRevoke = async () => {
    if (!showRevoke) return;
    setRevoking(true);
    const res = await patientAPI.revokeGrant(showRevoke);
    if (res.success) {
      toast.success('Access revoked');
      loadGrants();
    } else {
      toast.error(res.error || 'Failed to revoke');
    }
    setRevoking(false);
    setShowRevoke(null);
  };

  const copyToken = (token) => {
    navigator.clipboard.writeText(token);
    toast.success('Token copied to clipboard');
  };

  return (
    <DashboardLayout title="Access Grants">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 'var(--space-3)' : 0 }}>
        <div>
          <h1>Access Grants</h1>
          <p>Manage who can access your medical data</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
          <Plus size={16} /> Grant Access
        </button>
      </div>

      {/* Token Display (shown once after creation) */}
      {newToken && (
        <div className="card" style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--color-primary-300)', background: 'var(--color-primary-50)' }}>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-1)' }}>Access Token Generated</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Copy this token and share it with the doctor. It won't be shown again.</div>
                <code style={{ display: 'block', marginTop: 'var(--space-2)', padding: 'var(--space-2)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-size-xs)', wordBreak: 'break-all' }}>
                  {newToken}
                </code>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button className="btn btn-primary btn-sm" onClick={() => copyToken(newToken)} style={{ flex: isMobile ? 1 : 'none' }}><Copy size={14} /> Copy</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setNewToken(null)} style={{ flex: isMobile ? 1 : 'none' }}>Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grants Table */}
      <div className="card">
        {loading ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-10)' }}><Spinner size={28} /></div>
        ) : grants.length === 0 ? (
          <EmptyState
            icon={Key}
            title="No Access Grants"
            description="You haven't granted any doctor access to your data yet"
            action={<button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Grant Access</button>}
          />
        ) : (
          <>
            {isMobile ? (
              <div className="mobile-card-list">
                {grants.map((g) => (
                  <div key={g.grantId} className="mobile-card-item">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{g.doctorName || '—'}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{g.doctorEmail}</div>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Scope</span>
                      <span className="badge badge-info">{g.scope}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Status</span>
                      <StatusBadge status={g.status} />
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Granted</span>
                      <span className="mobile-card-value">{new Date(g.grantedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Expires</span>
                      <span className="mobile-card-value">{new Date(g.expiresAt).toLocaleDateString()}</span>
                    </div>
                    {g.status === 'ACTIVE' && (
                      <div className="mobile-card-actions">
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger-500)' }} onClick={() => setShowRevoke(g.grantId)}>
                          <Trash2 size={14} /> Revoke
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
                    <tr>
                      <th>Doctor</th>
                      <th>Scope</th>
                      <th>Status</th>
                      <th>Granted</th>
                      <th>Expires</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grants.map((g) => (
                      <tr key={g.grantId}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{g.doctorName || '—'}</div>
                          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{g.doctorEmail}</div>
                        </td>
                        <td><span className="badge badge-info">{g.scope}</span></td>
                        <td><StatusBadge status={g.status} /></td>
                        <td style={{ fontSize: 'var(--font-size-xs)' }}>{new Date(g.grantedAt).toLocaleDateString()}</td>
                        <td style={{ fontSize: 'var(--font-size-xs)' }}>{new Date(g.expiresAt).toLocaleDateString()}</td>
                        <td>
                          {g.status === 'ACTIVE' && (
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger-500)' }} onClick={() => setShowRevoke(g.grantId)}>
                              <Trash2 size={14} /> Revoke
                            </button>
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

      {/* Create Grant Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Grant Doctor Access"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
              {creating ? <Spinner size={16} /> : 'Grant Access'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="input-group">
            <label>Doctor Email *</label>
            <input className="input-field" type="email" placeholder="doctor@hospital.com" value={form.doctorEmail}
              onChange={(e) => setForm(f => ({ ...f, doctorEmail: e.target.value }))} required />
          </div>
          <div className="input-group">
            <label>Access Scope</label>
            <select className="input-field" value={form.scope}
              onChange={(e) => setForm(f => ({ ...f, scope: e.target.value }))}>
              <option value="SUMMARY">Summary — Basic info only</option>
              <option value="FULL_PROFILE">Full Profile — Complete medical data</option>
              <option value="FULL_WITH_WRITE">Full + Write — Can add notes</option>
            </select>
          </div>
          <div className="input-group">
            <label>Expiry (days)</label>
            <input className="input-field" type="number" min="1" max="365" value={form.expiryDays}
              onChange={(e) => setForm(f => ({ ...f, expiryDays: parseInt(e.target.value) || 30 }))} />
          </div>
          <div className="input-group">
            <label>Reason (optional)</label>
            <textarea className="input-field" rows={2} placeholder="e.g., Ongoing cardiac treatment"
              value={form.reason} onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
              style={{ resize: 'vertical' }} />
          </div>
        </form>
      </Modal>

      {/* Revoke Confirmation */}
      <Modal
        isOpen={!!showRevoke}
        onClose={() => setShowRevoke(null)}
        title="Revoke Access?"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowRevoke(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleRevoke} disabled={revoking}>
              {revoking ? <Spinner size={16} /> : 'Revoke Access'}
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          The doctor will immediately lose access to your medical data. This action cannot be undone.
        </p>
      </Modal>
    </DashboardLayout>
  );
}
