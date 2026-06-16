-- Chat messages table
CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (true);

-- Homework/Assignments table
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

-- Study sessions table
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

-- Meal plans table
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

-- Fitness workouts table
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

-- Flashcard decks table
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

-- Flashcards table
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