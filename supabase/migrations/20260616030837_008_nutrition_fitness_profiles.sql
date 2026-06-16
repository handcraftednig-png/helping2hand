-- Add fat macro to meals
ALTER TABLE meals ADD COLUMN IF NOT EXISTS fat INTEGER;

-- Nutrition goals per user
CREATE TABLE nutrition_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_calories INT NOT NULL DEFAULT 2000,
  daily_protein  INT NOT NULL DEFAULT 150,
  daily_carbs    INT NOT NULL DEFAULT 200,
  daily_fat      INT NOT NULL DEFAULT 65,
  goal TEXT NOT NULL DEFAULT 'maintain' CHECK (goal IN ('lose','maintain','gain'))
);
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_nutgoal"  ON nutrition_goals FOR SELECT    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ins_nutgoal"  ON nutrition_goals FOR INSERT    TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "upd_nutgoal"  ON nutrition_goals FOR UPDATE    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "del_nutgoal"  ON nutrition_goals FOR DELETE    TO authenticated USING (auth.uid() = user_id);

-- Grocery list
CREATE TABLE grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  category TEXT DEFAULT 'Other',
  checked BOOLEAN DEFAULT FALSE,
  auto_generated BOOLEAN DEFAULT FALSE
);
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_grocery"  ON grocery_items FOR SELECT    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ins_grocery"  ON grocery_items FOR INSERT    TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "upd_grocery"  ON grocery_items FOR UPDATE    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "del_grocery"  ON grocery_items FOR DELETE    TO authenticated USING (auth.uid() = user_id);

-- Fitness profile (one per user)
CREATE TABLE fitness_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL DEFAULT 'general' CHECK (goal IN ('weight_loss','muscle_gain','endurance','strength','general')),
  fitness_level TEXT NOT NULL DEFAULT 'beginner' CHECK (fitness_level IN ('beginner','intermediate','advanced')),
  weekly_target INT NOT NULL DEFAULT 3,
  notes TEXT
);
ALTER TABLE fitness_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_fitprof"  ON fitness_profile FOR SELECT    TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ins_fitprof"  ON fitness_profile FOR INSERT    TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "upd_fitprof"  ON fitness_profile FOR UPDATE    TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "del_fitprof"  ON fitness_profile FOR DELETE    TO authenticated USING (auth.uid() = user_id);
