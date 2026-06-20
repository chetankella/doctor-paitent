import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, LogOut, Sun, Moon, ChevronLeft, X,
  LayoutDashboard, Shield, QrCode, Key, ClipboardList, Bell, Clock,
  Users, Search, Activity, Building2, GitBranch,
  Mail, UserCog, Video,
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
    { to: '/patient/video-consult', icon: Video, label: 'Instant Video Consult' },
    { to: '/patient/doctors', icon: Search, label: 'Find & Book Doctors' },
    { to: '/patient/appointments', icon: ClipboardList, label: 'My Appointments' },
  ]},
  { section: 'Access Control', items: [
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
  { section: 'Video Consult', items: [
    { to: '/doctor/video-consult', icon: Video, label: 'Go Live / Video' },
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
      { to: '/patient/video-consult', icon: Video, label: 'Video' },
      { to: '/patient/doctors', icon: Search, label: 'Doctors' },
      { to: '/patient/appointments', icon: ClipboardList, label: 'Bookings' },
      { to: '/patient/profile', icon: Shield, label: 'Profile' },
    ];
    case 'doctor': return [
      { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Home' },
      { to: '/doctor/video-consult', icon: Video, label: 'Video' },
      { to: '/doctor/appointments', icon: ClipboardList, label: 'Bookings' },
      { to: '/doctor/patients', icon: Users, label: 'Patients' },
      { to: '/doctor/schedule', icon: Clock, label: 'Schedule' },
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
        <nav style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 40px)',
          maxWidth: '400px',
          height: '64px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.7)',
          borderRadius: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 6px',
          zIndex: 900,
          boxShadow: '0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}>
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  padding: '6px 4px',
                  borderRadius: '24px',
                  textDecoration: 'none',
                  position: 'relative',
                  minHeight: '52px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* Sliding active pill — same layoutId so it glides between tabs */}
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active-pill"
                    style={{
                      position: 'absolute',
                      inset: '4px 6px',
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)',
                      boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
                      zIndex: 0,
                    }}
                    transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                  />
                )}

                {/* Icon */}
                <motion.div
                  animate={isActive
                    ? { y: -1, scale: 1.08, color: '#ffffff' }
                    : { y: 0, scale: 1, color: '#94a3b8' }
                  }
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  style={{ position: 'relative', zIndex: 1, display: 'flex' }}
                >
                  <item.icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
                </motion.div>

                {/* Label — only shows under active tab */}
                <motion.span
                  animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#ffffff',
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                    lineHeight: 1,
                  }}
                >
                  {item.label}
                </motion.span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
}
