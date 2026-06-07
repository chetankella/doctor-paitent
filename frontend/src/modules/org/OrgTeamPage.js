import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Stethoscope, Users, RefreshCw, Search,
  UserX, Mail, GitBranch,
  AlertCircle,
} from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { EmptyState, Skeleton } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import { orgAPI, departmentAPI } from '../../services/api';

const TABS = [
  { key: 'doctors', label: 'Doctors', icon: Stethoscope, color: '#2563eb' },
  { key: 'staff', label: 'Staff', icon: Users, color: '#7c3aed' },
];

function Avatar({ name }) {
  const initials = name ? name.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() : '?';
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '13px', fontWeight: 600, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function OrgTeamPage() {
  const { organizations } = useAuthStore();
  const orgId = (organizations && organizations.length > 0)
    ? (organizations[0]?.id || organizations[0]?._id)
    : null;

  const [activeTab, setActiveTab] = useState('doctors');
  const [departments, setDepartments] = useState([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [search, setSearch] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load departments for filter dropdown
  useEffect(() => {
    if (!orgId) return;
    departmentAPI.list(orgId).then(res => {
      if (res.success) setDepartments(Array.isArray(res.data) ? res.data : []);
    });
  }, [orgId]);

  const loadTeam = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const [doctorRes, staffRes] = await Promise.all([
      orgAPI.listDoctors(orgId, deptFilter),
      orgAPI.listStaff(orgId, deptFilter),
    ]);
    if (doctorRes.success) setDoctors(Array.isArray(doctorRes.data) ? doctorRes.data : []);
    if (staffRes.success) setStaff(Array.isArray(staffRes.data) ? staffRes.data : []);
    setLoading(false);
  }, [orgId, deptFilter]);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const currentList = activeTab === 'doctors' ? doctors : staff;

  // Local search filter
  const filtered = currentList.filter(item => {
    if (!search) return true;
    const name = activeTab === 'doctors'
      ? item.doctorId?.userId?.name
      : item.userId?.name;
    const email = activeTab === 'doctors'
      ? item.doctorId?.userId?.email
      : item.userId?.email;
    const q = search.toLowerCase();
    return name?.toLowerCase().includes(q) || email?.toLowerCase().includes(q);
  });

  return (
    <DashboardLayout title="Team Management">
      <div className="page-header">
        <div>
          <h1>Team Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            View and manage your organization's doctors and staff
          </p>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={loadTeam} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── Tab Switcher ── */}
      <div style={{
        display: 'flex', gap: 'var(--space-2)',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-1)',
        width: 'fit-content',
        marginBottom: 'var(--space-4)',
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 18px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: isActive ? 'var(--bg-card)' : 'transparent',
              color: isActive ? tab.color : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 400,
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
              boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              transition: 'all var(--transition-fast)',
            }}>
              <Icon size={15} />
              {tab.label}
              <span style={{
                background: isActive ? tab.color : 'var(--color-gray-200)',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                fontSize: '10px', fontWeight: 700,
                padding: '1px 7px', borderRadius: 99, marginLeft: 2,
              }}>
                {activeTab === tab.key
                  ? (loading ? '…' : currentList.length)
                  : (tab.key === 'doctors' ? doctors.length : staff.length)
                }
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Filters Row ── */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            className="input-field"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36, height: 38 }}
          />
        </div>
        <select
          className="input-field"
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          style={{ height: 38, width: 'auto', minWidth: 160 }}
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d._id} value={d._id}>{d.departmentName}</option>
          ))}
        </select>
      </div>

      {/* ── Team Table ── */}
      <div className="card">
        {loading ? (
          <div className="card-body">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-light)' }}>
                <Skeleton width={36} height={36} style={{ borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <Skeleton width="40%" height={14} style={{ marginBottom: 6 }} />
                  <Skeleton width="60%" height={12} />
                </div>
                <Skeleton width="15%" height={14} />
                <Skeleton width="10%" height={28} style={{ borderRadius: 6 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={activeTab === 'doctors' ? Stethoscope : Users}
            title={`No ${activeTab === 'doctors' ? 'Doctors' : 'Staff'} Found`}
            description={deptFilter || search
              ? 'Try adjusting your filters above.'
              : `No ${activeTab === 'doctors' ? 'doctors' : 'staff members'} have joined your organization yet. Use the invite features on your dashboard to add team members.`
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                  {['Member', ...(activeTab === 'doctors' ? ['Specialization', 'Role'] : ['Designation']), 'Department', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => {
                  const isDoctor = activeTab === 'doctors';
                  const name = isDoctor ? item.doctorId?.userId?.name : item.userId?.name;
                  const email = isDoctor ? item.doctorId?.userId?.email : item.userId?.email;
                  const dept = item.departmentId?.departmentName;
                  const status = isDoctor ? item.status : item.status;
                  const isActive = status === 'ACTIVE' || status === 'active';

                  return (
                    <motion.tr
                      key={item._id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      style={{ borderBottom: '1px solid var(--border-light)', transition: 'background var(--transition-fast)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Member */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={name} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{name || '—'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Mail size={10} /> {email || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Doctor specific: Specialization + Role | Staff specific: Designation */}
                      {isDoctor ? (
                        <>
                          <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            {item.doctorId?.specialization || '—'}
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 9px', borderRadius: 99, background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>
                              {item.role || '—'}
                            </span>
                          </td>
                        </>
                      ) : (
                        <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                          {item.designation || '—'}
                        </td>
                      )}

                      {/* Department */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        {dept ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <GitBranch size={12} /> {dept}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <span style={{
                          padding: '2px 10px', borderRadius: 99,
                          fontSize: '11px', fontWeight: 600,
                          background: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(148,163,184,0.1)',
                          color: isActive ? '#16a34a' : '#64748b',
                        }}>
                          {isActive ? 'Active' : status || 'Unknown'}
                        </span>
                      </td>

                      {/* Actions — Deactivate (Decision A: disabled, Coming Soon) */}
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <div title="Coming soon — deactivation feature is under development">
                          <button
                            disabled
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '4px 10px', borderRadius: 'var(--radius-md)',
                              fontSize: '11px', fontWeight: 500,
                              background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)',
                              border: '1px solid var(--border-light)', cursor: 'not-allowed',
                              opacity: 0.6,
                            }}
                          >
                            <UserX size={11} /> Deactivate
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Coming Soon notice */}
      {!loading && filtered.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-warning-50)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 'var(--radius-lg)',
          marginTop: 'var(--space-4)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-warning-600)',
        }}>
          <AlertCircle size={14} />
          <span><strong>Coming Soon:</strong> Deactivate and Edit actions will be available in the next release.</span>
        </div>
      )}
    </DashboardLayout>
  );
}
