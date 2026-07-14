import React, { useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/common/Sidebar';
import Navbar from '../components/common/Navbar';
import { X, LayoutDashboard, Search, Bookmark, ShieldCheck, LogOut, Sparkles, Settings } from 'lucide-react';

export default function AppLayout() {
  const { isAuthenticated, user, logout, isAdmin, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Validating credentials...</p>
        </div>
      </div>
    );
  }

  // Redirect if not signed in
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Search Papers', path: '/search', icon: Search },
    { name: 'Literature Review', path: '/review', icon: Sparkles },
    { name: 'Bookmarks', path: '/bookmarks', icon: Bookmark },
    { name: 'Profile & Settings', path: '/profile', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer Menu (Slide-out Overlay) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-900/60 backdrop-blur-sm">
          <div className="relative flex flex-col w-72 max-w-sm bg-slate-900 text-slate-300 p-6 animate-slide-in shadow-2xl">
            {/* Close Button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* Title */}
            <div className="mb-8 flex items-center gap-2">
              <span className="text-2xl font-bold text-white"><span className="text-brand-400">🔬</span> Athena AI</span>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === item.path
                        ? 'bg-brand-600 text-white'
                        : 'hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    {item.name}
                  </Link>
                );
              })}

              {isAdmin && (
                <div className="pt-6 border-t border-slate-800 mt-6">
                  <span className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                    Administration
                  </span>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === '/admin'
                        ? 'bg-purple-600 text-white'
                        : 'hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <ShieldCheck size={18} />
                    Admin Portal
                  </Link>
                </div>
              )}
            </nav>

            {/* Profile & Logout */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-500/20 border border-brand-500/50 flex items-center justify-center text-brand-400 font-bold uppercase">
                  {user?.username?.[0] || 'U'}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{user?.username}</h4>
                  <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-800 hover:border-red-500 hover:text-red-400 transition-all cursor-pointer"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <Navbar onMobileMenuToggle={() => setMobileMenuOpen(true)} />

        {/* Dynamic Nested Route Page Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
