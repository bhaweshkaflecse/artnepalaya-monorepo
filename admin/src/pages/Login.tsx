import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { User } from '../store/authStore';
import { api } from '../services/api';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/admin-login', { email, password });

      const { user, accessToken, refreshToken } = res.data.data as {
        user: User;
        accessToken: string;
        refreshToken: string;
      };

      setAuth(accessToken, refreshToken, user);
      navigate('/');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-widest mb-1">ARTNEPALAYA</h1>
          <p className="text-sm text-gray-500">Admin Portal</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@artnepalaya.com"
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:border-black text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:border-black text-sm"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-black text-white font-medium py-3 rounded-md hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <span>Sign In</span>
            )}
          </button>

          <p className="text-xs text-center text-gray-400 mt-4">
            Only accounts with Admin role can access this portal.
          </p>
        </div>
      </div>
    </div>
  );
};
