import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ChatPage } from '@/pages/ChatPage';
import { AgentPage } from '@/pages/AgentPage';
import { MemoryPage } from '@/pages/MemoryPage';
import { StudyPage } from '@/pages/StudyPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { Orb } from '@/components/Orb';
import type { PageId } from '@/lib/nav';

function AppInner() {
  const { session, loading } = useAuth();
  const [page, setPage] = useState<PageId>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-aurora flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Orb size={96} thinking />
          <div className="text-sm text-white/50 shimmer-text">Initializing MATHI AI…</div>
        </div>
      </div>
    );
  }

  if (!session) return <AuthPage />;

  return (
    <AppShell current={page} onNavigate={setPage}>
      {page === 'dashboard' && <DashboardPage onNavigate={setPage} />}
      {page === 'chat' && <ChatPage />}
      {page === 'agent' && <AgentPage />}
      {page === 'memory' && <MemoryPage />}
      {page === 'study' && <StudyPage />}
      {page === 'documents' && <DocumentsPage />}
      {page === 'settings' && <SettingsPage />}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
