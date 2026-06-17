-- ============================================================
-- Combined schema setup for helping2hand
-- Run this once in the Supabase SQL Editor for a fresh project.
-- Equivalent to running all migrations in supabase/migrations/ in order.
-- ============================================================

-- ── 001_initial_schema ──────────────────────────────────────────────────────
CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (true);

CREATE TABLE assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  due_date DATE NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed'))
);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_assignments" ON assignments FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_assignments" ON assignments FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_assignments" ON assignments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_assignments" ON assignments FOR DELETE
  TO authenticated USING (true);

CREATE TABLE study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subject TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  notes TEXT,
  date DATE NOT NULL
);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_study_sessions" ON study_sessions FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_study_sessions" ON study_sessions FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "delete_study_sessions" ON study_sessions FOR DELETE
  TO authenticated USING (true);

CREATE TABLE meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  date DATE NOT NULL,
  notes TEXT
);

ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_meals" ON meals FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_meals" ON meals FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_meals" ON meals FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_meals" ON meals FOR DELETE
  TO authenticated USING (true);

CREATE TABLE workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  calories_burned INTEGER,
  notes TEXT,
  date DATE NOT NULL
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_workouts" ON workouts FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_workouts" ON workouts FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_workouts" ON workouts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_workouts" ON workouts FOR DELETE
  TO authenticated USING (true);

CREATE TABLE flashcard_decks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  cards_count INTEGER DEFAULT 0
);

ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_flashcard_decks" ON flashcard_decks FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_flashcard_decks" ON flashcard_decks FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "delete_flashcard_decks" ON flashcard_decks FOR DELETE
  TO authenticated USING (true);

CREATE TABLE flashcards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deck_id UUID REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL
);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_flashcards" ON flashcards FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_flashcards" ON flashcards FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "delete_flashcards" ON flashcards FOR DELETE
  TO authenticated USING (true);

-- ── 002_add_user_id_columns ──────────────────────────────────────────────────
ALTER TABLE chat_messages ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE assignments ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE study_sessions ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE meals ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE workouts ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE flashcard_decks ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE flashcards ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- ── 003_complete_user_ownership ──────────────────────────────────────────────
ALTER TABLE chat_messages ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE assignments ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE study_sessions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE meals ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE workouts ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE flashcard_decks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE flashcards ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "update_own_flashcard_decks" ON flashcard_decks;
CREATE POLICY "update_own_flashcard_decks" ON flashcard_decks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_flashcards" ON flashcards;
CREATE POLICY "update_own_flashcards" ON flashcards FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM flashcard_decks
      WHERE flashcard_decks.id = flashcards.deck_id
      AND flashcard_decks.user_id = auth.uid()
    )
  );

ALTER TABLE chat_messages ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE assignments ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE study_sessions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE meals ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE workouts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE flashcard_decks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE flashcards ALTER COLUMN user_id SET NOT NULL;

-- ── 004_add_exams_and_grades ─────────────────────────────────────────────────
ALTER TABLE assignments ADD COLUMN grade DECIMAL(5,2);
ALTER TABLE assignments ADD COLUMN max_grade DECIMAL(5,2) DEFAULT 100;
ALTER TABLE assignments ADD COLUMN is_exam BOOLEAN DEFAULT false;
ALTER TABLE assignments ADD COLUMN weight DECIMAL(5,2) DEFAULT 1;
ALTER TABLE assignments ADD COLUMN feedback TEXT;

CREATE TABLE exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  notes TEXT,
  grade DECIMAL(5,2),
  max_grade DECIMAL(5,2) DEFAULT 100,
  weight DECIMAL(5,2) DEFAULT 1,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'missed'))
);

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_exams" ON exams FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_exams" ON exams FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_exams" ON exams FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_exams" ON exams FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE course_grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  course_name TEXT NOT NULL,
  current_grade DECIMAL(5,2),
  target_grade DECIMAL(5,2),
  semester TEXT
);

ALTER TABLE course_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_course_grades" ON course_grades FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_course_grades" ON course_grades FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_course_grades" ON course_grades FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_course_grades" ON course_grades FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── 005_ai_config ────────────────────────────────────────────────────────────
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

-- ── 006_fix_rls_user_isolation ────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_assignments" ON assignments;
DROP POLICY IF EXISTS "update_assignments" ON assignments;
DROP POLICY IF EXISTS "delete_assignments" ON assignments;

CREATE POLICY "select_assignments" ON assignments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "update_assignments" ON assignments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_assignments" ON assignments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_meals" ON meals;
DROP POLICY IF EXISTS "update_meals" ON meals;
DROP POLICY IF EXISTS "delete_meals" ON meals;

CREATE POLICY "select_meals" ON meals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "update_meals" ON meals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_meals" ON meals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_workouts" ON workouts;
DROP POLICY IF EXISTS "update_workouts" ON workouts;
DROP POLICY IF EXISTS "delete_workouts" ON workouts;

CREATE POLICY "select_workouts" ON workouts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "update_workouts" ON workouts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_workouts" ON workouts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_flashcard_decks" ON flashcard_decks;
DROP POLICY IF EXISTS "delete_flashcard_decks" ON flashcard_decks;

