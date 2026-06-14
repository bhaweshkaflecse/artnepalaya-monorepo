import { useState, useEffect } from 'react';
import { Tag as TagIcon, Plus, Trash2, GitMerge, Save, X } from 'lucide-react';
import { api } from '../services/api';

interface TagItem {
  _id: string;
  name: string;
  postCount: number;
  status: string;
  createdAt: string;
}

export const TagManagement = () => {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTags = async (p = page) => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/tags?page=${p}&limit=50`);
      setTags(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch {
      setError('Failed to load tags.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags(page);
  }, [page]);

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/admin/tags', { name: newTagName });
      setShowCreateModal(false);
      setNewTagName('');
      setSuccess('Tag created successfully.');
      fetchTags();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to create tag.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (tag: TagItem) => {
    const newStatus = tag.status === 'active' ? 'disabled' : 'active';
    try {
      await api.put(`/admin/tags/${tag._id}`, { status: newStatus });
      fetchTags();
    } catch {
      setError('Failed to update tag status.');
    }
  };

  const handleDelete = async (tag: TagItem) => {
    if (!confirm(`Are you sure you want to delete the tag "${tag.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/tags/${tag._id}`);
      setSuccess('Tag deleted successfully.');
      fetchTags();
    } catch {
      setError('Failed to delete tag.');
    }
  };

  const handleMerge = async () => {
    if (!mergeSourceId || !mergeTargetId) return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/admin/tags/merge', { sourceId: mergeSourceId, targetId: mergeTargetId });
      setShowMergeModal(false);
      setMergeSourceId('');
      setMergeTargetId('');
      setSuccess('Tags merged successfully.');
      fetchTags();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to merge tags.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading && tags.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <TagIcon size={24} className="text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Tag Management</h2>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {Array.from({ length: 6 }).map((_, i) => (
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
          <TagIcon size={24} className="text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Tag Management</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowMergeModal(true)}
            className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200"
          >
            <GitMerge size={16} />
            <span>Merge Tags</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
          >
            <Plus size={16} />
            <span>Create Tag</span>
          </button>
        </div>
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

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Usage Count</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tags.map((tag) => (
              <tr key={tag._id}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{tag.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{tag.postCount}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleStatus(tag)}
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full cursor-pointer ${
                      tag.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {tag.status || 'active'}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(tag.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(tag)}
                    className="inline-flex items-center p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {tags.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                  No tags found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Create Tag Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New Tag</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag Name</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g. watercolor, abstract"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={saving || !newTagName.trim()}
                className="w-full flex items-center justify-center space-x-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={16} />
                <span>{saving ? 'Creating...' : 'Create Tag'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Tags Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Merge Tags</h3>
              <button onClick={() => setShowMergeModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              The source tag will be merged into the target tag. All posts using the source tag will be updated to use the target tag, and the source tag will be deleted.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Tag (will be deleted)</label>
                <select
                  value={mergeSourceId}
                  onChange={(e) => setMergeSourceId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="">Select source tag...</option>
                  {tags.map((tag) => (
                    <option key={tag._id} value={tag._id} disabled={tag._id === mergeTargetId}>
                      {tag.name} ({tag.postCount} posts)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Tag (will keep)</label>
                <select
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="">Select target tag...</option>
                  {tags.map((tag) => (
                    <option key={tag._id} value={tag._id} disabled={tag._id === mergeSourceId}>
                      {tag.name} ({tag.postCount} posts)
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleMerge}
                disabled={saving || !mergeSourceId || !mergeTargetId}
                className="w-full flex items-center justify-center space-x-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GitMerge size={16} />
                <span>{saving ? 'Merging...' : 'Merge Tags'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
