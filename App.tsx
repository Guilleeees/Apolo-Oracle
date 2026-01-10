
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icon } from './components/Icon';
import { Task, Reminder, TaskStatus, Priority, AppFont } from './types';
import { classroomService, ClassroomCourse } from './services/classroomService';
import { geminiService } from './services/geminiService';
import { AICopilot } from './components/AICopilot';
import { translations } from './translations';

const BASE_THEMES: Record<string, any> = {
  oracle: { bg: '#050505', surface: '#0c0c0c', isDark: true },
  midnight: { bg: '#010409', surface: '#0d1117', isDark: true },
  minimal: { bg: '#ffffff', surface: '#f8fafc', isDark: false }
};

const ACCENT_COLORS = [
  { id: 'gold', value: '#C5A059', label: 'Oracle Gold' },
  { id: 'silver', value: '#94A3B8', label: 'Imperial Silver' },
  { id: 'bronze', value: '#CD7F32', label: 'Ancient Bronze' },
  { id: 'ruby', value: '#e11d48', label: 'Oracle Ruby' },
  { id: 'emerald', value: '#10b981', label: 'Emerald' },
  { id: 'onyx', value: '#1A1A1A', label: 'Nocturnal Onyx' },
];

const LANGUAGES = [
  { code: 'es', label: 'Castellano' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
];

const App: React.FC = () => {
  const [language, setLanguage] = useState(() => localStorage.getItem('apolo_lang') || 'es');
  const [currentBaseTheme, setCurrentBaseTheme] = useState(() => localStorage.getItem('apolo_theme_base') || 'oracle');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('apolo_theme_accent') || '#C5A059');
  const [activeFont, setActiveFont] = useState<AppFont>(() => (localStorage.getItem('apolo_font') as AppFont) || 'Inter');
  const [activeView, setActiveView] = useState('calendar');
  const [prevView, setPrevView] = useState('calendar');
  const [isInitializing, setIsInitializing] = useState(true);

  // Nexus Hub State
  const [clientId, setClientId] = useState(() => localStorage.getItem('apolo_client_id') || '');
  const [isClassroomConnected, setIsClassroomConnected] = useState(false);
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Data State
  const [tasks, setTasks] = useState<Task[]>(() => JSON.parse(localStorage.getItem('apolo_tasks_v5') || '[]'));
  const [reminders, setReminders] = useState<Reminder[]>(() => JSON.parse(localStorage.getItem('apolo_reminders_v5') || '[]'));
  
  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{type: 'task' | 'reminder', date: string} | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitializing(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('apolo_tasks_v5', JSON.stringify(tasks));
    localStorage.setItem('apolo_reminders_v5', JSON.stringify(reminders));
    localStorage.setItem('apolo_lang', language);
    localStorage.setItem('apolo_theme_base', currentBaseTheme);
    localStorage.setItem('apolo_theme_accent', accentColor);
    localStorage.setItem('apolo_font', activeFont);
    localStorage.setItem('apolo_client_id', clientId);

    const theme = BASE_THEMES[currentBaseTheme];
    document.documentElement.style.setProperty('--bg-color', theme.bg);
    document.documentElement.style.setProperty('--surface-color', theme.surface);
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--font-main', `'${activeFont}', sans-serif`);
    
    const isDark = theme.isDark;
    document.body.style.color = isDark ? '#f8fafc' : '#1a1a1a';
    document.documentElement.style.setProperty('--text-primary', isDark ? '#f8fafc' : '#1a1a1a');
  }, [tasks, reminders, language, currentBaseTheme, accentColor, activeFont, clientId]);

  useEffect(() => {
    if (clientId.trim()) {
      classroomService.initAuth(clientId, (token) => {
        setIsClassroomConnected(true);
        loadCourses();
      });
    }
  }, [clientId]);

  const loadCourses = async () => {
    try {
      const fetched = await classroomService.fetchCourses();
      setCourses(fetched);
    } catch (e) { console.error(e); }
  };

  const changeView = (view: string) => {
    setPrevView(activeView);
    setActiveView(view);
  };

  const handleDayClick = (day: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (day < today) return;

    const dateStr = day.toISOString().split('T')[0];
    const initialType = activeView === 'reminders' ? 'reminder' : 'task';
    setEditingItem({ type: initialType, date: dateStr });
    setIsModalOpen(true);
  };

  const handleVisionScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const newTask: Task = {
          id: Math.random().toString(36).substr(2, 9),
          title: "Misión Detectada por Visión",
          description: "Extraída del pergamino analizado por el Oráculo.",
          status: 'todo',
          priority: 'high',
          dueDate: new Date().toISOString().split('T')[0],
          createdAt: Date.now()
        };
        setTasks(prev => [...prev, newTask]);
      };
      reader.readAsDataURL(file);
    } catch (e) { console.error(e); } finally { setScanLoading(false); }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          setTasks(prev => [...prev, ...json]);
        }
      } catch (err) { alert("Archivo corrupto."); }
    };
    reader.readAsText(file);
  };

  const saveItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get('itemType') as 'task' | 'reminder';
    
    if (type === 'task') {
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        title: formData.get('name') as string,
        description: '',
        status: 'todo',
        priority: 'normal',
        dueDate: formData.get('date') as string,
        createdAt: Date.now()
      };
      setTasks(prev => [...prev, newTask]);
    } else {
      const newRem: Reminder = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.get('name') as string,
        date: formData.get('date') as string,
        type: formData.get('remType') as 'birthday' | 'event'
      };
      setReminders(prev => [...prev, newRem]);
    }
    setIsModalOpen(false);
  };

  const updateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const t = (key: string) => translations[language]?.[key] || translations['en']?.[key] || key;

  const [navDate, setNavDate] = useState(new Date());
  const calendarDays = useMemo(() => {
    const year = navDate.getFullYear();
    const month = navDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  }, [navDate]);

  const sortedReminders = useMemo(() => {
    return {
      birthdays: reminders.filter(r => r.type === 'birthday').sort((a, b) => a.date.localeCompare(b.date)),
      events: reminders.filter(r => r.type === 'event').sort((a, b) => a.date.localeCompare(b.date))
    };
  }, [reminders]);

  const historyItems = useMemo(() => {
    const doneTasks = tasks.filter(t => t.status === 'done');
    return { tasks: doneTasks };
  }, [tasks]);

  const isLight = currentBaseTheme === 'minimal';

  const NAV_ITEMS = [
    { id: 'board', icon: 'globe', label: t('board') },
    { id: 'calendar', icon: 'calendar', label: t('calendar') },
    { id: 'reminders', icon: 'bell', label: t('reminders') },
    { id: 'apolo', icon: 'zap', label: 'AI' },
    { id: 'nexus', icon: 'file', label: 'Nexus' },
    { id: 'history', icon: 'history', label: 'Historial' },
    { id: 'settings', icon: 'settings', label: 'Ajustes' }
  ];

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black overflow-hidden">
        <div className="relative animate-splash">
          <div className="absolute inset-0 bg-accent/20 blur-[100px] rounded-full scale-150 animate-pulse" />
          <Icon name="harp" className="w-24 h-24 text-accent relative drop-shadow-[0_0_20px_rgba(197,160,89,0.5)]" />
        </div>
        <div className="mt-12 text-center animate-fade-up" style={{ animationDelay: '0.5s' }}>
          <h1 className="text-accent font-black tracking-[1em] uppercase text-xs">Apolo Oracle</h1>
          <p className="text-white/10 text-[8px] font-black uppercase tracking-[0.5em] mt-2">Santuario del Éxito</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden bg-[var(--bg-color)] transition-colors duration-500 font-['${activeFont}']`}>
      {/* Desktop Sidebar (Antiguo Sistema) */}
      <aside className={`hidden lg:flex w-72 border-r border-white/5 ${isLight ? 'bg-slate-50' : 'bg-[#080808]'} p-8 flex-col gap-12 z-50`}>
        <div className="flex items-center gap-4 group">
          <div className="p-3 bg-accent rounded-2xl shadow-2xl shadow-accent/40 group-hover:scale-110 transition-transform">
            <Icon name="harp" className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-[12px] uppercase tracking-[0.4em] text-accent">Apolo Oracle</span>
            <span className="text-[8px] opacity-20 uppercase tracking-[0.2em]">Legacy System</span>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {NAV_ITEMS.map(item => (
            <button 
              key={item.id}
              onClick={() => changeView(item.id)}
              className={`w-full flex items-center gap-5 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeView === item.id ? 'bg-accent text-white shadow-xl shadow-accent/20 translate-x-2' : 'opacity-30 hover:opacity-100 hover:bg-white/5 hover:translate-x-1'}`}
            >
              <Icon name={item.icon as any} className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-8 border-t border-white/5">
          <div className="flex items-center gap-3 opacity-20">
            <Icon name="shield" className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-widest">Protocolo Seguro</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 lg:h-24 border-b border-white/5 flex items-center justify-between px-6 lg:px-12 shrink-0 bg-transparent backdrop-blur-3xl z-40">
          <div className="flex flex-col">
            <h2 className="text-[10px] lg:text-[12px] font-black uppercase tracking-[0.5em] text-accent">{t(activeView)}</h2>
            <span className="text-[7px] lg:text-[8px] opacity-20 uppercase tracking-[0.3em] mt-1">Cámara de Operaciones</span>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => { setEditingItem({ type: 'task', date: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }}
              className="bg-accent text-white px-6 lg:px-10 py-3 rounded-full text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl border border-white/10"
            >
              + Inscribir
            </button>
          </div>
        </header>

        {/* View Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-12 custom-scrollbar pb-32 lg:pb-12 animate-fade-up" key={activeView}>
          {activeView === 'calendar' && (
            <div className="max-w-6xl mx-auto space-y-6 lg:space-y-12">
              <div className="flex items-center justify-between bg-white/[0.03] p-4 lg:p-8 rounded-[2rem] lg:rounded-[3rem] border border-white/5 shadow-2xl">
                <button onClick={() => setNavDate(new Date(navDate.setMonth(navDate.getMonth() - 1)))} className="p-3 lg:p-4 bg-accent/10 text-accent rounded-full hover:bg-accent hover:text-white transition-all">
                  <Icon name="chevronLeft" className="w-5 h-5" />
                </button>
                <div className="text-center">
                   <h3 className="text-2xl lg:text-5xl font-black uppercase tracking-tighter text-accent">{navDate.toLocaleString(language, { month: 'long' })}</h3>
                   <p className="text-[9px] lg:text-[11px] font-black opacity-30 uppercase tracking-[0.5em] mt-1">{navDate.getFullYear()}</p>
                </div>
                <button onClick={() => setNavDate(new Date(navDate.setMonth(navDate.getMonth() + 1)))} className="p-3 lg:p-4 bg-accent/10 text-accent rounded-full hover:bg-accent hover:text-white transition-all">
                  <Icon name="chevronRight" className="w-5 h-5" />
                </button>
              </div>

              <div className={`grid grid-cols-7 gap-px ${isLight ? 'bg-black/5' : 'bg-white/5'} rounded-[1.5rem] lg:rounded-[3rem] overflow-hidden border border-white/5`}>
                {['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'].map(d => (
                  <div key={d} className="bg-black/20 py-4 lg:py-6 text-center text-[8px] lg:text-[10px] font-black uppercase tracking-[0.5em] opacity-30">{d}</div>
                ))}
                {calendarDays.map((day, idx) => {
                  if (!day) return <div key={idx} className="bg-transparent h-24 lg:h-44 opacity-0" />;
                  const dateKey = day.toISOString().split('T')[0];
                  const dayTasks = tasks.filter(t => t.dueDate === dateKey && t.status !== 'done');
                  const dayRems = reminders.filter(r => r.date.includes(dateKey.slice(5)));
                  const today = new Date(); today.setHours(0,0,0,0);
                  const isPast = day < today;

                  return (
                    <div 
                      key={idx} 
                      onClick={() => !isPast && handleDayClick(day)}
                      className={`${isLight ? 'bg-white' : 'bg-[#0c0c0c]/40'} h-24 lg:h-44 p-2 lg:p-5 border border-white/5 hover:bg-accent/[0.03] transition-all cursor-pointer group relative ${isPast ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      <span className={`text-[10px] lg:text-sm font-black ${day.getDate() === new Date().getDate() && day.getMonth() === new Date().getMonth() ? 'text-accent' : 'opacity-20'}`}>
                        {day.getDate()}
                      </span>
                      <div className="mt-1 lg:mt-4 space-y-0.5 lg:space-y-1.5 overflow-hidden">
                        {dayTasks.map(t => (
                          <div key={t.id} className="w-full px-1 lg:px-2.5 py-0.5 lg:py-1.5 bg-accent/10 text-accent text-[6px] lg:text-[8px] font-black uppercase rounded-lg truncate border border-accent/20">
                            {t.title}
                          </div>
                        ))}
                        {dayRems.map(r => (
                          <div key={r.id} className="w-full px-1 lg:px-2.5 py-0.5 lg:py-1.5 bg-pink-500/10 text-pink-500 text-[6px] lg:text-[8px] font-black uppercase rounded-lg truncate border border-pink-500/20">
                            🎂 {r.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === 'board' && (
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
              {[
                { id: 'todo', label: t('todo'), icon: 'clock', color: 'accent' },
                { id: 'doing', label: t('doing'), icon: 'zap', color: 'blue-500' },
                { id: 'done', label: t('done'), icon: 'check', color: 'emerald-500' }
              ].map((column) => (
                <div key={column.id} className="space-y-6 lg:space-y-8">
                  <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                    <div className={`p-3 bg-white/5 text-${column.color === 'accent' ? 'accent' : column.color} rounded-xl`}>
                       <Icon name={column.icon as any} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[12px] font-black uppercase tracking-[0.4em] opacity-80">{column.label}</h3>
                      <p className="text-[8px] opacity-20 uppercase tracking-widest mt-1">{tasks.filter(t => t.status === column.id).length} Misiones</p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {tasks.filter(t => t.status === column.id).map(task => (
                      <div key={task.id} className="motion-card p-6 lg:p-8 group relative overflow-hidden bg-white/[0.01]">
                        <div className="absolute top-0 left-0 w-1 h-full bg-accent opacity-20 group-hover:opacity-100 transition-opacity" />
                        <h4 className="font-bold text-sm lg:text-base mb-4 group-hover:text-accent transition-colors leading-tight">{task.title}</h4>
                        <div className="flex justify-between items-center mt-6">
                           <div className="flex items-center gap-2 opacity-30 text-[9px] font-black uppercase tracking-widest">
                             <Icon name="calendar" className="w-3 h-3" />
                             <span>{task.dueDate}</span>
                           </div>
                           <div className="flex gap-2">
                             {task.status === 'todo' && (
                               <button onClick={() => updateTaskStatus(task.id, 'doing')} className="p-2 text-blue-500/60 hover:text-blue-500" title="Poner en Acción">
                                 <Icon name="play" className="w-4 h-4" />
                               </button>
                             )}
                             {task.status === 'doing' && (
                               <button onClick={() => updateTaskStatus(task.id, 'done')} className="p-2 text-emerald-500/60 hover:text-emerald-500" title="Finalizar">
                                 <Icon name="check" className="w-4 h-4" />
                               </button>
                             )}
                             <button onClick={() => setTasks(tasks.filter(tx => tx.id !== task.id))} className="p-2 opacity-40 hover:text-red-500">
                               <Icon name="trash" className="w-4 h-4" />
                             </button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeView === 'reminders' && (
            <div className="max-w-6xl mx-auto space-y-8">
               <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                  <h3 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter text-accent">{t('reminders')}</h3>
                  <button onClick={() => { setEditingItem({type: 'reminder', date: ''}); setIsModalOpen(true); }} className="bg-accent text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl w-full lg:w-auto">
                    + Registrar {t('reminders')}
                  </button>
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-5 border-b border-white/5 pb-4">
                      <Icon name="harp" className="w-6 h-6 text-pink-500" />
                      <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-pink-500/80">{t('birthdays')}</h4>
                    </div>
                    {sortedReminders.birthdays.map(rem => (
                      <div key={rem.id} className="motion-card p-6 flex justify-between items-center bg-white/[0.01]">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-500 font-black">{rem.name.charAt(0)}</div>
                          <div>
                            <p className="font-bold text-base truncate max-w-[150px]">{rem.name}</p>
                            <p className="text-[10px] opacity-30 uppercase tracking-[0.3em]">{rem.date}</p>
                          </div>
                        </div>
                        <button onClick={() => setReminders(reminders.filter(r => r.id !== rem.id))} className="p-4 text-red-500/30 hover:text-red-500"><Icon name="trash" className="w-5 h-5" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-5 border-b border-white/5 pb-4">
                      <Icon name="bell" className="w-6 h-6 text-blue-500" />
                      <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-blue-500/80">{t('events')}</h4>
                    </div>
                    {sortedReminders.events.map(rem => (
                      <div key={rem.id} className="motion-card p-6 flex justify-between items-center bg-white/[0.01]">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500"><Icon name="calendar" className="w-6 h-6" /></div>
                          <div>
                            <p className="font-bold text-base truncate max-w-[150px]">{rem.name}</p>
                            <p className="text-[10px] opacity-30 uppercase tracking-[0.3em]">{rem.date}</p>
                          </div>
                        </div>
                        <button onClick={() => setReminders(reminders.filter(r => r.id !== rem.id))} className="p-4 text-red-500/30 hover:text-red-500"><Icon name="trash" className="w-5 h-5" /></button>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

          {activeView === 'nexus' && (
            <div className="max-w-6xl mx-auto space-y-12">
               <div className="text-center">
                  <h3 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter text-accent">Nexus Core</h3>
                  <p className="text-[10px] opacity-30 uppercase tracking-[0.6em] mt-3">Integración Suprema</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { title: "Visión", icon: "image", action: () => fileInputRef.current?.click() },
                    { title: "Classroom", icon: "globe", action: () => classroomService.signIn() },
                    { title: "Importar", icon: "download", action: () => importInputRef.current?.click() }
                  ].map((card, idx) => (
                    <div key={idx} className="motion-card p-8 flex flex-col items-center gap-6 bg-white/[0.01]">
                      <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center text-accent"><Icon name={card.icon as any} className="w-8 h-8" /></div>
                      <h4 className="text-xl font-black uppercase tracking-tighter">{card.title}</h4>
                      <button onClick={card.action} className="w-full py-4 bg-accent text-white rounded-xl text-[10px] font-black uppercase tracking-[0.3em]">Activar</button>
                    </div>
                  ))}
               </div>
               <input type="file" ref={fileInputRef} onChange={handleVisionScan} className="hidden" accept="image/*" />
               <input type="file" ref={importInputRef} onChange={handleImport} className="hidden" accept=".json" />
            </div>
          )}

          {activeView === 'history' && (
            <div className="max-w-4xl mx-auto space-y-8">
              <h3 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter text-accent">Anales</h3>
              {historyItems.tasks.map(task => (
                <div key={task.id} className="motion-card p-6 flex justify-between items-center bg-white/[0.01]">
                  <div className="flex items-center gap-6">
                    <Icon name="check" className="w-8 h-8 text-emerald-500" />
                    <div>
                      <h4 className="font-bold text-lg">{task.title}</h4>
                      <p className="text-[10px] opacity-30 uppercase tracking-widest">Finalizada: {new Date(task.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button onClick={() => setTasks(tasks.filter(tx => tx.id !== task.id))} className="text-red-500/30 hover:text-red-500"><Icon name="trash" className="w-5 h-5" /></button>
                </div>
              ))}
            </div>
          )}

          {activeView === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-12">
               <h3 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter text-accent">Ajustes</h3>
               <div className="motion-card p-8 lg:p-16 space-y-12 bg-white/[0.01]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <label className="text-[10px] font-black uppercase tracking-widest text-accent opacity-50">Tema</label>
                      <div className="flex gap-4">
                        {Object.keys(BASE_THEMES).map(t => (
                          <button key={t} onClick={() => setCurrentBaseTheme(t)} className={`w-12 h-12 rounded-full border-2 ${currentBaseTheme === t ? 'border-accent' : 'border-white/10'}`} style={{backgroundColor: BASE_THEMES[t].bg}} />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-6">
                      <label className="text-[10px] font-black uppercase tracking-widest text-accent opacity-50">Lenguaje</label>
                      <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full">
                        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-accent opacity-50">Nexus Classroom ID</label>
                    <input type="text" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="Google Client ID..." className="w-full" />
                  </div>
               </div>
            </div>
          )}

          {activeView === 'apolo' && <AICopilot language={language} tasks={tasks} onSuggest={() => {}} onUpdateTasks={setTasks} />}
        </div>
      </main>

      {/* Hotbar Movil (Solo en movil) */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 hotbar-glass px-4 flex items-center justify-center gap-1 lg:hidden z-[100]">
        {NAV_ITEMS.map(item => (
          <button 
            key={item.id}
            onClick={() => changeView(item.id)}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl transition-all min-w-[50px] ${activeView === item.id ? 'text-accent scale-110' : 'opacity-30'}`}
          >
            <Icon name={item.icon as any} className="w-5 h-5" />
            <span className="text-[7px] font-black uppercase tracking-widest">{item.label.slice(0, 3)}</span>
          </button>
        ))}
      </nav>

      {/* Item Modal Rediseñado */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-[2000] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-4">
          <form onSubmit={saveItem} className={`w-full max-w-2xl ${isLight ? 'bg-white text-black' : 'bg-[#0a0a0a] border border-white/10'} p-8 lg:p-16 rounded-[2.5rem] shadow-2xl space-y-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
            <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-widest text-accent text-center">Registro Sagrado</h3>
            
            <div className="space-y-6">
              {activeView !== 'reminders' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase opacity-40">Tipo</label>
                    <select name="itemType" defaultValue={editingItem.type} className="w-full">
                      <option value="task">Misión (Tarea)</option>
                      <option value="reminder">Registro ({t('reminders')})</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase opacity-40">Atributo</label>
                    <select name="remType" className="w-full">
                      <option value="birthday">{t('birthdays')}</option>
                      <option value="event">{t('events')}</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input type="hidden" name="itemType" value="reminder" />
                  <label className="text-[9px] font-black uppercase opacity-40">Atributo del Evento</label>
                  <select name="remType" className="w-full">
                    <option value="birthday">{t('birthdays')}</option>
                    <option value="event">{t('events')}</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase opacity-40">Identificador</label>
                <input name="name" type="text" autoFocus required placeholder="Nombre..." className="w-full" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase opacity-40">Momento</label>
                <input name="date" type="date" required defaultValue={editingItem.date} className="w-full" />
              </div>
            </div>
            
            <div className="flex gap-4 pt-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase opacity-40">Descartar</button>
              <button type="submit" className="flex-1 py-4 bg-accent text-white rounded-xl text-[10px] font-black uppercase">Consagrar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default App;
