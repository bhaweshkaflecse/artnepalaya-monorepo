import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, ShieldAlert, Award, Image, LogOut, Bell, MessageSquare, Heart } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/posts', label: 'Posts Management', icon: FileText },
    { path: '/users', label: 'User Management', icon: Users },
    { path: '/moderation', label: 'Moderation & Reports', icon: ShieldAlert },
    { path: '/featured', label: 'Featured Content', icon: Award },
    { path: '/auth-media', label: 'Auth Media', icon: Image },
    { path: '/push-notifications', label: 'Push Notifications', icon: Bell },
    { path: '/global-popup', label: 'Global Popup', icon: MessageSquare },
    { path: '/cms', label: 'CMS Pages', icon: FileText },
    { path: '/community-interest', label: 'Community Interest', icon: Heart },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-surface">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold tracking-widest text-black">ARTNEPALAYA</h1>
          <span className="text-xs text-accent font-semibold uppercase tracking-wider">
            Admin Portal
          </span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-md transition-colors ${
                  active ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 text-red-600 px-4 py-2 hover:bg-red-50 rounded-md w-full"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold capitalize">
            {location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
          </h2>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-bold text-sm">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <span className="font-medium text-sm">{user?.username || 'Admin'}</span>
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
