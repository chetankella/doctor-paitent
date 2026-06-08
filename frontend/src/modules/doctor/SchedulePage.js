import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, Save, RefreshCw, Copy, Ban, Zap,
  Lock, CheckCircle, XCircle, User, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DashboardLayout from '../../layouts/DashboardLayout';
import { doctorAPI } from '../../services/api';
import { Spinner, EmptyState } from '../../components/ui';
import '../../styles/schedule.css';

// ─── Constants ───
const ALL_SLOTS = [
  "08:00 AM", "08:30 AM",
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM",
  "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM",
  "09:00 PM"
];

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Helpers ───
const formatDate = (d) => {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const isToday = (d) => formatDate(d) === formatDate(new Date());

const isSlotPast = (dateObj, timeStr) => {
  const now = new Date();
  if (formatDate(dateObj) < formatDate(now)) return true;
  if (formatDate(dateObj) > formatDate(now)) return false;

  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return false;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours !== 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  return hours < now.getHours() || (hours === now.getHours() && minutes <= now.getMinutes());
};

const getNext7Days = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function SchedulePage() {
  const navigate = useNavigate();

  // ─── State ───
  const [mode, setMode] = useState('custom'); // 'custom' | 'recurring'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Custom mode state
  const [slotStates, setSlotStates] = useState({}); // { "09:00 AM": "available" | "unavailable" | "booked" }
  const [bookedSlots, setBookedSlots] = useState({}); // { "09:00 AM": { patientName, status } }
  const [appointments, setAppointments] = useState([]);

  // Recurring mode state
  const [activeDay, setActiveDay] = useState(DAYS[new Date().getDay()]);
  const [weeklySchedule, setWeeklySchedule] = useState(null);

  // ─── Responsive ───
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ─── Fetch Custom Day Data ───
  const fetchCustomData = useCallback(async () => {
    setLoading(true);
    const dateStr = formatDate(selectedDate);

    try {
      const [availRes, apptRes] = await Promise.all([
        doctorAPI.getAvailability(dateStr),
        doctorAPI.listDoctorAppointments()
      ]);

      const states = {};
      const booked = {};

      // Initialize all slots as unavailable
      ALL_SLOTS.forEach(t => { states[t] = 'unavailable'; });

      if (availRes.success && availRes.data?.slots) {
        availRes.data.slots.forEach(slot => {
          states[slot.time] = slot.isBooked ? 'booked' : 'available';
        });
      }

      if (apptRes.success) {
        const dayAppts = apptRes.data.filter(a =>
          formatDate(new Date(a.date)) === dateStr && a.status !== 'CANCELLED'
        );
        setAppointments(dayAppts);
        dayAppts.forEach(a => {
          states[a.time] = 'booked';
          booked[a.time] = {
            patientName: a.patientId?.name || 'Patient',
            status: a.status
          };
        });
      }

      setSlotStates(states);
      setBookedSlots(booked);
    } catch (err) {
      toast.error('Failed to load schedule data');
    }
    setLoading(false);
  }, [selectedDate]);

  // ─── Fetch Weekly Data ───
  const fetchWeeklyData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await doctorAPI.getWeeklySchedule();
      if (res.success) {
        setWeeklySchedule(res.data);
      } else {
        toast.error(res.error || 'Failed to load weekly schedule');
      }
    } catch (err) {
      toast.error('Failed to load weekly schedule');
    }
    setLoading(false);
  }, []);

  // ─── Fetch on mode/date change ───
  useEffect(() => {
    if (mode === 'custom') fetchCustomData();
    else fetchWeeklyData();
  }, [mode, fetchCustomData, fetchWeeklyData]);

  // ─── Toggle Slot (Custom Mode) ───
  const toggleSlot = (time) => {
    if (slotStates[time] === 'booked') return;
    if (isSlotPast(selectedDate, time)) return;

    setSlotStates(prev => ({
      ...prev,
      [time]: prev[time] === 'available' ? 'unavailable' : 'available'
    }));
  };

  // ─── Toggle Slot (Weekly Mode) ───
  const toggleWeeklySlot = (time) => {
    if (!weeklySchedule) return;
    setWeeklySchedule(prev => {
      const daySlots = prev[activeDay] || [];
      const existingIdx = daySlots.findIndex(s => s.time === time);

      let newDaySlots;
      if (existingIdx >= 0) {
        newDaySlots = daySlots.map((s, i) =>
          i === existingIdx ? { ...s, isAvailable: !s.isAvailable } : s
        );
      } else {
        newDaySlots = [...daySlots, { time, isAvailable: true }];
        newDaySlots.sort((a, b) =>
          new Date(`1970/01/01 ${a.time}`) - new Date(`1970/01/01 ${b.time}`)
        );
      }

      return { ...prev, [activeDay]: newDaySlots };
    });
  };

  // ─── Save Custom Day ───
  const saveCustomDay = async () => {
    setSaving(true);
    const availableSlots = ALL_SLOTS
      .filter(t => slotStates[t] === 'available' || slotStates[t] === 'booked')
      .map(t => ({
        time: t,
        isBooked: slotStates[t] === 'booked',
        bookedBy: null
      }));

    const res = await doctorAPI.updateAvailability({
      date: formatDate(selectedDate),
      slots: availableSlots
    });

    if (res.success) {
      toast.success('Day schedule saved!');
      fetchCustomData();
    } else {
      toast.error(res.error || 'Failed to save schedule');
    }
    setSaving(false);
  };

  // ─── Save Weekly Schedule ───
  const saveWeekly = async () => {
    if (!weeklySchedule) return;
    setSaving(true);
    const res = await doctorAPI.updateWeeklySchedule(weeklySchedule);
    if (res.success) {
      toast.success('Weekly schedule saved!');
    } else {
      toast.error(res.error || 'Failed to save weekly schedule');
    }
    setSaving(false);
  };

  // ─── Quick Actions ───
  const fillWorkingHours = () => {
    if (mode === 'custom') {
      const newStates = { ...slotStates };
      ALL_SLOTS.forEach(t => {
        if (newStates[t] !== 'booked' && !isSlotPast(selectedDate, t)) {
          const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
          if (match) {
            let h = parseInt(match[1], 10);
            if (match[3].toUpperCase() === 'PM' && h !== 12) h += 12;
            if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
            newStates[t] = (h >= 9 && h < 17) ? 'available' : 'unavailable';
          }
        }
      });
      setSlotStates(newStates);
      toast.success('Working hours (9 AM – 5 PM) applied');
    } else {
      const workingSlots = ALL_SLOTS.filter(t => {
        const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return false;
        let h = parseInt(match[1], 10);
        if (match[3].toUpperCase() === 'PM' && h !== 12) h += 12;
        if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
        return h >= 9 && h < 17;
      }).map(t => ({ time: t, isAvailable: true }));

      setWeeklySchedule(prev => ({ ...prev, [activeDay]: workingSlots }));
      toast.success('Working hours (9 AM – 5 PM) applied');
    }
  };

  const markAllUnavailable = () => {
    if (mode === 'custom') {
      const newStates = { ...slotStates };
      ALL_SLOTS.forEach(t => {
        if (newStates[t] !== 'booked') newStates[t] = 'unavailable';
      });
      setSlotStates(newStates);
      toast.success('All slots marked unavailable');
    } else {
      setWeeklySchedule(prev => ({ ...prev, [activeDay]: [] }));
      toast.success(`${activeDay} cleared`);
    }
  };

  const copyPreviousDay = () => {
    if (mode === 'custom') {
      const prev = new Date(selectedDate);
      prev.setDate(prev.getDate() - 1);
      setSelectedDate(prev);
      toast('Switched to previous day — edit and save', { icon: '📋' });
    } else {
      const currentIdx = DAYS.indexOf(activeDay);
      const prevIdx = currentIdx === 0 ? 6 : currentIdx - 1;
      const prevDay = DAYS[prevIdx];
      if (weeklySchedule && weeklySchedule[prevDay]) {
        setWeeklySchedule(prev => ({
          ...prev,
          [activeDay]: [...(prev[prevDay] || [])]
        }));
        toast.success(`Copied ${prevDay}'s schedule to ${activeDay}`);
      }
    }
  };

  // ─── Summary Stats ───
  const stats = useMemo(() => {
    if (mode === 'custom') {
      const total = ALL_SLOTS.length;
      const available = Object.values(slotStates).filter(s => s === 'available').length;
      const booked = Object.values(slotStates).filter(s => s === 'booked').length;
      const unavailable = total - available - booked;
      return { total, available, unavailable, booked };
    } else {
      const daySlots = weeklySchedule?.[activeDay] || [];
      const total = ALL_SLOTS.length;
      const available = daySlots.filter(s => s.isAvailable).length;
      return { total, available, unavailable: total - available, booked: 0 };
    }
  }, [mode, slotStates, weeklySchedule, activeDay]);

  // ─── Weekly slot state helper ───
  const getWeeklySlotState = (time) => {
    if (!weeklySchedule) return 'unavailable';
    const daySlots = weeklySchedule[activeDay] || [];
    const slot = daySlots.find(s => s.time === time);
    if (!slot) return 'unavailable';
    return slot.isAvailable ? 'available' : 'unavailable';
  };

  // ─── Render date chips ───
  const next7Days = getNext7Days();

  return (
    <DashboardLayout title="Schedule & Availability">
      <div className="page-header" style={{ marginBottom: 'var(--space-4)' }}>
        <h1>Schedule & Availability</h1>
        <p>Configure your consultation hours and manage patient bookings</p>
      </div>

      {/* Mode Toggle */}
      <div className="schedule-mode-toggle" style={{ marginBottom: 'var(--space-4)', maxWidth: '400px' }}>
        <button
          className={`schedule-mode-btn ${mode === 'custom' ? 'active' : ''}`}
          onClick={() => setMode('custom')}
        >
          <Calendar size={16} /> One-Day Custom
        </button>
        <button
          className={`schedule-mode-btn ${mode === 'recurring' ? 'active' : ''}`}
          onClick={() => setMode('recurring')}
        >
          <RefreshCw size={16} /> Weekly Recurring
        </button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-5)', flexDirection: isMobile ? 'column' : 'row' }}>
        {/* ═══ LEFT: Slot Grid ═══ */}
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Date Strip (Custom Mode) */}
          {mode === 'custom' && (
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  SELECT DATE
                </h3>
                <input
                  type="date"
                  className="input-field"
                  value={formatDate(selectedDate)}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  style={{ width: 'auto', padding: '6px 10px', fontSize: 'var(--font-size-xs)' }}
                />
              </div>
              <div className="date-strip">
                {next7Days.map((d) => (
                  <div
                    key={formatDate(d)}
                    className={`date-chip ${formatDate(d) === formatDate(selectedDate) ? 'active' : ''} ${isToday(d) ? 'today' : ''}`}
                    onClick={() => setSelectedDate(d)}
                  >
                    <span className="date-chip-day">{DAY_LABELS[d.getDay()]}</span>
                    <span className="date-chip-num">{d.getDate()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day Tabs (Recurring Mode) */}
          {mode === 'recurring' && (
            <div className="card" style={{ padding: '16px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                SELECT DAY OF WEEK
              </h3>
              <div className="weekly-day-tabs">
                {DAYS.map(day => (
                  <button
                    key={day}
                    className={`weekly-day-tab ${activeDay === day ? 'active' : ''}`}
                    onClick={() => setActiveDay(day)}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Slot Grid */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 700 }}>
                  {mode === 'custom'
                    ? `${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
                    : `${activeDay.charAt(0).toUpperCase() + activeDay.slice(1)} — Recurring Schedule`
                  }
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                  Click slots to toggle between available and unavailable
                </p>
              </div>
              <div className="schedule-legend">
                <div className="legend-item">
                  <div className="legend-dot green" />
                  Available
                </div>
                <div className="legend-item">
                  <div className="legend-dot red" />
                  Unavailable
                </div>
                <div className="legend-item">
                  <div className="legend-dot gray" />
                  <Lock size={10} /> Booked
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
                <Spinner size={32} />
              </div>
            ) : (
              <div className="slot-grid">
                <AnimatePresence>
                  {ALL_SLOTS.map((time) => {
                    let state;
                    if (mode === 'custom') {
                      if (isSlotPast(selectedDate, time) && slotStates[time] !== 'booked') {
                        state = 'past';
                      } else {
                        state = slotStates[time] || 'unavailable';
                      }
                    } else {
                      state = getWeeklySlotState(time);
                    }

                    return (
                      <motion.button
                        key={time}
                        className={`slot-btn ${state}`}
                        onClick={() => {
                          if (state === 'past' || state === 'booked') return;
                          mode === 'custom' ? toggleSlot(time) : toggleWeeklySlot(time);
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileTap={state !== 'past' && state !== 'booked' ? { scale: 0.92 } : {}}
                        transition={{ duration: 0.15 }}
                        title={
                          state === 'booked'
                            ? `Booked by ${bookedSlots[time]?.patientName || 'Patient'}`
                            : state === 'past'
                            ? 'Past time slot'
                            : state === 'available'
                            ? 'Click to mark unavailable'
                            : 'Click to mark available'
                        }
                      >
                        {state === 'booked' && (
                          <span className="slot-icon"><Lock size={11} /></span>
                        )}
                        <span style={{ fontWeight: 700 }}>{time}</span>
                        <span className="slot-label">
                          {state === 'available' && '✓ Open'}
                          {state === 'unavailable' && '✕ Off'}
                          {state === 'booked' && '🔒 Booked'}
                          {state === 'past' && 'Past'}
                        </span>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Booked Patients for the day (Custom mode only) */}
          {mode === 'custom' && appointments.length > 0 && (
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 'var(--font-size-base)', fontWeight: 700 }}>
                📋 Today's Patients ({appointments.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {appointments
                  .sort((a, b) => new Date(`1970/01/01 ${a.time}`) - new Date(`1970/01/01 ${b.time}`))
                  .map(appt => (
                    <div key={appt._id} className="booked-patient-card">
                      <div className="booked-patient-avatar">
                        <User size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                          {appt.patientId?.name || 'Patient'}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                          {appt.time} · {appt.status}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost"
                        onClick={() => navigate('/doctor/appointments')}
                        style={{ fontSize: 'var(--font-size-xs)', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        Manage <ChevronRight size={14} />
                      </button>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT: Summary + Actions ═══ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minWidth: isMobile ? '100%' : '280px' }}>

          {/* Summary Panel */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Summary
            </h3>
            <div className="schedule-summary">
              <div className="summary-stat total">
                <div className="summary-stat-value">{stats.total}</div>
                <div className="summary-stat-label">Total</div>
              </div>
              <div className="summary-stat available">
                <div className="summary-stat-value">{stats.available}</div>
                <div className="summary-stat-label">Open</div>
              </div>
              <div className="summary-stat unavailable">
                <div className="summary-stat-value">{stats.unavailable}</div>
                <div className="summary-stat-label">Off</div>
              </div>
            </div>
            {stats.booked > 0 && (
              <div style={{ marginTop: '12px', padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', textAlign: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                🔒 {stats.booked} booked slot{stats.booked > 1 ? 's' : ''} (locked)
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Quick Actions
            </h3>
            <div className="quick-actions" style={{ flexDirection: 'column' }}>
              <button className="quick-action-btn" onClick={fillWorkingHours} style={{ width: '100%' }}>
                <Zap size={14} /> Auto-fill 9 AM – 5 PM
              </button>
              <button className="quick-action-btn" onClick={markAllUnavailable} style={{ width: '100%' }}>
                <Ban size={14} /> Mark Full Day Unavailable
              </button>
              <button className="quick-action-btn" onClick={copyPreviousDay} style={{ width: '100%' }}>
                <Copy size={14} />
                {mode === 'custom' ? 'Go to Previous Day' : `Copy ${DAYS[DAYS.indexOf(activeDay) === 0 ? 6 : DAYS.indexOf(activeDay) - 1]}`}
              </button>
            </div>
          </div>

          {/* Info Box */}
          {mode === 'recurring' && (
            <div className="card" style={{ background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-100)', padding: '16px', display: 'flex', gap: '10px' }}>
              <RefreshCw size={18} style={{ color: 'var(--color-primary-600)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-900)' }}>
                <strong>Recurring Mode:</strong> This schedule repeats every week. Custom day overrides take priority when set for a specific date.
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="schedule-save-bar">
            <button
              className="btn btn-primary"
              onClick={mode === 'custom' ? saveCustomDay : saveWeekly}
              disabled={saving || loading}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', padding: '14px', fontSize: 'var(--font-size-sm)', fontWeight: 700,
                borderRadius: 'var(--radius-lg)'
              }}
            >
              {saving ? <Spinner size={18} /> : <Save size={18} />}
              {saving ? 'Saving...' : mode === 'custom' ? 'Save Day Schedule' : 'Save Weekly Schedule'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
