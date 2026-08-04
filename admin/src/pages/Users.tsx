import { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Search, BadgeCheck } from 'lucide-react';
import { api } from '../services/api';

interface UserData {
  _id: string;
  username: string;
  email: string;
  role: string;
  subRoles?: string[];
  isAdult?: boolean;
  isVerified?: boolean;
  verifiedType?: string | null;
  status: string;
  avatarUrl?: string;
  interests?: string[];
  isProtectedAdmin?: boolean;
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
    isProtectedAdmin?: boolean;
  } | null>(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifyModal, setVerifyModal] = useState<{ userId: string; username: string } | null>(null);
  const [verifyType, setVerifyType] = useState<string>('artist');

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (pageNum: number, search: string, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/users', {
        params: { page: pageNum, limit: 50, search: search || undefined },
        signal,
      });
      setUsers(res.data.data);
      setMeta(res.data.meta);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'CanceledError') return;
      if (signal?.aborted) return;
      setError('Failed to load users. Please try again.');
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    debounceTimerRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      fetchUsers(page, searchQuery, controller.signal);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [page, searchQuery, fetchUsers]);

  const handleStatusChange = async (userId: string, status: string, pwd?: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      await api.put(`/admin/users/${userId}/status`, { status, masterPassword: pwd });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, status } : u))
      );
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'Failed to update user status. Please try again.');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
      setMasterPassword('');
    }
  };

  const handleVerifyUser = async (userId: string, verifiedType: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      await api.put(`/admin/users/${userId}/verify`, { verifiedType });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isVerified: true, verifiedType } : u))
      );
    } catch {
      setError('Failed to verify user. Please try again.');
    } finally {
      setActionLoading(null);
      setVerifyModal(null);
    }
  };

  const handleUnverifyUser = async (userId: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      await api.put(`/admin/users/${userId}/unverify`);
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isVerified: false, verifiedType: null } : u))
      );
    } catch {
      setError('Failed to unverify user. Please try again.');
    } finally {
      setActionLoading(null);
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

  return (
    <div className="space-y-5">
      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100">{error}</div>}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all"
          />
        </div>
        {meta && (
          <span className="text-sm text-gray-500">
            {meta.totalItems.toLocaleString()} total users
          </span>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="max-h-[calc(100vh-240px)] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Avatar</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Username</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Email</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Role</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Sub-roles</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">18+</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Status</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-5 py-3.5"><div className="h-8 w-8 animate-pulse bg-gray-100 rounded-full" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-24 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-32 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-16 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-20 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-10 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-16 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-24 animate-pulse bg-gray-100 rounded" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors duration-100">
                  <td className="px-5 py-3.5">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                        {user.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium">
                    <span className="inline-flex items-center gap-1">
                      {user.username}
                      {user.isVerified && (
                        <BadgeCheck size={14} className="text-blue-500" />
                      )}
                    </span>
                    {user.interests && user.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {user.interests.map((interest) => (
                           <span
                            key={interest}
                            className="inline-block px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-medium rounded-full"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{user.email}</td>
                  <td className="px-5 py-3.5 text-sm">{user.role}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">
                    {user.subRoles?.join(', ') || '-'}
                  </td>
                  <td className="px-5 py-3.5">
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
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${getStatusBadge(user.status)}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex space-x-1 flex-wrap gap-y-1">
                      {user.status !== 'active' && (
                        <button
                          onClick={() =>
                            setConfirmAction({
                              userId: user._id,
                              status: 'active',
                              username: user.username,
                              isProtectedAdmin: user.isProtectedAdmin,
                            })
                          }
                          disabled={actionLoading === user._id}
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
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
                              isProtectedAdmin: user.isProtectedAdmin,
                            })
                          }
                          disabled={actionLoading === user._id}
                          className="text-xs px-2 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 transition-colors"
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
                              isProtectedAdmin: user.isProtectedAdmin,
                            })
                          }
                          disabled={actionLoading === user._id}
                          className="text-xs px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          Ban
                        </button>
                      )}
                      {!user.isVerified ? (
                        <button
                          onClick={() => setVerifyModal({ userId: user._id, username: user.username })}
                          disabled={actionLoading === user._id}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          Verify
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnverifyUser(user._id)}
                          disabled={actionLoading === user._id}
                          className="text-xs px-2 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
                        >
                          Unverify
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
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="flex items-center space-x-1 px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
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
            className="flex items-center space-x-1 px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Confirm Action</h3>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to set{' '}
              <span className="font-medium text-gray-700">{confirmAction.username}</span> to{' '}
              <span className="font-medium capitalize text-gray-700">{confirmAction.status}</span>?
            </p>
            {confirmAction.isProtectedAdmin && (
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Master Password Required
                </label>
                <input
                  type="password"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="Enter Master Password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
            )}
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => { setConfirmAction(null); setMasterPassword(''); }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleStatusChange(confirmAction.userId, confirmAction.status, masterPassword)
                }
                disabled={confirmAction.isProtectedAdmin && !masterPassword}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {verifyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Verify User</h3>
            <p className="text-sm text-gray-500 mb-4">
              Select verification type for{' '}
              <span className="font-medium text-gray-700">{verifyModal.username}</span>:
            </p>
            <select
              value={verifyType}
              onChange={(e) => setVerifyType(e.target.value)}
              className="w-full mb-5 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
            >
              <option value="artist">Artist</option>
              <option value="gallery">Gallery</option>
              <option value="business">Business</option>
            </select>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setVerifyModal(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerifyUser(verifyModal.userId, verifyType)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
