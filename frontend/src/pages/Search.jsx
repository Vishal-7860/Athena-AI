import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'react-toastify';
import { 
  Search as SearchIcon, 
  Filter, 
  Bookmark, 
  Download, 
  ExternalLink,
  BookOpen,
  Sparkles,
  BookMarked
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Search() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [provider, setProvider] = useState('all');
  const [limit, setLimit] = useState(10);
  const [bookmarkedPapers, setBookmarkedPapers] = useState(new Set());
  const [downloadingPaperId, setDownloadingPaperId] = useState(null);

  // Fetch search results using React Query
  const { data: results, isLoading, isError, error } = useQuery({
    queryKey: ['papers', 'search', submittedQuery, provider, limit],
    queryFn: async () => {
      if (!submittedQuery) return [];
      const response = await api.get('/papers/search', {
        params: { q: submittedQuery, provider, limit }
      });
      return response.data;
    },
    enabled: !!submittedQuery,
  });

  // Bookmark Mutation
  const bookmarkMutation = useMutation({
    mutationFn: async (paper) => {
      const response = await api.post('/bookmarks', { paper });
      return response.data;
    },
    onSuccess: (data, variables) => {
      toast.success('Paper added to bookmarks!');
      setBookmarkedPapers((prev) => {
        const next = new Set(prev);
        // Deduplicate using title similarity
        next.add(variables.title);
        return next;
      });
      // Invalidate queries to reload bookmarks elsewhere
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to bookmark paper.');
    }
  });

  // Download PDF Mutation
  const downloadMutation = useMutation({
    mutationFn: async (paper) => {
      setDownloadingPaperId(paper.title);
      const response = await api.post('/papers/download', {
        title: paper.title,
        external_pdf_url: paper.external_pdf_url,
        source: paper.source,
        paper_metadata: {
          authors: paper.authors,
          year: paper.year,
          journal: paper.journal,
          citation_count: paper.citation_count,
          abstract: paper.abstract
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('PDF successfully saved to library!');
      // Redirect to AI Summary interface for this paper
      navigate('/dashboard'); // Temporarily go to dashboard, or we can send to summary page in Phase 6
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to download and sync PDF.');
    },
    onSettled: () => {
      setDownloadingPaperId(null);
    }
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.warning('Please enter a search query');
      return;
    }
    setSubmittedQuery(query.trim());
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <SearchIcon className="text-brand-500" size={28} /> Global Research Explorer
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Query multiple scientific repositories simultaneously. Direct downloads and AI extractions are supported.
        </p>
      </div>

      {/* Search Console Card */}
      <div className="glass-panel rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <SearchIcon size={18} />
              </span>
              <input
                id="search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by keywords, author names, journal, or DOI..."
                className="pl-10 block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm transition-all shadow-sm"
              />
            </div>
            <button
              id="search-submit"
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-all shadow-md hover:shadow-brand-900/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <SearchIcon size={16} /> Explore
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-sm">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Filter size={16} /> Filters:
            </div>
            
            {/* Repository Select */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-300">Provider</span>
              <select
                id="search-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1 px-2.5 text-xs focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">All Sources (Merged)</option>
                <option value="arxiv">arXiv</option>
                <option value="semanticscholar">Semantic Scholar</option>
                <option value="openalex">OpenAlex</option>
                <option value="crossref">Crossref</option>
              </select>
            </div>

            {/* Results Select */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-300">Limit</span>
              <select
                id="search-limit"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1 px-2.5 text-xs focus:ring-2 focus:ring-brand-500"
              >
                <option value={5}>5 Papers</option>
                <option value={10}>10 Papers</option>
                <option value={20}>20 Papers</option>
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* Results State */}
      <div className="space-y-4">
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-panel rounded-xl p-6 shadow-sm space-y-4 animate-pulse">
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="flex justify-between w-1/4 h-8 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="glass-panel rounded-xl p-8 text-center text-red-500">
            Failed to fetch results: {error?.message || 'Unknown network error'}
          </div>
        )}

        {results && results.length === 0 && (
          <div className="glass-panel rounded-xl p-12 text-center text-slate-500 dark:text-slate-400">
            No papers matched your search query. Try widening filters or keywords.
          </div>
        )}

        {results && results.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Found {results.length} scientific publications
            </h3>
            
            <div className="space-y-4">
              {results.map((paper, idx) => (
                <div 
                  key={idx} 
                  className="glass-panel hover:border-brand-500/30 rounded-xl p-6 shadow-sm transition-all flex flex-col md:flex-row gap-6 justify-between group"
                >
                  <div className="space-y-3 flex-1">
                    {/* Source Badges */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        {paper.source}
                      </span>
                      {paper.year && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {paper.year}
                        </span>
                      )}
                      {paper.citation_count > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          Citations: {paper.citation_count}
                        </span>
                      )}
                    </div>

                    {/* Paper Title */}
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white leading-snug group-hover:text-brand-500 transition-colors">
                      {paper.title}
                    </h4>

                    {/* Authors */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {paper.authors.slice(0, 5).join(', ')} {paper.authors.length > 5 && 'et al.'}
                    </p>

                    {/* Abstract */}
                    {paper.abstract && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                        {paper.abstract}
                      </p>
                    )}

                    {/* Meta venue */}
                    <p className="text-[11px] italic text-slate-400 font-medium">
                      Published in: {paper.journal}
                    </p>
                  </div>

                  {/* Action Column */}
                  <div className="flex md:flex-col justify-end md:justify-start gap-2.5 min-w-[150px] shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-200/50 dark:border-slate-800/50">
                    {/* Read / Download button */}
                    {paper.external_pdf_url ? (
                      <button
                        onClick={() => downloadMutation.mutate(paper)}
                        disabled={downloadingPaperId !== null}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {downloadingPaperId === paper.title ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Syncing...
                          </>
                        ) : (
                          <>
                            <Download size={14} /> Save & Summarize
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="text-center text-xs text-slate-400 italic py-1 px-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        PDF Unavailable
                      </div>
                    )}

                    {/* Bookmark Button */}
                    <button
                      onClick={() => bookmarkMutation.mutate(paper)}
                      disabled={bookmarkedPapers.has(paper.title)}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        bookmarkedPapers.has(paper.title)
                          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500 disabled:opacity-100'
                          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {bookmarkedPapers.has(paper.title) ? (
                        <>
                          <BookMarked size={14} /> Saved
                        </>
                      ) : (
                        <>
                          <Bookmark size={14} /> Bookmark
                        </>
                      )}
                    </button>

                    {/* Link out alternate */}
                    {paper.html_url && (
                      <a
                        href={paper.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink size={14} /> Publisher Link
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
