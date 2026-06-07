import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, User, ClipboardList, CheckCircle, 
  FileText, Check, Ban, Send, Paperclip, X, Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DashboardLayout from '../../layouts/DashboardLayout';
import { doctorAPI } from '../../services/api';
import { Spinner, EmptyState } from '../../components/ui';
import Modal from '../../components/ui/Modal';
import { io } from 'socket.io-client';

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scheduled'); // 'scheduled', 'completed', 'cancelled'
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Completion Modal State
  const [completingApp, setCompletingApp] = useState(null);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [completingLoading, setCompletingLoading] = useState(false);

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
    const res = await doctorAPI.listDoctorAppointments();
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

  // Handle standard Cancel status update
  const handleCancelStatus = async (appId) => {
    const res = await doctorAPI.updateAppointmentStatus(appId, 'CANCELLED');
    if (res.success) {
      toast.success('Appointment cancelled');
      fetchAppointments();
    } else {
      toast.error(res.error || 'Failed to cancel appointment');
    }
  };

  // Open Completion Modal
  const handleOpenCompleteModal = (app) => {
    setCompletingApp(app);
    setPrescriptionFile(null);
  };

  // Handle complete submission (FormData with optional prescription file)
  const handleConfirmComplete = async (e) => {
    e.preventDefault();
    if (!completingApp) return;

    setCompletingLoading(true);
    const formData = new FormData();
    formData.append('status', 'COMPLETED');
    if (prescriptionFile) {
      formData.append('prescription', prescriptionFile);
    }

    const res = await doctorAPI.updateAppointmentStatus(completingApp._id, formData);
    if (res.success) {
      toast.success('Appointment marked as completed');
      setCompletingApp(null);
      fetchAppointments();
    } else {
      toast.error(res.error || 'Failed to complete appointment');
    }
    setCompletingLoading(false);
  };

  // Fetch chat messages
  const fetchChatMessages = useCallback(async (appId) => {
    const res = await doctorAPI.listMessages(appId);
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

    const res = await doctorAPI.sendMessage(activeChatApp._id, formData);
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

  const getFilteredApps = () => {
    switch (activeTab) {
      case 'scheduled':
        return appointments.filter(app => app.status === 'BOOKED');
      case 'completed':
        return appointments.filter(app => app.status === 'COMPLETED');
      case 'cancelled':
        return appointments.filter(app => app.status === 'CANCELLED');
      default:
        return [];
    }
  };

  const displayApps = getFilteredApps();

  return (
    <DashboardLayout title="Appointments">
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <h1>Consultation Bookings</h1>
        <p>Review scheduled patient visits, complete consultations, and manage records via patient tokens</p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border-light)',
        marginBottom: 'var(--space-6)', gap: 'var(--space-6)'
      }}>
        <button
          onClick={() => setActiveTab('scheduled')}
          style={{
            padding: '12px 4px', background: 'none', border: 'none',
            borderBottom: activeTab === 'scheduled' ? '3px solid var(--color-primary-500)' : '3px solid transparent',
            color: activeTab === 'scheduled' ? 'var(--color-primary-700)' : 'var(--text-secondary)',
            fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease', fontSize: 'var(--font-size-sm)'
          }}
        >
          Scheduled ({appointments.filter(app => app.status === 'BOOKED').length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          style={{
            padding: '12px 4px', background: 'none', border: 'none',
            borderBottom: activeTab === 'completed' ? '3px solid var(--color-primary-500)' : '3px solid transparent',
            color: activeTab === 'completed' ? 'var(--color-primary-700)' : 'var(--text-secondary)',
            fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease', fontSize: 'var(--font-size-sm)'
          }}
        >
          Completed ({appointments.filter(app => app.status === 'COMPLETED').length})
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          style={{
            padding: '12px 4px', background: 'none', border: 'none',
            borderBottom: activeTab === 'cancelled' ? '3px solid var(--color-primary-500)' : '3px solid transparent',
            color: activeTab === 'cancelled' ? 'var(--color-primary-700)' : 'var(--text-secondary)',
            fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease', fontSize: 'var(--font-size-sm)'
          }}
        >
          Cancelled ({appointments.filter(app => app.status === 'CANCELLED').length})
        </button>
      </div>

      {/* List */}
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="card"
                style={{ border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', padding: 0 }}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between',
                  padding: 'var(--space-4)',
                  gap: 'var(--space-4)'
                }}>
                  {/* Patient Info */}
                  <div style={{ display: 'flex', gap: 'var(--space-4)', flex: 2, minWidth: isMobile ? '100%' : '220px' }}>
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-primary-100) 100%)',
                      color: 'var(--color-primary-600)', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0
                    }}>
                      <User size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {app.patientId?.name || 'Patient'}
                      </h3>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        {app.patientId?.email}
                      </span>
                      {app.reason && (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          <strong>Reason:</strong> "{app.reason}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Schedule */}
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

                  {/* Actions */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: isMobile ? '100%' : 'auto',
                    borderTop: isMobile ? '1px dashed var(--border-light)' : 'none',
                    paddingTop: isMobile ? 'var(--space-3)' : 0
                  }}>
                    {app.status === 'BOOKED' && (
                      <>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleCancelStatus(app._id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: 'var(--font-size-xs)',
                            color: '#ef4444',
                            borderColor: '#fca5a5',
                            flex: isMobile ? 1 : 'none',
                            justifyContent: 'center'
                          }}
                        >
                          <Ban size={13} /> Cancel
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleOpenCompleteModal(app)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: 'var(--font-size-xs)',
                            backgroundColor: '#10b981',
                            borderColor: '#10b981',
                            flex: isMobile ? 1 : 'none',
                            justifyContent: 'center'
                          }}
                        >
                          <Check size={13} /> Complete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Token-based Patient Actions Panel */}
                {app.accessGrantId && app.status === 'BOOKED' && (
                  <div style={{
                    backgroundColor: 'var(--color-primary-50)22',
                    borderTop: '1px solid var(--border-light)',
                    padding: '12px 16px', display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: '12px', alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      Secure patient record access active (Scope: {app.accessGrantId.scope}):
                    </span>
                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: '8px',
                      width: isMobile ? '100%' : 'auto'
                    }}>
                      <button
                        className="btn btn-ghost"
                        onClick={() => navigate(`/doctor/patients/${app.accessGrantId.grantId}/profile`)}
                        style={{
                          fontSize: 'var(--font-size-xs)', padding: '6px 12px',
                          display: 'flex', alignItems: 'center', gap: '4px',
                          width: isMobile ? '100%' : 'auto', justifyContent: 'center'
                        }}
                      >
                        <User size={13} /> View Medical Profile
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => navigate(`/doctor/patients/${app.accessGrantId.grantId}/notes`)}
                        style={{
                          fontSize: 'var(--font-size-xs)', padding: '6px 12px',
                          display: 'flex', alignItems: 'center', gap: '4px',
                          width: isMobile ? '100%' : 'auto', justifyContent: 'center'
                        }}
                      >
                        <FileText size={13} /> Write Clinical Notes
                      </button>
                    </div>
                  </div>
                )}

                {/* Completed Consultation Details Footer Panel */}
                {app.status === 'COMPLETED' && (
                  <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderTop: '1px solid var(--border-light)',
                    padding: '12px 16px', display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: '12px', alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={15} style={{ color: '#10b981', flexShrink: 0 }} />
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 500, wordBreak: 'break-all' }}>
                        {app.prescriptionUrl 
                          ? `Prescription: ${app.prescriptionName || 'prescription.pdf'}`
                          : 'No prescription uploaded yet.'}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: '8px',
                      width: isMobile ? '100%' : 'auto'
                    }}>
                      {app.prescriptionUrl && (
                        <a
                          href={app.prescriptionUrl.startsWith('http') ? app.prescriptionUrl : `http://localhost:5000/${app.prescriptionUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost"
                          style={{
                            fontSize: 'var(--font-size-xs)', padding: '6px 12px',
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
                          fontSize: 'var(--font-size-xs)', padding: '6px 12px',
                          display: 'flex', alignItems: 'center', gap: '4px',
                          width: isMobile ? '100%' : 'auto', justifyContent: 'center'
                        }}
                      >
                        <ClipboardList size={13} /> Chat & Prescription Thread
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
            icon={ClipboardList}
            title={
              activeTab === 'scheduled' ? 'No Scheduled Appointments' :
              activeTab === 'completed' ? 'No Completed Appointments' : 'No Cancelled Appointments'
            }
            description="Consultations lists are empty."
          />
        </div>
      )}

      {/* Completion Modal */}
      <Modal
        isOpen={!!completingApp}
        onClose={() => setCompletingApp(null)}
        title="Complete Consultation"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCompletingApp(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleConfirmComplete} disabled={completingLoading} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
              {completingLoading ? <Spinner size={16} /> : 'Complete & Save'}
            </button>
          </>
        }
      >
        {completingApp && (
          <form onSubmit={handleConfirmComplete} style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              Are you sure you want to mark this consultation with <strong>{completingApp.patientId?.name}</strong> as completed?
            </p>
            <div className="input-group">
              <label style={{ fontWeight: 600 }}>Upload Prescription Copy (PDF, JPG, PNG)</label>
              <input 
                type="file" 
                accept="application/pdf,image/*" 
                className="input-field"
                onChange={(e) => setPrescriptionFile(e.target.files[0])} 
                style={{ padding: '8px' }}
              />
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                Optional. You can also skip this and upload it later in the consultation chat.
              </span>
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
                    Consultation Thread
                  </h2>
                  <span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.85 }}>
                    Patient: {activeChatApp.patientId?.name}
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
                    const isMe = msg.senderRole === 'doctor';
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
                    <p style={{ fontSize: 'var(--font-size-sm)', margin: 0 }}>No messages yet. Send a note or prescription copy.</p>
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
