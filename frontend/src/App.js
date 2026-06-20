import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import { Spinner } from './components/ui';

// ─── Styles ───
import './index.css';
import './styles/components.css';
import './styles/layout.css';

// ─── Landing Module ───
const LandingPage = lazy(() => import('./modules/landing/LandingPage'));

// ─── Auth Module ───
const LoginPage = lazy(() => import('./modules/auth/LoginPage'));

// ─── Patient Module ───
const PatientDashboardPage = lazy(() => import('./modules/patient/PatientDashboardPage'));
const PatientProfilePage = lazy(() => import('./modules/patient/PatientProfilePage'));
const EmergencyQRPage = lazy(() => import('./modules/patient/EmergencyQRPage'));
const AccessRequestsPage = lazy(() => import('./modules/patient/AccessRequestsPage'));
const AccessLogsPage = lazy(() => import('./modules/patient/AccessLogsPage'));
const FindDoctorsPage = lazy(() => import('./modules/patient/FindDoctorsPage'));
const PatientAppointmentsPage = lazy(() => import('./modules/patient/AppointmentsPage'));
const VideoConsultPage = lazy(() => import('./modules/patient/VideoConsultPage'));
const VideoRoomPage = lazy(() => import('./modules/shared/VideoRoomPage'));

// ─── Doctor Module ───
const DoctorDashboardPage = lazy(() => import('./modules/doctor/DoctorDashboardPage'));
const PatientViewPage = lazy(() => import('./modules/doctor/PatientViewPage'));
const RequestAccessPage = lazy(() => import('./modules/doctor/RequestAccessPage'));
const DoctorAppointmentsPage = lazy(() => import('./modules/doctor/AppointmentsPage'));
const ClinicalNotesPage = lazy(() => import('./modules/doctor/ClinicalNotesPage'));
const DoctorAccessLogsPage = lazy(() => import('./modules/doctor/DoctorAccessLogsPage'));
const SchedulePage = lazy(() => import('./modules/doctor/SchedulePage'));
const DoctorVideoPage = lazy(() => import('./modules/doctor/DoctorVideoPage'));

// ─── Admin Module ───
const AdminDashboardPage = lazy(() => import('./modules/admin/AdminDashboardPage'));
const OrgRequestsPage = lazy(() => import('./modules/admin/OrgRequestsPage'));

// ─── Org Super Admin Module ───
const OrgSuperAdminDashboardPage = lazy(() => import('./modules/org/OrgSuperAdminDashboardPage'));
const OrgInvitesPage = lazy(() => import('./modules/org/OrgInvitesPage'));
const OrgTeamPage = lazy(() => import('./modules/org/OrgTeamPage'));
const OrgActivityPage = lazy(() => import('./modules/org/OrgActivityPage'));

// ─── Dept Admin Module ───
const DeptAdminDashboardPage = lazy(() => import('./modules/department/DeptAdminDashboardPage'));

// ─── Emergency Module (public) ───
const EmergencyAccessPage = lazy(() => import('./modules/emergency/EmergencyAccessPage'));

// ─── Staff Module ───
const StaffDashboardPage = lazy(() => import('./modules/staff/StaffDashboardPage'));

// ─── Onboarding Module (public invite/setup flows) ───
const PatientRegisterPage = lazy(() => import('./modules/auth/PatientRegisterPage'));
const OrgRequestPage = lazy(() => import('./modules/onboarding/OrgRequestPage'));
const OrgRequestStatusPage = lazy(() => import('./modules/onboarding/OrgRequestStatusPage'));
const SuperAdminSetupPage = lazy(() => import('./modules/onboarding/SuperAdminSetupPage'));
const DeptAdminSetupPage = lazy(() => import('./modules/onboarding/DeptAdminSetupPage'));
const DoctorSetupPage = lazy(() => import('./modules/onboarding/DoctorSetupPage'));
const StaffSetupPage = lazy(() => import('./modules/onboarding/StaffSetupPage'));


// ─── Route Guards ───
function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role) {
    // 'admin' group alias covers platform admin only
    const ROLE_GROUPS = { admin: ['admin'] };
    const allowedRoles = ROLE_GROUPS[role] || [role];
    if (!allowedRoles.includes(user?.role)) return <Navigate to="/login" replace />;
  }
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, getDashboardPath } = useAuthStore();
  if (isAuthenticated) return <Navigate to={getDashboardPath()} replace />;
  return children;
}

