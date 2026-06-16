-- Fix all SELECT/UPDATE/DELETE policies to properly isolate data per user.
-- The original policies used USING (true) which exposed all users' data.

-- ── assignments ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_assignments" ON assignments;
DROP POLICY IF EXISTS "update_assignments" ON assignments;
DROP POLICY IF EXISTS "delete_assignments" ON assignments;

CREATE POLICY "select_assignments" ON assignments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "update_assignments" ON assignments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_assignments" ON assignments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── meals ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_meals" ON meals;
DROP POLICY IF EXISTS "update_meals" ON meals;
DROP POLICY IF EXISTS "delete_meals" ON meals;

CREATE POLICY "select_meals" ON meals FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "update_meals" ON meals FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_meals" ON meals FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── workouts ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_workouts" ON workouts;
DROP POLICY IF EXISTS "update_workouts" ON workouts;
DROP POLICY IF EXISTS "delete_workouts" ON workouts;

CREATE POLICY "select_workouts" ON workouts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "update_workouts" ON workouts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_workouts" ON workouts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── flashcard_decks ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_flashcard_decks" ON flashcard_decks;
DROP POLICY IF EXISTS "delete_flashcard_decks" ON flashcard_decks;

CREATE POLICY "select_flashcard_decks" ON flashcard_decks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete_flashcard_decks" ON flashcard_decks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── flashcards ────────────────────────────────────────────────────────────────
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

-- ── chat_messages ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_chat_messages" ON chat_messages;

CREATE POLICY "select_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- ── study_sessions ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_study_sessions" ON study_sessions;
DROP POLICY IF EXISTS "delete_study_sessions" ON study_sessions;

CREATE POLICY "select_study_sessions" ON study_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete_study_sessions" ON study_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ── exams user_id default ────────────────────────────────────────────────────
-- exams.user_id has no default; set it so inserts without explicit user_id work
ALTER TABLE exams ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE exams ALTER COLUMN user_id SET NOT NULL;
