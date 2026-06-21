import { useState, useEffect } from 'react';
import { MessageSquare, Save, Plus, Archive, Edit2, X } from 'lucide-react';
import { api } from '../services/api';

interface PopupItem {
  _id: string;
  heading: string;
  icon: string;
  body: string;
  ctaText: string;
  ctaLink: string;
  isActive: boolean;
  isArchived: boolean;
  frequency: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PopupFormData {
  heading: string;
  icon: string;
  body: string;
  ctaText: string;
  ctaLink: string;
  isActive: boolean;
  frequency: string;
  startsAt: string;
  endsAt: string;
}

const iconOptions = ['info', 'warning', 'survey', 'update', 'celebration'];
const frequencyOptions = [
  { value: 'show_once', label: 'Show Once' },
  { value: 'every_login', label: 'Show Every Login' },
  { value: 'every_7_days', label: 'Show Every 7 Days' },
  { value: 'every_30_days', label: 'Show Every 30 Days' },
];

const emptyForm: PopupFormData = {
  heading: '',
  icon: 'info',
  body: '',
  ctaText: '',
  ctaLink: '',
  isActive: false,
  frequency: 'show_once',
  startsAt: '',
  endsAt: '',
};

/** Convert an ISO date string to datetime-local input format (YYYY-MM-DDTHH:mm) */
const toDatetimeLocal = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const GlobalPopup = () => {
  const [popups, setPopups] = useState<PopupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PopupFormData>(emptyForm);

  const fetchPopups = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/global-popup');
      const data = res.data.data || [];
      setPopups(Array.isArray(data) ? data : [data].filter(Boolean));
    } catch {
      setError('Failed to load popup list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPopups();
  }, []);

  const handleCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setSuccess(null);
    setError(null);
  };

  const handleEdit = (popup: PopupItem) => {
    setForm({
      heading: popup.heading || '',
      icon: popup.icon || 'info',
      body: popup.body || '',
      ctaText: popup.ctaText || '',
      ctaLink: popup.ctaLink || '',
      isActive: popup.isActive || false,
      frequency: popup.frequency || 'show_once',
      startsAt: toDatetimeLocal(popup.startsAt),
      endsAt: toDatetimeLocal(popup.endsAt),
    });
    setEditingId(popup._id);
    setShowForm(true);
    setSuccess(null);
    setError(null);
  };

  const handleArchive = async (id: string) => {
    try {
      await api.put(`/admin/global-popup/${id}/archive`);
      setSuccess('Popup archived successfully.');
      fetchPopups();
    } catch {
      setError('Failed to archive popup.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        ...form,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      };
      if (editingId) {
        await api.put(`/admin/global-popup/${editingId}`, payload);
        setSuccess('Popup updated successfully.');
      } else {
        await api.post('/admin/global-popup', payload);
        setSuccess('Popup created successfully.');
      }
      setShowForm(false);
      setEditingId(null);
      fetchPopups();
    } catch {
      setError('Failed to save popup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (popup: PopupItem) => {
    if (popup.isArchived) return { text: 'Archived', class: 'bg-gray-100 text-gray-600' };

    const now = new Date();
    const startsAt = popup.startsAt ? new Date(popup.startsAt) : null;
    const endsAt = popup.endsAt ? new Date(popup.endsAt) : null;

    // If there is an end date and it has passed, the popup is expired
    if (endsAt && now > endsAt) return { text: 'Expired', class: 'bg-red-100 text-red-800' };

    // If there is a start date and it is in the future, the popup is scheduled
    if (startsAt && now < startsAt) return { text: 'Scheduled', class: 'bg-blue-100 text-blue-800' };

    // Within the time window (or no time constraints) and isActive
    if (popup.isActive) return { text: 'Active', class: 'bg-green-100 text-green-800' };

    return { text: 'Inactive', class: 'bg-yellow-100 text-yellow-800' };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <MessageSquare size={24} className="text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Global Popup</h2>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageSquare size={24} className="text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Global Popup</h2>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
        >
          <Plus size={16} />
          <span>Create New</span>
        </button>
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-medium text-gray-800">
              {editingId ? 'Edit Popup' : 'Create New Popup'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heading</label>
                <input
                  type="text"
                  value={form.heading}
                  onChange={(e) => setForm({ ...form, heading: e.target.value })}
                  placeholder="Popup heading"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                <select
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  {iconOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              >
                {frequencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body Text</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Popup body text"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
                <input
                  type="text"
                  value={form.ctaText}
                  onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                  placeholder="e.g. Learn More"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Link/Action</label>
                <input
                  type="text"
                  value={form.ctaLink}
                  onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                  placeholder="e.g. https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>
            {/* Scheduling Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to start immediately when active</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ends At</label>
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to run indefinitely</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <label className="text-sm font-medium text-gray-700">Active (show popup to users)</label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : editingId ? 'Update Popup' : 'Create Popup'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Popup List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Heading</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Icon</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Frequency</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Schedule</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Created</th>
              <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {popups.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                  No popups created yet.
                </td>
              </tr>
            ) : (
              popups.map((popup) => {
                const badge = getStatusBadge(popup);
                return (
                  <tr key={popup._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{popup.heading}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 capitalize">{popup.icon}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badge.class}`}>
                        {badge.text}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {frequencyOptions.find(f => f.value === popup.frequency)?.label || popup.frequency}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {popup.startsAt || popup.endsAt ? (
                        <div className="space-y-0.5">
                          {popup.startsAt && <div className="text-xs">From: {new Date(popup.startsAt).toLocaleString()}</div>}
                          {popup.endsAt && <div className="text-xs">Until: {new Date(popup.endsAt).toLocaleString()}</div>}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Always</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {new Date(popup.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center space-x-2">
                        {!popup.isArchived && (
                          <>
                            <button
                              onClick={() => handleEdit(popup)}
                              className="text-xs flex items-center space-x-1 bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                            >
                              <Edit2 size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleArchive(popup._id)}
                              className="text-xs flex items-center space-x-1 bg-red-50 text-red-700 px-2 py-1 rounded hover:bg-red-100"
                            >
                              <Archive size={12} />
                              <span>Archive</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
