import { useEffect, useState } from 'react';
import { Users, Image, ShieldAlert, BarChart3, TrendingUp } from 'lucide-react';
import { api } from '../services/api';

interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  pendingReports: number;
}

interface PostsPerDay {
  date: string;
  count: number;
}

interface AnalyticsData {
  postsPerDay: PostsPerDay[];
  activeUsersThisWeek: number;
  newPostsToday: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_LABELS[d.getDay()];
}

export const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyticsError, setAnalyticsError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/dashboard');
        setStats(res.data.data);
      } catch {
        setError('Failed to load dashboard stats.');
      } finally {
        setLoading(false);
      }
    };
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/admin/analytics');
        setAnalytics(res.data.data);
      } catch {
        setAnalyticsError('Failed to load analytics data.');
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchStats();
    fetchAnalytics();
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
        {error}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Total Posts',
      value: stats?.totalPosts ?? 0,
      icon: Image,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      label: 'Pending Reports',
      value: stats?.pendingReports ?? 0,
      icon: ShieldAlert,
      color: 'text-accent',
      bg: 'bg-red-100',
    },
  ];

  const maxCount = analytics?.postsPerDay?.length
    ? Math.max(...analytics.postsPerDay.map((d) => d.count), 1)
    : 1;

  const chartHeight = 200;
  const chartPadding = 40;
  const barAreaHeight = chartHeight - chartPadding;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white p-6 rounded-lg border border-gray-200 flex items-center space-x-4"
            >
              {loading ? (
                <div className="flex items-center space-x-4 w-full">
                  <div className="w-14 h-14 rounded-full animate-pulse bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 animate-pulse bg-gray-200 rounded" />
                    <div className="h-7 w-16 animate-pulse bg-gray-200 rounded" />
                  </div>
                </div>
              ) : (
                <>
                  <div className={`p-4 rounded-full ${stat.bg} ${stat.color}`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-600" />
            Posts Per Day (Last 7 Days)
          </h3>
        </div>

        {analyticsLoading ? (
          <div className="space-y-3">
            <div className="h-[200px] w-full animate-pulse bg-gray-100 rounded" />
            <div className="flex gap-4">
              <div className="h-10 w-40 animate-pulse bg-gray-100 rounded" />
              <div className="h-10 w-40 animate-pulse bg-gray-100 rounded" />
            </div>
          </div>
        ) : analyticsError ? (
          <p className="text-red-500 text-sm">{analyticsError}</p>
        ) : analytics && analytics.postsPerDay.length > 0 ? (
          <>
            <svg
              width="100%"
              height={chartHeight}
              viewBox={`0 0 ${analytics.postsPerDay.length * 80} ${chartHeight}`}
              className="overflow-visible"
            >
              {analytics.postsPerDay.map((item, i) => {
                const barWidth = 40;
                const gap = 80;
                const x = i * gap + (gap - barWidth) / 2;
                const barHeight =
                  maxCount > 0 ? (item.count / maxCount) * barAreaHeight : 0;
                const y = chartHeight - chartPadding - barHeight;
                const radius = 4;

                return (
                  <g key={item.date}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx={radius}
                      ry={radius}
                      fill="#2563EB"
                      opacity={0.85}
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 8}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#1e40af"
                      fontWeight="600"
                    >
                      {item.count}
                    </text>
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight - 10}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#6b7280"
                    >
                      {getDayLabel(item.date)}
                    </text>
                  </g>
                );
              })}
              <line
                x1="0"
                y1={chartHeight - chartPadding}
                x2={analytics.postsPerDay.length * 80}
                y2={chartHeight - chartPadding}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            </svg>

            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-green-600" />
                <span className="text-sm text-gray-600">New Posts Today:</span>
                <span className="text-sm font-bold text-gray-900">
                  {analytics.newPostsToday}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                <span className="text-sm text-gray-600">Active Users This Week:</span>
                <span className="text-sm font-bold text-gray-900">
                  {analytics.activeUsersThisWeek}
                </span>
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-400 text-sm">No post activity in the last 7 days.</p>
        )}
      </div>
    </div>
  );
};
