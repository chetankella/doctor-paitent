import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, Mail, Search, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { orgAPI } from '../../services/api';
import { Spinner } from '../../components/ui';

const STATUS_CONFIG = {
  PENDING: { icon: Clock, color: '#f59e0b', bg: '#fffbeb', label: 'Under Review', desc: 'Your request is being reviewed by our team. You\'ll receive an email once a decision is made.' },
  APPROVED: { icon: CheckCircle, color: '#22c55e', bg: '#f0fdf4', label: 'Approved', desc: 'Your organization has been approved! Check your email for the setup link to activate your Super Admin account.' },
  REJECTED: { icon: XCircle, color: '#ef4444', bg: '#fef2f2', label: 'Rejected', desc: 'Unfortunately, your request was not approved.' },
};

export default function OrgRequestStatusPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    // Backend queries by contactEmail (see getMyOrganizationRequest controller)
    const res = await orgAPI.checkStatus(email.trim());
    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.error || 'No request found for this email address');
    }
    setLoading(false);
  };

  const status = result?.status && STATUS_CONFIG[result.status];

  return (
    <div className="onboarding-page">
      <motion.div className="onboarding-card" style={{ maxWidth: 480 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="onboarding-header">
          <div className="onboarding-logo"><Shield size={22} /></div>
          <h1>Check Request Status</h1>
          <p>Enter the organization's <strong>contact email</strong> you used during registration</p>
        </div>

        <div style={{ padding: 'var(--space-6)' }}>
          <form onSubmit={handleCheck}>
            <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label>Organization Contact Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  className="input-field"
                  type="email"
                  placeholder="admin@hospital.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: 36 }}
                  autoFocus
                  required
                />
              </div>
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? <Spinner size={18} /> : <><Search size={18} /> Check Status</>}
            </button>
          </form>

          {error && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{
              marginTop: 'var(--space-4)', padding: 'var(--space-4)',
              background: 'var(--color-danger-50)', border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)', display: 'flex', gap: 'var(--space-3)',
              alignItems: 'flex-start', color: 'var(--color-danger-600)',
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 'var(--font-size-sm)' }}>{error}</span>
            </motion.div>
          )}

          {result && status && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{
              marginTop: 'var(--space-4)', padding: 'var(--space-5)',
              background: status.bg, border: `1px solid ${status.color}30`,
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <status.icon size={24} style={{ color: status.color }} />
                <div>
                  <div style={{ fontWeight: 700, color: status.color }}>{status.label}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                    {result.organizationName || 'Your Organization'}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--line-height-relaxed)' }}>
                {status.desc}
              </p>
              {result.rejectionReason && (
                <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-danger-50)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: '#991b1b' }}>
                  <strong>Reason:</strong> {result.rejectionReason}
                </div>
              )}
              {result.submittedAt && (
                <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                  Submitted: {new Date(result.submittedAt).toLocaleDateString()}
                </div>
              )}
            </motion.div>
          )}
        </div>

        <div style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/organization/request" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary-600)' }}>Submit New Request</Link>
          <Link to="/login" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>Back to Login</Link>
        </div>
      </motion.div>

      <style>{`
        .onboarding-page {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, var(--color-primary-50) 0%, var(--bg-secondary) 60%, var(--color-primary-100) 100%);
          padding: var(--space-6) var(--space-4);
        }
        .onboarding-card { background: var(--bg-card); border-radius: var(--radius-xl); box-shadow: var(--shadow-xl); width: 100%; max-width: 480px; overflow: hidden; }
        .onboarding-header { text-align: center; padding: var(--space-8) var(--space-8) var(--space-4); background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-800)); color: white; }
        .onboarding-logo { width: 56px; height: 56px; border-radius: var(--radius-lg); background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4); }
        .onboarding-header h1 { font-size: var(--font-size-xl); font-weight: 700; margin-bottom: var(--space-1); }
        .onboarding-header p { font-size: var(--font-size-sm); opacity: 0.85; }
      `}</style>
    </div>
  );
}
