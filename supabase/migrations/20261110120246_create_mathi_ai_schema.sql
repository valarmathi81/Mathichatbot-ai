/*
# MATHI AI - Core Schema

## Overview
Multi-user AI assistant platform. Each signed-in user owns their conversations, messages, memories, agent tasks, documents, and activity log.

## New Tables
1. `conversations` - Chat sessions (title, created/updated timestamps, pinned flag).
2. `messages` - Individual messages in a conversation (role: user/assistant/system, content, tokens).
3. `memories` - User-provided personal info (education, projects, skills, preferences) with category and key/value.
4. `agent_tasks` - AI Agent task plans (instruction, status, steps JSON, progress).
5. `documents` - Uploaded document metadata (name, type, size, extracted text, summary).
6. `activity` - AI activity log entries (type, title, metadata, timestamp).

## Security
- RLS enabled on every table.
- Grants to `authenticated` only (sign-in required).
- `service_role` granted on tables the edge function reads/writes.
- Owner-scoped CRUD policies using auth.uid() = user_id.
- user_id columns default to auth.uid() so client inserts that omit user_id succeed.
*/

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Conversation',
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated, service_role;

DROP POLICY IF EXISTS "select_own_conversations" ON conversations;
CREATE POLICY "select_own_conversations" ON conversations FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_conversations" ON conversations;
CREATE POLICY "insert_own_conversations" ON conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_conversations" ON conversations;
CREATE POLICY "update_own_conversations" ON conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_conversations" ON conversations;
CREATE POLICY "delete_own_conversations" ON conversations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated, service_role;
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

DROP POLICY IF EXISTS "select_own_messages" ON messages;
CREATE POLICY "select_own_messages" ON messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_messages" ON messages;
CREATE POLICY "insert_own_messages" ON messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_messages" ON messages;
CREATE POLICY "update_own_messages" ON messages FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_messages" ON messages;
CREATE POLICY "delete_own_messages" ON messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Memories
CREATE TABLE IF NOT EXISTS memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON memories TO authenticated, service_role;

DROP POLICY IF EXISTS "select_own_memories" ON memories;
CREATE POLICY "select_own_memories" ON memories FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_memories" ON memories;
CREATE POLICY "insert_own_memories" ON memories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_memories" ON memories;
CREATE POLICY "update_own_memories" ON memories FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_memories" ON memories;
CREATE POLICY "delete_own_memories" ON memories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Agent tasks
CREATE TABLE IF NOT EXISTS agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  instruction text NOT NULL,
  status text NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','awaiting_approval','running','completed','failed','cancelled')),
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_tasks TO authenticated, service_role;

DROP POLICY IF EXISTS "select_own_agent_tasks" ON agent_tasks;
CREATE POLICY "select_own_agent_tasks" ON agent_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_agent_tasks" ON agent_tasks;
CREATE POLICY "insert_own_agent_tasks" ON agent_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_agent_tasks" ON agent_tasks;
CREATE POLICY "update_own_agent_tasks" ON agent_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_agent_tasks" ON agent_tasks;
CREATE POLICY "delete_own_agent_tasks" ON agent_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_type text,
  file_size bigint DEFAULT 0,
  extracted_text text DEFAULT '',
  summary text,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','processing','ready','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated, service_role;

DROP POLICY IF EXISTS "select_own_documents" ON documents;
CREATE POLICY "select_own_documents" ON documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_documents" ON documents;
CREATE POLICY "insert_own_documents" ON documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_documents" ON documents;
CREATE POLICY "update_own_documents" ON documents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_documents" ON documents;
CREATE POLICY "delete_own_documents" ON documents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Activity log
CREATE TABLE IF NOT EXISTS activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'chat',
  title text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity TO authenticated, service_role;
CREATE INDEX IF NOT EXISTS idx_activity_user_created ON activity(user_id, created_at DESC);

DROP POLICY IF EXISTS "select_own_activity" ON activity;
CREATE POLICY "select_own_activity" ON activity FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_activity" ON activity;
CREATE POLICY "insert_own_activity" ON activity FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_activity" ON activity;
CREATE POLICY "delete_own_activity" ON activity FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conversations_updated ON conversations;
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_memories_updated ON memories;
CREATE TRIGGER trg_memories_updated BEFORE UPDATE ON memories FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_agent_tasks_updated ON agent_tasks;
CREATE TRIGGER trg_agent_tasks_updated BEFORE UPDATE ON agent_tasks FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
