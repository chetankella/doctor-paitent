import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, FileText, Trash2, Edit2 } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { EmptyState, Spinner, Pagination } from '../../components/ui';
import { doctorAPI } from '../../services/api';

const NOTE_TYPES = ['DIAGNOSIS', 'PRESCRIPTION', 'OBSERVATION', 'FOLLOW_UP'];
const SEVERITIES = ['low', 'moderate', 'high', 'critical'];

export default function ClinicalNotesPage() {
  const { grantId } = useParams();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'OBSERVATION', title: '', content: '', severity: 'low', tags: '', followUpDate: '' });

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const res = await doctorAPI.listNotes(grantId, page);
    if (res.success) {
      setNotes(res.data?.notes || []);
      setTotal(res.data?.pagination?.total || 0);
    }
    setLoading(false);
  }, [grantId, page]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const resetForm = () => setForm({ type: 'OBSERVATION', title: '', content: '', severity: 'low', tags: '', followUpDate: '' });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) { toast.error('Title and content are required'); return; }
    setSaving(true);
    const payload = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [] };
    if (!payload.followUpDate) delete payload.followUpDate;

    let res;
    if (editing) {
      res = await doctorAPI.updateNote(grantId, editing, payload);
    } else {
      res = await doctorAPI.createNote(grantId, payload);
    }

    if (res.success) {
      toast.success(editing ? 'Note updated' : 'Note created');
      setShowCreate(false); setEditing(null); resetForm(); loadNotes();
    } else {
      toast.error(res.error || 'Failed to save note');
    }
    setSaving(false);
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    const res = await doctorAPI.deleteNote(grantId, noteId);
    if (res.success) { toast.success('Note deleted'); loadNotes(); }
    else toast.error(res.error || 'Failed to delete');
  };

  const severityColor = { low: 'var(--color-gray-400)', moderate: 'var(--color-warning-500)', high: '#f97316', critical: 'var(--color-danger-500)' };

  return (
    <DashboardLayout title="Clinical Notes">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <button className="btn btn-ghost btn-icon" onClick={() => navigate(`/doctor/patients/${grantId}`)}><ArrowLeft size={20} /></button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>Clinical Notes</h1>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Grant: <code>{grantId}</code></p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setEditing(null); setShowCreate(true); }}>
          <Plus size={16} /> Add Note
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-10)' }}><Spinner size={28} /></div>
        ) : notes.length === 0 ? (
          <EmptyState icon={FileText} title="No Notes" description="Add clinical notes for this patient"
            action={<button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Add Note</button>} />
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {notes.map((note) => (
                <div key={note.noteId} style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                  <div style={{ width: 4, height: 36, borderRadius: 2, background: severityColor[note.severity] || severityColor.low, flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                      <span className="badge badge-info">{note.type}</span>
                      <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{note.title}</span>
                    </div>
                    {note.tags?.length > 0 && (
                      <div style={{ display: 'flex', gap: 'var(--space-1)', marginTop: 'var(--space-1)' }}>
                        {note.tags.map(t => <span key={t} className="badge badge-neutral">{t}</span>)}
                      </div>
                    )}
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                      {new Date(note.createdAt).toLocaleString()} · {note.severity}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => {
                      setEditing(note.noteId);
                      setForm({ type: note.type, title: note.title, content: note.content || '', severity: note.severity, tags: (note.tags || []).join(', '), followUpDate: note.followUpDate?.split('T')[0] || '' });
                      setShowCreate(true);
                    }}><Edit2 size={14} /></button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger-500)' }} onClick={() => handleDelete(note.noteId)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
          </>
        )}
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setEditing(null); resetForm(); }}
        title={editing ? 'Edit Note' : 'New Clinical Note'}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => { setShowCreate(false); setEditing(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size={16} /> : editing ? 'Update Note' : 'Create Note'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="grid-2">
            <div className="input-group">
              <label>Type</label>
              <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {NOTE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Severity</label>
              <select className="input-field" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label>Title *</label>
            <input className="input-field" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="input-group">
            <label>Content *</label>
            <textarea className="input-field" rows={4} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required style={{ resize: 'vertical' }} />
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label>Tags (comma-separated)</label>
              <input className="input-field" value={form.tags} placeholder="hypertension, follow-up" onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
            </div>
            <div className="input-group">
              <label>Follow-up Date</label>
              <input className="input-field" type="date" value={form.followUpDate} onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))} />
            </div>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
