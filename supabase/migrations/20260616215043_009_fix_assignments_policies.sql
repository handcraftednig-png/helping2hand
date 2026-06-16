/*
# Fix assignments table RLS policies

## Problem
The assignments table has duplicate policies (two SELECT, two UPDATE, two DELETE)
from previous migrations being re-applied. Duplicate policies cause unpredictable
evaluation order and can block otherwise-valid operations.

## Changes
1. Drop ALL existing assignments policies.
2. Re-create exactly four clean policies (one per CRUD verb).
3. Confirm user_id DEFAULT auth.uid() is in place (already set, idempotent DO block).

## Security
- All policies restrict to `authenticated` role only.
- Ownership enforced via `auth.uid() = user_id`.
- INSERT omits USING (only WITH CHECK applies to new rows).
- UPDATE has both USING (existing row check) and WITH CHECK (new row check).
*/

-- Drop all existing policies to eliminate duplicates
DROP POLICY IF EXISTS "delete_assignments" ON assignments;
DROP POLICY IF EXISTS "delete_own_assignments" ON assignments;
DROP POLICY IF EXISTS "insert_own_assignments" ON assignments;
DROP POLICY IF EXISTS "select_assignments" ON assignments;
DROP POLICY IF EXISTS "select_own_assignments" ON assignments;
DROP POLICY IF EXISTS "update_assignments" ON assignments;
DROP POLICY IF EXISTS "update_own_assignments" ON assignments;

-- Ensure the DEFAULT is present (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'assignments'
      AND column_name  = 'user_id'
      AND column_default LIKE '%auth.uid%'
  ) THEN
    ALTER TABLE assignments ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Four clean policies
CREATE POLICY "assignments_select"
ON assignments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "assignments_insert"
ON assignments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "assignments_update"
ON assignments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "assignments_delete"
ON assignments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
