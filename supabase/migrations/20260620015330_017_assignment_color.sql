/*
# Custom assignment/exam colors

## Changes
- assignments.color: optional hex override so individual assignments and exams
  (is_exam=true rows in the same table) can carry a custom color instead of
  always deriving it from the subject-name hash in the client.
*/

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS color TEXT;
