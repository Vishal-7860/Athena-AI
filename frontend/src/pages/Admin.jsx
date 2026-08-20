import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import api from '../services/api';
import { 
  Users, 
  FileText, 
  Sparkles, 
  Layers, 
  TrendingUp, 
  Terminal, 
  ShieldCheck, 
  Database,
  RefreshCw
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register ChartJS plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Admin() {
  // Fetch Admin Analytics
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['adminAnalytics'],
    queryFn: async () => {
      const response = await api.get('/admin/analytics');
      return response.data;
    },
    refetchOnWindowFocus: false
  });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading system-wide metrics...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 max-w-md mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
          <ShieldCheck size={24} className="text-red-500 rotate-180" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Failed to Access Admin Data</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {error.response?.data?.message || 'Access denied. You must be authenticated as an Administrator.'}
        </p>
        <button 
          onClick={() => refetch()}
          className="mt-2 flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition"
        >
          <RefreshCw size={16} /> Retry Connection
        </button>
      </div>
    );
  }

  // Destructure response payload
  const { users = {}, documents = {}, keyword_trends = [], activity_logs = [] } = data || {};

  // Metrics configurations
  const metricCards = [
    { 
      name: 'System Users', 
      value: users.total || 0, 
      subtext: `${users.admins || 0} Admins • ${users.standard || 0} Standard`,
      icon: Users,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
    },
    { 
      name: 'Document Database', 
      value: documents.papers || 0, 
      subtext: `${documents.downloads || 0} Cached PDFs • ${documents.bookmarks || 0} Saves`,
      icon: FileText, 
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    },
    { 
      name: 'Summaries Processed', 
      value: documents.summaries || 0, 
      subtext: `Avg Citations: ${documents.average_citations || 0}`,
      icon: Sparkles, 
      color: 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
    },
    { 
      name: 'Literature Matrices', 
      value: documents.reviews || 0, 
      subtext: 'Comparative review files',
      icon: Layers, 
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    }
  ];

  // Build Bar Chart Data
  const chartLabels = keyword_trends.length > 0 
    ? keyword_trends.map(t => t.keyword) 
    : ['No Data'];
  const chartValues = keyword_trends.length > 0 
    ? keyword_trends.map(t => t.count) 
    : [0];

  const barChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Searches Count',
        data: chartValues,
        backgroundColor: 'rgba(139, 92, 246, 0.65)',
        borderColor: '#8b5cf6',
        borderWidth: 1.5,
        borderRadius: 6
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#64748b',
          font: {
            family: 'Inter, sans-serif',
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.08)'
        },
        ticks: {
          color: '#64748b',
          stepSize: 1,
          font: {
            family: 'Inter, sans-serif'
          }
        }
      }
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="text-purple-600 dark:text-purple-400" size={32} />
            Admin Operations Panel
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitor system-wide database volume, API operations, and query analytics.
          </p>
        </div>
        <div>
          <button 
            disabled={isFetching}
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand-500 hover:border-brand-500/40 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Refreshing...' : 'Force Refresh'}
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.name} 
              className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-6 shadow-sm flex items-center justify-between hover:border-brand-500/30 transition-all duration-300 group"
            >
              <div className="space-y-1.5 overflow-hidden">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{card.name}</p>
                <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">{card.value}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{card.subtext}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Keywords trends chart */}
        <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-6 shadow-sm lg:col-span-2 flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <TrendingUp size={16} className="text-brand-500" />
                Popular Search Terms
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total searches mapped across core research publications</p>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {keyword_trends.length > 0 ? (
              <Bar data={barChartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No active keyword metrics in database.
              </div>
            )}
          </div>
        </div>

        {/* Live system logs timeline */}
        <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-6 shadow-sm flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Terminal size={16} className="text-purple-500" />
                System Audit Trail
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Recent server audit triggers</p>
            </div>
            <Database size={15} className="text-slate-400" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
            {activity_logs.length > 0 ? (
              activity_logs.map((log) => (
                <div key={log.id} className="p-2.5 rounded bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-purple-600 dark:text-purple-400 text-[10px] uppercase">
                      {log.action}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">{log.details}</p>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No audit logs loaded.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Management & Credit Allocation Section */}
      <UserCreditManagementTable />
    </div>
  );
}

function UserCreditManagementTable() {
  const [editingUserId, setEditingUserId] = React.useState(null);
  const [newCredits, setNewCredits] = React.useState('');
  const [updating, setUpdating] = React.useState(false);

  const { data: userList = [], refetch: refetchUsers, isLoading } = useQuery({
    queryKey: ['adminUserList'],
    queryFn: async () => {
      const response = await api.get('/admin/users');
      return response.data || [];
    }
  });

  const handleAllocate = async (userId) => {
    const val = parseInt(newCredits, 10);
    if (isNaN(val) || val < 0) {
      toast.warning('Please enter a valid non-negative credit number.');
      return;
    }
    setUpdating(true);
    try {
      const res = await api.post(`/admin/users/${userId}/credits`, { credits: val });
      toast.success(res.data?.message || 'Credits allocated successfully!');
      setEditingUserId(null);
      setNewCredits('');
      refetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user credits.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users size={20} className="text-brand-500" />
            User Management & Credit Allocation
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            View registered user accounts and directly allocate AI credits.
          </p>
        </div>
        <button
          onClick={() => refetchUsers()}
          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition"
        >
          Refresh Users
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Credits Balance</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
            {isLoading ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-slate-400">Loading user records...</td>
              </tr>
            ) : userList.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-slate-400">No users found.</td>
              </tr>
            ) : (
              userList.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td className="p-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold text-[10px] uppercase">
                      {u.username[0] || 'U'}
                    </div>
                    {u.username}
                  </td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{u.email}</td>
                  <td className="p-3 capitalize">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.role === 'admin' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-amber-500">
                    {u.role === 'admin' ? '∞ Unlimited' : `${u.credits} / ${u.max_credits}`}
                  </td>
                  <td className="p-3 text-right">
                    {editingUserId === u.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          placeholder="Credits"
                          value={newCredits}
                          onChange={(e) => setNewCredits(e.target.value)}
                          className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs focus:outline-none"
                        />
                        <button
                          onClick={() => handleAllocate(u.id)}
                          disabled={updating}
                          className="px-2.5 py-1 bg-brand-600 text-white rounded text-xs font-bold hover:bg-brand-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingUserId(null)}
                          className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingUserId(u.id);
                          setNewCredits(String(u.credits));
                        }}
                        className="px-3 py-1 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 rounded font-semibold text-xs transition"
                      >
                        Allocate Credits
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

