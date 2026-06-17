/*
# Add session_id to chat_messages

Quick Action topics (Study Plan, Exam Prep, etc.) previously appended into
the same single conversation as the main chat. Adding session_id lets each
topic live in its own thread; the main chat only loads rows where
session_id = 'main'.
*/

ALTER TABLE chat_messages ADD COLUMN session_id TEXT NOT NULL DEFAULT 'main';
