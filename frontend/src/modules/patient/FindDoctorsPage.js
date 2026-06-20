import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, User, Award, Building2, Key, ChevronRight,
  Star, Calendar, Stethoscope, CheckCircle2,
  AlertCircle, Thermometer, X, SlidersHorizontal, Video, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../layouts/DashboardLayout';
import { patientAPI } from '../../services/api';
import { Spinner, EmptyState } from '../../components/ui';
import Modal from '../../components/ui/Modal';
import { useNavigate } from 'react-router-dom';

const SPECIALIZATIONS = [
  { name: 'General Physician', icon: Thermometer, color: '#3b82f6' },
  { name: 'Cardiologist', icon: Stethoscope, color: '#ef4444' },
  { name: 'Pediatrician', icon: User, color: '#10b981' },
  { name: 'Dermatologist', icon: SparklesIcon, color: '#8b5cf6' },
  { name: 'Dentist', icon: SmileIcon, color: '#f59e0b' },
  { name: 'Orthopedic', icon: ActivityIcon, color: '#06b6d4' }
];

// Helper icons because we need fallback for custom icons
function SparklesIcon(props) { return <span {...props}>✨</span>; }
function SmileIcon(props) { return <span {...props}>😊</span>; }
function ActivityIcon(props) { return <span {...props}>🦴</span>; }

const EXPERIENCE_OPTIONS = [
  { label: 'Any Experience', value: '' },
  { label: '5+ Years', value: '5' },
  { label: '10+ Years', value: '10' },
  { label: '15+ Years', value: '15' }
];

const RATING_OPTIONS = [
  { label: 'Any Rating', value: '' },
  { label: '4.0+ Stars ⭐', value: '4.0' },
  { label: '4.5+ Stars ⭐', value: '4.5' }
];

const FEE_OPTIONS = [
  { label: 'Any Fee', value: '' },
  { label: 'Under ₹500', value: '500' },
  { label: 'Under ₹1000', value: '1000' }
];

const AVAILABILITY_OPTIONS = [
  { label: 'Any Availability', value: '' },
  { label: 'Available Today', value: 'today' },
  { label: 'Available Tomorrow', value: 'tomorrow' }
];

