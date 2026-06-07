import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Shield, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { deptAdminAPI } from '../../services/api';
import { Spinner } from '../../components/ui';

export default function DeptAdminSetupPage({ tokenOverride }) {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  // Supports: /create-department-admin?token=... AND /department-admin/setup/:token
  const token = tokenOverride || pathToken || searchParams.get('token') || '';
  const navigate = useNavigate();
  const [tokenData, setTokenData] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState(null);
  const [form, setForm] = useState({ name: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { setTokenError('Invalid or missing setup link.'); setTokenLoading(false); return; }
    deptAdminAPI.verifyToken(token).then(res => {
      if (res.success) setTokenData(res.data);
      else setTokenError(res.error || 'This setup link is invalid or has expired.');
      setTokenLoading(false);
    });
  }, [token]);

  const set = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    const res = await deptAdminAPI.setup({ token, name: form.name, password: form.password });
    if (res.success) {
      toast.success('Department Admin account activated!');
      setTimeout(() => navigate('/login'), 1500);
    } else {
      toast.error(res.error || 'Setup failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="setup-page">
      <motion.div className="setup-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="setup-header">
          <div className="setup-logo"><Shield size={22} /></div>
          <h1>Department Admin Setup</h1>
          <p>Activate your department administrator account</p>
        </div>

        <div style={{ padding: 'var(--space-6)' }}>
          {tokenLoading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-10)' }}><Spinner size={28} /></div>
          ) : tokenError ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <AlertCircle size={48} style={{ color: 'var(--color-danger-500)', margin: '0 auto var(--space-4)' }} />
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Invalid Link</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>{tokenError}</p>
              <Link to="/login" className="btn btn-secondary">Back to Login</Link>
            </div>
          ) : (
            <>
              {/* Department Info Banner */}
              {(tokenData?.departmentName || tokenData?.organizationName) && (
                <div style={{ padding: 'var(--space-4)', background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <CheckCircle size={20} style={{ color: 'var(--color-primary-600)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-primary-700)' }}>
                        {tokenData.departmentName || 'Your Department'}
                      </div>
                      {tokenData.organizationName && (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{tokenData.organizationName}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="input-group">
                  <label>Full Name *</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input className="input-field" placeholder="Your full name" value={form.name} onChange={e => set('name', e.target.value)} style={{ paddingLeft: 36 }} required />
                  </div>
                </div>

                <div className="input-group">
                  <label>Password *</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input className="input-field" type={showPass ? 'text' : 'password'} placeholder="Min 8 characters"
                      value={form.password} onChange={e => set('password', e.target.value)} style={{ paddingLeft: 36, paddingRight: 40 }} required />
                    <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--text-tertiary)' }}>
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label>Confirm Password *</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input className="input-field" type={showPass ? 'text' : 'password'} placeholder="Re-enter password"
                      value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} style={{ paddingLeft: 36 }} required />
                  </div>
                </div>

                <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
                  {loading ? <Spinner size={18} /> : 'Activate Account'}
                </button>
              </form>
            </>
          )}
        </div>

        <div style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border-light)', textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>Already set up? Sign In</Link>
        </div>
      </motion.div>

      <style>{`
        .setup-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--color-primary-50) 0%, var(--bg-secondary) 60%, var(--color-primary-100) 100%); padding: var(--space-6) var(--space-4); }
        .setup-card { background: var(--bg-card); border-radius: var(--radius-xl); box-shadow: var(--shadow-xl); width: 100%; max-width: 460px; overflow: hidden; }
        .setup-header { text-align: center; padding: var(--space-8) var(--space-8) var(--space-4); background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-800)); color: white; }
        .setup-logo { width: 56px; height: 56px; border-radius: var(--radius-lg); background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4); }
        .setup-header h1 { font-size: var(--font-size-xl); font-weight: 700; margin-bottom: var(--space-1); }
        .setup-header p { font-size: var(--font-size-sm); opacity: 0.85; }
      `}</style>
    </div>
  );
}
