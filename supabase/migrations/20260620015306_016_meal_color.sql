/*
# Custom meal colors

## Changes
- meals.color: optional hex override so a logged meal can carry a custom
  color instead of always deriving it from the static per-meal-type color
  map in the client.
*/

ALTER TABLE meals ADD COLUMN IF NOT EXISTS color TEXT;
