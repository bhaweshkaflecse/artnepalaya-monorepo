import { useState } from 'react';
import { Bell, Send } from 'lucide-react';
import { api } from '../services/api';

export const PushNotifications = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.post('/admin/notifications/broadcast', { title, message });
      setSuccess('Broadcast notification sent successfully!');
      setTitle('');
      setMessage('');
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

      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

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
    </div>
  );
};
