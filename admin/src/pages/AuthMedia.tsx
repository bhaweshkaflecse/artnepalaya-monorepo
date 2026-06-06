import { useState, useEffect } from 'react';
import { Image, Trash2, Plus, Save } from 'lucide-react';
import { api } from '../services/api';

interface MediaEntry {
  url: string;
  type: 'image' | 'video';
}

export const AuthMedia = () => {
  const [entries, setEntries] = useState<MediaEntry[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<'image' | 'video'>('image');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const res = await api.get('/admin/config/auth-media');
      setEntries(res.data.data || []);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(message || 'Failed to load media entries.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!newUrl.trim()) return;
    setEntries([...entries, { url: newUrl.trim(), type: newType }]);
    setNewUrl('');
    setNewType('image');
    setSuccess('');
  };

  const handleRemove = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
    setSuccess('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/admin/config/auth-media', { media: entries });
      setSuccess('Auth media updated successfully.');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(message || 'Failed to save media entries.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Auth Background Media</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage background images and videos shown on the mobile auth screen.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={16} />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Add new entry form */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Entry</h3>
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">URL</label>
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-black"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as 'image' | 'video')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-black"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center space-x-1 bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm"
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Media entries list */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">
            Current Entries ({entries.length})
          </h3>
        </div>
        {entries.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Image size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No media entries yet. Add one above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {entries.map((entry, index) => (
              <li key={index} className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                    <Image size={16} className="text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{entry.url}</p>
                    <span className="text-xs text-gray-400 uppercase">{entry.type}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(index)}
                  className="flex-shrink-0 text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
