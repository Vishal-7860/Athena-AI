import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileQuestion, 
  LayoutDashboard, 
  Search, 
  Bookmark, 
  ArrowLeft 
} from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 max-w-4xl mx-auto">
      <div className="glass-panel border border-slate-200/60 dark:border-slate-800/70 rounded-3xl p-8 md:p-12 shadow-2xl text-center space-y-6 w-full animate-fade-in">
        {/* 404 Animated Badge Icon */}
        <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-brand-500/20 to-indigo-500/20 border border-brand-500/30 flex items-center justify-center text-brand-500 shadow-inner">
          <FileQuestion size={48} className="animate-bounce" />
        </div>

        {/* Text Details */}
        <div className="space-y-2 max-w-lg mx-auto">
          <span className="px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-black uppercase tracking-widest">
            Error 404
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Page Not Found
          </h1>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            The page or publication route you are trying to access does not exist, has been moved, or the link is broken.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-brand-500 text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <ArrowLeft size={16} /> Go Back
          </button>
          
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition flex items-center gap-2 cursor-pointer shadow-md hover:shadow-brand-900/20"
          >
            <LayoutDashboard size={16} /> Return to Dashboard
          </button>

          <button
            onClick={() => navigate('/search')}
            className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
          >
            <Search size={16} /> Explore Publications
          </button>
        </div>
      </div>
    </div>
  );
}
