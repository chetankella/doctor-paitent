import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, Star, Award, Building2, Stethoscope,
  RefreshCw, Clock, Zap, Shield, Users, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../layouts/DashboardLayout';
import { patientAPI } from '../../services/api';
import { Spinner, EmptyState } from '../../components/ui';

export default function VideoConsultPage() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchDoctors = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await patientAPI.getInstantDoctors();
    if (res.success) {
      setDoctors(res.data || []);
      setLastRefresh(new Date());
    } else {
      toast.error('Failed to load available doctors');
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    fetchDoctors();
    // Auto-refresh every 20 seconds
    const interval = setInterval(() => fetchDoctors(true), 20000);
    return () => clearInterval(interval);
  }, [fetchDoctors]);

  const handleStartConsult = async (doctor) => {
    setBookingId(doctor.id);
    const res = await patientAPI.bookInstantConsult(doctor.id);
    if (res.success) {
      const appointmentId = res.data?.appointment?._id;
      if (appointmentId) {
        toast.success('Connecting you to the doctor...');
        navigate(`/video-room/${appointmentId}`);
      } else {
        toast.error('Could not create consultation session');
      }
    } else {
      toast.error(res.error || 'Booking failed. Doctor may no longer be available.');
    }
    setBookingId(null);
  };

  return (
    <DashboardLayout title="Instant Video Consultation">
      {/* ── Hero Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)',
          borderRadius: '20px',
          padding: '28px 32px',
          marginBottom: '24px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          boxShadow: '0 16px 48px rgba(37,99,235,0.35)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.05, 0.12] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{
            position: 'absolute', width: '280px', height: '280px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
            right: '-60px', top: '-60px'
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Zap size={22} fill="currentColor" />
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>Instant Video Consult</h2>
          </div>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px', maxWidth: '480px' }}>
            Doctors shown below are <strong>online right now</strong> and ready to consult within minutes.
            No scheduling needed.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
          {[
            { icon: Zap, label: 'Instant' },
            { icon: Shield, label: 'Secure' },
            { icon: Users, label: 'Verified Doctors' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, opacity: 0.9 }}>
              <Icon size={14} />
              {label}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Refresh bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>
            {doctors.length} Doctor{doctors.length !== 1 ? 's' : ''} Available Now
          </span>
          {lastRefresh && (
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '10px' }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchDoctors()}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'white', border: '1px solid var(--border-light)',
            borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', color: 'var(--text-secondary)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Doctor Cards ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px' }}>
          <Spinner size={40} />
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Finding available doctors...</p>
        </div>
      ) : doctors.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Video}
            title="No Doctors Available Right Now"
            description="Doctors go live periodically. Check back in a few minutes or try scheduling an appointment."
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/patient/doctors')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Browse All Doctors <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <AnimatePresence>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {doctors.map((doc, idx) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -5, boxShadow: '0 16px 48px rgba(0,0,0,0.12)' }}
                style={{
                  background: 'white',
                  borderRadius: '20px',
                  border: '2px solid #10b98122',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Green header strip */}
                <div style={{
                  background: 'linear-gradient(90deg, #059669, #10b981)',
                  padding: '6px 16px',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white', flexShrink: 0 }}
                  />
                  <span style={{ color: 'white', fontSize: '12px', fontWeight: 700 }}>
                    AVAILABLE NOW • INSTANT VIDEO
                  </span>
                </div>

                <div style={{ padding: '20px' }}>
                  {/* Avatar + Name */}
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <img
                      src={doc.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(doc.name)}`}
                      alt={doc.name}
                      style={{ width: '64px', height: '64px', borderRadius: '14px', objectFit: 'cover', background: '#f1f5f9' }}
                    />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 800 }}>{doc.name}</h3>
                      <div style={{ fontSize: '13px', color: '#0ea5e9', fontWeight: 600, marginBottom: '6px' }}>
                        <Stethoscope size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {doc.specialization}
                      </div>
                      {/* Rating */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={13} fill="#f59e0b" color="#f59e0b" />
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>{doc.rating}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>({doc.ratingCount})</span>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <Award size={14} color="var(--text-tertiary)" />
                      {doc.experience} Yrs Exp • {(doc.qualifications || []).join(', ')}
                    </div>
                    {doc.organizations?.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <Building2 size={14} color="var(--text-tertiary)" />
                        {doc.organizations[0].name}
                      </div>
                    )}
                  </div>

                  {/* Fee + CTA */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '2px' }}>VIDEO CONSULT FEE</div>
                      <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)' }}>
                        ₹{doc.videoConsultFee}
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-tertiary)' }}> / session</span>
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleStartConsult(doc)}
                      disabled={bookingId === doc.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '12px 20px', borderRadius: '12px', border: 'none',
                        background: 'linear-gradient(135deg, #059669, #0ea5e9)',
                        color: 'white', fontWeight: 800, fontSize: '14px',
                        cursor: bookingId === doc.id ? 'not-allowed' : 'pointer',
                        boxShadow: '0 6px 20px rgba(5,150,105,0.35)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {bookingId === doc.id
                        ? <><Spinner size={16} /> Connecting...</>
                        : <><Video size={16} /> Start Now</>}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </DashboardLayout>
  );
}
