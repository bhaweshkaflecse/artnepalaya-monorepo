import { useState, useEffect } from 'react';
import { Bell, Send, Users, Clock, Settings } from 'lucide-react';
import { api } from '../services/api';

interface BroadcastResult {
  notificationsCreated: number;
  pushesSent: number;
}

interface PushStats {
  usersWithTokens: number;
  totalTokens: number;
  totalGroups: number;
  totalUnread: number;
  groupsLast24h: number;
}

interface BroadcastLogEntry {
  _id: string;
  title: string;
  message: string;
  recipientCount: number;
  pushesSent: number;
  createdAt: string;
}

interface NotificationConfig {
  groupingWindows: {
    Like: number;
    Save: number;
    Follow: number;
  };
  pushCooldowns: {
    Like: number;
    Save: number;
    Follow: number;
    Comment: number;
    AdminBroadcast: number;
  };
  maxRecentActors: number;
  displayThresholds: {
    showNames: number;
    showNamesAndOthers: number;
  };
}

// Helpers: convert ms to hours and minutes for display
const msToHours = (ms: number) => Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
const msToMinutes = (ms: number) => Math.round((ms / (1000 * 60)) * 100) / 100;
const hoursToMs = (hours: number) => Math.round(hours * 60 * 60 * 1000);
const minutesToMs = (minutes: number) => Math.round(minutes * 60 * 1000);

