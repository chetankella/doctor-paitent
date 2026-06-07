import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Shield, Mail, Lock, LogIn } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { authAPI } from '../../services/api';
import { Spinner } from '../../components/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error('Email and password are required'); return; }
    setLoading(true);
    const res = await authAPI.login(form.email, form.password);
    // Backend returns { token, organizations } at top level
    const token = res.data?.token || res.raw?.token;
    const organizations = res.raw?.organizations || res.data?.organizations || [];
    if (res.success && token) {
      login(token, organizations);
      toast.success('Welcome back!');
      // Navigate after Zustand state update
      const path = useAuthStore.getState().getDashboardPath();
      navigate(path, { replace: true });
    } else {
      toast.error(res.error || 'Invalid credentials');
    }
    setLoading(false);
  };


  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="auth-card-header">
          <div className="auth-logo">
            <Shield size={28} />
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to your HealthGuard account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                className="input-field"
                type="email"
                placeholder="you@email.com"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ paddingLeft: 36 }}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                className="input-field"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ paddingLeft: 36 }}
                required
              />
            </div>
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? <Spinner size={18} /> : <><LogIn size={18} /> Sign In</>}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/patient/register">Register as Patient</Link></p>
          <p><Link to="/emergency">Emergency Access →</Link></p>
        </div>
      </motion.div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-primary-50) 0%, var(--bg-secondary) 50%, var(--color-primary-100) 100%);
          padding: var(--space-4);
        }
        .auth-card {
          background: var(--bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          width: 100%;
          max-width: 420px;
          overflow: hidden;
        }
        .auth-card-header {
          text-align: center;
          padding: var(--space-8) var(--space-8) var(--space-4);
        }
        .auth-logo {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--color-primary-400), var(--color-primary-600));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto var(--space-4);
        }
        .auth-card-header h1 {
          font-size: var(--font-size-2xl);
          font-weight: var(--font-weight-bold);
          margin-bottom: var(--space-1);
        }
        .auth-card-header p {
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
        }
        .auth-form {
          padding: var(--space-4) var(--space-8) var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .auth-footer {
          text-align: center;
          padding: var(--space-4) var(--space-8) var(--space-6);
          border-top: 1px solid var(--border-light);
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
        }
        .auth-footer p { margin-bottom: var(--space-2); }
        .auth-footer a { color: var(--color-primary-600); font-weight: 500; }
      `}</style>
    </div>
  );
}
