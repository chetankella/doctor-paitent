import React, { useEffect, useState, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { EmptyState, Spinner, Pagination } from '../../components/ui';
import { patientAPI } from '../../services/api';

export default function AccessLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const res = await patientAPI.getAccessLogs(page);
    if (res.success) {
      setLogs(res.data?.logs || []);
      setTotal(res.data?.pagination?.total || 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const getAccessorInfo = (log) => {
    const by = log.accessedBy;
    if (!by) return { name: 'Unknown', type: '—' };
    return {
      name: by.name || by.email || 'Anonymous',
      type: by.type || log.accessType,
    };
  };

  return (
    <DashboardLayout title="Access Logs">
      <div className="page-header">
        <h1>Access Logs</h1>
        <p>Track who has accessed your medical data and when</p>
      </div>

      <div className="card">
        {loading ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-10)' }}><Spinner size={28} /></div>
        ) : logs.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No Access Logs" description="No one has accessed your data yet" />
        ) : (
          <>
            {isMobile ? (
              <div className="mobile-card-list">
                {logs.map((log, i) => {
                  const accessor = getAccessorInfo(log);
                  return (
                    <div key={log._id || i} className="mobile-card-item">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{accessor.name}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                          {log.accessedBy?.email || '—'}
                        </div>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Type</span>
                        <span className={`badge ${accessor.type === 'EMERGENCY_SCAN' ? 'badge-danger' : accessor.type === 'DOCTOR' ? 'badge-info' : 'badge-neutral'}`}>
                          {accessor.type}
                        </span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Scope</span>
                        <span className="badge badge-neutral">{log.scope || '—'}</span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Time</span>
                        <span className="mobile-card-value">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                        </span>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">Endpoint</span>
                        <span className="mobile-card-value" style={{ fontFamily: 'monospace', fontSize: '10px' }}>
                          {log.endpoint || '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="data-table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Accessed By</th>
                      <th>Type</th>
                      <th>Scope</th>
                      <th>Endpoint</th>
                      <th>IP Address</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => {
                      const accessor = getAccessorInfo(log);
                      return (
                        <tr key={log._id || i}>
                          <td>
                            <div style={{ fontWeight: 500 }}>{accessor.name}</div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                              {log.accessedBy?.email || '—'}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${accessor.type === 'EMERGENCY_SCAN' ? 'badge-danger' : accessor.type === 'DOCTOR' ? 'badge-info' : 'badge-neutral'}`}>
                              {accessor.type}
                            </span>
                          </td>
                          <td><span className="badge badge-neutral">{log.scope || '—'}</span></td>
                          <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {log.endpoint || '—'}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>{log.ipAddress || '—'}</td>
                          <td style={{ fontSize: 'var(--font-size-xs)', whiteSpace: 'nowrap' }}>
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
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
