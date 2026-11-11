import { useEffect, useRef, useState } from 'react';
import {
  GraduationCap,
  NotebookPen,
  HelpCircle,
  CalendarDays,
  Lightbulb,
  Send,
  Loader2,
  Copy,
  Check,
  Download,
  Volume2,
  Languages,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { studyGenerate } from '@/lib/ai';
import { useVoice } from '@/lib/voice';
import { Markdown, EmptyState, ErrorBanner, useCopy } from '@/components/Markdown';
import { PageHeader } from '@/components/AppShell';
import { Orb } from '@/components/Orb';

const MODES = [
  { id: 'notes', label: 'Study Notes', icon: NotebookPen, hint: 'Generate structured notes on a topic' },
  { id: 'exam', label: 'Exam Q&A', icon: HelpCircle, hint: 'Create exam questions with answers' },
  { id: 'timetable', label: 'Timetable', icon: CalendarDays, hint: 'Build a study schedule' },
  { id: 'explain', label: 'Explain Concept', icon: Lightbulb, hint: 'Simple explanation in English / Tamil' },
];

const PROMPTS: Record<string, string> = {
  notes: 'Generate comprehensive study notes for: ',
  exam: 'Create 5 exam questions with detailed answers for: ',
  timetable: 'Create a 7-day study timetable for: ',
  explain: 'Explain this concept simply, with examples: ',
};

interface Result {
  id: string;
  mode: string;
  topic: string;
  content: string;
  created_at: string;
}

export function StudyPage() {
  const [mode, setMode] = useState('notes');
  const [topic, setTopic] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'english' | 'tamil'>('english');
  const [results, setResults] = useState<Result[]>([]);
  const { copied, copy } = useCopy();
  const voice = useVoice();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [results, busy]);

  const generate = async () => {
    const t = topic.trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data: memData } = await supabase.from('memories').select('title, content, category').limit(20);
      const memory = (memData as any[]) ?? [];
      const prompt = `${PROMPTS[mode]}${t}`;
      const reply = await studyGenerate([{ role: 'user', content: prompt }], memory, language);
      const r: Result = { id: crypto.randomUUID(), mode, topic: t, content: reply, created_at: new Date().toISOString() };
      setResults((p) => [...p, r]);
      setTopic('');
      await supabase.from('activity').insert({ type: 'study', title: `${MODES.find((m) => m.id === mode)?.label}: ${t.slice(0, 40)}`, metadata: {} });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate.');
    } finally {
      setBusy(false);
    }
  };

  const download = (r: Result) => {
    const blob = new Blob([`# ${r.topic}\n\n${r.content}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-${r.mode}-${r.id.slice(0, 6)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Smart Study Assistant"
        subtitle="Notes, exam questions, timetables & explanations"
        icon={<GraduationCap className="w-5 h-5" />}
        action={
          <button
            onClick={() => setLanguage(language === 'english' ? 'tamil' : 'english')}
            className="btn-ghost"
          >
            <Languages className="w-4 h-4" /> {language === 'english' ? 'English' : 'தமிழ்'}
          </button>
        }
      />

      {/* Mode selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`glass p-4 text-left transition-all ${active ? 'border-neon-purple/50 bg-neon-purple/10' : 'hover:border-white/15'}`}
            >
              <Icon className={`w-5 h-5 mb-2 ${active ? 'text-neon-cyan' : 'text-white/60'}`} />
              <div className="text-sm font-medium">{m.label}</div>
              <div className="text-[11px] text-white/40 mt-0.5">{m.hint}</div>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Composer */}
        <div className="glass p-4">
          <div className="flex items-center gap-2 mb-3">
            <Orb size={28} thinking={busy} />
            <span className="text-sm font-medium">{MODES.find((m) => m.id === mode)?.label}</span>
          </div>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generate(); }}
            placeholder={`e.g. ${mode === 'timetable' ? 'Algorithms exam in 2 weeks, 4 hours daily' : mode === 'explain' ? 'Recursion in programming' : 'Data Structures — Trees'}`}
            rows={3}
            className="input-field resize-none mb-3"
          />
          <button onClick={generate} disabled={busy || !topic.trim()} className="btn-primary w-full">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Send className="w-4 h-4" /> Generate</>}
          </button>
          <p className="text-[10px] text-white/30 mt-2">Ctrl+Enter to generate · {language === 'tamil' ? 'Tamil explanations enabled' : 'English mode'}</p>
          {error && <div className="mt-3"><ErrorBanner message={error} onRetry={() => setError(null)} /></div>}
        </div>

        {/* Results */}
        <div ref={logRef} className="glass p-4 max-h-[60vh] overflow-y-auto">
          <div className="text-xs uppercase tracking-widest text-white/40 mb-3">Generated Material</div>
          {results.length === 0 && !busy ? (
            <EmptyState icon={<GraduationCap className="w-7 h-7" />} title="Nothing yet" subtitle="Pick a mode, type a topic, and MATHI AI will generate study material here." />
          ) : (
            <div className="space-y-4">
              {results.map((r) => (
                <div key={r.id} className="glass-strong p-4 animate-fade-up">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-xs text-neon-cyan font-medium">{MODES.find((m) => m.id === r.mode)?.label} · {r.topic}</div>
                    <div className="flex gap-1">
                      <button onClick={() => copy(r.content)} className="text-white/40 hover:text-neon-cyan p-1">{copied ? <Check className="w-3.5 h-3.5 text-neon-cyan" /> : <Copy className="w-3.5 h-3.5" />}</button>
                      <button onClick={() => download(r)} className="text-white/40 hover:text-neon-cyan p-1"><Download className="w-3.5 h-3.5" /></button>
                      {voice.supported && <button onClick={() => voice.speak(r.content)} className="text-white/40 hover:text-neon-cyan p-1"><Volume2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </div>
                  <Markdown content={r.content} />
                </div>
              ))}
              {busy && <div className="flex gap-2 items-center text-sm text-white/50"><Loader2 className="w-4 h-4 animate-spin text-neon-cyan" /> Generating study material…</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
