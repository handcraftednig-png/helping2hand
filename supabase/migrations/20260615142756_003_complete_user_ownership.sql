/*
# Complete user-ownership setup

1. Set default auth.uid() on user_id columns
2. Add missing policies for flashcard_decks and flashcards update
3. Ensure NOT NULL on user_id columns with default
*/

-- Set default auth.uid() on user_id columns
ALTER TABLE chat_messages ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE assignments ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE study_sessions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE meals ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE workouts ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE flashcard_decks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE flashcards ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Add missing update policy for flashcard_decks
DROP POLICY IF EXISTS "update_own_flashcard_decks" ON flashcard_decks;
CREATE POLICY "update_own_flashcard_decks" ON flashcard_decks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add update policy for flashcards
DROP POLICY IF EXISTS "update_own_flashcards" ON flashcards;
CREATE POLICY "update_own_flashcards" ON flashcards FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM flashcard_decks
      WHERE flashcard_decks.id = flashcards.deck_id
      AND flashcard_decks.user_id = auth.uid()
    )
  );

-- Make user_id NOT NULL (except for existing rows)
-- This ensures new rows always have user_id
ALTER TABLE chat_messages ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE assignments ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE study_sessions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE meals ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE workouts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE flashcard_decks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE flashcards ALTER COLUMN user_id SET NOT NULL;