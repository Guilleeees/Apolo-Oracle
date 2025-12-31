
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../../services/geminiService';
import { Icon } from '../Icon';

export const TextDemo: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const formatText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await geminiService.generateText(userMsg, "You are an expert tutor. Break down complex topics into simple terms.");
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: "Error: Could not connect to the reasoning engine." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] w-full max-w-2xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center gap-3">
        <Icon name="message" className="text-indigo-400" />
        <span className="font-semibold">Reasoning Engine (Gemini 3 Flash)</span>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-8">
            <Icon name="zap" className="w-12 h-12 mb-4 opacity-20" />
            <p>Ask me to explain quantum physics, write a Python script, or compose a sonnet about semiconductors.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-slate-700/50 text-slate-100 rounded-tl-none border border-slate-600'
            }`}>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{formatText(m.content)}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-700/50 text-slate-300 rounded-2xl rounded-tl-none px-4 py-3 border border-slate-600 animate-pulse">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800/30">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-slate-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 transition-colors flex items-center justify-center"
          >
            <Icon name="zap" className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
