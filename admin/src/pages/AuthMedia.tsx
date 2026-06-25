import { useState, useEffect, useCallback } from 'react';
import { Image, Trash2, Save, Search, GripVertical, Plus } from 'lucide-react';
import { api } from '../services/api';

interface PostResult {
  _id: string;
  caption: string;
  media: { url: string; type: string }[];
  authorId?: { username: string } | null;
  createdAt: string;
}

interface SelectedPost {
  postId: string;
  url: string;
  type: string;
  caption: string;
  artist: string;
  createdAt?: string;
}

export const AuthMedia = () => {
  const [selectedPosts, setSelectedPosts] = useState<SelectedPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PostResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCurrentMedia();
  }, []);

  const fetchCurrentMedia = async () => {
    try {
      const res = await api.get('/admin/config/auth-media');
      const data = res.data.data;
      if (data && data.posts) {
        setSelectedPosts(data.posts);
      } else if (data && data.legacy && Array.isArray(data.legacy)) {
        // Legacy format: convert to display format
        setSelectedPosts(
          data.legacy.map((item: { url: string; type: string }, i: number) => ({
            postId: `legacy-${i}`,
            url: item.url,
            type: item.type,
            caption: '',
            artist: '',
          }))
        );
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(message || 'Failed to load current media.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get('/admin/posts', {
        params: { search: searchQuery.trim(), limit: 12 },
      });
      setSearchResults(res.data.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // Trigger search on Enter or after debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      handleSearch();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleAddPost = (post: PostResult) => {
    // Don't add duplicates
    if (selectedPosts.some((p) => p.postId === post._id)) return;

    setSelectedPosts([
      ...selectedPosts,
      {
        postId: post._id,
        url: post.media?.[0]?.url || '',
        type: post.media?.[0]?.type || 'image',
        caption: post.caption || '',
        artist: (post.authorId as { username: string } | null)?.username || '',
        createdAt: post.createdAt,
      },
    ]);
    setSuccess('');
  };

  const handleRemove = (postId: string) => {
    setSelectedPosts(selectedPosts.filter((p) => p.postId !== postId));
    setSuccess('');
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...selectedPosts];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    setSelectedPosts(newList);
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedPosts.length - 1) return;
    const newList = [...selectedPosts];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    setSelectedPosts(newList);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const postIds = selectedPosts
        .map((p) => p.postId)
        .filter((id) => !id.startsWith('legacy-'));
      await api.put('/admin/config/auth-media', { postIds });
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
            Select posts to feature on the mobile login carousel. The first media
            item from each post will be displayed.
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

      {/* Search Posts Section */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Search Posts</h3>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by post ID, caption, or artist username..."
            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-black"
          />
        </div>

        {/* Search Results */}
        {searching && (
          <p className="text-sm text-gray-400 mt-3">Searching...</p>
        )}
        {searchResults.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {searchResults.map((post) => {
              const isSelected = selectedPosts.some(
                (p) => p.postId === post._id
              );
              return (
                <div
                  key={post._id}
                  className={`relative rounded-lg border overflow-hidden cursor-pointer transition-all ${
                    isSelected
                      ? 'border-green-500 ring-2 ring-green-200 opacity-60'
                      : 'border-gray-200 hover:border-black hover:shadow-sm'
                  }`}
                  onClick={() => !isSelected && handleAddPost(post)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-gray-100">
                    {post.media?.[0]?.url ? (
                      <img
                        src={post.media[0].url}
                        alt={post.caption || 'Post'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image size={24} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-2">
                    <p className="text-xs text-gray-800 truncate">
                      {post.caption || 'No caption'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      @{(post.authorId as { username: string } | null)?.username || 'unknown'}
                    </p>
                    <p className="text-xs text-gray-300">
                      {post.createdAt
                        ? new Date(post.createdAt).toLocaleDateString()
                        : ''}
                    </p>
                  </div>
                  {/* Add badge */}
                  {!isSelected && (
                    <div className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
                      <Plus size={12} className="text-white" />
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                      <span className="text-white text-xs font-bold px-1">
                        Added
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {searchQuery.trim() && !searching && searchResults.length === 0 && (
          <p className="text-sm text-gray-400 mt-3">
            No posts found. Try a different search term.
          </p>
        )}
      </div>

      {/* Selected Posts (Featured List) */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">
            Featured Posts ({selectedPosts.length})
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Drag to reorder. The carousel will display these in order.
          </p>
        </div>
        {selectedPosts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Image size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              No posts selected. Use the search above to find and add posts.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {selectedPosts.map((post, index) => (
              <li
                key={post.postId}
                className="flex items-center justify-between p-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {/* Reorder controls */}
                  <div className="flex flex-col space-y-0.5">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs"
                    >
                      ▲
                    </button>
                    <GripVertical size={14} className="text-gray-300" />
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === selectedPosts.length - 1}
                      className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs"
                    >
                      ▼
                    </button>
                  </div>
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-14 h-14 bg-gray-100 rounded overflow-hidden">
                    {post.url ? (
                      <img
                        src={post.url}
                        alt={post.caption || 'Post'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image size={16} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">
                      {post.caption || 'No caption'}
                    </p>
                    <p className="text-xs text-gray-400">
                      @{post.artist || 'unknown'}
                    </p>
                    <p className="text-xs text-gray-300 font-mono">
                      ID: {post.postId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(post.postId)}
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
