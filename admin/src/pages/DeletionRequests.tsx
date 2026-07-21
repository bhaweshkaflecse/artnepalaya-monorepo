import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { Trash2, XCircle, AlertTriangle, Search, ChevronUp, ChevronDown } from 'lucide-react';

interface DeletionRequest {
  _id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  deletionRequestedAt: string;
  scheduledDeletionAt: string;
  deletionReason?: string;
  status?: string;
}

type FilterStatus = 'all' | 'pending' | 'cancelled' | 'completed';
type SortField = 'deletionRequestedAt' | 'scheduledDeletionAt';
type SortDir = 'asc' | 'desc';

export const DeletionRequests = () => {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('deletionRequestedAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/deletion-requests');
      setRequests(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch deletion requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCancel = async (userId: string) => {
    if (!confirm('Cancel this deletion request? The user account will be preserved.')) return;
    try {
      setActionLoading(userId);
      await api.put(`/admin/deletion-requests/${userId}/cancel`);
      setRequests((prev) => prev.filter((r) => r._id !== userId));
    } catch (err) {
      console.error('Failed to cancel deletion:', err);
      alert('Failed to cancel deletion request.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceDelete = async (userId: string, username: string) => {
    if (!confirm(`PERMANENTLY delete user "${username}" and ALL their data? This cannot be undone!`)) return;
    try {
      setActionLoading(userId);
      await api.delete(`/admin/deletion-requests/${userId}/force`);
      setRequests((prev) => prev.filter((r) => r._id !== userId));
    } catch (err) {
      console.error('Failed to force delete:', err);
      alert('Failed to delete account.');
    } finally {
      setActionLoading(null);
    }
  };

  const getDaysRemaining = (scheduledDate: string) => {
    const diff = new Date(scheduledDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Client-side filtering and sorting
  const filteredRequests = useMemo(() => {
    let result = [...requests];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.username.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filterStatus === 'pending') {
      result = result.filter((r) => getDaysRemaining(r.scheduledDeletionAt) > 0);
    } else if (filterStatus === 'completed') {
      result = result.filter((r) => getDaysRemaining(r.scheduledDeletionAt) === 0);
    } else if (filterStatus === 'cancelled') {
      result = result.filter((r) => r.status === 'cancelled');
    }

    // Sorting
    result.sort((a, b) => {
      const aVal = new Date(a[sortField]).getTime();
      const bVal = new Date(b[sortField]).getTime();
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [requests, searchQuery, filterStatus, sortField, sortDir]);

  // Summary calculations
  const pendingCount = requests.filter((r) => getDaysRemaining(r.scheduledDeletionAt) > 0).length;
  const nearestDeletion = useMemo(() => {
    const pending = requests.filter((r) => getDaysRemaining(r.scheduledDeletionAt) > 0);
    if (pending.length === 0) return null;
    const nearest = pending.reduce((min, r) => {
      const days = getDaysRemaining(r.scheduledDeletionAt);
      return days < min ? days : min;
    }, Infinity);
    return nearest;
  }, [requests]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deletion Requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage pending account deletion requests. Accounts are permanently deleted after 30 days.
          </p>
        </div>
        <span className="bg-red-100 text-red-700 text-sm font-medium px-3 py-1 rounded-full">
          {requests.length} pending
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Pending Deletions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Nearest Deletion</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {nearestDeletion !== null ? `${nearestDeletion} day${nearestDeletion === 1 ? '' : 's'}` : '—'}
          </p>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <AlertTriangle className="mx-auto mb-4 text-gray-300" size={48} />
          <p className="text-gray-500 text-lg">No pending deletion requests</p>
          <p className="text-gray-400 text-sm mt-1">All accounts are active and healthy.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  onClick={() => handleSort('deletionRequestedAt')}
                >
                  Request Date
                  <SortIcon field="deletionRequestedAt" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                  onClick={() => handleSort('scheduledDeletionAt')}
                >
                  Scheduled Deletion
                  <SortIcon field="scheduledDeletionAt" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Days Remaining</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRequests.map((req) => {
                const daysRemaining = getDaysRemaining(req.scheduledDeletionAt);
                const isExpired = daysRemaining === 0;
                return (
                  <tr key={req._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                          {req.avatarUrl ? (
                            <img src={req.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-bold">
                              {req.username?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{req.username}</p>
                          <p className="text-xs text-gray-500">{req.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(req.deletionRequestedAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(req.scheduledDeletionAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isExpired ? 'bg-red-100 text-red-800' : daysRemaining <= 7 ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isExpired ? 'Expired' : `${daysRemaining} days`}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                      {req.deletionReason || '\u2014'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleCancel(req._id)}
                          disabled={actionLoading === req._id}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                          <XCircle size={14} className="mr-1" />
                          Cancel
                        </button>
                        <button
                          onClick={() => handleForceDelete(req._id, req.username)}
                          disabled={actionLoading === req._id}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={14} className="mr-1" />
                          Force Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
