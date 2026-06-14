import { useEffect, useState } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import { api } from '../services/api';

interface SearchEntry {
  _id: string;
  query: string;
  count: number;
  lastSearchedAt: string;
}

interface SearchInsightsData {
  topSearches: SearchEntry[];
  trending: SearchEntry[];
}

export const SearchInsights = () => {
  const [data, setData] = useState<SearchInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await api.get('/admin/search-insights');
        setData(res.data.data);
      } catch {
        setError('Failed to load search insights.');
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Search size={20} className="text-blue-600" />
          Search Insights
        </h3>
        <p className="text-sm text-gray-500">
          Monitor what users are searching for to improve content discoverability.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trending Searches (Last 7 Days) */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-semibold flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-green-500" />
            Trending (Last 7 Days)
          </h4>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse bg-gray-100 rounded" />
              ))}
            </div>
          ) : data?.trending?.length ? (
            <div className="space-y-2">
              {data.trending.map((entry, idx) => (
                <div
                  key={entry._id}
                  className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-6">#{idx + 1}</span>
                    <span className="text-sm font-medium">{entry.query}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">
                      {new Date(entry.lastSearchedAt).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      {entry.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No trending searches in the last 7 days.</p>
          )}
        </div>

        {/* All-Time Top Searches */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-md font-semibold flex items-center gap-2 mb-4">
            <Search size={18} className="text-blue-500" />
            Top Searched Keywords (All Time)
          </h4>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse bg-gray-100 rounded" />
              ))}
            </div>
          ) : data?.topSearches?.length ? (
            <div className="overflow-y-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-600">#</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600">Keyword</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Searches</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-600">Last Searched</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topSearches.map((entry, idx) => (
                    <tr key={entry._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-2 font-medium">{entry.query}</td>
                      <td className="py-2 px-2 text-right font-semibold text-blue-600">{entry.count}</td>
                      <td className="py-2 px-2 text-right text-gray-500">
                        {new Date(entry.lastSearchedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No search data available yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
