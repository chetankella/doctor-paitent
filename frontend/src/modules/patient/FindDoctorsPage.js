import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, User, Award, Building2, Key, ChevronRight,
  Star, Calendar, Stethoscope, CheckCircle2,
  AlertCircle, Thermometer, X, SlidersHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../layouts/DashboardLayout';
import { patientAPI } from '../../services/api';
import { Spinner, EmptyState } from '../../components/ui';
import Modal from '../../components/ui/Modal';

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
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

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
  }, [search, specialization, experience, rating, availability, city, fee]);

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
      {/* Search Header Banner */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-primary-800) 100%)',
        color: '#fff',
        padding: isMobile ? 'var(--space-5) var(--space-4)' : 'var(--space-8) var(--space-6)',
        borderRadius: 'var(--radius-xl)',
        marginBottom: 'var(--space-6)', boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '650px' }}>
          <span style={{
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
            color: '#fff', padding: '4px 12px', borderRadius: '50px', fontSize: 'var(--font-size-xs)',
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            Instant Consultations
          </span>
          <h1 style={{
            color: '#fff',
            fontSize: isMobile ? 'var(--font-size-xl)' : 'var(--font-size-3xl)',
            fontWeight: 800, marginTop: '12px', marginBottom: '8px'
          }}>
            Book Doctors Like Ordering Food
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: isMobile ? 'var(--font-size-xs)' : 'var(--font-size-base)',
            lineHeight: 1.5
          }}>
            Search verified healthcare experts by symptoms, specializations, or hospital clinics and secure your slot instantly.
          </p>
        </div>
        {!isMobile && (
          <div style={{
            position: 'absolute', right: '-30px', bottom: '-40px', opacity: 0.15,
            color: '#fff', transform: 'rotate(-10deg)'
          }}>
            <Stethoscope size={250} />
          </div>
        )}
      </div>

      {/* Specialization pills list (Swiggy Categories Style) */}
      <div style={{
        marginBottom: 'var(--space-6)', display: 'flex',
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        overflowX: isMobile ? 'visible' : 'auto',
        gap: isMobile ? 'var(--space-2)' : 'var(--space-3)', paddingBottom: '4px',
        msOverflowStyle: 'none', scrollbarWidth: 'none'
      }}>
        <button
          onClick={() => setSpecialization('')}
          className={`btn ${specialization === '' ? 'btn-primary' : 'btn-secondary'}`}
          style={{
            borderRadius: '50px', whiteSpace: 'nowrap',
            padding: isMobile ? '6px 14px' : '8px 18px',
            fontSize: isMobile ? 'var(--font-size-xs)' : 'var(--font-size-sm)',
            minHeight: isMobile ? '36px' : 'auto',
            scrollSnapAlign: 'start'
          }}
        >
          All
        </button>
        {SPECIALIZATIONS.map((spec) => {
          const isSelected = specialization === spec.name;
          return (
            <button
              key={spec.name}
              onClick={() => setSpecialization(spec.name)}
              className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                borderRadius: '50px', whiteSpace: 'nowrap',
                padding: isMobile ? '6px 14px' : '8px 18px',
                fontSize: isMobile ? 'var(--font-size-xs)' : 'var(--font-size-sm)',
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                minHeight: isMobile ? '36px' : 'auto',
                scrollSnapAlign: 'start'
              }}
            >
              <spec.icon size={isMobile ? 13 : 15} style={{ color: isSelected ? '#fff' : spec.color }} />
              {spec.name}
            </button>
          );
        })}
      </div>

      {/* Autocomplete Search & Filters Card */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: isMobile ? 'var(--space-3)' : 'var(--space-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-3)' }}>
          {/* Search container */}
          <div ref={searchContainerRef} style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              className="input-field"
              type="text"
              placeholder={isMobile ? 'Search doctors, symptoms...' : 'Search doctor names, symptoms (e.g. fever, chest pain), specialization, hospital...'}
              value={search}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              style={{ paddingLeft: 42, width: '100%', height: '44px', borderRadius: 'var(--radius-lg)' }}
            />
            
            {/* Autocomplete Dropdown List */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 100,
                    overflow: 'hidden', maxHeight: '300px'
                  }}
                >
                  {suggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSuggestion(sug)}
                      style={{
                        padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)',
                        display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)',
                        transition: 'background 0.1s ease', color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'var(--bg-secondary)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      {sug.type === 'doctor' ? <User size={14} style={{ color: 'var(--color-primary-500)' }} /> :
                       sug.type === 'specialization' ? <Stethoscope size={14} style={{ color: '#10b981' }} /> :
                       <Thermometer size={14} style={{ color: '#ef4444' }} />}
                      <div>
                        <span style={{ fontWeight: 600 }}>{sug.value}</span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)', marginLeft: '8px' }}>
                          ({sug.type})
                        </span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop: inline filters | Mobile: filter button */}
          {isMobile ? (
            <button
              className="btn btn-secondary"
              onClick={() => setShowFilterSheet(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                width: '100%', justifyContent: 'center',
                borderRadius: 'var(--radius-md)', minHeight: '40px'
              }}
            >
              <SlidersHorizontal size={16} />
              Filters
              {(city || experience || rating || fee || availability) && (
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: 'var(--color-primary-500)', display: 'inline-block'
                }} />
              )}
            </button>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <div style={{ minWidth: '130px' }}>
                <input type="text" className="input-field" placeholder="City (e.g. Mumbai)"
                  value={city} onChange={(e) => setCity(e.target.value)}
                  style={{ height: '36px', fontSize: 'var(--font-size-sm)' }} />
              </div>
              <select className="input-field" value={experience} onChange={(e) => setExperience(e.target.value)}
                style={{ width: 'auto', height: '36px', fontSize: 'var(--font-size-sm)' }}>
                {EXPERIENCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <select className="input-field" value={rating} onChange={(e) => setRating(e.target.value)}
                style={{ width: 'auto', height: '36px', fontSize: 'var(--font-size-sm)' }}>
                {RATING_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <select className="input-field" value={fee} onChange={(e) => setFee(e.target.value)}
                style={{ width: 'auto', height: '36px', fontSize: 'var(--font-size-sm)' }}>
                {FEE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <select className="input-field" value={availability} onChange={(e) => setAvailability(e.target.value)}
                style={{ width: 'auto', height: '36px', fontSize: 'var(--font-size-sm)' }}>
                {AVAILABILITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

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
              {/* Doctor Avatar Header Cover */}
              <div style={{
                height: isMobile ? '60px' : '80px',
                background: 'linear-gradient(135deg, var(--color-primary-100) 0%, var(--color-primary-200) 100%)',
                position: 'relative'
              }}>
                <span style={{
                  position: 'absolute', top: 12, left: 12,
                  backgroundColor: 'rgba(255,255,255,0.95)', color: 'var(--color-primary-700)',
                  fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '50px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  Verified Expert
                </span>
                
                {/* Available Badge */}
                <span style={{
                  position: 'absolute', top: 12, right: 12,
                  backgroundColor: '#10b981', color: '#fff',
                  fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '50px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  Available Today
                </span>
              </div>

              {/* Doctor Profile Info */}
              <div className="card-body" style={{ padding: isMobile ? 'var(--space-4)' : 'var(--space-5)', paddingTop: 0, display: 'flex', flexDirection: 'column', flex: 1, gap: 'var(--space-3)' }}>
                {/* Avatar positioning */}
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: isMobile ? '-30px' : '-40px' }}>
                  <img
                    src={doc.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(doc.name)}`}
                    alt={doc.name}
                    style={{
                      width: isMobile ? '60px' : '72px', height: isMobile ? '60px' : '72px', borderRadius: 'var(--radius-lg)',
                      border: '3px solid var(--bg-primary)', backgroundColor: 'var(--bg-secondary)',
                      boxShadow: 'var(--shadow-md)', objectFit: 'cover'
                    }}
                  />
                  <div style={{ paddingTop: isMobile ? '34px' : '44px' }}>
                    <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {doc.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <span className="badge badge-info" style={{ fontSize: '11px' }}>
                        {doc.specialization}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating & Fee Row (Swiggy Style) */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: '1px dashed var(--border-light)',
                  borderTop: '1px dashed var(--border-light)', marginTop: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{
                      backgroundColor: '#16a34a', color: '#fff', display: 'flex',
                      alignItems: 'center', gap: '2px', padding: '2px 8px', borderRadius: '4px',
                      fontSize: '12px', fontWeight: 700
                    }}>
                      {doc.rating} <Star size={11} fill="#fff" />
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      ({doc.ratingCount} ratings)
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>
                    ₹{doc.consultationFee} <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '11px' }}>fee</span>
                  </div>
                </div>

                {/* Bio text snippet */}
                <p style={{
                  fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)',
                  lineHeight: 1.4, margin: '4px 0',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                }}>
                  {doc.bio}
                </p>

                {/* Details List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Award size={13} style={{ color: 'var(--text-tertiary)' }} />
                    <span>{doc.experience} Years Experience ({doc.qualifications.join(', ')})</span>
                  </div>

                  {/* Affiliated Clinics / Organizations */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Affiliations</span>
                    {doc.organizations && doc.organizations.length > 0 ? (
                      doc.organizations.map((org, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                          <Building2 size={12} style={{ color: 'var(--color-primary-500)' }} />
                          <span style={{ fontWeight: 500 }}>{org.name} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({org.city})</span></span>
                        </div>
                      ))
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={12} style={{ color: 'var(--text-tertiary)' }} />
                        <span>Independent Practitioner</span>
                      </div>
                    )}
                  </div>

                  {/* Symptoms tags list */}
                  {doc.symptoms && doc.symptoms.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {doc.symptoms.slice(0, 3).map((sym, i) => (
                        <span key={i} style={{
                          backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                          padding: '2px 8px', borderRadius: '4px', fontSize: '10px'
                        }}>
                          {sym}
                        </span>
                      ))}
                      {doc.symptoms.length > 3 && (
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', padding: '2px' }}>
                          +{doc.symptoms.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Primary Card Buttons */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleOpenGrantModal(doc)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: 'var(--font-size-xs)', padding: '8px 10px' }}
                  >
                    <Key size={13} /> Grant Access
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleOpenBookingModal(doc)}
                    style={{ flex: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: 'var(--font-size-xs)', padding: '8px 10px' }}
                  >
                    <Calendar size={13} /> Book Now
                  </button>
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
