import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, LogOut, Sun, Moon, ChevronLeft, X,
  LayoutDashboard, Shield, QrCode, Key, ClipboardList, Bell, Clock,
  Users, Search, Activity, Building2, GitBranch,
  Mail, UserCog,
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import '../styles/layout.css';

// ─── Navigation configs per role ───
const PATIENT_NAV = [
  { section: 'Overview', items: [
    { to: '/patient/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ]},
  { section: 'Emergency', items: [
    { to: '/patient/emergency-qr', icon: QrCode, label: 'Emergency QR' },
  ]},
  { section: 'Medical Network', items: [
    { to: '/patient/doctors', icon: Search, label: 'Find & Book Doctors' },
    { to: '/patient/appointments', icon: ClipboardList, label: 'My Appointments' },
  ]},
  { section: 'Access Control', items: [
    { to: '/patient/access-grants', icon: Key, label: 'Access Grants' },
    { to: '/patient/access-requests', icon: Bell, label: 'Requests' },
    { to: '/patient/access-logs', icon: ClipboardList, label: 'Access Logs' },
  ]},
  { section: 'Account', items: [
    { to: '/patient/profile', icon: Shield, label: 'My Profile' },
  ]},
];

const DOCTOR_NAV = [
  { section: 'Overview', items: [
    { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/doctor/schedule', icon: Clock, label: 'Schedule' },
    { to: '/doctor/appointments', icon: ClipboardList, label: 'Appointments' },
  ]},
  { section: 'Patients', items: [
    { to: '/doctor/patients', icon: Users, label: 'My Patients' },
    { to: '/doctor/request-access', icon: Search, label: 'Request Access' },
  ]},
  { section: 'Records', items: [
    { to: '/doctor/access-logs', icon: Activity, label: 'Access History' },
  ]},
];

const ADMIN_NAV = [
  { section: 'Platform', items: [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/org-requests', icon: Building2, label: 'Org Requests' },
  ]},
];

const ORG_SUPER_ADMIN_NAV = [
  { section: 'Overview', items: [
    { to: '/org/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ]},
  { section: 'Team', items: [
    { to: '/org/team', icon: Users, label: 'Team' },
    { to: '/org/invites', icon: Mail, label: 'Invites' },
  ]},
  { section: 'Structure', items: [
    { to: '/org/dashboard', icon: GitBranch, label: 'Departments' },
  ]},
  { section: 'Logs', items: [
    { to: '/org/activity', icon: Activity, label: 'Activity' },
  ]},
];

const DEPT_ADMIN_NAV = [
  { section: 'Department', items: [
    { to: '/dept/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ]},
  { section: 'Team', items: [
    { to: '/dept/dashboard', icon: UserCog, label: 'Invites & Team' },
  ]},
];

const STAFF_NAV = [
  { section: 'Overview', items: [
    { to: '/staff/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ]},
];

function getNavConfig(role) {
  switch (role) {
    case 'patient': return PATIENT_NAV;
    case 'doctor': return DOCTOR_NAV;
    case 'admin': return ADMIN_NAV;
    case 'org_super_admin': return ORG_SUPER_ADMIN_NAV;
    case 'department_admin': return DEPT_ADMIN_NAV;
    case 'staff': return STAFF_NAV;
    default: return [{ section: 'Overview', items: [{ to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' }] }];
  }
}

// ─── Bottom Nav items per role (max 5 most important) ───
function getBottomNavItems(role) {
  switch (role) {
    case 'patient': return [
      { to: '/patient/dashboard', icon: LayoutDashboard, label: 'Home' },
      { to: '/patient/doctors', icon: Search, label: 'Doctors' },
      { to: '/patient/appointments', icon: ClipboardList, label: 'Bookings' },
      { to: '/patient/access-grants', icon: Key, label: 'Access' },
      { to: '/patient/profile', icon: Shield, label: 'Profile' },
    ];
    case 'doctor': return [
      { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Home' },
      { to: '/doctor/schedule', icon: Clock, label: 'Schedule' },
      { to: '/doctor/appointments', icon: ClipboardList, label: 'Bookings' },
      { to: '/doctor/patients', icon: Users, label: 'Patients' },
      { to: '/doctor/request-access', icon: Search, label: 'Access' },
    ];
    case 'admin': return [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Home' },
      { to: '/admin/org-requests', icon: Building2, label: 'Requests' },
    ];
    case 'org_super_admin': return [
      { to: '/org/dashboard', icon: LayoutDashboard, label: 'Home' },
      { to: '/org/team', icon: Users, label: 'Team' },
      { to: '/org/invites', icon: Mail, label: 'Invites' },
      { to: '/org/activity', icon: Activity, label: 'Activity' },
    ];
    case 'department_admin': return [
      { to: '/dept/dashboard', icon: LayoutDashboard, label: 'Home' },
    ];
    case 'staff': return [
      { to: '/staff/dashboard', icon: LayoutDashboard, label: 'Home' },
    ];
    default: return [];
  }
}

// Build initials from name
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function DashboardLayout({ children, title = 'Dashboard' }) {
  const { user, logout, getRoleLabel } = useAuthStore();
  const { sidebarOpen, toggleSidebar, mobileMenuOpen, setMobileMenuOpen, theme, toggleTheme } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const navConfig = getNavConfig(user?.role);
  const bottomNavItems = getBottomNavItems(user?.role);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, setMobileMenuOpen]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const initials = getInitials(user?.name);
  const displayName = user?.name || getRoleLabel?.() || 'User';
  const displayRole = getRoleLabel?.() || user?.role || '';

  return (
    <div className="dashboard-layout">
      {/* ─── Desktop Sidebar ─── */}
      {!isMobile && (
        <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <Shield size={18} />
            </div>
            <span className="sidebar-brand-text">HealthGuard</span>
          </div>

          <nav className="sidebar-nav">
            {navConfig.map((section) => (
              <div key={section.section}>
                <div className="sidebar-section-title">{section.section}</div>
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    <item.icon size={20} />
                    <span className="sidebar-link-text">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            {/* User info in sidebar */}
            <div className="sidebar-user">
              <div className="sidebar-avatar">{initials}</div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{displayName}</div>
                <div className="sidebar-user-role">{displayRole}</div>
              </div>
            </div>
            <button className="sidebar-link" onClick={handleLogout} style={{ width: '100%' }}>
              <LogOut size={20} />
              <span className="sidebar-link-text">Logout</span>
            </button>
          </div>
        </aside>
      )}

      {/* ─── Mobile Sidebar Drawer ─── */}
      <AnimatePresence>
        {isMobile && mobileMenuOpen && (
          <>
            {/* Overlay backdrop */}
            <motion.div
              className="mobile-sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <motion.aside
              className="mobile-sidebar-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            >
              <div className="sidebar-brand" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div className="sidebar-brand-icon">
                    <Shield size={18} />
                  </div>
                  <span className="sidebar-brand-text">HealthGuard</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-gray-400)', padding: 4, cursor: 'pointer' }}
                >
                  <X size={22} />
                </button>
              </div>

              <nav className="sidebar-nav">
                {navConfig.map((section) => (
                  <div key={section.section}>
                    <div className="sidebar-section-title">{section.section}</div>
                    {section.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <item.icon size={20} />
                        <span className="sidebar-link-text">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                ))}
              </nav>

              <div className="sidebar-footer">
                <div className="sidebar-user">
                  <div className="sidebar-avatar">{initials}</div>
                  <div className="sidebar-user-info">
                    <div className="sidebar-user-name">{displayName}</div>
                    <div className="sidebar-user-role">{displayRole}</div>
                  </div>
                </div>
                <button className="sidebar-link" onClick={handleLogout} style={{ width: '100%' }}>
                  <LogOut size={20} />
                  <span className="sidebar-link-text">Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── Main Area ─── */}
      <div className={`dashboard-main ${!isMobile && !sidebarOpen ? 'sidebar-collapsed' : ''} ${isMobile ? 'mobile-main' : ''}`}>
        {/* Navbar */}
        <header className="dashboard-navbar">
          <div className="navbar-left">
            <button
              className="btn btn-ghost btn-icon"
              onClick={isMobile ? () => setMobileMenuOpen(true) : toggleSidebar}
              aria-label="Toggle sidebar"
            >
              {isMobile ? <Menu size={22} /> : sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>
            <h2 className="navbar-title">{title}</h2>
          </div>
          <div className="navbar-right">
            <button className="btn btn-ghost btn-icon" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {!isMobile && (
              <div className="navbar-user">
                <div className="navbar-avatar">{initials}</div>
                <div className="navbar-user-info">
                  <span className="navbar-user-name">{displayName}</span>
                  <span className="navbar-user-role">{displayRole}</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <motion.main
          className="dashboard-content"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.main>
      </div>

      {/* ─── Mobile Bottom Navigation Bar ─── */}
      {isMobile && bottomNavItems.length > 0 && (
        <nav className="bottom-nav">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
}
