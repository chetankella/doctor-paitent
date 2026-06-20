import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Sparkles, FlaskConical, Activity, Pill, Heart,
  Stethoscope, Brain, Bone, Eye, Baby, Leaf, Thermometer,
  HeartPulse, UserRound, ShieldPlus, QrCode, Key, Bell,
  ClipboardList, CalendarDays,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import DashboardLayout from '../../layouts/DashboardLayout';
import { patientAPI } from '../../services/api';

const SPECIALITIES = [
  { name: 'General Physician', icon: Thermometer, color: '#3b82f6', bg: '#eff6ff', query: 'General Physician' },
  { name: 'Cardiologist',      icon: HeartPulse,  color: '#ef4444', bg: '#fef2f2', query: 'Cardiologist' },
  { name: 'Neurologist',       icon: Brain,       color: '#8b5cf6', bg: '#f5f3ff', query: 'Neurologist' },
  { name: 'Orthopedic',        icon: Bone,        color: '#f59e0b', bg: '#fffbeb', query: 'Orthopedic' },
  { name: 'Ophthalmologist',   icon: Eye,         color: '#0ea5e9', bg: '#f0f9ff', query: 'Ophthalmologist' },
  { name: 'Pediatrician',      icon: Baby,        color: '#10b981', bg: '#f0fdf4', query: 'Pediatrician' },
  { name: 'Dermatologist',     icon: Leaf,        color: '#22c55e', bg: '#f0fdf4', query: 'Dermatologist' },
  { name: 'Gynecologist',      icon: UserRound,   color: '#ec4899', bg: '#fdf2f8', query: 'Gynecologist' },
  { name: 'Pulmonologist',     icon: Stethoscope, color: '#06b6d4', bg: '#ecfeff', query: 'Pulmonologist' },
  { name: 'Psychiatrist',      icon: ShieldPlus,  color: '#6366f1', bg: '#eef2ff', query: 'Psychiatrist' },
];

