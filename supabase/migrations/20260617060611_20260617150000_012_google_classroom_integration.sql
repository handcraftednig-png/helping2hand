/*
# Google Classroom integration

1. New table `classroom_connections` — stores each user's Google OAuth
   tokens scoped for Classroom read access (separate from their Supabase
   login session).
2. `assignments` gets `external_source`/`external_id` so synced
   coursework can be upserted on re-sync instead of duplicating.
*/

CREATE TABLE classroom_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ
);

ALTER TABLE classroom_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_classroom_connection" ON classroom_connections FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_classroom_connection" ON classroom_connections FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_classroom_connection" ON classroom_connections FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_classroom_connection" ON classroom_connections FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS external_source TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS assignments_external_unique
  ON assignments (user_id, external_source, external_id)
  WHERE external_id IS NOT NULL;
