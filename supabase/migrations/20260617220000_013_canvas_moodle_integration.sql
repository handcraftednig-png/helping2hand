/*
# Canvas and Moodle integration

Canvas and Moodle are self-hosted per school, so there's no single OAuth app
that works across institutions (unlike Google). Each user instead pastes
their school's site URL plus a personal access token they generate from
their own account settings.

1. New table `canvas_connections` — site URL + Canvas API token per user.
2. New table `moodle_connections` — site URL + Moodle web service token per
   user, plus the numeric `moodle_user_id` returned by the site (needed for
   the `core_enrol_get_users_courses` call).
*/

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
