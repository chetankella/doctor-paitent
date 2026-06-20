import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, VideoOff, Users, Clock, Wifi, WifiOff,
  Phone, CheckCircle, AlertCircle, RefreshCw, ArrowRight,
  Activity, Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../layouts/DashboardLayout';
import { doctorAPI } from '../../services/api';
import { Spinner } from '../../components/ui';

export default function DoctorVideoPage() {
  const navigate = useNavigate();
  const [isAvailable, setIsAvailable] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [videoConsultFee, setVideoConsultFee] = useState('');
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Load current availability from profile
  useEffect(() => {
    const loadProfile = async () => {
      const res = await doctorAPI.getProfile();
      if (res.success) {
        const doc = res.data;
        setIsAvailable(doc.isAvailableForVideoConsult ?? false);
        setVideoConsultFee(doc.videoConsultFee ?? doc.consultationFee ?? '');
      }
      setProfileLoaded(true);
    };
    loadProfile();
  }, []);

  // Poll for incoming instant consult requests every 5s
  const fetchRequests = useCallback(async () => {
    if (!isAvailable) { setRequests([]); return; }
    setLoadingRequests(true);
    const res = await doctorAPI.getInstantRequests();
    if (res.success) setRequests(res.data || []);
    setLoadingRequests(false);
  }, [isAvailable]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleToggle = async () => {
    setToggling(true);
    const newVal = !isAvailable;
    const res = await doctorAPI.toggleVideoAvailability(newVal, videoConsultFee ? Number(videoConsultFee) : undefined);
    if (res.success) {
      setIsAvailable(newVal);
      toast.success(newVal
        ? '🟢 You are now live for instant video consults!'
        : '⭕ You are now offline for video consults');
      if (!newVal) setRequests([]);
    } else {
      toast.error(res.error || 'Failed to update availability');
    }
    setToggling(false);
  };

  const handleJoin = async (appointment) => {
    setJoiningId(appointment._id);
    const res = await doctorAPI.getVideoToken(appointment._id);
    if (res.success) {
      navigate(`/video-room/${appointment._id}`);
    } else {
      toast.error(res.error || 'Failed to get video room');
    }
    setJoiningId(null);
  };

  if (!profileLoaded) {
    return (
      <DashboardLayout title="Video Consultation">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Spinner size={40} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Video Consultation">
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* ── Hero Toggle Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: isAvailable
              ? 'linear-gradient(135deg, #059669 0%, #0ea5e9 100%)'
              : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '24px',
            padding: '40px',
            marginBottom: '24px',
            color: 'white',
            boxShadow: isAvailable
              ? '0 20px 60px rgba(5,150,105,0.35)'
              : '0 20px 40px rgba(0,0,0,0.2)',
            transition: 'background 0.5s ease, box-shadow 0.5s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Animated background circles */}
          {isAvailable && (
            <>
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.05, 0.15] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{
                  position: 'absolute', width: '300px', height: '300px',
                  borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                  right: '-80px', top: '-80px'
                }}
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.04, 0.1] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                style={{
                  position: 'absolute', width: '200px', height: '200px',
                  borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
                  left: '-40px', bottom: '-40px'
                }}
              />
            </>
          )}

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {isAvailable
                  ? <Wifi size={28} strokeWidth={2} />
                  : <WifiOff size={28} strokeWidth={2} />}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>
                  {isAvailable ? 'You\'re Live 🟢' : 'Go Live for Video Consults'}
                </h2>
                <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '14px' }}>
                  {isAvailable
                    ? 'Patients can see you and request an instant consultation'
                    : 'Toggle on to make yourself available for instant video calls'}
                </p>
              </div>
            </div>

            {/* Fee input */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', opacity: 0.8 }}>
                Video Consult Fee (₹)
              </label>
              <input
                type="number"
                value={videoConsultFee}
                onChange={e => setVideoConsultFee(e.target.value)}
                placeholder="e.g. 300"
                style={{
                  width: '160px', padding: '10px 14px', borderRadius: '12px',
                  border: '2px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)',
                  color: 'white', fontSize: '16px', fontWeight: 700, outline: 'none'
                }}
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.02 }}
              onClick={handleToggle}
              disabled={toggling}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                padding: '14px 28px', borderRadius: '14px', border: 'none',
                background: isAvailable ? 'rgba(255,255,255,0.2)' : 'white',
                color: isAvailable ? 'white' : '#059669',
                fontWeight: 800, fontSize: '16px', cursor: toggling ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
              }}
            >
              {toggling ? <Spinner size={20} /> : isAvailable ? <VideoOff size={20} /> : <Video size={20} />}
              {toggling ? 'Updating...' : isAvailable ? 'Go Offline' : 'Go Live Now'}
            </motion.button>
          </div>
        </motion.div>

        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { icon: Users, label: 'Waiting', value: requests.filter(r => r.videoStatus === 'PENDING').length, color: '#f59e0b' },
            { icon: Activity, label: 'Active', value: requests.filter(r => r.videoStatus === 'ACTIVE').length, color: '#10b981' },
            { icon: Shield, label: 'Status', value: isAvailable ? 'Live' : 'Offline', color: isAvailable ? '#10b981' : '#94a3b8' },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: 'white', borderRadius: '16px', padding: '20px',
              border: '1px solid var(--border-light)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <stat.icon size={18} color={stat.color} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{stat.label}</span>
              </div>
              <span style={{ fontSize: '28px', fontWeight: 800, color: stat.color }}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        {/* ── Incoming Requests ── */}
        <div style={{
          background: 'white', borderRadius: '20px',
          border: '1px solid var(--border-light)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid var(--border-light)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
              Incoming Consult Requests
            </h3>
            <button
              onClick={fetchRequests}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600 }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div style={{ padding: '16px 24px' }}>
            {!isAvailable ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                <VideoOff size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Go live to receive consult requests</p>
              </div>
            ) : loadingRequests && requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}><Spinner size={32} /></div>
            ) : requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                <Clock size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>No requests yet</p>
                <p style={{ margin: '6px 0 0', fontSize: '13px' }}>Patients who request a consult will appear here</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <AnimatePresence>
                  {requests.map(appt => (
                    <motion.div
                      key={appt._id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16 }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 20px', borderRadius: '14px',
                        border: `2px solid ${appt.videoStatus === 'ACTIVE' ? '#10b981' : '#f59e0b'}22`,
                        background: appt.videoStatus === 'ACTIVE' ? '#ecfdf5' : '#fffbeb'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '12px',
                          background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                        }}>
                          <img
                            src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(appt.patientId?.name || 'P')}`}
                            alt="" style={{ width: '36px', height: '36px', borderRadius: '8px' }}
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '15px' }}>
                            {appt.patientId?.name || 'Patient'}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {appt.videoStatus === 'ACTIVE'
                              ? <><CheckCircle size={12} color="#10b981" /> In progress</>
                              : <><AlertCircle size={12} color="#f59e0b" /> Waiting for you</>}
                            <span>•</span>
                            <Clock size={12} /> {new Date(appt.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleJoin(appt)}
                        disabled={joiningId === appt._id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '10px 20px', borderRadius: '10px', border: 'none',
                          background: 'linear-gradient(135deg, #059669, #0ea5e9)',
                          color: 'white', fontWeight: 700, fontSize: '14px',
                          cursor: joiningId === appt._id ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 14px rgba(5,150,105,0.3)'
                        }}
                      >
                        {joiningId === appt._id ? <Spinner size={16} /> : <><Phone size={15} /> Join Call</>}
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* How it works */}
        <div style={{ marginTop: '24px', padding: '24px', background: 'var(--bg-secondary)', borderRadius: '16px' }}>
          <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            HOW IT WORKS
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { step: '1', text: 'Toggle "Go Live" to mark yourself as available' },
              { step: '2', text: 'Patients see you in the "Instant Video Consult" section' },
              { step: '3', text: 'When a patient requests, you\'ll see them above' },
              { step: '4', text: 'Click "Join Call" to enter the video room' },
            ].map(item => (
              <div key={item.step} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{
                  flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%',
                  background: 'var(--color-primary-100)', color: 'var(--color-primary-600)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 800
                }}>{item.step}</span>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', paddingTop: '3px' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
