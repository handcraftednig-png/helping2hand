-- AI configuration table: stores per-user dynamic system prompt
-- and a log of self-improvement actions.
CREATE TABLE ai_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  system_prompt text NOT NULL DEFAULT
    'You are Helping Hand AI, a helpful AI assistant for students. You help with:
- Study tips and techniques
- Explaining academic concepts
- Time management and organization
- Homework and assignment help
- Test preparation strategies
- Wellness and stress management

Be encouraging, supportive, and provide practical advice. Keep responses concise but helpful.',
  improvements_log jsonb NOT NULL DEFAULT '[]',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_ai_config" ON ai_config FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_ai_config" ON ai_config FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_ai_config" ON ai_config FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_ai_config" ON ai_config FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
