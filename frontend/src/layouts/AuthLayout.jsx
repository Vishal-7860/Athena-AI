import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function AuthLayout() {
  const { isAuthenticated } = useAuth();

  // If already logged in, send them directly to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen grid-bg relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 overflow-hidden radial-glow">
      {/* Dynamic Glowing Background Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-brand-400/10 dark:bg-brand-500/10 blur-[80px] glow-orb pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[300px] h-[300px] rounded-full bg-indigo-400/10 dark:bg-indigo-600/10 blur-[80px] glow-orb pointer-events-none" style={{ animationDelay: '-4s' }} />

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <h1 className="text-4.5xl font-extrabold tracking-tight flex items-center justify-center gap-2 mb-2">
            <span className="text-4xl drop-shadow-md">🔬</span> 
            <span className="animate-gradient-text font-black drop-shadow-sm">Athena AI</span>
          </h1>
          <p className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
            Smart Literature Review & Paper Analysis
          </p>
        </motion.div>
      </div>

      <motion.div 
        className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
      >
        <div className="glass-panel-heavy rounded-3xl py-8 px-6 shadow-2xl sm:px-10 border border-white/20 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50">
          <Outlet />
        </div>
      </motion.div>
    </div>
  );
}
