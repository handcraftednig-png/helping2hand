-- Add grade and exam fields to assignments table
ALTER TABLE assignments ADD COLUMN grade DECIMAL(5,2);
ALTER TABLE assignments ADD COLUMN max_grade DECIMAL(5,2) DEFAULT 100;
ALTER TABLE assignments ADD COLUMN is_exam BOOLEAN DEFAULT false;
ALTER TABLE assignments ADD COLUMN weight DECIMAL(5,2) DEFAULT 1;
ALTER TABLE assignments ADD COLUMN feedback TEXT;

-- Create exams table for stand-alone exam tracking
CREATE TABLE exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  exam_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  notes TEXT,
  grade DECIMAL(5,2),
  max_grade DECIMAL(5,2) DEFAULT 100,
  weight DECIMAL(5,2) DEFAULT 1,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'missed'))
);

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_exams" ON exams FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_exams" ON exams FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_exams" ON exams FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_exams" ON exams FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Create course_grades table for tracking course grades
CREATE TABLE course_grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  course_name TEXT NOT NULL,
  current_grade DECIMAL(5,2),
  target_grade DECIMAL(5,2),
  semester TEXT
);

ALTER TABLE course_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_course_grades" ON course_grades FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_course_grades" ON course_grades FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_course_grades" ON course_grades FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_course_grades" ON course_grades FOR DELETE
  TO authenticated USING (auth.uid() = user_id);