export type Role = 'user' | 'assistant' | 'system';

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  user_id: string;
  role: Role;
  content: string;
  created_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export type AgentTaskStatus = 'planning' | 'awaiting_approval' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AgentStep {
  title: string;
  tool: string;
  description: string;
  needsApproval: boolean;
  status?: 'pending' | 'running' | 'done' | 'skipped';
}

export interface AgentTask {
  id: string;
  user_id: string;
  instruction: string;
  status: AgentTaskStatus;
  steps: AgentStep[];
  result: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  user_id: string;
  filename: string;
  file_type: string | null;
  file_size: number;
  extracted_text: string;
  summary: string | null;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  created_at: string;
}

export interface ActivityRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
