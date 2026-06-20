import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, ChevronRight, Edit3, HeartHandshake, 
  Hospital, Video, FlaskConical, Pill, Users, 
  FileText, CreditCard, Headphones, UserCircle, X,
  ArrowLeft
} from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Spinner } from '../../components/ui';
import { patientAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';

const FIELDS = [
  { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['male', 'female', 'other'] },
  { key: 'bloodGroup', label: 'Blood Group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  { key: 'phoneNumber', label: 'Phone Number', type: 'text' },
  { key: 'heightCm', label: 'Height (cm)', type: 'number' },
  { key: 'weightKg', label: 'Weight (kg)', type: 'number' },
];

const LIST_FIELDS = [
  { key: 'allergies', label: 'Allergies', placeholder: 'e.g., Penicillin' },
  { key: 'chronicConditions', label: 'Chronic Conditions', placeholder: 'e.g., Diabetes' },
  { key: 'currentMedications', label: 'Current Medications', placeholder: 'e.g., Metformin 500mg' },
  { key: 'pastSurgeries', label: 'Past Surgeries', placeholder: 'e.g., Appendectomy 2015' },
  { key: 'familyHistory', label: 'Family History', placeholder: 'e.g., Father - Heart disease' },
];

export default function PatientProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const res = await patientAPI.getProfile();
    if (res.success && res.data) {
      const d = res.data;
      setProfile({
        dateOfBirth: d.dateOfBirth ? d.dateOfBirth.split('T')[0] : '',
        gender: d.gender || '',
        bloodGroup: d.bloodGroup || '',
        phoneNumber: d.phoneNumber || '',
        heightCm: d.heightCm || '',
        weightKg: d.weightKg || '',
        allergies: d.allergies || [],
        chronicConditions: d.chronicConditions || [],
        currentMedications: d.currentMedications || [],
        pastSurgeries: d.pastSurgeries || [],
        familyHistory: d.familyHistory || [],
        emergencyContact: d.emergencyContact || { name: '', relation: '', phone: '' },
        lifestyle: d.lifestyle || { smoking: 'never', alcohol: 'none' },
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSave = async () => {
    setSaving(true);
    const res = await patientAPI.updateProfile(profile);
    if (res.success) {
      toast.success('Profile updated!');
      setIsEditing(false);
    } else {
      toast.error(res.error || 'Failed to update profile');
    }
    setSaving(false);
  };

  const updateField = (key, value) => setProfile(p => ({ ...p, [key]: value }));

  const updateListField = (key, index, value) => {
    const list = [...(profile[key] || [])];
    list[index] = value;
    setProfile(p => ({ ...p, [key]: list }));
  };

  const addListItem = (key) => setProfile(p => ({ ...p, [key]: [...(p[key] || []), ''] }));
  const removeListItem = (key, index) => setProfile(p => ({ ...p, [key]: (p[key] || []).filter((_, i) => i !== index) }));

  if (loading) {
    return <DashboardLayout title="Account"><div style={{ textAlign: 'center', padding: 'var(--space-16)' }}><Spinner size={32} /></div></DashboardLayout>;
  }

  // ─── Edit Profile Form View ───
  if (isEditing) {
    return (
      <DashboardLayout title="Edit Profile">
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%', backgroundColor: '#f1f5f9' }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '20px' }}>Medical Profile</h1>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Keep your medical information up to date</p>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ borderRadius: '999px', padding: '10px 20px' }}>
            {saving ? <Spinner size={16} /> : 'Save'}
          </button>
        </div>

        <div className="grid-2">
          {/* Basic Info */}
          <div className="card" style={{ borderRadius: '24px' }}>
            <div className="card-header"><h3>Basic Information</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {FIELDS.map(f => (
                <div className="input-group" key={f.key}>
                  <label>{f.label}</label>
                  {f.type === 'select' ? (
                    <select className="input-field" style={{ borderRadius: '12px' }} value={profile[f.key] || ''} onChange={e => updateField(f.key, e.target.value)}>
                      <option value="">Select...</option>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="input-field" style={{ borderRadius: '12px' }} type={f.type} value={profile[f.key] || ''} onChange={e => updateField(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Contact + Lifestyle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="card" style={{ borderRadius: '24px' }}>
              <div className="card-header"><h3>Emergency Contact</h3></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[{ key: 'name', label: 'Name' }, { key: 'relation', label: 'Relation' }, { key: 'phone', label: 'Phone' }].map(f => (
                  <div className="input-group" key={f.key}>
                    <label>{f.label}</label>
                    <input className="input-field" style={{ borderRadius: '12px' }} value={profile.emergencyContact?.[f.key] || ''}
                      onChange={e => setProfile(p => ({ ...p, emergencyContact: { ...p.emergencyContact, [f.key]: e.target.value } }))} />
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ borderRadius: '24px' }}>
              <div className="card-header"><h3>Lifestyle</h3></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="input-group">
                  <label>Smoking</label>
                  <select className="input-field" style={{ borderRadius: '12px' }} value={profile.lifestyle?.smoking || 'never'}
                    onChange={e => setProfile(p => ({ ...p, lifestyle: { ...p.lifestyle, smoking: e.target.value } }))}>
                    <option value="never">Never</option><option value="former">Former</option><option value="current">Current</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Alcohol</label>
                  <select className="input-field" style={{ borderRadius: '12px' }} value={profile.lifestyle?.alcohol || 'none'}
                    onChange={e => setProfile(p => ({ ...p, lifestyle: { ...p.lifestyle, alcohol: e.target.value } }))}>
                    <option value="none">None</option><option value="occasional">Occasional</option><option value="regular">Regular</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* List fields */}
        <div style={{ marginTop: 'var(--space-6)', paddingBottom: '100px' }}>
          <div className="grid-2">
            {LIST_FIELDS.map(lf => (
              <div className="card" key={lf.key} style={{ borderRadius: '24px' }}>
                <div className="card-header">
                  <h3>{lf.label}</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => addListItem(lf.key)}>+ Add</button>
                </div>
                <div className="card-body">
                  {(profile[lf.key] || []).length === 0 ? (
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-4)' }}>No items added</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {(profile[lf.key] || []).map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <input className="input-field" style={{ flex: 1, borderRadius: '12px' }} value={item} placeholder={lf.placeholder}
                            onChange={e => updateListField(lf.key, i, e.target.value)} />
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger-500)' }}
                            onClick={() => removeListItem(lf.key, i)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Profile Hub View ───
  const historyItems = [
    { icon: Hospital, label: 'In Person Appointments' },
    { icon: Video, label: 'Video Consultations' },
    { icon: FlaskConical, label: 'Test Bookings' },
    { icon: Pill, label: 'Medicine Orders' },
    { icon: Users, label: 'My Doctors' },
    { icon: FileText, label: 'Medical Records' },
    { icon: CreditCard, label: 'Payments & HealthCash' },
  ];

  return (
    <DashboardLayout title="Account">
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Profile Header Card */}
        <div style={{ 
          backgroundColor: 'white', borderRadius: '32px', padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#1e3a8a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(user?.name || 'Patient')}&backgroundColor=1e3a8a`}
                alt="Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
              {user?.name || 'Patient User'}
            </h2>
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            style={{ 
              background: 'none', border: 'none', fontSize: '13px', fontWeight: 700, 
              color: '#0ea5e9', cursor: 'pointer', padding: '8px', letterSpacing: '0.05em' 
            }}
          >
            EDIT
          </button>
        </div>

        {/* Care Plan Banner */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)',
          borderRadius: '24px', padding: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 8px 24px rgba(30, 58, 138, 0.2)',
          color: 'white', cursor: 'pointer'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              width: 44, height: 44, borderRadius: '12px', background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <HeartHandshake size={24} color="#f59e0b" />
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#fde68a' }}>Care Plan</h3>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>12 FREE Appointments for a Year</p>
            </div>
          </div>
          <ChevronRight size={20} style={{ opacity: 0.7 }} />
        </div>

        {/* My History Section */}
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#64748b', margin: '0 0 12px 16px' }}>
            My History
          </h3>
          <div style={{ backgroundColor: 'white', borderRadius: '32px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            {historyItems.map((item, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 24px', cursor: 'pointer',
                  borderBottom: idx < historyItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <item.icon size={22} color="#334155" strokeWidth={1.5} />
                  <span style={{ fontSize: '15px', fontWeight: 500, color: '#1e293b' }}>{item.label}</span>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>
            ))}
          </div>
        </div>

        {/* Help & Support Section */}
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#64748b', margin: '0 0 12px 16px' }}>
            Help & Support
          </h3>
          <div style={{ backgroundColor: 'white', borderRadius: '32px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div 
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 24px', cursor: 'pointer', transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Headphones size={22} color="#334155" strokeWidth={1.5} />
                <span style={{ fontSize: '15px', fontWeight: 500, color: '#1e293b' }}>Help Center</span>
              </div>
              <ChevronRight size={18} color="#94a3b8" />
            </div>
          </div>
        </div>

        {/* Extra spacing for bottom nav */}
        <div style={{ height: '80px' }} />
      </div>
    </DashboardLayout>
  );
}
