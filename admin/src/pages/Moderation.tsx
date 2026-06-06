import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';

interface Report {
  _id: string;
  targetType: string;
  reason: string;
  reporterId: { username: string } | string;
  details?: string;
  status: string;
}

interface Meta {
  currentPage: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

type StatusFilter = 'all' | 'Pending' | 'Resolved' | 'Dismissed';

export const Moderation = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async (pageNum: number, status: StatusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page: pageNum, limit: 50 };
      if (status !== 'all') params.status = status;
      const res = await api.get('/admin/reports', { params });
      setReports(res.data.data);
      setMeta(res.data.meta);
    } catch {
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(page, statusFilter);
  }, [page, statusFilter, fetchReports]);

  const handleResolve = async (reportId: string) => {
    setActionLoading(reportId);
    setError(null);
    try {
      await api.put(`/admin/reports/${reportId}/resolve`);
      setReports((prev) =>
        prev.map((r) => (r._id === reportId ? { ...r, status: 'Resolved' } : r))
      );
    } catch {
      setError('Failed to resolve report. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      case 'Dismissed':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReporterName = (reporterId: Report['reporterId']) => {
    if (typeof reporterId === 'object' && reporterId !== null) {
      return reporterId.username;
    }
    return String(reporterId);
  };

  const filterOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Resolved', label: 'Resolved' },
    { value: 'Dismissed', label: 'Dismissed' },
  ];

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md text-sm mb-4">{error}</div>}
      <div className="flex items-center space-x-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setStatusFilter(option.value);
              setPage(1);
            }}
            className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
              statusFilter === option.value
                ? 'bg-black text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-4 font-medium text-gray-600 text-sm">Report ID</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Target Type</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Reason</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Reporter</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Details</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Status</th>
              <th className="p-4 font-medium text-gray-600 text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="p-4"><div className="h-4 w-16 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-12 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-28 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-20 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-32 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-16 animate-pulse bg-gray-200 rounded" /></td>
                  <td className="p-4"><div className="h-4 w-16 animate-pulse bg-gray-200 rounded" /></td>
                </tr>
              ))
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <ShieldAlert size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-400">No reports found.</p>
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr
                  key={report._id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td className="p-4 text-sm font-mono text-gray-500">
                    #{report._id.slice(-6)}
                  </td>
                  <td className="p-4 text-sm">{report.targetType}</td>
                  <td className="p-4 text-sm text-accent font-medium">{report.reason}</td>
                  <td className="p-4 text-sm">{getReporterName(report.reporterId)}</td>
                  <td className="p-4 text-sm text-gray-500 max-w-[200px] truncate">
                    {report.details || '-'}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(report.status)}`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {report.status === 'Pending' && (
                      <button
                        onClick={() => handleResolve(report._id)}
                        disabled={actionLoading === report._id}
                        className="text-xs bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800 disabled:opacity-50"
                      >
                        {actionLoading === report._id ? 'Resolving...' : 'Resolve'}
                      </button>
                    )}
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
    </div>
  );
};
