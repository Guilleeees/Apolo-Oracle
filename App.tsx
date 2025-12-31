
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Icon } from './components/Icon';
import { Task, TaskStatus, TaskType, Category, SubTask, TaskHistoryEntry } from './types';
import { geminiService } from './services/geminiService';
import { AICopilot } from './components/AICopilot';
import { translations } from './translations';

const languageOptions = [
  { code: 'es', name: 'Español' },
  { code: 'ca', name: 'Català' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ja', name: '日本語' }
];

const fonts = [
  { name: 'font_modern', value: "'Inter', sans-serif" },
  { name: 'font_technical', value: "'JetBrains Mono', monospace" },
  { name: 'font_geometric', value: "'Space Grotesk', sans-serif" },
  { name: 'font_elegant', value: "'Playfair Display', serif" },
  { name: 'font_friendly', value: "'Lexend', sans-serif" }
];

type ViewMode = 'board' | 'calendar' | 'apolo' | 'settings';
type DesignTheme = 'oracle' | 'classic' | 'midnight' | 'nord' | 'light' | 'brutal' | 'glass' | 'soft' | 'cyber' | 'forest' | 'marble' | 'high-contrast';

const LoadingScreen: React.FC = () => (
  <div className="fixed inset-0 z-[1000] bg-[#050505] flex flex-col items-center justify-center animate-in fade-in duration-1000">
    <div className="relative flex flex-col items-center">
      <div className="absolute inset-0 bg-[#C5A059]/5 blur-[140px] rounded-full scale-150 animate-pulse"></div>
      <div className="relative z-10 opacity-0 animate-[luxury-reveal_2.2s_cubic-bezier(0.22,1,0.36,1)_forwards]">
        <Icon name="harp" className="w-24 h-24 text-[#C5A059] stroke-[0.5px] drop-shadow-[0_0_15px_rgba(197,160,89,0.3)]" />
      </div>
      <div className="mt-14 flex flex-col items-center gap-7 z-10">
        <h1 className="text-[11px] font-black tracking-[1em] text-[#C5A059] uppercase opacity-0 animate-[text-fade-up_1.2s_ease-out_0.8s_forwards] ml-[1em]">
          Apolo Oracle
        </h1>
        <div className="h-[0.5px] w-40 bg-[#C5A059]/10 relative overflow-hidden opacity-0 animate-[fade-in_1.5s_ease-out_1.2s_forwards]">
          <div className="absolute inset-y-0 left-0 bg-[#C5A059] w-full -translate-x-full animate-[luxury-shimmer_3s_infinite_cubic-bezier(0.65,0,0.35,1)]"></div>
        </div>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('ordo_tasks_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [lastUndoTask, setLastUndoTask] = useState<{ task: Task, prevStatus: TaskStatus } | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('ordo_categories');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'INSTI', color: '#3b82f6' },
      { id: '2', name: 'TRABAJO', color: '#10b981' },
      { id: '3', name: 'PERSONAL', color: '#C5A059' }
    ];
  });

  const [activeView, setActiveView] = useState<ViewMode>('board');
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingBirthday, setIsAddingBirthday] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const [newTask, setNewTask] = useState({ 
    title: '', 
    desc: '', 
    catId: '3', 
    date: todayStr,
    time: '',
    isAllDay: false
  });

  const [language, setLanguage] = useState(() => localStorage.getItem('ordo_lang') || 'es');
  const [currentTheme, setCurrentTheme] = useState<DesignTheme>(() => (localStorage.getItem('ordo_theme') as DesignTheme) || 'oracle');
  const [customFont, setCustomFont] = useState<string | null>(null);
  const [customAccent, setCustomAccent] = useState<string | null>(null);

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  const t = (key: string) => translations[language]?.[key] || translations['en']?.[key] || key;
  const isRTL = ['ar', 'he'].includes(language);

  const themeConfigs: Record<DesignTheme, any> = {
    oracle: { label: 'theme_oracle', bg: '#050505', surface: '#0c0c0c', text: '#f8fafc', muted: 'rgba(255,255,255,0.4)', accent: '#C5A059', radius: '1.25rem', border: '1px', font: "'Inter', sans-serif" },
    classic: { label: 'theme_classic', bg: '#0a0b0e', surface: '#14151a', text: '#f8fafc', muted: 'rgba(255,255,255,0.4)', accent: '#2563eb', radius: '1.5rem', border: '1px', font: "'Inter', sans-serif" },
    midnight: { label: 'theme_midnight', bg: '#000000', surface: '#0a0a0a', text: '#ffffff', muted: 'rgba(255,255,255,0.3)', accent: '#a855f7', radius: '0.75rem', border: '1px', font: "'Space Grotesk', sans-serif" },
    nord: { label: 'theme_nord', bg: '#2e3440', surface: '#3b4252', text: '#eceff4', muted: '#818996', accent: '#88c0d0', radius: '1rem', border: '0px', font: "'Inter', sans-serif" },
    light: { label: 'theme_light', bg: '#ffffff', surface: '#f8fafc', text: '#0f172a', muted: '#64748b', accent: '#2563eb', radius: '1.25rem', border: '1px', borderColor: '#cbd5e1', font: "'Inter', sans-serif" },
    brutal: { label: 'theme_brutal', bg: '#fff', surface: '#fff', text: '#000', muted: '#333', accent: '#fbbf24', radius: '0px', border: '3px', borderColor: '#000', font: "'Space Grotesk', sans-serif" },
    glass: { label: 'theme_glass', bg: '#020617', surface: 'rgba(255,255,255,0.05)', text: '#fff', muted: 'rgba(255,255,255,0.4)', accent: '#38bdf8', radius: '2.5rem', border: '1px', blur: '24px', font: "'Inter', sans-serif" },
    soft: { label: 'theme_soft', bg: '#fffcf9', surface: '#ffffff', text: '#4338ca', muted: '#a5b4fc', accent: '#f472b6', radius: '2.5rem', border: '0px', font: "'Lexend', sans-serif" },
    cyber: { label: 'theme_cyber', bg: '#050505', surface: '#0a0a0a', text: '#00ffcc', muted: '#004d40', accent: '#ff00ff', radius: '0.25rem', border: '1px', borderColor: '#ff00ff', font: "'JetBrains Mono', monospace" },
    forest: { label: 'theme_forest', bg: '#1a140f', surface: '#2a1f16', text: '#fef3c7', muted: '#92400e', accent: '#84cc16', radius: '0.75rem', border: '1px', borderColor: '#3d2b1d', font: "'Playfair Display', serif" },
    marble: { label: 'theme_marble', bg: '#d1d5db', surface: '#f3f4f6', text: '#111827', muted: '#4b5563', accent: '#4f46e5', radius: '0.5rem', border: '1px', borderColor: '#9ca3af', font: "'Playfair Display', serif" },
    'high-contrast': { label: 'theme_high_contrast', bg: '#000', surface: '#000', text: '#ffff00', muted: '#ffff00', accent: '#ffff00', radius: '0px', border: '5px', borderColor: '#ffff00', font: "'Inter', sans-serif" }
  };

  useEffect(() => {
    localStorage.setItem('ordo_tasks_v2', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('ordo_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('ordo_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('ordo_theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const c = themeConfigs[currentTheme];
    root.style.setProperty('--bg-color', c.bg);
    root.style.setProperty('--surface-color', c.surface);
    root.style.setProperty('--text-color', c.text);
    root.style.setProperty('--text-muted', c.muted);
    root.style.setProperty('--accent-color', customAccent || c.accent);
    root.style.setProperty('--border-radius', c.radius);
    root.style.setProperty('--border-width', c.border);
    root.style.setProperty('--surface-border', c.borderColor || (currentTheme === 'oracle' ? 'rgba(197, 160, 89, 0.25)' : 'rgba(255,255,255,0.1)'));
    root.style.setProperty('--glass-blur', c.blur || '0px');
    root.style.setProperty('--font-main', customFont || c.font);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [currentTheme, language, customFont, customAccent]);

  const toggleTask = (id: string, status?: TaskStatus) => {
    setTasks(prevTasks => prevTasks.map(taskItem => {
      if (taskItem.id === id) {
        const nextStatus = status || (taskItem.status === 'done' ? 'todo' : 'done');
        const historyEntry: TaskHistoryEntry = { date: Date.now(), action: `${t('statusChanged')} ${t(nextStatus)}` };
        
        if (nextStatus === 'done' && taskItem.status !== 'done') {
          setLastUndoTask({ task: { ...taskItem }, prevStatus: taskItem.status });
          setShowUndo(true);
          setTimeout(() => setShowUndo(false), 5000);
        }
        return { ...taskItem, status: nextStatus, history: [...taskItem.history, historyEntry] };
      }
      return taskItem;
    }));
  };

  const undoLastAction = () => {
    if (!lastUndoTask) return;
    setTasks(prevTasks => prevTasks.map(taskItem => 
      taskItem.id === lastUndoTask.task.id ? { ...taskItem, status: lastUndoTask.prevStatus } : taskItem
    ));
    setShowUndo(false);
    setLastUndoTask(null);
  };

  const generateSubtasks = async (task: Task) => {
    setIsAiGenerating(true);
    try {
      const suggestion = await geminiService.analyzeTask(task.title, task.description);
      const newSubtasks: SubTask[] = suggestion.subtasks.map(s => ({
        id: Math.random().toString(36).substr(2, 9),
        title: s,
        completed: false
      }));
      
      const historyEntry: TaskHistoryEntry = { date: Date.now(), action: t('generateSubtasks') };
      
      setTasks(prev => prev.map(taskItem => taskItem.id === task.id ? { 
        ...taskItem, 
        subtasks: [...taskItem.subtasks, ...newSubtasks],
        history: [...taskItem.history, historyEntry]
      } : taskItem));
      
      if (selectedTask?.id === task.id) {
        setSelectedTask(prev => prev ? { ...prev, subtasks: [...prev.subtasks, ...newSubtasks], history: [...prev.history, historyEntry] } : null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const renderTaskCard = (task: Task) => {
    const category = categories.find(c => c.id === task.categoryId);
    const statusIcons: Record<TaskStatus, any> = {
      todo: <Icon name="shield" className="w-5 h-5 opacity-40" />,
      doing: <Icon name="clock" className="w-5 h-5 text-amber-500" />,
      done: <Icon name="check" className="w-5 h-5 text-green-500" />
    };

    const statusCardStyles: Record<TaskStatus, string> = {
      todo: 'border-l-4 border-l-slate-600 bg-surface/80',
      doing: 'border-l-4 border-l-amber-500 bg-amber-500/5 shadow-amber-500/10 shadow-lg',
      done: 'border-l-4 border-l-emerald-600 opacity-40 grayscale-[0.5] scale-95 origin-left'
    };

    return (
      <div 
        key={task.id} 
        onClick={() => setSelectedTask(task)}
        className={`motion-card p-6 flex flex-col gap-4 group transition-all duration-300 hover:shadow-2xl cursor-pointer active:scale-95 ${statusCardStyles[task.status]}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: category?.color || '#ccc' }}></span>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30">{category?.name}</span>
            </div>
            <h4 className={`text-lg font-bold leading-tight tracking-tight ${task.status === 'done' ? 'line-through' : 'text-current'}`}>
              {task.title}
            </h4>
          </div>
          <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
             <button onClick={() => toggleTask(task.id, 'done')} className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${task.status === 'done' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-current/10 hover:border-emerald-500'}`}>{statusIcons[task.status]}</button>
            {task.status !== 'doing' && task.status !== 'done' && (
              <button onClick={() => toggleTask(task.id, 'doing')} className="w-10 h-10 rounded-xl flex items-center justify-center border border-current/10 hover:border-amber-500 text-amber-500 transition-all"><Icon name="clock" className="w-4 h-4" /></button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-current/5 mt-auto">
          <div className="flex flex-wrap gap-4">
             {task.dueDate && (
               <div className="flex items-center gap-1.5 opacity-30">
                 <Icon name="calendar" className="w-3 h-3" />
                 <span className="text-[9px] font-black uppercase tracking-widest">{task.dueDate}</span>
               </div>
             )}
             {task.subtasks.length > 0 && (
                <div className="flex items-center gap-1.5 opacity-30">
                  <Icon name="check" className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                  </span>
                </div>
             )}
          </div>
        </div>
      </div>
    );
  };

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];
    for (let i = 0; i < offset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const monthsNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return (
      <div className="max-w-4xl mx-auto w-full animate-flow">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <select value={month} onChange={(e) => setCalendarDate(new Date(year, parseInt(e.target.value), 1))} className="bg-current/10 border-0 rounded-xl px-4 py-2.5 font-black text-sm text-current outline-none">
              {monthsNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={year} onChange={(e) => setCalendarDate(new Date(parseInt(e.target.value), month, 1))} className="bg-current/10 border-0 rounded-xl px-4 py-2.5 font-black text-sm text-current outline-none">
              {Array.from({ length: 10 }, (_, i) => year - 5 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-3 bg-current/5 hover:bg-current/10 rounded-full transition-all text-current"><Icon name="play" className="w-4 h-4 rotate-180" /></button>
            <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-3 bg-current/5 hover:bg-current/10 rounded-full transition-all text-current"><Icon name="play" className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-4">{weekDays.map(d => (<div key={d} className="text-center text-[10px] font-black opacity-30 text-current py-2">{d}</div>))}</div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="aspect-square"></div>;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayItems = tasks.filter(taskItem => taskItem.dueDate === dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            return (
              <div key={day} className={`motion-card aspect-square flex flex-col items-center justify-center relative transition-all group cursor-pointer hover:border-accent ${isToday ? 'border-accent ring-2 ring-accent/20' : 'border-transparent'}`} onClick={() => { 
                  setNewTask({ ...newTask, date: dateStr }); 
                  setIsAdding(true); 
              }}>
                <span className={`text-base font-black ${isToday ? 'text-accent' : 'text-current opacity-80'}`}>{day}</span>
                <div className="flex gap-1 mt-1">
                  {dayItems.slice(0, 3).map(taskItem => (
                    <div key={taskItem.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: categories.find(c => c.id === taskItem.categoryId)?.color || 'var(--accent-color)' }}></div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(taskItem => {
      if (taskItem.type !== 'task') return false;
      const matchesCategory = filterCategory === 'all' || taskItem.categoryId === filterCategory;
      const matchesDate = !filterDate || taskItem.dueDate === filterDate;
      return matchesCategory && matchesDate;
    });
  }, [tasks, filterCategory, filterDate]);

  if (isLoading) return <LoadingScreen />;

  return (
    <div className={`h-[100dvh] flex flex-col md:flex-row bg-bgMain text-current transition-all duration-500 overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
      <aside className="hidden md:flex w-64 flex-col py-10 px-6 bg-current/[0.02] border-r border-borderMain">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-[#C5A059] rounded-xl flex items-center justify-center shadow-xl shadow-[#C5A059]/10">
            <Icon name="harp" className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tighter text-current">ORDO</h1>
        </div>
        <nav className="flex-1 space-y-2">
          {[{ id: 'board', icon: 'globe', label: 'board' }, { id: 'calendar', icon: 'play', label: 'calendar' }, { id: 'apolo', icon: 'harp', label: 'apolo' }, { id: 'settings', icon: 'settings', label: 'settings' }].map(item => (
            <button key={item.id} onClick={() => setActiveView(item.id as ViewMode)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all btn-bounce ${activeView === item.id ? 'bg-[#C5A059] text-white shadow-lg' : 'opacity-40 hover:bg-current/5'}`}>
              <Icon name={item.icon as any} className="w-5 h-5" />
              <span className="font-bold text-sm">{t(item.label)}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="px-6 md:px-10 py-6 flex items-center justify-between max-w-[1200px] mx-auto w-full border-b border-current/5">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase text-current">
              {activeView === 'apolo' ? 'Apolo Oracle' : t(activeView)}
            </h2>
            <p className="text-[10px] font-black opacity-30 tracking-[0.2em] mt-1 uppercase">{new Date().toLocaleDateString(language, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          {activeView === 'board' && (
            <button onClick={() => setIsAdding(true)} className="hidden md:flex btn-bounce px-8 py-3.5 bg-[#C5A059] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-[#C5A059]/20">{t('newTask')}</button>
          )}
        </header>

        {activeView === 'board' && (
          <div className="px-6 md:px-10 py-4 max-w-[1200px] mx-auto w-full flex flex-wrap items-center gap-4 bg-current/[0.01]">
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-black uppercase opacity-30">{t('filterBy')}</span>
            </div>
            <select 
              value={filterCategory} 
              onChange={e => setFilterCategory(e.target.value)}
              className="bg-current/5 border-0 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none text-current"
            >
              <option value="all">{t('allCategories')}</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input 
              type="date" 
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="bg-current/5 border-0 rounded-lg px-4 py-2 text-[10px] font-black uppercase outline-none text-current"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-32 md:pb-10 custom-scrollbar max-w-[1200px] mx-auto w-full pt-6">
          {activeView === 'board' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {(['todo', 'doing'] as TaskStatus[]).map((status) => (
                <div key={status} className="flex flex-col gap-6">
                  <div className="flex items-center justify-between border-b border-current/10 pb-3 px-1">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#C5A059]">{t(status)}</h3>
                    <span className="text-[9px] font-black bg-current/5 px-2 py-0.5 rounded-md opacity-30">{filteredTasks.filter(taskItem => taskItem.status === status).length}</span>
                  </div>
                  <div className="flex flex-col gap-6">
                    {filteredTasks.filter(taskItem => taskItem.status === status).length === 0 ? (
                      <div className="py-20 border-2 border-dashed border-current/5 rounded-3xl flex flex-col items-center justify-center opacity-20">
                        <Icon name="harp" className="w-12 h-12 mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('empty')}</span>
                      </div>
                    ) : filteredTasks.filter(taskItem => taskItem.status === status).map(task => renderTaskCard(task))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeView === 'calendar' && renderCalendar()}
          {activeView === 'apolo' && <div className="h-full flex flex-col w-full animate-flow"><AICopilot language={language} tasks={tasks} onSuggest={() => {}} onUpdateTasks={setTasks} /></div>}
          
          {activeView === 'settings' && (
            <div className="max-w-6xl mx-auto space-y-12 py-6 animate-flow">
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                  <div className="motion-card p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-2"><Icon name="bell" className="w-4 h-4 text-[#C5A059]" /><p className="text-[10px] font-black uppercase tracking-widest">{t('manageBirthdays')}</p></div>
                    <button onClick={() => setIsAddingBirthday(true)} className="w-full py-3 bg-[#C5A059] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#C5A059]/20">{t('addBirthday')}</button>
                  </div>

                  <div className="motion-card p-6 flex flex-col gap-3">
                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">{t('lang')}</p>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-current/5 border border-current/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-accent text-current">
                      {languageOptions.map(l => (
                        <option key={l.code} value={l.code}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                  <div className="motion-card p-8">
                    <div className="flex items-center gap-2 mb-8 border-b border-current/10 pb-4">
                       <Icon name="settings" className="w-5 h-5 text-[#C5A059]" />
                       <h3 className="text-xs font-black uppercase tracking-[0.3em] text-current">{t('manageCategories')}</h3>
                    </div>
                    <div className="space-y-4">
                      {categories.map(cat => (
                        <div key={cat.id} className="flex items-center gap-4 bg-current/5 p-3 rounded-xl border border-current/10">
                          <input 
                            type="color" 
                            value={cat.color} 
                            onChange={(e) => setCategories(categories.map(c => c.id === cat.id ? { ...c, color: e.target.value } : c))}
                            className="w-10 h-10 rounded-lg border-0 bg-transparent cursor-pointer"
                          />
                          <input 
                            type="text" 
                            value={cat.name} 
                            onChange={(e) => setCategories(categories.map(c => c.id === cat.id ? { ...c, name: e.target.value.toUpperCase() } : c))}
                            className="bg-transparent border-0 font-bold text-sm text-current outline-none flex-1"
                          />
                          <button 
                            onClick={() => setCategories(categories.filter(c => c.id !== cat.id))}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Icon name="trash" className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => setCategories([...categories, { id: Math.random().toString(36).substr(2, 9), name: 'NUEVA', color: '#C5A059' }])}
                        className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-current/10 rounded-xl opacity-40 hover:opacity-100 hover:border-[#C5A059] transition-all"
                      >
                        <Icon name="plus" className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('addCategory')}</span>
                      </button>
                    </div>
                  </div>

                  <div className="motion-card p-8">
                    <div className="flex items-center gap-2 mb-8 border-b border-current/10 pb-4">
                       <Icon name="zap" className="w-5 h-5 text-[#C5A059]" />
                       <h3 className="text-xs font-black uppercase tracking-[0.3em] text-current">{t('design')}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40">{t('themes')}</label>
                        <div className="grid grid-cols-3 gap-3">
                          {Object.entries(themeConfigs).map(([key, config]: [string, any]) => (
                            <button 
                              key={key} 
                              onClick={() => { setCurrentTheme(key as DesignTheme); setCustomAccent(null); }}
                              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${currentTheme === key ? 'border-[#C5A059] bg-[#C5A059]/10' : 'border-current/10 bg-current/[0.02] hover:bg-current/5'}`}
                            >
                              <div className="w-full aspect-video rounded-lg shadow-inner overflow-hidden" style={{ backgroundColor: config.bg }}>
                                <div className="h-1/2 w-full mt-2 ml-2 rounded-tl-lg" style={{ backgroundColor: config.surface }}></div>
                              </div>
                              <span className="text-[9px] font-black uppercase">{t(config.label)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest opacity-40">{t('fontLabel')}</label>
                          <select value={customFont || themeConfigs[currentTheme].font} onChange={(e) => setCustomFont(e.target.value)} className="w-full bg-current/5 border border-current/10 rounded-xl px-4 py-3 text-sm font-bold outline-none text-current">
                            {fonts.map(f => <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{t(f.name)}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {showUndo && (
          <div className="fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-6 zoom-in duration-500">
             <div className="bg-[#0c0c0c] border border-[#C5A059]/30 px-6 py-4 rounded-[1.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.9)] flex items-center gap-10 backdrop-blur-3xl min-w-[300px] justify-between">
               <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50">{t('taskArchived')}</p>
               </div>
               <button onClick={undoLastAction} className="bg-[#C5A059] text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#C5A059]/10">{t('undo')}</button>
             </div>
          </div>
        )}

        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bottom-nav-blur flex items-center justify-around z-[90]">
          {[{ id: 'board', icon: 'globe' }, { id: 'calendar', icon: 'play' }, { id: 'apolo' as const, icon: 'harp' }, { id: 'settings', icon: 'settings' }].map(item => (
            <button key={item.id} onClick={() => setActiveView(item.id as ViewMode)} className={`p-4 transition-all ${activeView === item.id ? 'text-[#C5A059] scale-110' : 'opacity-40 text-current'}`}><Icon name={item.icon as any} className="w-6 h-6" /></button>
          ))}
        </nav>
      </main>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div 
          className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-xl flex items-end md:items-center justify-center p-0 md:p-10 animate-in fade-in"
          onClick={() => setSelectedTask(null)}
        >
          <div 
            className="bg-[#0c0c0c] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 md:p-12 rounded-t-[3rem] md:rounded-[3rem] border border-[#C5A059]/30 shadow-2xl animate-bottom-sheet custom-scrollbar"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-10">
              <div className="flex-1">
                 <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categories.find(c => c.id === selectedTask.categoryId)?.color }}></span>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      {categories.find(c => c.id === selectedTask.categoryId)?.name}
                    </span>
                 </div>
                 <h2 className="text-3xl font-black tracking-tighter text-white uppercase">{selectedTask.title}</h2>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-2 opacity-50 hover:opacity-100"><Icon name="trash" className="w-6 h-6" /></button>
            </div>

            <div className="space-y-12">
               {/* Description */}
               <section className="space-y-4">
                  <div className="flex items-center gap-2 opacity-30">
                    <Icon name="message" className="w-4 h-4" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest">{t('description')}</h3>
                  </div>
                  <textarea 
                    className="w-full bg-white/5 rounded-2xl p-6 text-sm leading-relaxed border border-white/5 outline-none focus:border-[#C5A059]/30 min-h-[120px]"
                    placeholder={t('placeholder')}
                    value={selectedTask.description}
                    onChange={(e) => {
                      const newDesc = e.target.value;
                      setTasks(prev => prev.map(taskItem => taskItem.id === selectedTask.id ? { ...taskItem, description: newDesc } : taskItem));
                      setSelectedTask(prev => prev ? { ...prev, description: newDesc } : null);
                    }}
                  />
               </section>

               {/* Subtasks */}
               <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 opacity-30">
                      <Icon name="check" className="w-4 h-4" />
                      <h3 className="text-[10px] font-black uppercase tracking-widest">{t('subtasks')}</h3>
                    </div>
                    <button 
                      onClick={() => generateSubtasks(selectedTask)}
                      disabled={isAiGenerating}
                      className="flex items-center gap-2 bg-[#C5A059]/10 text-[#C5A059] px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-[#C5A059]/20 hover:bg-[#C5A059]/20 transition-all disabled:opacity-50"
                    >
                      <Icon name="zap" className={`w-3 h-3 ${isAiGenerating ? 'animate-spin' : ''}`} />
                      {isAiGenerating ? '...' : t('generateSubtasks')}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selectedTask.subtasks.map(s => (
                      <div key={s.id} className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5 group">
                        <button 
                          onClick={() => {
                             const newSubtasks = selectedTask.subtasks.map(x => x.id === s.id ? { ...x, completed: !x.completed } : x);
                             const historyEntry: TaskHistoryEntry = { date: Date.now(), action: t('subtaskToggled') };
                             setTasks(prev => prev.map(taskItem => taskItem.id === selectedTask.id ? { ...taskItem, subtasks: newSubtasks, history: [...taskItem.history, historyEntry] } : taskItem));
                             setSelectedTask(prev => prev ? { ...prev, subtasks: newSubtasks, history: [...prev.history, historyEntry] } : null);
                          }}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${s.completed ? 'bg-[#C5A059] border-[#C5A059]' : 'border-white/20'}`}
                        >
                          {s.completed && <Icon name="check" className="w-4 h-4 text-white" />}
                        </button>
                        <span className={`text-sm flex-1 ${s.completed ? 'line-through opacity-30' : ''}`}>{s.title}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-4 px-2">
                       <button 
                        onClick={() => {
                          const title = prompt(t('placeholder'));
                          if (title) {
                            const newS: SubTask = { id: Math.random().toString(36).substr(2, 9), title, completed: false };
                            const historyEntry: TaskHistoryEntry = { date: Date.now(), action: t('subtaskAdded') };
                            setTasks(prev => prev.map(taskItem => taskItem.id === selectedTask.id ? { ...taskItem, subtasks: [...taskItem.subtasks, newS], history: [...taskItem.history, historyEntry] } : taskItem));
                            setSelectedTask(prev => prev ? { ...prev, subtasks: [...prev.subtasks, newS], history: [...prev.history, historyEntry] } : null);
                          }
                        }}
                        className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-all"
                       >
                          <Icon name="plus" className="w-3 h-3" />
                          {t('create')}
                       </button>
                    </div>
                  </div>
               </section>

               {/* History */}
               <section className="space-y-4 pt-6 border-t border-white/5">
                  <div className="flex items-center gap-2 opacity-30">
                    <Icon name="clock" className="w-4 h-4" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest">{t('historyLog')}</h3>
                  </div>
                  <div className="space-y-4">
                     {selectedTask.history.slice().reverse().map((h, i) => (
                       <div key={i} className="flex gap-4 items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#C5A059] mt-1.5 shadow-[0_0_8px_rgba(197,160,89,0.5)]"></div>
                          <div>
                            <p className="text-xs text-white/80">{h.action}</p>
                            <p className="text-[8px] font-black uppercase opacity-20 mt-1">
                              {new Date(h.date).toLocaleString(language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                       </div>
                     ))}
                  </div>
               </section>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[300] flex items-end md:items-center justify-center p-0 md:p-10 animate-in fade-in">
          <div className="bg-[#0c0c0c] w-full max-w-xl p-8 md:p-12 rounded-t-[3rem] md:rounded-[3rem] border border-[#C5A059]/30 shadow-[0_0_100px_rgba(197,160,89,0.1)] animate-bottom-sheet">
            <h2 className="text-3xl font-black mb-8 tracking-tighter text-[#C5A059] uppercase">{t('newTask')}</h2>
            <div className="space-y-8">
               <input 
                  type="text" 
                  placeholder={t('placeholder')} 
                  className="w-full bg-white/5 border-2 border-transparent rounded-[1.5rem] px-8 py-6 text-xl font-bold outline-none focus:border-[#C5A059] text-white transition-all shadow-inner" 
                  value={newTask.title} 
                  onChange={e => setNewTask({...newTask, title: e.target.value})} 
                  autoFocus 
               />
               <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase opacity-30 tracking-widest ml-2">{t('category')}</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => setNewTask({...newTask, catId: c.id})}
                        className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border transition-all ${newTask.catId === c.id ? 'bg-white/10 border-accent text-accent' : 'border-white/5 bg-white/5 opacity-40 hover:opacity-100'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
               </div>
               <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase opacity-30 tracking-widest ml-2">{t('date')}</label>
                  <input 
                    type="date" 
                    value={newTask.date}
                    onChange={e => setNewTask({...newTask, date: e.target.value})}
                    className="w-full bg-white/5 border-0 rounded-xl px-6 py-4.5 text-sm font-bold text-white outline-none"
                  />
               </div>
            </div>
            <div className="flex gap-6 mt-12">
              <button onClick={() => setIsAdding(false)} className="flex-1 py-5 text-[11px] font-black uppercase opacity-40 text-white tracking-widest hover:opacity-100 transition-opacity">{t('cancel')}</button>
              <button 
                onClick={() => { 
                  if (!newTask.title.trim()) return; 
                  const task: Task = { 
                    id: Math.random().toString(36).substr(2, 9), 
                    title: newTask.title, 
                    description: '', 
                    status: 'todo', 
                    type: 'task', 
                    categoryId: newTask.catId, 
                    subtasks: [], 
                    history: [{ date: Date.now(), action: t('created') }],
                    createdAt: Date.now(), 
                    dueDate: newTask.date,
                    isAllDay: true
                  }; 
                  setTasks(prev => [task, ...prev]); 
                  setIsAdding(false); 
                  setNewTask({ title: '', desc: '', catId: categories[0]?.id || '1', date: todayStr, time: '', isAllDay: false }); 
                }} 
                className="flex-[2] py-5 bg-[#C5A059] text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-[0_15px_40px_rgba(197,160,89,0.3)] hover:brightness-110 active:scale-95 transition-all"
              >
                {t('create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