CREATE POLICY "select_flashcard_decks" ON flashcard_decks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete_flashcard_decks" ON flashcard_decks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_flashcards" ON flashcards;
DROP POLICY IF EXISTS "delete_flashcards" ON flashcards;

CREATE POLICY "select_flashcards" ON flashcards FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM flashcard_decks
      WHERE flashcard_decks.id = flashcards.deck_id
        AND flashcard_decks.user_id = auth.uid()
    )
  );
CREATE POLICY "delete_flashcards" ON flashcards FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM flashcard_decks
      WHERE flashcard_decks.id = flashcards.deck_id
        AND flashcard_decks.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "select_chat_messages" ON chat_messages;

CREATE POLICY "select_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_study_sessions" ON study_sessions;
DROP POLICY IF EXISTS "delete_study_sessions" ON study_sessions;

CREATE POLICY "select_study_sessions" ON study_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete_study_sessions" ON study_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

ALTER TABLE exams ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE exams ALTER COLUMN user_id SET NOT NULL;

-- ── 007_smart_schedule ───────────────────────────────────────────────────────
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

-- ── 008_nutrition_fitness_profiles ───────────────────────────────────────────
ALTER TABLE meals ADD COLUMN IF NOT EXISTS fat INTEGER;

CREATE TABLE nutrition_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_calories INT NOT NULL DEFAULT 2000,
  daily_protein  INT NOT NULL DEFAULT 150,
  daily_carbs    INT NOT NULL DEFAULT 200,
  daily_fat      INT NOT NULL DEFAULT 65,
  goal TEXT NOT NULL DEFAULT 'maintain' CHECK (goal IN ('lose','maintain','gain'))
);
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_nutgoal"  ON nutrition_goals FOR SELECT    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ins_nutgoal"  ON nutrition_goals FOR INSERT    TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "upd_nutgoal"  ON nutrition_goals FOR UPDATE    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "del_nutgoal"  ON nutrition_goals FOR DELETE    TO authenticated USING (auth.uid() = user_id);

CREATE TABLE grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  category TEXT DEFAULT 'Other',
  checked BOOLEAN DEFAULT FALSE,
  auto_generated BOOLEAN DEFAULT FALSE
);
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_grocery"  ON grocery_items FOR SELECT    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ins_grocery"  ON grocery_items FOR INSERT    TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "upd_grocery"  ON grocery_items FOR UPDATE    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "del_grocery"  ON grocery_items FOR DELETE    TO authenticated USING (auth.uid() = user_id);

CREATE TABLE fitness_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL DEFAULT 'general' CHECK (goal IN ('weight_loss','muscle_gain','endurance','strength','general')),
  fitness_level TEXT NOT NULL DEFAULT 'beginner' CHECK (fitness_level IN ('beginner','intermediate','advanced')),
  weekly_target INT NOT NULL DEFAULT 3,
  notes TEXT
);
ALTER TABLE fitness_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_fitprof"  ON fitness_profile FOR SELECT    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ins_fitprof"  ON fitness_profile FOR INSERT    TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "upd_fitprof"  ON fitness_profile FOR UPDATE    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "del_fitprof"  ON fitness_profile FOR DELETE    TO authenticated USING (auth.uid() = user_id);

-- ── add_auth_uid_defaults_and_cleanup_policies ───────────────────────────────
ALTER TABLE fitness_profile ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE grocery_items ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE nutrition_goals ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE schedule_blocks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE user_goals ALTER COLUMN user_id SET DEFAULT auth.uid();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'user_id') THEN
    ALTER TABLE assignments ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'user_id') THEN
    ALTER TABLE exams ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcard_decks' AND column_name = 'user_id') THEN
    ALTER TABLE flashcard_decks ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'user_id') THEN
    ALTER TABLE flashcards ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'study_sessions' AND column_name = 'user_id') THEN
    ALTER TABLE study_sessions ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workouts' AND column_name = 'user_id') THEN
    ALTER TABLE workouts ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meals' AND column_name = 'user_id') THEN
    ALTER TABLE meals ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can insert own fitness_profile" ON fitness_profile;
DROP POLICY IF EXISTS "Users can select own fitness_profile" ON fitness_profile;
DROP POLICY IF EXISTS "Users can update own fitness_profile" ON fitness_profile;
DROP POLICY IF EXISTS "Users can delete own fitness_profile" ON fitness_profile;

DROP POLICY IF EXISTS "Users can insert own grocery_items" ON grocery_items;
DROP POLICY IF EXISTS "Users can select own grocery_items" ON grocery_items;
DROP POLICY IF EXISTS "Users can update own grocery_items" ON grocery_items;
DROP POLICY IF EXISTS "Users can delete own grocery_items" ON grocery_items;

DROP POLICY IF EXISTS "Users can insert own nutrition_goals" ON nutrition_goals;
DROP POLICY IF EXISTS "Users can select own nutrition_goals" ON nutrition_goals;
DROP POLICY IF EXISTS "Users can update own nutrition_goals" ON nutrition_goals;
DROP POLICY IF EXISTS "Users can delete own nutrition_goals" ON nutrition_goals;

