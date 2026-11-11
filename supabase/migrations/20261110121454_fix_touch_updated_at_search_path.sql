/*
# Fix: set search_path on touch_updated_at function

The database linter flagged touch_updated_at() for a mutable search_path.
Recreate the function with an explicit safe search_path, then reattach the existing triggers.
No data changes; triggers are dropped and recreated referencing the hardened function.
*/

DROP FUNCTION IF EXISTS public.touch_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversations_updated ON conversations;
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_memories_updated ON memories;
CREATE TRIGGER trg_memories_updated BEFORE UPDATE ON memories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_agent_tasks_updated ON agent_tasks;
CREATE TRIGGER trg_agent_tasks_updated BEFORE UPDATE ON agent_tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
