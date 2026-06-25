import { useEffect, useState, useCallback } from 'react';
import { Trash2, Star, StarOff, ChevronLeft, ChevronRight, Search, Film, Copy, Check, RotateCcw } from 'lucide-react';
import { api } from '../services/api';

/**
 * Transforms a Cloudinary video URL into a thumbnail image URL.
 * Inserts so_0,w_400,c_fill transformation and changes extension to .jpg.
 */
function getVideoThumbnail(videoUrl: string): string {
  if (!videoUrl) return '';
  // Replace the extension with .jpg
  const withoutExt = videoUrl.replace(/\.[^/.]+$/, '.jpg');
  // Insert transformation before the version/path segment
  const uploadSegment = '/upload/';
  const uploadIdx = withoutExt.indexOf(uploadSegment);
  if (uploadIdx === -1) {
    return withoutExt;
  }
  const beforeUpload = withoutExt.substring(0, uploadIdx + uploadSegment.length);
  const afterUpload = withoutExt.substring(uploadIdx + uploadSegment.length);
  return `${beforeUpload}so_0,w_400,c_fill/${afterUpload}`;
}

interface Post {
  _id: string;
  media: Array<{url: string; type: string; providerId?: string}>;
  caption?: string;
  authorId: { _id: string; username: string; avatarUrl?: string };
  tags?: string[];
  isFeatured?: boolean;
}

interface FeaturedItem {
  postId: { _id: string };
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export const Posts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [featuredIds, setFeaturedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 15, totalItems: 0, totalPages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchFeatured = useCallback(async () => {
    try {
      const res = await api.get('/admin/featured');
      const ids = new Set(
        (res.data.data as FeaturedItem[]).map((f) => f.postId._id)
      );
      setFeaturedIds(ids);
    } catch {
      // Featured data is optional, continue without it
    }
  }, []);

  const fetchPosts = useCallback(async (page: number, search: string, deleted: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (search) params.search = search;
      if (deleted) params.deleted = 'true';
      const res = await api.get('/admin/posts', { params });
      setPosts(res.data.data);
      setMeta(res.data.meta);
    } catch {
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1, '', activeTab === 'trash');
    fetchFeatured();
  }, [fetchPosts, fetchFeatured, activeTab]);

