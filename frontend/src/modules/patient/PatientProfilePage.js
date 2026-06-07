import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Spinner } from '../../components/ui';
import { patientAPI } from '../../services/api';

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
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    if (res.success) toast.success('Profile updated!');
    else toast.error(res.error || 'Failed to update profile');
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
    return <DashboardLayout title="My Profile"><div style={{ textAlign: 'center', padding: 'var(--space-16)' }}><Spinner size={32} /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout title="My Profile">
      <div className="page-header">
        <div>
          <h1>Medical Profile</h1>
          <p>Keep your medical information up to date for accurate emergency access</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ alignSelf: 'flex-start' }}>
          {saving ? <Spinner size={16} /> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>

      <div className="grid-2">
        {/* Basic Info */}
        <div className="card">
          <div className="card-header"><h3>Basic Information</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {FIELDS.map(f => (
              <div className="input-group" key={f.key}>
                <label>{f.label}</label>
                {f.type === 'select' ? (
                  <select className="input-field" value={profile[f.key] || ''} onChange={e => updateField(f.key, e.target.value)}>
                    <option value="">Select...</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="input-field" type={f.type} value={profile[f.key] || ''} onChange={e => updateField(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Contact + Lifestyle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card">
            <div className="card-header"><h3>Emergency Contact</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[{ key: 'name', label: 'Name' }, { key: 'relation', label: 'Relation' }, { key: 'phone', label: 'Phone' }].map(f => (
                <div className="input-group" key={f.key}>
                  <label>{f.label}</label>
                  <input className="input-field" value={profile.emergencyContact?.[f.key] || ''}
                    onChange={e => setProfile(p => ({ ...p, emergencyContact: { ...p.emergencyContact, [f.key]: e.target.value } }))} />
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3>Lifestyle</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="input-group">
                <label>Smoking</label>
                <select className="input-field" value={profile.lifestyle?.smoking || 'never'}
                  onChange={e => setProfile(p => ({ ...p, lifestyle: { ...p.lifestyle, smoking: e.target.value } }))}>
                  <option value="never">Never</option><option value="former">Former</option><option value="current">Current</option>
                </select>
              </div>
              <div className="input-group">
                <label>Alcohol</label>
                <select className="input-field" value={profile.lifestyle?.alcohol || 'none'}
                  onChange={e => setProfile(p => ({ ...p, lifestyle: { ...p.lifestyle, alcohol: e.target.value } }))}>
                  <option value="none">None</option><option value="occasional">Occasional</option><option value="regular">Regular</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* List fields */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        <div className="grid-2">
          {LIST_FIELDS.map(lf => (
            <div className="card" key={lf.key}>
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
                        <input className="input-field" style={{ flex: 1 }} value={item} placeholder={lf.placeholder}
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
