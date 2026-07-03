import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ShieldAlert, Copy, Check } from 'lucide-react';
import { api } from '../services/api';

interface Report {
  _id: string;
  targetType: string;
  targetId?: string;
  reason: string;
  reporterId: { username: string } | string;
  details?: string;
  status: string;
  adminNotes?: string | null;
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState<string | null>(null);

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  const toggleNotes = (report: Report) => {
    if (expandedNotes === report._id) {
      setExpandedNotes(null);
    } else {
      setExpandedNotes(report._id);
      setNotesText(report.adminNotes || '');
    }
  };

  const handleSaveNotes = async (reportId: string) => {
    setSavingNotes(reportId);
    setError(null);
    try {
      await api.put(`/admin/reports/${reportId}/notes`, { notes: notesText });
      setReports((prev) =>
        prev.map((r) => (r._id === reportId ? { ...r, adminNotes: notesText } : r))
      );
      setExpandedNotes(null);
    } catch {
      setError('Failed to save notes. Please try again.');
    } finally {
      setSavingNotes(null);
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
    <div className="space-y-5">
      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm border border-red-100">{error}</div>}
      <div className="flex items-center space-x-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setStatusFilter(option.value);
              setPage(1);
            }}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors duration-150 ${
              statusFilter === option.value
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Report ID</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Target Type</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Post ID</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Reason</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Reporter</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Details</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Status</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Notes</th>
              <th className="px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider sticky top-0 bg-gray-50/80 backdrop-blur-sm z-10">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-5 py-3.5"><div className="h-4 w-16 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-12 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-16 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-28 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-20 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-32 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-16 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-16 animate-pulse bg-gray-100 rounded" /></td>
                  <td className="px-5 py-3.5"><div className="h-4 w-16 animate-pulse bg-gray-100 rounded" /></td>
                </tr>
              ))
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center">
                  <ShieldAlert size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400">No reports found.</p>
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <React.Fragment key={report._id}>
                <tr
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors duration-100"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-mono text-gray-500 truncate max-w-[140px]" title={report._id}>{report._id}</span>
                      <button onClick={() => copyToClipboard(report._id)} className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors" title="Copy Report ID">
                        {copiedId === report._id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm">{report.targetType}</td>
                  <td className="px-5 py-3.5">
                    {report.targetId ? (
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-mono text-gray-500 truncate max-w-[140px]" title={report.targetId}>{report.targetId}</span>
                        <button onClick={() => copyToClipboard(report.targetId!)} className="text-gray-400 hover:text-gray-600 p-0.5 rounded transition-colors" title="Copy Post ID">
                          {copiedId === report.targetId ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-accent font-medium">{report.reason}</td>
                  <td className="px-5 py-3.5 text-sm">{getReporterName(report.reporterId)}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500 max-w-[200px] truncate">
                    {report.details || '-'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(report.status)}`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => toggleNotes(report)}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        report.adminNotes
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {report.adminNotes ? 'View Notes' : 'Add Notes'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    {report.status === 'Pending' && (
                      <button
                        onClick={() => handleResolve(report._id)}
                        disabled={actionLoading === report._id}
                        className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === report._id ? 'Resolving...' : 'Resolve'}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedNotes === report._id && (
                  <tr className="bg-gray-50/50">
                    <td colSpan={9} className="px-5 py-3">
                      <div className="flex items-start space-x-3">
                        <textarea
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder="Add admin notes about this report..."
                          rows={3}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                        />
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => handleSaveNotes(report._id)}
                            disabled={savingNotes === report._id}
                            className="text-xs bg-black text-white px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50"
                          >
                            {savingNotes === report._id ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setExpandedNotes(null)}
                            className="text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
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
    </div>
  );
};
