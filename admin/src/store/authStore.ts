import { create } from 'zustand';

export interface User {
  _id: string;
  email: string;
  username: string;
  role: string;
  avatarUrl?: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (token: string, refreshToken: string, user: User) => void;
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => void;
}

const getStoredUser = (): User | null => {
  const raw = localStorage.getItem('adminUser');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('adminToken'),
  refreshToken: localStorage.getItem('adminRefreshToken'),
  user: getStoredUser(),
  setAuth: (token, refreshToken, user) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminRefreshToken', refreshToken);
    localStorage.setItem('adminUser', JSON.stringify(user));
    set({ token, refreshToken, user });
  },
  setTokens: (token, refreshToken) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminRefreshToken', refreshToken);
    set({ token, refreshToken });
  },
  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRefreshToken');
    localStorage.removeItem('adminUser');
    set({ token: null, refreshToken: null, user: null });
  },
}));
