/*
# Add user_id ownership columns

Migration 003 (complete_user_ownership) sets DEFAULT auth.uid() and NOT NULL
on user_id for these tables, but no prior migration ever created the column.
This was applied by hand against the live database and never captured here,
so replaying migrations 001 -> 003 on a fresh database fails. This migration
restores the missing step: add the column (nullable, no default yet) so 003
can alter it as it expects.
*/

ALTER TABLE chat_messages ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE assignments ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE study_sessions ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE meals ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE workouts ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE flashcard_decks ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE flashcards ADD COLUMN user_id UUID REFERENCES auth.users(id);
