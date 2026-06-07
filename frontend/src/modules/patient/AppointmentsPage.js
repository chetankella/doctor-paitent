import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, User, Building2, Key, XCircle, 
  CheckCircle, AlertTriangle, Clipboard, ClipboardList, FileText, Send, Paperclip, X, Download, Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../layouts/DashboardLayout';
import { patientAPI } from '../../services/api';
import { Spinner, EmptyState } from '../../components/ui';
import Modal from '../../components/ui/Modal';
import { io } from 'socket.io-client';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'past'
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Cancel dialog state
  const [cancellingApp, setCancellingApp] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Patient Prescription Upload State (if doctor skipped it)
  const [uploadingApp, setUploadingApp] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Chat Side-Panel Drawer State
  const [activeChatApp, setActiveChatApp] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [messageFile, setMessageFile] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const res = await patientAPI.listPatientAppointments();
    if (res.success) {
      setAppointments(res.data || []);
    } else {
      toast.error(res.error || 'Failed to load appointments');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleCancelClick = (app) => {
    setCancellingApp(app);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingApp) return;
    setCancelling(true);
    const res = await patientAPI.cancelAppointment(cancellingApp._id);
    if (res.success) {
      toast.success('Appointment cancelled successfully');
      setCancellingApp(null);
      fetchAppointments();
    } else {
      toast.error(res.error || 'Failed to cancel appointment');
    }
    setCancelling(false);
  };

  // Handle patient prescription upload
  const handleUploadConfirm = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadingApp) return;

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('prescription', uploadFile);

    const res = await patientAPI.uploadPrescription(uploadingApp._id, formData);
    if (res.success) {
      toast.success('Prescription copy uploaded successfully!');
      setUploadingApp(null);
      setUploadFile(null);
      fetchAppointments();
    } else {
      toast.error(res.error || 'Failed to upload file');
    }
    setUploadLoading(false);
  };

  // Fetch chat messages
  const fetchChatMessages = useCallback(async (appId) => {
    const res = await patientAPI.listMessages(appId);
    if (res.success) {
      setMessages(res.data || []);
    }
  }, []);

  // Connect to socket and listen for messages in active chat
  useEffect(() => {
    if (activeChatApp) {
      fetchChatMessages(activeChatApp._id);

      // Initialize socket
      const socketUrl = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '') : 'http://localhost:5000';
      socketRef.current = io(socketUrl, {
        transports: ['websocket', 'polling']
      });

      socketRef.current.on('connect', () => {
        socketRef.current.emit('join_appointment', activeChatApp._id);
      });

      socketRef.current.on('receive_message', (newMsg) => {
        setMessages(prev => {
          // Prevent duplicates
          if (prev.find(m => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [activeChatApp, fetchChatMessages]);

  // Auto scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleOpenChat = (app) => {
    setActiveChatApp(app);
    setMessages([]);
    setMessagesLoading(true);
    fetchChatMessages(app._id).finally(() => setMessagesLoading(false));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !messageFile) return;

    setSendingMessage(true);
    const formData = new FormData();
    if (newMessage.trim()) formData.append('content', newMessage.trim());
    if (messageFile) formData.append('file', messageFile);

    const res = await patientAPI.sendMessage(activeChatApp._id, formData);
    if (res.success) {
      setNewMessage('');
      setMessageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // We don't fetchChatMessages here because socket will deliver the sent message back to us
    } else {
      toast.error(res.error || 'Failed to send message');
    }
    setSendingMessage(false);
  };

  const copyToClipboard = (token) => {
    navigator.clipboard.writeText(token);
    toast.success('Access token copied to clipboard!');
  };

  // Filter appointments
  const upcomingApps = appointments.filter(app => {
    const appDate = new Date(app.date);
    appDate.setHours(23, 59, 59, 999); // include today
    return app.status === 'BOOKED' && appDate >= new Date();
  });

  const pastApps = appointments.filter(app => {
    const appDate = new Date(app.date);
    appDate.setHours(23, 59, 59, 999);
    return app.status !== 'BOOKED' || appDate < new Date();
  });

  const displayApps = activeTab === 'upcoming' ? upcomingApps : pastApps;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'BOOKED':
        return <span className="badge badge-info">Confirmed</span>;
      case 'COMPLETED':
        return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12} /> Completed</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> Cancelled</span>;
      default:
        return <span className="badge badge-warning">{status}</span>;
    }
  };

  return (
    <DashboardLayout title="My Appointments">
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <h1>Consultation History</h1>
        <p>View upcoming bookings, cancel appointments, and view shared clinical data tokens</p>
      </div>

      {/* Tabs list */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border-light)',
        marginBottom: 'var(--space-6)', gap: 'var(--space-6)'
      }}>
        <button
          onClick={() => setActiveTab('upcoming')}
          style={{
            padding: '12px 4px', background: 'none', border: 'none',
            borderBottom: activeTab === 'upcoming' ? '3px solid var(--color-primary-500)' : '3px solid transparent',
            color: activeTab === 'upcoming' ? 'var(--color-primary-700)' : 'var(--text-secondary)',
            fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease', fontSize: 'var(--font-size-sm)'
          }}
        >
          Upcoming Bookings ({upcomingApps.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          style={{
            padding: '12px 4px', background: 'none', border: 'none',
            borderBottom: activeTab === 'past' ? '3px solid var(--color-primary-500)' : '3px solid transparent',
            color: activeTab === 'past' ? 'var(--color-primary-700)' : 'var(--text-secondary)',
            fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease', fontSize: 'var(--font-size-sm)'
          }}
        >
          Past & Cancelled ({pastApps.length})
        </button>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <Spinner size={36} />
        </div>
      ) : displayApps.length > 0 ? (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <AnimatePresence mode="popLayout">
            {displayApps.map((app, idx) => (
              <motion.div
                key={app._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="card animate-fade-in"
                style={{ border: '1px solid var(--border-light)', overflow: 'hidden', padding: 0 }}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  padding: 'var(--space-4)',
                  gap: 'var(--space-4)'
                }}>
                  {/* Doctor Info */}
                  <div style={{ display: 'flex', gap: 'var(--space-4)', flex: 2, minWidth: isMobile ? '100%' : '250px' }}>
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, var(--color-primary-100) 0%, var(--color-primary-200) 100%)',
                      color: 'var(--color-primary-700)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0
                    }}>
                      <User size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          Dr. {app.doctorId?.userId?.name || 'Doctor'}
                        </h3>
                        {getStatusBadge(app.status)}
                      </div>
                      <span className="badge badge-info" style={{ marginTop: '4px', display: 'inline-block' }}>
                        {app.doctorId?.specialization || 'Specialist'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '8px' }}>
                        <Building2 size={13} />
                        <span>{app.organizationId?.name || 'Independent Clinic'} ({app.organizationId?.city || 'India'})</span>
                      </div>
                    </div>
                  </div>

                  {/* Date Time info */}
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'row' : 'column',
                    gap: isMobile ? 'var(--space-4)' : '6px',
                    flex: 1,
                    minWidth: isMobile ? '100%' : '150px',
                    borderTop: isMobile ? '1px dashed var(--border-light)' : 'none',
                    paddingTop: isMobile ? 'var(--space-3)' : 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>
                      <Calendar size={15} style={{ color: 'var(--text-tertiary)' }} />
                      <span>{new Date(app.date).toDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>
                      <Clock size={15} style={{ color: 'var(--text-tertiary)' }} />
                      <span>{app.time}</span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexShrink: 0,
                    width: isMobile ? '100%' : 'auto',
                    borderTop: isMobile ? '1px dashed var(--border-light)' : 'none',
                    paddingTop: isMobile ? 'var(--space-3)' : 0
                  }}>
                    {app.status === 'BOOKED' && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleCancelClick(app)}
                        style={{
                          color: '#ef4444',
                          borderColor: '#fca5a5',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          width: isMobile ? '100%' : 'auto',
                          justifyContent: 'center'
                        }}
                      >
                        <XCircle size={14} /> Cancel Appointment
                      </button>
                    )}
                  </div>
                </div>

                {/* Token detail drawer inside card */}
                {app.shareRecordsToken && app.status === 'BOOKED' && (
                  <div style={{
                    backgroundColor: 'var(--color-primary-50)22',
                    borderTop: '1px solid var(--border-light)',
                    padding: '12px 16px', display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between', gap: '12px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: isMobile ? 'flex-start' : 'center',
                      gap: '8px',
                      flexDirection: isMobile ? 'column' : 'row'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Key size={14} style={{ color: 'var(--color-primary-500)' }} />
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                          Shared Medical Record Token:
                        </span>
                      </div>
                      <code style={{
                        backgroundColor: 'var(--color-primary-100)', color: 'var(--color-primary-900)',
                        padding: '2px 8px', borderRadius: '4px', fontSize: 'var(--font-size-xs)',
                        fontWeight: 700, fontFamily: 'monospace', alignSelf: 'flex-start'
                      }}>{app.shareRecordsToken}</code>
                    </div>
                    <button
                      className="btn btn-ghost"
                      onClick={() => copyToClipboard(app.shareRecordsToken)}
                      style={{
                        fontSize: 'var(--font-size-xs)', padding: '6px 8px',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        width: isMobile ? '100%' : 'auto', justifyContents: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Clipboard size={12} /> Copy Token
                    </button>
                  </div>
                )}

                {/* Completed Consultation Details Footer Panel */}
                {app.status === 'COMPLETED' && (
                  <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderTop: '1px solid var(--border-light)',
                    padding: '12px 16px', display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between', gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={15} style={{ color: '#10b981', flexShrink: 0 }} />
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 500, wordBreak: 'break-all' }}>
                        {app.prescriptionUrl 
                          ? `Prescription: ${app.prescriptionName || 'prescription.pdf'}`
                          : 'No prescription uploaded.'}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: '8px',
                      width: isMobile ? '100%' : 'auto'
                    }}>
                      {!app.prescriptionUrl && (
                        <button
                          className="btn btn-primary"
                          onClick={() => setUploadingApp(app)}
                          style={{
                            fontSize: 'var(--font-size-xs)', padding: '8px 12px',
                            display: 'flex', alignItems: 'center', gap: '4px',
                            backgroundColor: 'var(--color-primary-600)', borderColor: 'var(--color-primary-600)',
                            width: isMobile ? '100%' : 'auto', justifyContent: 'center'
                          }}
                        >
                          <Upload size={13} /> Upload Prescription Copy
                        </button>
                      )}
                      {app.prescriptionUrl && (
                        <a
                          href={app.prescriptionUrl.startsWith('http') ? app.prescriptionUrl : `http://localhost:5000/${app.prescriptionUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost"
                          style={{
                            fontSize: 'var(--font-size-xs)', padding: '8px 12px',
                            display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none',
                            width: isMobile ? '100%' : 'auto', justifyContent: 'center'
                          }}
                        >
                          <Download size={13} /> View Prescription
                        </a>
                      )}
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleOpenChat(app)}
                        style={{
                          fontSize: 'var(--font-size-xs)', padding: '8px 12px',
                          display: 'flex', alignItems: 'center', gap: '4px',
                          width: isMobile ? '100%' : 'auto', justifyContent: 'center'
                        }}
                      >
                        <ClipboardList size={13} /> Chat & Query Doctor
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={Calendar}
            title={activeTab === 'upcoming' ? 'No Upcoming Appointments' : 'No Consultation History'}
            description={activeTab === 'upcoming' ? 'You have no upcoming consultations scheduled. Book a doctor to start.' : 'Your history is empty.'}
          />
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={!!cancellingApp}
        onClose={() => setCancellingApp(null)}
        title="Cancel Appointment"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCancellingApp(null)}>No, Keep Booking</button>
            <button className="btn btn-primary" onClick={handleConfirmCancel} disabled={cancelling} style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}>
              {cancelling ? <Spinner size={16} /> : 'Yes, Cancel Appointment'}
            </button>
          </>
        }
      >
        {cancellingApp && (
          <div style={{ display: 'flex', gap: '12px', padding: '4px 0' }}>
            <AlertTriangle size={36} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                Are you sure you want to cancel your consultation with Dr. {cancellingApp.doctorId?.userId?.name}?
              </p>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                This will release the slot for other patients and immediately revoke the associated medical record access token.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Patient Upload Prescription Copy Modal */}
      <Modal
        isOpen={!!uploadingApp}
        onClose={() => setUploadingApp(null)}
        title="Upload Prescription Copy"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setUploadingApp(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUploadConfirm} disabled={uploadLoading} style={{ backgroundColor: 'var(--color-primary-600)', borderColor: 'var(--color-primary-600)' }}>
              {uploadLoading ? <Spinner size={16} /> : 'Upload Copy'}
            </button>
          </>
        }
      >
        {uploadingApp && (
          <form onSubmit={handleUploadConfirm} style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              You can upload a copy of the prescription issued by Dr. <strong>{uploadingApp.doctorId?.userId?.name}</strong> to save it in your medical consultation history.
            </p>
            <div className="input-group">
              <label style={{ fontWeight: 600 }}>Select Prescription File (PDF or Image)</label>
              <input 
                type="file" 
                accept="application/pdf,image/*" 
                className="input-field" 
                onChange={(e) => setUploadFile(e.target.files[0])}
                style={{ padding: '8px' }}
                required
              />
            </div>
          </form>
        )}
      </Modal>

      {/* Chat Side Drawer panel */}
      <AnimatePresence>
        {activeChatApp && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveChatApp(null)}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: '#000', zIndex: 1000
              }}
            />
            {/* Drawer */}
            <motion.div
              initial={isMobile ? { y: '100%' } : { x: '100%' }}
              animate={isMobile ? { y: 0 } : { x: 0 }}
              exit={isMobile ? { y: '100%' } : { x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              style={isMobile ? {
                position: 'fixed', bottom: 0, left: 0, right: 0, top: 'auto',
                height: '85%', width: '100%', maxWidth: '100%', backgroundColor: 'var(--bg-card)',
                boxShadow: '0 -10px 25px -5px rgba(0, 0, 0, 0.1), 0 -8px 10px -6px rgba(0, 0, 0, 0.1)',
                zIndex: 1001, display: 'flex', flexDirection: 'column',
                borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                overflow: 'hidden'
              } : {
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-card)',
                boxShadow: 'var(--shadow-2xl)', zIndex: 1001, display: 'flex',
                flexDirection: 'column', borderLeft: '1px solid var(--border-light)'
              }}
            >
              {/* Pull Handle for mobile */}
              {isMobile && (
                <div style={{
                  display: 'flex', justifyContent: 'center', padding: '12px 0 0 0',
                  background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-800))',
                  width: '100%'
                }}>
                  <div style={{
                    width: '36px', height: '4px', borderRadius: '2px',
                    backgroundColor: 'rgba(255,255,255,0.35)'
                  }} />
                </div>
              )}

              {/* Header */}
              <div style={{
                padding: isMobile ? '8px var(--space-5) var(--space-4) var(--space-5)' : 'var(--space-4) var(--space-5)',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-800))',
                color: 'white',
                borderTopLeftRadius: isMobile ? '24px' : 0,
                borderTopRightRadius: isMobile ? '24px' : 0,
              }}>
                <div>
                  <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: 0, color: 'white' }}>
                    Consultation Chat
                  </h2>
                  <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85 }}>
                    Doctor: Dr. {activeChatApp.doctorId?.userId?.name}
                  </span>
                </div>
                <button 
                  onClick={() => setActiveChatApp(null)}
                  style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Messages Area */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: 'var(--space-5)',
                display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
                backgroundColor: 'var(--bg-secondary)'
              }}>
                {messagesLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10)' }}>
                    <Spinner size={24} />
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((msg) => {
                    const isMe = msg.senderRole === 'patient';
                    return (
                      <div 
                        key={msg._id}
                        style={{
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '85%', display: 'flex', flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start'
                        }}
                      >
                        <div style={{
                          padding: '10px 14px', borderRadius: '12px',
                          borderTopRightRadius: isMe ? 0 : '12px',
                          borderTopLeftRadius: isMe ? '12px' : 0,
                          backgroundColor: isMe ? 'var(--color-primary-600)' : 'var(--bg-card)',
                          color: isMe ? '#fff' : 'var(--text-primary)',
                          boxShadow: 'var(--shadow-sm)',
                          border: isMe ? 'none' : '1px solid var(--border-light)',
                          wordBreak: 'break-word'
                        }}>
                          {msg.content && <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', whiteSpace: 'pre-wrap' }}>{msg.content}</p>}
                          {msg.fileUrl && (
                            <div style={{ 
                              marginTop: msg.content ? '8px' : 0,
                              paddingTop: msg.content ? '8px' : 0,
                              borderTop: msg.content ? (isMe ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-light)') : 'none',
                              display: 'flex', alignItems: 'center', gap: '8px',
                              overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                              <FileText size={16} style={{ flexShrink: 0 }} />
                              <a 
                                href={msg.fileUrl.startsWith('http') ? msg.fileUrl : `http://localhost:5000/${msg.fileUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ 
                                  color: isMe ? '#fff' : 'var(--color-primary-600)',
                                  fontSize: 'var(--font-size-xs)',
                                  fontWeight: 600,
                                  textDecoration: 'underline',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {msg.fileName || 'Attachment'}
                              </a>
                            </div>
                          )}
                        </div>
                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-tertiary)' }}>
                    <ClipboardList size={32} style={{ margin: '0 auto var(--space-2)' }} />
                    <p style={{ fontSize: 'var(--font-size-sm)', margin: 0 }}>No messages yet. Send a query to Dr. {activeChatApp.doctorId?.userId?.name}.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} style={{
                padding: 'var(--space-4)', borderTop: '1px solid var(--border-light)',
                display: 'grid', gap: '8px', backgroundColor: 'var(--bg-card)',
                paddingBottom: isMobile ? 'calc(var(--space-4) + env(safe-area-inset-bottom, 16px))' : 'var(--space-4)'
              }}>
                {messageFile && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 12px', background: 'var(--color-primary-50)',
                    borderRadius: '6px', border: '1px solid var(--color-primary-200)',
                    fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-700)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden' }}>
                      <Paperclip size={12} style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {messageFile.name}
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setMessageFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary-700)', cursor: 'pointer' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '38px', height: '38px', borderRadius: '50%',
                      border: '1px solid var(--border-light)', background: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-secondary)', cursor: 'pointer', flexShrink: 0
                    }}
                  >
                    <Paperclip size={18} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setMessageFile(e.target.files[0])}
                    style={{ display: 'none' }}
                  />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    style={{ flex: 1, height: '38px', borderRadius: '20px', fontSize: 'var(--font-size-sm)' }}
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || (!newMessage.trim() && !messageFile)}
                    style={{
                      width: '38px', height: '38px', borderRadius: '50%',
                      border: 'none', backgroundColor: 'var(--color-primary-600)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', cursor: 'pointer', flexShrink: 0,
                      opacity: (sendingMessage || (!newMessage.trim() && !messageFile)) ? 0.6 : 1
                    }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
