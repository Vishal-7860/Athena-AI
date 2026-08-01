import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Search, 
  Bookmark, 
  ShieldCheck, 
  LogOut,
  Sparkles,
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
    <aside className="hidden md:flex flex-col w-64 bg-slate-950 text-slate-300 border-r border-slate-900 h-screen sticky top-0 relative z-20 shadow-xl shadow-slate-950/50">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-900/60 bg-slate-950/30">
        <span className="text-xl font-extrabold text-white flex items-center gap-2 tracking-tight">
          <span className="text-lg">🔬</span>
          <span className="bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent font-black">Athena AI</span>
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-900/20'
                    : 'hover:bg-slate-900 hover:text-white hover:translate-x-0.5'
                }`
              }
            >
              <Icon size={18} className="transition-transform group-hover:scale-105" />
              {item.name}
            </NavLink>
          );
        })}

        {/* Conditional Admin Nav */}
        {isAdmin && (
          <div className="pt-6 border-t border-slate-900 mt-6">
            <span className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-3">
              Administration
            </span>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-brand-650 text-white shadow-lg shadow-purple-900/20'
                    : 'hover:bg-slate-900 hover:text-white hover:translate-x-0.5'
                }`
              }
            >
              <ShieldCheck size={18} className="transition-transform group-hover:scale-105" />
              Admin Portal
            </NavLink>
          </div>
        )}
      </nav>

      {/* User Section / Logout */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/20">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 border border-brand-500/30 flex items-center justify-center text-white font-bold uppercase shadow-sm">
            {user?.username?.[0] || 'U'}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-white truncate">{user?.username}</h4>
            <p className="text-xs text-slate-500 truncate capitalize font-medium">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-900 hover:border-red-500/50 hover:bg-red-500/5 text-slate-400 hover:text-red-400 transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
