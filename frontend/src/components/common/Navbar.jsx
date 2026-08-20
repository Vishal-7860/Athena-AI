import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sun, Moon, Bell, Menu, X, Sparkles, Zap, PlusCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';

export default function Navbar({ onMobileMenuToggle }) {
  const navigate = useNavigate();
  const { user, claimDailyBonus, isAdmin } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [claiming, setClaiming] = useState(false);

  const handleNotificationClick = (action) => {
    setShowNotifications(false);
    switch (action) {
      case 'BOOKMARK_ADDED':
      case 'PDF_DOWNLOADED':
      case 'PDF_EXTRACTED':
      case 'SUMMARY_GENERATED':
        navigate('/bookmarks');
        break;
      case 'REVIEW_COMPILED':
        navigate('/review');
        break;
      default:
        navigate('/dashboard');
        break;
    }
  };

  const handleClaimBonus = async () => {
    setClaiming(true);
    try {
      const res = await claimDailyBonus();
      toast.success(res.message || 'Claimed +10 AI Credits!');
      setShowCreditsModal(false);
    } catch (err) {
      toast.error(err || 'Failed to claim credits.');
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      api.get('/bookmarks/analytics')
        .then(res => {
          setNotifications(res.data.activity || []);
        })
        .catch(err => console.error(err));
    }
  }, [user]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const creditsDisplay = isAdmin ? 'Unlimited' : `${user?.credits ?? 50} Credits`;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30 transition-colors duration-200">
      {/* Mobile Menu Icon & Brand Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-1 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none cursor-pointer"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 capitalize hidden sm:inline">
            Workspace
          </span>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Literature Hub
          </span>
        </div>
      </div>

      {/* Global Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Interactive AI Credits Badge */}
        <div className="relative">
          <button
            onClick={() => {
              setShowCreditsModal(!showCreditsModal);
              setShowNotifications(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-brand-500/10 to-indigo-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold shadow-sm hover:scale-105 transition-all cursor-pointer"
            title="Click to view AI Credits balance and claim daily bonus"
          >
            <Zap size={14} className="fill-amber-500 text-amber-500 animate-pulse" />
            <span>{creditsDisplay}</span>
          </button>

          {/* Credits Popover */}
          {showCreditsModal && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 p-4 animate-scale-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-amber-500 fill-amber-500" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">AI Credits Balance</h4>
                </div>
                <button
                  onClick={() => setShowCreditsModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="py-3 text-center">
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {isAdmin ? '∞' : user?.credits ?? 50}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isAdmin ? 'Administrator Unlimited Access' : `out of ${user?.max_credits ?? 50} total allocated`}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/60 rounded-lg p-2.5 space-y-1 text-[11px] text-slate-600 dark:text-slate-400 mb-3 border border-slate-100 dark:border-slate-800/80">
                <div className="flex justify-between">
                  <span>PDF Text Extraction:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">1 Credit</span>
                </div>
                <div className="flex justify-between">
                  <span>Paper Summarization:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">1 Credit</span>
                </div>
                <div className="flex justify-between">
                  <span>Literature Review:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">3 Credits</span>
                </div>
              </div>

              {!isAdmin && (
                <button
                  onClick={handleClaimBonus}
                  disabled={claiming}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-amber-500 to-brand-600 hover:from-amber-600 hover:to-brand-700 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  <PlusCircle size={14} />
                  {claiming ? 'Claiming...' : 'Claim Daily Bonus (+10)'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pro features badge */}
        <div className="hidden lg:flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm shadow-amber-500/10">
          <Sparkles size={12} />
          Gemini Powered
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 relative cursor-pointer"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full"></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden py-2 animate-scale-in">
              <div className="px-4 py-2 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Notifications</span>
                <span className="text-[10px] bg-brand-500/10 text-brand-500 px-1.5 py-0.5 rounded-full font-semibold">{notifications.length} New</span>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-450 dark:text-slate-550">No new notifications.</div>
                ) : (
                  notifications.map((notif, index) => (
                    <div 
                      key={index} 
                      onClick={() => handleNotificationClick(notif.action)}
                      className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors cursor-pointer"
                    >
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{notif.action.replace('_', ' ')}</p>
                      <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-0.5 leading-relaxed">{notif.details}</p>
                      <p className="text-[8px] text-slate-400 dark:text-slate-500 mt-1">{new Date(notif.timestamp).toLocaleTimeString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <span className="w-px h-6 bg-slate-200 dark:bg-slate-800"></span>

        {/* User Badge */}
        <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
            {user?.username?.[0] || 'U'}
          </div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-250 hidden sm:inline">
            {user?.username}
          </span>
        </Link>
      </div>
    </header>
  );
}
