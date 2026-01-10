
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { Icon } from './Icon';
import { Task } from '../types';

interface ChatMessage {
  role: 'u' | 'a';
  text: string;
  id: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

const DIVINE_WISDOM = [
  "¿Qué tarea eliminarías hoy para alcanzar la verdadera libertad?",
  "Un minuto de orden en el Santuario ahorra diez de caos en el mundo.",
  "El descanso sagrado es el combustible del alto rendimiento.",
  "Enfréntate al Titán más grande primero; el resto de la senda fluirá.",
  "La simplicidad es la forma más elevada de sofisticación divina.",
  "¿Tu agenda de hoy refleja tus valores eternos?",
  "La disciplina es el puente entre las metas y los logros.",
  "Enfócate en lo esencial, ignora el ruido de los mortales.",
  "Cada acción es un voto por la persona en la que te conviertes.",
  "El Oráculo sugiere: Respira hondo antes de tu próxima gran misión."
];

export const AICopilot: React.FC<{ 
  language: string;
  tasks: Task[];
  onSuggest: () => void;
  onUpdateTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}> = ({ language, tasks, onSuggest, onUpdateTasks }) => {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('apolo_v3');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id || null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [wisdomIndex, setWisdomIndex] = useState(0);
  
  const chatRef = useRef<HTMLDivElement>(null);

  // Rotate wisdom every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setWisdomIndex((prev) => (prev + 1) % DIVINE_WISDOM.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('apolo_v3', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [activeId, conversations, loading]);

  const activeConv = conversations.find(c => c.id === activeId);

  const startNew = () => {
    const id = Math.random().toString(36).substr(2, 9);
    const newC: Conversation = { id, title: 'Nueva Consulta', messages: [], createdAt: Date.now() };
    setConversations([newC, ...conversations]);
    setActiveId(id);
    setShowHistory(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    let currentId = activeId;
    if (!currentId) {
      const id = Math.random().toString(36).substr(2, 9);
      const newC: Conversation = { id, title: input.slice(0, 20), messages: [], createdAt: Date.now() };
      setConversations([newC, ...conversations]);
      currentId = id;
      setActiveId(id);
    }

    const userMsg: ChatMessage = { role: 'u', text: input, id: Date.now().toString() };
    setConversations(prev => prev.map(c => c.id === currentId ? { ...c, messages: [...c.messages, userMsg] } : c));
    setInput('');
    setLoading(true);

    try {
      const res = await geminiService.quickChat(input);
      const aiMsg: ChatMessage = { role: 'a', text: res, id: (Date.now() + 1).toString() };
      setConversations(prev => prev.map(c => c.id === currentId ? { ...c, messages: [...c.messages, aiMsg], title: c.messages.length === 0 ? userMsg.text.slice(0, 25) : c.title } : c));
    } catch {
      const err: ChatMessage = { role: 'a', text: "El Oráculo ha entrado en un profundo silencio meditativo. Intenta invocarlo en unos instantes.", id: 'err' };
      setConversations(prev => prev.map(c => c.id === currentId ? { ...c, messages: [...c.messages, err] } : c));
    } finally {
      setLoading(false);
    }
  };

  const clearCurrent = () => {
    if (activeId) {
      setConversations(conversations.filter(c => c.id !== activeId));
      setActiveId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#050505] text-white relative font-['Inter']">
      {/* Refined Minimalist Header */}
      <header className="h-20 border-b border-white/5 bg-[#0a0a0a]/40 backdrop-blur-3xl flex items-center justify-between px-8 z-30 shrink-0">
        <button onClick={() => setShowHistory(true)} className="p-3 text-white/20 hover:text-accent transition-colors">
          <Icon name="message" className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-accent">Apollo Oracle</h2>
          <p className="text-[7px] font-black opacity-20 uppercase tracking-[0.2em] mt-1">Santuario AI</p>
        </div>
        <button onClick={startNew} className="p-3 text-accent hover:scale-110 transition-transform">
          <Icon name="plus" className="w-5 h-5" />
        </button>
      </header>

      {/* Main Chat Sanctum */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        <div ref={chatRef} className="flex-1 overflow-y-auto px-8 py-10 space-y-12 scroll-smooth custom-scrollbar">
          {!activeConv || activeConv.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-12 text-center max-w-lg mx-auto animate-fade-up">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <div className="w-32 h-32 bg-accent/10 rounded-[3rem] border border-accent/20 flex items-center justify-center text-accent relative">
                  <Icon name="harp" className="w-14 h-14" />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black uppercase tracking-widest text-white/90">Bienvenido al Santuario</h3>
                <div className="h-12 flex items-center justify-center">
                  <p key={wisdomIndex} className="text-xs font-serif italic text-accent/60 animate-in fade-in slide-in-from-bottom-2 duration-1000">
                    "{DIVINE_WISDOM[wisdomIndex]}"
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full pt-8">
                {["¿Cómo optimizo mi día?", "¿Qué tareas son urgentes?", "Escribe un plan de enfoque", "Ayúdame a priorizar"].map((suggestion, i) => (
                  <button 
                    key={i} 
                    onClick={() => { setInput(suggestion); }}
                    className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:border-accent/30 hover:bg-accent/5 transition-all text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-10 pb-32">
              {activeConv.messages.map(m => (
                <div key={m.id} className={`flex flex-col ${m.role === 'u' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                  <div className={`max-w-[85%] p-7 rounded-[2.5rem] ${
                    m.role === 'u' 
                      ? 'bg-accent text-white rounded-tr-none shadow-2xl shadow-accent/10 font-bold' 
                      : 'bg-white/[0.02] border border-white/10 font-serif italic rounded-tl-none leading-relaxed text-white/80'
                  }`}>
                    <p className="text-sm md:text-base whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex flex-col items-start space-y-4 animate-in fade-in duration-500">
                  <div className="p-7 bg-white/[0.01] border border-white/5 rounded-[2.5rem] rounded-tl-none">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                      <div className="w-2 h-2 bg-accent/40 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Improved Command Bar */}
        <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none">
          <div className="max-w-3xl mx-auto flex items-center bg-[#111]/80 backdrop-blur-2xl rounded-[2rem] p-3 border border-white/10 shadow-3xl pointer-events-auto">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Inicia un diálogo sagrado..." 
              className="flex-1 bg-transparent border-0 px-6 py-3 text-sm font-medium outline-none placeholder:opacity-20 text-white"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="w-14 h-14 bg-accent text-white rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-20 border border-white/10"
            >
              <Icon name="harp" className="w-6 h-6" />
            </button>
          </div>
          {activeConv && activeConv.messages.length > 0 && (
            <div className="flex justify-center gap-8 mt-6 pointer-events-auto">
              <button onClick={clearCurrent} className="text-[9px] font-black uppercase tracking-[0.4em] opacity-20 hover:opacity-100 hover:text-red-500 transition-all flex items-center gap-2">
                <Icon name="trash" className="w-3 h-3" /> Purgar Memorias
              </button>
              <div className="w-px h-3 bg-white/5" />
              <button onClick={() => setShowHistory(true)} className="text-[9px] font-black uppercase tracking-[0.4em] opacity-20 hover:opacity-100 transition-all flex items-center gap-2">
                <Icon name="message" className="w-3 h-3" /> Archivos
              </button>
            </div>
          )}
        </div>
      </div>

      {/* History Modal Redesigned */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl p-12 animate-in fade-in duration-300">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-16">
              <div className="flex flex-col">
                <h3 className="text-3xl font-black uppercase tracking-tighter text-accent">Anales de Consulta</h3>
                <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.5em] mt-2">Crónicas de tus diálogos con Apolo</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-3xl opacity-40 hover:opacity-100 transition-opacity">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-4 space-y-6 custom-scrollbar">
              {conversations.map(c => (
                <div key={c.id} className="flex items-center gap-6 group">
                  <button 
                    onClick={() => { setActiveId(c.id); setShowHistory(false); }}
                    className={`flex-1 text-left p-8 rounded-[2rem] border transition-all duration-300 ${
                      activeId === c.id 
                        ? 'border-accent bg-accent/5 shadow-2xl scale-[1.02]' 
                        : 'border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-base font-bold truncate max-w-[80%]">{c.title}</p>
                      <span className="text-[8px] font-black opacity-20 uppercase tracking-widest">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[10px] opacity-30 uppercase tracking-widest">{c.messages.length} Fragmentos de memoria</p>
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setConversations(conversations.filter(x => x.id !== c.id)); 
                      if(activeId === c.id) setActiveId(null); 
                    }} 
                    className="p-5 rounded-2xl bg-red-500/5 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all shadow-lg"
                  >
                    <Icon name="trash" className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-10 py-32 space-y-8">
                  <Icon name="message" className="w-20 h-20" />
                  <p className="italic text-xl">El Oráculo aún no tiene recuerdos que mostrar.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