  const handlePageChange = (page: number) => {
    fetchPosts(page, searchQuery, activeTab === 'trash');
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    fetchPosts(1, searchInput, activeTab === 'trash');
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleFeatureToggle = async (postId: string, currentlyFeatured: boolean) => {
    setActionLoading(postId);
    setError(null);
    try {
      if (currentlyFeatured) {
        await api.delete(`/admin/featured/${postId}`);
        setFeaturedIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } else {
        await api.post('/admin/featured', { postId });
        setFeaturedIds((prev) => new Set(prev).add(postId));
      }
    } catch (err) {
      setError((err as any)?.response?.data?.error?.message || 'Failed to update featured status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (postId: string) => {
    setActionLoading(postId);
    setError(null);
    try {
      if (activeTab === 'active') {
        // Soft delete: move to trash
        await api.put(`/admin/posts/${postId}/trash`);
      } else {
        // Permanent delete from trash tab
        await api.delete(`/admin/posts/${postId}`);
      }
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      setMeta((prev) => ({ ...prev, totalItems: prev.totalItems - 1 }));
    } catch {
      setError('Failed to delete post. Please try again.');
    } finally {
      setActionLoading(null);
      setDeleteModal(null);
    }
  };

  const handleRestore = async (postId: string) => {
    setActionLoading(postId);
    setError(null);
    try {
      await api.put(`/admin/posts/${postId}/restore`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      setMeta((prev) => ({ ...prev, totalItems: prev.totalItems - 1 }));
    } catch {
      setError('Failed to restore post. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTabChange = (tab: 'active' | 'trash') => {
    setActiveTab(tab);
    setSearchQuery('');
    setSearchInput('');
  };

  const getPageNumbers = () => {
    const { page, totalPages } = meta;
    const pages: number[] = [];
    const windowSize = 5;
    let start = Math.max(1, page - Math.floor(windowSize / 2));
    let end = Math.min(totalPages, start + windowSize - 1);
    if (end - start < windowSize - 1) {
      start = Math.max(1, end - windowSize + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const showingStart = meta.totalItems === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const showingEnd = Math.min(meta.page * meta.limit, meta.totalItems);

  return (
    <div className="space-y-5">
      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100">{error}</div>}

      {/* Active / Trash Tabs */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleTabChange('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'active'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => handleTabChange('trash')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'trash'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Trash
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by caption or tag..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Search
        </button>
      </div>

      <div className="text-sm text-gray-600">
        Showing {showingStart}-{showingEnd} of {meta.totalItems} posts
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">#</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Post ID</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Thumbnail</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Caption</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Artist</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Tags</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Featured</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-5 py-3.5"><div className="h-4 w-6 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-20 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-10 w-10 animate-pulse bg-gray-100 rounded-lg" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-32 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-20 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-24 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-16 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-16 animate-pulse bg-gray-100 rounded" /></td>
                </tr>
              ))
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                  No posts found.
                </td>
              </tr>
            ) : (
              posts.map((post, idx) => {
                const isFeatured = featuredIds.has(post._id);
                const firstMedia = post.media?.[0];
                const isVideo = firstMedia?.type === 'video';
                return (
                  <tr key={post._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors duration-100">
                    <td className="px-5 py-3.5 text-sm text-gray-400">{showingStart + idx}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-mono text-gray-500 truncate max-w-[120px]" title={post._id}>{post._id}</span>
                        <button onClick={() => copyToClipboard(post._id)} className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors" title="Copy Post ID">
                          {copiedId === post._id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {firstMedia ? (
                        isVideo ? (
                          <div className="relative w-10 h-10">
                            <img
                              src={getVideoThumbnail(firstMedia.url)}
                              alt=""
                              className="w-10 h-10 rounded object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Film size={14} className="text-white drop-shadow" />
                            </div>
                          </div>
                        ) : (
                          <img
                            src={firstMedia.url}
                            alt=""
                            className="w-10 h-10 rounded object-cover"
                          />
                        )
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100" />
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm max-w-[200px] truncate text-gray-700">
                      {post.caption || '(No caption)'}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{post.authorId?.username || 'Unknown'}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-400 max-w-[150px] truncate">
                      {post.tags?.join(', ') || '-'}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleFeatureToggle(post._id, isFeatured)}
                        disabled={actionLoading === post._id}
                        className={`p-1.5 rounded-lg transition-colors duration-150 ${
                          isFeatured
                            ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                            : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                        } disabled:opacity-50`}
                        title={isFeatured ? 'Remove from Featured' : 'Add to Featured'}
                      >
                        {isFeatured ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      {activeTab === 'active' ? (
                        <button
                          onClick={() => setDeleteModal(post._id)}
                          disabled={actionLoading === post._id}
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors duration-150 disabled:opacity-50"
                          title="Delete post"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleRestore(post._id)}
                            disabled={actionLoading === post._id}
                            className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors duration-150 disabled:opacity-50"
                            title="Restore post"
                          >
                            <RotateCcw size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteModal(post._id)}
                            disabled={actionLoading === post._id}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors duration-150 disabled:opacity-50"
                            title="Permanently delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => handlePageChange(meta.page - 1)}
            disabled={meta.page <= 1 || loading}
            className="flex items-center space-x-1 px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>
          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              disabled={loading}
              className={`px-3 py-2 rounded-lg text-sm border font-medium transition-colors ${
                pageNum === meta.page
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-600'
              } disabled:opacity-50`}
            >
              {pageNum}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(meta.page + 1)}
            disabled={meta.page >= meta.totalPages || loading}
            className="flex items-center space-x-1 px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              {activeTab === 'trash' ? 'Permanently Delete Post' : 'Move to Trash'}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {activeTab === 'trash'
                ? 'Are you sure you want to permanently delete this post? This will remove all associated data and cannot be undone.'
                : 'Are you sure you want to move this post to trash? It can be restored later from the Trash tab.'}
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteModal)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                {activeTab === 'trash' ? 'Permanently Delete' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
