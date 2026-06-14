import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, ShieldAlert, Award, Image, LogOut, Bell, MessageSquare, Heart, Palette, Tag, Search } from 'lucide-react';
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
    { path: '/artwork-types', label: 'Artwork Types', icon: Palette },
    { path: '/tags', label: 'Tag Management', icon: Tag },
    { path: '/search-insights', label: 'Search Insights', icon: Search },
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
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-lg font-bold tracking-widest text-gray-900">ARTNEPALAYA</h1>
          <span className="text-[11px] text-accent font-semibold uppercase tracking-wider mt-0.5 block">
            Admin Portal
          </span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  active
                    ? 'bg-gray-50 text-gray-900 border-l-[3px] border-accent font-semibold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border-l-[3px] border-transparent'
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 text-red-500 px-3 py-2.5 hover:bg-red-50 rounded-lg w-full transition-colors duration-150"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-100 px-8 py-5 flex justify-between items-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 capitalize">
            {location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
          </h2>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <span className="font-medium text-sm text-gray-700">{user?.username || 'Admin'}</span>
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
