/*
# Add DEFAULT auth.uid() to owner columns and clean up duplicate RLS policies

1. Changes
   - Add `DEFAULT auth.uid()` to user_id on: fitness_profile, grocery_items,
     nutrition_goals, schedule_blocks, user_goals, assignments, exams,
     flashcard_decks, flashcards, study_sessions, workouts, meals
   - Drop duplicate/legacy RLS policies that were created without the _own_ prefix
     (the newer _own_ variants already exist and are correct)

2. Purpose
   - Belt-and-suspenders safety: even if the frontend omits user_id on an insert,
     the DB fills it from the authenticated session. Prevents RLS WITH CHECK failures.
   - Deduplicates policies for clarity.

3. Notes
   - All ALTER COLUMN statements use idempotent pattern; safe to re-run.
   - DROP POLICY IF EXISTS makes each policy removal a no-op when already gone.
*/

-- fitness_profile
ALTER TABLE fitness_profile ALTER COLUMN user_id SET DEFAULT auth.uid();

-- grocery_items
ALTER TABLE grocery_items ALTER COLUMN user_id SET DEFAULT auth.uid();

-- nutrition_goals
ALTER TABLE nutrition_goals ALTER COLUMN user_id SET DEFAULT auth.uid();

-- schedule_blocks
ALTER TABLE schedule_blocks ALTER COLUMN user_id SET DEFAULT auth.uid();

-- user_goals
ALTER TABLE user_goals ALTER COLUMN user_id SET DEFAULT auth.uid();

-- assignments (if column exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assignments' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE assignments ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- exams
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exams' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE exams ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- flashcard_decks
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flashcard_decks' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE flashcard_decks ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- flashcards
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flashcards' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE flashcards ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- study_sessions
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_sessions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE study_sessions ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- workouts
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workouts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE workouts ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- meals (already has default, this is a no-op but safe)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meals' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE meals ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Clean up duplicate legacy policies (without _own_ prefix)
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
