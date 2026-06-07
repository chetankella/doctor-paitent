import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Users, GitBranch, Plus, Mail, Stethoscope,
  RefreshCw,
  UserPlus, FolderOpen, Activity, Clock, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { EmptyState, Spinner, Skeleton } from '../../components/ui';
import Modal from '../../components/ui/Modal';
import useAuthStore from '../../store/authStore';
import { orgAPI, departmentAPI } from '../../services/api';

// ─── Doctor Roles (org.validation inviteDoctorSchema) ───
const DOCTOR_ROLES = ['OWNER', 'CONSULTANT', 'RESIDENT'];

// ─── Initial form states ───
const initialDeptForm = { departmentName: '', departmentEmail: '', description: '', adminEmail: '' };
const initialDoctorForm = { email: '', departmentId: '', role: 'CONSULTANT' };
const initialStaffForm = { email: '', departmentId: '', designation: '' };

const DESIGNATIONS = ['Nurse', 'Receptionist', 'Lab Technician', 'Pharmacist',
  'Radiologist', 'Ward Boy', 'Billing Staff', 'Admin Staff', 'Other'];

// ─── Animated Metric Card ───
function MetricCard({ icon: Icon, iconColor, value, label, loading, onClick }) {
  const colorMap = {
    blue: { bg: 'rgba(59,130,246,0.1)', text: '#2563eb', border: 'rgba(59,130,246,0.2)' },
    green: { bg: 'rgba(34,197,94,0.1)', text: '#16a34a', border: 'rgba(34,197,94,0.2)' },
    orange: { bg: 'rgba(249,115,22,0.1)', text: '#ea580c', border: 'rgba(249,115,22,0.2)' },
    purple: { bg: 'rgba(139,92,246,0.1)', text: '#7c3aed', border: 'rgba(139,92,246,0.2)' },
    red: { bg: 'rgba(239,68,68,0.1)', text: '#dc2626', border: 'rgba(239,68,68,0.2)' },
  };
  const c = colorMap[iconColor] || colorMap.blue;

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${c.border}`,
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-5)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all var(--transition-base)',
      }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-lg)',
          background: c.bg, color: c.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={22} />
        </div>
        {onClick && <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />}
      </div>
      <div style={{ marginTop: 'var(--space-3)' }}>
        {loading
          ? <Skeleton width="60%" height={28} style={{ marginBottom: 4 }} />
          : <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value ?? '—'}</div>
        }
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>{label}</div>
      </div>
    </motion.div>
  );
}

export default function OrgSuperAdminDashboardPage() {
  const { user, organizations: storedOrgs } = useAuthStore();
  const navigate = useNavigate();

  // Data state
  const [org, setOrg] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  // Modal state
  const [modal, setModal] = useState(null);
  const [deptForm, setDeptForm] = useState(initialDeptForm);
  const [doctorForm, setDoctorForm] = useState(initialDoctorForm);
  const [staffForm, setStaffForm] = useState(initialStaffForm);

  const loadData = useCallback(async () => {
    setLoading(true);

    // Resolve org from cached login organizations first, then fallback to API
    let fetchedOrg = null;
    if (storedOrgs && storedOrgs.length > 0) {
      const firstOrg = storedOrgs[0];
      fetchedOrg = { _id: firstOrg.id || firstOrg._id, ...firstOrg };
      setOrg(fetchedOrg);
    } else {
      const orgRes = await orgAPI.listMine();
      if (orgRes.success) {
        const orgs = Array.isArray(orgRes.data) ? orgRes.data : [orgRes.data];
        fetchedOrg = orgs[0] || null;
        setOrg(fetchedOrg);
      }
    }

    if (fetchedOrg) {
      const orgId = fetchedOrg._id || fetchedOrg.id;
      const [deptRes, analyticsRes] = await Promise.all([
        departmentAPI.list(orgId),
        orgAPI.getAnalytics(orgId),
      ]);
      if (deptRes.success) {
        const data = deptRes.data;
        setDepartments(Array.isArray(data) ? data : []);
      }
      if (analyticsRes.success) {
        setAnalytics(analyticsRes.data);
      }
    }
    setLoading(false);
  }, [storedOrgs]);

  useEffect(() => { loadData(); }, [loadData]);

  // Create Department
  const handleCreateDept = async () => {
    if (!deptForm.departmentName.trim()) { toast.error('Department name is required'); return; }
    if (!deptForm.departmentEmail.trim()) { toast.error('Department email is required'); return; }
    const orgId = org?._id || org?.id;
    if (!orgId) { toast.error('Organization not loaded yet'); return; }
    setActing(true);
    const res = await departmentAPI.create(orgId, {
      departmentName: deptForm.departmentName.trim(),
      departmentEmail: deptForm.departmentEmail.trim(),
      description: deptForm.description.trim() || undefined,
      adminEmail: deptForm.adminEmail.trim() || undefined,
    });
    if (res.success) {
      toast.success(`Department "${deptForm.departmentName}" created!${res.data?.invite ? ' Invite sent to department admin.' : ''}`);
      setDeptForm(initialDeptForm);
      setModal(null);
      loadData();
    } else toast.error(res.error || 'Failed to create department');
    setActing(false);
  };

  // Invite Doctor
  const handleInviteDoctor = async () => {
    if (!doctorForm.email.trim()) { toast.error('Doctor email is required'); return; }
    const orgId = org?._id || org?.id;
    if (!orgId) { toast.error('Organization not loaded'); return; }
    setActing(true);
    const res = await orgAPI.inviteDoctor(orgId, {
      email: doctorForm.email.trim(),
      role: doctorForm.role,
      departmentId: doctorForm.departmentId || undefined,
    });
    if (res.success) {
      toast.success(`Invite sent to ${doctorForm.email}`);
      setDoctorForm(initialDoctorForm);
      setModal(null);
      loadData();
    } else toast.error(res.error || 'Failed to send doctor invite');
    setActing(false);
  };

  // Invite Staff
  const handleInviteStaff = async () => {
    if (!staffForm.email.trim()) { toast.error('Staff email is required'); return; }
    if (!staffForm.designation.trim()) { toast.error('Designation is required'); return; }
    const orgId = org?._id || org?.id;
    if (!orgId) { toast.error('Organization not loaded'); return; }
    setActing(true);
    const res = await orgAPI.inviteStaff(orgId, {
      email: staffForm.email.trim(),
      designation: staffForm.designation,
      departmentId: staffForm.departmentId || undefined,
    });
    if (res.success) {
      toast.success(`Invite sent to ${staffForm.email}`);
      setStaffForm(initialStaffForm);
      setModal(null);
      loadData();
    } else toast.error(res.error || 'Failed to send staff invite');
    setActing(false);
  };

  const setDF = (k, v) => setDeptForm(f => ({ ...f, [k]: v }));
  const setDrF = (k, v) => setDoctorForm(f => ({ ...f, [k]: v }));
  const setStF = (k, v) => setStaffForm(f => ({ ...f, [k]: v }));

  const orgName = org?.name || user?.name || 'Your Organization';

  const metrics = [
    { icon: GitBranch, iconColor: 'blue', value: analytics?.departments ?? departments.length, label: 'Departments', key: 'departments' },
    { icon: Stethoscope, iconColor: 'green', value: analytics?.doctors, label: 'Doctors', onClick: () => navigate('/org/team') },
    { icon: Users, iconColor: 'purple', value: analytics?.staff, label: 'Staff Members', onClick: () => navigate('/org/team') },
    { icon: Clock, iconColor: 'orange', value: analytics?.pendingInvites, label: 'Pending Invites', onClick: () => navigate('/org/invites') },
    { icon: Activity, iconColor: 'red', value: analytics?.activeUsers, label: 'Active Users' },
  ];

  return (
    <DashboardLayout title="Organization Dashboard">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h1>{orgName}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              {org?.type ? org.type.replace(/_/g, ' ') : 'Healthcare Organization'}{org?.city ? ` · ${org.city}` : ''}{org?.state ? `, ${org.state}` : ''}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={loadData} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Quick Actions Bar ── */}
      <div style={{
        display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap',
        marginBottom: 'var(--space-6)',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-xl)',
      }}>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', marginRight: 'var(--space-2)', fontWeight: 500 }}>Quick Actions:</span>
        <button className="btn btn-primary btn-sm" onClick={() => { setDeptForm(initialDeptForm); setModal('add-dept'); }}>
          <Plus size={13} /> Add Department
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => { setDoctorForm(initialDoctorForm); setModal('invite-doctor'); }}>
          <Stethoscope size={13} /> Invite Doctor
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => { setStaffForm(initialStaffForm); setModal('invite-staff'); }}>
          <UserPlus size={13} /> Invite Staff
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/org/invites')}>
          <Mail size={13} /> View Invites
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/org/team')}>
          <Users size={13} /> View Team
        </button>
      </div>

      {/* ── Metrics Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {metrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <MetricCard {...m} loading={loading} />
          </motion.div>
        ))}
      </div>

      {/* ── Organization Info Card ── */}
      {!loading && org && (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="card-header"><h3><Building2 size={18} /> Organization Details</h3></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
              {[
                ['Name', org.name],
                ['Type', org.type],
                ['Contact Email', org.contactEmail],
                ['Contact Phone', org.contactPhone],
                ['Address', [org.addressLine1, org.city, org.state, org.country].filter(Boolean).join(', ')],
                ['GST', org.GSTNumber || '—'],
                ['PAN', org.PANNumber || '—'],
                ['NABH', org.NABHAccreditationNumber || '—'],
              ].map(([label, value]) => value && (
                <div key={label}>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-1)' }}>{label}</div>
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Departments Section ── */}
      <div className="card">
        <div className="card-header">
          <h3><GitBranch size={18} /> Departments</h3>
          <button className="btn btn-primary btn-sm" onClick={() => { setDeptForm(initialDeptForm); setModal('add-dept'); }}>
            <Plus size={14} /> Add Department
          </button>
        </div>

        {loading ? (
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ padding: 'var(--space-4)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)' }}>
                  <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
                  <Skeleton width="40%" height={12} style={{ marginBottom: 12 }} />
                  <Skeleton width="100%" height={12} />
                </div>
              ))}
            </div>
          </div>
        ) : departments.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="No Departments Yet"
            description="Create your first department to start building your organization hierarchy"
            action={<button className="btn btn-primary btn-sm" onClick={() => { setDeptForm(initialDeptForm); setModal('add-dept'); }}><Plus size={14} /> Add First Department</button>}
          />
        ) : (
          <div className="card-body" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
              {departments.map((dept, i) => (
                <motion.div key={dept._id || i}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -2 }}
                  style={{
                    padding: 'var(--space-4)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-secondary)',
                    transition: 'all var(--transition-fast)',
                  }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-50)', color: 'var(--color-primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FolderOpen size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{dept.departmentName || dept.name}</div>
                        {dept.departmentCode && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{dept.departmentCode}</div>}
                      </div>
                    </div>
                    <span className={`badge ${dept.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                      {dept.status || 'ACTIVE'}
                    </span>
                  </div>

                  {/* Doctor & Staff counts */}
                  <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      <Stethoscope size={12} />
                      <span><strong>{dept.doctorCount ?? 0}</strong> Doctors</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      <Users size={12} />
                      <span><strong>{dept.staffCount ?? 0}</strong> Staff</span>
                    </div>
                  </div>

                  {dept.departmentEmail && (
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginBottom: 'var(--space-2)' }}>
                      <Mail size={11} /> {dept.departmentEmail}
                    </div>
                  )}
                  {dept.description && (
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
                      {dept.description}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-light)' }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: '11px' }}
                      onClick={() => { setDoctorForm({ ...initialDoctorForm, departmentId: dept._id }); setModal('invite-doctor'); }}>
                      <Stethoscope size={11} /> Invite Doctor
                    </button>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: '11px' }}
                      onClick={() => { setStaffForm({ ...initialStaffForm, departmentId: dept._id }); setModal('invite-staff'); }}>
                      <UserPlus size={11} /> Invite Staff
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Add Department Modal ── */}
      <Modal isOpen={modal === 'add-dept'} onClose={() => setModal(null)} title="Add New Department"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreateDept} disabled={acting}>
            {acting ? <Spinner size={16} /> : <><Plus size={14} /> Create Department</>}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="input-group">
            <label>Department Name *</label>
            <input className="input-field" placeholder="e.g. Cardiology, Emergency" value={deptForm.departmentName} onChange={e => setDF('departmentName', e.target.value)} autoFocus />
          </div>
          <div className="input-group">
            <label>Department Email *</label>
            <input className="input-field" type="email" placeholder="cardiology@hospital.com" value={deptForm.departmentEmail} onChange={e => setDF('departmentEmail', e.target.value)} />
          </div>
          <div className="input-group">
            <label>Description</label>
            <textarea className="input-field" rows={2} placeholder="Brief description..." value={deptForm.description} onChange={e => setDF('description', e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div className="input-group">
            <label>Department Admin Email <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>(sends invite)</span></label>
            <input className="input-field" type="email" placeholder="admin@hospital.com (optional)" value={deptForm.adminEmail} onChange={e => setDF('adminEmail', e.target.value)} />
          </div>
          <div style={{ background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-700)' }}>
            If you provide an Admin Email, a setup invitation will be sent automatically.
          </div>
        </div>
      </Modal>

      {/* ── Invite Doctor Modal ── */}
      <Modal isOpen={modal === 'invite-doctor'} onClose={() => setModal(null)} title="Invite Doctor"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleInviteDoctor} disabled={acting}>
            {acting ? <Spinner size={16} /> : <><Mail size={14} /> Send Invite</>}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="input-group">
            <label>Doctor Email *</label>
            <input className="input-field" type="email" placeholder="doctor@hospital.com" value={doctorForm.email} onChange={e => setDrF('email', e.target.value)} autoFocus />
          </div>
          <div className="input-group">
            <label>Role *</label>
            <select className="input-field" value={doctorForm.role} onChange={e => setDrF('role', e.target.value)}>
              {DOCTOR_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Assign to Department <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>(optional)</span></label>
            <select className="input-field" value={doctorForm.departmentId} onChange={e => setDrF('departmentId', e.target.value)}>
              <option value="">No specific department</option>
              {departments.map(d => (
                <option key={d._id || d.id} value={d._id || d.id}>{d.departmentName || d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* ── Invite Staff Modal ── */}
      <Modal isOpen={modal === 'invite-staff'} onClose={() => setModal(null)} title="Invite Staff"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleInviteStaff} disabled={acting}>
            {acting ? <Spinner size={16} /> : <><Mail size={14} /> Send Invite</>}
          </button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="input-group">
            <label>Staff Email *</label>
            <input className="input-field" type="email" placeholder="staff@hospital.com" value={staffForm.email} onChange={e => setStF('email', e.target.value)} autoFocus />
          </div>
          <div className="input-group">
            <label>Designation *</label>
            <select className="input-field" value={staffForm.designation} onChange={e => setStF('designation', e.target.value)}>
              <option value="">Select designation...</option>
              {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Assign to Department <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>(optional)</span></label>
            <select className="input-field" value={staffForm.departmentId} onChange={e => setStF('departmentId', e.target.value)}>
              <option value="">No specific department</option>
              {departments.map(d => (
                <option key={d._id || d.id} value={d._id || d.id}>{d.departmentName || d.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
