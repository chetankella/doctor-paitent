import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Shield, Building2, Mail, MapPin, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { orgAPI } from '../../services/api';
import { Spinner } from '../../components/ui';

const STEPS = ['Organization', 'Contact', 'Admin'];

// Must match backend validation: "HOSPITAL" | "CLINIC" | "LAB" | "TELEMEDICINE"
const ORG_TYPES = ['HOSPITAL', 'CLINIC', 'LAB', 'TELEMEDICINE'];

const initialForm = {
  // Step 1: Org Info — backend field: "name", "type"
  name: '',
  type: 'CLINIC',
  description: '',
  clinicalEstablishmentNumber: '',
  GSTNumber: '',
  PANNumber: '',
  NABHAccreditationNumber: '',
  // Step 2: Contact — backend requires country, pincode (digits only)
  contactPhone: '',       // digits only, 10-15 digits
  contactEmail: '',
  website: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  country: 'India',       // required field, default India
  pincode: '',            // 5-10 digits
  // Step 3: Super Admin — backend requires superAdminEmail, superAdminName, superAdminPhone
  superAdminName: '',
  superAdminEmail: '',
  superAdminPhone: '',    // digits only, 10-15 digits
};

function validate(step, form) {
  if (step === 0) {
    if (!form.name || form.name.length < 3) return 'Organization name must be at least 3 characters';
    if (!form.type) return 'Organization type is required';
  }
  if (step === 1) {
    if (!form.contactEmail) return 'Contact email is required';
    if (!form.contactPhone || !/^[0-9]{10,15}$/.test(form.contactPhone)) return 'Contact phone must be 10-15 digits (numbers only)';
    if (!form.addressLine1) return 'Address is required';
    if (!form.city) return 'City is required';
    if (!form.state) return 'State is required';
    if (!form.country) return 'Country is required';
    if (!form.pincode || !/^[0-9]{5,10}$/.test(form.pincode)) return 'Pincode must be 5-10 digits';
  }
  if (step === 2) {
    if (!form.superAdminName || form.superAdminName.length < 3) return 'Super Admin name must be at least 3 characters';
    if (!form.superAdminEmail) return 'Super Admin email is required';
    if (!form.superAdminPhone || !/^[0-9]{10,15}$/.test(form.superAdminPhone)) return 'Super Admin phone must be 10-15 digits (numbers only)';
  }
  return null;
}

