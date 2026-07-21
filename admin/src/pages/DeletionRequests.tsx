import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Trash2, XCircle, AlertTriangle } from 'lucide-react';

interface DeletionRequest {
  _id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  deletionRequestedAt: string;
  scheduledDeletionAt: string;
  deletionReason?: string;
}

export const DeletionRequests = () => {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

      {requests.length === 0 ? (
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
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Request Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Scheduled Deletion</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Days Remaining</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map((req) => {
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
                      {req.deletionReason || '—'}
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
