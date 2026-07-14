import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { 
  Bookmark, 
  Trash2, 
  Download, 
  ExternalLink, 
  BookOpen, 
  Quote, 
  Sparkles,
  X,
  Copy,
  Check,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

export default function Bookmarks() {
  const queryClient = useQueryClient();
  const [selectedCitation, setSelectedCitation] = useState(null); // Paper metadata for citation modal
  const [copiedFormat, setCopiedFormat] = useState(null);
  
  // State for AI Summary drawer/modal
  const [summaryPaper, setSummaryPaper] = useState(null);
  const [summaryFormat, setSummaryFormat] = useState('detailed');
  const [generatedSummary, setGeneratedSummary] = useState(null);

  // Read URL search params to auto-open paper
  const [searchParams] = useSearchParams();
  const targetPaperId = searchParams.get('paperId');

  // 1. Fetch Bookmarks
  const { data: bookmarks, isLoading, isError, refetch } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const response = await api.get('/bookmarks');
      return response.data;
    }
  });

  // 2. Remove Bookmark Mutation
  const removeMutation = useMutation({
    mutationFn: async (bookmarkId) => {
      await api.delete(`/bookmarks/${bookmarkId}`);
    },
    onSuccess: () => {
      toast.success('Removed paper from your library.');
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to remove bookmark.');
    }
  });

  // 3. Download & Sync PDF Mutation (if not already downloaded)
  const downloadMutation = useMutation({
    mutationFn: async (paper) => {
      const response = await api.post('/papers/download', {
        title: paper.title,
        external_pdf_url: paper.external_pdf_url,
        source: paper.source
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('PDF downloaded and cached successfully!');
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to download and sync PDF.');
    }
  });

  // 4. Generate AI Summary Mutation
  const summaryMutation = useMutation({
    mutationFn: async ({ paperId, format }) => {
      // Find corresponding bookmarked paper to see if it requires section extraction
      const bookmark = bookmarks?.find(b => b.paper.id === paperId);
      if (bookmark && !bookmark.paper.extracted_sections) {
        toast.info(`Extracting sections from '${bookmark.paper.title}'...`);
        await api.post('/papers/extract', { paper_id: paperId });
        queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      }

      const response = await api.post('/ai/summarize', {
        paper_id: paperId,
        format: format
      });
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedSummary(data);
      toast.success('AI summary generated successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to generate summary.');
    }
  });

  useEffect(() => {
    if (targetPaperId && bookmarks && bookmarks.length > 0) {
      const match = bookmarks.find(b => b.paper.id === targetPaperId);
      if (match) {
        setSummaryPaper(match.paper);
        summaryMutation.mutate({ paperId: match.paper.id, format: 'detailed' });
        // Clear search parameters from URL cleanly
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [targetPaperId, bookmarks]);

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading your library collection...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-2">
          <Bookmark size={24} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Connection Error</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Could not retrieve saved books/papers.</p>
        <button 
          onClick={() => refetch()}
          className="mt-2 flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition"
        >
          <RefreshCw size={16} /> Reconnect
        </button>
      </div>
    );
  }

  // Citation format functions
  const getCitations = (p) => {
    const authorsFormatted = p.authors && p.authors.length > 0 
      ? p.authors.join(', ') 
      : 'Unknown Authors';
    const firstAuthorLastname = p.authors && p.authors.length > 0 
      ? p.authors[0].split(' ').pop() 
      : 'Author';
    
    const titleClean = p.title || 'Untitled Document';
    const yearClean = p.year || new Date().getFullYear();
    const journalClean = p.journal || 'Research Archive';
    const doiClean = p.doi || '';

    return {
      apa: `${authorsFormatted}. (${yearClean}). ${titleClean}. ${journalClean}.${doiClean ? ` doi:${doiClean}` : ''}`,
      mla: `${authorsFormatted}. "${titleClean}." ${journalClean}, ${yearClean}.${doiClean ? ` doi:${doiClean}` : ''}`,
      chicago: `${authorsFormatted}. "${titleClean}." ${journalClean} (${yearClean}).${doiClean ? ` doi:${doiClean}` : ''}`,
      bibtex: `@article{${firstAuthorLastname.toLowerCase()}${yearClean},\n  author = {${p.authors?.join(' and ') || 'Unknown'}},\n  title = {${titleClean}},\n  journal = {${journalClean}},\n  year = {${yearClean}},\n  ${doiClean ? `doi = {${doiClean}}` : ''}\n}`
    };
  };

  const copyToClipboard = (text, format) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
    toast.success('Citation copied to clipboard!');
  };

  const handleOpenSummary = (paper) => {
    setSummaryPaper(paper);
    setGeneratedSummary(null);
    // If PDF already synced, generate summary right away
    if (paper.pdf_url) {
      summaryMutation.mutate({ paperId: paper.id, format: summaryFormat });
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Bookmark className="text-brand-500" size={28} /> Saved Publications Library
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Organize synced articles, synthesize citations, and invoke Gemini AI text summaries.
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-4">
            <BookOpen size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Your Library is Empty</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
            You haven't saved any research papers yet. Head over to the explorer to query papers.
          </p>
          <a
            href="/search"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
          >
            Explore Publications
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {bookmarks.map((bookmark) => {
            const p = bookmark.paper;
            return (
              <div 
                key={bookmark.id} 
                className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-xl p-6 shadow-sm flex flex-col lg:flex-row justify-between gap-6 hover:border-brand-500/20 transition duration-300"
              >
                {/* Left block: Metadata */}
                <div className="space-y-3.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold uppercase">
                      {p.source}
                    </span>
                    {p.year && (
                      <span className="text-slate-400 font-medium">
                        Year: {p.year}
                      </span>
                    )}
                    {p.journal && p.journal !== 'Unknown' && (
                      <span className="text-slate-400 font-medium truncate max-w-[200px]">
                        • {p.journal}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-white leading-snug tracking-tight">
                    {p.title}
                  </h3>

                  <p className="text-xs font-semibold text-slate-650 dark:text-slate-350 truncate">
                    {p.authors?.join(', ') || 'Unknown Authors'}
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {p.abstract || 'No abstract preview available.'}
                  </p>

                  {bookmark.notes && (
                    <div className="text-xs p-3 bg-amber-500/5 border-l-2 border-amber-500 text-slate-600 dark:text-slate-400 rounded-r">
                      <strong className="text-amber-600 dark:text-amber-500 block mb-0.5">My Notes:</strong>
                      {bookmark.notes}
                    </div>
                  )}
                </div>

                {/* Right block: Action Controllers */}
                <div className="flex flex-row lg:flex-col justify-start lg:justify-center items-center gap-2.5 lg:border-l lg:border-slate-200/50 lg:dark:border-slate-800/50 lg:pl-6 shrink-0 flex-wrap">
                  {p.pdf_url ? (
                    <button
                      onClick={() => handleOpenSummary(p)}
                      className="flex items-center justify-center gap-2 w-full sm:w-auto lg:w-40 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                    >
                      <Sparkles size={14} /> AI Summary
                    </button>
                  ) : (
                    <button
                      disabled={downloadMutation.isPending}
                      onClick={() => downloadMutation.mutate(p)}
                      className="flex items-center justify-center gap-2 w-full sm:w-auto lg:w-40 px-3.5 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-500 hover:border-brand-500/40 rounded-lg text-xs font-bold transition"
                    >
                      <Download size={14} /> Download PDF
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedCitation(p)}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto lg:w-40 px-3.5 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-brand-500 hover:border-brand-500/40 rounded-lg text-xs font-bold transition"
                  >
                    <Quote size={14} /> Cite Paper
                  </button>

                  {p.external_pdf_url && (
                    <a
                      href={p.external_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full sm:w-auto lg:w-40 px-3.5 py-2 bg-slate-105 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg text-xs font-bold transition"
                    >
                      <ExternalLink size={14} /> External Link
                    </a>
                  )}

                  <button
                    onClick={() => removeMutation.mutate(bookmark.id)}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto lg:w-40 px-3.5 py-2 bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white rounded-lg text-xs font-bold transition border border-transparent"
                  >
                    <Trash2 size={14} /> Remove Saved
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CITATION MODAL */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden p-6 animate-scale-in">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200/50 dark:border-slate-800/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Quote size={18} className="text-brand-500" />
                Generate Paper Citations
              </h3>
              <button 
                onClick={() => setSelectedCitation(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              {Object.entries(getCitations(selectedCitation)).map(([format, text]) => (
                <div key={format} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {format} Format
                    </span>
                    <button
                      onClick={() => copyToClipboard(text, format)}
                      className="text-slate-400 hover:text-brand-500 dark:hover:text-brand-400 text-xs font-semibold flex items-center gap-1"
                    >
                      {copiedFormat === format ? (
                        <>
                          <Check size={13} className="text-emerald-500" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Copy Citation
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/65 dark:border-slate-800/80 rounded-lg text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">
                    {text}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI SUMMARY DRAWER / MODAL */}
      {summaryPaper && createPortal(
        <div className="fixed inset-0 z-[9999] bg-white dark:bg-slate-950 flex flex-col p-6 md:p-8 animate-fade-in overflow-hidden">
          <div className="flex justify-between items-center pb-4 border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
              <div className="flex items-center gap-2.5">
              <Sparkles size={20} className="text-brand-500 animate-pulse" />
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white truncate max-w-[450px]">
                  AI Gemini Summary
                </h3>
                <p className="text-[10px] text-slate-400 truncate max-w-[450px]">
                  {summaryPaper.title}
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                setSummaryPaper(null);
                setGeneratedSummary(null);
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form controls inside drawer */}
          <div className="my-4 flex items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200/50 dark:border-slate-800/50 shrink-0">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Format:
            </span>
            <div className="flex gap-2">
              {['short', 'detailed', 'bullets', 'key_findings'].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setSummaryFormat(f);
                    summaryMutation.mutate({ paperId: summaryPaper.id, format: f });
                  }}
                  className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded transition-colors ${
                    summaryFormat === f
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Result Block */}
          <div className="flex-1 overflow-y-auto space-y-6 mt-4 pr-1">
            {summaryMutation.isPending ? (
              <div className="h-full flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-slate-550 dark:text-slate-400 font-medium">
                  Gemini API is parsing extracted NLP text and synthesizing the review summary...
                </p>
              </div>
            ) : generatedSummary ? (
              <div className="space-y-6 text-sm leading-relaxed text-slate-800 dark:text-slate-250 font-sans">
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                    {summaryFormat.replace('_', ' ')} Summary
                  </h4>
                  {summaryFormat === 'short' ? (
                    <p className="bg-slate-55/60 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200/35 dark:border-slate-800/30 italic">
                      {generatedSummary.summary}
                    </p>
                  ) : summaryFormat === 'bullets' ? (
                    <ul className="list-disc pl-5 space-y-2 text-xs">
                      {generatedSummary.summary.split('\n').map((line, i) => {
                        const cleanLine = line.replace(/^[-*•\d.\s]+/, '').trim();
                        if (!cleanLine) return null;
                        return <li key={i}>{cleanLine}</li>;
                      })}
                    </ul>
                  ) : (
                    <div className="prose dark:prose-invert text-xs leading-relaxed space-y-4">
                      {generatedSummary.summary.split('\n\n').map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Summary loading failed or not triggered.
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
