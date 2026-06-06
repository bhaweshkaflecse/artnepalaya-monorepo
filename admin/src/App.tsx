import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Posts } from './pages/Posts';
import { Users } from './pages/Users';
import { Moderation } from './pages/Moderation';
import { Featured } from './pages/Featured';
import { AuthMedia } from './pages/AuthMedia';
import { PushNotifications } from './pages/PushNotifications';
import { GlobalPopup } from './pages/GlobalPopup';
import { CmsEditor } from './pages/CmsEditor';
import { useAuthStore } from './store/authStore';
import type { ReactNode } from 'react';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="posts" element={<Posts />} />
          <Route path="users" element={<Users />} />
          <Route path="moderation" element={<Moderation />} />
          <Route path="featured" element={<Featured />} />
          <Route path="auth-media" element={<AuthMedia />} />
          <Route path="push-notifications" element={<PushNotifications />} />
          <Route path="global-popup" element={<GlobalPopup />} />
          <Route path="cms" element={<CmsEditor />} />
        </Route>
      </Routes>
    </Router>
  );
}