export const PushNotifications = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [stats, setStats] = useState<PushStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [history, setHistory] = useState<BroadcastLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Notification config state
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Editable config fields (displayed in human-readable units)
  const [likeGroupWindow, setLikeGroupWindow] = useState('');
  const [saveGroupWindow, setSaveGroupWindow] = useState('');
  const [followGroupWindow, setFollowGroupWindow] = useState('');
  const [likeCooldown, setLikeCooldown] = useState('');
  const [saveCooldown, setSaveCooldown] = useState('');
  const [followCooldown, setFollowCooldown] = useState('');
  const [commentCooldown, setCommentCooldown] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/push-stats');
        setStats(res.data.data);
      } catch {
        // Stats are non-critical, silently fail
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/admin/notifications/history', { params: { page: 1, limit: 50 } });
      setHistory(res.data.data || []);
    } catch {
      // History is non-critical
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Fetch notification config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/admin/notifications/config');
        const data: NotificationConfig = res.data.data;
        setConfig(data);
        // Convert ms to display units
        setLikeGroupWindow(String(msToHours(data.groupingWindows.Like)));
        setSaveGroupWindow(String(msToHours(data.groupingWindows.Save)));
        setFollowGroupWindow(String(msToHours(data.groupingWindows.Follow)));
        setLikeCooldown(String(msToMinutes(data.pushCooldowns.Like)));
        setSaveCooldown(String(msToMinutes(data.pushCooldowns.Save)));
        setFollowCooldown(String(msToMinutes(data.pushCooldowns.Follow)));
        setCommentCooldown(String(msToMinutes(data.pushCooldowns.Comment)));
      } catch {
        setConfigError('Failed to load notification configuration');
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigSuccess(null);
    setConfigError(null);

    // Validate all fields are positive numbers
    const fields = [
      { name: 'Like Group Window', value: likeGroupWindow },
      { name: 'Save Group Window', value: saveGroupWindow },
      { name: 'Follow Group Window', value: followGroupWindow },
      { name: 'Like Push Cooldown', value: likeCooldown },
      { name: 'Save Push Cooldown', value: saveCooldown },
      { name: 'Follow Push Cooldown', value: followCooldown },
      { name: 'Comment Push Cooldown', value: commentCooldown },
    ];

    for (const field of fields) {
      const num = parseFloat(field.value);
      if (isNaN(num) || num <= 0) {
        setConfigError(`${field.name} must be a positive number`);
        setConfigSaving(false);
        return;
      }
    }

    try {
      const payload = {
        groupingWindows: {
          Like: hoursToMs(parseFloat(likeGroupWindow)),
          Save: hoursToMs(parseFloat(saveGroupWindow)),
          Follow: hoursToMs(parseFloat(followGroupWindow)),
        },
        pushCooldowns: {
          Like: minutesToMs(parseFloat(likeCooldown)),
          Save: minutesToMs(parseFloat(saveCooldown)),
          Follow: minutesToMs(parseFloat(followCooldown)),
          Comment: minutesToMs(parseFloat(commentCooldown)),
        },
      };

      const res = await api.put('/admin/notifications/config', payload);
      setConfig(res.data.data);
      setConfigSuccess('Notification configuration saved successfully!');
    } catch {
      setConfigError('Failed to save notification configuration. Please try again.');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setResult(null);

    try {
      const response = await api.post('/admin/notifications/broadcast', { title, message });
      const data = response.data?.data;
      setSuccess('Broadcast notification sent successfully!');
      if (data) {
        setResult({
          notificationsCreated: data.notificationsCreated || 0,
          pushesSent: data.pushesSent || 0,
        });
      }
      setTitle('');
      setMessage('');
      fetchHistory();
    } catch {
      setError('Failed to send broadcast notification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Bell size={24} className="text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">Push Notifications</h2>
      </div>

      {/* Push Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Users size={18} className="text-gray-600" />
          <h3 className="text-sm font-medium text-gray-700">Push Notification Stats</h3>
        </div>
        {statsLoading ? (
          <div className="flex space-x-6">
            <div className="h-5 w-32 animate-pulse bg-gray-200 rounded" />
            <div className="h-5 w-32 animate-pulse bg-gray-200 rounded" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Users with tokens:</span>{' '}
              <span className="font-semibold text-gray-900">{stats.usersWithTokens}</span>
            </div>
            <div>
              <span className="text-gray-500">Total tokens:</span>{' '}
              <span className="font-semibold text-gray-900">{stats.totalTokens}</span>
            </div>
            <div>
              <span className="text-gray-500">Total groups:</span>{' '}
              <span className="font-semibold text-gray-900">{stats.totalGroups}</span>
            </div>
            <div>
              <span className="text-gray-500">Unread groups:</span>{' '}
              <span className="font-semibold text-gray-900">{stats.totalUnread}</span>
            </div>
            <div>
              <span className="text-gray-500">Groups (24h):</span>{' '}
              <span className="font-semibold text-gray-900">{stats.groupsLast24h}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Unable to load stats</p>
        )}
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm">
          {success}
        </div>
      )}

      {result && (
        <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-md text-sm flex items-center space-x-4">
          <span>In-app notifications: <strong>{result.notificationsCreated}</strong></span>
          <span>Push notifications sent: <strong>{result.pushesSent}</strong></span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Broadcast Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-md font-medium text-gray-800 mb-4">Send Broadcast</h3>
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label htmlFor="notif-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              id="notif-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="notif-message" className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              id="notif-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Notification message body"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim() || !message.trim()}
            className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            <span>{loading ? 'Sending...' : 'Send Broadcast'}</span>
          </button>
        </form>
      </div>

      {/* Notification Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Settings size={18} className="text-gray-600" />
          <h3 className="text-md font-medium text-gray-800">Notification Configuration</h3>
        </div>

        {configSuccess && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm mb-4">
            {configSuccess}
          </div>
        )}

        {configError && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
            {configError}
          </div>
        )}

        {configLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse bg-gray-100 rounded" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSaveConfig} className="space-y-5">
            {/* Grouping Windows */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Grouping Windows (hours)</h4>
              <p className="text-xs text-gray-500 mb-3">
                How long to group similar notifications together before creating a new group.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="like-group-window" className="block text-xs font-medium text-gray-600 mb-1">
                    Like Group Window (hours)
                  </label>
                  <input
                    id="like-group-window"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={likeGroupWindow}
                    onChange={(e) => setLikeGroupWindow(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="save-group-window" className="block text-xs font-medium text-gray-600 mb-1">
                    Save Group Window (hours)
                  </label>
                  <input
                    id="save-group-window"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={saveGroupWindow}
                    onChange={(e) => setSaveGroupWindow(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="follow-group-window" className="block text-xs font-medium text-gray-600 mb-1">
                    Follow Group Window (hours)
                  </label>
                  <input
                    id="follow-group-window"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={followGroupWindow}
                    onChange={(e) => setFollowGroupWindow(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Push Cooldowns */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Push Cooldowns (minutes)</h4>
              <p className="text-xs text-gray-500 mb-3">
                Minimum time between push notifications for each notification type.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label htmlFor="like-cooldown" className="block text-xs font-medium text-gray-600 mb-1">
                    Like Push Cooldown (min)
                  </label>
                  <input
                    id="like-cooldown"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={likeCooldown}
                    onChange={(e) => setLikeCooldown(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="save-cooldown" className="block text-xs font-medium text-gray-600 mb-1">
                    Save Push Cooldown (min)
                  </label>
                  <input
                    id="save-cooldown"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={saveCooldown}
                    onChange={(e) => setSaveCooldown(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="follow-cooldown" className="block text-xs font-medium text-gray-600 mb-1">
                    Follow Push Cooldown (min)
                  </label>
                  <input
                    id="follow-cooldown"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={followCooldown}
                    onChange={(e) => setFollowCooldown(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="comment-cooldown" className="block text-xs font-medium text-gray-600 mb-1">
                    Comment Push Cooldown (min)
                  </label>
                  <input
                    id="comment-cooldown"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={commentCooldown}
                    onChange={(e) => setCommentCooldown(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={configSaving}
              className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Settings size={16} />
              <span>{configSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Broadcast History */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center space-x-2">
          <Clock size={18} className="text-gray-600" />
          <h3 className="text-sm font-medium text-gray-700">Broadcast History</h3>
        </div>
        {historyLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse bg-gray-100 rounded" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="px-5 py-12 text-center text-gray-400 text-sm">
            No broadcasts sent yet.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Title</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Message</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Recipients</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Pushes</th>
                <th className="px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{entry.title}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 max-w-[200px] truncate">{entry.message}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{entry.recipientCount}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{entry.pushesSent}</td>
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
