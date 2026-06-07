import React from 'react';

/** Status badge with color variants */
export function Badge({ variant = 'neutral', children }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

/** Map common status strings to badge variants */
export function StatusBadge({ status }) {
  const map = {
    ACTIVE: 'success', APPROVED: 'success',
    PENDING: 'warning',
    EXPIRED: 'neutral', REVOKED: 'danger', REJECTED: 'danger',
  };
  return <Badge variant={map[status] || 'neutral'}>{status}</Badge>;
}

/** Skeleton loader lines */
export function Skeleton({ width = '100%', height = 14, style = {} }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

/** Empty state with icon, title, description, and optional action */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon className="empty-state-icon" />}
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div style={{ marginTop: 'var(--space-4)' }}>{action}</div>}
    </div>
  );
}

/** Stat display card */
export function StatCard({ icon: Icon, iconColor = 'blue', value, label }) {
  return (
    <div className="card">
      <div className="stat-card">
        <div className={`stat-icon stat-icon-${iconColor}`}>
          <Icon />
        </div>
        <div>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      </div>
    </div>
  );
}

/** Pagination controls */
export function Pagination({ page, total, limit, onPageChange }) {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <span>Page {page} of {totalPages} ({total} items)</span>
      <div className="pagination-buttons">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >Previous</button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >Next</button>
      </div>
    </div>
  );
}

/** Loading spinner */
export function Spinner({ size = 20 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
        strokeDasharray="31.4 31.4" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