// ─── Loading Fallback ───
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Spinner size={32} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ═══ Auth ═══ */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

          {/* ═══ Public Registration ═══ */}
          <Route path="/patient/register" element={<PatientRegisterPage />} />

          {/* ═══ Organization Request (public) ═══ */}
          <Route path="/organization/request" element={<OrgRequestPage />} />
          <Route path="/organization/request/status" element={<OrgRequestStatusPage />} />

          {/* ═══ Invite / Setup flows — exact URLs from backend emails ═══ */}
          {/* SuperAdmin: /create-superadmin?token=... */}
          <Route path="/create-superadmin" element={<SuperAdminSetupPage />} />
          {/* DeptAdmin: /create-department-admin?token=... */}
          <Route path="/create-department-admin" element={<DeptAdminSetupPage />} />
          {/* Doctor: /doctor-invite/:token */}
          <Route path="/doctor-invite/:token" element={<DoctorSetupPage />} />
          {/* Staff: /staff-invite/:token */}
          <Route path="/staff-invite/:token" element={<StaffSetupPage />} />
          {/* Legacy aliases kept for backward compat */}
          <Route path="/superadmin/setup/:token" element={<SuperAdminSetupPage />} />
          <Route path="/department-admin/setup/:token" element={<DeptAdminSetupPage />} />
          <Route path="/doctor-setup/:token" element={<DoctorSetupPage />} />
          <Route path="/staff-setup/:token" element={<StaffSetupPage />} />

          {/* ═══ Emergency (NO AUTH) ═══ */}
          <Route path="/emergency" element={<EmergencyAccessPage />} />
          <Route path="/emergency/:referenceCode" element={<EmergencyAccessPage />} />

          {/* ═══ Patient Routes ═══ */}
          <Route path="/patient/dashboard" element={<ProtectedRoute role="patient"><PatientDashboardPage /></ProtectedRoute>} />
          <Route path="/patient/profile" element={<ProtectedRoute role="patient"><PatientProfilePage /></ProtectedRoute>} />
          <Route path="/patient/emergency-qr" element={<ProtectedRoute role="patient"><EmergencyQRPage /></ProtectedRoute>} />
          <Route path="/patient/access-requests" element={<ProtectedRoute role="patient"><AccessRequestsPage /></ProtectedRoute>} />
          <Route path="/patient/access-logs" element={<ProtectedRoute role="patient"><AccessLogsPage /></ProtectedRoute>} />
          <Route path="/patient/doctors" element={<ProtectedRoute role="patient"><FindDoctorsPage /></ProtectedRoute>} />
          <Route path="/patient/appointments" element={<ProtectedRoute role="patient"><PatientAppointmentsPage /></ProtectedRoute>} />
          <Route path="/patient/video-consult" element={<ProtectedRoute role="patient"><VideoConsultPage /></ProtectedRoute>} />
          {/* Consultation redirect aliases */}
          <Route path="/patient/online-consult" element={<Navigate to="/patient/video-consult" replace />} />
          <Route path="/patient/offline-consult" element={<Navigate to="/patient/doctors" replace />} />

          {/* ═══ Doctor Routes ═══ */}
          <Route path="/doctor/dashboard" element={<ProtectedRoute role="doctor"><DoctorDashboardPage /></ProtectedRoute>} />
          <Route path="/doctor/patients" element={<ProtectedRoute role="doctor"><DoctorDashboardPage /></ProtectedRoute>} />
          <Route path="/doctor/patients/:grantId" element={<ProtectedRoute role="doctor"><PatientViewPage /></ProtectedRoute>} />
          <Route path="/doctor/patients/:grantId/notes" element={<ProtectedRoute role="doctor"><ClinicalNotesPage /></ProtectedRoute>} />
          <Route path="/doctor/request-access" element={<ProtectedRoute role="doctor"><RequestAccessPage /></ProtectedRoute>} />
          <Route path="/doctor/access-logs" element={<ProtectedRoute role="doctor"><DoctorAccessLogsPage /></ProtectedRoute>} />
          <Route path="/doctor/appointments" element={<ProtectedRoute role="doctor"><DoctorAppointmentsPage /></ProtectedRoute>} />
          <Route path="/doctor/schedule" element={<ProtectedRoute role="doctor"><SchedulePage /></ProtectedRoute>} />
          <Route path="/doctor/video-consult" element={<ProtectedRoute role="doctor"><DoctorVideoPage /></ProtectedRoute>} />

          {/* ═══ Admin Routes (Platform Admin only) ═══ */}
          <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/org-requests" element={<ProtectedRoute role="admin"><OrgRequestsPage /></ProtectedRoute>} />

          {/* ═══ Org Super Admin Routes ═══ */}
          <Route path="/org/dashboard" element={<ProtectedRoute role="org_super_admin"><OrgSuperAdminDashboardPage /></ProtectedRoute>} />
          <Route path="/org/invites" element={<ProtectedRoute role="org_super_admin"><OrgInvitesPage /></ProtectedRoute>} />
          <Route path="/org/team" element={<ProtectedRoute role="org_super_admin"><OrgTeamPage /></ProtectedRoute>} />
          <Route path="/org/activity" element={<ProtectedRoute role="org_super_admin"><OrgActivityPage /></ProtectedRoute>} />

          {/* ═══ Dept Admin Routes ═══ */}
          <Route path="/dept/dashboard" element={<ProtectedRoute role="department_admin"><DeptAdminDashboardPage /></ProtectedRoute>} />

          {/* ═══ Staff Routes ═══ */}
          <Route path="/staff/dashboard" element={<ProtectedRoute role="staff"><StaffDashboardPage /></ProtectedRoute>} />

          {/* ═══ Shared Video Room (doctor OR patient) ═══ */}
          <Route path="/video-room/:appointmentId" element={<VideoRoomPage />} />

          {/* ═══ Fallback ═══ */}
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            borderRadius: '8px',
            padding: '12px 16px',
          },
          success: { style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } },
          error: { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } },
        }}
      />
    </BrowserRouter>
  );
}
