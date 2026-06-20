/*
# Flashcard deck custom color + design

## Changes
- flashcard_decks.color: optional hex override for the deck's accent color
  (icon, card border/background), instead of always deriving it from a hash
  of the subject name.
- flashcard_decks.design: visual style for the Study Mode flip-card —
  'classic' | 'minimal' | 'gradient' | 'outline'. Defaults to 'classic' to
  match the existing look for decks created before this column existed.
*/

ALTER TABLE flashcard_decks ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE flashcard_decks ADD COLUMN IF NOT EXISTS design TEXT DEFAULT 'classic';
