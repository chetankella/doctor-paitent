import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, RefreshCw, Clock, UserPlus,
  GitBranch, Mail, LogIn, Check, X, Shield, ChevronLeft, ChevronRight,
} from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { EmptyState, Skeleton } from '../../components/ui';
import { orgAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

// ─── Action→Icon+Color mapping ───
const ACTION_META = {
  doctor_invited:          { icon: UserPlus,  bg: 'rgba(37,99,235,0.1)',  color: '#2563eb', label: 'Doctor Invited' },
  staff_invited:           { icon: UserPlus,  bg: 'rgba(124,58,237,0.1)', color: '#7c3aed', label: 'Staff Invited' },
  invite_resent:           { icon: Mail,      bg: 'rgba(245,158,11,0.1)', color: '#d97706', label: 'Invite Resent' },
  invite_cancelled:        { icon: X,         bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', label: 'Invite Cancelled' },
  department_created:      { icon: GitBranch, bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Department Created' },
  department_admin_invited:{ icon: Shield,    bg: 'rgba(245,158,11,0.1)', color: '#d97706', label: 'Dept Admin Invited' },
  department_admin_onboarded: { icon: Check,  bg: 'rgba(34,197,94,0.1)', color: '#16a34a', label: 'Dept Admin Joined' },
  doctor_password_set:     { icon: Check,     bg: 'rgba(34,197,94,0.1)', color: '#16a34a', label: 'Doctor Joined' },
  staff_onboarded:         { icon: Check,     bg: 'rgba(34,197,94,0.1)', color: '#16a34a', label: 'Staff Joined' },
  super_admin_created:     { icon: Shield,    bg: 'rgba(99,102,241,0.1)', color: '#4f46e5', label: 'Super Admin Setup' },
  login:                   { icon: LogIn,     bg: 'rgba(148,163,184,0.1)',color: '#64748b', label: 'Login' },
};

function getActionMeta(action) {
  return ACTION_META[action] || {
    icon: Activity, bg: 'rgba(148,163,184,0.1)', color: '#64748b', label: action,
  };
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function OrgActivityPage() {
  const { organizations } = useAuthStore();
  const orgId = (organizations && organizations.length > 0)
    ? (organizations[0]?.id || organizations[0]?._id)
    : null;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 30;

  const loadLogs = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const res = await orgAPI.getAuditLogs(orgId, page);
    if (res.success) {
      setLogs(Array.isArray(res.data) ? res.data : []);
      if (res.raw?.pagination) setTotal(res.raw.pagination.total);
    } else {
      toast.error(res.error || 'Failed to load activity logs');
    }
    setLoading(false);
  }, [orgId, page]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <DashboardLayout title="Activity Log">
      <div className="page-header">
        <div>
          <h1>Activity Log</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            A chronological record of all actions in your organization
          </p>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={loadLogs} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── Summary Stats ── */}
      {!loading && logs.length > 0 && (
        <div style={{
          display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap',
          marginBottom: 'var(--space-4)',
        }}>
          <div style={{ padding: '6px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 99, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={12} /> {total} total events
          </div>
          <div style={{ padding: '6px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 99, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={12} /> Page {page} of {totalPages || 1}
          </div>
        </div>
      )}

      {/* ── Timeline ── */}
      <div className="card">
        {loading ? (
          <div className="card-body">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-light)' }}>
                <Skeleton width={36} height={36} style={{ borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Skeleton width="50%" height={14} style={{ marginBottom: 6 }} />
                  <Skeleton width="80%" height={12} />
                </div>
                <Skeleton width={60} height={12} />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No Activity Yet"
            description="Organization activity logs will appear here once members start performing actions — inviting doctors, creating departments, and more."
          />
        ) : (
          <div style={{ padding: 'var(--space-2) 0' }}>
            {logs.map((log, i) => {
              const meta = getActionMeta(log.action);
              const Icon = meta.icon;
              const actorName = log.userId?.name || 'System';
              const actorRole = log.userId?.role || '';

              return (
                <motion.div
                  key={log._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: i < logs.length - 1 ? '1px solid var(--border-light)' : 'none',
                    transition: 'background var(--transition-fast)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Action Icon */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: meta.bg, color: meta.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 2,
                  }}>
                    <Icon size={16} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: 99,
                        background: meta.bg, color: meta.color,
                      }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        by <strong>{actorName}</strong>
                        {actorRole && ` (${actorRole.replace(/_/g, ' ')})`}
                      </span>
                    </div>
                    {log.description && (
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.5 }}>
                        {log.description}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }} title={formatDate(log.createdAt)}>
                      {timeAgo(log.createdAt)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {formatDate(log.createdAt)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            {page} / {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
