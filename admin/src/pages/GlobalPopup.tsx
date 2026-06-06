import { useState, useEffect } from 'react';
import { MessageSquare, Save } from 'lucide-react';
import { api } from '../services/api';

interface PopupConfig {
  heading: string;
  icon: string;
  body: string;
  ctaText: string;
  ctaLink: string;
  isActive: boolean;
}

const iconOptions = ['info', 'warning', 'survey', 'update', 'celebration'];

export const GlobalPopup = () => {
  const [config, setConfig] = useState<PopupConfig>({
    heading: '',
    icon: 'info',
    body: '',
    ctaText: '',
    ctaLink: '',
    isActive: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/admin/global-popup');
        const data = res.data.data || res.data;
        setConfig({
          heading: data.heading || '',
          icon: data.icon || 'info',
          body: data.body || '',
          ctaText: data.ctaText || '',
          ctaLink: data.ctaLink || '',
          isActive: data.isActive || false,
        });
      } catch {
        setError('Failed to load popup configuration.');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.put('/admin/global-popup', config);
      setSuccess('Global popup configuration saved successfully!');
    } catch {
      setError('Failed to save popup configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <MessageSquare size={24} className="text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Global Popup</h2>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <MessageSquare size={24} className="text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Global Popup</h2>
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

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="popup-heading" className="block text-sm font-medium text-gray-700 mb-1">
                Heading
              </label>
              <input
                id="popup-heading"
                type="text"
                value={config.heading}
                onChange={(e) => setConfig({ ...config, heading: e.target.value })}
                placeholder="Popup heading"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="popup-icon" className="block text-sm font-medium text-gray-700 mb-1">
                Icon
              </label>
              <select
                id="popup-icon"
                value={config.icon}
                onChange={(e) => setConfig({ ...config, icon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              >
                {iconOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="popup-body" className="block text-sm font-medium text-gray-700 mb-1">
              Body Text
            </label>
            <textarea
              id="popup-body"
              value={config.body}
              onChange={(e) => setConfig({ ...config, body: e.target.value })}
              placeholder="Popup body text"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="popup-cta-text" className="block text-sm font-medium text-gray-700 mb-1">
                CTA Button Text
              </label>
              <input
                id="popup-cta-text"
                type="text"
                value={config.ctaText}
                onChange={(e) => setConfig({ ...config, ctaText: e.target.value })}
                placeholder="e.g. Learn More"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="popup-cta-link" className="block text-sm font-medium text-gray-700 mb-1">
                CTA Link/Action
              </label>
              <input
                id="popup-cta-link"
                type="text"
                value={config.ctaLink}
                onChange={(e) => setConfig({ ...config, ctaLink: e.target.value })}
                placeholder="e.g. https://example.com or screen://profile"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <input
              id="popup-active"
              type="checkbox"
              checked={config.isActive}
              onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <label htmlFor="popup-active" className="text-sm font-medium text-gray-700">
              Active (show popup to users)
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
