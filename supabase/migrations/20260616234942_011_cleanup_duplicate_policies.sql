/*
# Remove duplicate RLS policies

Several tables accumulated two identical policies for the same operation
due to migrations running DROP IF EXISTS + CREATE in sequence on the same
policy name, and earlier migrations using `_own_` naming while later ones
use shorter names. PostgreSQL allows both to coexist — but evaluates both,
which is wasteful and confusing.

Tables affected: chat_messages, flashcard_decks, flashcards, meals,
                 workouts, study_sessions

Strategy: keep the canonical short-name policies (select_*, insert_*,
delete_*, update_*) that were created in migrations 009/010, and drop the
legacy `*_own_*` duplicates created in migrations 003/006.
*/

-- chat_messages: keep select_chat_messages, insert_chat_messages
DROP POLICY IF EXISTS "select_own_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "insert_own_chat_messages" ON chat_messages;

-- flashcard_decks: keep select_flashcard_decks, insert_flashcard_decks,
--                       delete_flashcard_decks (update_own_flashcard_decks is
--                       the only update policy so keep it as-is)
DROP POLICY IF EXISTS "select_own_flashcard_decks" ON flashcard_decks;
DROP POLICY IF EXISTS "insert_own_flashcard_decks" ON flashcard_decks;
DROP POLICY IF EXISTS "delete_own_flashcard_decks" ON flashcard_decks;

-- flashcards: keep select_flashcards, insert_flashcards, delete_flashcards
--             (update_own_flashcards is the only update policy — keep it)
DROP POLICY IF EXISTS "select_own_flashcards" ON flashcards;
DROP POLICY IF EXISTS "insert_own_flashcards" ON flashcards;
DROP POLICY IF EXISTS "delete_own_flashcards" ON flashcards;

-- meals: keep select_meals, insert_meals, update_meals, delete_meals
DROP POLICY IF EXISTS "select_own_meals" ON meals;
DROP POLICY IF EXISTS "insert_own_meals" ON meals;
DROP POLICY IF EXISTS "update_own_meals" ON meals;
DROP POLICY IF EXISTS "delete_own_meals" ON meals;

-- workouts: keep select_workouts, insert_workouts, update_workouts, delete_workouts
DROP POLICY IF EXISTS "select_own_workouts" ON workouts;
DROP POLICY IF EXISTS "insert_own_workouts" ON workouts;
DROP POLICY IF EXISTS "update_own_workouts" ON workouts;
DROP POLICY IF EXISTS "delete_own_workouts" ON workouts;

-- study_sessions: keep select_study_sessions, insert_study_sessions,
--                      delete_study_sessions
--  (there is no update needed for study_sessions — add one for completeness)
DROP POLICY IF EXISTS "select_own_study_sessions" ON study_sessions;
DROP POLICY IF EXISTS "insert_own_study_sessions" ON study_sessions;
DROP POLICY IF EXISTS "delete_own_study_sessions" ON study_sessions;

-- Add the missing UPDATE policy on study_sessions so all four CRUD verbs
-- are covered (the timer reset flow could update a session in future).
DROP POLICY IF EXISTS "update_study_sessions" ON study_sessions;
CREATE POLICY "update_study_sessions" ON study_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
