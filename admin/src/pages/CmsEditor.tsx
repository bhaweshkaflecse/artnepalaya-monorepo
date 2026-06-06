import { useState, useEffect, useCallback } from 'react';
import { FileText, Save } from 'lucide-react';
import { api } from '../services/api';

interface CmsPage {
  slug: string;
  label: string;
}

interface CmsContent {
  title: string;
  content: string;
}

const cmsPages: CmsPage[] = [
  { slug: 'privacy-policy', label: 'Privacy Policy' },
  { slug: 'about-us', label: 'About Us' },
  { slug: 'terms-conditions', label: 'Terms & Conditions' },
  { slug: 'community-guidelines', label: 'Community Guidelines' },
];

export const CmsEditor = () => {
  const [selectedSlug, setSelectedSlug] = useState(cmsPages[0].slug);
  const [content, setContent] = useState<CmsContent>({ title: '', content: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.get(`/admin/cms/${slug}`);
      const data = res.data.data || res.data;
      setContent({
        title: data.title || '',
        content: data.content || '',
      });
    } catch {
      setError('Failed to load page content.');
      setContent({ title: '', content: '' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent(selectedSlug);
  }, [selectedSlug, fetchContent]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.put(`/admin/cms/${selectedSlug}`, content);
      setSuccess('Page content saved successfully!');
    } catch {
      setError('Failed to save page content. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <FileText size={24} className="text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">CMS Pages</h2>
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

      <div className="flex gap-6">
        {/* Left sidebar - page tabs */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {cmsPages.map((page) => (
              <button
                key={page.slug}
                onClick={() => setSelectedSlug(page.slug)}
                className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-100 last:border-0 transition-colors ${
                  selectedSlug === page.slug
                    ? 'bg-black text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right editor panel */}
        <div className="flex-1">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {loading ? (
              <div className="space-y-4">
                <div className="h-10 animate-pulse bg-gray-200 rounded" />
                <div className="h-64 animate-pulse bg-gray-200 rounded" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="cms-title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    id="cms-title"
                    type="text"
                    value={content.title}
                    onChange={(e) => setContent({ ...content, title: e.target.value })}
                    placeholder="Page title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="cms-content" className="block text-sm font-medium text-gray-700 mb-1">
                    Content (HTML)
                  </label>
                  <textarea
                    id="cms-content"
                    value={content.content}
                    onChange={(e) => setContent({ ...content, content: e.target.value })}
                    placeholder="Enter page content (HTML supported)"
                    rows={16}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save Page'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
