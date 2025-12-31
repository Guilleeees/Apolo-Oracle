
import React, { useState } from 'react';
import { geminiService } from '../../services/geminiService';
import { Icon } from '../Icon';

export const SearchDemo: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ text: string; sources: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    try {
      const data = await geminiService.searchGrounding(query);
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center gap-3">
        <Icon name="search" className="text-emerald-400" />
        <span className="font-semibold">Live Knowledge & Grounding</span>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What's happening in the news today? Who won the latest AI awards?"
            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder-slate-600"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-white font-semibold transition-all shadow-lg shadow-emerald-900/20"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-6 text-slate-200 leading-relaxed text-sm">
              <div className="flex items-center gap-2 text-emerald-400 mb-3 font-medium uppercase tracking-wider text-[10px]">
                <Icon name="shield" className="w-3 h-3" />
                Verified Answer
              </div>
              <p className="whitespace-pre-wrap">{result.text}</p>
            </div>

            {result.sources.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Sources</h4>
                <div className="flex flex-wrap gap-2">
                  {result.sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.web?.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-indigo-400 transition-colors flex items-center gap-2 group"
                    >
                      <Icon name="globe" className="w-3 h-3" />
                      <span className="truncate max-w-[180px]">{source.web?.title || 'External Source'}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!result && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-50">
            {[
              "Recent major space discoveries in 2024",
              "Latest stock market trends for NVIDIA",
              "Who won the 2024 Formula 1 race yesterday?",
              "Weather forecast for the upcoming week in Tokyo"
            ].map((q, i) => (
              <button 
                key={i} 
                onClick={() => setQuery(q)}
                className="text-left p-3 rounded-lg border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/30 text-xs text-slate-400 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
