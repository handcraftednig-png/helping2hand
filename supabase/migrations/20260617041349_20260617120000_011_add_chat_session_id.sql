/*
# Add session_id to chat_messages

Quick Action topics (Study Plan, Exam Prep, etc.) previously appended into
the same single conversation as the main chat. Adding session_id lets each
topic live in its own thread; the main chat only loads rows where
session_id = 'main'.

1. Modified Tables
- `chat_messages`: adds `session_id TEXT NOT NULL DEFAULT 'main'`
  - All existing rows get session_id = 'main' automatically via the DEFAULT
  - New rows from topic sessions use the topic session ID
  - New rows from the main chat use 'main'

2. Important Notes
- Existing conversation history is preserved — rows just get session_id = 'main'
- RLS policies are unchanged; ownership is still enforced via user_id
*/

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_id TEXT NOT NULL DEFAULT 'main';
