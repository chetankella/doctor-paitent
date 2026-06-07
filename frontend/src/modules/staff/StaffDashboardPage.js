import React from 'react';
import { Shield, Mail, Briefcase, Building2, GitBranch, Info, AlertCircle } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import useAuthStore from '../../store/authStore';

export default function StaffDashboardPage() {
  const { user, organizations } = useAuthStore();

  // Find organization name from the stored user organizations
  const activeOrg = organizations?.find(o => o.id === user?.orgId) || null;
  const orgName = activeOrg?.name || user?.orgId || 'HealthGuard Network Member';

  return (
    <DashboardLayout title="Staff Dashboard">
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <h1>Welcome Back, {user?.name || 'Staff Member'}</h1>
        <p>Coordinate healthcare administration, patient support, and department activities</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', gap: 'var(--space-6)' }}>
        {/* Profile Details Card */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Shield size={18} style={{ color: 'var(--color-primary-600)' }} />
              Profile Details
            </h3>
            <span className="badge badge-success" style={{ textTransform: 'capitalize' }}>
              Active {user?.role || 'Staff'}
            </span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200))',
                color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 'var(--font-size-xl)', fontWeight: 'bold'
              }}>
                {user?.name ? (user.name[0] || '').toUpperCase() : 'S'}
              </div>
              <div>
                <h4 style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', color: 'var(--text-primary)' }}>
                  {user?.name || 'Staff User'}
                </h4>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginTop: '2px' }}>
                  <Mail size={14} /> {user?.email}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Briefcase size={16} /> Role Designation
                </span>
                <span style={{ fontWeight: 500 }}>Healthcare Assistant / Staff</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-sm)' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Building2 size={16} /> Organization
                </span>
                <span style={{ fontWeight: 500 }}>{orgName}</span>
              </div>
              {user?.deptId && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-sm)' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <GitBranch size={16} /> Department ID
                  </span>
                  <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>
                    {user.deptId}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info/Responsibilities Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="card" style={{ background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-200)' }}>
            <div className="card-body" style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <Info size={24} style={{ color: 'var(--color-primary-600)', flexShrink: 0 }} />
              <div>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, color: 'var(--color-primary-800)', marginBottom: 'var(--space-2)' }}>
                  Staff Responsibilities
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary-900)', lineHeight: 'var(--line-height-relaxed)' }}>
                  As a registered staff member, you assist supervising medical officers and department administrators in managing patient intake, clinical scheduling, and records organization.
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <AlertCircle size={18} style={{ color: 'var(--color-warning-600)' }} />
                Administrative Scope
              </h3>
            </div>
            <div className="card-body">
              <ul style={{ paddingLeft: 'var(--space-5)', display: 'grid', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                <li>Your access permissions are controlled directly by your Department Administrator and supervising Doctors.</li>
                <li>Ensure all patient-related information remains confidential under HIPAA or local health regulations.</li>
                <li>Please consult your supervising officer to request access to specific clinical dashboards, queues, or billing modules.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
