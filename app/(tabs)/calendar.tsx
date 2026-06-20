import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Modal, TextInput, Alert, Dimensions, RefreshControl, Keyboard,
} from 'react-native';
import {
  ChevronLeft, ChevronRight, Plus, AlertTriangle, CheckCircle,
  Clock, X, TrendingUp, Zap, Target, Dumbbell, BookOpen,
  Moon, Trash2, Calendar, ListChecks, Sparkles, Award, Pencil,
} from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { dark, gold, spacing, borderRadius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DatePickerField } from '@/components/DatePickerField';
import { TimePickerField } from '@/components/TimePickerField';
import { haptics } from '@/lib/haptics';

const { width } = Dimensions.get('window');
const CELL_SIZE = (width - spacing.lg * 2 - spacing.sm * 6) / 7;

interface Assignment {
  id: string; title: string; subject: string;
  due_date: string; priority: string; status: string; is_exam: boolean;
  grade: number | null; max_grade: number | null; color?: string | null;
  display_time?: string | null;
}
interface Exam {
  id: string; title: string; subject: string; exam_date: string; status: string;
  grade: number | null; max_grade: number | null; color?: string | null;
  display_time?: string | null;
}
interface ScheduleBlock {
  id: string; date: string; title: string; type: string;
  start_time: string | null; duration_minutes: number; completed: boolean; auto_generated: boolean; notes: string | null;
  color?: string | null;
}
interface UserGoal {
  id: string; title: string; type: string;
  target_minutes: number; frequency: string; color: string;
  preferred_time?: string | null;
}

type ViewMode = 'calendar' | 'week' | 'goals';
type GoalType = 'study' | 'workout' | 'reading' | 'sleep' | 'other';
type GoalFreq = 'daily' | 'weekdays' | 'weekends' | 'weekly';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const BLOCK_COLORS: Record<string, string> = {
  study: gold[400], workout: '#3A8F52', reading: '#6366f1',
  sleep: '#0891b2', reminder: '#f59e0b', class: '#C0392B', other: '#8A8A8A',
};

const GOAL_ICONS: Record<GoalType, React.ComponentType<{ size: number; color: string }>> = {
  study: BookOpen, workout: Dumbbell, reading: ListChecks, sleep: Moon, other: Target,
};

const GOAL_COLOR_SWATCHES = [
  gold[400], '#3A8F52', '#6366f1', '#0891b2', '#f59e0b',
  '#C0392B', '#8A8A8A', '#EC4899', '#8B5CF6', '#14B8A6',
];

function blockColor(b: { type: string; color?: string | null }): string {
  return b.color || BLOCK_COLORS[b.type] || gold[400];
}

