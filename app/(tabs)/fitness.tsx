import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import {
  Plus,
  Dumbbell,
  Flame,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  Brain,
  TrendingUp,
  Target,
  Zap,
  BarChart3,
  Repeat2,
  Award,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react-native';
import { dark, gold, spacing, borderRadius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { haptics } from '@/lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Workout {
  id: string;
  type: string;
  duration_minutes: number;
  calories_burned: number | null;
  notes: string | null;
  date: string;
  created_at: string;
}

interface FitnessProfile {
  id?: string;
  goal: string;
  fitness_level: string;
  weekly_target: number;
  notes: string;
}

const workoutTypes = [
  'Running', 'Walking', 'Cycling', 'Swimming',
  'Weight Training', 'HIIT', 'Yoga', 'Basketball', 'Soccer', 'Other',
];

const workoutColors: Record<string, string> = {
  'Running': '#E74C3C',
  'Walking': '#3A8F52',
  'Cycling': '#E8C14E',
  'Swimming': '#2E7A8A',
  'Weight Training': '#C9A227',
  'HIIT': '#C0392B',
  'Yoga': '#2E8A7A',
  'Basketball': '#D4821A',
  'Soccer': '#5A8A1A',
  'Other': '#6B6B6B',
};

const FITNESS_GOALS = [
  { key: 'weight_loss', label: 'Weight Loss', icon: '🔥' },
  { key: 'muscle_gain', label: 'Muscle Gain', icon: '💪' },
  { key: 'endurance', label: 'Endurance', icon: '🏃' },
  { key: 'strength', label: 'Strength', icon: '⚡' },
  { key: 'general', label: 'General Fitness', icon: '✨' },
];

const FITNESS_LEVELS = [
  { key: 'beginner', label: 'Beginner', desc: 'New to fitness' },
  { key: 'intermediate', label: 'Intermediate', desc: '1-2 years exp.' },
  { key: 'advanced', label: 'Advanced', desc: '3+ years exp.' },
];

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const start = new Date(weekStart + 'T00:00:00');
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

async function callAI(prompt: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('openai-chat', {
    body: { messages: [{ role: 'user', content: prompt }] },
  });
  if (error) throw new Error(error.message);
  return data?.message || '';
}

// ─── Bar Chart for weekly progress ───────────────────────────────────────────
function WeekBar({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
  const height = useSharedValue(0);
  const targetHeight = maxValue > 0 ? Math.max((value / maxValue) * 80, value > 0 ? 6 : 0) : 0;

  useEffect(() => {
    height.value = withDelay(100, withTiming(targetHeight, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [targetHeight]);

  const barStyle = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <View style={{ alignItems: 'center', flex: 1, gap: 4 }}>
      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 11, color: dark.text, marginBottom: 2 }}>
        {value > 0 ? value : ''}
      </Text>
      <View style={{ width: 28, height: 80, justifyContent: 'flex-end', backgroundColor: `${color}18`, borderRadius: 6 }}>
        <Animated.View style={[{ width: '100%', backgroundColor: color, borderRadius: 6 }, barStyle]} />
      </View>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10, color: dark.textMuted }}>{label}</Text>
    </View>
  );
}

