-- Goals users want to achieve (study, workout, etc.)
CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'study' CHECK (type IN ('study','workout','reading','sleep','other')),
  target_minutes INT NOT NULL DEFAULT 30,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekdays','weekends','weekly')),
  color TEXT DEFAULT '#D4A017'
);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_goals" ON user_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_goals" ON user_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_goals" ON user_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_goals" ON user_goals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Auto-generated and manual schedule blocks
CREATE TABLE schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'study' CHECK (type IN ('study','workout','reminder','class','other')),
  start_time TEXT,
  duration_minutes INT DEFAULT 60,
  completed BOOLEAN DEFAULT FALSE,
  auto_generated BOOLEAN DEFAULT FALSE,
  notes TEXT
);

ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_blocks" ON schedule_blocks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_blocks" ON schedule_blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_blocks" ON schedule_blocks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_blocks" ON schedule_blocks FOR DELETE TO authenticated USING (auth.uid() = user_id);