// ── Week grid (drag-to-reschedule) ────────────────────────────────────────────
const GRID_START_HOUR = 6;
const GRID_END_HOUR = 23; // exclusive
const GRID_HOURS = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i);
const ROW_HEIGHT = 56;
const GRID_LABEL_WIDTH = 36;
const EXAM_DEFAULT_TIME = '09:00';
const EXAM_DEFAULT_DURATION = 60;
const DUE_DEFAULT_TIME = '17:00';
const DUE_DEFAULT_DURATION = 60;
// Chips never render shorter than this many px (so time/title/meta text always
// fits) — scheduling must reserve at least this many minutes too, or a short
// block's true duration won't overlap on the calendar but its rendered box will.
const MIN_CHIP_HEIGHT_PX = 50;
const MIN_BLOCK_MINUTES = Math.ceil((MIN_CHIP_HEIGHT_PX / ROW_HEIGHT) * 60);
// Reserved time slots are bumped by this much beyond what they need so
// adjacent chips never render edge-to-edge — without this, back-to-back
// items have a ~0px gap and look like one fused block even though their
// time ranges don't actually overlap.
const CHIP_GAP_PX = 6;
const GAP_MINUTES = Math.max(1, Math.round((CHIP_GAP_PX / ROW_HEIGHT) * 60));

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Finds the closest free slot to desiredStart (searching outward in 15-min
// steps) that doesn't overlap any interval already booked that day.
function findFreeSlot(busy: Array<[number, number]>, desiredStart: number, duration: number): number {
  const dayStart = GRID_START_HOUR * 60;
  const dayEnd = GRID_END_HOUR * 60;
  const step = 15;
  const clampedStart = Math.max(dayStart, Math.min(desiredStart, dayEnd - duration));
  const fits = (start: number) =>
    start >= dayStart && start + duration <= dayEnd &&
    !busy.some(([s, e]) => start < e && s < start + duration);

  for (let offset = 0; offset <= dayEnd - dayStart; offset += step) {
    if (fits(clampedStart + offset)) return clampedStart + offset;
    if (offset > 0 && fits(clampedStart - offset)) return clampedStart - offset;
  }
  return clampedStart;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function addDaysToStr(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return dt.toISOString().split('T')[0];
}

function parseLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = parseLocal(dateStr);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatShortDate(dateStr: string): string {
  return parseLocal(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function DraggableBlock({
  block, top, height, color,
  onMoved, onToggle, onDelete, onChangeDay, setScrollEnabled,
}: {
  block: ScheduleBlock; top: number; height: number; color: string;
  onMoved: (id: string, rawTop: number) => void;
  onToggle: () => void; onDelete: () => void; onChangeDay: () => void;
  setScrollEnabled: (v: boolean) => void;
}) {
  const translateY = useSharedValue(0);
  const dragging = useSharedValue(false);

  // Pan is confined to the text area below (not the action buttons), so taps
  // on the checkbox/delete/move-day icons are never intercepted by the gesture.
  const pan = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      dragging.value = true;
      runOnJS(setScrollEnabled)(false);
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      runOnJS(onMoved)(block.id, top + translateY.value);
      translateY.value = 0;
      dragging.value = false;
      runOnJS(setScrollEnabled)(true);
    })
    .onFinalize(() => {
      dragging.value = false;
      runOnJS(setScrollEnabled)(true);
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: dragging.value ? 1.03 : 1 }],
    zIndex: dragging.value ? 100 : 1,
    elevation: dragging.value ? 8 : 1,
  }));

  return (
    <Animated.View
      style={[
        styles.gridChip,
        { top, height, borderLeftColor: color, opacity: block.completed ? 0.5 : 1 },
        animStyle,
      ]}>
      <GestureDetector gesture={pan}>
        <View style={styles.gridChipDragArea}>
          <View style={styles.gridChipTextRow}>
            {block.start_time && <Text style={styles.gridChipTime}>{block.start_time}</Text>}
            <Text style={styles.gridChipTitle} numberOfLines={1}>{block.title}</Text>
          </View>
          <Text style={styles.gridChipMeta}>{block.duration_minutes}min{block.auto_generated ? ' · auto' : ''}</Text>
        </View>
      </GestureDetector>
      <View style={styles.gridChipActions}>
        <TouchableOpacity onPress={onToggle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          {block.completed ? <CheckCircle size={16} color="#3A8F52" /> : <View style={styles.gridChipDot} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={onChangeDay} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Calendar size={15} color={dark.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Trash2 size={15} color={dark.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function CalendarScreen() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState<string>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const monday = new Date(d); monday.setDate(d.getDate() - day);
    return monday.toISOString().split('T')[0];
  });

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [blockSaved, setBlockSaved] = useState(false);
  const [goalSaved, setGoalSaved] = useState(false);

  // Add block modal
  const [blockModal, setBlockModal] = useState(false);
  const [blockTitle, setBlockTitle] = useState('');
  const [blockType, setBlockType] = useState<string>('study');
  const [blockDate, setBlockDate] = useState('');
  const [blockTime, setBlockTime] = useState('');
  const [blockDuration, setBlockDuration] = useState('60');

  // Add/edit goal modal
  const [goalModal, setGoalModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('study');
  const [goalFreq, setGoalFreq] = useState<GoalFreq>('daily');
  const [goalMins, setGoalMins] = useState('30');
  const [goalColor, setGoalColor] = useState(GOAL_COLOR_SWATCHES[0]);
  const [goalTime, setGoalTime] = useState('');

  // Record grade modal
  const [gradeModal, setGradeModal] = useState(false);
  const [gradeTarget, setGradeTarget] = useState<{ id: string; title: string; isExam: boolean } | null>(null);
  const [gradeValue, setGradeValue] = useState('');
  const [gradeMaxValue, setGradeMaxValue] = useState('100');
  const [savingGrade, setSavingGrade] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [weekScrollEnabled, setWeekScrollEnabled] = useState(true);
  const [gridDay, setGridDay] = useState(weekStart);

  // Move-to-day modal (for blocks)
  const [moveDayModal, setMoveDayModal] = useState(false);
  const [moveDayTargetId, setMoveDayTargetId] = useState<string | null>(null);
  const [moveDayValue, setMoveDayValue] = useState('');

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => { loadAll(); }, [currentYear, currentMonth]);
  useEffect(() => { loadBlocksForWeek(); }, [weekStart]);
  useEffect(() => { loadGoals(); }, []);
  useEffect(() => {
    const end = addDaysToStr(weekStart, 6);
    const t = todayStr();
    setGridDay(t >= weekStart && t <= end ? t : weekStart);
  }, [weekStart]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAll(), loadBlocksForWeek(), loadGoals()]);
    setRefreshing(false);
  };

  const loadAll = async () => {
    const start = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
    const end = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

    console.log('[loadAll] user:', user?.id, 'range:', start, '→', end);

    const [{ data: asgn, error: asgnErr }, { data: examRows, error: exmErr }, { data: blk, error: blkErr }] = await Promise.all([
      supabase.from('assignments').select('id,title,subject,due_date,priority,status,is_exam,grade,max_grade,color,display_time').gte('due_date', start).lte('due_date', end),
      supabase.from('assignments').select('id,title,subject,due_date,status,grade,max_grade,color,display_time').eq('is_exam', true).gte('due_date', start).lte('due_date', end),
      supabase.from('schedule_blocks').select('*').gte('date', start).lte('date', end),
    ]);
    if (asgnErr) console.error('[loadAll] assignments error:', asgnErr.message);
    if (exmErr) console.error('[loadAll] exams error:', exmErr.message);
    if (blkErr) console.error('[loadAll] blocks error:', blkErr.message);
    console.log('[loadAll] asgn:', asgn?.length, 'exm:', examRows?.length, 'blk:', blk?.length);
    setAssignments((asgn || []).filter(a => !a.is_exam));
    setExams((examRows || []).map(a => ({
      id: a.id, title: a.title, subject: a.subject,
      exam_date: a.due_date, status: a.status,
      grade: a.grade, max_grade: a.max_grade, color: a.color, display_time: a.display_time,
    })));
    setBlocks(blk || []);
  };

  const loadBlocksForWeek = async () => {
    const end = addDaysToStr(weekStart, 6);
    const { data } = await supabase.from('schedule_blocks').select('*').gte('date', weekStart).lte('date', end).order('start_time');
    setBlocks(data || []);
  };

  const loadGoals = async () => {
    console.log('[loadGoals] user:', user?.id);
    const { data, error } = await supabase.from('user_goals').select('*').order('created_at');
    console.log('[loadGoals] result:', data?.length, 'error:', error?.message);
    setGoals(data || []);
  };

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const getDaysInMonth = () => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days: Array<{ date: string | null }> = [];
    for (let i = 0; i < firstDay; i++) days.push({ date: null });
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}` });
    }
    return days;
  };

  const getEventsForDate = (date: string) => {
    const a = assignments.filter(x => x.due_date === date);
    const e = exams.filter(x => x.exam_date === date);
    const b = blocks.filter(x => x.date === date);
    return { assignments: a, exams: e, blocks: b };
  };

  const isToday = (d: string) => d === todayStr();
  const isPast = (d: string) => d < todayStr();

  const getMonthStats = () => {
    const completed = assignments.filter(a => a.status === 'completed').length;
    const pending = assignments.filter(a => a.status === 'pending').length;
    const missing = assignments.filter(a => a.status !== 'completed' && isPast(a.due_date)).length;
    return { completed, pending, missing, total: assignments.length };
  };

  // ── Smart schedule generation ─────────────────────────────────────────────
  const generateSchedule = async () => {
    if (!user) return;
    setGenerating(true);

    const today = todayStr();
    const horizon30 = addDaysToStr(today, 30);
    const horizon14 = addDaysToStr(today, 14);

    const [{ data: upExams }, { data: upAssignments }] = await Promise.all([
      supabase.from('assignments').select('*').eq('is_exam', true).neq('status', 'completed').gte('due_date', today).lte('due_date', horizon30),
      supabase.from('assignments').select('*').eq('is_exam', false).neq('status', 'completed').gte('due_date', today).lte('due_date', horizon14),
    ]);

    // Delete existing auto-generated blocks in the window
    await supabase.from('schedule_blocks').delete().eq('auto_generated', true).gte('date', today);

    // Seed busy intervals per day from whatever's left (manually-added blocks)
    // so generated sessions never land on top of them.
    const { data: existingBlocks } = await supabase
      .from('schedule_blocks').select('date,start_time,duration_minutes')
      .gte('date', today).lte('date', horizon30);
    const busyByDate: Record<string, Array<[number, number]>> = {};
    for (const b of (existingBlocks || [])) {
      if (!b.start_time) continue;
      const start = timeToMinutes(b.start_time);
      (busyByDate[b.date] ??= []).push([start, start + Math.max(b.duration_minutes || 60, MIN_BLOCK_MINUTES) + GAP_MINUTES]);
    }

    const place = (date: string, desiredStartTime: string, duration: number): string => {
      const busy = busyByDate[date] ??= [];
      const reserve = Math.max(duration, MIN_BLOCK_MINUTES);
      const start = findFreeSlot(busy, timeToMinutes(desiredStartTime), reserve);
      busy.push([start, start + reserve + GAP_MINUTES]);
      return minutesToTime(start);
    };

    // Reserve a slot for every exam/due-assignment so study sessions and
    // goals never get scheduled on top of them. Exams/assignments that
    // already have a display_time keep it (just seed busyByDate); ones that
    // don't get assigned one now and it's persisted.
    const examTimeUpdates: Array<{ id: string; display_time: string }> = [];
    for (const exam of (upExams || [])) {
      if (exam.display_time) {
        const start = timeToMinutes(exam.display_time);
        (busyByDate[exam.due_date] ??= []).push([start, start + EXAM_DEFAULT_DURATION + GAP_MINUTES]);
      } else {
        const display_time = place(exam.due_date, EXAM_DEFAULT_TIME, EXAM_DEFAULT_DURATION);
        examTimeUpdates.push({ id: exam.id, display_time });
      }
    }
    const dueTimeUpdates: Array<{ id: string; display_time: string }> = [];
    for (const a of (upAssignments || [])) {
      if (a.display_time) {
        const start = timeToMinutes(a.display_time);
        (busyByDate[a.due_date] ??= []).push([start, start + DUE_DEFAULT_DURATION + GAP_MINUTES]);
      } else {
        const display_time = place(a.due_date, DUE_DEFAULT_TIME, DUE_DEFAULT_DURATION);
        dueTimeUpdates.push({ id: a.id, display_time });
      }
    }

    const toInsert: Omit<ScheduleBlock, 'id' | 'created_at'>[] = [];

    // Exam study sessions: one session per day in the week before the exam
    for (const exam of (upExams || [])) {
      const days = daysUntil(exam.due_date);
      const studyDays = Math.min(Math.max(days - 1, 0), 7);
      for (let d = 1; d <= studyDays; d++) {
        const date = addDaysToStr(exam.due_date, -d);
        if (date >= today) {
          toInsert.push({
            user_id: user.id,
            date,
            title: `Study: ${exam.subject}`,
            type: 'study',
            start_time: place(date, '19:00', 60),
            duration_minutes: 60,
            completed: false,
            auto_generated: true,
            notes: `Preparation for "${exam.title}"`,
          } as any);
        }
      }
    }

    // Assignment work sessions: day before due
    for (const a of (upAssignments || [])) {
      const days = daysUntil(a.due_date);
      if (days > 0) {
        const date = days === 1 ? today : addDaysToStr(a.due_date, -1);
        toInsert.push({
          user_id: user.id,
          date,
          title: `Work on: ${a.title}`,
          type: 'study',
          start_time: place(date, '18:00', 45),
          duration_minutes: 45,
          completed: false,
          auto_generated: true,
          notes: a.subject,
        } as any);
      }
    }

    // Goal-based recurring blocks for the next 7 days
    const loadedGoals = goals.length > 0 ? goals : (await supabase.from('user_goals').select('*')).data || [];
    for (const goal of loadedGoals) {
      for (let d = 0; d < 7; d++) {
        const date = addDaysToStr(today, d);
        const dow = parseLocal(date).getDay(); // 0=Sun
        if (goal.frequency === 'weekdays' && (dow === 0 || dow === 6)) continue;
        if (goal.frequency === 'weekends' && dow !== 0 && dow !== 6) continue;
        if (goal.frequency === 'weekly' && dow !== 1) continue;
        const desired = goal.preferred_time || (goal.type === 'workout' ? '07:00' : goal.type === 'sleep' ? '22:00' : '20:00');
        toInsert.push({
          user_id: user.id,
          date,
          title: goal.title,
          type: goal.type,
          start_time: place(date, desired, goal.target_minutes),
          duration_minutes: goal.target_minutes,
          completed: false,
          auto_generated: true,
          notes: `Goal: ${goal.frequency}`,
          color: goal.color,
        } as any);
      }
    }

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase.from('schedule_blocks').insert(toInsert);
      if (insertErr) {
        console.error('[generateSchedule] insert failed:', insertErr.message);
        setGenerating(false);
        haptics.warning();
        Alert.alert('Error', 'Could not generate schedule: ' + insertErr.message);
        return;
      }
    }

    await Promise.all([
      ...examTimeUpdates.map(u => supabase.from('assignments').update({ display_time: u.display_time }).eq('id', u.id)),
      ...dueTimeUpdates.map(u => supabase.from('assignments').update({ display_time: u.display_time }).eq('id', u.id)),
    ]);

    setGenerating(false);
    Alert.alert('Schedule Generated', `Created ${toInsert.length} blocks across the next 7–30 days.`);
    loadAll();
    loadBlocksForWeek();
  };

  // ── Block / goal CRUD ─────────────────────────────────────────────────────
  // Busy intervals for a date, from already-loaded blocks (and optionally
  // assigned exam/due times), excluding one block id (the one being moved).
  const busyForDate = (date: string, excludeId?: string): Array<[number, number]> => [
    ...blocks
      .filter(b => b.date === date && b.start_time && b.id !== excludeId)
      .map(b => [timeToMinutes(b.start_time!), timeToMinutes(b.start_time!) + Math.max(b.duration_minutes, MIN_BLOCK_MINUTES) + GAP_MINUTES] as [number, number]),
    ...exams.filter(e => e.exam_date === date && e.display_time)
      .map(e => [timeToMinutes(e.display_time!), timeToMinutes(e.display_time!) + EXAM_DEFAULT_DURATION + GAP_MINUTES] as [number, number]),
    ...assignments.filter(a => a.due_date === date && a.display_time)
      .map(a => [timeToMinutes(a.display_time!), timeToMinutes(a.display_time!) + DUE_DEFAULT_DURATION + GAP_MINUTES] as [number, number]),
  ];

  const addBlock = async () => {
    if (!blockTitle.trim() || !blockDate.trim()) return;
    setSavingBlock(true);

    console.log('[addBlock] user_id:', user?.id, 'date:', blockDate, 'title:', blockTitle);

    const duration = parseInt(blockDuration, 10) || 60;
    let startTime = blockTime.trim() || null;
    if (startTime) {
      const start = findFreeSlot(busyForDate(blockDate.trim()), timeToMinutes(startTime), Math.max(duration, MIN_BLOCK_MINUTES));
      startTime = minutesToTime(start);
    }

    const { data: saved, error } = await supabase.from('schedule_blocks').insert({
      title: blockTitle.trim(), type: blockType,
      date: blockDate.trim(), start_time: startTime,
      duration_minutes: duration,
      completed: false,
    }).select().single();

    console.log('[addBlock] insert result:', saved, 'error:', error?.message);

    setSavingBlock(false);
    if (error) {
      console.error('[addBlock] failed:', error.message, error.code);
      haptics.warning();
      Alert.alert('Error', 'Could not save block: ' + error.message);
      return;
    }

    setBlockModal(false); setBlockTitle(''); setBlockDate(''); setBlockTime(''); setBlockDuration('60');
    haptics.success();
    setBlockSaved(true); setTimeout(() => setBlockSaved(false), 2500);

    // Optimistic update
    if (saved) {
      setBlocks(prev => [...prev, saved as ScheduleBlock]);
    }

    loadAll(); loadBlocksForWeek();
  };

  const toggleBlock = async (b: ScheduleBlock) => {
    console.log('[toggleBlock] id:', b.id, 'completed:', b.completed, '→', !b.completed);
    const { error } = await supabase.from('schedule_blocks').update({ completed: !b.completed }).eq('id', b.id);
    if (error) {
      console.error('[toggleBlock] failed:', error.message);
      haptics.warning();
      Alert.alert('Error', 'Could not update block: ' + error.message);
      return;
    }
    setBlocks(prev => prev.map(x => x.id === b.id ? { ...x, completed: !b.completed } : x));
    loadAll(); loadBlocksForWeek();
  };

  const deleteBlock = async (id: string) => {
    console.log('[deleteBlock] id:', id);
    const { error } = await supabase.from('schedule_blocks').delete().eq('id', id);
    if (error) {
      console.error('[deleteBlock] failed:', error.message);
      haptics.warning();
      Alert.alert('Error', 'Could not delete block: ' + error.message);
      return;
    }
    setBlocks(prev => prev.filter(b => b.id !== id));
    loadAll(); loadBlocksForWeek();
  };

  const openAddGoalModal = () => {
    setEditingGoalId(null);
    setGoalTitle(''); setGoalType('study'); setGoalFreq('daily'); setGoalMins('30');
    setGoalColor(BLOCK_COLORS['study']); setGoalTime('');
    setGoalModal(true);
  };

  const openEditGoalModal = (goal: UserGoal) => {
    setEditingGoalId(goal.id);
    setGoalTitle(goal.title); setGoalType(goal.type as GoalType); setGoalFreq(goal.frequency as GoalFreq);
    setGoalMins(String(goal.target_minutes)); setGoalColor(goal.color || BLOCK_COLORS[goal.type] || gold[400]);
    setGoalTime(goal.preferred_time || '');
    setGoalModal(true);
  };

  const closeGoalModal = () => { setGoalModal(false); setEditingGoalId(null); };

  const saveGoal = async () => {
    if (!goalTitle.trim()) return;
    setSavingGoal(true);

    const payload = {
      title: goalTitle.trim(), type: goalType,
      target_minutes: parseInt(goalMins, 10) || 30, frequency: goalFreq,
      color: goalColor, preferred_time: goalTime.trim() || null,
    };

    console.log('[saveGoal] user_id:', user?.id, 'editing:', editingGoalId, payload);

    const query = editingGoalId
      ? supabase.from('user_goals').update(payload).eq('id', editingGoalId)
      : supabase.from('user_goals').insert(payload);
    const { data: saved, error } = await query.select().single();

    console.log('[saveGoal] result:', saved, 'error:', error?.message);

    setSavingGoal(false);
    if (error) {
      console.error('[saveGoal] failed:', error.message, error.code);
      haptics.warning();
      Alert.alert('Error', 'Could not save goal: ' + error.message);
      return;
    }

    closeGoalModal(); setGoalTitle(''); setGoalMins('30');
    haptics.success();
    setGoalSaved(true); setTimeout(() => setGoalSaved(false), 2500);

    if (saved) {
      setGoals(prev => editingGoalId
        ? prev.map(g => g.id === editingGoalId ? saved as UserGoal : g)
        : [...prev, saved as UserGoal]);
    } else {
      loadGoals();
    }
  };

  const moveBlock = async (id: string, newDate: string, newStartTime: string) => {
    console.log('[moveBlock] id:', id, 'date:', newDate, 'time:', newStartTime);
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, date: newDate, start_time: newStartTime } : b));
    haptics.success();
    const { error } = await supabase.from('schedule_blocks').update({ date: newDate, start_time: newStartTime }).eq('id', id);
    if (error) {
      console.error('[moveBlock] failed:', error.message);
      haptics.warning();
      Alert.alert('Error', 'Could not reschedule block: ' + error.message);
      loadBlocksForWeek();
      return;
    }
    loadAll();
  };

  const openMoveDayModal = (block: ScheduleBlock) => {
    setMoveDayTargetId(block.id);
    setMoveDayValue(block.date);
    setMoveDayModal(true);
  };

  const confirmMoveDay = () => {
    if (!moveDayTargetId || !moveDayValue.trim()) return;
    const target = blocks.find(b => b.id === moveDayTargetId);
    const date = moveDayValue.trim();
    const desired = timeToMinutes(target?.start_time || minutesToTime(GRID_START_HOUR * 60));
    const duration = Math.max(target?.duration_minutes || 60, MIN_BLOCK_MINUTES);
    const start = findFreeSlot(busyForDate(date, moveDayTargetId), desired, duration);
    moveBlock(moveDayTargetId, date, minutesToTime(start));
    setMoveDayModal(false);
    setMoveDayTargetId(null);
  };

  const deleteGoal = async (id: string) => {
    console.log('[deleteGoal] id:', id);
    const { error } = await supabase.from('user_goals').delete().eq('id', id);
    if (error) {
      console.error('[deleteGoal] failed:', error.message);
      haptics.warning();
      Alert.alert('Error', 'Could not delete goal: ' + error.message);
      return;
    }
    setGoals(prev => prev.filter(g => g.id !== id));
    loadGoals();
  };

  // ── Grade recording ───────────────────────────────────────────────────────
  const openGradeModal = (id: string, title: string, isExam: boolean, currentGrade: number | null, currentMaxGrade: number | null) => {
    setGradeTarget({ id, title, isExam });
    setGradeValue(currentGrade != null ? String(currentGrade) : '');
    setGradeMaxValue(currentMaxGrade != null ? String(currentMaxGrade) : '100');
    setGradeModal(true);
  };

  const saveGrade = async () => {
    if (!gradeTarget || !gradeValue.trim()) return;
    setSavingGrade(true);

    const grade = parseFloat(gradeValue);
    const maxGrade = parseFloat(gradeMaxValue) || 100;

    const { error } = await supabase.from('assignments')
      .update({ grade, max_grade: maxGrade, status: 'completed' })
      .eq('id', gradeTarget.id);

    setSavingGrade(false);
    if (error) {
      console.error('[saveGrade] failed:', error.message);
      haptics.warning();
      Alert.alert('Error', 'Could not save grade: ' + error.message);
      return;
    }

    if (gradeTarget.isExam) {
      setExams(prev => prev.map(e => e.id === gradeTarget.id ? { ...e, grade, max_grade: maxGrade, status: 'completed' } : e));
    } else {
      setAssignments(prev => prev.map(a => a.id === gradeTarget.id ? { ...a, grade, max_grade: maxGrade, status: 'completed' } : a));
    }

    setGradeModal(false);
    setGradeTarget(null);
  };

  // ── Calendar view ─────────────────────────────────────────────────────────
  const renderCalendar = () => {
    const days = getDaysInMonth();
    const stats = getMonthStats();
    const sel = selectedDate ? getEventsForDate(selectedDate) : null;

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={gold[400]} />}>
        {blockSaved && (
          <View style={styles.savedBanner}>
            <CheckCircle size={15} color="#3A8F52" />
            <Text style={styles.savedBannerText}>Block added!</Text>
          </View>
        )}
        {/* Stats strip */}
        <View style={styles.statsStrip}>
          {[
            { label: 'Done', value: stats.completed, color: '#3A8F52' },
            { label: 'Due', value: stats.pending, color: '#f59e0b' },
            { label: 'Missing', value: stats.missing, color: '#C0392B' },
            { label: 'Exams', value: exams.length, color: gold[400] },
          ].map(s => (
            <View key={s.label} style={[styles.statPill, { borderLeftColor: s.color }]}>
              <Text style={[styles.statNum, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.navArrow} onPress={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))}>
            <ChevronLeft size={20} color={gold[400]} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{MONTHS[currentMonth]} {currentYear}</Text>
          <TouchableOpacity style={styles.navArrow} onPress={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))}>
            <ChevronRight size={20} color={gold[400]} />
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={styles.calHeader}>
          {DAYS_SHORT.map(d => <Text key={d} style={styles.calHeaderText}>{d}</Text>)}
        </View>

        {/* Grid */}
        <View style={styles.calGrid}>
          {days.map((day, i) => {
            if (!day.date) return <View key={i} style={styles.calEmpty} />;
            const ev = getEventsForDate(day.date);
            const hasExam = ev.exams.length > 0;
            const hasAssign = ev.assignments.length > 0;
            const hasBlock = ev.blocks.length > 0;
            const allDone = ev.assignments.length > 0 && ev.assignments.every(a => a.status === 'completed');
            const missing = ev.assignments.some(a => a.status !== 'completed' && isPast(day.date!));
            const today = isToday(day.date);
            const sel = selectedDate === day.date;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.calCell,
                  today && styles.calCellToday,
                  sel && styles.calCellSelected,
                  allDone && !sel && styles.calCellDone,
                  missing && !sel && styles.calCellMissing,
                ]}
                onPress={() => setSelectedDate(day.date === selectedDate ? null : day.date!)}>
                <Text style={[
                  styles.calNum,
                  today && styles.calNumToday,
                  sel && styles.calNumSelected,
                  allDone && !sel && styles.calNumDone,
                  missing && !sel && styles.calNumMissing,
                ]}>
                  {parseInt(day.date.split('-')[2], 10)}
                </Text>
                {(hasExam || hasAssign || hasBlock) && !allDone && !missing && (
                  <View style={styles.dotRow}>
                    {hasExam && <View style={[styles.calDot, { backgroundColor: '#C0392B' }]} />}
                    {hasAssign && <View style={[styles.calDot, { backgroundColor: gold[400] }]} />}
                    {hasBlock && <View style={[styles.calDot, { backgroundColor: '#3A8F52' }]} />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected day panel */}
        {selectedDate && sel && (
          <View style={styles.dayPanel}>
            <View style={styles.dayPanelHeader}>
              <Text style={styles.dayPanelTitle}>
                {parseLocal(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <TouchableOpacity style={styles.addBlockBtn} onPress={() => { setBlockDate(selectedDate); setBlockModal(true); }}>
                <Plus size={14} color={gold[400]} />
                <Text style={styles.addBlockText}>Add block</Text>
              </TouchableOpacity>
            </View>

            {sel.exams.map(e => (
              <View key={e.id} style={[styles.dayItem, { borderLeftColor: e.color || '#C0392B' }]}>
                <Text style={styles.dayItemBadge}>EXAM</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayItemTitle}>{e.title}</Text>
                  <Text style={styles.dayItemSub}>{e.subject}</Text>
                </View>
                <TouchableOpacity
                  style={styles.gradeBtn}
                  onPress={() => openGradeModal(e.id, e.title, true, e.grade, e.max_grade)}>
                  {e.grade != null ? (
                    <Text style={styles.gradeBtnText}>{e.grade}/{e.max_grade ?? 100}</Text>
                  ) : (
                    <>
                      <Award size={12} color={gold[400]} />
                      <Text style={styles.gradeBtnText}>Grade</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))}
            {sel.assignments.map(a => (
              <View key={a.id} style={[styles.dayItem, { borderLeftColor: a.color || gold[400] }]}>
                <Text style={styles.dayItemBadge}>DUE</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayItemTitle}>{a.title}</Text>
                  <Text style={styles.dayItemSub}>{a.subject} · {a.status.replace('_', ' ')}</Text>
                </View>
                <TouchableOpacity
                  style={styles.gradeBtn}
                  onPress={() => openGradeModal(a.id, a.title, false, a.grade, a.max_grade)}>
                  {a.grade != null ? (
                    <Text style={styles.gradeBtnText}>{a.grade}/{a.max_grade ?? 100}</Text>
                  ) : (
                    <>
                      <Award size={12} color={gold[400]} />
                      <Text style={styles.gradeBtnText}>Grade</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))}
            {sel.blocks.map(b => (
              <View key={b.id} style={[styles.dayItem, { borderLeftColor: blockColor(b) }]}>
                {b.start_time && <Text style={styles.dayItemTime}>{b.start_time}</Text>}
                <View style={{ flex: 1 }}>
                  <Text style={styles.dayItemTitle}>{b.title}</Text>
                  <Text style={styles.dayItemSub}>{b.duration_minutes}min{b.auto_generated ? ' · auto' : ''}</Text>
                </View>
                <TouchableOpacity onPress={() => toggleBlock(b)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {b.completed ? <CheckCircle size={18} color="#3A8F52" /> : <View style={styles.emptyCircle} />}
                </TouchableOpacity>
              </View>
            ))}
            {sel.exams.length === 0 && sel.assignments.length === 0 && sel.blocks.length === 0 && (
              <View style={styles.emptyDayState}>
                <Calendar size={28} color={dark.textMuted} />
                <Text style={styles.emptyDay}>No events — tap "Add block" to schedule something.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    );
  };

  // ── Week schedule view (single-day draggable time grid) ───────────────────
  const renderWeek = () => {
    const weekDays = Array.from({ length: 7 }, (_, i) => addDaysToStr(weekStart, i));
    const gridWidth = width - spacing.lg * 2 - GRID_LABEL_WIDTH;
    const gridHeight = GRID_HOURS.length * ROW_HEIGHT;

    const dayExams = exams.filter(e => e.exam_date === gridDay);
    const dayAssign = assignments.filter(a => a.due_date === gridDay);
    const dayBlocks = blocks.filter(b => b.date === gridDay);
    const timedBlocks = dayBlocks.filter(b => b.start_time);
    const untimedBlocks = dayBlocks.filter(b => !b.start_time);
    const timedExams = dayExams.filter(e => e.display_time);
    const timedAssign = dayAssign.filter(a => a.display_time);
    const shelfItems = [
      ...dayExams.filter(e => !e.display_time).map(e => ({ key: 'e' + e.id, color: e.color || '#C0392B', label: 'EXAM', title: e.title })),
      ...dayAssign.filter(a => !a.display_time).map(a => ({ key: 'a' + a.id, color: a.color || gold[400], label: 'DUE', title: a.title })),
    ];

    const handleMoved = (id: string, rawTop: number) => {
      const maxMin = (GRID_END_HOUR - GRID_START_HOUR) * 60 - 15;
      let totalMin = Math.round((rawTop / ROW_HEIGHT) * 60 / 15) * 15;
      totalMin = Math.min(Math.max(0, totalMin), maxMin);
      const desired = GRID_START_HOUR * 60 + totalMin;
      const duration = Math.max(blocks.find(b => b.id === id)?.duration_minutes || 60, MIN_BLOCK_MINUTES);
      const start = findFreeSlot(busyForDate(gridDay, id), desired, duration);
      moveBlock(id, gridDay, minutesToTime(start));
    };

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={gold[400]} />}
        scrollEnabled={weekScrollEnabled}>
        {/* Week nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.navArrow} onPress={() => setWeekStart(addDaysToStr(weekStart, -7))}>
            <ChevronLeft size={20} color={gold[400]} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {formatShortDate(weekStart)} – {formatShortDate(addDaysToStr(weekStart, 6))}
          </Text>
          <TouchableOpacity style={styles.navArrow} onPress={() => setWeekStart(addDaysToStr(weekStart, 7))}>
            <ChevronRight size={20} color={gold[400]} />
          </TouchableOpacity>
        </View>

        {/* Generate button */}
        <TouchableOpacity
          style={[styles.generateBtn, generating && styles.generateBtnActive]}
          onPress={generateSchedule}
          disabled={generating}>
          <Sparkles size={16} color={generating ? dark.bg : gold[400]} />
          <Text style={[styles.generateBtnText, generating && { color: dark.bg }]}>
            {generating ? 'Generating...' : 'Auto-Generate Schedule'}
          </Text>
        </TouchableOpacity>

        {/* Day strip */}
        <View style={[styles.dayStrip, { marginHorizontal: spacing.lg }]}>
          {weekDays.map(date => {
            const todayMark = isToday(date);
            const selected = date === gridDay;
            return (
              <TouchableOpacity
                key={date}
                style={[styles.dayStripChip, selected && styles.dayStripChipSelected, todayMark && !selected && styles.dayStripChipToday]}
                onPress={() => setGridDay(date)}>
                <Text style={[styles.dayStripChipLabel, selected && styles.dayStripChipLabelSelected]}>{DAYS_SHORT[parseLocal(date).getDay()]}</Text>
                <Text style={[styles.dayStripChipNum, selected && styles.dayStripChipLabelSelected, todayMark && !selected && { color: gold[400] }]}>
                  {parseInt(date.split('-')[2], 10)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.dragHint}>Press and hold a block, then drag it up/down to retime. Tap the calendar icon to move it to another day.</Text>

        {/* Exam / due shelf */}
        {shelfItems.length > 0 && (
          <View style={[styles.gridShelfRow, { marginHorizontal: spacing.lg }]}>
            {shelfItems.map(it => (
              <View key={it.key} style={[styles.gridShelfChip, { borderLeftColor: it.color }]}>
                <Text style={[styles.gridShelfChipLabel, { color: it.color }]}>{it.label}</Text>
                <Text style={styles.gridShelfChipText} numberOfLines={1}>{it.title}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Untimed blocks */}
        {untimedBlocks.length > 0 && (
          <View style={[styles.gridShelfRow, { marginHorizontal: spacing.lg }]}>
            {untimedBlocks.map(b => (
              <TouchableOpacity key={b.id} style={[styles.gridShelfChip, { borderLeftColor: blockColor(b) }]} onPress={() => openMoveDayModal(b)}>
                <Text style={styles.gridShelfChipText} numberOfLines={1}>{b.title} (no time)</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Time grid */}
        <View style={{ marginLeft: spacing.lg, marginRight: spacing.lg, marginTop: 10, flexDirection: 'row' }}>
          <View style={{ width: GRID_LABEL_WIDTH }}>
            {GRID_HOURS.map(h => (
              <View key={h} style={{ height: ROW_HEIGHT }}>
                <Text style={styles.gridHourLabel}>{h % 12 === 0 ? 12 : h % 12}{h < 12 ? 'a' : 'p'}</Text>
              </View>
            ))}
          </View>
          <View style={{ width: gridWidth, height: gridHeight }}>
            {GRID_HOURS.map((h, i) => (
              <View key={h} style={[styles.gridHourLine, { top: i * ROW_HEIGHT, width: gridWidth }]} />
            ))}
            {timedBlocks.length === 0 && timedExams.length === 0 && timedAssign.length === 0 && (
              <Text style={styles.gridEmptyText}>Rest day — nothing scheduled.</Text>
            )}
            {timedExams.map(e => {
              const mins = Math.max(0, timeToMinutes(e.display_time!) - GRID_START_HOUR * 60);
              const top = (mins / 60) * ROW_HEIGHT;
              const h = (EXAM_DEFAULT_DURATION / 60) * ROW_HEIGHT;
              return (
                <View key={e.id} style={[styles.gridFixedBar, { top, height: h, borderLeftColor: e.color || '#C0392B' }]}>
                  <Text style={styles.gridChipTime}>{e.display_time}</Text>
                  <Text style={styles.gridChipTitle} numberOfLines={1}>EXAM: {e.title}</Text>
                </View>
              );
            })}
            {timedAssign.map(a => {
              const mins = Math.max(0, timeToMinutes(a.display_time!) - GRID_START_HOUR * 60);
              const top = (mins / 60) * ROW_HEIGHT;
              const h = (DUE_DEFAULT_DURATION / 60) * ROW_HEIGHT;
              return (
                <View key={a.id} style={[styles.gridFixedBar, { top, height: h, borderLeftColor: a.color || gold[400] }]}>
                  <Text style={styles.gridChipTime}>{a.display_time}</Text>
                  <Text style={styles.gridChipTitle} numberOfLines={1}>DUE: {a.title}</Text>
                </View>
              );
            })}
            {timedBlocks.map(b => {
              const mins = Math.max(0, timeToMinutes(b.start_time!) - GRID_START_HOUR * 60);
              const top = (mins / 60) * ROW_HEIGHT;
              const h = Math.max(MIN_CHIP_HEIGHT_PX, (b.duration_minutes / 60) * ROW_HEIGHT);
              return (
                <DraggableBlock
                  key={b.id}
                  block={b}
                  top={top} height={h}
                  color={blockColor(b)}
                  onMoved={handleMoved}
                  onToggle={() => toggleBlock(b)}
                  onDelete={() => deleteBlock(b.id)}
                  onChangeDay={() => openMoveDayModal(b)}
                  setScrollEnabled={setWeekScrollEnabled}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  };

  // ── Goals view ────────────────────────────────────────────────────────────
  const renderGoals = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: spacing.lg, paddingTop: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={gold[400]} />}>
      {goalSaved && (
        <View style={styles.savedBanner}>
          <CheckCircle size={15} color="#3A8F52" />
          <Text style={styles.savedBannerText}>Goal saved!</Text>
        </View>
      )}
      <View style={styles.goalsIntro}>
        <Target size={18} color={gold[400]} />
        <Text style={styles.goalsIntroText}>
          Set your recurring goals. Tap "Generate Schedule" in the Week view to auto-fill your calendar.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.generateBtn}
        onPress={generateSchedule}
        disabled={generating}>
        <Sparkles size={16} color={generating ? dark.bg : gold[400]} />
        <Text style={[styles.generateBtnText, generating && { color: dark.bg }]}>
          {generating ? 'Generating...' : 'Generate Smart Schedule'}
        </Text>
      </TouchableOpacity>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>My Goals</Text>
        <TouchableOpacity style={styles.addSmallBtn} onPress={openAddGoalModal}>
          <Plus size={16} color={gold[400]} />
          <Text style={styles.addSmallText}>New Goal</Text>
        </TouchableOpacity>
      </View>

      {goals.length === 0 && (
        <View style={styles.emptyGoals}>
          <Target size={36} color={dark.textMuted} />
          <Text style={styles.emptyGoalTitle}>No goals yet</Text>
          <Text style={styles.emptyGoalSub}>Add goals to auto-generate your study & workout schedule.</Text>
        </View>
      )}

      {goals.map(goal => {
        const GoalIcon = GOAL_ICONS[goal.type as GoalType] || Target;
        const color = goal.color || BLOCK_COLORS[goal.type] || gold[400];
        return (
          <TouchableOpacity key={goal.id} style={[styles.goalCard, { borderLeftColor: color }]} onPress={() => openEditGoalModal(goal)} activeOpacity={0.7}>
            <View style={[styles.goalIconWrap, { backgroundColor: color + '20' }]}>
              <GoalIcon size={20} color={color} />
            </View>
            <View style={styles.goalInfo}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <View style={styles.goalMeta}>
                <View style={[styles.goalChip, { backgroundColor: color + '15' }]}>
                  <Text style={[styles.goalChipText, { color }]}>{goal.frequency}</Text>
                </View>
                <View style={[styles.goalChip, { backgroundColor: color + '15' }]}>
                  <Clock size={11} color={color} />
                  <Text style={[styles.goalChipText, { color }]}>{goal.preferred_time ? `${goal.preferred_time} · ${goal.target_minutes}min` : `${goal.target_minutes}min`}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={() => openEditGoalModal(goal)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Pencil size={16} color={dark.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteGoal(goal.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: 12 }}>
              <Trash2 size={17} color={dark.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Smart Calendar</Text>
          <Text style={styles.headerSub}>Schedules · Exams · Goals</Text>
        </View>
        <TouchableOpacity style={styles.headerAddBtn} onPress={() => { setBlockDate(todayStr()); setBlockModal(true); }}>
          <Plus size={20} color={gold[400]} />
        </TouchableOpacity>
      </View>

      {/* View toggle */}
      <View style={styles.viewToggle}>
        {([['calendar', 'Calendar', Calendar], ['week', 'Schedule', ListChecks], ['goals', 'Goals', Target]] as const).map(([key, label, Icon]) => (
          <TouchableOpacity
            key={key}
            style={[styles.toggleBtn, viewMode === key && styles.toggleBtnActive]}
            onPress={() => setViewMode(key)}>
            <Icon size={14} color={viewMode === key ? gold[400] : dark.textSecondary} />
            <Text style={[styles.toggleText, viewMode === key && styles.toggleTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {viewMode === 'calendar' && renderCalendar()}
      {viewMode === 'week' && renderWeek()}
      {viewMode === 'goals' && renderGoals()}

      {/* Add Block Modal */}
      <Modal animationType="slide" transparent visible={blockModal} onRequestClose={() => setBlockModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalRow}>
              <Text style={styles.modalTitle}>Add Schedule Block</Text>
              <TouchableOpacity onPress={() => setBlockModal(false)}><X size={22} color={dark.textSecondary} /></TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Title" placeholderTextColor={dark.textMuted} value={blockTitle} onChangeText={setBlockTitle} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
            <DatePickerField value={blockDate} onChange={setBlockDate} placeholder="Select date" />
            <TimePickerField value={blockTime} onChange={setBlockTime} placeholder="Start time (optional)" clearable />
            <TextInput style={styles.input} placeholder="Duration (minutes)" placeholderTextColor={dark.textMuted} value={blockDuration} onChangeText={setBlockDuration} keyboardType="numeric" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {Object.keys(BLOCK_COLORS).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, blockType === t && { backgroundColor: BLOCK_COLORS[t], borderColor: BLOCK_COLORS[t] }]}
                    onPress={() => setBlockType(t)}>
                    <Text style={[styles.typeChipText, blockType === t && { color: '#fff' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={[styles.submitBtn, savingBlock && { opacity: 0.7 }]} onPress={addBlock} disabled={savingBlock}>
              <Text style={styles.submitText}>{savingBlock ? 'Saving...' : 'Add Block'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Goal Modal */}
      <Modal animationType="slide" transparent visible={goalModal} onRequestClose={closeGoalModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalRow}>
              <Text style={styles.modalTitle}>{editingGoalId ? 'Edit Goal' : 'New Goal'}</Text>
              <TouchableOpacity onPress={closeGoalModal}><X size={22} color={dark.textSecondary} /></TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Goal title (e.g. Morning Run)" placeholderTextColor={dark.textMuted} value={goalTitle} onChangeText={setGoalTitle} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
            <TextInput style={styles.input} placeholder="Duration (minutes)" placeholderTextColor={dark.textMuted} value={goalMins} onChangeText={setGoalMins} keyboardType="numeric" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
            <TimePickerField value={goalTime} onChange={setGoalTime} placeholder="Preferred time (optional)" clearable />
            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.chipRow}>
              {(['study', 'workout', 'reading', 'sleep', 'other'] as GoalType[]).map(t => (
                <TouchableOpacity key={t} style={[styles.typeChip, goalType === t && { backgroundColor: BLOCK_COLORS[t], borderColor: BLOCK_COLORS[t] }]} onPress={() => { setGoalType(t); setGoalColor(BLOCK_COLORS[t]); }}>
                  <Text style={[styles.typeChipText, goalType === t && { color: '#fff' }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Frequency</Text>
            <View style={styles.chipRow}>
              {(['daily', 'weekdays', 'weekends', 'weekly'] as GoalFreq[]).map(f => (
                <TouchableOpacity key={f} style={[styles.typeChip, goalFreq === f && { backgroundColor: gold[400], borderColor: gold[400] }]} onPress={() => setGoalFreq(f)}>
                  <Text style={[styles.typeChipText, goalFreq === f && { color: dark.bg }]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Color</Text>
            <View style={[styles.chipRow, { marginBottom: 8 }]}>
              {GOAL_COLOR_SWATCHES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorSwatch, { backgroundColor: c }, goalColor === c && styles.colorSwatchSelected]}
                  onPress={() => setGoalColor(c)}
                />
              ))}
            </View>
            <TouchableOpacity style={[styles.submitBtn, { marginTop: 8 }, savingGoal && { opacity: 0.7 }]} onPress={saveGoal} disabled={savingGoal}>
              <Text style={styles.submitText}>{savingGoal ? 'Saving...' : editingGoalId ? 'Update Goal' : 'Save Goal'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Record Grade Modal */}
      <Modal animationType="slide" transparent visible={gradeModal} onRequestClose={() => setGradeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalRow}>
              <Text style={styles.modalTitle}>Record Grade</Text>
              <TouchableOpacity onPress={() => setGradeModal(false)}><X size={22} color={dark.textSecondary} /></TouchableOpacity>
            </View>
            {gradeTarget && <Text style={styles.fieldLabel}>{gradeTarget.title}</Text>}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Score"
                placeholderTextColor={dark.textMuted}
                value={gradeValue}
                onChangeText={setGradeValue}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Out of (default 100)"
                placeholderTextColor={dark.textMuted}
                value={gradeMaxValue}
                onChangeText={setGradeMaxValue}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, (savingGrade || !gradeValue.trim()) && { opacity: 0.7 }]}
              onPress={saveGrade}
              disabled={savingGrade || !gradeValue.trim()}>
              <Text style={styles.submitText}>{savingGrade ? 'Saving...' : 'Save Grade'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Move Block to Day Modal */}
      <Modal animationType="slide" transparent visible={moveDayModal} onRequestClose={() => setMoveDayModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalRow}>
              <Text style={styles.modalTitle}>Move to Day</Text>
              <TouchableOpacity onPress={() => setMoveDayModal(false)}><X size={22} color={dark.textSecondary} /></TouchableOpacity>
            </View>
            <DatePickerField value={moveDayValue} onChange={setMoveDayValue} placeholder="Select date" />
            <TouchableOpacity style={[styles.submitBtn, { marginTop: 8 }]} onPress={confirmMoveDay}>
              <Text style={styles.submitText}>Move</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dark.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.xl + 20, paddingBottom: spacing.md,
    backgroundColor: dark.surface, borderBottomWidth: 1, borderBottomColor: `${gold[400]}30`,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, color: dark.text },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textSecondary, marginTop: 2 },
  headerAddBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: dark.elevated,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: `${gold[400]}50`,
  },

  viewToggle: {
    flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: 14, marginBottom: 2,
    backgroundColor: dark.elevated, borderRadius: borderRadius.lg, padding: 4,
    borderWidth: 1, borderColor: dark.border,
  },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: borderRadius.md },
  toggleBtnActive: { backgroundColor: dark.surface, borderWidth: 1, borderColor: `${gold[400]}50` },
  toggleText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: dark.textSecondary },
  toggleTextActive: { color: gold[400], fontFamily: 'Inter_600SemiBold' },

  // Calendar
  statsStrip: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: 14, paddingBottom: 6, gap: 8 },
  statPill: {
    flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: dark.surface,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: dark.border, borderLeftWidth: 3,
  },
  statNum: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: dark.textSecondary, marginTop: 1 },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, paddingHorizontal: spacing.lg,
  },
  navArrow: { padding: 8, borderRadius: borderRadius.full, backgroundColor: dark.elevated },
  monthTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: dark.text, marginHorizontal: 20 },

  calHeader: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: 6 },
  calHeaderText: { width: CELL_SIZE, textAlign: 'center', fontFamily: 'Inter_500Medium', fontSize: 11, color: dark.textSecondary },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm },
  calEmpty: { width: CELL_SIZE, height: CELL_SIZE },
  calCell: {
    width: CELL_SIZE, height: CELL_SIZE, borderRadius: borderRadius.md,
    backgroundColor: dark.elevated, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: dark.border,
  },
  calCellToday: { borderWidth: 2, borderColor: gold[400] },
  calCellSelected: { backgroundColor: gold[400] },
  calCellDone: { backgroundColor: '#0D1F12', borderColor: '#3A8F5240' },
  calCellMissing: { backgroundColor: '#2A1212', borderColor: '#C0392B40' },
  calNum: { fontFamily: 'Inter_500Medium', fontSize: 13, color: dark.textSecondary },
  calNumToday: { color: gold[400], fontFamily: 'Inter_700Bold' },
  calNumSelected: { color: dark.bg, fontFamily: 'Inter_700Bold' },
  calNumDone: { color: '#3A8F52' },
  calNumMissing: { color: '#C0392B' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  calDot: { width: 4, height: 4, borderRadius: 2 },

  dayPanel: {
    marginHorizontal: spacing.md, marginTop: 12, marginBottom: 4,
    backgroundColor: dark.surface, borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: `${gold[400]}25`, overflow: 'hidden',
  },
  dayPanelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 1, borderBottomColor: dark.border,
  },
  dayPanelTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: dark.text },
  addBlockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: dark.elevated, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: `${gold[400]}40`,
  },
  addBlockText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: gold[400] },
  dayItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderLeftWidth: 3, borderBottomWidth: 1, borderBottomColor: dark.border,
    gap: 10,
  },
  dayItemBadge: { fontFamily: 'Inter_700Bold', fontSize: 9, color: dark.textMuted, letterSpacing: 1 },
  dayItemTime: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: dark.textSecondary, width: 44 },
  dayItemTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: dark.text, flex: 1 },
  dayItemSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: dark.textSecondary },
  emptyDay: { fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textMuted, padding: 14, textAlign: 'center' },
  emptyDayState: { alignItems: 'center', paddingVertical: 18, gap: 8 },
  emptyCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: dark.borderLight },
  gradeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: dark.elevated, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: `${gold[400]}40`,
  },
  gradeBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: gold[400] },

  // Week view
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: spacing.lg, marginBottom: 16, paddingVertical: 13,
    borderRadius: borderRadius.xl, borderWidth: 1, borderColor: `${gold[400]}50`,
    backgroundColor: dark.goldSurface,
  },
  generateBtnActive: { backgroundColor: gold[400] },
  generateBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: gold[400] },

  dragHint: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: dark.textMuted,
    textAlign: 'center', marginTop: 10, marginBottom: 4, paddingHorizontal: spacing.lg,
  },

  dayStrip: { flexDirection: 'row', gap: 4, marginTop: 4 },
  dayStripChip: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: borderRadius.md,
    backgroundColor: dark.elevated, borderWidth: 1, borderColor: dark.border,
  },
  dayStripChipToday: { borderColor: `${gold[400]}50` },
  dayStripChipSelected: { backgroundColor: gold[400], borderColor: gold[400] },
  dayStripChipLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: dark.textSecondary },
  dayStripChipNum: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: dark.text, marginTop: 2 },
  dayStripChipLabelSelected: { color: dark.bg },

  gridShelfRow: { gap: 4, marginBottom: 8 },
  gridShelfChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: dark.surface, borderLeftWidth: 3, borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: dark.border, paddingHorizontal: 10, paddingVertical: 7,
  },
  gridShelfChipLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  gridShelfChipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: dark.text, flex: 1 },

  gridHourLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: dark.textMuted },
  gridHourLine: { position: 'absolute', height: 1, backgroundColor: dark.border },
  gridEmptyText: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textMuted,
    textAlign: 'center', marginTop: 30,
  },

  gridChip: {
    position: 'absolute', left: 2, right: 2, backgroundColor: dark.surface, borderRadius: borderRadius.md,
    borderLeftWidth: 3, borderWidth: 1, borderColor: dark.border,
    paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
  },
  gridFixedBar: {
    position: 'absolute', left: 2, right: 2, backgroundColor: dark.surface, borderRadius: borderRadius.md,
    borderLeftWidth: 3, borderWidth: 1, borderColor: dark.border, borderStyle: 'dashed',
    paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  gridChipDragArea: { flex: 1 },
  gridChipTextRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  gridChipTime: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: dark.textSecondary },
  gridChipTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: dark.text, flexShrink: 1 },
  gridChipMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, color: dark.textMuted, marginTop: 2 },
  gridChipActions: { flexDirection: 'row', gap: 12, alignItems: 'center', marginLeft: 8 },
  gridChipDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: dark.borderLight },

  // Goals
  goalsIntro: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: dark.goldSurface, borderRadius: borderRadius.lg,
    padding: 14, marginBottom: 16, borderWidth: 1, borderColor: `${gold[400]}35`,
  },
  goalsIntroText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.text, lineHeight: 19 },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: dark.text },
  addSmallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: dark.elevated, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: `${gold[400]}40`,
  },
  addSmallText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: gold[400] },

  goalCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: dark.surface, borderRadius: borderRadius.xl,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: dark.border, borderLeftWidth: 3,
  },
  goalIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  goalInfo: { flex: 1 },
  goalTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: dark.text, marginBottom: 6 },
  goalMeta: { flexDirection: 'row', gap: 6 },
  goalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full,
  },
  goalChipText: { fontFamily: 'Inter_500Medium', fontSize: 11 },

  emptyGoals: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyGoalTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: dark.text },
  emptyGoalSub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: dark.textSecondary, textAlign: 'center', paddingHorizontal: 20 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalSheet: {
    backgroundColor: dark.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: spacing.lg, paddingBottom: 40,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: `${gold[400]}30`,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: dark.border, alignSelf: 'center', marginBottom: 16 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: dark.text },
  input: {
    backgroundColor: dark.elevated, borderRadius: borderRadius.lg,
    paddingHorizontal: 14, paddingVertical: 13,
    fontFamily: 'Inter_400Regular', fontSize: 15, color: dark.text,
    marginBottom: 12, borderWidth: 1, borderColor: dark.border,
  },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: dark.textSecondary, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: borderRadius.full, backgroundColor: dark.elevated,
    borderWidth: 1, borderColor: dark.border,
  },
  typeChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: dark.textSecondary, textTransform: 'capitalize' },
  colorSwatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchSelected: { borderColor: dark.text },
  submitBtn: { backgroundColor: gold[400], paddingVertical: 14, borderRadius: borderRadius.lg, alignItems: 'center' },
  submitText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: dark.bg },
  savedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0D1F12', borderWidth: 1, borderColor: '#3A8F5260', borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: spacing.md, marginTop: 10 },
  savedBannerText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#3A8F52' },
});
