import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Key, ClipboardList, Bell, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '../../layouts/DashboardLayout';
import { StatCard, Skeleton } from '../../components/ui';
import { patientAPI } from '../../services/api';

export default function PatientDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ activeGrants: 0, pendingRequests: 0, qrStatus: 'None', recentLogs: 0 });

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [grantsRes, requestsRes, qrRes, logsRes] = await Promise.allSettled([
        patientAPI.listGrants('ACTIVE'),
        patientAPI.listRequests('PENDING'),
        patientAPI.getActiveQR(),
        patientAPI.getAccessLogs(),
      ]);

      setStats({
        activeGrants: grantsRes.status === 'fulfilled' && grantsRes.value.success
          ? grantsRes.value.data?.pagination?.total ?? grantsRes.value.data?.grants?.length ?? 0 : 0,
        pendingRequests: requestsRes.status === 'fulfilled' && requestsRes.value.success
          ? requestsRes.value.data?.pagination?.total ?? requestsRes.value.data?.requests?.length ?? 0 : 0,
        qrStatus: qrRes.status === 'fulfilled' && qrRes.value.success ? 'Active' : 'None',
        recentLogs: logsRes.status === 'fulfilled' && logsRes.value.success
          ? logsRes.value.data?.pagination?.total ?? logsRes.value.data?.logs?.length ?? 0 : 0,
      });
    } catch {
      // Silently handle — stats are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const quickActions = [
    { icon: QrCode, label: 'Emergency QR', desc: 'Generate or view your QR code', to: '/patient/emergency-qr', color: '#ef4444' },
    { icon: Key, label: 'Grant Access', desc: 'Share data with a doctor', to: '/patient/access-grants', color: '#3b82f6' },
    { icon: Bell, label: 'Requests', desc: 'Review pending access requests', to: '/patient/access-requests', color: '#f59e0b' },
    { icon: ClipboardList, label: 'Access Logs', desc: 'See who accessed your data', to: '/patient/access-logs', color: '#22c55e' },
  ];

  return (
    <DashboardLayout title="Patient Dashboard">
      <div className="page-header">
        <h1>Welcome Back</h1>
        <p>Manage your health data, emergency access, and doctor permissions</p>
      </div>

      {/* Stats Row */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card"><div className="stat-card"><Skeleton width={44} height={44} /><div><Skeleton width={60} height={24} /><Skeleton width={100} height={14} style={{ marginTop: 8 }} /></div></div></div>
          ))
        ) : (
          <>
            <StatCard icon={Key} iconColor="blue" value={stats.activeGrants} label="Active Grants" />
            <StatCard icon={Bell} iconColor="orange" value={stats.pendingRequests} label="Pending Requests" />
            <StatCard icon={QrCode} iconColor="red" value={stats.qrStatus} label="Emergency QR" />
            <StatCard icon={Activity} iconColor="green" value={stats.recentLogs} label="Access Events" />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header"><h3>Quick Actions</h3></div>
        <div className="card-body">
          <div className="grid-2">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(action.to)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                  padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-light)', cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                whileHover={{ scale: 1.01, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--radius-lg)',
                  background: `${action.color}10`, color: action.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <action.icon size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{action.label}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{action.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