// ─── Coach Card ───────────────────────────────────────────────────────────────
function CoachResponseCard({ response }: { response: string }) {
  const [expanded, setExpanded] = useState(true);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.1)) });
  }, [response]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const lines = response.split('\n').filter(l => l.trim().length > 0);

  return (
    <Animated.View style={[styles.coachCard, cardStyle]}>
      <TouchableOpacity style={styles.coachCardHeader} onPress={() => setExpanded(e => !e)} activeOpacity={0.8}>
        <View style={styles.coachCardTitleRow}>
          <View style={styles.coachIconBadge}>
            <Brain size={14} color={gold[400]} />
          </View>
          <Text style={styles.coachCardTitle}>AI Coach Response</Text>
        </View>
        {expanded ? <ChevronUp size={16} color={dark.textMuted} /> : <ChevronDown size={16} color={dark.textMuted} />}
      </TouchableOpacity>
      {expanded && (
        <View style={styles.coachCardBody}>
          {lines.map((line, i) => {
            const isBold = line.startsWith('**') || line.startsWith('##') || line.startsWith('#');
            const cleanLine = line.replace(/^#{1,3}\s*/, '').replace(/\*\*/g, '');
            const isBullet = line.trimStart().startsWith('- ') || line.trimStart().startsWith('• ');
            const bulletText = isBullet ? cleanLine.replace(/^[-•]\s*/, '') : cleanLine;
            return (
              <View key={i} style={isBullet ? styles.coachBulletRow : undefined}>
                {isBullet && <View style={styles.coachBulletDot} />}
                <Text style={[
                  styles.coachBodyText,
                  isBold && styles.coachBodyBold,
                  isBullet && styles.coachBulletText,
                ]}>
                  {isBullet ? bulletText : cleanLine}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function FitnessScreen() {
  const [tab, setTab] = useState<'log' | 'coach' | 'progress'>('log');

  // Log tab state
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState(getWeekStart(new Date()));
  const [savedAnimation, setSavedAnimation] = useState(false);
  const [savingWorkout, setSavingWorkout] = useState(false);
  const [workoutType, setWorkoutType] = useState(workoutTypes[0]);
  const [duration, setDuration] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [logNotes, setLogNotes] = useState('');

  // Coach tab state
  const [profile, setProfile] = useState<FitnessProfile>({
    goal: 'general',
    fitness_level: 'beginner',
    weekly_target: 3,
    notes: '',
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [draftProfile, setDraftProfile] = useState<FitnessProfile>(profile);
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [lastGenDate, setLastGenDate] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Progress tab state
  const [weeklyStats, setWeeklyStats] = useState<{ label: string; count: number; minutes: number }[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalWorkoutsAllTime, setTotalWorkoutsAllTime] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuth();

  useEffect(() => { loadWorkouts(); }, [selectedWeek]);
  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { if (tab === 'progress') loadProgressData(); }, [tab]);

  const onRefreshLog = async () => { setRefreshing(true); await loadWorkouts(); setRefreshing(false); };
  const onRefreshCoach = async () => { setRefreshing(true); await loadProfile(); setRefreshing(false); };
  const onRefreshProgress = async () => { setRefreshing(true); await loadProgressData(); setRefreshing(false); };

  // ── Data loaders ──────────────────────────────────────────────────────────
  async function loadWorkouts() {
    const weekDates = getWeekDates(selectedWeek);
    console.log('[loadWorkouts] user:', user?.id, 'week:', selectedWeek);
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .in('date', weekDates)
      .order('date', { ascending: true });
    console.log('[loadWorkouts] result:', data?.length, 'error:', error?.message);
    if (!error && data) setWorkouts(data);
  }

  async function loadProfile() {
    const { data } = await supabase
      .from('fitness_profile')
      .select('*')
      .maybeSingle();
    if (data) {
      const p: FitnessProfile = {
        id: data.id,
        goal: data.goal || 'general',
        fitness_level: data.fitness_level || 'beginner',
        weekly_target: data.weekly_target || 3,
        notes: data.notes || '',
      };
      setProfile(p);
      setProfileSaved(true);
    }
  }

  async function loadProgressData() {
    const today = new Date().toISOString().split('T')[0];
    const fourWeeksAgo = addDays(today, -28);

    console.log('[loadProgressData] user:', user?.id, 'from:', fourWeeksAgo);

    const { data, error } = await supabase
      .from('workouts')
      .select('date, duration_minutes')
      .gte('date', fourWeeksAgo)
      .order('date', { ascending: true });

    console.log('[loadProgressData] rows:', data?.length, 'error:', error?.message);

    if (!data) return;

    // Build 4 week buckets
    const buckets: { label: string; start: string; count: number; minutes: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const start = addDays(today, -(w * 7 + 6));
      const end = addDays(today, -(w * 7));
      const label = w === 0 ? 'This Wk' : w === 1 ? 'Last Wk' : `-${w + 1}w`;
      const weekWorkouts = data.filter(wo => wo.date >= start && wo.date <= end);
      buckets.push({
        label,
        start,
        count: weekWorkouts.length,
        minutes: weekWorkouts.reduce((s, w) => s + (w.duration_minutes || 0), 0),
      });
    }
    setWeeklyStats(buckets);

    // Streak: count consecutive days going back from today with at least 1 workout
    const workoutDates = new Set(data.map(w => w.date));
    let s = 0;
    let checkDate = today;
    while (workoutDates.has(checkDate)) {
      s++;
      checkDate = addDays(checkDate, -1);
    }
    setStreak(s);

    // All-time count — scoped to current user via RLS (no extra filter needed)
    const { count, error: countErr } = await supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true });
    console.log('[loadProgressData] all-time count:', count, 'error:', countErr?.message);
    setTotalWorkoutsAllTime(count || 0);
  }

  // ── Log tab actions ───────────────────────────────────────────────────────
  async function addWorkout() {
    if (!duration.trim() || isNaN(parseInt(duration)) || parseInt(duration) <= 0) {
      Alert.alert('Missing Info', 'Please enter a valid duration in minutes.');
      return;
    }
    setSavingWorkout(true);

    console.log('[addWorkout] user_id:', user?.id, 'date:', selectedDate, 'type:', workoutType);

    const { data: saved, error } = await supabase.from('workouts').insert({
      type: workoutType,
      duration_minutes: parseInt(duration),
      calories_burned: caloriesBurned.trim() ? parseInt(caloriesBurned) : null,
      date: selectedDate,
      notes: logNotes.trim() || null,
    }).select().single();

    console.log('[addWorkout] result:', saved, 'error:', error?.message);

    setSavingWorkout(false);
    if (error) {
      console.error('[addWorkout] failed:', error.message, error.code);
      haptics.warning();
      Alert.alert('Error', 'Failed to save workout: ' + error.message);
      return;
    }

    setLogModalVisible(false);
    haptics.success();
    setSavedAnimation(true);
    setTimeout(() => setSavedAnimation(false), 2000);

    // Optimistic update
    if (saved) setWorkouts(prev => [...prev, saved as Workout].sort((a, b) => a.date.localeCompare(b.date)));

    loadWorkouts();
    if (tab === 'progress') loadProgressData();
  }

  async function deleteWorkout(id: string) {
    Alert.alert('Delete Workout', 'Remove this workout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          console.log('[deleteWorkout] id:', id);
          const { error } = await supabase.from('workouts').delete().eq('id', id);
          if (error) {
            console.error('[deleteWorkout] failed:', error.message);
            haptics.warning();
            Alert.alert('Error', 'Could not delete workout: ' + error.message);
            return;
          }
          setWorkouts(prev => prev.filter(w => w.id !== id));
          loadWorkouts();
        },
      },
    ]);
  }

  function resetLogForm() {
    setWorkoutType(workoutTypes[0]);
    setDuration('');
    setCaloriesBurned('');
    setLogNotes('');
  }

  // ── Coach tab actions ─────────────────────────────────────────────────────
  async function saveProfile() {
    setSavingProfile(true);
    const payload = {
      goal: draftProfile.goal,
      fitness_level: draftProfile.fitness_level,
      weekly_target: draftProfile.weekly_target,
      notes: draftProfile.notes,
    };
    let error;
    if (profile.id) {
      ({ error } = await supabase.from('fitness_profile').update(payload).eq('id', profile.id));
    } else {
      ({ error } = await supabase.from('fitness_profile').insert(payload));
    }
    setSavingProfile(false);
    if (error) { haptics.warning(); Alert.alert('Error', 'Failed to save profile.'); return; }
    setProfile({ ...draftProfile });
    haptics.success();
    setProfileSaved(true);
    setProfileModalVisible(false);
    await loadProfile();
  }

  async function generateWorkout() {
    setLoadingAI(true);
    setAiResponse('');
    const goalLabel = FITNESS_GOALS.find(g => g.key === profile.goal)?.label || profile.goal;
    const levelLabel = FITNESS_LEVELS.find(l => l.key === profile.fitness_level)?.label || profile.fitness_level;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const recentCount = weeklyStats.length > 0 ? weeklyStats[weeklyStats.length - 1].count : 0;

    const prompt = `You are an expert personal trainer. Create a specific, detailed workout plan for today (${today}) for this client:

Goal: ${goalLabel}
Fitness Level: ${levelLabel}
Weekly workout target: ${profile.weekly_target} sessions
Workouts done this week so far: ${recentCount}
${profile.notes ? `Additional notes: ${profile.notes}` : ''}

Provide:
1. **Today's Workout** - Specific exercises with sets, reps, and rest times (or duration for cardio)
2. **Warm-Up** (5-10 min) - 2-3 specific movements
3. **Main Session** - 4-6 exercises with exact parameters
4. **Cool-Down** (5 min) - 2-3 stretches
5. **Tips** - 2 specific coaching tips for this session

Be concise but specific. Include estimated duration and calories burned. Tailor everything to the ${levelLabel} level.`;

    try {
      const result = await callAI(prompt);
      setAiResponse(result);
      setLastGenDate(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      haptics.warning();
      Alert.alert('Error', 'Could not generate workout. Please try again.');
    } finally {
      setLoadingAI(false);
    }
  }

  // ── Week nav helpers ──────────────────────────────────────────────────────
  const goToPreviousWeek = () => {
    const c = new Date(selectedWeek);
    c.setDate(c.getDate() - 7);
    setSelectedWeek(getWeekStart(c));
  };
  const goToNextWeek = () => {
    const c = new Date(selectedWeek);
    c.setDate(c.getDate() + 7);
    setSelectedWeek(getWeekStart(c));
  };

  const getTotalMinutes = () => workouts.reduce((sum, w) => sum + w.duration_minutes, 0);
  const getTotalCalories = () => workouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0);
  const getWorkoutsByDate = (date: string) => workouts.filter(w => w.date === date);
  const getDayName = (dateStr: string) => new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
  const getDayNumber = (dateStr: string) => new Date(dateStr + 'T12:00:00').getDate();
  const isToday = (dateStr: string) => dateStr === new Date().toISOString().split('T')[0];

  const weekDates = getWeekDates(selectedWeek);
  const weekStart = new Date(selectedWeek + 'T00:00:00');
  const weekEnd = new Date(selectedWeek + 'T00:00:00');
  weekEnd.setDate(weekEnd.getDate() + 6);
  const formatWeekRange = () => {
    const s = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const e = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${s} – ${e}`;
  };
  const selectedWorkouts = getWorkoutsByDate(selectedDate);
  const goalObj = FITNESS_GOALS.find(g => g.key === profile.goal);
  const levelObj = FITNESS_LEVELS.find(l => l.key === profile.fitness_level);
  const maxWeekCount = Math.max(...weeklyStats.map(w => w.count), 1);
  const maxWeekMinutes = Math.max(...weeklyStats.map(w => w.minutes), 1);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Fitness Coach</Text>
          <Text style={styles.headerSubtitle}>Track, train, and improve</Text>
        </View>
        {tab === 'log' && (
          <TouchableOpacity style={styles.headerLogButton} onPress={() => { resetLogForm(); setLogModalVisible(true); }}>
            <Plus size={18} color={dark.bg} />
            <Text style={styles.headerLogButtonText}>Log</Text>
          </TouchableOpacity>
        )}
        {tab === 'coach' && (
          <TouchableOpacity style={styles.headerProfileButton} onPress={() => { setDraftProfile({ ...profile }); setProfileModalVisible(true); }}>
            <Target size={16} color={gold[400]} />
            <Text style={styles.headerProfileButtonText}>Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(['log', 'coach', 'progress'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabItem, tab === t && styles.tabItemActive]}
            onPress={() => setTab(t)}>
            {t === 'log' && <Dumbbell size={15} color={tab === t ? dark.bg : dark.textSecondary} />}
            {t === 'coach' && <Brain size={15} color={tab === t ? dark.bg : dark.textSecondary} />}
            {t === 'progress' && <TrendingUp size={15} color={tab === t ? dark.bg : dark.textSecondary} />}
            <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
              {t === 'log' ? 'Log' : t === 'coach' ? 'AI Coach' : 'Progress'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── LOG TAB ─────────────────────────────────────────────────────── */}
      {tab === 'log' && (
        <>
          {/* Week Selector */}
          <View style={styles.weekSelector}>
            <TouchableOpacity style={styles.weekNavButton} onPress={goToPreviousWeek}>
              <ChevronLeft size={20} color={gold[400]} />
            </TouchableOpacity>
            <Text style={styles.weekText}>{formatWeekRange()}</Text>
            <TouchableOpacity
              style={[styles.weekNavButton, selectedWeek >= getWeekStart(new Date()) && styles.weekNavButtonDisabled]}
              onPress={goToNextWeek}
              disabled={selectedWeek >= getWeekStart(new Date())}>
              <ChevronRight size={20} color={selectedWeek >= getWeekStart(new Date()) ? dark.textMuted : gold[400]} />
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: gold[400] }]}>
              <Dumbbell size={18} color={gold[400]} />
              <Text style={styles.statValue}>{workouts.length}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: dark.borderLight }]}>
              <Clock size={18} color={dark.textSecondary} />
              <Text style={styles.statValue}>{getTotalMinutes()}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: '#E74C3C' }]}>
              <Flame size={18} color="#E74C3C" />
              <Text style={styles.statValue}>{getTotalCalories()}</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
          </View>

          {/* Week Day Picker */}
          <View style={styles.weekCalendar}>
            {weekDates.map(date => {
              const dayWorkouts = getWorkoutsByDate(date);
              const selected = date === selectedDate;
              const today = isToday(date);
              return (
                <TouchableOpacity
                  key={date}
                  style={[styles.dayColumn, selected && styles.dayColumnSelected, today && !selected && styles.dayColumnToday]}
                  onPress={() => setSelectedDate(date)}>
                  <Text style={[styles.dayName, selected && styles.dayNameSelected]}>{getDayName(date)}</Text>
                  <View style={[
                    styles.dayNumberContainer,
                    selected && styles.dayNumberContainerSelected,
                    today && !selected && styles.dayNumberContainerToday,
                  ]}>
                    <Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>{getDayNumber(date)}</Text>
                  </View>
                  {dayWorkouts.length > 0 && (
                    <View style={styles.workoutDots}>
                      {dayWorkouts.slice(0, 3).map((w, i) => (
                        <View key={i} style={[styles.workoutDot, { backgroundColor: selected ? dark.bg : workoutColors[w.type] || gold[400] }]} />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Workouts for Selected Day */}
          <ScrollView
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshLog} tintColor={gold[400]} />}>
            <View style={styles.dayHeader}>
              <Text style={styles.selectedDateTitle}>
                {isToday(selectedDate) ? "Today's Workouts" : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <TouchableOpacity style={styles.addDayButton} onPress={() => { resetLogForm(); setLogModalVisible(true); }}>
                <Plus size={16} color={gold[400]} />
                <Text style={styles.addDayButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {savedAnimation && (
              <View style={styles.savedBanner}>
                <CheckCircle size={16} color="#3A8F52" />
                <Text style={styles.savedBannerText}>Workout logged!</Text>
              </View>
            )}

            {selectedWorkouts.length === 0 ? (
              <TouchableOpacity style={styles.emptyDayCard} onPress={() => { resetLogForm(); setLogModalVisible(true); }}>
                <Dumbbell size={32} color={`${gold[400]}60`} />
                <Text style={styles.emptyDayTitle}>No workouts yet</Text>
                <Text style={styles.emptyDaySubtitle}>Tap here or press + to log a workout</Text>
              </TouchableOpacity>
            ) : (
              selectedWorkouts.map(workout => (
                <View key={workout.id} style={styles.workoutCard}>
                  <View style={[styles.workoutColorBar, { backgroundColor: workoutColors[workout.type] || workoutColors['Other'] }]} />
                  <View style={styles.workoutContent}>
                    <View style={styles.workoutTopRow}>
                      <View style={[styles.workoutTypePill, { backgroundColor: `${workoutColors[workout.type] || workoutColors['Other']}20` }]}>
                        <Text style={[styles.workoutTypePillText, { color: workoutColors[workout.type] || workoutColors['Other'] }]}>{workout.type}</Text>
                      </View>
                      <TouchableOpacity onPress={() => deleteWorkout(workout.id)} style={styles.deleteButton}>
                        <Trash2 size={16} color={dark.textMuted} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.workoutStats}>
                      <View style={styles.statPill}>
                        <Clock size={13} color={dark.textSecondary} />
                        <Text style={styles.statPillText}>{workout.duration_minutes} min</Text>
                      </View>
                      {workout.calories_burned ? (
                        <View style={styles.statPill}>
                          <Flame size={13} color="#E74C3C" />
                          <Text style={styles.statPillText}>{workout.calories_burned} cal</Text>
                        </View>
                      ) : null}
                    </View>
                    {workout.notes ? <Text style={styles.workoutNotes}>{workout.notes}</Text> : null}
                  </View>
                </View>
              ))
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        </>
      )}

      {/* ── COACH TAB ───────────────────────────────────────────────────── */}
      {tab === 'coach' && (
        <ScrollView
          style={styles.coachScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshCoach} tintColor={gold[400]} />}>
          {/* Profile Summary Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileCardHeader}>
              <View style={styles.profileCardLeft}>
                <Text style={styles.profileCardLabel}>Your Fitness Profile</Text>
                <View style={styles.profileBadgeRow}>
                  <View style={styles.profileBadge}>
                    <Text style={styles.profileBadgeText}>{goalObj?.icon} {goalObj?.label || 'General'}</Text>
                  </View>
                  <View style={[styles.profileBadge, { backgroundColor: dark.elevated }]}>
                    <Text style={[styles.profileBadgeText, { color: dark.textSecondary }]}>{levelObj?.label || 'Beginner'}</Text>
                  </View>
                  <View style={[styles.profileBadge, { backgroundColor: dark.elevated }]}>
                    <Repeat2 size={11} color={dark.textMuted} />
                    <Text style={[styles.profileBadgeText, { color: dark.textMuted }]}>{profile.weekly_target}x/wk</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={() => { setDraftProfile({ ...profile }); setProfileModalVisible(true); }}>
                <Text style={styles.editProfileButtonText}>{profileSaved ? 'Edit' : 'Set Up'}</Text>
              </TouchableOpacity>
            </View>
            {profile.notes ? <Text style={styles.profileNotes}>{profile.notes}</Text> : null}
          </View>

          {/* Generate Workout Button */}
          <TouchableOpacity
            style={[styles.generateButton, loadingAI && styles.generateButtonDisabled]}
            onPress={generateWorkout}
            disabled={loadingAI}
            activeOpacity={0.85}>
            {loadingAI ? (
              <>
                <ActivityIndicator size="small" color={dark.bg} />
                <Text style={styles.generateButtonText}>Generating workout...</Text>
              </>
            ) : (
              <>
                <Zap size={20} color={dark.bg} />
                <Text style={styles.generateButtonText}>Generate Today's Workout</Text>
              </>
            )}
          </TouchableOpacity>

          {lastGenDate ? (
            <View style={styles.lastGenRow}>
              <RefreshCw size={11} color={dark.textMuted} />
              <Text style={styles.lastGenText}>Generated at {lastGenDate}</Text>
            </View>
          ) : null}

          {/* AI Response */}
          {aiResponse ? <CoachResponseCard response={aiResponse} /> : null}

          {/* Empty state */}
          {!aiResponse && !loadingAI && (
            <View style={styles.coachEmptyState}>
              <View style={styles.coachEmptyIcon}>
                <Brain size={36} color={`${gold[400]}50`} />
              </View>
              <Text style={styles.coachEmptyTitle}>Your AI personal trainer</Text>
              <Text style={styles.coachEmptySubtitle}>
                Set up your fitness profile above, then tap "Generate Today's Workout" to get a custom plan tailored to your goals and level.
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── PROGRESS TAB ────────────────────────────────────────────────── */}
      {tab === 'progress' && (
        <ScrollView
          style={styles.progressScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshProgress} tintColor={gold[400]} />}>
          {/* Streak + All-time stats */}
          <View style={styles.progressStatsRow}>
            <View style={[styles.progressStatCard, { borderLeftColor: '#E8B820' }]}>
              <Award size={20} color={gold[400]} />
              <Text style={styles.progressStatValue}>{streak}</Text>
              <Text style={styles.progressStatLabel}>Day Streak</Text>
            </View>
            <View style={[styles.progressStatCard, { borderLeftColor: '#3A8F52' }]}>
              <Dumbbell size={20} color="#3A8F52" />
              <Text style={styles.progressStatValue}>{totalWorkoutsAllTime}</Text>
              <Text style={styles.progressStatLabel}>Total Workouts</Text>
            </View>
            <View style={[styles.progressStatCard, { borderLeftColor: '#2E7A8A' }]}>
              <Target size={20} color="#2E7A8A" />
              <Text style={styles.progressStatValue}>{profile.weekly_target}</Text>
              <Text style={styles.progressStatLabel}>Weekly Goal</Text>
            </View>
          </View>

          {/* 4-Week Session Count Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <BarChart3 size={16} color={gold[400]} />
              <Text style={styles.chartTitle}>Workouts per Week</Text>
            </View>
            <View style={styles.chartBars}>
              {weeklyStats.map((week, i) => (
                <WeekBar key={i} label={week.label} value={week.count} maxValue={maxWeekCount} color={gold[400]} />
              ))}
              {weeklyStats.length === 0 && (
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textMuted, textAlign: 'center', flex: 1 }}>
                  No data yet — start logging workouts!
                </Text>
              )}
            </View>
          </View>

          {/* 4-Week Minutes Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Clock size={16} color="#2E7A8A" />
              <Text style={styles.chartTitle}>Active Minutes per Week</Text>
            </View>
            <View style={styles.chartBars}>
              {weeklyStats.map((week, i) => (
                <WeekBar key={i} label={week.label} value={week.minutes} maxValue={maxWeekMinutes} color="#2E7A8A" />
              ))}
              {weeklyStats.length === 0 && (
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textMuted, textAlign: 'center', flex: 1 }}>
                  No data yet
                </Text>
              )}
            </View>
          </View>

          {/* Weekly Summary Table */}
          {weeklyStats.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Weekly Breakdown</Text>
              {weeklyStats.map((week, i) => (
                <View key={i} style={[styles.summaryRow, i < weeklyStats.length - 1 && styles.summaryRowBorder]}>
                  <Text style={styles.summaryWeekLabel}>{week.label}</Text>
                  <View style={styles.summaryStats}>
                    <View style={styles.summaryStatItem}>
                      <Dumbbell size={12} color={gold[400]} />
                      <Text style={styles.summaryStatText}>{week.count} sessions</Text>
                    </View>
                    <View style={styles.summaryStatItem}>
                      <Clock size={12} color={dark.textMuted} />
                      <Text style={styles.summaryStatText}>{week.minutes} min</Text>
                    </View>
                    <View style={[
                      styles.summaryGoalBadge,
                      week.count >= profile.weekly_target ? styles.summaryGoalMet : styles.summaryGoalMissed,
                    ]}>
                      <Text style={[
                        styles.summaryGoalText,
                        week.count >= profile.weekly_target ? styles.summaryGoalMetText : styles.summaryGoalMissedText,
                      ]}>
                        {week.count >= profile.weekly_target ? 'Goal met' : `${profile.weekly_target - week.count} left`}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB for Log tab */}
      {tab === 'log' && (
        <TouchableOpacity style={styles.fab} onPress={() => { resetLogForm(); setLogModalVisible(true); }}>
          <Plus size={26} color={dark.bg} />
        </TouchableOpacity>
      )}

      {/* ── LOG WORKOUT MODAL ────────────────────────────────────────────── */}
      <Modal animationType="slide" transparent visible={logModalVisible} onRequestClose={() => setLogModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Log Workout</Text>
                <Text style={styles.modalSubtitle}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setLogModalVisible(false)}>
                <X size={20} color={dark.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Workout Type</Text>
            <View style={styles.workoutTypeGrid}>
              {workoutTypes.map(type => {
                const isSelected = workoutType === type;
                const color = workoutColors[type];
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.workoutTypeChip, isSelected && { backgroundColor: color, borderColor: color }]}
                    onPress={() => setWorkoutType(type)}>
                    <Text style={[styles.workoutTypeChipText, isSelected && styles.workoutTypeChipTextSelected, !isSelected && { color }]}>{type}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Duration</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={styles.numberInput}
                    placeholder="30"
                    placeholderTextColor={dark.textMuted}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                  <Text style={styles.unitLabel}>min</Text>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Calories <Text style={styles.optionalLabel}>(optional)</Text></Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={styles.numberInput}
                    placeholder="0"
                    placeholderTextColor={dark.textMuted}
                    value={caloriesBurned}
                    onChangeText={setCaloriesBurned}
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                  <Text style={styles.unitLabel}>kcal</Text>
                </View>
              </View>
            </View>

            <Text style={styles.fieldLabel}>Notes <Text style={styles.optionalLabel}>(optional)</Text></Text>
            <TextInput
              style={styles.notesInput}
              placeholder="How did it go? Any details..."
              placeholderTextColor={dark.textMuted}
              value={logNotes}
              onChangeText={setLogNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity style={[styles.saveButton, savingWorkout && { opacity: 0.7 }]} onPress={addWorkout} disabled={savingWorkout}>
              <CheckCircle size={20} color={dark.bg} />
              <Text style={styles.saveButtonText}>{savingWorkout ? 'Saving...' : 'Save Workout'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ── FITNESS PROFILE MODAL ────────────────────────────────────────── */}
      <Modal animationType="slide" transparent visible={profileModalVisible} onRequestClose={() => setProfileModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>Fitness Profile</Text>
                <Text style={styles.modalSubtitle}>Personalize your AI coach</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setProfileModalVisible(false)}>
                <X size={20} color={dark.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Goal selection */}
            <Text style={styles.fieldLabel}>Primary Goal</Text>
            <View style={styles.goalGrid}>
              {FITNESS_GOALS.map(g => (
                <TouchableOpacity
                  key={g.key}
                  style={[styles.goalChip, draftProfile.goal === g.key && styles.goalChipActive]}
                  onPress={() => setDraftProfile(p => ({ ...p, goal: g.key }))}>
                  <Text style={styles.goalChipIcon}>{g.icon}</Text>
                  <Text style={[styles.goalChipText, draftProfile.goal === g.key && styles.goalChipTextActive]}>{g.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fitness level */}
            <Text style={styles.fieldLabel}>Fitness Level</Text>
            <View style={styles.levelRow}>
              {FITNESS_LEVELS.map(l => (
                <TouchableOpacity
                  key={l.key}
                  style={[styles.levelChip, draftProfile.fitness_level === l.key && styles.levelChipActive]}
                  onPress={() => setDraftProfile(p => ({ ...p, fitness_level: l.key }))}>
                  <Text style={[styles.levelChipLabel, draftProfile.fitness_level === l.key && styles.levelChipLabelActive]}>{l.label}</Text>
                  <Text style={styles.levelChipDesc}>{l.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Weekly target */}
            <Text style={styles.fieldLabel}>Weekly Session Target</Text>
            <View style={styles.weeklyTargetRow}>
              {[2, 3, 4, 5, 6].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.targetChip, draftProfile.weekly_target === n && styles.targetChipActive]}
                  onPress={() => setDraftProfile(p => ({ ...p, weekly_target: n }))}>
                  <Text style={[styles.targetChipText, draftProfile.weekly_target === n && styles.targetChipTextActive]}>{n}x</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={styles.fieldLabel}>Additional Notes <Text style={styles.optionalLabel}>(optional)</Text></Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Injuries, preferences, equipment available..."
              placeholderTextColor={dark.textMuted}
              value={draftProfile.notes}
              onChangeText={v => setDraftProfile(p => ({ ...p, notes: v }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity style={[styles.saveButton, savingProfile && { opacity: 0.7 }]} onPress={saveProfile} disabled={savingProfile}>
              <CheckCircle size={20} color={dark.bg} />
              <Text style={styles.saveButtonText}>{savingProfile ? 'Saving...' : 'Save Profile'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dark.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + 20,
    paddingBottom: spacing.md,
    backgroundColor: dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: `${gold[400]}30`,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 26, color: dark.text, marginBottom: 2 },
  headerSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textSecondary },
  headerLogButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: gold[400], paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: borderRadius.full,
  },
  headerLogButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: dark.bg },
  headerProfileButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: dark.goldSurface, paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: `${gold[400]}40`,
  },
  headerProfileButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: gold[400] },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: dark.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: dark.border,
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8, borderRadius: borderRadius.lg,
    backgroundColor: dark.elevated, borderWidth: 1, borderColor: dark.border,
  },
  tabItemActive: { backgroundColor: gold[400], borderColor: gold[400] },
  tabLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: dark.textSecondary },
  tabLabelActive: { color: dark.bg },

  // Log tab
  weekSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.md, backgroundColor: dark.surface,
    paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: dark.border,
  },
  weekNavButton: {
    padding: spacing.sm, borderRadius: borderRadius.full,
    backgroundColor: dark.elevated, borderWidth: 1, borderColor: dark.border,
  },
  weekNavButtonDisabled: { opacity: 0.4 },
  weekText: {
    fontFamily: 'Inter_600SemiBold', fontSize: 15, color: dark.text,
    marginHorizontal: spacing.lg, minWidth: 140, textAlign: 'center',
  },

  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
  statCard: {
    flex: 1, alignItems: 'center', padding: spacing.md, backgroundColor: dark.surface,
    borderRadius: borderRadius.lg, borderLeftWidth: 3, borderWidth: 1, borderColor: dark.border, gap: 4,
  },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 20, color: dark.text },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: dark.textSecondary },

  weekCalendar: {
    flexDirection: 'row', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    backgroundColor: dark.surface, marginBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: dark.border,
  },
  dayColumn: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.lg, gap: 4 },
  dayColumnSelected: { backgroundColor: gold[400] },
  dayColumnToday: { borderWidth: 1, borderColor: `${gold[400]}50` },
  dayName: { fontFamily: 'Inter_500Medium', fontSize: 10, color: dark.textSecondary },
  dayNameSelected: { color: dark.bg },
  dayNumberContainer: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  dayNumberContainerSelected: { backgroundColor: gold[500] },
  dayNumberContainerToday: { backgroundColor: dark.goldSurface, borderWidth: 1, borderColor: `${gold[400]}50` },
  dayNumber: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: dark.textSecondary },
  dayNumberSelected: { color: dark.bg },
  workoutDots: { flexDirection: 'row', gap: 2 },
  workoutDot: { width: 4, height: 4, borderRadius: 2 },

  listContainer: { flex: 1, paddingHorizontal: spacing.md },
  dayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md,
  },
  selectedDateTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: dark.text },
  addDayButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: borderRadius.full, borderWidth: 1,
    borderColor: `${gold[400]}50`, backgroundColor: dark.goldSurface,
  },
  addDayButtonText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: gold[400] },

  savedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#0D1F12', borderWidth: 1, borderColor: '#3A8F5260',
    borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md,
  },
  savedBannerText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#3A8F52' },

  emptyDayCard: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: dark.surface,
    borderRadius: borderRadius.xl, padding: spacing['2xl'],
    borderWidth: 1, borderColor: dark.border, borderStyle: 'dashed', gap: spacing.sm, marginTop: spacing.sm,
  },
  emptyDayTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: dark.textSecondary },
  emptyDaySubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textMuted, textAlign: 'center' },

  workoutCard: {
    flexDirection: 'row', backgroundColor: dark.surface, borderRadius: borderRadius.lg,
    marginBottom: spacing.sm, overflow: 'hidden', borderWidth: 1, borderColor: dark.border,
  },
  workoutColorBar: { width: 5 },
  workoutContent: { flex: 1, padding: spacing.md },
  workoutTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  workoutTypePill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
  workoutTypePillText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  deleteButton: { padding: 4 },
  workoutStats: { flexDirection: 'row', gap: spacing.sm },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: dark.elevated, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full,
  },
  statPillText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: dark.textSecondary },
  workoutNotes: { fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textMuted, fontStyle: 'italic', marginTop: spacing.sm },

  fab: {
    position: 'absolute', right: spacing.lg, bottom: 100,
    width: 56, height: 56, borderRadius: 28, backgroundColor: gold[400],
    justifyContent: 'center', alignItems: 'center',
    shadowColor: gold[400], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },

  // Coach tab
  coachScroll: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md },

  profileCard: {
    backgroundColor: dark.surface, borderRadius: borderRadius.xl,
    padding: spacing.md, borderWidth: 1, borderColor: `${gold[400]}30`, marginBottom: spacing.md,
  },
  profileCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  profileCardLeft: { flex: 1 },
  profileCardLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: dark.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  profileBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  profileBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: dark.goldSurface, paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: `${gold[400]}30`,
  },
  profileBadgeText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: gold[400] },
  editProfileButton: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    backgroundColor: dark.elevated, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: dark.border,
  },
  editProfileButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: dark.textSecondary },
  profileNotes: { fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },

  generateButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: gold[400], paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.lg, marginBottom: spacing.sm,
    shadowColor: gold[400], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  generateButtonDisabled: { opacity: 0.7 },
  generateButtonText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: dark.bg },

  lastGenRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.md, justifyContent: 'center' },
  lastGenText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: dark.textMuted },

  coachCard: {
    backgroundColor: dark.surface, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: `${gold[400]}25`, overflow: 'hidden', marginBottom: spacing.md,
  },
  coachCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: dark.border,
  },
  coachCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  coachIconBadge: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: dark.goldSurface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: `${gold[400]}40`,
  },
  coachCardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: dark.text },
  coachCardBody: { padding: spacing.md, gap: 4 },
  coachBodyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: dark.textSecondary, lineHeight: 21 },
  coachBodyBold: { fontFamily: 'Inter_600SemiBold', color: dark.text, marginTop: 6 },
  coachBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  coachBulletDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: gold[400], marginTop: 8, flexShrink: 0 },
  coachBulletText: { flex: 1 },

  coachEmptyState: {
    alignItems: 'center', paddingVertical: spacing['2xl'],
    backgroundColor: dark.surface, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: dark.border, gap: spacing.sm, marginTop: spacing.md,
  },
  coachEmptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: dark.elevated, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: `${gold[400]}20`,
  },
  coachEmptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: dark.textSecondary },
  coachEmptySubtitle: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textMuted,
    textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.lg,
  },

  // Progress tab
  progressScroll: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.md },

  progressStatsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  progressStatCard: {
    flex: 1, alignItems: 'center', padding: spacing.md,
    backgroundColor: dark.surface, borderRadius: borderRadius.lg,
    borderLeftWidth: 3, borderWidth: 1, borderColor: dark.border, gap: 4,
  },
  progressStatValue: { fontFamily: 'Inter_700Bold', fontSize: 22, color: dark.text },
  progressStatLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: dark.textSecondary, textAlign: 'center' },

  chartCard: {
    backgroundColor: dark.surface, borderRadius: borderRadius.xl,
    padding: spacing.md, borderWidth: 1, borderColor: dark.border, marginBottom: spacing.md,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  chartTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: dark.text },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, minHeight: 110 },

  summaryCard: {
    backgroundColor: dark.surface, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: dark.border, overflow: 'hidden', marginBottom: spacing.md,
  },
  summaryTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: dark.text, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: dark.border },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: dark.border },
  summaryWeekLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: dark.textSecondary, width: 60 },
  summaryStats: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  summaryStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryStatText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: dark.textMuted },
  summaryGoalBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full, marginLeft: 'auto' },
  summaryGoalMet: { backgroundColor: '#0D1F12', borderWidth: 1, borderColor: '#3A8F5240' },
  summaryGoalMissed: { backgroundColor: dark.elevated, borderWidth: 1, borderColor: dark.border },
  summaryGoalText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  summaryGoalMetText: { color: '#3A8F52' },
  summaryGoalMissedText: { color: dark.textMuted },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.85)' },
  modalScroll: {
    backgroundColor: dark.surface, borderTopLeftRadius: borderRadius['2xl'], borderTopRightRadius: borderRadius['2xl'],
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: `${gold[400]}35`, maxHeight: '92%',
  },
  modalScrollContent: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  modalHandle: { width: 40, height: 4, backgroundColor: dark.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, color: dark.text },
  modalSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: gold[400], marginTop: 2 },
  modalCloseButton: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: dark.elevated,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: dark.border,
  },

  fieldLabel: {
    fontFamily: 'Inter_600SemiBold', fontSize: 13, color: dark.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.md,
  },
  optionalLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: dark.textMuted, textTransform: 'none', letterSpacing: 0 },

  workoutTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  workoutTypeChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full,
    backgroundColor: dark.elevated, borderWidth: 1.5, borderColor: dark.border,
  },
  workoutTypeChipText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  workoutTypeChipTextSelected: { color: dark.bg, fontFamily: 'Inter_600SemiBold' },

  inputRow: { flexDirection: 'row', gap: spacing.md },
  inputGroup: { flex: 1 },
  inputWithUnit: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: dark.elevated, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: dark.border, overflow: 'hidden',
  },
  numberInput: {
    flex: 1, fontFamily: 'Inter_500Medium', fontSize: 20, color: dark.text,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, textAlign: 'center',
  },
  unitLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: dark.textMuted, paddingRight: spacing.md },

  notesInput: {
    backgroundColor: dark.elevated, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: dark.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontFamily: 'Inter_400Regular', fontSize: 15, color: dark.text, minHeight: 90, marginBottom: spacing.lg,
  },

  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: gold[400], paddingVertical: spacing.md + 2, borderRadius: borderRadius.lg, gap: spacing.sm,
    shadowColor: gold[400], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveButtonText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: dark.bg },

  // Profile modal specifics
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  goalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: dark.elevated, borderRadius: borderRadius.full,
    borderWidth: 1.5, borderColor: dark.border,
  },
  goalChipActive: { backgroundColor: dark.goldSurface, borderColor: gold[400] },
  goalChipIcon: { fontSize: 14 },
  goalChipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: dark.textSecondary },
  goalChipTextActive: { color: gold[400], fontFamily: 'Inter_600SemiBold' },

  levelRow: { flexDirection: 'row', gap: spacing.sm },
  levelChip: {
    flex: 1, padding: spacing.md, backgroundColor: dark.elevated,
    borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: dark.border, alignItems: 'center', gap: 3,
  },
  levelChipActive: { backgroundColor: dark.goldSurface, borderColor: gold[400] },
  levelChipLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: dark.textSecondary },
  levelChipLabelActive: { color: gold[400] },
  levelChipDesc: { fontFamily: 'Inter_400Regular', fontSize: 11, color: dark.textMuted },

  weeklyTargetRow: { flexDirection: 'row', gap: spacing.sm },
  targetChip: {
    flex: 1, paddingVertical: spacing.md,
    backgroundColor: dark.elevated, borderRadius: borderRadius.lg,
    borderWidth: 1.5, borderColor: dark.border, alignItems: 'center',
  },
  targetChipActive: { backgroundColor: dark.goldSurface, borderColor: gold[400] },
  targetChipText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: dark.textSecondary },
  targetChipTextActive: { color: gold[400] },
});
