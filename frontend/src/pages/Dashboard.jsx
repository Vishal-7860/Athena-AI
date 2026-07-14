import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  FileText, 
  Bookmark, 
  Sparkles, 
  ArrowUpRight, 
  Clock, 
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch real analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['userAnalytics'],
    queryFn: async () => {
      const response = await api.get('/bookmarks/analytics');
      return response.data;
    }
  });

  const stats = [
    { name: 'Total Papers Searched', value: isLoading ? '...' : String(analytics?.total_searches || 0), icon: FileText, change: 'Searches history count', changeType: 'info', path: '/search' },
    { name: 'Saved Bookmarks', value: isLoading ? '...' : String(analytics?.total_bookmarks || 0), icon: Bookmark, change: 'Bookmarked papers', changeType: 'increase', path: '/bookmarks' },
    { name: 'AI Summaries Generated', value: isLoading ? '...' : String(analytics?.total_summaries || 0), icon: Sparkles, change: 'Gemini synthesis runs', changeType: 'info', path: '/bookmarks' },
    { name: 'Literature Reviews', value: isLoading ? '...' : String(analytics?.total_reviews || 0), icon: Layers, change: 'Comparative reviews', changeType: 'neutral', path: '/review' }
  ];

  const getActivityIconAndColor = (action) => {
    switch (action) {
      case 'BOOKMARK_ADDED':
        return { icon: Bookmark, color: 'bg-emerald-500/10 text-emerald-555' };
      case 'PDF_DOWNLOADED':
        return { icon: FileText, color: 'bg-blue-500/10 text-blue-500' };
      case 'PDF_EXTRACTED':
        return { icon: FileText, color: 'bg-orange-500/10 text-orange-500' };
      case 'SUMMARY_GENERATED':
        return { icon: Sparkles, color: 'bg-brand-500/10 text-brand-500' };
      case 'REVIEW_COMPILED':
        return { icon: Layers, color: 'bg-indigo-500/10 text-indigo-500' };
      default:
        return { icon: Sparkles, color: 'bg-slate-500/10 text-slate-550' };
    }
  };

  const recentActivity = analytics?.activity?.map((act, index) => {
    const { icon, color } = getActivityIconAndColor(act.action);
    const dateStr = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
    return {
      id: index,
      action: act.action.replace('_', ' '),
      detail: act.details,
      date: dateStr,
      icon,
      color,
      paper_id: act.paper_id
    };
  }) || [];

  const handleActivityClick = (activity) => {
    if (activity.paper_id) {
      navigate(`/bookmarks?paperId=${activity.paper_id}`);
    } else if (activity.action === 'REVIEW COMPILED') {
      navigate('/review');
    }
  };

  // Chart data
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        fill: true,
        label: 'Research Queries',
        data: [15, 24, 18, 32, 45, 38, 52],
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#8b5cf6'
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
        mode: 'index',
        intersect: false,
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
          color: '#64748b'
        }
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        },
        ticks: {
          color: '#64748b',
          stepSize: 10
        }
      }
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {user?.username || 'Researcher'}!
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Here's an overview of your research projects and AI summary activities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg flex items-center gap-1.5">
            <Calendar size={14} />
            Academic Portal v1.0
          </span>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.name}
              onClick={() => navigate(stat.path)}
              className="glass-panel hover:border-brand-500/40 dark:hover:border-brand-500/40 transition-all duration-300 rounded-xl p-6 shadow-sm flex items-center justify-between group cursor-pointer hover:shadow-md hover:scale-[1.02]"
            >
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.name}</p>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{stat.value}</h3>
                <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                  stat.changeType === 'increase' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : stat.changeType === 'info'
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {stat.change}
                </span>
              </div>
              <div className="w-12 h-12 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform">
                <Icon size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart (Takes 2 columns) */}
        <div className="glass-panel rounded-xl p-6 shadow-sm lg:col-span-2 flex flex-col h-[350px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Analysis Trends</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Monthly publication queries volume</p>
            </div>
            <span className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1 cursor-pointer">
              Full Analytics <ArrowUpRight size={14} />
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Activity Timeline (Takes 1 column) */}
        <div className="glass-panel rounded-xl p-6 shadow-sm flex flex-col h-[350px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Recent Activity</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your latest platform interactions</p>
            </div>
            <Clock size={16} className="text-slate-400" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {recentActivity.map((activity) => {
              const Icon = activity.icon;
              const isClickable = !!activity.paper_id || activity.action === 'REVIEW COMPILED';
              return (
                <div 
                  key={activity.id} 
                  onClick={() => handleActivityClick(activity)}
                  className={`flex gap-3 text-sm p-2 rounded-lg transition-all ${
                    isClickable 
                      ? 'hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50' 
                      : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${activity.color} flex items-center justify-center shrink-0`}>
                    <Icon size={14} />
                  </div>
                  <div className="overflow-hidden flex-1">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate">{activity.action}</h4>
                    <p className="text-xs text-slate-550 dark:text-slate-400 truncate">{activity.detail}</p>
                    <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{activity.date}</span>
                  </div>
                  {isClickable && <ChevronRight size={14} className="text-slate-400 self-center" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
