import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Droplets, AlertTriangle, Pill, Heart, Phone, Search, ScanLine } from 'lucide-react';
import { emergencyAPI } from '../../services/api';
import { Spinner } from '../../components/ui';
import '../../styles/emergency.css';

export default function EmergencyAccessPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleScan = useCallback(async (refCode) => {
    const c = refCode || code.trim();
    if (!c) return;
    setLoading(true);
    setError(null);
    setData(null);
    const res = await emergencyAPI.scanQR(c);
    if (res.success) {
      setData(res.data);
    } else {
      setError(res.error || 'Invalid or expired QR code');
    }
    setLoading(false);
  }, [code]);

  // Parse URL hash for direct QR links
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('code');
    if (ref) { setCode(ref); handleScan(ref); }
  }, [handleScan]);

  return (
    <div className="emergency-page">
      {/* Header Bar */}
      <header className="emergency-header">
        <div className="emergency-header-inner">
          <Shield size={24} />
          <span>Emergency Medical Access</span>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!data ? (
          <motion.div
            key="input"
            className="emergency-input-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="emergency-input-card">
              <div className="emergency-icon-circle">
                <ScanLine size={36} />
              </div>
              <h1>Emergency QR Access</h1>
              <p>Enter the reference code from a patient's emergency QR code</p>

              <div className="emergency-input-row">
                <input
                  type="text"
                  className="emergency-code-input"
                  placeholder="EMR-XXXX-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  maxLength={14}
                  autoFocus
                />
                <button className="emergency-scan-btn" onClick={() => handleScan()} disabled={loading || !code.trim()}>
                  {loading ? <Spinner size={20} /> : <><Search size={18} /> Access</>}
                </button>
              </div>

              {error && (
                <motion.div className="emergency-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <AlertTriangle size={16} /> {error}
                </motion.div>
              )}

              <p className="emergency-disclaimer">
                This system provides emergency medical information only. All access is logged and monitored.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            className="emergency-result-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Critical Alert Banner */}
            {data.criticalAlerts?.length > 0 && (
              <div className="emergency-alert-banner">
                <AlertTriangle size={20} />
                <div>
                  <strong>Critical Alerts</strong>
                  {data.criticalAlerts.map((a, i) => (
                    <div key={i}>{typeof a === 'string' ? a : a.alert || a}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="emergency-grid">
              {/* Blood Group — Large prominent display */}
              <div className="emergency-blood-card">
                <Droplets size={28} />
                <div className="emergency-blood-type">{data.bloodGroup || '—'}</div>
                <div className="emergency-blood-label">Blood Group</div>
              </div>

              {/* Allergies */}
              <EmergencySection icon={AlertTriangle} title="Allergies" color="#f59e0b"
                items={data.allergies} empty="No known allergies" />

              {/* Conditions */}
              <EmergencySection icon={Heart} title="Chronic Conditions" color="#ef4444"
                items={data.chronicConditions} empty="No chronic conditions" />

              {/* Medications */}
              <EmergencySection icon={Pill} title="Current Medications" color="#3b82f6"
                items={data.currentMedications} empty="No medications" isMed />

              {/* Emergency Contact */}
              {data.emergencyContact && (
                <div className="emergency-contact-card">
                  <div className="emergency-section-header">
                    <Phone size={18} style={{ color: '#22c55e' }} />
                    <span>Emergency Contact</span>
                  </div>
                  <div className="emergency-contact-info">
                    <div className="emergency-contact-name">{data.emergencyContact.name}</div>
                    <div className="emergency-contact-relation">{data.emergencyContact.relation}</div>
                    <a href={`tel:${data.emergencyContact.phone}`} className="emergency-contact-phone">
                      <Phone size={16} /> {data.emergencyContact.phone}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="emergency-meta">
              {data.remainingScans != null && <span>Remaining scans: {data.remainingScans}</span>}
              {data.expiresAt && <span>Expires: {new Date(data.expiresAt).toLocaleString()}</span>}
              {data.organDonor && <span className="emergency-organ-donor">🟢 Organ Donor</span>}
            </div>

            <button className="btn btn-secondary" onClick={() => { setData(null); setCode(''); }}
              style={{ margin: '0 auto', display: 'block' }}>
              Scan Another Code
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmergencySection({ icon: Icon, title, color, items, empty, isMed }) {
  return (
    <div className="emergency-section-card">
      <div className="emergency-section-header">
        <Icon size={18} style={{ color }} />
        <span>{title}</span>
      </div>
      {items?.length > 0 ? (
        <ul className="emergency-list">
          {items.map((item, i) => (
            <li key={i}>
              {isMed && typeof item === 'object'
                ? <><strong>{item.name}</strong> — {item.dosage} ({item.frequency})</>
                : (typeof item === 'string' ? item : item.alert || JSON.stringify(item))
              }
            </li>
          ))}
        </ul>
      ) : (
        <div className="emergency-empty">{empty}</div>
      )}
    </div>
  );
}
