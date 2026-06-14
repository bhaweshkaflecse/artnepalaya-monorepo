import { useState, useEffect } from 'react';
import { Palette, Plus, Edit2, ToggleLeft, ToggleRight, Save, X } from 'lucide-react';
import { api } from '../services/api';

interface ArtworkType {
  _id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export const ArtworkTypes = () => {
  const [types, setTypes] = useState<ArtworkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<ArtworkType | null>(null);
  const [formName, setFormName] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/artwork-types');
      setTypes(res.data.data || []);
    } catch {
      setError('Failed to load artwork types.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const openCreate = () => {
    setEditingType(null);
    setFormName('');
    setFormSortOrder(0);
    setShowModal(true);
  };

  const openEdit = (type: ArtworkType) => {
    setEditingType(type);
    setFormName(type.name);
    setFormSortOrder(type.sortOrder);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingType) {
        await api.put(`/admin/artwork-types/${editingType._id}`, { name: formName, sortOrder: formSortOrder });
      } else {
        await api.post('/admin/artwork-types', { name: formName, sortOrder: formSortOrder });
      }
      setShowModal(false);
      fetchTypes();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to save artwork type.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (type: ArtworkType) => {
    try {
      await api.patch(`/admin/artwork-types/${type._id}/toggle`);
      fetchTypes();
    } catch {
      setError('Failed to toggle artwork type status.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Palette size={24} className="text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Artwork Types</h2>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse bg-gray-200 rounded mb-3" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Palette size={24} className="text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Artwork Types</h2>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
        >
          <Plus size={16} />
          <span>Add Type</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Sort Order</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {types.map((type) => (
              <tr key={type._id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{type.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{type.sortOrder}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    type.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {type.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => openEdit(type)}
                    className="inline-flex items-center p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleToggle(type)}
                    className={`inline-flex items-center p-1.5 rounded ${
                      type.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={type.isActive ? 'Disable' : 'Enable'}
                  >
                    {type.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  </button>
                </td>
              </tr>
            ))}
            {types.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-sm">
                  No artwork types found. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingType ? 'Edit Artwork Type' : 'New Artwork Type'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Painting, Digital Art"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="w-full flex items-center justify-center space-x-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
