import { useEffect, useState } from 'react';
import { BrainCircuit, Plus, Pencil, Trash2, Save, X, GraduationCap, Briefcase, Code2, Heart, Lightbulb, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Memory } from '@/lib/types';
import { EmptyState, ErrorBanner } from '@/components/Markdown';
import { PageHeader } from '@/components/AppShell';

const CATEGORIES = [
  { id: 'education', label: 'Education', icon: GraduationCap, color: 'text-neon-cyan' },
  { id: 'projects', label: 'Projects', icon: Briefcase, color: 'text-neon-blue' },
  { id: 'skills', label: 'Skills', icon: Code2, color: 'text-neon-purple' },
  { id: 'preferences', label: 'Preferences', icon: Heart, color: 'text-neon-pink' },
  { id: 'notes', label: 'Notes', icon: Lightbulb, color: 'text-amber-300' },
  { id: 'general', label: 'General', icon: Tag, color: 'text-white/60' },
];

export function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', category: 'general' });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('memories').select('*').order('updated_at', { ascending: false });
    if (error) setError(error.message);
    else setMemories((data as Memory[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', content: '', category: 'general' });
    setShowForm(true);
  };

  const openEdit = (m: Memory) => {
    setEditing(m);
    setForm({ title: m.title, content: m.content, category: m.category });
    setShowForm(true);
  };

  const save = async () => {
    setError(null);
    if (!form.title.trim()) return;
    if (editing) {
      const { error } = await supabase.from('memories').update(form).eq('id', editing.id);
      if (error) { setError(error.message); return; }
      setMemories((m) => m.map((x) => (x.id === editing.id ? { ...x, ...form, updated_at: new Date().toISOString() } : x)));
    } else {
      const { data, error } = await supabase.from('memories').insert(form).select().single();
      if (error) { setError(error.message); return; }
      setMemories((m) => [data as Memory, ...m]);
      await supabase.from('activity').insert({ type: 'memory', title: `Saved: ${form.title.slice(0, 50)}`, metadata: {} });
    }
    setShowForm(false);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) { setError(error.message); return; }
    setMemories((m) => m.filter((x) => x.id !== id));
  };

  const catOf = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
  const counts = CATEGORIES.map((c) => ({ ...c, count: memories.filter((m) => m.category === c.id).length }));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Personal Memory"
        subtitle="What MATHI AI knows about you"
        icon={<BrainCircuit className="w-5 h-5" />}
        action={<button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> New Memory</button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        {counts.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.id} className="glass p-3 text-center">
              <Icon className={`w-5 h-5 mx-auto ${c.color}`} />
              <div className="text-xl font-bold mt-1">{c.count}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wide">{c.label}</div>
            </div>
          );
        })}
      </div>

      {error && <div className="mb-4"><ErrorBanner message={error} onRetry={() => setError(null)} /></div>}

      {loading ? (
        <div className="text-white/40 text-sm">Loading memories…</div>
      ) : memories.length === 0 ? (
        <EmptyState icon={<BrainCircuit className="w-7 h-7" />} title="No memories yet" subtitle="Save your education, projects, skills and preferences so MATHI AI can personalize every response." action={<button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> Add your first memory</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {memories.map((m) => {
            const cat = catOf(m.category);
            const Icon = cat.icon;
            return (
              <div key={m.id} className="glass p-4 group animate-fade-up hover:border-white/15 transition-all">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${cat.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="chip !py-0.5 !text-[10px]">{cat.label}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(m)} className="text-white/40 hover:text-neon-cyan p-1"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(m.id)} className="text-white/40 hover:text-neon-pink p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="text-sm font-medium text-white/90 mb-1">{m.title}</div>
                <p className="text-xs text-white/55 whitespace-pre-wrap line-clamp-4">{m.content}</p>
                <div className="text-[10px] text-white/30 mt-2">{new Date(m.updated_at).toLocaleDateString()}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative glass-strong gradient-border p-6 max-w-lg w-full animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{editing ? 'Edit memory' : 'New memory'}</h3>
              <button onClick={() => setShowForm(false)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setForm((f) => ({ ...f, category: c.id }))}
                      className={`chip ${form.category === c.id ? '!border-neon-purple !text-white !bg-neon-purple/20' : ''}`}
                    >
                      <c.icon className={`w-3 h-3 ${c.color}`} /> {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Title</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="input-field" placeholder="e.g. B.Tech Computer Science" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Details</label>
                <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={4} className="input-field resize-none" placeholder="Describe this so the AI can use it…" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)} className="btn-ghost"><X className="w-4 h-4" /> Cancel</button>
                <button onClick={save} className="btn-primary"><Save className="w-4 h-4" /> Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
