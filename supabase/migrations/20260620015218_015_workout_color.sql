/*
# Custom workout colors

## Changes
- workouts.color: optional hex override so an individual logged workout can
  carry its own color instead of always deriving it from the static per-type
  color map in the client.
*/

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS color TEXT;
