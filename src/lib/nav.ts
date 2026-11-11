import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  BrainCircuit,
  GraduationCap,
  FileText,
  Settings,
  LogOut,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export type PageId = 'dashboard' | 'chat' | 'agent' | 'memory' | 'study' | 'documents' | 'settings';

export interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chat', label: 'AI Chat', icon: MessageSquare },
  { id: 'agent', label: 'AI Agent', icon: Bot },
  { id: 'memory', label: 'Memory', icon: BrainCircuit },
  { id: 'study', label: 'Study Assistant', icon: GraduationCap },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export { LogOut, Sparkles };
