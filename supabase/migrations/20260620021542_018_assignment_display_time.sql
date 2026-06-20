/*
# Give exams/assignments a slot in the schedule grid

## Changes
- assignments.display_time: optional HH:MM the exam/assignment should occupy
  in the Schedule week grid. generateSchedule() assigns a conflict-checked
  default (exam 09:00, due 17:00) the first time it runs if unset, so goals
  and study sessions never get placed on top of them.
*/

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS display_time TEXT;
