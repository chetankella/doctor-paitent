import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Spinner } from '../../components/ui';
import { doctorAPI } from '../../services/api';

export default function RequestAccessPage() {
  const [form, setForm] = useState({ patientEmail: '', scope: 'FULL_PROFILE', reason: '', requestedDays: 14 });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patientEmail || !form.reason) {
      toast.error('Patient email and reason are required');
      return;
    }
    setSubmitting(true);
    const res = await doctorAPI.requestAccess(form);
    if (res.success) {
      toast.success('Access request sent! The patient will be notified.');
      setSubmitted(true);
    } else {
      toast.error(res.error || 'Failed to send request');
    }
    setSubmitting(false);
  };

  return (
    <DashboardLayout title="Request Access">
      <div className="page-header">
        <h1>Request Patient Access</h1>
        <p>Send an access request to a patient. They will be notified and can approve or reject your request.</p>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        {submitted ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
            <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-full)', background: 'var(--color-success-50)', color: 'var(--color-success-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
              <Send size={28} />
            </div>
            <h3 style={{ marginBottom: 'var(--space-2)' }}>Request Sent!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
              Your access request has been sent to <strong>{form.patientEmail}</strong>. You'll receive access once they approve.
            </p>
            <button className="btn btn-secondary" onClick={() => { setSubmitted(false); setForm({ patientEmail: '', scope: 'FULL_PROFILE', reason: '', requestedDays: 14 }); }}>
              Send Another Request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="card-header"><h3>Patient Access Request</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label>Patient Email *</label>
                <input className="input-field" type="email" placeholder="patient@email.com" value={form.patientEmail}
                  onChange={(e) => setForm(f => ({ ...f, patientEmail: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label>Requested Scope</label>
                <select className="input-field" value={form.scope}
                  onChange={(e) => setForm(f => ({ ...f, scope: e.target.value }))}>
                  <option value="SUMMARY">Summary — Basic medical info</option>
                  <option value="FULL_PROFILE">Full Profile — Complete medical data</option>
                  <option value="FULL_WITH_WRITE">Full + Write — With note-taking access</option>
                </select>
              </div>
              <div className="input-group">
                <label>Reason *</label>
                <textarea className="input-field" rows={3} placeholder="e.g., Follow-up cardiac consultation" value={form.reason}
                  onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))} required style={{ resize: 'vertical' }} />
              </div>
              <div className="input-group">
                <label>Requested Duration (days)</label>
                <input className="input-field" type="number" min="1" max="365" value={form.requestedDays}
                  onChange={(e) => setForm(f => ({ ...f, requestedDays: parseInt(e.target.value) || 14 }))} />
              </div>
            </div>
            <div className="card-footer">
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? <><Spinner size={16} /> Sending...</> : <><Send size={16} /> Send Request</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}
