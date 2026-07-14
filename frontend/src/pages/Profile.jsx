import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Settings, 
  Key, 
  Moon, 
  Sun, 
  Save, 
  Bookmark, 
  FileText
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Load custom API key and theme from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('custom_gemini_key') || '';
    setApiKey(savedKey);
    
    const isDark = document.documentElement.classList.contains('dark') || 
                   localStorage.getItem('theme') === 'dark';
    setDarkMode(isDark);
  }, []);

  // Fetch count of bookmarks specifically for this user
  const { data: bookmarkCount } = useQuery({
    queryKey: ['bookmarksCount'],
    queryFn: async () => {
      const response = await api.get('/bookmarks');
      return response.data?.length || 0;
    }
  });

  const handleSaveApiKey = (e) => {
    e.preventDefault();
    localStorage.setItem('custom_gemini_key', apiKey.trim());
    toast.success('Custom Gemini API Key saved locally!');
  };

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      toast.info('Dark mode activated');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      toast.info('Light mode activated');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) {
      toast.warning('Username and email cannot be blank.');
      return;
    }
    
    setUpdatingProfile(true);
    try {
      const response = await api.put('/auth/profile/update', {
        username: username.trim(),
        email: email.trim()
      });
      updateUser({ username: response.data.username, email: response.data.email });
      toast.success('Profile credentials updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Settings size={28} className="text-brand-500" />
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your researcher profile, API integrations, and workspace preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-6 shadow-sm flex flex-col items-center text-center space-y-4 md:col-span-1">
          <div className="w-20 h-20 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-extrabold text-3xl uppercase tracking-wider">
            {user?.username?.[0] || 'U'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{user?.username || 'Researcher'}</h3>
            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 capitalize mt-1">
              {user?.role || 'User'}
            </span>
          </div>

          <div className="w-full border-t border-slate-200/60 dark:border-slate-850 pt-4 space-y-3 text-left">
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <Mail size={14} className="text-slate-400 shrink-0" />
              <span className="truncate">{user?.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <Shield size={14} className="text-slate-400 shrink-0" />
              <span>Role: <strong className="capitalize">{user?.role}</strong></span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <span>Registered researcher</span>
            </div>
          </div>

          <div className="w-full border-t border-slate-200/60 dark:border-slate-850 pt-4 grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Bookmarks</span>
              <span className="text-lg font-bold text-slate-800 dark:text-white flex items-center justify-center gap-1 mt-0.5">
                <Bookmark size={14} className="text-brand-500" />
                {bookmarkCount || 0}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/50">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tier</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white uppercase mt-1 block">
                Free Academic
              </span>
            </div>
          </div>
        </div>

        {/* Configuration settings */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Updates Form */}
          <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <User size={18} className="text-brand-500" />
              Researcher Profile Info
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update your workspace username and primary contact email credentials.
            </p>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Username
                  </label>
                  <input 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={updatingProfile}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {updatingProfile ? 'Saving...' : 'Update Credentials'}
              </button>
            </form>
          </div>

          {/* Preferences */}
          <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              {darkMode ? <Moon size={18} className="text-purple-400" /> : <Sun size={18} className="text-amber-500" />}
              Display Preferences
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize the look and feel of the Athena AI workspace interface.
            </p>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-250/20 dark:border-slate-800/50">
              <div>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">Dark Workspace Mode</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Reduce glare in low-light environments.</p>
              </div>
              <button 
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  darkMode ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  darkMode ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* AI Settings Form */}
          <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Key size={18} className="text-brand-500" />
              API Key Configurations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Optionally supply a custom Google Gemini API Key. If left empty, the application falls back to the system's global credentials.
            </p>
            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Gemini API Key
                </label>
                <input 
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
              >
                <Save size={14} />
                Save API Settings
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
