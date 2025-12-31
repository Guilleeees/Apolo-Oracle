
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { Icon } from './Icon';
import { translations } from '../translations';
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

const TIPS = [
  "¿Qué tarea eliminarías hoy para ser libre?",
  "Un minuto de orden ahorra diez de caos.",
  "El descanso es parte del alto rendimiento.",
  "Haz lo más difícil primero, el resto fluirá.",
  "La simplicidad es la clave del éxito."
];

// Updated props type to match usage in App.tsx
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
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  
  const chatRef = useRef<HTMLDivElement>(null);

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
      const err: ChatMessage = { role: 'a', text: "El Oráculo está en silencio. Intenta más tarde.", id: 'err' };
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

  const exportText = () => {
    if (!activeConv) return;
    const txt = activeConv.messages.map(m => `${m.role === 'u' ? 'Tú' : 'Apolo'}: ${m.text}`).join('\n\n');
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Consulta_Apolo.txt';
    a.click();
  };

  return (
    <div className="h-full flex flex-col bg-[#050505] text-white relative">
      {/* Header Simple */}
      <header className="flex items-center justify-between p-5 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md sticky top-0 z-30">
        <button onClick={() => setShowHistory(true)} className="p-2 opacity-50 hover:opacity-100">
          <Icon name="message" className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black tracking-[0.3em] text-[#C5A059] uppercase">Apolo</span>
          <span className="text-[8px] opacity-20 uppercase">{activeConv ? activeConv.title : 'Oráculo'}</span>
        </div>
        <button onClick={startNew} className="p-2 text-[#C5A059]">
          <Icon name="plus" className="w-5 h-5" />
        </button>
      </header>

      {/* Tip Diario */}
      {!activeConv?.messages.length && (
        <div className="px-10 py-8 text-center animate-in fade-in duration-1000">
          <p className="text-xs font-serif italic text-[#C5A059]/40 leading-relaxed">"{tip}"</p>
        </div>
      )}

      {/* Chat Feed */}
      <div ref={chatRef} className="flex-1 overflow-y-auto px-6 space-y-8 pb-32 pt-4">
        {activeConv?.messages.map(m => (
          <div key={m.id} className={`flex flex-col ${m.role === 'u' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`max-w-[90%] p-5 rounded-3xl ${m.role === 'u' ? 'bg-[#C5A059] text-white rounded-tr-none' : 'bg-[#111] border border-white/5 font-serif italic rounded-tl-none'}`}>
              <p className="text-sm md:text-base leading-relaxed">{m.text}</p>
            </div>
          </div>
        ))}
        {loading && <div className="p-5 opacity-20 animate-pulse text-xs">Apolo está pensando...</div>}
      </div>

      {/* Input Fijo Abajo */}
      <div className="p-4 bg-gradient-to-t from-black via-black to-transparent pt-10 sticky bottom-0">
        <div className="max-w-xl mx-auto flex items-center bg-[#111] rounded-full p-2 border border-white/10 shadow-2xl">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Haz tu consulta..." 
            className="flex-1 bg-transparent border-0 px-4 py-2 text-sm outline-none placeholder:opacity-20"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-10 h-10 bg-[#C5A059] rounded-full flex items-center justify-center text-white disabled:opacity-20"
          >
            <Icon name="harp" className="w-5 h-5" />
          </button>
        </div>
        {activeId && (
          <div className="flex justify-center gap-6 mt-4 opacity-30">
            <button onClick={exportText} className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
              <Icon name="download" className="w-3 h-3" /> Guardar
            </button>
            <button onClick={clearCurrent} className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
              <Icon name="trash" className="w-3 h-3" /> Borrar
            </button>
          </div>
        )}
      </div>

      {/* Modal Historial Simple */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl p-8 animate-in fade-in">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs font-black uppercase tracking-widest opacity-50">Consultas Pasadas</h3>
            <button onClick={() => setShowHistory(false)} className="text-2xl">&times;</button>
          </div>
          <div className="space-y-4">
            {conversations.map(c => (
              <div key={c.id} className="flex items-center gap-4">
                <button 
                  onClick={() => { setActiveId(c.id); setShowHistory(false); }}
                  className={`flex-1 text-left p-5 rounded-2xl border ${activeId === c.id ? 'border-[#C5A059] bg-[#C5A059]/10' : 'border-white/5 bg-white/5'}`}
                >
                  <p className="text-xs font-bold truncate">{c.title}</p>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setConversations(conversations.filter(x => x.id !== c.id)); if(activeId === c.id) setActiveId(null); }} className="text-red-500/50 p-2">
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              </div>
            ))}
            {conversations.length === 0 && <p className="text-center opacity-20 py-20 italic">No hay memorias.</p>}
          </div>
        </div>
      )}
    </div>
  );
};
