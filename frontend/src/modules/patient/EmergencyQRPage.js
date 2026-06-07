import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { QrCode, RefreshCw, Trash2, Download } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { EmptyState, StatusBadge, Spinner, Pagination } from '../../components/ui';
import { patientAPI } from '../../services/api';

export default function EmergencyQRPage() {
  const [qr, setQR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [showRevoke, setShowRevoke] = useState(false);
  const [scans, setScans] = useState([]);
  const [scanPage, setScanPage] = useState(1);
  const [scanTotal, setScanTotal] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadQR = useCallback(async () => {
    setLoading(true);
    const res = await patientAPI.getActiveQR();
    if (res.success) setQR(res.data);
    else setQR(null);
    setLoading(false);
  }, []);

  const loadScans = useCallback(async () => {
    const res = await patientAPI.getQRScans(scanPage);
    if (res.success) {
      setScans(res.data?.scans || res.data?.logs || []);
      setScanTotal(res.data?.pagination?.total || 0);
    }
  }, [scanPage]);

  useEffect(() => { loadQR(); }, [loadQR]);
  useEffect(() => { if (qr) loadScans(); }, [qr, loadScans]);

  const handleGenerate = async () => {
    setGenerating(true);
    const res = await patientAPI.generateQR({ expiryHours: 72, maxScans: 10, includeInsurance: true });
    if (res.success) {
      setQR(res.data);
      toast.success('Emergency QR code generated!');
    } else {
      toast.error(res.error || 'Failed to generate QR');
    }
    setGenerating(false);
  };

  const handleRevoke = async () => {
    setRevoking(true);
    const res = await patientAPI.revokeQR();
    if (res.success) {
      setQR(null);
      setScans([]);
      toast.success('Emergency QR revoked');
    } else {
      toast.error(res.error || 'Failed to revoke QR');
    }
    setRevoking(false);
    setShowRevoke(false);
  };

  const downloadQR = () => {
    if (!qr?.qrCodeImage) return;
    const a = document.createElement('a');
    a.href = qr.qrCodeImage;
    a.download = `emergency-qr-${qr.referenceCode}.png`;
    a.click();
  };

  return (
    <DashboardLayout title="Emergency QR Code">
      <div className="page-header">
        <h1>Emergency QR Code</h1>
        <p>Generate a QR code that provides emergency responders access to your critical medical information</p>
      </div>

      {loading ? (
        <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Spinner size={32} /></div></div>
      ) : qr ? (
        <div className="grid-2">
          {/* QR Display */}
          <div className="card">
            <div className="card-header">
              <h3>Your Emergency QR</h3>
              <StatusBadge status={qr.status} />
            </div>
            <div className="card-body" style={{ textAlign: 'center' }}>
              {qr.qrCodeImage && (
                <img
                  src={qr.qrCodeImage}
                  alt="Emergency QR Code"
                  style={{ width: 220, height: 220, margin: '0 auto var(--space-4)', borderRadius: 'var(--radius-md)' }}
                />
              )}
              <div style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-primary-600)', marginBottom: 'var(--space-2)' }}>
                {qr.referenceCode}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                Reference Code
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                <button className="btn btn-secondary btn-sm" onClick={downloadQR} style={{ flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
                  <Download size={14} /> Download
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleGenerate} disabled={generating} style={{ flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
                  <RefreshCw size={14} /> Regenerate
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setShowRevoke(true)} style={{ flex: isMobile ? 1 : 'none', justifyContent: 'center' }}>
                  <Trash2 size={14} /> Revoke
                </button>
              </div>
            </div>
          </div>

          {/* Info & Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="card">
              <div className="card-header"><h3>QR Details</h3></div>
              <div className="card-body">
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  {[
                    ['Scans Used', `${qr.scansUsed || 0} / ${qr.maxScans || 10}`],
                    ['Expires', qr.expiresAt ? new Date(qr.expiresAt).toLocaleString() : '—'],
                    ['Created', qr.createdAt ? new Date(qr.createdAt).toLocaleString() : '—'],
                    ['Insurance Included', qr.includeInsurance ? 'Yes' : 'No'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span style={{ fontWeight: 500 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card" style={{ flex: 1 }}>
              <div className="card-header"><h3>Recent Scans</h3></div>
              {scans.length > 0 ? (
                <>
                  <div className="data-table-responsive">
                    <table className="data-table">
                      <thead><tr><th>Time</th><th>IP</th><th>Type</th></tr></thead>
                      <tbody>
                        {scans.slice(0, 5).map((scan, i) => (
                          <tr key={i}>
                            <td>{new Date(scan.timestamp).toLocaleString()}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }}>{scan.ipAddress || '—'}</td>
                            <td><StatusBadge status={scan.accessType || 'EMERGENCY_QR'} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={scanPage} total={scanTotal} limit={20} onPageChange={setScanPage} />
                </>
              ) : (
                <div className="card-body" style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                  No scans yet
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={QrCode}
            title="No Active QR Code"
            description="Generate an emergency QR code to share your critical medical information with first responders"
            action={
              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
                {generating ? <><Spinner size={16} /> Generating...</> : <><QrCode size={16} /> Generate QR Code</>}
              </button>
            }
          />
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      <Modal
        isOpen={showRevoke}
        onClose={() => setShowRevoke(false)}
        title="Revoke Emergency QR?"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowRevoke(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleRevoke} disabled={revoking}>
              {revoking ? <Spinner size={16} /> : 'Revoke QR'}
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
          This will immediately invalidate your current emergency QR code. Anyone who scans it will no longer be able to access your data. You can generate a new one at any time.
        </p>
      </Modal>
    </DashboardLayout>
  );
}
