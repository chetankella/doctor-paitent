/**
 * API Service Layer
 * Central axios instance with interceptors, error normalization, and retry logic.
 */
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ─── Axios Instance ───
const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Token getter (set by auth store) ───
let getToken = () => null;
export const setTokenGetter = (fn) => { getToken = fn; };

// ─── Request Interceptor ───
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor ───
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(normalizeError(error));
  }
);

// ─── Error Normalization ───
function normalizeError(error) {
  if (error.response) {
    return {
      status: error.response.status,
      message: error.response.data?.message || 'Something went wrong',
      data: error.response.data,
    };
  }
  if (error.request) {
    return {
      status: 0,
      message: 'Network error. Please check your connection.',
      data: null,
    };
  }
  return {
    status: 0,
    message: error.message || 'An unexpected error occurred',
    data: null,
  };
}

// ─── Safe request wrapper ───
async function request(method, url, data = null, config = {}) {
  try {
    const res = await api({ method, url, data, ...config });
    return { success: true, data: res.data?.data ?? res.data, raw: res.data };
  } catch (err) {
    return { success: false, error: err.message || err, status: err.status };
  }
}

// ─── Tenant-scoped request (sends x-organization-id header) ───
async function requestTenant(method, url, orgId, data = null) {
  try {
    const res = await api({
      method, url, data,
      headers: { 'x-organization-id': orgId },
    });
    return { success: true, data: res.data?.data ?? res.data, raw: res.data };
  } catch (err) {
    return { success: false, error: err.message || err, status: err.status };
  }
}
async function requestForm(method, url, formData) {
  try {
    const res = await api({
      method, url, data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { success: true, data: res.data?.data ?? res.data, raw: res.data };
  } catch (err) {
    return { success: false, error: err.message || err, status: err.status };
  }
}

async function requestFormTenant(method, url, orgId, formData) {
  try {
    const res = await api({
      method, url, data: formData,
      headers: { 
        'Content-Type': 'multipart/form-data',
        'x-organization-id': orgId
      },
    });
    return { success: true, data: res.data?.data ?? res.data, raw: res.data };
  } catch (err) {
    return { success: false, error: err.message || err, status: err.status };
  }
}

// ═══════════════════════════════════════════════════════════
// AUTH APIs
// ═══════════════════════════════════════════════════════════
export const authAPI = {
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  patientRegister: (data) => request('POST', '/patients/register', data),
  verifyOtp: (email, otp) => request('POST', '/patients/verify-otp', { email, otp }),
  resendOtp: (email) => request('POST', '/patients/resend-otp', { email }),
};

// ═══════════════════════════════════════════════════════════
// PATIENT APIs
// ═══════════════════════════════════════════════════════════
export const patientAPI = {
  // Profile
  getProfile: () => request('GET', '/patients/me/profile'),
  updateProfile: (data) => request('PUT', '/patients/me/profile', data),

  // Emergency QR
  generateQR: (options = {}) => request('POST', '/patients/me/emergency-qr', options),
  getActiveQR: () => request('GET', '/patients/me/emergency-qr'),
  revokeQR: () => request('DELETE', '/patients/me/emergency-qr'),
  getQRScans: (page = 1) => request('GET', `/patients/me/emergency-qr/scans?page=${page}`),

  // Access Grants
  createGrant: (data) => request('POST', '/patients/me/access-grants', data),
  listGrants: (status = 'ACTIVE', page = 1) =>
    request('GET', `/patients/me/access-grants?status=${status}&page=${page}`),
  updateGrant: (grantId, data) => request('PATCH', `/patients/me/access-grants/${grantId}`, data),
  revokeGrant: (grantId) => request('DELETE', `/patients/me/access-grants/${grantId}`),

  // Access Requests
  listRequests: (status = 'PENDING', page = 1) =>
    request('GET', `/patients/me/access-requests?status=${status}&page=${page}`),
  respondToRequest: (requestId, data) =>
    request('PATCH', `/patients/me/access-requests/${requestId}`, data),

  // Access Logs
  getAccessLogs: (page = 1) => request('GET', `/patients/me/access-logs?page=${page}`),

  // Doctor Search
  searchDoctors: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/patients/me/doctors${qs ? `?${qs}` : ''}`);
  },
  searchAutocomplete: (query) => request('GET', `/patients/me/doctors/autocomplete?query=${encodeURIComponent(query)}`),
  getDoctorAvailability: (doctorId, date) => request('GET', `/patients/me/doctors/${doctorId}/availability?date=${date}`),
  bookAppointment: (data) => request('POST', '/patients/me/appointments', data),
  listPatientAppointments: () => request('GET', '/patients/me/appointments'),
  cancelAppointment: (appointmentId) => request('PATCH', `/patients/me/appointments/${appointmentId}/cancel`),
  uploadPrescription: (appointmentId, formData) => requestForm('POST', `/patients/me/appointments/${appointmentId}/prescription`, formData),
  listMessages: (appointmentId) => request('GET', `/patients/me/appointments/${appointmentId}/messages`),
  sendMessage: (appointmentId, formData) => requestForm('POST', `/patients/me/appointments/${appointmentId}/messages`, formData),
};

// ═══════════════════════════════════════════════════════════
// DOCTOR APIs
// ═══════════════════════════════════════════════════════════
export const doctorAPI = {
  // Onboarding (no auth required)
  verifyToken: (token) => request('GET', `/doctor/verify-token/${token}`),
  setPassword: (token, data) => request('POST', `/doctor/SetPassword/${token}`, data), // { name, password }
  setupProfile: (formData) => requestForm('POST', '/doctor/setup', formData), // licenseNumber, specialization, experience, licenseDocument

  // Profile
  getProfile: () => request('GET', '/doctor/Profile'),

  // Patients
  listPatients: (page = 1) => request('GET', `/doctors/me/patients?page=${page}`),
  viewPatientProfile: (grantId) => request('GET', `/doctors/me/patients/${grantId}/profile`),
  viewEmergencyData: (grantId) => request('GET', `/doctors/me/patients/${grantId}/emergency`),

  // Notes
  createNote: (grantId, data) => request('POST', `/doctors/me/patients/${grantId}/notes`, data),
  listNotes: (grantId, page = 1) =>
    request('GET', `/doctors/me/patients/${grantId}/notes?page=${page}`),
  updateNote: (grantId, noteId, data) =>
    request('PUT', `/doctors/me/patients/${grantId}/notes/${noteId}`, data),
  deleteNote: (grantId, noteId) =>
    request('DELETE', `/doctors/me/patients/${grantId}/notes/${noteId}`),

  // Access Requests
  requestAccess: (data) => request('POST', '/doctors/me/access-requests', data),

  // Access Logs
  getAccessLogs: (page = 1) => request('GET', `/doctors/me/access-logs?page=${page}`),

  // Appointments
  listDoctorAppointments: () => request('GET', '/doctors/me/appointments'),
  updateAppointmentStatus: (appointmentId, statusData) => {
    if (statusData instanceof FormData) {
      return requestForm('PATCH', `/doctors/me/appointments/${appointmentId}/status`, statusData);
    }
    return request('PATCH', `/doctors/me/appointments/${appointmentId}/status`, statusData);
  },
  listMessages: (appointmentId) => request('GET', `/doctors/me/appointments/${appointmentId}/messages`),
  sendMessage: (appointmentId, formData) => requestForm('POST', `/doctors/me/appointments/${appointmentId}/messages`, formData),
};

// ═══════════════════════════════════════════════════════════
// STAFF APIs
// ═══════════════════════════════════════════════════════════
export const staffAPI = {
  verifyToken: (token) => request('GET', `/staff/verify-token/${token}`),
  setup: (token, data) => request('POST', `/staff/setup/${token}`, data), // { name, password, designation }
};

// ═══════════════════════════════════════════════════════════
// SUPER ADMIN APIs
// ═══════════════════════════════════════════════════════════
export const superAdminAPI = {
  verifyToken: (token) => request('GET', `/superadmin/verify-token/${token}`),
  setup: (data) => request('POST', '/superadmin/setup', data), // { token, name, password, licenseNumber?, specialization? }
};


// ═══════════════════════════════════════════════════════════
// ORGANIZATION APIs
// ═══════════════════════════════════════════════════════════
export const orgAPI = {
  submitRequest: (data) => request('POST', '/organization/request', data),
  checkStatus: (email) => request('GET', `/organization/request/status?email=${encodeURIComponent(email)}`),
  listMine: () => request('GET', '/organization/my'),
  getDetails: (orgId) => request('GET', `/organization/${orgId}`),
  update: (orgId, data) => requestTenant('PUT', `/organization/${orgId}`, orgId, data),
  // Invite endpoints are tenant-scoped (require x-organization-id)
  inviteDoctor: (orgId, data) => requestTenant('POST', `/organization/${orgId}/invite-doctor`, orgId, data),
  inviteStaff: (orgId, data) => requestTenant('POST', `/organization/${orgId}/invite-staff`, orgId, data),

  // ── Phase 3: New endpoints ──
  getAnalytics: (orgId) => requestTenant('GET', `/organization/${orgId}/analytics/summary`, orgId),
  listInvites: (orgId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return requestTenant('GET', `/organization/${orgId}/invites${qs ? `?${qs}` : ''}`, orgId);
  },
  resendInvite: (orgId, inviteId) =>
    requestTenant('POST', `/organization/${orgId}/invites/${inviteId}/resend`, orgId),
  cancelInvite: (orgId, inviteId) =>
    requestTenant('DELETE', `/organization/${orgId}/invites/${inviteId}`, orgId),
  getAuditLogs: (orgId, page = 1) =>
    requestTenant('GET', `/organization/${orgId}/audit-logs?page=${page}`, orgId),
  listDoctors: (orgId, departmentId = '') => {
    const qs = departmentId ? `?departmentId=${departmentId}` : '';
    return requestTenant('GET', `/organization/${orgId}/doctors${qs}`, orgId);
  },
  listStaff: (orgId, departmentId = '') => {
    const qs = departmentId ? `?departmentId=${departmentId}` : '';
    return requestTenant('GET', `/organization/${orgId}/staff${qs}`, orgId);
  },
};

// ═══════════════════════════════════════════════════════════
// DEPARTMENT APIs (tenant-scoped — org super admin)
// ═══════════════════════════════════════════════════════════
export const departmentAPI = {
  create: (orgId, data) => requestTenant('POST', '/department', orgId, data),
  list: (orgId) => requestTenant('GET', '/department', orgId),
};


// ═══════════════════════════════════════════════════════════
// DEPARTMENT ADMIN APIs (tenant-scoped — department admin)
// Routes: /department-admin/* — departmentId auto-injected by backend
// ═══════════════════════════════════════════════════════════
export const deptAdminAPI = {
  verifyToken: (token) => request('GET', `/department-admin/verify-token/${token}`),
  setup: (data) => request('POST', '/department-admin/setup', data), // { token, name, password }

  // Invite a single doctor to the admin's department
  inviteDoctor: (orgId, data) => requestTenant('POST', '/department-admin/invite-doctor', orgId, data),
  // Invite a single staff to the admin's department
  inviteStaff: (orgId, data) => requestTenant('POST', '/department-admin/invite-staff', orgId, data),
  // Bulk invite via CSV FormData (field: csv)
  inviteBulk: (orgId, formData) => requestFormTenant('POST', '/department-admin/invite-bulk', orgId, formData),
};

// ═══════════════════════════════════════════════════════════
// ADMIN APIs (normalized — uses safe request wrapper)
// ═══════════════════════════════════════════════════════════
export const adminAPI = {
  // Platform Admin
  getPlatformStats: () => request('GET', '/admin/dashboard'),
  createAdmin: (data) => request('POST', '/admin/create-admin', data),

  // Organization Requests
  getOrgRequests: (status = '', search = '') =>
    request('GET', `/admin/organization-requests?status=${status}&search=${encodeURIComponent(search)}`),
  getOrgRequestDetails: (id) => request('GET', `/admin/organization-requests/${id}`),
  approveOrgRequest: (id, data = {}) => request('PATCH', `/admin/organization-requests/${id}/approve`, data),
  rejectOrgRequest: (id, rejectionReason) =>
    request('PATCH', `/admin/organization-requests/${id}/reject`, { rejectionReason }),
  getOrgRequestStats: () => request('GET', '/admin/organization-requests-stats'),

  // Legacy - kept for backward compat
  getPendingDoctors: () => request('GET', '/admin/pending-doctors'),
  approveDoctorRequest: (id) => request('PATCH', `/admin/approve-doctor/${id}`),
  rejectDoctorRequest: (id) => request('PATCH', `/admin/reject-doctor/${id}`),
};

// ═══════════════════════════════════════════════════════════
// EMERGENCY APIs
// ═══════════════════════════════════════════════════════════
export const emergencyAPI = {
  scanQR: (referenceCode) => request('GET', `/emergency/access/${referenceCode}`),
};

export default api;
