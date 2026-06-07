import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Shield, User, Mail, Phone, Calendar, Lock, Check, Send, ArrowLeft } from 'lucide-react';
import { authAPI } from '../../services/api';
import { Spinner } from '../../components/ui';

export default function PatientRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('register'); // 'register' | 'verify'
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    dateOfBirth: '',
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password || !form.dateOfBirth) {
      toast.error('All fields are required');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const { name, email, password } = form;
    const res = await authAPI.patientRegister({ name, email, password });
    if (res.success) {
      toast.success('Registration successful! OTP sent to your email.');
      setStep('verify');
    } else {
      toast.error(res.error || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);
    const res = await authAPI.verifyOtp(form.email, otp);
    if (res.success) {
      toast.success('OTP verified successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } else {
      toast.error(res.error || 'OTP verification failed');
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    setResending(true);
    const res = await authAPI.resendOtp(form.email);
    if (res.success) {
      toast.success('OTP resent to your email');
    } else {
      toast.error(res.error || 'Failed to resend OTP');
    }
    setResending(false);
  };

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ maxWidth: '480px' }}
      >
        <div className="auth-card-header">
          <div className="auth-logo">
            <Shield size={28} />
          </div>
          <h1>{step === 'register' ? 'Patient Registration' : 'Verify Email'}</h1>
          <p>
            {step === 'register'
              ? 'Create your secure health profile'
              : `Enter the 6-digit verification code sent to ${form.email}`}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'register' ? (
            <motion.form
              key="register-form"
              onSubmit={handleRegister}
              className="auth-form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="input-group">
                <label>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    className="input-field"
                    type="text"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    style={{ paddingLeft: 36 }}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    className="input-field"
                    type="email"
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    style={{ paddingLeft: 36 }}
                    required
                  />
                </div>
              </div>

              <div className="grid-2-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="input-group">
                  <label>Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                      className="input-field"
                      type="tel"
                      placeholder="1234567890"
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      style={{ paddingLeft: 36, width: '100%' }}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Date of Birth</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                      className="input-field"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => setField('dateOfBirth', e.target.value)}
                      style={{ paddingLeft: 36, width: '100%', height: '38px' }}
                      required
                    />
                  </div>
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
                    onChange={(e) => setField('password', e.target.value)}
                    style={{ paddingLeft: 36 }}
                    required
                  />
                </div>
              </div>

              <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
                {loading ? <Spinner size={18} /> : <><Check size={18} /> Register Account</>}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="verify-form"
              onSubmit={handleVerifyOtp}
              className="auth-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="input-group">
                <label>One-Time Password (OTP)</label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ textAlign: 'center', letterSpacing: '0.25em', fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep('register')}
                  style={{ flex: 1 }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={loading}
                  style={{ flex: 2 }}
                >
                  {loading ? <Spinner size={16} /> : 'Verify & Activate'}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resending}
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--color-primary-600)', fontWeight: 500 }}
                >
                  {resending ? <Spinner size={14} /> : <><Send size={14} /> Resend OTP</>}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Sign In</Link></p>
        </div>
      </motion.div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-primary-50) 0%, var(--bg-secondary) 50%, var(--color-primary-100) 100%);
          padding: var(--space-6) var(--space-4);
        }
        .auth-card {
          background: var(--bg-card);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          width: 100%;
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
          padding: var(--space-2) var(--space-8) var(--space-6);
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
