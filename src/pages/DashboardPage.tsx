import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  BrainCircuit,
  FileText,
  Activity as ActivityIcon,
  TrendingUp,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PageId } from '@/lib/nav';
import { Orb } from '@/components/Orb';
import { EmptyState } from '@/components/Markdown';
import { PageHeader } from '@/components/AppShell';

interface Stats {
  conversations: number;
  tasks: number;
  memories: number;
  documents: number;
  completedTasks: number;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  created_at: string;
}

export function DashboardPage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const [stats, setStats] = useState<Stats>({ conversations: 0, tasks: 0, memories: 0, documents: 0, completedTasks: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [conv, tasks, mem, docs, activity] = await Promise.all([
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('agent_tasks').select('id, status', { count: 'exact' }),
        supabase.from('memories').select('id', { count: 'exact', head: true }),
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('activity').select('id, type, title, created_at').order('created_at', { ascending: false }).limit(8),
      ]);
      setStats({
        conversations: conv.count ?? 0,
        tasks: tasks.count ?? 0,
        completedTasks: (tasks.data as any[])?.filter((t) => t.status === 'completed').length ?? 0,
        memories: mem.count ?? 0,
        documents: docs.count ?? 0,
      });
      setActivity((activity.data as ActivityItem[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: 'Conversations', value: stats.conversations, icon: MessageSquare, page: 'chat' as PageId, color: 'text-neon-cyan' },
    { label: 'Agent Tasks', value: stats.tasks, sub: `${stats.completedTasks} completed`, icon: Bot, page: 'agent' as PageId, color: 'text-neon-purple' },
    { label: 'Memories', value: stats.memories, icon: BrainCircuit, page: 'memory' as PageId, color: 'text-neon-pink' },
    { label: 'Documents', value: stats.documents, icon: FileText, page: 'documents' as PageId, color: 'text-neon-blue' },
  ];

  const typeIcon = (type: string) => {
    switch (type) {
      case 'chat': return MessageSquare;
      case 'agent': case 'agent_done': return Bot;
      case 'memory': return BrainCircuit;
      case 'study': return TrendingUp;
      case 'document': case 'document_qa': case 'document_summary': return FileText;
      default: return ActivityIcon;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader title="Dashboard" subtitle="Your AI activity at a glance" icon={<LayoutDashboard className="w-5 h-5" />} />

      {/* Hero */}
      <div className="glass-strong gradient-border p-6 mb-6 flex flex-col sm:flex-row items-center gap-6 animate-fade-up overflow-hidden relative">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-neon-purple/20 blur-3xl pointer-events-none" />
        <Orb size={90} className="shrink-0" />
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-display font-bold">Welcome back to <span className="shimmer-text">MATHI AI</span></h2>
          <p className="text-sm text-white/55 mt-1">Your intelligent companion is online and ready. What shall we build today?</p>
          <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
            <button onClick={() => onNavigate('chat')} className="btn-primary !py-2"><MessageSquare className="w-4 h-4" /> Start chatting</button>
            <button onClick={() => onNavigate('agent')} className="btn-ghost !py-2"><Bot className="w-4 h-4" /> Launch agent</button>
            <button onClick={() => onNavigate('study')} className="btn-ghost !py-2"><TrendingUp className="w-4 h-4" /> Study tools</button>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.label}
              onClick={() => onNavigate(c.page)}
              className="glass p-5 text-left group hover:border-white/15 transition-all animate-fade-up"
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${c.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-neon-cyan group-hover:translate-x-1 transition-all" />
              </div>
              <div className="text-3xl font-bold mt-3">{loading ? '—' : c.value}</div>
              <div className="text-xs text-white/50">{c.label}</div>
              {c.sub && <div className="text-[10px] text-neon-cyan mt-0.5">{c.sub}</div>}
            </button>
          );
        })}
      </div>

      {/* Activity + Quick actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <ActivityIcon className="w-4 h-4 text-neon-cyan" />
            <h3 className="font-medium">Recent AI Activity</h3>
          </div>
          {activity.length === 0 ? (
            <EmptyState icon={<Clock className="w-7 h-7" />} title="No activity yet" subtitle="Start chatting, running agents, or generating study material to see your activity here." />
          ) : (
            <div className="space-y-2">
              {activity.map((a) => {
                const Icon = typeIcon(a.type);
                return (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-all">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/60 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/80 truncate">{a.title}</div>
                      <div className="text-[10px] text-white/40 capitalize">{a.type.replace('_', ' ')}</div>
                    </div>
                    <div className="text-[10px] text-white/40 shrink-0">{timeAgo(a.created_at)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass p-5">
          <h3 className="font-medium mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'New conversation', page: 'chat' as PageId, icon: MessageSquare },
              { label: 'Plan an agent task', page: 'agent' as PageId, icon: Bot },
              { label: 'Add a memory', page: 'memory' as PageId, icon: BrainCircuit },
              { label: 'Upload a document', page: 'documents' as PageId, icon: FileText },
              { label: 'Generate study notes', page: 'study' as PageId, icon: TrendingUp },
            ].map((q) => (
              <button key={q.label} onClick={() => onNavigate(q.page)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-all text-left group">
                <q.icon className="w-4 h-4 text-white/50 group-hover:text-neon-cyan" />
                <span className="text-sm text-white/70 group-hover:text-white">{q.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-neon-cyan ml-auto" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
