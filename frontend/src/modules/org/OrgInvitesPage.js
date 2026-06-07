import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, RefreshCw, Send, X,
  AlertCircle, Search,
  Stethoscope, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../layouts/DashboardLayout';
import { EmptyState, Skeleton, Spinner } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import { orgAPI } from '../../services/api';

// ─── Status config ───
const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'PENDING', label: 'Pending', color: '#f59e0b' },
  { key: 'ACCEPTED', label: 'Accepted', color: '#22c55e' },
  { key: 'EXPIRED', label: 'Expired', color: '#94a3b8' },
];

const STATUS_BADGE = {
  PENDING:  { bg: 'rgba(245,158,11,0.1)',  text: '#d97706', label: 'Pending' },
  ACCEPTED: { bg: 'rgba(34,197,94,0.1)',   text: '#16a34a', label: 'Accepted' },
  EXPIRED:  { bg: 'rgba(148,163,184,0.1)', text: '#64748b', label: 'Expired' },
};

function InviteStatusBadge({ status }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.EXPIRED;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 99,
      background: s.bg, color: s.text,
      fontSize: '11px', fontWeight: 600,
    }}>
      {s.label}
    </span>
  );
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, loading, danger }) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg-overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', width: '100%', maxWidth: 400 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {danger ? <AlertCircle size={20} color="#dc2626" /> : <Send size={20} color="#2563eb" />}
          </div>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>{title}</h3>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-5)', fontSize: 'var(--font-size-sm)' }}>{message}</p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm} disabled={loading}
            style={danger ? { background: '#dc2626', color: '#fff', border: 'none' } : {}}
          >
            {loading ? <Spinner size={16} /> : (danger ? 'Cancel Invite' : 'Resend')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function OrgInvitesPage() {
  const { organizations } = useAuthStore();
  const orgId = (organizations && organizations.length > 0)
    ? (organizations[0]?.id || organizations[0]?._id)
    : null;

  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [activeTab, setActiveTab] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null);

  const loadInvites = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const params = {};
    if (activeTab) params.status = activeTab;
    if (typeFilter) params.type = typeFilter;
    const res = await orgAPI.listInvites(orgId, params);
    if (res.success) {
      setInvites(Array.isArray(res.data) ? res.data : []);
    } else {
      toast.error(res.error || 'Failed to load invites');
    }
    setLoading(false);
  }, [orgId, activeTab, typeFilter]);

  useEffect(() => { loadInvites(); }, [loadInvites]);

  const handleResend = async () => {
    const invite = confirm?.invite;
    if (!invite || !orgId) return;
    setActing(invite._id);
    const res = await orgAPI.resendInvite(orgId, invite._id);
    if (res.success) {
      toast.success(`Invite resent to ${invite.email}`);
      loadInvites();
    } else {
      toast.error(res.error || 'Failed to resend invite');
    }
    setActing(null);
    setConfirm(null);
  };

  const handleCancel = async () => {
    const invite = confirm?.invite;
    if (!invite || !orgId) return;
    setActing(invite._id);
    const res = await orgAPI.cancelInvite(orgId, invite._id);
    if (res.success) {
      toast.success('Invite cancelled');
      loadInvites();
    } else {
      toast.error(res.error || 'Failed to cancel invite');
    }
    setActing(null);
    setConfirm(null);
  };

  // Local search filter
  const filtered = invites.filter(inv =>
    !search || inv.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Invite Management">
      <div className="page-header">
        <div>
          <h1>Invite Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Track, resend, and cancel invitations for your organization
          </p>
        </div>
      </div>

      {/* ── Filters Row ── */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            className="input-field"
            placeholder="Search by email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36, height: 38 }}
          />
        </div>

        {/* Type Filter */}
        <select className="input-field" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ height: 38, width: 'auto', minWidth: 130 }}>
          <option value="">All Types</option>
          <option value="DOCTOR">Doctors</option>
          <option value="STAFF">Staff</option>
        </select>

        <button className="btn btn-ghost btn-icon btn-sm" onClick={loadInvites} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── Status Tabs ── */}
      <div style={{ display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-light)', paddingBottom: 'var(--space-1)' }}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeTab === tab.key ? 'var(--color-primary-500)' : 'transparent',
              color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="card">
        {loading ? (
          <div className="card-body">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-light)' }}>
                <Skeleton width="30%" height={16} /> <Skeleton width="15%" height={16} /> <Skeleton width="15%" height={16} /> <Skeleton width="20%" height={16} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No Invites Found"
            description={activeTab ? `No ${activeTab.toLowerCase()} invites at the moment.` : 'No invitations have been sent yet. Use the quick actions on your dashboard to invite doctors or staff.'}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  {['Email', 'Type', 'Role', 'Department', 'Status', 'Expiry', 'Actions'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((invite, i) => (
                  <motion.tr
                    key={invite._id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: '1px solid var(--border-light)', transition: 'background var(--transition-fast)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {invite.type === 'DOCTOR'
                          ? <Stethoscope size={14} style={{ color: '#2563eb' }} />
                          : <Users size={14} style={{ color: '#7c3aed' }} />
                        }
                        {invite.email}
                      </div>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: invite.type === 'DOCTOR' ? 'rgba(37,99,235,0.1)' : 'rgba(124,58,237,0.1)', color: invite.type === 'DOCTOR' ? '#2563eb' : '#7c3aed' }}>
                        {invite.type}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                      {invite.role || '—'}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                      {invite.departmentId?.departmentName || '—'}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <InviteStatusBadge status={invite.status} />
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      {invite.status !== 'ACCEPTED' && (
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '4px 10px' }}
                            disabled={acting === invite._id}
                            onClick={() => setConfirm({ type: 'resend', invite })}
                          >
                            <Send size={11} /> Resend
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}
                            disabled={acting === invite._id}
                            onClick={() => setConfirm({ type: 'cancel', invite })}
                          >
                            <X size={11} /> Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Confirm Modals ── */}
      <ConfirmModal
        isOpen={confirm?.type === 'resend'}
        onClose={() => setConfirm(null)}
        onConfirm={handleResend}
        loading={!!acting}
        title="Resend Invite"
        message={`Resend the invitation to ${confirm?.invite?.email}? A new 7-day invite link will be generated.`}
      />
      <ConfirmModal
        isOpen={confirm?.type === 'cancel'}
        onClose={() => setConfirm(null)}
        onConfirm={handleCancel}
        loading={!!acting}
        title="Cancel Invite"
        message={`Cancel the invitation for ${confirm?.invite?.email}? They will no longer be able to use the invite link.`}
        danger
      />
    </DashboardLayout>
  );
}
