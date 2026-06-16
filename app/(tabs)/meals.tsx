import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import {
  Plus, UtensilsCrossed, Flame, Beef, Wheat, Trash2, Calendar,
  ChevronLeft, ChevronRight, X, Sparkles, ShoppingCart,
  Check, Settings, Droplets,
} from 'lucide-react-native';
import { dark, gold, spacing, borderRadius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'log' | 'plan' | 'grocery';
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type DietGoal = 'lose' | 'maintain' | 'gain';

interface Meal {
  id: string; name: string; meal_type: MealType;
  calories: number | null; protein: number | null;
  carbs: number | null; fat: number | null;
  date: string; notes: string | null;
}
interface NutritionGoal {
  id: string; daily_calories: number; daily_protein: number;
  daily_carbs: number; daily_fat: number; goal: DietGoal;
}
interface GroceryItem {
  id: string; name: string; quantity: string | null;
  category: string; checked: boolean; auto_generated: boolean;
}

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: '#E8B820', lunch: '#3A8F52', dinner: '#9A7210', snack: '#2E7A8A',
};
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack',
};
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const GOAL_LABELS: Record<DietGoal, string> = {
  lose: 'Lose Weight', maintain: 'Maintain', gain: 'Build Muscle',
};
const DEFAULT_GOAL: NutritionGoal = {
  id: '', daily_calories: 2000, daily_protein: 150,
  daily_carbs: 200, daily_fat: 65, goal: 'maintain',
};

function parseLocalDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function formatDisplayDate(ds: string): string {
  const d = parseLocalDate(ds);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Today';
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  if (d.getTime() === yest.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function MacroBar({ label, current, max, color }: {
  label: string; current: number; max: number; color: string;
}) {
  const pct = max > 0 ? Math.min(current / max, 1.15) : 0;
  const over = current > max;
  return (
    <View style={ss.macroRow}>
      <Text style={ss.macroLabel}>{label}</Text>
      <View style={ss.macroTrack}>
        <View style={[ss.macroFill, { width: `${Math.min(pct * 100, 100)}%`, backgroundColor: over ? '#C0392B' : color }]} />
      </View>
      <Text style={[ss.macroVal, over && { color: '#C0392B' }]}>
        {current}<Text style={ss.macroMax}>/{max}{label === 'Cal' ? '' : 'g'}</Text>
      </Text>
    </View>
  );
}

async function callAI(prompt: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('openai-chat', {
    body: { messages: [{ role: 'user', content: prompt }] },
  });
  if (error) throw new Error(error.message);
  return data?.message || '';
}

export default function MealsScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('log');

  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [logModal, setLogModal] = useState(false);
  const [goal, setGoal] = useState<NutritionGoal>(DEFAULT_GOAL);
  const [goalsModal, setGoalsModal] = useState(false);

  const [mName, setMName] = useState('');
  const [mType, setMType] = useState<MealType>('breakfast');
  const [mCal, setMCal] = useState('');
  const [mProt, setMProt] = useState('');
  const [mCarbs, setMCarbs] = useState('');
  const [mFat, setMFat] = useState('');
  const [mNotes, setMNotes] = useState('');

  const [editCal, setEditCal] = useState('');
  const [editProt, setEditProt] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editFat, setEditFat] = useState('');
  const [editGoalType, setEditGoalType] = useState<DietGoal>('maintain');

  const [savingMeal, setSavingMeal] = useState(false);
  const [mealSaved, setMealSaved] = useState(false);
  const [mealError, setMealError] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalSaved, setGoalSaved] = useState(false);
  const [goalError, setGoalError] = useState('');

  const [mealPlan, setMealPlan] = useState('');
  const [planLoading, setPlanLoading] = useState(false);
  const [planGoal, setPlanGoal] = useState<DietGoal>('maintain');

  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [groceryInput, setGroceryInput] = useState('');
  const [groceryLoading, setGroceryLoading] = useState(false);
  const [addingGrocery, setAddingGrocery] = useState(false);

  useEffect(() => { loadMeals(); }, [selectedDate]);
  useEffect(() => { loadGoal(); loadGrocery(); }, [user]);

  const loadMeals = async () => {
    console.log('[loadMeals] fetching date:', selectedDate, 'user:', user?.id);
    const { data, error } = await supabase.from('meals').select('*').eq('date', selectedDate).order('created_at');
    console.log('[loadMeals] result:', data?.length, 'error:', error?.message);
    setMeals(data || []);
  };

  const loadGoal = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('nutrition_goals').select('*').maybeSingle();
    if (error) console.error('[loadGoal]', error.message);
    if (data) { setGoal(data); setPlanGoal(data.goal); }
  };

  const loadGrocery = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('grocery_items').select('*').order('category').order('checked');
    if (error) console.error('[loadGrocery]', error.message);
    setGroceryItems(data || []);
  };

  const saveMeal = async () => {
    if (!mName.trim()) return;
    setSavingMeal(true);
    setMealError('');

    console.log('[saveMeal] user_id:', user?.id);

    const { data: saved, error } = await supabase.from('meals').insert({
      name: mName.trim(), meal_type: mType, date: selectedDate,
      calories: mCal ? parseInt(mCal) : null,
      protein: mProt ? parseInt(mProt) : null,
      carbs: mCarbs ? parseInt(mCarbs) : null,
      fat: mFat ? parseInt(mFat) : null,
      notes: mNotes.trim() || null,
    }).select().single();

    console.log('[saveMeal] insert result:', saved, 'error:', error);

    setSavingMeal(false);
    if (error) {
      console.error('[saveMeal] insert failed:', error.message, error.code);
      setMealError('Could not save meal: ' + error.message);
      return;
    }

    // Optimistic update — add to local state immediately so it appears at once
    if (saved) setMeals(prev => [...prev, saved as Meal]);

    setMName(''); setMType('breakfast'); setMCal(''); setMProt(''); setMCarbs(''); setMFat(''); setMNotes('');
    setLogModal(false);
    setMealSaved(true);
    setTimeout(() => setMealSaved(false), 2500);

    // Reload from DB to confirm
    loadMeals();
  };

  const deleteMeal = async (id: string) => {
    console.log('[deleteMeal] id:', id);
    const { error } = await supabase.from('meals').delete().eq('id', id);
    if (error) {
      console.error('[deleteMeal] failed:', error.message);
      Alert.alert('Error', 'Could not delete meal: ' + error.message);
      return;
    }
    setMeals(prev => prev.filter(m => m.id !== id));
    loadMeals();
  };

  const saveGoal = async () => {
    setSavingGoal(true);
    setGoalError('');
    const payload = {
      daily_calories: parseInt(editCal) || 2000, daily_protein: parseInt(editProt) || 150,
      daily_carbs: parseInt(editCarbs) || 200, daily_fat: parseInt(editFat) || 65,
      goal: editGoalType,
    };
    let error;
    if (goal.id) {
      ({ error } = await supabase.from('nutrition_goals').update(payload).eq('id', goal.id));
    } else {
      ({ error } = await supabase.from('nutrition_goals').insert(payload));
    }
    setSavingGoal(false);
    if (error) {
      console.error('[saveGoal] failed:', error.message);
      setGoalError('Could not save goals: ' + error.message);
      return;
    }
    setGoalsModal(false);
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 2500);
    loadGoal();
  };

  const openGoalsModal = () => {
    setEditCal(String(goal.daily_calories)); setEditProt(String(goal.daily_protein));
    setEditCarbs(String(goal.daily_carbs)); setEditFat(String(goal.daily_fat));
    setEditGoalType(goal.goal); setGoalsModal(true);
  };

  const generatePlan = async () => {
    setPlanLoading(true);
    try {
      const prompt = `You are a professional nutritionist. Create a practical one-day meal plan.
Nutrition targets: ${goal.daily_calories} kcal | Protein: ${goal.daily_protein}g | Carbs: ${goal.daily_carbs}g | Fat: ${goal.daily_fat}g
Goal: ${planGoal === 'lose' ? 'weight loss' : planGoal === 'gain' ? 'muscle gain' : 'weight maintenance'}

Format exactly like this:
BREAKFAST: [Meal Name] — [cal]kcal | P:[g]g C:[g]g F:[g]g
  [1-line description]

LUNCH: ...
DINNER: ...
SNACK: ...

DAILY TOTALS: [cal]kcal | P:[g]g C:[g]g F:[g]g

Choose realistic, delicious, easy-to-make meals.`;
      setMealPlan(await callAI(prompt));
    } catch {
      Alert.alert('Error', 'Could not generate meal plan. Please try again.');
    }
    setPlanLoading(false);
  };

  const generateGrocery = async () => {
    if (!mealPlan) { Alert.alert('Generate a meal plan first', 'Go to AI Plan tab and generate a plan.'); return; }
    setGroceryLoading(true);
    try {
      const prompt = `Extract all ingredients needed for this meal plan:
${mealPlan}

Return a grocery list. Use this exact format — category headers followed by items:
PRODUCE:
- item (quantity)

PROTEIN:
- item (quantity)

DAIRY:
- item (quantity)

GRAINS:
- item (quantity)

PANTRY:
- item (quantity)

Only list the categories and items. Nothing else.`;

      const response = await callAI(prompt);
      let currentCategory = 'Other';
      const toInsert: Array<{ name: string; category: string; auto_generated: boolean }> = [];

      for (const line of response.split('\n')) {
        const t = line.trim();
        if (!t) continue;
        if (t.endsWith(':') && !t.startsWith('-')) {
          currentCategory = t.replace(':', '').trim();
        } else if (t.startsWith('-')) {
          const name = t.replace(/^-\s*/, '').trim();
          if (name) toInsert.push({ name, category: currentCategory, auto_generated: true });
        }
      }
      if (toInsert.length > 0) { await supabase.from('grocery_items').insert(toInsert); loadGrocery(); }
    } catch {
      Alert.alert('Error', 'Could not generate grocery list.');
    }
    setGroceryLoading(false);
  };

  const addGroceryItem = async () => {
    if (!groceryInput.trim()) return;
    setAddingGrocery(true);
    const { error } = await supabase.from('grocery_items').insert({ name: groceryInput.trim(), category: 'Other' });
    setAddingGrocery(false);
    if (error) { Alert.alert('Error', 'Could not add item: ' + error.message); return; }
    setGroceryInput(''); loadGrocery();
  };

  const toggleGrocery = async (item: GroceryItem) => {
    console.log('[toggleGrocery] id:', item.id, 'checked:', item.checked, '→', !item.checked);
    const { error } = await supabase.from('grocery_items').update({ checked: !item.checked }).eq('id', item.id);
    if (error) {
      console.error('[toggleGrocery] failed:', error.message);
      Alert.alert('Error', 'Could not update item: ' + error.message);
      return;
    }
    setGroceryItems(prev => prev.map(x => x.id === item.id ? { ...x, checked: !item.checked } : x));
    loadGrocery();
  };

  const clearChecked = async () => {
    await supabase.from('grocery_items').delete().eq('checked', true);
    loadGrocery();
  };

  const totals = meals.reduce((a, m) => ({
    cal: a.cal + (m.calories || 0), prot: a.prot + (m.protein || 0),
    carbs: a.carbs + (m.carbs || 0), fat: a.fat + (m.fat || 0),
  }), { cal: 0, prot: 0, carbs: 0, fat: 0 });

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const groups = MEAL_ORDER.reduce((g, t) => { g[t] = meals.filter(m => m.meal_type === t); return g; }, {} as Record<MealType, Meal[]>);
  const groupedGrocery = groceryItems.reduce((g, item) => {
    const c = item.category || 'Other';
    if (!g[c]) g[c] = [];
    g[c].push(item);
    return g;
  }, {} as Record<string, GroceryItem[]>);
  const checkedCount = groceryItems.filter(i => i.checked).length;

  // ── LOG TAB ───────────────────────────────────────────────────────────────
  const renderLog = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.scroll}>
      {mealSaved && (
        <View style={ss.savedBanner}>
          <Check size={15} color="#3A8F52" />
          <Text style={ss.savedBannerText}>Meal logged!</Text>
        </View>
      )}
      {goalSaved && (
        <View style={ss.savedBanner}>
          <Check size={15} color="#3A8F52" />
          <Text style={ss.savedBannerText}>Nutrition goals saved!</Text>
        </View>
      )}
      <View style={ss.progressCard}>
        <View style={ss.progressTop}>
          <Text style={ss.progressTitle}>Today's Nutrition</Text>
          <TouchableOpacity style={ss.settingsBtn} onPress={openGoalsModal}>
            <Settings size={14} color={dark.textSecondary} />
            <Text style={ss.settingsBtnText}>Goals</Text>
          </TouchableOpacity>
        </View>
        <View style={ss.calRow}>
          <Text style={ss.calBig}>{totals.cal}</Text>
          <Text style={ss.calSep}>/</Text>
          <Text style={ss.calTarget}>{goal.daily_calories} kcal</Text>
          <View style={[ss.goalBadge, {
            backgroundColor: goal.goal === 'lose' ? '#C0392B18' : goal.goal === 'gain' ? '#3A8F5218' : `${gold[400]}18`
          }]}>
            <Text style={[ss.goalBadgeText, {
              color: goal.goal === 'lose' ? '#C0392B' : goal.goal === 'gain' ? '#3A8F52' : gold[400]
            }]}>
              {GOAL_LABELS[goal.goal]}
            </Text>
          </View>
        </View>
        <MacroBar label="Cal" current={totals.cal} max={goal.daily_calories} color="#E74C3C" />
        <MacroBar label="Protein" current={totals.prot} max={goal.daily_protein} color={gold[400]} />
        <MacroBar label="Carbs" current={totals.carbs} max={goal.daily_carbs} color="#f59e0b" />
        <MacroBar label="Fat" current={totals.fat} max={goal.daily_fat} color="#6366f1" />
      </View>

      {MEAL_ORDER.map(type => (
        <View key={type} style={ss.mealGroup}>
          <View style={ss.groupHeader}>
            <View style={[ss.typeBadge, { backgroundColor: MEAL_COLORS[type] }]}>
              <Text style={ss.typeLabel}>{MEAL_LABELS[type]}</Text>
            </View>
            <TouchableOpacity style={ss.groupAddBtn} onPress={() => { setMType(type); setLogModal(true); }}>
              <Plus size={14} color={MEAL_COLORS[type]} />
            </TouchableOpacity>
          </View>
          {groups[type].length === 0 ? (
            <Text style={ss.emptyType}>Nothing logged yet</Text>
          ) : groups[type].map(meal => (
            <View key={meal.id} style={ss.mealCard}>
              <View style={{ flex: 1 }}>
                <Text style={ss.mealName}>{meal.name}</Text>
                <View style={ss.chipRow}>
                  {meal.calories != null && <View style={ss.chip}><Flame size={11} color="#E74C3C" /><Text style={ss.chipTxt}>{meal.calories}</Text></View>}
                  {meal.protein != null && <View style={ss.chip}><Beef size={11} color={gold[400]} /><Text style={ss.chipTxt}>{meal.protein}g</Text></View>}
                  {meal.carbs != null && <View style={ss.chip}><Wheat size={11} color="#f59e0b" /><Text style={ss.chipTxt}>{meal.carbs}g</Text></View>}
                  {meal.fat != null && <View style={ss.chip}><Droplets size={11} color="#6366f1" /><Text style={ss.chipTxt}>{meal.fat}g</Text></View>}
                </View>
                {meal.notes ? <Text style={ss.mealNotes}>{meal.notes}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => deleteMeal(meal.id)} style={{ padding: 6 }}>
                <Trash2 size={16} color="#C0392B" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );

  // ── PLAN TAB ──────────────────────────────────────────────────────────────
  const renderPlan = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.scroll}>
      <View style={ss.infoCard}>
        <Sparkles size={15} color={gold[400]} />
        <Text style={ss.infoText}>Get a personalized AI meal plan tailored to your nutrition targets and goals.</Text>
      </View>
      <Text style={ss.fieldLabel}>Your Goal</Text>
      <View style={ss.goalRow}>
        {(['lose', 'maintain', 'gain'] as DietGoal[]).map(g => (
          <TouchableOpacity key={g} style={[ss.goalBtn2, planGoal === g && ss.goalBtn2Active]} onPress={() => setPlanGoal(g)}>
            <Text style={[ss.goalBtn2Text, planGoal === g && { color: dark.bg }]}>{GOAL_LABELS[g]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={ss.targetRow}>
        {[
          { l: 'Calories', v: `${goal.daily_calories}`, c: '#E74C3C' },
          { l: 'Protein', v: `${goal.daily_protein}g`, c: gold[400] },
          { l: 'Carbs', v: `${goal.daily_carbs}g`, c: '#f59e0b' },
          { l: 'Fat', v: `${goal.daily_fat}g`, c: '#6366f1' },
        ].map(t => (
          <View key={t.l} style={ss.targetPill}>
            <Text style={[ss.targetVal, { color: t.c }]}>{t.v}</Text>
            <Text style={ss.targetLabel}>{t.l}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={[ss.genBtn, planLoading && ss.genBtnActive]} onPress={generatePlan} disabled={planLoading}>
        {planLoading ? <ActivityIndicator size="small" color={dark.bg} /> : <Sparkles size={16} color={planLoading ? dark.bg : gold[400]} />}
        <Text style={[ss.genBtnText, planLoading && { color: dark.bg }]}>
          {planLoading ? 'Generating...' : 'Generate AI Meal Plan'}
        </Text>
      </TouchableOpacity>
      {mealPlan ? (
        <View style={ss.aiCard}>
          <View style={ss.aiCardHead}><Sparkles size={13} color={gold[400]} /><Text style={ss.aiCardTitle}>Your Meal Plan</Text></View>
          <Text style={ss.aiCardBody}>{mealPlan}</Text>
        </View>
      ) : !planLoading ? (
        <View style={ss.emptyState}>
          <UtensilsCrossed size={36} color={dark.textMuted} />
          <Text style={ss.emptyText}>Tap the button above to generate a personalized meal plan.</Text>
        </View>
      ) : null}
    </ScrollView>
  );

  // ── GROCERY TAB ───────────────────────────────────────────────────────────
  const renderGrocery = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.scroll}>
      <View style={ss.groceryTop}>
        <TouchableOpacity style={[ss.genBtn, { flex: 1, marginBottom: 0 }, groceryLoading && ss.genBtnActive]} onPress={generateGrocery} disabled={groceryLoading}>
          {groceryLoading ? <ActivityIndicator size="small" color={dark.bg} /> : <Sparkles size={15} color={groceryLoading ? dark.bg : gold[400]} />}
          <Text style={[ss.genBtnText, groceryLoading && { color: dark.bg }]}>
            {groceryLoading ? 'Generating...' : 'Generate from Plan'}
          </Text>
        </TouchableOpacity>
        {checkedCount > 0 && (
          <TouchableOpacity style={ss.clearBtn} onPress={clearChecked}>
            <Trash2 size={15} color="#C0392B" />
            <Text style={ss.clearText}>Clear {checkedCount}</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={ss.addRow}>
        <TextInput
          style={ss.addInput}
          placeholder="Add item manually..."
          placeholderTextColor={dark.textMuted}
          value={groceryInput}
          onChangeText={setGroceryInput}
          returnKeyType="done"
          onSubmitEditing={addGroceryItem}
        />
        <TouchableOpacity style={[ss.addBtn, addingGrocery && { opacity: 0.6 }]} onPress={addGroceryItem} disabled={addingGrocery}>
          <Plus size={18} color={dark.bg} />
        </TouchableOpacity>
      </View>
      {groceryItems.length === 0 ? (
        <View style={ss.emptyState}>
          <ShoppingCart size={36} color={dark.textMuted} />
          <Text style={ss.emptyText}>No items yet. Generate from your AI plan or add manually.</Text>
        </View>
      ) : Object.entries(groupedGrocery).map(([cat, items]) => (
        <View key={cat} style={ss.catSection}>
          <Text style={ss.catLabel}>{cat.toUpperCase()}</Text>
          {items.map(item => (
            <TouchableOpacity key={item.id} style={ss.groceryItem} onPress={() => toggleGrocery(item)}>
              <View style={[ss.checkbox, item.checked && ss.checkboxDone]}>
                {item.checked && <Check size={12} color={dark.bg} />}
              </View>
              <Text style={[ss.groceryName, item.checked && ss.groceryNameDone]}>{item.name}</Text>
              <TouchableOpacity onPress={async () => {
                console.log('[deleteGroceryItem] id:', item.id);
                const { error } = await supabase.from('grocery_items').delete().eq('id', item.id);
                if (error) {
                  console.error('[deleteGroceryItem] failed:', error.message);
                  Alert.alert('Error', 'Could not remove item: ' + error.message);
                  return;
                }
                setGroceryItems(prev => prev.filter(x => x.id !== item.id));
                loadGrocery();
              }}>
                <X size={14} color={dark.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );

  return (
    <View style={ss.container}>
      <View style={ss.header}>
        <View style={{ flex: 1 }}>
          <Text style={ss.headerTitle}>Meal Planner</Text>
          <Text style={ss.headerSub}>Nutrition · AI Planning · Grocery</Text>
        </View>
        {tab === 'log' && (
          <View style={ss.datePicker}>
            <TouchableOpacity onPress={() => { const d = parseLocalDate(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }}>
              <ChevronLeft size={20} color={gold[400]} />
            </TouchableOpacity>
            <Text style={ss.dateLabel}>{formatDisplayDate(selectedDate)}</Text>
            <TouchableOpacity disabled={isToday} onPress={() => { const d = parseLocalDate(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }}>
              <ChevronRight size={20} color={isToday ? dark.textMuted : gold[400]} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={ss.tabBar}>
        {(['log', 'plan', 'grocery'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[ss.tabBtn, tab === t && ss.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[ss.tabTxt, tab === t && ss.tabTxtActive]}>
              {t === 'log' ? 'Log' : t === 'plan' ? 'AI Plan' : 'Grocery'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'log' && renderLog()}
      {tab === 'plan' && renderPlan()}
      {tab === 'grocery' && renderGrocery()}

      {tab === 'log' && (
        <TouchableOpacity style={ss.fab} onPress={() => { setMName(''); setMType('breakfast'); setMCal(''); setMProt(''); setMCarbs(''); setMFat(''); setMNotes(''); setLogModal(true); }}>
          <Plus size={24} color={dark.bg} />
        </TouchableOpacity>
      )}

      {/* Log Meal Modal */}
      <Modal animationType="slide" transparent visible={logModal} onRequestClose={() => setLogModal(false)}>
        <View style={ss.overlay}>
          <ScrollView style={ss.sheet} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={ss.handle} />
            <View style={ss.mRow}>
              <Text style={ss.mTitle}>Log Meal</Text>
              <TouchableOpacity onPress={() => setLogModal(false)}><X size={22} color={dark.textSecondary} /></TouchableOpacity>
            </View>
            <TextInput style={ss.inp} placeholder="Meal name" placeholderTextColor={dark.textMuted} value={mName} onChangeText={setMName} />
            <Text style={ss.fLabel}>Meal Type</Text>
            <View style={ss.typeRow}>
              {MEAL_ORDER.map(t => (
                <TouchableOpacity key={t} style={[ss.tChip, mType === t && { backgroundColor: MEAL_COLORS[t], borderColor: MEAL_COLORS[t] }]} onPress={() => setMType(t)}>
                  <Text style={[ss.tChipTxt, mType === t && { color: '#fff' }]}>{MEAL_LABELS[t]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={ss.fLabel}>Nutrition (optional)</Text>
            <View style={ss.macroGrid}>
              {([['Calories', mCal, setMCal], ['Protein g', mProt, setMProt], ['Carbs g', mCarbs, setMCarbs], ['Fat g', mFat, setMFat]] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
                <View key={label} style={ss.macroCell}>
                  <Text style={ss.macroCellLabel}>{label}</Text>
                  <TextInput style={ss.macroCellInput} placeholder="0" placeholderTextColor={dark.textMuted} value={val} onChangeText={setter} keyboardType="numeric" />
                </View>
              ))}
            </View>
            <TextInput style={[ss.inp, { minHeight: 64, textAlignVertical: 'top' }]} placeholder="Notes (optional)" placeholderTextColor={dark.textMuted} value={mNotes} onChangeText={setMNotes} multiline />
            {mealError ? <Text style={ss.errorText}>{mealError}</Text> : null}
            <TouchableOpacity style={[ss.saveBtn, savingMeal && { opacity: 0.7 }]} onPress={saveMeal} disabled={savingMeal}>
              {savingMeal
                ? <ActivityIndicator size="small" color={dark.bg} />
                : <Text style={ss.saveTxt}>Log Meal</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Nutrition Goals Modal */}
      <Modal animationType="slide" transparent visible={goalsModal} onRequestClose={() => setGoalsModal(false)}>
        <View style={ss.overlay}>
          <View style={ss.sheet}>
            <View style={{ padding: spacing.lg, paddingBottom: 40 }}>
              <View style={ss.handle} />
              <View style={ss.mRow}>
                <Text style={ss.mTitle}>Nutrition Goals</Text>
                <TouchableOpacity onPress={() => setGoalsModal(false)}><X size={22} color={dark.textSecondary} /></TouchableOpacity>
              </View>
              <Text style={ss.fLabel}>Diet Goal</Text>
              <View style={ss.typeRow}>
                {(['lose', 'maintain', 'gain'] as DietGoal[]).map(g => (
                  <TouchableOpacity key={g} style={[ss.tChip, editGoalType === g && ss.tChipActive]} onPress={() => setEditGoalType(g)}>
                    <Text style={[ss.tChipTxt, editGoalType === g && { color: dark.bg }]}>{GOAL_LABELS[g]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={ss.macroGrid}>
                {([['Daily Calories', editCal, setEditCal], ['Protein (g)', editProt, setEditProt], ['Carbs (g)', editCarbs, setEditCarbs], ['Fat (g)', editFat, setEditFat]] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
                  <View key={label} style={ss.macroCell}>
                    <Text style={ss.macroCellLabel}>{label}</Text>
                    <TextInput style={ss.macroCellInput} placeholder="0" placeholderTextColor={dark.textMuted} value={val} onChangeText={setter} keyboardType="numeric" />
                  </View>
                ))}
              </View>
              {goalError ? <Text style={ss.errorText}>{goalError}</Text> : null}
              <TouchableOpacity style={[ss.saveBtn, { marginTop: 12 }, savingGoal && { opacity: 0.7 }]} onPress={saveGoal} disabled={savingGoal}>
                <Text style={ss.saveTxt}>{savingGoal ? 'Saving...' : 'Save Goals'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const G = gold[400];
const ss = StyleSheet.create({
  container: { flex: 1, backgroundColor: dark.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xl + 20, paddingBottom: spacing.md, backgroundColor: dark.surface, borderBottomWidth: 1, borderBottomColor: `${G}30` },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, color: dark.text },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textSecondary, marginTop: 2 },
  datePicker: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: dark.text, minWidth: 68, textAlign: 'center' },

  tabBar: { flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: 12, backgroundColor: dark.elevated, borderRadius: borderRadius.lg, padding: 4, borderWidth: 1, borderColor: dark.border },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: borderRadius.md },
  tabBtnActive: { backgroundColor: dark.surface, borderWidth: 1, borderColor: `${G}50` },
  tabTxt: { fontFamily: 'Inter_500Medium', fontSize: 13, color: dark.textSecondary },
  tabTxtActive: { color: G, fontFamily: 'Inter_600SemiBold' },

  scroll: { paddingHorizontal: spacing.lg, paddingTop: 14, paddingBottom: 120 },

  progressCard: { backgroundColor: dark.surface, borderRadius: borderRadius.xl, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: `${G}30` },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: dark.text },
  settingsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: dark.elevated, borderRadius: 8, borderWidth: 1, borderColor: dark.border },
  settingsBtnText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: dark.textSecondary },
  calRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 12 },
  calBig: { fontFamily: 'Inter_700Bold', fontSize: 32, color: dark.text },
  calSep: { fontFamily: 'Inter_400Regular', fontSize: 18, color: dark.textMuted },
  calTarget: { fontFamily: 'Inter_400Regular', fontSize: 14, color: dark.textSecondary, flex: 1 },
  goalBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  goalBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },

  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  macroLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, color: dark.textSecondary, width: 48 },
  macroTrack: { flex: 1, height: 6, backgroundColor: dark.elevated, borderRadius: 3, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 3 },
  macroVal: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: dark.text, minWidth: 56, textAlign: 'right' },
  macroMax: { fontFamily: 'Inter_400Regular', fontSize: 11, color: dark.textMuted },

  mealGroup: { marginBottom: 16 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
  typeLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: dark.bg },
  groupAddBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: dark.elevated, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: dark.border },
  emptyType: { fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textMuted, paddingVertical: 6, paddingLeft: 4 },
  mealCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: dark.surface, borderRadius: borderRadius.lg, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: dark.border },
  mealName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: dark.text, marginBottom: 5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: dark.elevated, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
  chipTxt: { fontFamily: 'Inter_500Medium', fontSize: 11, color: dark.textSecondary },
  mealNotes: { fontFamily: 'Inter_400Regular', fontSize: 12, color: dark.textMuted, fontStyle: 'italic', marginTop: 4 },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: dark.goldSurface, borderRadius: borderRadius.lg, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: `${G}35` },
  infoText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.text, lineHeight: 19 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: dark.textSecondary, marginBottom: 8, letterSpacing: 0.5 },
  goalRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  goalBtn2: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: dark.elevated, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: dark.border },
  goalBtn2Active: { backgroundColor: G, borderColor: G },
  goalBtn2Text: { fontFamily: 'Inter_500Medium', fontSize: 13, color: dark.textSecondary },
  targetRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  targetPill: { flex: 1, alignItems: 'center', backgroundColor: dark.surface, borderRadius: borderRadius.lg, paddingVertical: 10, borderWidth: 1, borderColor: dark.border },
  targetVal: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  targetLabel: { fontFamily: 'Inter_400Regular', fontSize: 10, color: dark.textSecondary, marginTop: 2 },
  genBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: dark.goldSurface, borderRadius: borderRadius.xl, paddingVertical: 14, marginBottom: 16, borderWidth: 1, borderColor: `${G}50` },
  genBtnActive: { backgroundColor: G },
  genBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: G },
  aiCard: { backgroundColor: dark.surface, borderRadius: borderRadius.xl, padding: 16, borderWidth: 1, borderColor: `${G}25` },
  aiCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: dark.border },
  aiCardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: G },
  aiCardBody: { fontFamily: 'Inter_400Regular', fontSize: 14, color: dark.text, lineHeight: 22 },
  emptyState: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: dark.textSecondary, textAlign: 'center', paddingHorizontal: 20 },

  groceryTop: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 14, backgroundColor: '#2A121215', borderRadius: borderRadius.xl, borderWidth: 1, borderColor: '#C0392B40' },
  clearText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#C0392B' },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  addInput: { flex: 1, backgroundColor: dark.elevated, borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Inter_400Regular', fontSize: 15, color: dark.text, borderWidth: 1, borderColor: dark.border },
  addBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: G, justifyContent: 'center', alignItems: 'center' },
  catSection: { marginBottom: 14 },
  catLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, color: dark.textMuted, letterSpacing: 1.5, marginBottom: 8 },
  groceryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: dark.surface, borderRadius: borderRadius.lg, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 6, borderWidth: 1, borderColor: dark.border, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: dark.borderLight, justifyContent: 'center', alignItems: 'center' },
  checkboxDone: { backgroundColor: G, borderColor: G },
  groceryName: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: dark.text },
  groceryNameDone: { textDecorationLine: 'line-through', color: dark.textMuted },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  sheet: { backgroundColor: dark.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: `${G}30`, maxHeight: '92%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: dark.border, alignSelf: 'center', marginBottom: 16 },
  mRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  mTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: dark.text },
  inp: { backgroundColor: dark.elevated, borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 13, fontFamily: 'Inter_400Regular', fontSize: 15, color: dark.text, marginBottom: 12, borderWidth: 1, borderColor: dark.border },
  fLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: dark.textSecondary, marginBottom: 8, letterSpacing: 0.5 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: dark.elevated, borderWidth: 1, borderColor: dark.border },
  tChipActive: { backgroundColor: G, borderColor: G },
  tChipTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: dark.textSecondary },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  macroCell: { width: '47%' },
  macroCellLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: dark.textSecondary, marginBottom: 4 },
  macroCellInput: { backgroundColor: dark.elevated, borderRadius: borderRadius.md, paddingHorizontal: 10, paddingVertical: 10, fontFamily: 'Inter_500Medium', fontSize: 15, color: dark.text, textAlign: 'center', borderWidth: 1, borderColor: dark.border },
  saveBtn: { backgroundColor: G, paddingVertical: 14, borderRadius: borderRadius.lg, alignItems: 'center' },
  saveTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: dark.bg },
  fab: { position: 'absolute', right: spacing.lg, bottom: 100, width: 56, height: 56, borderRadius: 28, backgroundColor: G, justifyContent: 'center', alignItems: 'center', shadowColor: G, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  savedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0D1F12', borderWidth: 1, borderColor: '#3A8F5260', borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  savedBannerText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#3A8F52' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#C0392B', marginBottom: 8 },
});
