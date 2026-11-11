import { useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { NAV, type PageId, LogOut, Sparkles } from '@/lib/nav';
import { Orb } from '@/components/Orb';

interface ShellProps {
  current: PageId;
  onNavigate: (p: PageId) => void;
  children: ReactNode;
}

export function AppShell({ current, onNavigate, children }: ShellProps) {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (p: PageId) => {
    onNavigate(p);
    setMobileOpen(false);
  };

  const Sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 flex items-center gap-3">
        <Orb size={40} />
        <div>
          <div className="font-display font-bold text-lg leading-none shimmer-text">MATHI AI</div>
          <div className="text-[10px] text-white/40 tracking-widest uppercase mt-1">Future of Intelligence</div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = current === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group relative ${
                active ? 'text-white' : 'text-white/55 hover:text-white/90 hover:bg-white/[0.04]'
              }`}
            >
              {active && (
                <span
                  className="absolute inset-0 rounded-xl border border-white/10"
                  style={{ background: 'linear-gradient(90deg, rgba(118,43,255,0.22), rgba(0,217,255,0.10))' }}
                />
              )}
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-neon-purple shadow-[0_0_12px_#762bff]" />}
              <Icon className={`w-4.5 h-4.5 relative z-10 ${active ? 'text-neon-cyan' : ''}`} style={{ width: 18, height: 18 }} />
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/5">
        <div className="glass px-3 py-2.5 mb-2 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="text-xs text-white/60 truncate">{user?.email}</span>
        </div>
        <button onClick={signOut} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-white/55 hover:text-neon-pink hover:bg-neon-pink/5 transition-all">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-aurora relative">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 glass border-r border-white/[0.06] z-30">
        {Sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 glass-strong border-r border-white/10 animate-fade-in">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-white/60 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            {Sidebar}
          </div>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64 relative z-10">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 glass border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="btn-ghost !p-2">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Orb size={26} />
            <span className="font-display font-bold shimmer-text">MATHI AI</span>
          </div>
        </div>

        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, icon, action }: { title: string; subtitle: string; icon: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl glass flex items-center justify-center text-neon-cyan">{icon}</div>
        <div>
          <h1 className="text-xl font-display font-semibold">{title}</h1>
          <p className="text-sm text-white/50">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
