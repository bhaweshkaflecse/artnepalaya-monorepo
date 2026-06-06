import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { api } from '../services/api';

interface UserData {
  _id: string;
  username: string;
  email: string;
  role: string;
  subRoles?: string[];
  isAdult?: boolean;
  status: string;
  avatarUrl?: string;
}

interface Meta {
  currentPage: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export const Users = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    status: string;
    username: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/users', {
        params: { page: pageNum, limit: 50 },
      });
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch {
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page);
  }, [page, fetchUsers]);

  const handleStatusChange = async (userId: string, status: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      await api.put(`/admin/users/${userId}/status`, { status });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, status } : u))
      );
    } catch {
      setError('Failed to update user status. Please try again.');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      case 'banned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md text-sm mb-4">{error}</div>}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-black"
          />
        </div>
        {meta && (
          <span className="text-sm text-gray-500">
            {meta.totalItems.toLocaleString()} total users
          </span>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-medium text-gray-600 text-sm">Avatar</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Username</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Email</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Role</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Sub-roles</th>
              <th className="p-4 font-medium text-gray-600 text-sm">18+</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Status</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="p-4"><div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full" /></td>
                  <td className="p-4"><div className="h-4 w-24 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-32 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-16 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-20 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-10 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-16 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-24 animate-pulse bg-gray-200 rounded" /></td>
                </tr>
              ))
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="p-4">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                        {user.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-sm font-medium">{user.username}</td>
                  <td className="p-4 text-sm text-gray-500">{user.email}</td>
                  <td className="p-4 text-sm">{user.role}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {user.subRoles?.join(', ') || '-'}
                  </td>
                  <td className="p-4">
                    {user.isAdult ? (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                        Yes
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                        No
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(user.status)}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-1">
                      {user.status !== 'active' && (
                        <button
                          onClick={() =>
                            setConfirmAction({
                              userId: user._id,
                              status: 'active',
                              username: user.username,
                            })
                          }
                          disabled={actionLoading === user._id}
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Activate
                        </button>
                      )}
                      {user.status !== 'suspended' && (
                        <button
                          onClick={() =>
                            setConfirmAction({
                              userId: user._id,
                              status: 'suspended',
                              username: user.username,
                            })
                          }
                          disabled={actionLoading === user._id}
                          className="text-xs px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                        >
                          Suspend
                        </button>
                      )}
                      {user.status !== 'banned' && (
                        <button
                          onClick={() =>
                            setConfirmAction({
                              userId: user._id,
                              status: 'banned',
                              username: user.username,
                            })
                          }
                          disabled={actionLoading === user._id}
                          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Ban
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>
          <span className="text-sm text-gray-500">
            Page {meta.currentPage} of {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= meta.totalPages || loading}
            className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Confirm Action</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to set{' '}
              <span className="font-medium">{confirmAction.username}</span> to{' '}
              <span className="font-medium capitalize">{confirmAction.status}</span>?
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleStatusChange(confirmAction.userId, confirmAction.status)
                }
                className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
