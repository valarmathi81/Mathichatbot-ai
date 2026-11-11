import { useEffect, useState } from 'react';
import {
  Bot,
  Play,
  CheckCircle2,
  Circle,
  Loader2,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
  ChevronRight,
  Wrench,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { planAgentTask, chat } from '@/lib/ai';
import type { AgentTask, AgentStep } from '@/lib/types';
import { Orb } from '@/components/Orb';
import { EmptyState, ErrorBanner, Markdown, TypingDots } from '@/components/Markdown';
import { PageHeader } from '@/components/AppShell';

const TOOL_ICONS: Record<string, string> = {
  research: '🔍',
  compute: '🧮',
  draft: '✍️',
  summarize: '📋',
  generate: '✨',
  memory_save: '🧠',
  none: '•',
};

export function AgentPage() {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [approval, setApproval] = useState<{ taskId: string; step: AgentStep; index: number } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('agent_tasks').select('*').order('created_at', { ascending: false }).limit(20);
    setTasks((data as AgentTask[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const text = instruction.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { data: memData } = await supabase.from('memories').select('title, content, category').limit(20);
      const memory = (memData as any[]) ?? [];
      const raw = await planAgentTask(text, memory);
      let steps: AgentStep[] = [];
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        const parsed = match ? JSON.parse(match[0]) : JSON.parse(raw);
        steps = (parsed.steps ?? []).map((s: any) => ({ ...s, status: 'pending' }));
      } catch {
        steps = [{ title: 'Execute instruction', tool: 'none', description: raw, needsApproval: false, status: 'pending' }];
      }
      const { data, error } = await supabase
        .from('agent_tasks')
        .insert({ instruction: text, status: 'awaiting_approval', steps })
        .select()
        .single();
      if (error) throw error;
      setTasks((t) => [data as AgentTask, ...t]);
      setInstruction('');
      await supabase.from('activity').insert({ type: 'agent', title: text.slice(0, 60), metadata: { task_id: (data as AgentTask).id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to plan task.');
    } finally {
      setBusy(false);
    }
  };

  const runStep = async (task: AgentTask, index: number) => {
    const step = task.steps[index];
    if (step.needsApproval) {
      setApproval({ taskId: task.id, step, index });
      return;
    }
    await executeStep(task, index);
  };

  const executeStep = async (task: AgentTask, index: number): Promise<AgentTask | null> => {
    setApproval(null);
    const steps = task.steps.map((s, i) => (i === index ? { ...s, status: 'running' as const } : s));
    await supabase.from('agent_tasks').update({ steps, status: 'running' }).eq('id', task.id);
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, steps, status: 'running' } : t)));

    try {
      const messages = [
        { role: 'user', content: task.instruction },
        { role: 'user', content: `Step: ${steps[index].title} — ${steps[index].description}. Perform this step and return the result.` },
      ];
      const reply = await chat(messages);
      const finalSteps = steps.map((s, i) => (i === index ? { ...s, status: 'done' as const } : s));
      const allDone = finalSteps.every((s) => s.status === 'done');
      const { data } = await supabase
        .from('agent_tasks')
        .update({ steps: finalSteps, status: allDone ? 'completed' : 'running', result: allDone ? reply : null })
        .eq('id', task.id)
        .select()
        .single();
      const updated = data as AgentTask;
      setTasks((ts) => ts.map((t) => (t.id === task.id ? updated : t)));
      if (allDone) {
        await supabase.from('activity').insert({ type: 'agent_done', title: `Completed: ${task.instruction.slice(0, 50)}`, metadata: {} });
      }
      return updated;
    } catch (e) {
      const failedSteps = steps.map((s, i) => (i === index ? { ...s, status: 'pending' as const } : s));
      await supabase.from('agent_tasks').update({ steps: failedSteps, status: 'failed' }).eq('id', task.id);
      setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, steps: failedSteps, status: 'failed' } : t)));
      setError(e instanceof Error ? e.message : 'Step failed.');
      return null;
    }
  };

  const runAll = async (task: AgentTask) => {
    let current = task;
    for (let i = 0; i < current.steps.length; i++) {
      if (current.steps[i].status === 'done') continue;
      if (current.steps[i].needsApproval) {
        setApproval({ taskId: current.id, step: current.steps[i], index: i });
        return;
      }
      const updated = await executeStep(current, i);
      if (!updated) return;
      current = updated;
    }
  };

  const removeTask = async (id: string) => {
    await supabase.from('agent_tasks').delete().eq('id', id);
    setTasks((t) => t.filter((x) => x.id !== id));
  };

  const statusColor = (s: AgentTask['status']) =>
    s === 'completed' ? 'text-emerald-400' : s === 'running' ? 'text-neon-cyan' : s === 'failed' ? 'text-neon-pink' : 'text-white/50';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="AI Agent"
        subtitle="Breaks complex tasks into steps and executes them"
        icon={<Bot className="w-5 h-5" />}
      />

      {/* Composer */}
      <div className="glass p-4 mb-6 animate-fade-up">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-neon-cyan" />
          <span className="text-sm font-medium">Give the agent an instruction</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. Research the latest advances in fusion energy, draft a summary, and save it to my memory."
            rows={2}
            className="input-field flex-1 resize-none"
          />
          <button onClick={create} disabled={busy || !instruction.trim()} className="btn-primary sm:w-40">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Planning…</> : <><Play className="w-4 h-4" /> Plan Task</>}
          </button>
        </div>
        {busy && <div className="mt-3"><TypingDots /></div>}
        {error && <div className="mt-3"><ErrorBanner message={error} onRetry={() => setError(null)} /></div>}
      </div>

      {/* Tasks */}
      {loading ? (
        <div className="text-white/40 text-sm">Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <EmptyState icon={<Bot className="w-7 h-7" />} title="No agent tasks yet" subtitle="Describe a task above and MATHI AI will plan and execute it step by step." />
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="glass p-4 animate-fade-up">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 min-w-0">
                  <Orb size={36} thinking={task.status === 'running'} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white/90 truncate">{task.instruction}</div>
                    <div className={`text-xs ${statusColor(task.status)} capitalize mt-0.5`}>
                      {task.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {task.status === 'awaiting_approval' && (
                    <button onClick={() => runAll(task)} className="btn-ghost !py-1.5 !px-3 text-xs">
                      <Play className="w-3.5 h-3.5" /> Run all
                    </button>
                  )}
                  <button onClick={() => removeTask(task.id)} className="text-white/40 hover:text-neon-pink p-1.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {task.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 group">
                    <div className="shrink-0 mt-0.5">
                      {step.status === 'done' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : step.status === 'running' ? (
                        <Loader2 className="w-5 h-5 text-neon-cyan animate-spin" />
                      ) : (
                        <Circle className="w-5 h-5 text-white/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white/85">{step.title}</span>
                        <span className="chip !py-0.5 !text-[10px]">
                          <Wrench className="w-3 h-3" /> {TOOL_ICONS[step.tool] ?? '•'} {step.tool}
                        </span>
                        {step.needsApproval && (
                          <span className="chip !py-0.5 !text-[10px] border-amber-400/30 text-amber-300">
                            <ShieldAlert className="w-3 h-3" /> needs approval
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">{step.description}</p>
                    </div>
                    {step.status === 'pending' && task.status !== 'completed' && (
                      <button onClick={() => runStep(task, i)} className="opacity-0 group-hover:opacity-100 btn-ghost !py-1 !px-2 text-xs shrink-0">
                        <ChevronRight className="w-3.5 h-3.5" /> Run
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Result */}
              {task.result && (
                <div className="mt-4 glass-strong p-4 border-neon-cyan/20">
                  <div className="flex items-center gap-2 mb-2 text-xs text-neon-cyan">
                    <CheckCircle2 className="w-4 h-4" /> Result
                  </div>
                  <Markdown content={task.result} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approval modal */}
      {approval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setApproval(null)} />
          <div className="relative glass-strong gradient-border p-6 max-w-md w-full animate-fade-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-semibold">Permission required</h3>
                <p className="text-xs text-white/50">This step is marked as sensitive.</p>
              </div>
            </div>
            <div className="glass p-3 mb-4">
              <div className="text-sm font-medium">{approval.step.title}</div>
              <div className="text-xs text-white/50 mt-1">{approval.step.description}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setApproval(null)} className="btn-ghost flex-1">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={() => {
                  const t = tasks.find((x) => x.id === approval.taskId);
                  if (t) executeStep(t, approval.index);
                }}
                className="btn-primary flex-1"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve & run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
