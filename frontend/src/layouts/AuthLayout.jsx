import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthLayout() {
  const { isAuthenticated } = useAuth();

  // If already logged in, send them directly to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen grid-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
          <span className="text-brand-500">🔬</span> Athena AI
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Smart Literature Review & Paper Analysis Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-panel-heavy rounded-2xl py-8 px-6 shadow-xl sm:px-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
