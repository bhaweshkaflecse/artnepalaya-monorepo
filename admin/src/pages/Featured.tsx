import { useEffect, useState } from 'react';
import { Plus, X, Award, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { api } from '../services/api';

interface FeaturedPost {
  _id: string;
  postId: {
    _id: string;
    media: { url: string; providerId?: string; type?: string }[];
    authorId: { username: string; avatarUrl?: string };
    caption?: string;
  };
  featuredBy: string;
  sortOrder: number;
  expiresAt: string | null;
  createdAt: string;
}

export const Featured = () => {
  const [featured, setFeatured] = useState<FeaturedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPostId, setNewPostId] = useState('');
  const [addError, setAddError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatured = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/featured');
      setFeatured(res.data.data);
    } catch {
      setError('Failed to load featured posts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatured();
  }, []);

  const handleAdd = async () => {
    if (!newPostId.trim()) return;
    setAddError('');
    setActionLoading(true);
    try {
      await api.post('/admin/featured', { postId: newPostId.trim() });
      setShowAddModal(false);
      setNewPostId('');
      await fetchFeatured();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setAddError(message || 'Failed to add featured post. Maximum 3 allowed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (postId: string) => {
    setActionLoading(true);
    setError(null);
    try {
      await api.delete(`/admin/featured/${postId}`);
      await fetchFeatured();
    } catch {
      setError('Failed to remove featured post. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateOrder = async (postId: string, newOrder: number) => {
    setActionLoading(true);
    try {
      await api.put(`/admin/featured/${postId}/order`, { sortOrder: newOrder });
      await fetchFeatured();
    } catch {
      setError('Failed to update order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const item = featured[index];
    const prevItem = featured[index - 1];
    await handleUpdateOrder(item.postId._id, prevItem.sortOrder);
    await handleUpdateOrder(prevItem.postId._id, item.sortOrder);
  };

  const handleMoveDown = async (index: number) => {
    if (index === featured.length - 1) return;
    const item = featured[index];
    const nextItem = featured[index + 1];
    await handleUpdateOrder(item.postId._id, nextItem.sortOrder);
    await handleUpdateOrder(nextItem.postId._id, item.sortOrder);
  };

  const handleUpdateExpiry = async (postId: string, expiresAt: string) => {
    setActionLoading(true);
    try {
      await api.put(`/admin/featured/${postId}/expiry`, { expiresAt: expiresAt || null });
      await fetchFeatured();
    } catch {
      setError('Failed to update expiration date.');
    } finally {
      setActionLoading(false);
    }
  };

  // Sort displayed items by sortOrder
  const sortedFeatured = [...featured].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md text-sm mb-4">{error}</div>}
      <div className="bg-white p-6 rounded-lg border border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Featured Carousel</h3>
          <p className="text-sm text-gray-500">
            Maximum 3 artworks. These appear at the top of the mobile home feed. Drag to reorder.
          </p>
          <div className="mt-2 flex items-center space-x-2">
            <Award size={16} className="text-accent" />
            <span className="text-sm font-medium">
              {featured.length}/3 Featured Slots Used
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={featured.length >= 3}
          className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
        >
          <Plus size={16} />
          <span>Add New Featured</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 animate-pulse bg-gray-200 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 animate-pulse bg-gray-200 rounded" />
                  <div className="h-3 w-32 animate-pulse bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : featured.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Award size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No featured posts yet. Add up to 3 artworks to the carousel.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedFeatured.map((item, index) => (
            <div
              key={item.postId._id}
              className="bg-white border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center gap-4">
                {/* Order controls */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || actionLoading}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <span className="text-xs text-center text-gray-500 font-mono">{index + 1}</span>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === sortedFeatured.length - 1 || actionLoading}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>

                {/* Thumbnail */}
                {item.postId.media?.[0]?.url ? (
                  <img
                    src={item.postId.media[0].url}
                    alt=""
                    className="h-20 w-20 rounded object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 bg-gray-200 rounded" />
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    @{item.postId.authorId?.username || 'unknown'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {item.postId.caption || 'No caption'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Featured {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Expiration date picker */}
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-500 mb-1">Expires</label>
                    <input
                      type="date"
                      value={item.expiresAt ? new Date(item.expiresAt).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleUpdateExpiry(item.postId._id, e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-black"
                    />
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => handleRemove(item.postId._id)}
                  disabled={actionLoading}
                  className="text-red-600 text-sm font-medium hover:underline disabled:opacity-50 ml-4"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Featured Post</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddError('');
                  setNewPostId('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {addError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {addError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Post ID
                </label>
                <input
                  type="text"
                  value={newPostId}
                  onChange={(e) => setNewPostId(e.target.value)}
                  placeholder="Enter the post ID to feature"
                  className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError('');
                    setNewPostId('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={actionLoading || !newPostId.trim()}
                  className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  {actionLoading ? 'Adding...' : 'Add to Featured'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