DROP POLICY IF EXISTS "Users can insert own schedule_blocks" ON schedule_blocks;
DROP POLICY IF EXISTS "Users can select own schedule_blocks" ON schedule_blocks;
DROP POLICY IF EXISTS "Users can update own schedule_blocks" ON schedule_blocks;
DROP POLICY IF EXISTS "Users can delete own schedule_blocks" ON schedule_blocks;

DROP POLICY IF EXISTS "Users can insert own user_goals" ON user_goals;
DROP POLICY IF EXISTS "Users can select own user_goals" ON user_goals;
DROP POLICY IF EXISTS "Users can update own user_goals" ON user_goals;
DROP POLICY IF EXISTS "Users can delete own user_goals" ON user_goals;

-- ── 009_fix_assignments_policies ─────────────────────────────────────────────
DROP POLICY IF EXISTS "delete_assignments" ON assignments;
DROP POLICY IF EXISTS "delete_own_assignments" ON assignments;
DROP POLICY IF EXISTS "insert_own_assignments" ON assignments;
DROP POLICY IF EXISTS "select_assignments" ON assignments;
DROP POLICY IF EXISTS "select_own_assignments" ON assignments;
DROP POLICY IF EXISTS "update_assignments" ON assignments;
DROP POLICY IF EXISTS "update_own_assignments" ON assignments;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'user_id' AND column_default LIKE '%auth.uid%'
  ) THEN
    ALTER TABLE assignments ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_select" ON assignments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "assignments_insert" ON assignments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assignments_update" ON assignments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assignments_delete" ON assignments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── 010_fix_insert_policies_and_block_types ──────────────────────────────────
DROP POLICY IF EXISTS "insert_meals" ON meals;
CREATE POLICY "insert_meals" ON meals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_workouts" ON workouts;
CREATE POLICY "insert_workouts" ON workouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_study_sessions" ON study_sessions;
CREATE POLICY "insert_study_sessions" ON study_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_flashcard_decks" ON flashcard_decks;
CREATE POLICY "insert_flashcard_decks" ON flashcard_decks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_flashcards" ON flashcards;
CREATE POLICY "insert_flashcards" ON flashcards FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM flashcard_decks WHERE flashcard_decks.id = flashcards.deck_id AND flashcard_decks.user_id = auth.uid())
);

DROP POLICY IF EXISTS "insert_chat_messages" ON chat_messages;
CREATE POLICY "insert_chat_messages" ON chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

ALTER TABLE schedule_blocks DROP CONSTRAINT IF EXISTS schedule_blocks_type_check;
ALTER TABLE schedule_blocks ADD CONSTRAINT schedule_blocks_type_check
  CHECK (type IN ('study','workout','reminder','class','reading','sleep','other'));

-- ── 011_cleanup_duplicate_policies ───────────────────────────────────────────
DROP POLICY IF EXISTS "select_own_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "insert_own_chat_messages" ON chat_messages;

DROP POLICY IF EXISTS "select_own_flashcard_decks" ON flashcard_decks;
DROP POLICY IF EXISTS "insert_own_flashcard_decks" ON flashcard_decks;
DROP POLICY IF EXISTS "delete_own_flashcard_decks" ON flashcard_decks;

DROP POLICY IF EXISTS "select_own_flashcards" ON flashcards;
DROP POLICY IF EXISTS "insert_own_flashcards" ON flashcards;
DROP POLICY IF EXISTS "delete_own_flashcards" ON flashcards;

DROP POLICY IF EXISTS "select_own_meals" ON meals;
DROP POLICY IF EXISTS "insert_own_meals" ON meals;
DROP POLICY IF EXISTS "update_own_meals" ON meals;
DROP POLICY IF EXISTS "delete_own_meals" ON meals;

DROP POLICY IF EXISTS "select_own_workouts" ON workouts;
DROP POLICY IF EXISTS "insert_own_workouts" ON workouts;
DROP POLICY IF EXISTS "update_own_workouts" ON workouts;
DROP POLICY IF EXISTS "delete_own_workouts" ON workouts;

DROP POLICY IF EXISTS "select_own_study_sessions" ON study_sessions;
DROP POLICY IF EXISTS "insert_own_study_sessions" ON study_sessions;
DROP POLICY IF EXISTS "delete_own_study_sessions" ON study_sessions;

DROP POLICY IF EXISTS "update_study_sessions" ON study_sessions;
CREATE POLICY "update_study_sessions" ON study_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── add_chat_session_id ──────────────────────────────────────────────────────
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_id TEXT NOT NULL DEFAULT 'main';

-- ── google_classroom_integration ─────────────────────────────────────────────
CREATE TABLE classroom_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ
);

ALTER TABLE classroom_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_classroom_connection" ON classroom_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_classroom_connection" ON classroom_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_classroom_connection" ON classroom_connections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_classroom_connection" ON classroom_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS external_source TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS assignments_external_unique
  ON assignments (user_id, external_source, external_id)
  WHERE external_id IS NOT NULL;
