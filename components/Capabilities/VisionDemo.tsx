
import React, { useState } from 'react';
import { geminiService } from '../../services/geminiService';
import { Icon } from '../Icon';

export const VisionDemo: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    
    setLoading(true);
    setError(null);
    try {
      const url = await geminiService.generateImage(prompt);
      setImageUrl(url);
    } catch (err) {
      setError("Failed to generate image. Try a different prompt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon name="image" className="text-cyan-400" />
          <span className="font-semibold">Visual Imagination (Gemini 2.5 Flash Image)</span>
        </div>
      </div>

      <div className="aspect-square w-full bg-slate-900/50 flex items-center justify-center relative overflow-hidden group">
        {imageUrl ? (
          <img src={imageUrl} alt="Generated" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="text-slate-600 flex flex-col items-center p-12 text-center">
            {loading ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-cyan-400 animate-pulse font-medium">Manifesting your pixels...</p>
              </div>
            ) : (
              <>
                <Icon name="image" className="w-16 h-16 mb-4 opacity-10" />
                <p>Describe a scene to bring it to life instantly.</p>
              </>
            )}
          </div>
        )}
        
        {error && (
          <div className="absolute inset-x-0 bottom-0 p-4 bg-red-500/80 text-white text-xs text-center backdrop-blur-sm">
            {error}
          </div>
        )}
      </div>

      <div className="p-6 space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A cyberpunk street in Neo-Tokyo with floating holograms of golden koi fish, 8k, highly detailed..."
          className="w-full h-24 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all resize-none placeholder-slate-600 text-sm"
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2"
        >
          {loading ? "Generating..." : "Generate Magic"}
          <Icon name="zap" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
