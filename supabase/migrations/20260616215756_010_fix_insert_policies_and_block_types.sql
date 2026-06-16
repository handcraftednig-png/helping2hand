/*
# Fix INSERT policies and schedule_blocks type constraint

## Problems fixed

### 1. Loose INSERT policies on core tables
meals, workouts, study_sessions, flashcard_decks, flashcards still had
`WITH CHECK (true)` from the initial migration. This allowed any authenticated
user to insert rows owned by any user_id. Now all inserts must satisfy
`auth.uid() = user_id`, consistent with the user-isolating SELECT/UPDATE/DELETE
policies added in migration 006.

### 2. schedule_blocks type CHECK constraint too narrow
The original CHECK only allowed: study | workout | reminder | class | other
The calendar generateSchedule() inserts blocks for goals whose type can be
`reading` or `sleep`, violating the constraint and silently discarding those blocks.
The CHECK is widened to include all goal types.

### 3. Missing chat_messages INSERT policy
The edge function uses the service role (bypasses RLS), but a client-side
INSERT policy is added for completeness and forward compatibility.

## Changes
- Drop and recreate INSERT policies for: meals, workouts, study_sessions,
  flashcard_decks, flashcards, chat_messages
- Widen schedule_blocks type CHECK to include reading, sleep
*/

-- ── meals ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "insert_meals" ON meals;
CREATE POLICY "insert_meals" ON meals FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── workouts ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "insert_workouts" ON workouts;
CREATE POLICY "insert_workouts" ON workouts FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── study_sessions ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "insert_study_sessions" ON study_sessions;
CREATE POLICY "insert_study_sessions" ON study_sessions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── flashcard_decks ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "insert_flashcard_decks" ON flashcard_decks;
CREATE POLICY "insert_flashcard_decks" ON flashcard_decks FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── flashcards ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "insert_flashcards" ON flashcards;
CREATE POLICY "insert_flashcards" ON flashcards FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM flashcard_decks
    WHERE flashcard_decks.id = flashcards.deck_id
      AND flashcard_decks.user_id = auth.uid()
  )
);

-- ── chat_messages INSERT ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "insert_chat_messages" ON chat_messages;
CREATE POLICY "insert_chat_messages" ON chat_messages FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── Widen schedule_blocks type constraint ──────────────────────────────────────
-- Drop the old CHECK constraint and add a wider one that includes goal types
ALTER TABLE schedule_blocks DROP CONSTRAINT IF EXISTS schedule_blocks_type_check;
ALTER TABLE schedule_blocks ADD CONSTRAINT schedule_blocks_type_check
  CHECK (type IN ('study','workout','reminder','class','reading','sleep','other'));
