/**
 * Auth Store — Zustand
 * Manages authentication state, JWT token (in memory), and role-based routing.
 */
import { create } from 'zustand';
import { setTokenGetter } from '../services/api';

// ─── Cookie Helpers ───
const COOKIE_NAME = 'anh_token';

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  return parts.length === 2 ? parts.pop().split(';').shift() : null;
}

function setCookie(name, value, maxAge = 86400) {
  document.cookie = `${name}=${value}; max-age=${maxAge}; path=/; SameSite=Strict`;
}

function deleteCookie(name) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}

// ─── JWT Decoder ───
function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

// ─── Role → Dashboard path mapping ───
const ROLE_DASHBOARD = {
  patient: '/patient/dashboard',
  doctor: '/doctor/dashboard',
  admin: '/admin/dashboard',
  staff: '/staff/dashboard',
  org_super_admin: '/org/dashboard',
  department_admin: '/dept/dashboard',
};

// ─── Role → Display label mapping ───
const ROLE_LABEL = {
  patient: 'Patient',
  doctor: 'Doctor',
  admin: 'Platform Admin',
  staff: 'Staff',
  org_super_admin: 'Org Super Admin',
  department_admin: 'Department Admin',
};

// ─── Extract user info from JWT ───
function userFromToken(token) {
  const decoded = decodeJWT(token);
  if (!decoded) return null;
  return {
    id: decoded.id || decoded.userId,
    role: decoded.role,
    name: decoded.name || decoded.email?.split('@')[0] || ROLE_LABEL[decoded.role] || 'User',
    email: decoded.email || null,
    orgId: decoded.orgId || null,
    deptId: decoded.deptId || null,
  };
}

// ─── Organizations localStorage helpers ───
const ORG_STORAGE_KEY = 'anh_organizations';

function saveOrgs(orgs) {
  try { localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(orgs)); } catch {}
}

function loadOrgs() {
  try {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function clearOrgs() {
  try { localStorage.removeItem(ORG_STORAGE_KEY); } catch {}
}

// ─── Store ───
const useAuthStore = create((set, get) => {
  // Initialize from cookie on load
  const savedToken = getCookie(COOKIE_NAME);
  let initialUser = null;
  let initialToken = null;

  if (savedToken) {
    const decoded = decodeJWT(savedToken);
    if (decoded && decoded.exp * 1000 > Date.now()) {
      initialToken = savedToken;
      initialUser = userFromToken(savedToken);
    } else {
      deleteCookie(COOKIE_NAME);
    }
  }

  // Also check old cookie name for backward compat
  if (!initialToken) {
    const legacyToken = getCookie('token');
    if (legacyToken) {
      const decoded = decodeJWT(legacyToken);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        initialToken = legacyToken;
        initialUser = userFromToken(legacyToken);
        setCookie(COOKIE_NAME, legacyToken); // migrate
      }
    }
  }

  // Wire up the API layer
  setTokenGetter(() => get().token);

  return {
    token: initialToken,
    user: initialUser,
    organizations: loadOrgs(),  // ← hydrated from localStorage
    isAuthenticated: !!initialToken,
    isLoading: false,

    login: (token, organizations = []) => {
      const user = userFromToken(token);
      if (!user) return;

      setCookie(COOKIE_NAME, token);
      try { localStorage.setItem('token', token); } catch {}

      // Persist organizations so dashboards can resolve orgId
      saveOrgs(organizations);

      set({ token, user, organizations, isAuthenticated: true });
    },

    logout: () => {
      deleteCookie(COOKIE_NAME);
      deleteCookie('token');
      try { localStorage.removeItem('token'); } catch {}
      clearOrgs();

      set({ token: null, user: null, organizations: [], isAuthenticated: false });
    },

    getDashboardPath: () => {
      const { user } = get();
      return user ? ROLE_DASHBOARD[user.role] || '/login' : '/login';
    },

    getRoleLabel: () => {
      const { user } = get();
      return user ? ROLE_LABEL[user.role] || user.role : '';
    },
  };
});

// ─── Auth expiry listener ───
window.addEventListener('auth:expired', () => {
  useAuthStore.getState().logout();
});

export default useAuthStore;
