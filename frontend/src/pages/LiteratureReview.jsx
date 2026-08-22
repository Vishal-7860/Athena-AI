import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import { 
  Sparkles, 
  Layers, 
  Table, 
  AlertTriangle,
  ArrowRightLeft,
  ChevronRight,
  TrendingUp,
  Bookmark,
  Activity,
  CreditCard,
  Download,
  FileText
} from 'lucide-react';

export default function LiteratureReview() {
  const queryClient = useQueryClient();
  const { updateCredits } = useAuth();
  const [selectedPapers, setSelectedPapers] = useState([]);
  const [reviewTitle, setReviewTitle] = useState('Comparative Literature Synthesis');
  const [activeTab, setActiveTab] = useState('synthesis'); // 'synthesis' | 'table' | 'similarity'
  const [comparisonResults, setComparisonResults] = useState(null);

  // 1. Fetch user bookmarks to select papers from
  const { data: bookmarks, isLoading: loadingBookmarks } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const response = await api.get('/bookmarks');
      return response.data;
    }
  });

  // 2. Generate Literature Review Mutation
  const reviewMutation = useMutation({
    mutationFn: async (paperIds) => {
      const response = await api.post('/ai/review', {
        paper_ids: paperIds,
        title: reviewTitle
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Literature review compiled successfully!');
      if (data.credits !== undefined) {
        updateCredits(data.credits);
      }
      // Trigger similarity comparison in parallel
      similarityMutation.mutate(selectedPapers);
    },
    onError: (err) => {
      if (err.response?.status === 402) {
        toast.error(err.response?.data?.message || 'Insufficient AI credits (Requires 3 Credits). Claim daily bonus in profile!');
      } else {
        toast.error(err.response?.data?.message || 'Failed to compile review.');
      }
    }
  });

  // 3. Similarity Mutation
  const similarityMutation = useMutation({
    mutationFn: async (paperIds) => {
      const response = await api.post('/similarity/compare', {
        paper_ids: paperIds
      });
      return response.data;
    },
    onSuccess: (data) => {
      setComparisonResults(data);
    }
  });

  const togglePaperSelection = (paperId) => {
    setSelectedPapers((prev) => {
      if (prev.includes(paperId)) {
        return prev.filter((id) => id !== paperId);
      } else {
        return [...prev, paperId];
      }
    });
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    if (selectedPapers.length < 2) {
      toast.warning('Please select at least 2 papers for comparison.');
      return;
    }
    
    reviewMutation.mutate(selectedPapers);
  };

  const handleExport = async (type = 'pdf') => {
    if (!reviewData?.review_id) {
      toast.error('No compiled review record available for export.');
      return;
    }
    try {
      toast.info(`Preparing ${type.toUpperCase()} download...`);
      const response = await api.get(`/papers/export?review_id=${reviewData.review_id}&type=${type}`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { 
        type: type === 'docx' 
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
          : 'application/pdf' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${(reviewTitle || 'Literature_Review').replace(/\s+/g, '_')}.${type}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} report exported successfully!`);
    } catch (err) {
      toast.error(`Failed to export ${type.toUpperCase()} report.`);
    }
  };

  // Helper mutation to run section parsing if they haven't been processed yet
  const runExtraction = async (paperId) => {
    try {
      const res = await api.post('/papers/extract', { paper_id: paperId });
      toast.success('Extraction complete! Please re-run literature review.');
      if (res.data?.credits !== undefined) {
        updateCredits(res.data.credits);
      }
      // Refetch bookmarks to get updated state
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    } catch (e) {
      if (e.response?.status === 402) {
        toast.error('Insufficient AI credits for PDF extraction (1 Credit needed).');
      } else {
        toast.error('Failed to parse paper sections automatically.');
      }
    }
  };

  const reviewData = reviewMutation.data;
  const isCompiling = reviewMutation.isPending || similarityMutation.isPending;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="text-brand-500" size={28} /> Literature Review & Synthesis
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Synthesize comparative reports, extract common methodologies, map similarities, and identify literature research gaps.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Selection of bookmarks */}
        <div className="glass-panel rounded-2xl p-6 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Bookmark size={18} className="text-brand-500" /> Select Papers ({selectedPapers.length})
          </h3>
          
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Review Title
              </label>
              <input
                id="review-title-input"
                type="text"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="e.g. Deep Learning Transformer Evolution"
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm shadow-sm"
              />
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {loadingBookmarks && (
                <div className="text-center text-sm py-4 text-slate-500">Loading library bookmarks...</div>
              )}
              {bookmarks && bookmarks.length === 0 && (
                <div className="text-center text-xs py-6 text-slate-400">
                  No bookmarked papers found. Please search and bookmark papers first.
                </div>
              )}
              {bookmarks && bookmarks.map((b) => (
                <label 
                  key={b.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPapers.includes(b.paper.id)
                      ? 'border-brand-500 bg-brand-500/5 dark:bg-brand-500/10'
                      : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPapers.includes(b.paper.id)}
                    onChange={() => togglePaperSelection(b.paper.id)}
                    className="mt-1 rounded text-brand-600 focus:ring-brand-500 shrink-0"
                  />
                  <div className="overflow-hidden">
                    <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {b.paper.title}
                    </h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {b.paper.authors.join(', ')} ({b.paper.year})
                    </p>
                    {!b.paper.extracted_sections && (
                      <span className="inline-block mt-1 text-[8px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 px-1 rounded">
                        Requires Extraction
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <button
              id="generate-review-submit"
              type="submit"
              disabled={selectedPapers.length < 2 || isCompiling}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-all shadow-md hover:shadow-brand-900/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isCompiling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Synthesizing Report...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Generate Literature Review
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right column: Results displays */}
        <div className="lg:col-span-2 space-y-6">
          {!reviewData ? (
            <div className="glass-panel rounded-2xl p-12 text-center border-dashed border-2 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center mb-4">
                <Sparkles size={32} className="animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Literature review compiled here</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                Select 2 or more publications from your bookmarks sidebar, configure the report parameters, and click compile to synthesize comparative analytics.
              </p>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
              {/* Tab Navigation & Export Actions */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-900/50 gap-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab('synthesis')}
                    className={`py-4 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'synthesis'
                        ? 'border-brand-500 text-brand-500'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Synthesis Review
                  </button>
                  <button
                    onClick={() => setActiveTab('table')}
                    className={`py-4 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'table'
                        ? 'border-brand-500 text-brand-500'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Comparison Table
                  </button>
                  <button
                    onClick={() => setActiveTab('similarity')}
                    className={`py-4 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'similarity'
                        ? 'border-brand-500 text-brand-500'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Semantic Similarity
                  </button>
                </div>

                <div className="flex items-center gap-2 py-2">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Download size={13} /> Export PDF Report
                  </button>
                  <button
                    onClick={() => handleExport('docx')}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText size={13} /> Export DOCX
                  </button>
                </div>
              </div>

              {/* Tab Contents */}
              <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6">
                
                {/* 1. Synthesis tab */}
                {activeTab === 'synthesis' && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-lg font-bold text-slate-800 dark:text-white">Comparative Synthesis</h4>
                      <p className="text-sm leading-relaxed text-slate-650 dark:text-slate-300 whitespace-pre-line">
                        {reviewData.review_text}
                      </p>
                    </div>

                    <div className="p-4 bg-brand-500/5 dark:bg-brand-500/10 rounded-xl border border-brand-500/20 space-y-2">
                      <h5 className="text-sm font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                        <TrendingUp size={16} /> Identified Research Gaps
                      </h5>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        {reviewData.research_gap}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                        <h5 className="text-sm font-bold text-slate-800 dark:text-white">Novelty Directives</h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{reviewData.novelty}</p>
                      </div>
                      <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                        <h5 className="text-sm font-bold text-slate-800 dark:text-white">Future Directions</h5>
                        <ul className="text-xs text-slate-550 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                          {reviewData.future_scope && reviewData.future_scope.map((scope, sidx) => (
                            <li key={sidx}>{scope}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Comparison Table Tab */}
                {activeTab === 'table' && (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-4 font-bold text-slate-600 dark:text-slate-400">Paper Title</th>
                          <th className="p-4 font-bold text-slate-600 dark:text-slate-400">Methodology</th>
                          <th className="p-4 font-bold text-slate-600 dark:text-slate-400">Benchmarks</th>
                          <th className="p-4 font-bold text-slate-600 dark:text-slate-400">Strengths</th>
                          <th className="p-4 font-bold text-slate-600 dark:text-slate-400">Weaknesses</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {reviewData.comparison_table && reviewData.comparison_table.map((row, ridx) => (
                          <tr key={ridx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                            <td className="p-4 font-bold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">{row.paper_title}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-350">{row.method}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-350">{row.dataset}</td>
                            <td className="p-4 text-emerald-600 dark:text-emerald-450">{row.strengths}</td>
                            <td className="p-4 text-red-500 dark:text-red-400">{row.weaknesses}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 3. Semantic Similarity Tab */}
                {activeTab === 'similarity' && comparisonResults && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white">Cosine Embeddings Map</h4>
                    
                    <div className="space-y-4">
                      {comparisonResults.results && comparisonResults.results.map((res, cidx) => (
                        <div key={cidx} className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row gap-4 items-center justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              <span className="text-slate-850 dark:text-slate-100 truncate max-w-[180px]">{res.paper_1.title}</span>
                              <span className="text-slate-400 shrink-0"><ArrowRightLeft size={14} /></span>
                              <span className="text-slate-855 dark:text-slate-100 truncate max-w-[180px]">{res.paper_2.title}</span>
                            </div>
                            
                            {res.common_keywords.length > 0 && (
                              <p className="text-xs text-slate-500 dark:text-slate-450">
                                Overlapping concepts: {res.common_keywords.slice(0, 5).join(', ')}
                              </p>
                            )}

                            {res.is_potential_duplicate && (
                              <div className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-md flex items-center gap-1.5 w-fit">
                                <AlertTriangle size={12} /> High Overlap (Candidate duplicate)
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 min-w-[100px]">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Similarity</span>
                            <span className="text-2xl font-black text-brand-500">{(res.similarity_score * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