export default function PatientDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/patient/doctors${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
  };

  const quickLinks = [
    { icon: FlaskConical, label: 'Book\nLab Tests',      color: '#0ea5e9', to: '/patient/appointments'  },
    { icon: CalendarDays, label: 'My\nAppointments',     color: '#3b82f6', to: '/patient/appointments'  },
    { icon: Pill,         label: 'Find\nDoctors',        color: '#6366f1', to: '/patient/doctors'       },
    { icon: Heart,        label: 'Emergency\nQR',        color: '#ef4444', to: '/patient/emergency-qr'  },
  ];

  const quickActions = [
    { icon: QrCode,       label: 'Emergency QR',   desc: 'Generate or view your QR code',        to: '/patient/emergency-qr',    color: '#ef4444' },
    { icon: Bell,         label: 'Requests',       desc: 'Review pending access requests',        to: '/patient/access-requests', color: '#f59e0b' },
    { icon: ClipboardList,label: 'Access Logs',    desc: 'See who accessed your data',            to: '/patient/access-logs',     color: '#22c55e' },
  ];

  const firstName = user?.name?.split(' ')[0] || 'Patient';

  return (
    <DashboardLayout title="Patient Dashboard">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Welcome + Search Banner ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)',
          borderRadius: '20px',
          padding: isMobile ? '22px 18px' : '28px 24px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(29, 78, 216, 0.25)',
        }}>
          <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.07, pointerEvents: 'none' }}>
            <Stethoscope size={isMobile ? 140 : 220} />
          </div>
          <p style={{ margin: '0 0 2px', fontSize: '13px', opacity: 0.85 }}>Good day,</p>
          <h1 style={{ margin: '0 0 16px', fontSize: isMobile ? '22px' : '26px', fontWeight: 800, color: 'white' }}>
            {firstName} 👋
          </h1>
          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <div style={{
              flex: 1, backgroundColor: 'white', borderRadius: '14px',
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px',
              minWidth: 0, /* allow flex shrink */
            }}>
              <Search size={17} color="#666" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder={isMobile ? 'Search symptoms…' : 'Search symptoms, doctors, specialities…'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#333', background: 'transparent' }}
              />
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              onClick={() => navigate('/patient/doctors')}
              style={{
                flexShrink: 0,
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: '14px',
                padding: '8px 12px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', backdropFilter: 'blur(4px)',
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 600, color: 'white', lineHeight: 1 }}>Ask</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '3px', lineHeight: 1, marginTop: 2 }}>
                Care Ai <Sparkles size={10} />
              </span>
            </motion.button>
          </form>
        </div>

        {/* ── Consultation Banners ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            {
              label: 'In-Person\nConsultation', sub: 'Book clinic visits →',
              bg: '#dbeafe', titleColor: '#1e3a8a', subColor: '#2563eb',
              img: '/images/video_consult.png', to: '/patient/doctors',
            },
            {
              label: 'Video\nConsultation', sub: 'Connect online →',
              bg: '#e0f2fe', titleColor: '#0c4a6e', subColor: '#0284c7',
              img: '/images/in_person.png', to: '/patient/appointments',
            },
          ].map((card) => (
            <motion.div
              key={card.to}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(card.to)}
              style={{
                backgroundColor: card.bg,
                borderRadius: '20px',
                padding: isMobile ? '20px 14px' : '28px 20px',
                position: 'relative',
                overflow: 'hidden',
                height: isMobile ? '175px' : '200px',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(59,130,246,0.12)',
              }}
            >
              <h3 style={{
                margin: 0, fontWeight: 800, color: card.titleColor,
                fontSize: isMobile ? '15px' : '18px',
                zIndex: 1, position: 'relative', lineHeight: 1.3,
                whiteSpace: 'pre-line',
                maxWidth: '55%',
              }}>
                {card.label}
              </h3>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: card.subColor, zIndex: 1, position: 'relative', fontWeight: 600 }}>
                {card.sub}
              </p>
              <img
                src={card.img}
                alt={card.label}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  height: isMobile ? '140px' : '165px',
                  objectFit: 'contain',
                  maxWidth: '58%',
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </motion.div>
          ))}
        </div>

        {/* ── Quick Links Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {quickLinks.map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(item.to)}
              style={{
                backgroundColor: 'white',
                borderRadius: '14px',
                padding: '10px 6px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                textAlign: 'center', cursor: 'pointer',
                border: '1px solid #f1f5f9',
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '10px', backgroundColor: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <item.icon size={18} color={item.color} strokeWidth={2} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#1e293b', lineHeight: 1.3, whiteSpace: 'pre-line' }}>{item.label}</span>
            </motion.div>
          ))}
        </div>



        {/* ── Find Doctors by Speciality — 5 cols desktop, 3 cols mobile ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? '16px' : '18px', fontWeight: 800, color: '#0f172a' }}>
              Find Doctors by Speciality
            </h2>
            <motion.button
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate('/patient/doctors')}
              style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 700, color: '#2563eb', cursor: 'pointer', padding: '4px 0', flexShrink: 0 }}
            >
              See All →
            </motion.button>
          </div>

          <div style={{ 
            display: 'flex', 
            overflowX: 'auto', 
            gap: '12px',
            paddingBottom: '8px',
            scrollbarWidth: 'none', /* Firefox */
            msOverflowStyle: 'none', /* IE/Edge */
            // For Webkit, we'd need a class, but this is a good start. 
            // The cards will scroll horizontally.
            WebkitOverflowScrolling: 'touch'
          }}>
            {SPECIALITIES.map((spec, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/patient/doctors?specialization=${encodeURIComponent(spec.query)}`)}
                style={{
                  flex: '0 0 auto',
                  width: isMobile ? '100px' : '120px',
                  backgroundColor: 'white', borderRadius: '14px',
                  padding: isMobile ? '14px 8px' : '18px 10px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  border: '1px solid #f1f5f9', textAlign: 'center',
                }}
              >
                <div style={{ width: isMobile ? 42 : 50, height: isMobile ? 42 : 50, borderRadius: '13px', backgroundColor: spec.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <spec.icon size={isMobile ? 20 : 24} color={spec.color} strokeWidth={2} />
                </div>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
                  {spec.name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ backgroundColor: 'white', borderRadius: '18px', padding: isMobile ? '16px' : '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: '0 0 14px', fontSize: isMobile ? '14px' : '16px', fontWeight: 800, color: '#0f172a' }}>Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
            {quickActions.map((action, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.02, x: 2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(action.to)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: isMobile ? '12px' : '14px',
                  borderRadius: '12px', border: '1px solid #f1f5f9',
                  cursor: 'pointer', backgroundColor: '#fafafa',
                }}
              >
                <div style={{ width: 38, height: 38, borderRadius: '10px', backgroundColor: `${action.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <action.icon size={18} color={action.color} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{action.label}</div>
                  <div style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{action.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
