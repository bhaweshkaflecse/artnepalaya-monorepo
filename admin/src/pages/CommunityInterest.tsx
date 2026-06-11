import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { api } from '../services/api';

interface InterestUser {
  _id: string;
  userId?: { _id: string; username: string; email?: string };
  email?: string;
  username?: string;
  deviceId?: string;
  source: string;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export const CommunityInterest = () => {
  const [users, setUsers] = useState<InterestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 20, totalItems: 0, totalPages: 0 });
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/community-interest', { params: { page: String(page), limit: '20' } });
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch {
      setError('Failed to load community interest users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const handlePageChange = (page: number) => {
    fetchUsers(page);
  };

  const getDisplayName = (user: InterestUser) => {
    if (user.userId?.username) return user.userId.username;
    if (user.username) return user.username;
    if (user.deviceId) return `Guest (${user.deviceId.slice(0, 8)}...)`;
    return 'Unknown';
  };

  const getEmail = (user: InterestUser) => {
    if (user.userId?.email) return user.userId.email;
    if (user.email) return user.email;
    return '-';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-3 mb-6">
        <Users size={24} className="text-gray-700" />
        <h2 className="text-lg font-semibold">Community Interest Users</h2>
        <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-sm">
          {meta.totalItems} total
        </span>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md text-sm">{error}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-medium text-gray-600 text-sm">#</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Username / Device</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Email</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Source</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Registered At</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="p-4"><div className="h-4 w-6 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-28 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-32 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-20 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-24 animate-pulse bg-gray-200 rounded" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  No community interest registrations yet.
                </td>
              </tr>
            ) : (
              users.map((user, idx) => (
                <tr key={user._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="p-4 text-sm text-gray-500">{(meta.page - 1) * meta.limit + idx + 1}</td>
                  <td className="p-4 text-sm font-medium">{getDisplayName(user)}</td>
                  <td className="p-4 text-sm text-gray-600">{getEmail(user)}</td>
                  <td className="p-4">
                    <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                      {user.source || 'community'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))
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
          {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => {
            const start = Math.max(1, Math.min(meta.page - 2, meta.totalPages - 4));
            return start + i;
          }).map((pageNum) => (
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
    </div>
  );
};
