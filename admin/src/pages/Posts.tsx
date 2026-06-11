import { useEffect, useState, useCallback } from 'react';
import { Trash2, Star, StarOff, ChevronLeft, ChevronRight, Search, Film } from 'lucide-react';
import { api } from '../services/api';

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

  const fetchPosts = useCallback(async (page: number, search: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (search) params.search = search;
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
    fetchPosts(1, '');
    fetchFeatured();
  }, [fetchPosts, fetchFeatured]);

  const handlePageChange = (page: number) => {
    fetchPosts(page, searchQuery);
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    fetchPosts(1, searchInput);
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
      await api.delete(`/admin/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      setMeta((prev) => ({ ...prev, totalItems: prev.totalItems - 1 }));
    } catch {
      setError('Failed to delete post. Please try again.');
    } finally {
      setActionLoading(null);
      setDeleteModal(null);
    }
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
    <div className="space-y-4">
      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md text-sm mb-4">{error}</div>}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by caption or tag..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-black"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800"
        >
          Search
        </button>
      </div>

      <div className="text-sm text-gray-600">
        Showing {showingStart}-{showingEnd} of {meta.totalItems} posts
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-medium text-gray-600 text-sm">#</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Thumbnail</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Caption</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Artist</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Tags</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Featured</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="p-4"><div className="h-4 w-6 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-10 w-10 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-32 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-20 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-24 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-16 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-16 animate-pulse bg-gray-200 rounded" /></td>
                </tr>
              ))
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  No posts found.
                </td>
              </tr>
            ) : (
              posts.map((post, idx) => {
                const isFeatured = featuredIds.has(post._id);
                const firstMedia = post.media?.[0];
                const isVideo = firstMedia?.type === 'video';
                return (
                  <tr key={post._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="p-4 text-sm text-gray-500">{showingStart + idx}</td>
                    <td className="p-4">
                      {firstMedia ? (
                        isVideo ? (
                          <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center">
                            <Film size={18} className="text-white" />
                          </div>
                        ) : (
                          <img
                            src={firstMedia.url}
                            alt=""
                            className="w-10 h-10 rounded object-cover"
                          />
                        )
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-200" />
                      )}
                    </td>
                    <td className="p-4 text-sm max-w-[200px] truncate">
                      {post.caption || '(No caption)'}
                    </td>
                    <td className="p-4 text-sm">{post.authorId?.username || 'Unknown'}</td>
                    <td className="p-4 text-sm text-gray-500 max-w-[150px] truncate">
                      {post.tags?.join(', ') || '-'}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleFeatureToggle(post._id, isFeatured)}
                        disabled={actionLoading === post._id}
                        className={`p-1.5 rounded transition-colors ${
                          isFeatured
                            ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                            : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
                        } disabled:opacity-50`}
                        title={isFeatured ? 'Remove from Featured' : 'Add to Featured'}
                      >
                        {isFeatured ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setDeleteModal(post._id)}
                        disabled={actionLoading === post._id}
                        className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors disabled:opacity-50"
                        title="Delete post"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => handlePageChange(meta.page - 1)}
            disabled={meta.page <= 1 || loading}
            className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>
          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              disabled={loading}
              className={`px-3 py-2 rounded-md text-sm border ${
                pageNum === meta.page
                  ? 'bg-black text-white border-black'
                  : 'border-gray-300 hover:bg-gray-50'
              } disabled:opacity-50`}
            >
              {pageNum}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(meta.page + 1)}
            disabled={meta.page >= meta.totalPages || loading}
            className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Post</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteModal)}
                className="px-4 py-2 bg-accent text-white rounded-md text-sm hover:bg-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
