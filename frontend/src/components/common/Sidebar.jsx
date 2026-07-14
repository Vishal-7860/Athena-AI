import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Search, 
  Bookmark, 
  History, 
  LineChart, 
  ShieldCheck, 
  LogOut,
  Sparkles,
  BookOpen,
  Settings
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Search Papers', path: '/search', icon: Search },
    { name: 'Literature Review', path: '/review', icon: Sparkles },
    { name: 'Bookmarks', path: '/bookmarks', icon: Bookmark },
    { name: 'Profile & Keys', path: '/profile', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <span className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-brand-400">🔬</span> Athena AI
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-900/20'
                    : 'hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {item.name}
            </NavLink>
          );
        })}

        {/* Conditional Admin Nav */}
        {isAdmin && (
          <div className="pt-6 border-t border-slate-800 mt-6">
            <span className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
              Administration
            </span>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <ShieldCheck size={18} />
              Admin Portal
            </NavLink>
          </div>
        )}
      </nav>

      {/* User Section / Logout */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 font-bold uppercase">
            {user?.username?.[0] || 'U'}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">{user?.username}</h4>
            <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-800 hover:border-red-500 hover:text-red-400 transition-all cursor-pointer"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
