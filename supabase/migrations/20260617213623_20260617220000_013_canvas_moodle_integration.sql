CREATE TABLE canvas_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  access_token TEXT NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ
);

ALTER TABLE canvas_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_canvas_connection" ON canvas_connections FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_canvas_connection" ON canvas_connections FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_canvas_connection" ON canvas_connections FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_canvas_connection" ON canvas_connections FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE moodle_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  access_token TEXT NOT NULL,
  moodle_user_id TEXT NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ
);

ALTER TABLE moodle_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_moodle_connection" ON moodle_connections FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_moodle_connection" ON moodle_connections FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_moodle_connection" ON moodle_connections FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_moodle_connection" ON moodle_connections FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
