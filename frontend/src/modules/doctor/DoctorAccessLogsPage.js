import React, { useEffect, useState, useCallback } from 'react';
import { Activity } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { EmptyState, Spinner, Pagination } from '../../components/ui';
import { doctorAPI } from '../../services/api';

export default function DoctorAccessLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const res = await doctorAPI.getAccessLogs(page);
    if (res.success) {
      setLogs(res.data?.logs || []);
      setTotal(res.data?.pagination?.total || 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  return (
    <DashboardLayout title="Access History">
      <div className="page-header">
        <h1>My Access History</h1>
        <p>View your record of patient data access</p>
      </div>

      <div className="card">
        {loading ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-10)' }}><Spinner size={28} /></div>
        ) : logs.length === 0 ? (
          <EmptyState icon={Activity} title="No Access Records" description="Your access history will appear here" />
        ) : (
          <>
            <div className="data-table-responsive">
              <table className="data-table">
                <thead><tr><th>Patient</th><th>Type</th><th>Scope</th><th>Endpoint</th><th>Time</th></tr></thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log._id || i}>
                      <td style={{ fontWeight: 500 }}>{log.patientId?.name || log.patientId || '—'}</td>
                      <td><span className="badge badge-info">{log.accessType || '—'}</span></td>
                      <td><span className="badge badge-neutral">{log.scope || '—'}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.endpoint || '—'}
                      </td>
                      <td style={{ fontSize: 'var(--font-size-xs)', whiteSpace: 'nowrap' }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
