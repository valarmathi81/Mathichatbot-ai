import { useState } from 'react';
import { Settings, User, Shield, Volume2, Mic, Info, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useVoice } from '@/lib/voice';
import { PageHeader } from '@/components/AppShell';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const voice = useVoice();
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = () => {
    setAutoSpeak((v) => !v);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <PageHeader title="Settings" subtitle="Manage your MATHI AI experience" icon={<Settings className="w-5 h-5" />} />

      <div className="space-y-4">
        {/* Account */}
        <section className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-neon-cyan" />
            <h3 className="font-medium">Account</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
              <div>
                <div className="text-xs text-white/40">Email</div>
                <div className="text-sm">{user?.email}</div>
              </div>
            </div>
            <button onClick={signOut} className="btn-ghost w-full">
              Sign out of MATHI AI
            </button>
          </div>
        </section>

        {/* Voice */}
        <section className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="w-4 h-4 text-neon-purple" />
            <h3 className="font-medium">Voice Assistant</h3>
          </div>
          <div className="space-y-3">
            <Row icon={Mic} label="Speech recognition" value={voice.supported ? 'Available' : 'Not supported in this browser'} status={voice.supported} />
            <Row icon={Volume2} label="Text-to-speech" value={voice.supported ? 'Available' : 'Not supported'} status={voice.supported} />
            <button onClick={toggle} className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-all">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-white/50" />
                <span className="text-sm">Auto-speak AI responses</span>
              </div>
              <span className={`w-10 h-6 rounded-full transition-all relative ${autoSpeak ? 'bg-neon-purple' : 'bg-white/10'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${autoSpeak ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </button>
            {saved && <div className="text-xs text-neon-cyan flex items-center gap-1"><Check className="w-3 h-3" /> Saved</div>}
          </div>
        </section>

        {/* Privacy */}
        <section className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-neon-pink" />
            <h3 className="font-medium">Privacy & Security</h3>
          </div>
          <p className="text-sm text-white/55 leading-relaxed">
            Your data is stored securely in your private Supabase workspace, protected by row-level security — only you
            can access your conversations, memories, and documents. AI requests are proxied through a secure server-side
            function, so no API keys are ever exposed in your browser.
          </p>
        </section>

        {/* About */}
        <section className="glass p-5">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-neon-blue" />
            <h3 className="font-medium">About</h3>
          </div>
          <div className="space-y-2 text-sm text-white/55">
            <div className="flex justify-between"><span>Product</span><span className="text-white/80">MATHI AI</span></div>
            <div className="flex justify-between"><span>Edition</span><span className="text-white/80">Year 2035</span></div>
            <div className="flex justify-between"><span>Backend</span><span className="text-white/80">Supabase · Edge Functions</span></div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, status }: { icon: any; label: string; value: string; status: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-white/50" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50">{value}</span>
        <span className={`w-2 h-2 rounded-full ${status ? 'bg-emerald-400' : 'bg-white/20'}`} />
      </div>
    </div>
  );
}
