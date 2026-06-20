import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  MessageSquare, X, Send, Clock,
  Maximize2, Minimize2, User, CheckCircle,
  Camera, AlertTriangle, RefreshCw, Shield
} from 'lucide-react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { patientAPI, doctorAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { Spinner } from '../../components/ui';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

// ─── Permission Request Screen ───────────────────────────────────────────────
function PermissionScreen({ onGranted, onDenied }) {
  const [requesting, setRequesting] = useState(false);
  const [errorType, setErrorType] = useState(null);

  const requestPermission = async () => {
    setRequesting(true);
    setErrorType(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      onGranted(stream);
    } catch (err) {
      const name = err.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrorType('denied');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setErrorType('notfound');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setErrorType('inuse');
      } else {
        setErrorType('other');
      }
    }
    setRequesting(false);
  };

  const joinAudioOnly = async () => {
    setRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      onGranted(stream, true); // true = audio only
    } catch (err) {
      onDenied();
    }
    setRequesting(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '24px',
          padding: '48px 40px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          color: 'white'
        }}
      >
        {/* Icon */}
        <motion.div
          animate={errorType ? {} : { scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            width: '80px', height: '80px', borderRadius: '24px',
            background: errorType
              ? 'rgba(239,68,68,0.2)'
              : 'linear-gradient(135deg, #2563eb, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            border: `2px solid ${errorType ? 'rgba(239,68,68,0.4)' : 'rgba(37,99,235,0.4)'}`
          }}
        >
          {errorType
            ? <AlertTriangle size={36} color="#ef4444" />
            : <Camera size={36} color="white" />}
        </motion.div>

        {!errorType ? (
          <>
            <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 800 }}>
              Camera & Microphone Access
            </h2>
            <p style={{ margin: '0 0 32px', opacity: 0.75, fontSize: '15px', lineHeight: 1.6 }}>
              To join the video consultation, please allow access to your camera and microphone when your browser prompts you.
            </p>
            <div style={{
              background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px 20px',
              marginBottom: '28px', textAlign: 'left', border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, opacity: 0.5, marginBottom: '10px', letterSpacing: '0.05em' }}>
                HOW TO ALLOW ACCESS
              </div>
              {[
                'Click the camera icon 🎥 in your browser address bar',
                'Select "Allow" for both Camera and Microphone',
                'Then click "Enable Camera & Mic" below',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: i < 2 ? '8px' : 0 }}>
                  <span style={{
                    flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%',
                    background: '#2563eb', fontSize: '11px', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>{i + 1}</span>
                  <span style={{ fontSize: '13px', opacity: 0.8, paddingTop: '2px' }}>{step}</span>
                </div>
              ))}
            </div>
          </>
        ) : errorType === 'denied' ? (
          <>
            <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 800 }}>Permission Blocked</h2>
            <p style={{ margin: '0 0 20px', opacity: 0.75, fontSize: '14px', lineHeight: 1.6 }}>
              Camera/microphone access was blocked. To fix this:
            </p>
            <div style={{
              background: 'rgba(239,68,68,0.1)', borderRadius: '14px', padding: '16px 20px',
              marginBottom: '24px', textAlign: 'left', border: '1px solid rgba(239,68,68,0.2)'
            }}>
              {[
                'Click the 🔒 lock icon in your browser address bar',
                'Find Camera and Microphone settings',
                'Change both from "Block" to "Allow"',
                'Refresh this page and try again',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: i < 3 ? '8px' : 0 }}>
                  <span style={{
                    flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%',
                    background: 'rgba(239,68,68,0.4)', fontSize: '11px', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>{i + 1}</span>
                  <span style={{ fontSize: '13px', opacity: 0.8, paddingTop: '2px' }}>{step}</span>
                </div>
              ))}
            </div>
          </>
        ) : errorType === 'notfound' ? (
          <>
            <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 800 }}>No Camera Found</h2>
            <p style={{ margin: '0 0 24px', opacity: 0.75, fontSize: '14px', lineHeight: 1.6 }}>
              No camera was detected on this device. You can still join the call with audio only.
            </p>
          </>
        ) : errorType === 'inuse' ? (
          <>
            <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 800 }}>Camera In Use</h2>
            <p style={{ margin: '0 0 24px', opacity: 0.75, fontSize: '14px', lineHeight: 1.6 }}>
              Your camera is being used by another application. Close other apps using the camera, then try again.
            </p>
          </>
        ) : (
          <>
            <h2 style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 800 }}>Access Error</h2>
            <p style={{ margin: '0 0 24px', opacity: 0.75, fontSize: '14px', lineHeight: 1.6 }}>
              Could not access camera/microphone. Try joining with audio only.
            </p>
          </>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {errorType !== 'denied' && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={requestPermission}
              disabled={requesting}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
                color: 'white', fontWeight: 800, fontSize: '15px',
                cursor: requesting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: '0 8px 24px rgba(37,99,235,0.35)'
              }}
            >
              {requesting ? <Spinner size={20} /> : <Camera size={18} />}
              {requesting ? 'Requesting access...' : 'Enable Camera & Mic'}
            </motion.button>
          )}

          {errorType && errorType !== 'denied' && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={joinAudioOnly}
              disabled={requesting}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: 'white', fontWeight: 700, fontSize: '15px',
                cursor: requesting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
              }}
            >
              <Mic size={18} /> Join with Audio Only
            </motion.button>
          )}

          {errorType === 'denied' && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => window.location.reload()}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)',
                color: 'white', fontWeight: 700, fontSize: '15px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
              }}
            >
              <RefreshCw size={18} /> Refresh & Try Again
            </motion.button>
          )}

          {!errorType && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={joinAudioOnly}
              disabled={requesting}
              style={{
                width: '100%', padding: '12px', borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '14px',
                cursor: requesting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <Mic size={16} /> Join with Audio Only
            </motion.button>
          )}
        </div>

        <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: 0.4, fontSize: '12px' }}>
          <Shield size={12} />
          Camera and microphone are only used during this consultation
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Video Room ──────────────────────────────────────────────────────────
export default function VideoRoomPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isDoctor = user?.role === 'doctor';

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerSocketIdRef = useRef(null);
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Phase: 'permission' | 'connecting' | 'call' | 'ended' | 'error'
  const [phase, setPhase] = useState('permission');
  const [roomInfo, setRoomInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [audioOnly, setAudioOnly] = useState(false);

  // Call state
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [peerConnected, setPeerConnected] = useState(false);
  const [ending, setEnding] = useState(false);
  const [pipMode, setPipMode] = useState(false);

  const scrollChat = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // Called when permission granted (from PermissionScreen)
  const handlePermissionGranted = useCallback(async (stream, audioOnlyMode = false) => {
    setAudioOnly(audioOnlyMode);
    setPhase('connecting');
    localStreamRef.current = stream;

    // Set local video preview
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // Fetch video room token
    const tokenRes = isDoctor
      ? await doctorAPI.getVideoToken(appointmentId)
      : await patientAPI.getVideoToken(appointmentId);

    if (!tokenRes.success) {
      stream.getTracks().forEach(t => t.stop());
      setErrorMsg(tokenRes.error || 'Could not join the video room. Please check your appointment.');
      setPhase('error');
      return;
    }

    const info = tokenRes.data;
    setRoomInfo(info);

    // Build peer connection
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && socketRef.current) {
        socketRef.current.emit('video:ice-candidate', {
          roomId: info.videoRoomId,
          candidate: e.candidate,
          targetSocketId: peerSocketIdRef.current || null
        });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
        setPeerConnected(true);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setPeerConnected(true);
      if (['disconnected', 'failed'].includes(pc.connectionState)) setPeerConnected(false);
    };

    // Add local tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Connect socket
    const sock = io(SOCKET_URL, { transports: ['websocket', 'polling'], withCredentials: true });
    socketRef.current = sock;

    sock.on('connect', () => {
      sock.emit('video:join', { roomId: info.videoRoomId, userId: user?.id, role: user?.role });
      sock.emit('join_appointment', appointmentId);
    });

    sock.on('video:peer_joined', async ({ socketId }) => {
      peerSocketIdRef.current = socketId;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sock.emit('video:offer', { roomId: info.videoRoomId, offer, targetSocketId: socketId });
      } catch (err) { console.error('Offer error:', err); }
    });

    sock.on('video:offer', async ({ offer, fromSocketId }) => {
      peerSocketIdRef.current = fromSocketId;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sock.emit('video:answer', { roomId: info.videoRoomId, answer, targetSocketId: fromSocketId });
      } catch (err) { console.error('Answer error:', err); }
    });

    sock.on('video:answer', async ({ answer }) => {
      try {
        if (pc.signalingState !== 'stable') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) { console.error('Set answer error:', err); }
    });

    sock.on('video:ice-candidate', async ({ candidate }) => {
      try {
        if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) { console.error('ICE error:', err); }
    });

    sock.on('video:call_ended', () => {
      toast('The other person has ended the call', { icon: '📞' });
      doCleanup();
      setPhase('ended');
    });

    sock.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      scrollChat();
    });

    // Load existing messages
    const msgRes = isDoctor
      ? await doctorAPI.listMessages(appointmentId)
      : await patientAPI.listMessages(appointmentId);
    if (msgRes.success) {
      setMessages(msgRes.data || []);
      scrollChat();
    }

    // Start call timer
    timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);

    setPhase('call');
  }, [appointmentId, isDoctor, user]);

  const doCleanup = useCallback(() => {
    clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    return () => doCleanup();
  }, [doCleanup]);

  // ─── Controls ───
  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); }
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOn(track.enabled); }
  };

  const handleEndCall = async () => {
    setEnding(true);
    if (roomInfo) socketRef.current?.emit('video:end', { roomId: roomInfo.videoRoomId });
    if (isDoctor) {
      await doctorAPI.endVideoCall(appointmentId).catch(() => {});
    }
    toast.success('Call ended');
    doCleanup();
    setPhase('ended');
    setEnding(false);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    setSendingMsg(true);
    const fd = new FormData();
    fd.append('content', chatInput);
    const res = isDoctor
      ? await doctorAPI.sendMessage(appointmentId, fd)
      : await patientAPI.sendMessage(appointmentId, fd);
    if (res.success) setChatInput('');
    else toast.error('Failed to send message');
    setSendingMsg(false);
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ─── Phase: permission ───
  if (phase === 'permission') {
    return (
      <PermissionScreen
        onGranted={handlePermissionGranted}
        onDenied={() => navigate(-1)}
      />
    );
  }

  // ─── Phase: connecting ───
  if (phase === 'connecting') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f172a',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', color: 'white', gap: '20px'
      }}>
        <Spinner size={44} />
        <p style={{ fontSize: '16px', opacity: 0.7 }}>Connecting to your consultation room...</p>
      </div>
    );
  }

  // ─── Phase: error ───
  if (phase === 'error') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f172a',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', color: 'white', gap: '20px', padding: '24px'
      }}>
        <AlertTriangle size={52} color="#ef4444" />
        <h2 style={{ margin: 0 }}>Cannot Join Room</h2>
        <p style={{ opacity: 0.7, textAlign: 'center', maxWidth: '400px' }}>{errorMsg}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setPhase('permission')}
            style={{
              padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent', color: 'white', fontWeight: 700, fontSize: '14px', cursor: 'pointer'
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 24px', borderRadius: '12px', border: 'none',
              background: '#2563eb', color: 'white', fontWeight: 700, fontSize: '14px', cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ─── Phase: ended ───
  if (phase === 'ended') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f172a',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', color: 'white', gap: '20px'
      }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
          <CheckCircle size={72} color="#10b981" />
        </motion.div>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Call Ended</h2>
        <p style={{ opacity: 0.6 }}>Duration: {fmt(callDuration)}</p>
        <button
          onClick={() => navigate(isDoctor ? '/doctor/appointments' : '/patient/appointments')}
          style={{
            padding: '14px 32px', borderRadius: '14px', border: 'none',
            background: '#2563eb', color: 'white', fontWeight: 700, fontSize: '15px', cursor: 'pointer'
          }}
        >
          Go to Appointments
        </button>
      </div>
    );
  }

  // ─── Phase: call ───
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* ── Top Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        zIndex: 20, flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: peerConnected ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
            border: `1px solid ${peerConnected ? '#10b98140' : '#f59e0b40'}`,
            borderRadius: '20px', padding: '5px 12px'
          }}>
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: '7px', height: '7px', borderRadius: '50%', background: peerConnected ? '#10b981' : '#f59e0b', flexShrink: 0 }}
            />
            <span style={{ color: peerConnected ? '#10b981' : '#f59e0b', fontSize: '12px', fontWeight: 700 }}>
              {peerConnected ? 'Connected' : 'Waiting...'}
            </span>
          </div>
          {audioOnly && (
            <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', borderRadius: '10px', padding: '4px 10px', fontWeight: 600 }}>
              Audio Only
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.7)' }}>
          <Clock size={14} />
          <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 700 }}>{fmt(callDuration)}</span>
        </div>

        <button
          onClick={() => setShowChat(s => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: showChat ? '#2563eb' : 'rgba(255,255,255,0.08)',
            border: 'none', borderRadius: '10px', padding: '7px 14px',
            color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600
          }}
        >
          <MessageSquare size={14} /> Chat
          {messages.length > 0 && !showChat && (
            <span style={{
              background: '#ef4444', color: 'white', borderRadius: '999px',
              fontSize: '10px', fontWeight: 800, padding: '1px 5px', minWidth: '16px', textAlign: 'center'
            }}>{messages.length}</span>
          )}
        </button>
      </div>

      {/* ── Video + Chat Area ── */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>

        {/* Remote video */}
        <div style={{ flex: 1, position: 'relative', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {!peerConnected && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.35)', gap: '16px'
            }}>
              <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity }}>
                <User size={72} />
              </motion.div>
              <p style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Waiting for the other person to join...</p>
              <p style={{ fontSize: '12px', opacity: 0.5, margin: 0 }}>Share the room link or wait for them to connect</p>
            </div>
          )}
        </div>

        {/* Local video PiP — always render so ref is always set */}
        <motion.div
          drag dragConstraints={{ top: -300, bottom: 300, left: -500, right: 0 }}
          style={{
            position: 'absolute',
            bottom: '16px',
            right: showChat ? '376px' : '16px',
            width: pipMode ? '260px' : '160px',
            height: pipMode ? '195px' : '120px',
            borderRadius: '12px', overflow: 'hidden',
            border: '2px solid rgba(255,255,255,0.18)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            background: '#0f172a', cursor: 'grab', zIndex: 10,
            transition: 'right 0.3s ease, width 0.2s, height 0.2s'
          }}
        >
          {audioOnly ? (
            <div style={{
              width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: 'linear-gradient(135deg, #1e293b, #334155)'
            }}>
              <Mic size={28} color="rgba(255,255,255,0.5)" />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Audio Only</span>
            </div>
          ) : (
            <>
              <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
              {!camOn && (
                <div style={{
                  position: 'absolute', inset: 0, background: '#1e293b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <VideoOff size={24} color="rgba(255,255,255,0.4)" />
                </div>
              )}
            </>
          )}
          <button
            onClick={() => setPipMode(m => !m)}
            style={{
              position: 'absolute', top: '5px', right: '5px',
              background: 'rgba(0,0,0,0.5)', border: 'none',
              borderRadius: '5px', padding: '3px', cursor: 'pointer', color: 'white',
              display: 'flex', alignItems: 'center'
            }}
          >
            {pipMode ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
          </button>
          <div style={{ position: 'absolute', bottom: '5px', left: '7px', color: 'rgba(255,255,255,0.6)', fontSize: '10px', fontWeight: 600 }}>You</div>
        </motion.div>

        {/* Chat Panel */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ x: 340 }} animate={{ x: 0 }} exit={{ x: 340 }}
              transition={{ type: 'tween', duration: 0.22 }}
              style={{
                width: '340px', display: 'flex', flexDirection: 'column',
                background: '#1e293b', borderLeft: '1px solid rgba(255,255,255,0.07)', zIndex: 15, flexShrink: 0
              }}
            >
              <div style={{
                padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>In-Call Chat</span>
                <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>
                  <X size={17} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', marginTop: '40px' }}>No messages yet</p>
                ) : messages.map((msg, i) => {
                  const isMine = msg.senderId?._id === user?.id || msg.senderId === user?.id;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '78%',
                        background: isMine ? '#2563eb' : 'rgba(255,255,255,0.09)',
                        color: 'white', padding: '9px 13px',
                        borderRadius: isMine ? '13px 13px 3px 13px' : '13px 13px 13px 3px',
                        fontSize: '13px', lineHeight: '1.5'
                      }}>
                        {msg.content}
                        {msg.fileUrl && (
                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd', display: 'block', marginTop: '4px', fontSize: '12px' }}>
                            📎 {msg.fileName || 'Attachment'}
                          </a>
                        )}
                      </div>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', marginTop: '3px' }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '8px' }}>
                <input
                  value={chatInput} onChange={e => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  style={{
                    flex: 1, padding: '9px 13px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.13)',
                    background: 'rgba(255,255,255,0.07)', color: 'white', fontSize: '13px', outline: 'none'
                  }}
                />
                <button type="submit" disabled={sendingMsg || !chatInput.trim()} style={{
                  width: '38px', height: '38px', borderRadius: '9px', border: 'none',
                  background: '#2563eb', color: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: (!chatInput.trim() || sendingMsg) ? 0.45 : 1
                }}>
                  <Send size={15} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Controls Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px',
        padding: '14px 24px',
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        zIndex: 20, flexShrink: 0
      }}>

        {/* Mic */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={toggleMic} title={micOn ? 'Mute' : 'Unmute'} style={{
          width: '50px', height: '50px', borderRadius: '50%', border: 'none',
          background: micOn ? 'rgba(255,255,255,0.1)' : '#ef4444',
          color: 'white', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: micOn ? 'none' : '0 4px 16px rgba(239,68,68,0.45)'
        }}>
          {micOn ? <Mic size={21} /> : <MicOff size={21} />}
        </motion.button>

        {/* Camera (hidden in audio-only mode) */}
        {!audioOnly && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={toggleCam} title={camOn ? 'Turn off camera' : 'Turn on camera'} style={{
            width: '50px', height: '50px', borderRadius: '50%', border: 'none',
            background: camOn ? 'rgba(255,255,255,0.1)' : '#ef4444',
            color: 'white', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: camOn ? 'none' : '0 4px 16px rgba(239,68,68,0.45)'
          }}>
            {camOn ? <Video size={21} /> : <VideoOff size={21} />}
          </motion.button>
        )}

        {/* End Call */}
        <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }} onClick={handleEndCall} disabled={ending} style={{
          width: '62px', height: '62px', borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg, #dc2626, #ef4444)',
          color: 'white', cursor: ending ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 24px rgba(220,38,38,0.5)',
        }}>
          {ending ? <Spinner size={22} /> : <PhoneOff size={25} />}
        </motion.button>

        {/* Chat */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowChat(s => !s)} style={{
          width: '50px', height: '50px', borderRadius: '50%', border: 'none',
          background: showChat ? '#2563eb' : 'rgba(255,255,255,0.1)',
          color: 'white', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MessageSquare size={21} />
        </motion.button>

        {/* PiP resize */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setPipMode(m => !m)} style={{
          width: '50px', height: '50px', borderRadius: '50%', border: 'none',
          background: 'rgba(255,255,255,0.1)',
          color: 'white', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {pipMode ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
        </motion.button>
      </div>
    </div>
  );
}