export default function OrgRequestPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setField = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const nextStep = () => {
    const err = validate(step, form);
    if (err) { toast.error(err); return; }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    const err = validate(2, form);
    if (err) { toast.error(err); return; }
    setLoading(true);
    // Send only fields backend expects — strip empty strings for optional fields
    const payload = {
      name: form.name.trim(),
      type: form.type,
      contactPhone: form.contactPhone.trim(),
      contactEmail: form.contactEmail.trim(),
      addressLine1: form.addressLine1.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: form.country.trim(),
      pincode: form.pincode.trim(),
      superAdminName: form.superAdminName.trim(),
      superAdminEmail: form.superAdminEmail.trim(),
      superAdminPhone: form.superAdminPhone.trim(),
      // Optional fields — only include if filled
      ...(form.description && { description: form.description }),
      ...(form.addressLine2 && { addressLine2: form.addressLine2 }),
      ...(form.website && { website: form.website }),
      ...(form.GSTNumber && { GSTNumber: form.GSTNumber }),
      ...(form.PANNumber && { PANNumber: form.PANNumber }),
      ...(form.NABHAccreditationNumber && { NABHAccreditationNumber: form.NABHAccreditationNumber }),
      ...(form.clinicalEstablishmentNumber && { clinicalEstablishmentNumber: form.clinicalEstablishmentNumber }),
    };
    const res = await orgAPI.submitRequest(payload);
    if (res.success) {
      setSubmitted(true);
    } else {
      toast.error(res.error || 'Failed to submit request');
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="onboarding-page">
        <motion.div className="onboarding-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-full)', background: 'var(--color-success-50)', color: 'var(--color-success-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-6)' }}>
              <Check size={36} />
            </div>
            <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Request Submitted!</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
              Your organization registration request has been received. Our team will review it and send an approval email to <strong>{form.superAdminEmail}</strong>.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => navigate('/organization/request/status')}>Check Status</button>
              <button className="btn btn-secondary" onClick={() => navigate('/login')}>Back to Login</button>
            </div>
          </div>
        </motion.div>
        <OnboardingStyles />
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      <motion.div className="onboarding-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-logo"><Shield size={22} /></div>
          <h1>Register Your Organization</h1>
          <p>Join HealthGuard as a verified healthcare provider</p>
        </div>

        {/* Stepper */}
        <div className="onboarding-stepper">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <div className={`step-item ${i <= step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                <div className="step-circle">{i < step ? <Check size={14} /> : i + 1}</div>
                <span className="step-label">{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`step-line ${i < step ? 'done' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="onboarding-body">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>

              {step === 0 && (
                <div className="form-grid">
                  <h3 className="step-title"><Building2 size={18} /> Organization Details</h3>
                  <div className="input-group">
                    <label>Organization Name *</label>
                    <input className="input-field" placeholder="e.g. City General Hospital" value={form.name} onChange={e => setField('name', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>Organization Type *</label>
                    <select className="input-field" value={form.type} onChange={e => setField('type', e.target.value)}>
                      {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Description</label>
                    <textarea className="input-field" rows={2} placeholder="Brief description of your organization" value={form.description} onChange={e => setField('description', e.target.value)} style={{ resize: 'vertical' }} />
                  </div>
                  <div className="form-row">
                    <div className="input-group">
                      <label>Clinical Est. Number</label>
                      <input className="input-field" placeholder="e.g. CEN-XXXX" value={form.clinicalEstablishmentNumber} onChange={e => setField('clinicalEstablishmentNumber', e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label>GST Number</label>
                      <input className="input-field" placeholder="GST No." value={form.GSTNumber} onChange={e => setField('GSTNumber', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="input-group">
                      <label>PAN Number</label>
                      <input className="input-field" placeholder="e.g. ABCDE1234F" value={form.PANNumber} onChange={e => setField('PANNumber', e.target.value.toUpperCase())} maxLength={10} />
                    </div>
                    <div className="input-group">
                      <label>NABH Accreditation No.</label>
                      <input className="input-field" placeholder="NABH No. (if applicable)" value={form.NABHAccreditationNumber} onChange={e => setField('NABHAccreditationNumber', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="form-grid">
                  <h3 className="step-title"><MapPin size={18} /> Contact & Location</h3>
                  <div className="form-row">
                    <div className="input-group">
                      <label>Contact Email *</label>
                      <input className="input-field" type="email" placeholder="contact@hospital.com" value={form.contactEmail} onChange={e => setField('contactEmail', e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label>Contact Phone * <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>(digits only)</span></label>
                      <input className="input-field" placeholder="10-15 digits, e.g. 9876543210" value={form.contactPhone}
                        onChange={e => setField('contactPhone', e.target.value.replace(/\D/g, ''))} maxLength={15} />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Website</label>
                    <input className="input-field" placeholder="https://hospital.com" value={form.website} onChange={e => setField('website', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>Address Line 1 *</label>
                    <input className="input-field" placeholder="Street, Building" value={form.addressLine1} onChange={e => setField('addressLine1', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>Address Line 2</label>
                    <input className="input-field" placeholder="Landmark, Area" value={form.addressLine2} onChange={e => setField('addressLine2', e.target.value)} />
                  </div>
                  <div className="form-row">
                    <div className="input-group">
                      <label>City *</label>
                      <input className="input-field" placeholder="City" value={form.city} onChange={e => setField('city', e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label>State *</label>
                      <input className="input-field" placeholder="State" value={form.state} onChange={e => setField('state', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="input-group">
                      <label>Country *</label>
                      <input className="input-field" placeholder="India" value={form.country} onChange={e => setField('country', e.target.value)} />
                    </div>
                    <div className="input-group" style={{ maxWidth: 140 }}>
                      <label>Pincode * <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>(digits)</span></label>
                      <input className="input-field" placeholder="6 digits" value={form.pincode}
                        onChange={e => setField('pincode', e.target.value.replace(/\D/g, ''))} maxLength={10} />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="form-grid">
                  <h3 className="step-title"><Mail size={18} /> Super Admin Details</h3>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                    This person will receive the setup email and become the primary administrator of your organization.
                  </p>
                  <div className="input-group">
                    <label>Full Name * <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>(min 3 chars)</span></label>
                    <input className="input-field" placeholder="Dr. Jane Smith" value={form.superAdminName} onChange={e => setField('superAdminName', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>Email Address *</label>
                    <input className="input-field" type="email" placeholder="admin@hospital.com" value={form.superAdminEmail} onChange={e => setField('superAdminEmail', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>Phone * <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>(digits only, 10-15 digits)</span></label>
                    <input className="input-field" placeholder="e.g. 9876543210" value={form.superAdminPhone}
                      onChange={e => setField('superAdminPhone', e.target.value.replace(/\D/g, ''))} maxLength={15} />
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="onboarding-footer">
          <div>
            {step > 0 && (
              <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft size={16} /> Back
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <Link to="/login" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>Already registered?</Link>
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={nextStep}>
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? <><Spinner size={16} /> Submitting...</> : <><Check size={16} /> Submit Request</>}
              </button>
            )}
          </div>
        </div>
      </motion.div>
      <OnboardingStyles />
    </div>
  );
}

function OnboardingStyles() {
  return (
    <style>{`
      .onboarding-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--color-primary-50) 0%, var(--bg-secondary) 60%, var(--color-primary-100) 100%); padding: var(--space-6) var(--space-4); }
      .onboarding-card { background: var(--bg-card); border-radius: var(--radius-xl); box-shadow: var(--shadow-xl); width: 100%; max-width: 600px; overflow: hidden; }
      .onboarding-header { text-align: center; padding: var(--space-8) var(--space-8) var(--space-4); background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-800)); color: white; }
      .onboarding-logo { width: 56px; height: 56px; border-radius: var(--radius-lg); background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4); backdrop-filter: blur(4px); }
      .onboarding-header h1 { font-size: var(--font-size-xl); font-weight: 700; margin-bottom: var(--space-1); }
      .onboarding-header p { font-size: var(--font-size-sm); opacity: 0.85; }
      .onboarding-stepper { display: flex; align-items: center; padding: var(--space-5) var(--space-6); border-bottom: 1px solid var(--border-light); }
      .step-item { display: flex; align-items: center; gap: var(--space-2); }
      .step-circle { width: 28px; height: 28px; border-radius: var(--radius-full); border: 2px solid var(--border-medium); background: var(--bg-primary); color: var(--text-tertiary); display: flex; align-items: center; justify-content: center; font-size: var(--font-size-xs); font-weight: 600; transition: all var(--transition-base); }
      .step-item.active .step-circle { border-color: var(--color-primary-600); color: var(--color-primary-600); }
      .step-item.done .step-circle { background: var(--color-primary-600); border-color: var(--color-primary-600); color: white; }
      .step-label { font-size: var(--font-size-sm); color: var(--text-tertiary); font-weight: 500; }
      .step-item.active .step-label { color: var(--color-primary-700); }
      .step-line { flex: 1; height: 2px; background: var(--border-light); margin: 0 var(--space-3); transition: background var(--transition-base); }
      .step-line.done { background: var(--color-primary-500); }
      .onboarding-body { padding: var(--space-6); min-height: 280px; }
      .onboarding-footer { padding: var(--space-4) var(--space-6); border-top: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; }
      .step-title { display: flex; align-items: center; gap: var(--space-2); font-size: var(--font-size-base); font-weight: 600; color: var(--text-primary); margin-bottom: var(--space-4); }
      .form-grid { display: flex; flex-direction: column; gap: var(--space-4); }
      .form-row { display: flex; gap: var(--space-4); }
      .form-row .input-group { flex: 1; }
      @media (max-width: 480px) { .form-row { flex-direction: column; } .onboarding-stepper { padding: var(--space-4); } .step-label { display: none; } }
    `}</style>
  );
}
