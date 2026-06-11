import { useEffect, useState } from 'react';
import { Plus, X, Award } from 'lucide-react';
import { api } from '../services/api';

interface FeaturedPost {
  postId: {
    _id: string;
    media: { url: string; providerId?: string; type?: string }[];
    authorId: { username: string; avatarUrl?: string };
    caption?: string;
  };
  featuredBy: string;
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

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md text-sm mb-4">{error}</div>}
      <div className="bg-white p-6 rounded-lg border border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Featured Carousel</h3>
          <p className="text-sm text-gray-500">
            Maximum 3 artworks. These appear at the top of the mobile home feed.
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="h-48 animate-pulse bg-gray-200 w-full" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-24 animate-pulse bg-gray-200 rounded" />
                <div className="h-3 w-32 animate-pulse bg-gray-200 rounded" />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featured.map((item) => (
            <div
              key={item.postId._id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            >
              {item.postId.media?.[0]?.url ? (
                <img
                  src={item.postId.media[0].url}
                  alt=""
                  className="h-48 w-full object-cover"
                />
              ) : (
                <div className="h-48 bg-gray-200 w-full" />
              )}
              <div className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm">
                    @{item.postId.authorId?.username || 'unknown'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Featured {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(item.postId._id)}
                  disabled={actionLoading}
                  className="text-red-600 text-sm font-medium hover:underline disabled:opacity-50"
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
