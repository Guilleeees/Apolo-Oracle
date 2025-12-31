
import React from 'react';
import { Icon } from '../Icon';

export const AudioDemo: React.FC = () => {
  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-2xl p-8 text-center space-y-6">
      <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-indigo-500/10">
        <Icon name="mic" className="w-10 h-10 text-indigo-400 animate-pulse" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-white">Gemini Live API</h3>
        <p className="text-slate-400 max-w-md mx-auto">
          Low-latency, real-time voice interactions. Gemini can process continuous audio streams and respond with natural human-like speech.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        {[
          { title: "Voice Options", desc: "Select from unique personalities: Zephyr, Puck, Kore, and more." },
          { title: "Full Duplex", desc: "Interrupt, ask follow-ups, and chat as you would with a human." },
          { title: "Multimodal Input", desc: "Feed video frames alongside audio for visual context." },
          { title: "PCM Streaming", desc: "High-fidelity raw audio for seamless, zero-buffer playback." }
        ].map((feat, i) => (
          <div key={i} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <h4 className="text-indigo-400 font-bold text-sm mb-1">{feat.title}</h4>
            <p className="text-slate-400 text-xs leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>

      <button className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl opacity-50 cursor-not-allowed">
        Live Voice Demo (Microphone Required)
      </button>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Requires Gemini 2.5 Flash Native Audio Model</p>
    </div>
  );
};
