/*
# Custom goal colors and preferred times

## Changes
- user_goals.preferred_time: optional HH:MM the user wants this goal scheduled
  at. generateSchedule() falls back to its existing per-type defaults when null.
- schedule_blocks.color: optional hex override so blocks generated from a goal
  (or created manually) can carry a custom color instead of always deriving it
  from the static per-type color map in the client.
*/

ALTER TABLE user_goals ADD COLUMN IF NOT EXISTS preferred_time TEXT;

ALTER TABLE schedule_blocks ADD COLUMN IF NOT EXISTS color TEXT;