export default function FindDoctorsPage() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [consultMode, setConsultMode] = useState('video'); // 'video' | 'physical'

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Search & Filters State
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');
  const [rating, setRating] = useState('');
  const [fee, setFee] = useState('');
  const [availability, setAvailability] = useState('');
  const [city, setCity] = useState('');

  // Autocomplete suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);

  // Grant Access Modal State
  const [grantingDoc, setGrantingDoc] = useState(null);
  const [grantForm, setGrantForm] = useState({ scope: 'FULL_PROFILE', expiryDays: 30, reason: '' });
  const [granting, setGranting] = useState(false);

  // Booking Wizard State
  const [bookingDoc, setBookingDoc] = useState(null);
  const [bookingStep, setBookingStep] = useState(1); // 1: Slot, 2: Shared Record & Details, 3: Success
  const [bookingDate, setBookingDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [shareRecords, setShareRecords] = useState(true);
  const [shareScope, setShareScope] = useState('FULL_PROFILE');
  const [shareExpiry, setShareExpiry] = useState(7);
  const [reason, setReason] = useState('');
  const [bookingSubmit, setBookingSubmit] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  // Date list helper for next 5 days
  const [dateList, setDateList] = useState([]);

  useEffect(() => {
    // Generate next 5 days
    const list = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      list.push({
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
        value: d.toISOString().split('T')[0]
      });
    }
    setDateList(list);
    setBookingDate(list[0].value);
  }, []);

  // Fetch Autocomplete Suggestions
  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      const res = await patientAPI.searchAutocomplete(search);
      if (res.success) {
        setSuggestions(res.data || []);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [search]);

  // Click outside listener for suggestions
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Main Fetch Doctors
  const fetchDoctors = useCallback(async () => {
    setLoading(true);

    if (consultMode === 'video') {
      // In video mode: only show doctors available for instant video consult
      const res = await patientAPI.getInstantDoctors();
      if (res.success) {
        setDoctors(res.data || []);
      } else {
        toast.error(res.error || 'Failed to load doctors');
      }
      setLoading(false);
      return;
    }

    // Physical mode: normal search
    const params = {};
    if (search.trim()) params.search = search;
    if (specialization) params.specialization = specialization;
    if (experience) params.experience = experience;
    if (rating) params.rating = rating;
    if (availability) params.availability = availability;
    if (city.trim()) params.city = city;

    const res = await patientAPI.searchDoctors(params);
    if (res.success) {
      let data = res.data || [];
      // Client side fee filter
      if (fee) {
        data = data.filter(doc => doc.consultationFee <= parseInt(fee));
      }
      setDoctors(data);
    } else {
      toast.error(res.error || 'Failed to load doctors');
    }
    setLoading(false);
  }, [search, specialization, experience, rating, availability, city, fee, consultMode]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchDoctors();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [fetchDoctors]);

  // Fetch slots on date change or doctor change
  useEffect(() => {
    if (!bookingDoc || !bookingDate) return;

    const loadSlots = async () => {
      setSlotsLoading(true);
      setSelectedSlot('');
      const res = await patientAPI.getDoctorAvailability(bookingDoc.id, bookingDate);
      if (res.success) {
        let slots = res.data?.slots || [];
        
        // Client-side timezone-safe filter for today's slots
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`; // Browser's local date "YYYY-MM-DD"
        
        if (bookingDate === todayStr) {
          slots = slots.filter(slot => {
            const match = slot.time.match(/^(\d{2}):(\d{2})\s*(AM|PM)$/i);
            if (!match) return true;
            
            let hours = parseInt(match[1], 10);
            const minutes = parseInt(match[2], 10);
            const ampm = match[3].toUpperCase();
            
            if (ampm === 'PM' && hours !== 12) {
              hours += 12;
            } else if (ampm === 'AM' && hours === 12) {
              hours = 0;
            }
            
            const slotDate = new Date();
            slotDate.setHours(hours, minutes, 0, 0);
            
            return slotDate.getTime() > Date.now();
          });
        }
        
        setAvailableSlots(slots);
      } else {
        toast.error('Failed to load slots');
      }
      setSlotsLoading(false);
    };

    loadSlots();
  }, [bookingDoc, bookingDate]);

  // Autocomplete Select
  const handleSelectSuggestion = (sug) => {
    setSearch(sug.value);
    if (sug.type === 'specialization') {
      setSpecialization(sug.value);
    }
    setShowSuggestions(false);
    fetchDoctors();
  };

  // Grant access handlers
  const handleOpenGrantModal = (doc) => {
    setGrantingDoc(doc);
    setGrantForm({ scope: 'FULL_PROFILE', expiryDays: 30, reason: `Clinical consultation with Dr. ${doc.name}` });
  };

  const handleCreateGrant = async (e) => {
    e.preventDefault();
    if (!grantingDoc) return;

    setGranting(true);
    const res = await patientAPI.createGrant({
      doctorEmail: grantingDoc.email,
      scope: grantForm.scope,
      expiryDays: parseInt(grantForm.expiryDays),
      reason: grantForm.reason
    });

    if (res.success) {
      toast.success(`Successfully granted access to Dr. ${grantingDoc.name}!`);
      setGrantingDoc(null);
    } else {
      toast.error(res.error || 'Failed to create access grant');
    }
    setGranting(false);
  };

  // Booking wizard handlers
  const handleOpenBookingModal = (doc) => {
    setBookingDoc(doc);
    setBookingStep(1);
    setSelectedSlot('');
    setReason('');
    setBookingResult(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) {
      toast.error('Please select a time slot');
      return;
    }

    setBookingSubmit(true);
    const res = await patientAPI.bookAppointment({
      doctorId: bookingDoc.id,
      date: bookingDate,
      time: selectedSlot,
      shareRecords,
      scope: shareScope,
      expiryDays: shareExpiry,
      reason
    });

    if (res.success) {
      setBookingResult(res.data);
      setBookingStep(3);
      toast.success('Appointment booked successfully!');
    } else {
      toast.error(res.error || 'Booking failed');
    }
    setBookingSubmit(false);
  };

  return (
    <DashboardLayout title="Find & Book Doctors">
      {/* Autocomplete Search & Filters Card */}
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Search container */}
          <div ref={searchContainerRef} style={{ position: 'relative', flex: 1 }}>
            <Search size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary-500)' }} />
            <input
              type="text"
              placeholder={isMobile ? 'Search doctors, symptoms...' : 'Search doctor names, symptoms (e.g. fever, chest pain), specialization, hospital...'}
              value={search}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              style={{ 
                paddingLeft: 46, paddingRight: 16, width: '100%', height: '52px', 
                borderRadius: '999px',
                border: '1px solid var(--border-light)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                fontSize: '15px',
                backgroundColor: 'white',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocusCapture={(e) => e.target.style.borderColor = 'var(--color-primary-400)'}
              onBlurCapture={(e) => e.target.style.borderColor = 'var(--border-light)'}
            />
            
            {/* Autocomplete Dropdown List */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                    backgroundColor: 'white', border: '1px solid var(--border-light)',
                    borderRadius: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 100,
                    overflow: 'hidden', maxHeight: '300px', padding: '8px'
                  }}
                >
                  {suggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSuggestion(sug)}
                      style={{
                        padding: '12px 16px', cursor: 'pointer', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px',
                        transition: 'background 0.1s ease', color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'var(--bg-secondary)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      {sug.type === 'doctor' ? <User size={16} style={{ color: 'var(--color-primary-500)' }} /> :
                       sug.type === 'specialization' ? <Stethoscope size={16} style={{ color: '#10b981' }} /> :
                       <Thermometer size={16} style={{ color: '#ef4444' }} />}
                      <div>
                        <span style={{ fontWeight: 600 }}>{sug.value}</span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginLeft: '8px' }}>
                          ({sug.type})
                        </span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile: filter button */}
          {isMobile && (
            <button
              onClick={() => setShowFilterSheet(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '52px', height: '52px', flexShrink: 0,
                backgroundColor: 'white',
                border: '1px solid var(--border-light)',
                borderRadius: '999px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <SlidersHorizontal size={20} />
              {(city || experience || rating || fee || availability) && (
                <span style={{
                  position: 'absolute', top: 12, right: 12,
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: 'var(--color-primary-500)', border: '2px solid white'
                }} />
              )}
            </button>
          )}
        </div>

        {/* Desktop: inline filters */}
        {!isMobile && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              onClick={() => setShowFilterSheet(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: 'white', border: '1px solid var(--border-light)',
                borderRadius: '999px', padding: '8px 16px', fontSize: '13px', fontWeight: 600,
                color: 'var(--text-secondary)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <SlidersHorizontal size={14} />
              More Filters
              {(city || experience || rating || fee || availability) && (
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary-500)' }} />
              )}
            </button>
            <div style={{ width: '130px' }}>
              <input type="text" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)}
                style={{ width: '100%', height: '36px', borderRadius: '999px', border: '1px solid var(--border-light)', padding: '0 16px', fontSize: '13px', outline: 'none' }} />
            </div>
          </div>
        )}
      </div>



      {/* ── Consultation Mode Toggle ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 'var(--space-6)',
      }}>
        <div style={{
          display: 'inline-flex',
          backgroundColor: '#f1f5f9',
          borderRadius: '999px',
          padding: '5px',
          position: 'relative',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.08)',
          gap: '4px',
        }}>
          {/* Sliding pill background */}
          <motion.div
            layout
            layoutId="consult-pill"
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            style={{
              position: 'absolute',
              top: '5px',
              bottom: '5px',
              borderRadius: '999px',
              background: consultMode === 'video'
                ? 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)'
                : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              left: consultMode === 'video' ? '5px' : 'calc(50% + 2px)',
              width: 'calc(50% - 7px)',
            }}
          />

          {/* Video Consultation Button */}
          <motion.button
            onClick={() => setConsultMode('video')}
            whileTap={{ scale: 0.97 }}
            style={{
              position: 'relative', zIndex: 1,
              padding: isMobile ? '10px 22px' : '12px 36px',
              borderRadius: '999px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: isMobile ? '13px' : '15px',
              fontWeight: 700,
              color: consultMode === 'video' ? '#fff' : '#64748b',
              transition: 'color 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <motion.span
              animate={{ scale: consultMode === 'video' ? 1.15 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{ fontSize: '18px', lineHeight: 1 }}
            >
              <Video size={18} strokeWidth={2.5} />
            </motion.span>
            Video Consult
          </motion.button>

          {/* Physical Consultation Button */}
          <motion.button
            onClick={() => setConsultMode('physical')}
            whileTap={{ scale: 0.97 }}
            style={{
              position: 'relative', zIndex: 1,
              padding: isMobile ? '10px 22px' : '12px 36px',
              borderRadius: '999px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: isMobile ? '13px' : '15px',
              fontWeight: 700,
              color: consultMode === 'physical' ? '#fff' : '#64748b',
              transition: 'color 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <motion.span
              animate={{ scale: consultMode === 'physical' ? 1.15 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{ fontSize: '18px', lineHeight: 1 }}
            >
              <MapPin size={18} strokeWidth={2.5} />
            </motion.span>
            In-Person
          </motion.button>
        </div>
      </div>

      {/* Mode description hint */}
      <AnimatePresence mode="wait">
        <motion.p
          key={consultMode}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
          style={{
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            marginTop: '-16px',
            marginBottom: 'var(--space-5)',
          }}
        >
          {consultMode === 'video'
            ? 'Connect with a doctor from home — quick & convenient'
            : 'Visit a clinic and meet your doctor in person'}
        </motion.p>
      </AnimatePresence>

      {/* Mobile Filter Bottom Sheet */}
      <AnimatePresence>
        {showFilterSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFilterSheet(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1001,
                background: 'var(--bg-card)', borderRadius: '24px 24px 0 0',
                padding: 'var(--space-5)', paddingBottom: 'calc(var(--space-5) + env(safe-area-inset-bottom, 16px))',
                maxHeight: '80vh', overflowY: 'auto',
                boxShadow: '0 -10px 30px rgba(0,0,0,0.15)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-gray-300)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>Filters</h3>
                <button onClick={() => setShowFilterSheet(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={22} />
                </button>
              </div>
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                <div className="input-group">
                  <label>City</label>
                  <input type="text" className="input-field" placeholder="e.g. Mumbai"
                    value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Experience</label>
                  <select className="input-field" value={experience} onChange={(e) => setExperience(e.target.value)}>
                    {EXPERIENCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Rating</label>
                  <select className="input-field" value={rating} onChange={(e) => setRating(e.target.value)}>
                    {RATING_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Consultation Fee</label>
                  <select className="input-field" value={fee} onChange={(e) => setFee(e.target.value)}>
                    {FEE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Availability</label>
                  <select className="input-field" value={availability} onChange={(e) => setAvailability(e.target.value)}>
                    {AVAILABILITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => {
                    setCity(''); setExperience(''); setRating(''); setFee(''); setAvailability('');
                  }}>Clear All</button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowFilterSheet(false)}>Apply</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Grid List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <Spinner size={40} />
        </div>
      ) : doctors.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 'var(--space-4)' : 'var(--space-6)' }}>
          {doctors.map((doc, idx) => (
            <motion.div
              key={doc.id}
              className="card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={{ y: -6, boxShadow: 'var(--shadow-lg)' }}
              style={{
                display: 'flex', flexDirection: 'column', height: '100%',
                borderRadius: 'var(--radius-xl)', overflow: 'hidden',
                border: '1px solid var(--border-light)', position: 'relative'
              }}
            >
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: 'white' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
                  {/* Avatar */}
                  <img
                    src={doc.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(doc.name)}`}
                    alt={doc.name}
                    style={{
                      width: '64px', height: '64px', borderRadius: '16px',
                      backgroundColor: 'var(--bg-secondary)', objectFit: 'cover'
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                       {consultMode === 'video' && doc.isAvailableForVideoConsult && (
                         <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, color: 'white', background: 'linear-gradient(90deg,#059669,#0ea5e9)', padding: '3px 8px', borderRadius: '6px' }}>
                           <motion.span animate={{ opacity: [1,0.3,1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', display: 'inline-block' }} />
                           LIVE
                         </span>
                       )}
                       <span style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', backgroundColor: '#ecfdf5', padding: '3px 8px', borderRadius: '6px' }}>Available Today</span>
                       <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary-600)', backgroundColor: 'var(--color-primary-50)', padding: '3px 8px', borderRadius: '6px' }}>Verified</span>
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.name}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--color-primary-600)', fontWeight: 600 }}>
                      {doc.specialization}
                    </div>
                  </div>
                </div>

                {/* Rating & Fee */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: '1px solid var(--border-light)', borderTop: '1px solid var(--border-light)',
                  marginBottom: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Star size={15} fill="#f59e0b" color="#f59e0b" />
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{doc.rating}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>({doc.ratingCount} reviews)</span>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '15px' }}>
                    ₹{doc.consultationFee} <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '12px' }}>/ visit</span>
                  </div>
                </div>

                {/* Bio / Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    <Award size={15} color="var(--text-tertiary)" />
                    <span>{doc.experience} Years Exp • {doc.qualifications.join(', ')}</span>
                  </div>
                  {doc.organizations && doc.organizations.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      <Building2 size={15} color="var(--text-tertiary)" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.organizations[0].name}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      <Building2 size={15} color="var(--text-tertiary)" />
                      <span>Independent Practitioner</span>
                    </div>
                  )}
                  {/* Symptoms tags */}
                  {doc.symptoms && doc.symptoms.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {doc.symptoms.slice(0, 3).map((sym, i) => (
                        <span key={i} style={{
                          backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                          padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600
                        }}>
                          {sym}
                        </span>
                      ))}
                      {doc.symptoms.length > 3 && (
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '4px', fontWeight: 500 }}>
                          +{doc.symptoms.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Primary Card Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleOpenGrantModal(doc)}
                    style={{ flex: 1, padding: '10px 0', fontSize: '13px', fontWeight: 700, borderRadius: '12px' }}
                  >
                    Grant Access
                  </button>
                  {consultMode === 'video' ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate('/patient/video-consult')}
                      style={{ flex: 1.5, padding: '10px 0', fontSize: '13px', fontWeight: 700, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'linear-gradient(135deg,#059669,#0ea5e9)', border: 'none' }}
                    >
                      <Video size={14} /> Instant Video
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleOpenBookingModal(doc)}
                      style={{ flex: 1.5, padding: '10px 0', fontSize: '13px', fontWeight: 700, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Calendar size={14} /> Book Now
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={Search}
            title="No Doctors Found"
            description="Adjust your search filters or check again later."
          />
        </div>
      )}

      {/* Grant Access Modal */}
      <Modal
        isOpen={!!grantingDoc}
        onClose={() => setGrantingDoc(null)}
        title={`Grant Medical Profile Access`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setGrantingDoc(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreateGrant} disabled={granting}>
              {granting ? <Spinner size={16} /> : 'Create Access Grant'}
            </button>
          </>
        }
      >
        {grantingDoc && (
          <form onSubmit={handleCreateGrant} style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Doctor Name</span>
                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Dr. {grantingDoc.name}</span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>Email</span>
                <span style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{grantingDoc.email}</span>
              </div>
            </div>

            <div className="input-group">
              <label>Access Scope</label>
              <select
                className="input-field"
                value={grantForm.scope}
                onChange={e => setGrantForm(prev => ({ ...prev, scope: e.target.value }))}
                required
              >
                <option value="EMERGENCY">Emergency Data Only (Limited)</option>
                <option value="SUMMARY">Basic Summary</option>
                <option value="FULL_PROFILE">Full Profile (Recommended)</option>
                <option value="FULL_WITH_WRITE">Full Profile + Clinical Notes Permission</option>
              </select>
            </div>

            <div className="input-group">
              <label>Expiry Period</label>
              <select
                className="input-field"
                value={grantForm.expiryDays}
                onChange={e => setGrantForm(prev => ({ ...prev, expiryDays: e.target.value }))}
                required
              >
                <option value={7}>7 Days</option>
                <option value={30}>30 Days</option>
                <option value={90}>90 Days</option>
                <option value={365}>1 Year</option>
              </select>
            </div>

            <div className="input-group">
              <label>Reason / Purpose</label>
              <input
                className="input-field"
                type="text"
                placeholder="e.g. Specialty consultation"
                value={grantForm.reason}
                onChange={e => setGrantForm(prev => ({ ...prev, reason: e.target.value }))}
                required
              />
            </div>
          </form>
        )}
      </Modal>

      {/* Appointment Booking Wizard Modal */}
      <Modal
        isOpen={!!bookingDoc}
        onClose={() => setBookingDoc(null)}
        title={`Book Consultation: Dr. ${bookingDoc?.name || ''}`}
        footer={
          bookingStep === 1 ? (
            <>
              <button className="btn btn-secondary" onClick={() => setBookingDoc(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => setBookingStep(2)} disabled={!selectedSlot}>
                Continue <ChevronRight size={14} />
              </button>
            </>
          ) : bookingStep === 2 ? (
            <>
              <button className="btn btn-secondary" onClick={() => setBookingStep(1)}>Back</button>
              <button className="btn btn-primary" onClick={handleConfirmBooking} disabled={bookingSubmit}>
                {bookingSubmit ? <Spinner size={16} /> : 'Confirm Booking'}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setBookingDoc(null)}>Close</button>
          )
        }
      >
        {bookingDoc && (
          <div>
            {/* Step 1: Select Date & Time */}
            {bookingStep === 1 && (
              <div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                  <img
                    src={bookingDoc.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(bookingDoc.name)}`}
                    alt={bookingDoc.name}
                    style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Dr. {bookingDoc.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      {bookingDoc.specialization} &bull; ₹{bookingDoc.consultationFee} fee
                    </div>
                  </div>
                </div>

                {/* Date Picker row */}
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Select Consultation Date
                </label>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
                  {dateList.map((dt) => {
                    const isSelected = bookingDate === dt.value;
                    return (
                      <button
                        key={dt.value}
                        onClick={() => setBookingDate(dt.value)}
                        style={{
                          flex: 1, minWidth: '95px', padding: '10px 8px', borderRadius: '8px',
                          border: isSelected ? '2px solid var(--color-primary-500)' : '1px solid var(--border-light)',
                          background: isSelected ? 'var(--color-primary-50)' : 'var(--bg-primary)',
                          color: isSelected ? 'var(--color-primary-800)' : 'var(--text-primary)',
                          cursor: 'pointer', transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', opacity: 0.8 }}>
                          {dt.label.split(' ')[0]}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>
                          {dt.label.split(' ').slice(1).join(' ')}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Slots Selector */}
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Available Time Slots
                </label>
                {slotsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                    <Spinner size={24} />
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', gap: '8px' }}>
                    {availableSlots.map((slot) => {
                      const isBooked = slot.isBooked;
                      const isSelected = selectedSlot === slot.time;
                      return (
                        <button
                          key={slot.time}
                          disabled={isBooked}
                          onClick={() => setSelectedSlot(slot.time)}
                          style={{
                            padding: '10px 4px', borderRadius: '6px',
                            border: isSelected ? '2px solid var(--color-primary-500)' : '1px solid var(--border-light)',
                            background: isBooked ? 'var(--bg-secondary)' : isSelected ? 'var(--color-primary-50)' : 'var(--bg-primary)',
                            color: isBooked ? 'var(--text-tertiary)' : isSelected ? 'var(--color-primary-800)' : 'var(--text-primary)',
                            cursor: isBooked ? 'not-allowed' : 'pointer',
                            fontSize: 'var(--font-size-xs)', fontWeight: 600,
                            textDecoration: isBooked ? 'line-through' : 'none',
                            transition: 'all 0.1s ease'
                          }}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No slots configured for this date.
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Shared Record & Details */}
            {bookingStep === 2 && (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{
                  padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '8px',
                  display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Consultation:</span>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Dr. {bookingDoc.name}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Date & Time:</span>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>
                      {new Date(bookingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {selectedSlot}
                    </strong>
                  </div>
                </div>

                {/* Token-sharing Integration option */}
                <div style={{
                  border: '1px solid var(--border-light)', padding: '16px', borderRadius: '8px',
                  background: shareRecords ? 'var(--color-primary-50)11' : 'transparent',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <input
                      type="checkbox"
                      id="shareRecordsCheck"
                      checked={shareRecords}
                      onChange={(e) => setShareRecords(e.target.checked)}
                      style={{ marginTop: '4px', cursor: 'pointer' }}
                    />
                    <div style={{ cursor: 'pointer' }} onClick={() => setShareRecords(!shareRecords)}>
                      <label htmlFor="shareRecordsCheck" style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', cursor: 'pointer', display: 'block', color: 'var(--text-primary)' }}>
                        Securely share medical records for consultation
                      </label>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                        Enables token-based, end-to-end encrypted medical data sharing with Dr. {bookingDoc.name}.
                      </span>
                    </div>
                  </div>

                  {shareRecords && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                      <div className="input-group">
                        <label style={{ fontSize: '11px', fontWeight: 600 }}>Access Scope</label>
                        <select
                          className="input-field"
                          value={shareScope}
                          onChange={(e) => setShareScope(e.target.value)}
                          style={{ height: '34px', fontSize: 'var(--font-size-xs)' }}
                        >
                          <option value="SUMMARY">Basic Summary</option>
                          <option value="FULL_PROFILE">Full Profile (Recommended)</option>
                          <option value="FULL_WITH_WRITE">Full Profile + Clinical Notes</option>
                        </select>
                      </div>

                      <div className="input-group">
                        <label style={{ fontSize: '11px', fontWeight: 600 }}>Duration</label>
                        <select
                          className="input-field"
                          value={shareExpiry}
                          onChange={(e) => setShareExpiry(parseInt(e.target.value))}
                          style={{ height: '34px', fontSize: 'var(--font-size-xs)' }}
                        >
                          <option value={1}>1 Day</option>
                          <option value={7}>7 Days (Default)</option>
                          <option value={30}>30 Days</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label style={{ fontWeight: 600 }}>Reason for consultation</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Fever, chest tightness, routine health checkup"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>By confirming, you agree to book this slot. A confirmation email and reminder notifications will be sent.</span>
                </div>
              </div>
            )}

            {/* Step 3: Booking Success */}
            {bookingStep === 3 && bookingResult && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  style={{ color: '#10b981', display: 'inline-block', marginBottom: '16px' }}
                >
                  <CheckCircle2 size={64} fill="#e6fdf5" />
                </motion.div>
                
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 750, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Consultation Confirmed!
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: '24px' }}>
                  Your appointment with <strong>Dr. {bookingDoc.name}</strong> has been successfully booked.
                </p>

                <div style={{
                  padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px',
                  display: 'grid', gap: '10px', textAlign: 'left', fontSize: 'var(--font-size-sm)',
                  border: '1px solid var(--border-light)', marginBottom: '16px'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Time slot</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} />
                      {new Date(bookingDate).toDateString()} &bull; {selectedSlot}
                    </div>
                  </div>

                  {bookingResult.shareRecordsToken && (
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Secure Access Token</span>
                      <div style={{
                        padding: '10px', background: 'var(--color-primary-50)', border: '1px dashed var(--color-primary-300)',
                        borderRadius: '6px', fontSize: '13px', fontWeight: 700, fontFamily: 'monospace',
                        color: 'var(--color-primary-800)', marginTop: '4px', textAlign: 'center',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                      }}>
                        <Key size={14} />
                        {bookingResult.shareRecordsToken}
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginTop: '4px' }}>
                        Your medical records token has been shared. The doctor can access it securely.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
