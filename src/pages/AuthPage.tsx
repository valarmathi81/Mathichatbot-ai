import { useState } from 'react';
import { Brain, Lock, Mail, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Orb } from '@/components/Orb';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) setError(error);
  };

  return (
    <div className="min-h-screen bg-aurora flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      {/* floating glow blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-30 bg-neon-purple animate-orb-pulse" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-25 bg-neon-blue animate-glow-pulse" />

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left — brand + orb */}
        <div className="hidden lg:flex flex-col items-center text-center px-6 animate-fade-in">
          <Orb size={180} />
          <div className="mt-8 flex items-center gap-2">
            <span className="chip"><Sparkles className="w-3 h-3 text-neon-cyan" /> Year 2035 Edition</span>
          </div>
          <h1 className="mt-4 text-4xl font-display font-bold">
            <span className="shimmer-text">MATHI AI</span>
          </h1>
          <p className="mt-2 text-lg text-white/60 font-display">The Future of Intelligence</p>
          <p className="mt-4 text-sm text-white/45 max-w-sm leading-relaxed">
            Your next-generation AI companion — chat, agents, memory, study tools, and document intelligence in one
            luminous interface.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {['Neural Chat', 'AI Agents', 'Smart Memory', 'Study Engine', 'Document IQ', 'Voice'].map((f) => (
              <span key={f} className="chip">{f}</span>
            ))}
          </div>
        </div>

        {/* Right — auth card */}
        <div className="glass-strong gradient-border p-8 animate-fade-up">
          <div className="lg:hidden flex flex-col items-center mb-6">
            <Orb size={96} />
            <h1 className="mt-4 text-2xl font-display font-bold shimmer-text">MATHI AI</h1>
            <p className="text-sm text-white/50">The Future of Intelligence</p>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-neon-purple" />
            <h2 className="text-xl font-semibold">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
          </div>
          <p className="text-sm text-white/50 mb-6">
            {mode === 'signin' ? 'Sign in to enter the neural interface.' : 'Join MATHI AI and start building your intelligence.'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field pl-10"
                  autoComplete="email"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-neon-pink bg-neon-pink/10 border border-neon-pink/30 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? (
                <span className="flex items-center gap-2"><Zap className="w-4 h-4 animate-pulse" /> Connecting…</span>
              ) : mode === 'signin' ? (
                <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Enter MATHI AI</span>
              ) : (
                <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Create Account</span>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-white/50">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="text-neon-cyan hover:underline font-medium"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
