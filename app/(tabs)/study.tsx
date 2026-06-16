import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {
  Plus, BookOpen, Clock, Play, Pause, RotateCcw,
  ChevronRight, ChevronLeft, Lightbulb, Timer, X, Trash2,
  AlertCircle, CheckCircle, GraduationCap, MessageSquare,
  CalendarDays, Zap,
} from 'lucide-react-native';
import { dark, gold, spacing, borderRadius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DatePickerField } from '@/components/DatePickerField';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  is_exam?: boolean;
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  exam_date: string;
  status: 'upcoming' | 'completed' | 'missed';
}

interface FlashcardDeck {
  id: string;
  name: string;
  subject: string;
  cards_count: number;
  created_at: string;
}

interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
}

type Tab = 'dashboard' | 'flashcards';

const PRIORITY_COLORS: Record<string, string> = {
  high: '#C0392B',
  medium: '#f59e0b',
  low: '#3A8F52',
};

const SUBJECT_COLORS = ['#D4A017', '#3A8F52', '#C0392B', '#6366f1', '#0891b2', '#d946ef'];

function subjectColor(subject: string): string {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function urgencyColor(days: number): string {
  if (days <= 1) return '#C0392B';
  if (days <= 3) return '#f59e0b';
  return gold[400];
}

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function StudyScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');

  // Dashboard data
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  // Flashcard data
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Timer
  const [studyTimer, setStudyTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [savingSession, setSavingSession] = useState(false);
  const [sessionSubject, setSessionSubject] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionModal, setSessionModal] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [examSaved, setExamSaved] = useState(false);

  // Modal states
  const [assignmentModal, setAssignmentModal] = useState(false);
  const [examModal, setExamModal] = useState(false);
  const [deckModal, setDeckModal] = useState(false);
  const [cardModal, setCardModal] = useState(false);
  const [studyModal, setStudyModal] = useState(false);

  // Saving states
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingExam, setSavingExam] = useState(false);
  const [savingDeck, setSavingDeck] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [assignmentSaved, setAssignmentSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Form fields
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');

  useEffect(() => {
    loadAll();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const loadAll = () => {
    loadAssignments();
    loadExams();
    loadDecks();
  };

  const loadAssignments = async () => {
    const today = new Date().toISOString().split('T')[0];
    console.log('[loadAssignments] user:', user?.id, 'from:', today);
    const { data, error } = await supabase
      .from('assignments')
      .select('id,title,subject,due_date,priority,status,is_exam')
      .neq('status', 'completed')
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(20);
    console.log('[loadAssignments] result:', data?.length, 'error:', error?.message);
    setAssignments((data || []).filter(a => !a.is_exam));
    // Also refresh exam countdown from assignments with is_exam flag
    const examRows = (data || []).filter(a => a.is_exam);
    setExams(examRows.map(a => ({
      id: a.id, title: a.title, subject: a.subject,
      exam_date: a.due_date, status: 'upcoming' as const,
    })));
  };

  const loadExams = async () => {
    const today = new Date().toISOString().split('T')[0];
    console.log('[loadExams] user:', user?.id, 'from:', today);
    const { data, error } = await supabase
      .from('assignments')
      .select('id,title,subject,due_date,status,is_exam')
      .eq('is_exam', true)
      .neq('status', 'completed')
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(5);
    console.log('[loadExams] result:', data?.length, 'error:', error?.message);
    setExams((data || []).map(a => ({
      id: a.id, title: a.title, subject: a.subject,
      exam_date: a.due_date, status: 'upcoming' as const,
    })));
  };

  const loadDecks = async () => {
    const { data } = await supabase
      .from('flashcard_decks')
      .select('*')
      .order('created_at', { ascending: false });
    setDecks(data || []);
  };

  const loadCards = async (deckId: string) => {
    const { data } = await supabase.from('flashcards').select('*').eq('deck_id', deckId);
    setCards(data || []);
  };

  // Timer
  const toggleTimer = () => {
    if (isTimerRunning) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    } else {
      timerRef.current = setInterval(() => setStudyTimer(p => p + 1), 1000);
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const resetTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setIsTimerRunning(false);
    if (studyTimer >= 60) {
      setSessionSubject('');
      setSessionNotes('');
      setSessionModal(true);
    } else {
      setStudyTimer(0);
    }
  };

  const saveStudySession = async () => {
    if (!sessionSubject.trim()) return;
    setSavingSession(true);
    setSessionError('');
    const durationMinutes = Math.floor(studyTimer / 60);
    const { error } = await supabase.from('study_sessions').insert({
      subject: sessionSubject.trim(),
      duration_minutes: durationMinutes,
      notes: sessionNotes.trim() || null,
      date: new Date().toISOString().split('T')[0],
    });
    setSavingSession(false);
    if (error) {
      console.error('[saveStudySession] failed:', error.message);
      setSessionError('Could not save session: ' + error.message);
      return;
    }
    setSessionModal(false);
    setStudyTimer(0);
    setSessionSaved(true);
    setTimeout(() => setSessionSaved(false), 2500);
  };

  const discardSession = () => {
    setSessionModal(false);
    setStudyTimer(0);
  };

  // CRUD
  const addAssignment = async () => {
    if (!newTitle.trim() || !newSubject.trim() || !newDate.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSaveError('You must be signed in to add assignments.');
      console.error('[addAssignment] no active session');
      return;
    }

    setSavingAssignment(true);
    setSaveError('');

    console.log('[addAssignment] uid:', session.user.id, 'due_date:', newDate, 'title:', newTitle);

    const { data: saved, error } = await supabase.from('assignments').insert({
      title: newTitle.trim(), subject: newSubject.trim(), due_date: newDate.trim(),
      priority: newPriority, status: 'pending',
    }).select().single();

    console.log('[addAssignment] result:', saved, 'error:', error?.message, 'code:', error?.code);

    setSavingAssignment(false);
    if (error) {
      console.error('[addAssignment] failed:', error.message, error.code);
      setSaveError('Could not save assignment: ' + error.message);
      return;
    }
    resetForm(); setAssignmentModal(false);

    // Optimistic update — add to list immediately if due date is today or future
    const today = new Date().toISOString().split('T')[0];
    if (saved && newDate.trim() >= today) {
      setAssignments(prev => [...prev, saved as Assignment].sort((a, b) => a.due_date.localeCompare(b.due_date)));
    }

    loadAssignments();
    setAssignmentSaved(true); setTimeout(() => setAssignmentSaved(false), 2500);
  };

  const addExam = async () => {
    if (!newTitle.trim() || !newSubject.trim() || !newDate.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSaveError('You must be signed in to add exams.');
      console.error('[addExam] no active session');
      return;
    }

    setSavingExam(true);
    setSaveError('');

    console.log('[addExam] uid:', session.user.id, 'exam_date:', newDate, 'title:', newTitle);

    // Save to assignments table with is_exam: true so it appears in "Due This Week"
    const { data: saved, error } = await supabase.from('assignments').insert({
      title: newTitle.trim(), subject: newSubject.trim(),
      due_date: newDate.trim(), priority: 'high', status: 'pending', is_exam: true,
    }).select().single();

    console.log('[addExam] result:', saved, 'error:', error?.message, 'code:', error?.code, 'details:', error?.details);

    setSavingExam(false);
    if (error) {
      console.error('[addExam] failed:', error.message, error.code);
      setSaveError('Could not save exam: ' + error.message);
      return;
    }

    // Update both lists immediately
    const today = new Date().toISOString().split('T')[0];
    if (saved && newDate.trim() >= today) {
      const asExam: Exam = {
        id: saved.id, title: saved.title, subject: saved.subject,
        exam_date: saved.due_date, status: 'upcoming',
      };
      setExams(prev => [...prev, asExam].sort((a, b) => a.exam_date.localeCompare(b.exam_date)));
      setAssignments(prev => [...prev, saved as Assignment].sort((a, b) => a.due_date.localeCompare(b.due_date)));
    }

    resetForm(); setExamModal(false);
    setExamSaved(true); setTimeout(() => setExamSaved(false), 2500);
    loadAssignments();
  };

  const toggleAssignmentStatus = async (a: Assignment) => {
    const next = a.status === 'pending' ? 'in_progress'
      : a.status === 'in_progress' ? 'completed' : 'pending';
    console.log('[toggleAssignmentStatus] id:', a.id, 'status:', a.status, '→', next);
    const { error } = await supabase.from('assignments').update({ status: next }).eq('id', a.id);
    if (error) {
      console.error('[toggleAssignmentStatus] failed:', error.message);
      Alert.alert('Error', 'Could not update assignment: ' + error.message);
      return;
    }
    setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, status: next } : x));
    loadAssignments();
  };

  const createDeck = async () => {
    if (!newTitle.trim() || !newSubject.trim()) return;
    setSavingDeck(true);

    console.log('[createDeck] user_id:', user?.id, 'name:', newTitle);

    const { data: saved, error } = await supabase.from('flashcard_decks').insert({
      name: newTitle.trim(), subject: newSubject.trim(), cards_count: 0,
    }).select().single();

    console.log('[createDeck] result:', saved, 'error:', error?.message);

    setSavingDeck(false);
    if (error) {
      console.error('[createDeck] failed:', error.message, error.code);
      Alert.alert('Error', 'Could not create deck: ' + error.message);
      return;
    }

    // Optimistic update
    if (saved) setDecks(prev => [saved as FlashcardDeck, ...prev]);

    resetForm(); setDeckModal(false); loadDecks();
  };

  const deleteDeck = async (id: string) => {
    console.log('[deleteDeck] id:', id);
    const { error } = await supabase.from('flashcard_decks').delete().eq('id', id);
    if (error) {
      console.error('[deleteDeck] failed:', error.message);
      Alert.alert('Error', 'Could not delete deck: ' + error.message);
      return;
    }
    setDecks(prev => prev.filter(d => d.id !== id));
    loadDecks();
  };

  const addCard = async () => {
    if (!newCardFront.trim() || !newCardBack.trim() || !selectedDeck) return;
    setSavingCard(true);

    console.log('[addCard] user_id:', user?.id, 'deck_id:', selectedDeck.id);

    const { data: saved, error } = await supabase.from('flashcards').insert({
      deck_id: selectedDeck.id, front: newCardFront.trim(), back: newCardBack.trim(),
    }).select().single();

    console.log('[addCard] result:', saved, 'error:', error?.message);

    setSavingCard(false);
    if (error) {
      console.error('[addCard] failed:', error.message, error.code);
      Alert.alert('Error', 'Could not add card: ' + error.message);
      return;
    }

    await supabase.from('flashcard_decks').update({ cards_count: selectedDeck.cards_count + 1 }).eq('id', selectedDeck.id);
    setSelectedDeck(prev => prev ? { ...prev, cards_count: prev.cards_count + 1 } : prev);

    // Optimistic update
    if (saved) setCards(prev => [...prev, saved as Flashcard]);

    setNewCardFront(''); setNewCardBack('');
    loadCards(selectedDeck.id); loadDecks();
    Alert.alert('Card Added', 'Flashcard added successfully.');
  };

  const deleteCard = async (cardId: string) => {
    if (!selectedDeck) return;
    console.log('[deleteCard] id:', cardId, 'deck:', selectedDeck.id);
    const { error } = await supabase.from('flashcards').delete().eq('id', cardId);
    if (error) {
      console.error('[deleteCard] failed:', error.message);
      Alert.alert('Error', 'Could not delete card: ' + error.message);
      return;
    }
    const newCount = Math.max(0, selectedDeck.cards_count - 1);
    await supabase.from('flashcard_decks').update({ cards_count: newCount }).eq('id', selectedDeck.id);
    setSelectedDeck(prev => prev ? { ...prev, cards_count: newCount } : prev);
    setCards(prev => prev.filter(c => c.id !== cardId));
    loadCards(selectedDeck.id); loadDecks();
  };

  const openStudyMode = async (deck: FlashcardDeck) => {
    setSelectedDeck(deck);
    await loadCards(deck.id);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setStudyModal(true);
  };

  const openCardManager = async (deck: FlashcardDeck) => {
    setSelectedDeck(deck);
    await loadCards(deck.id);
    setCardModal(true);
  };

  const resetForm = () => { setNewTitle(''); setNewSubject(''); setNewDate(''); setNewPriority('medium'); };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const renderDashboard = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dashScroll}>

      {(assignmentSaved || sessionSaved || examSaved) && (
        <View style={styles.savedBanner}>
          <CheckCircle size={15} color="#3A8F52" />
          <Text style={styles.savedBannerText}>
            {sessionSaved ? 'Study session saved!' : examSaved ? 'Exam added!' : 'Assignment saved!'}
          </Text>
        </View>
      )}

      {/* Study timer */}
      <View style={styles.timerWidget}>
        <View style={styles.timerLeft}>
          <Timer size={18} color={gold[400]} />
          <View>
            <Text style={styles.timerLabel}>Study Timer</Text>
            <Text style={styles.timerValue}>{formatTimer(studyTimer)}</Text>
          </View>
        </View>
        <View style={styles.timerRight}>
          <TouchableOpacity style={[styles.timerBtn, isTimerRunning && styles.timerBtnActive]} onPress={toggleTimer}>
            {isTimerRunning ? <Pause size={16} color={dark.bg} /> : <Play size={16} color={dark.bg} />}
          </TouchableOpacity>
          <TouchableOpacity style={styles.timerReset} onPress={resetTimer}>
            <RotateCcw size={16} color={dark.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Due Soon */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Due This Week</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setNewDate(new Date().toISOString().split('T')[0]); setAssignmentModal(true); }}>
          <Plus size={16} color={gold[400]} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {assignments.length === 0 ? (
        <View style={styles.clearCard}>
          <CheckCircle size={20} color="#3A8F52" />
          <Text style={styles.clearText}>All clear! No pending assignments.</Text>
        </View>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={assignments}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.assignmentList}
          renderItem={({ item }) => {
            const days = daysUntil(item.due_date);
            const uc = urgencyColor(days);
            const sc = subjectColor(item.subject);
            return (
              <View style={[styles.assignCard, { borderLeftColor: sc }]}>
                <View style={styles.assignCardTop}>
                  <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[item.priority] + '22' }]}>
                    <Text style={[styles.priorityText, { color: PRIORITY_COLORS[item.priority] }]}>{item.priority}</Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleAssignmentStatus(item)}>
                    {item.status === 'completed' ? (
                      <CheckCircle size={18} color="#3A8F52" />
                    ) : item.status === 'in_progress' ? (
                      <Clock size={18} color="#f59e0b" />
                    ) : (
                      <View style={styles.emptyCircle} />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.assignTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.assignSubject}>{item.subject}</Text>
                <View style={[styles.dueBadge, { backgroundColor: uc + '20' }]}>
                  <CalendarDays size={11} color={uc} />
                  <Text style={[styles.dueText, { color: uc }]}>
                    {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Exam Countdown */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Exam Countdown</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setNewDate(new Date().toISOString().split('T')[0]); setExamModal(true); }}>
          <Plus size={16} color="#C0392B" />
          <Text style={[styles.addBtnText, { color: '#C0392B' }]}>Add</Text>
        </TouchableOpacity>
      </View>

      {exams.length === 0 ? (
        <View style={styles.clearCard}>
          <GraduationCap size={20} color={dark.textMuted} />
          <Text style={styles.clearText}>No upcoming exams scheduled.</Text>
        </View>
      ) : (
        exams.map(exam => {
          const days = daysUntil(exam.exam_date);
          const uc = urgencyColor(days);
          const sc = subjectColor(exam.subject);
          return (
            <View key={exam.id} style={styles.examCard}>
              <View style={[styles.examSubjectBar, { backgroundColor: sc }]} />
              <View style={styles.examContent}>
                <Text style={styles.examTitle}>{exam.title}</Text>
                <Text style={styles.examSubject}>{exam.subject} · {formatDate(exam.exam_date)}</Text>
              </View>
              <View style={[styles.countdownBadge, { backgroundColor: uc + '1A', borderColor: uc + '50' }]}>
                <Text style={[styles.countdownNumber, { color: uc }]}>
                  {days === 0 ? '!' : days}
                </Text>
                <Text style={[styles.countdownLabel, { color: uc }]}>
                  {days === 0 ? 'today' : days === 1 ? 'day' : 'days'}
                </Text>
              </View>
            </View>
          );
        })
      )}

      {/* AI Tutor shortcut */}
      <View style={styles.aiTutorCard}>
        <View style={styles.aiTutorLeft}>
          <View style={styles.aiTutorIcon}>
            <MessageSquare size={20} color={gold[400]} />
          </View>
          <View>
            <Text style={styles.aiTutorTitle}>AI Tutor</Text>
            <Text style={styles.aiTutorSub}>Get instant help on any topic</Text>
          </View>
        </View>
        <View style={styles.aiTutorBadge}>
          <Zap size={12} color={gold[400]} />
          <Text style={styles.aiTutorBadgeText}>Chat tab</Text>
        </View>
      </View>

    </ScrollView>
  );

  // ── Flashcards ─────────────────────────────────────────────────────────────
  const renderFlashcards = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Your Decks</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setDeckModal(true); }}>
          <Plus size={16} color={gold[400]} />
          <Text style={styles.addBtnText}>New Deck</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={decks}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.deckList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Lightbulb size={40} color={gold[400]} />
            <Text style={styles.emptyTitle}>No decks yet</Text>
            <Text style={styles.emptySubtitle}>Create a deck to start studying with flashcards.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.deckCard}
            onPress={() => openStudyMode(item)}
            onLongPress={() => Alert.alert('Delete Deck', `Delete "${item.name}"?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteDeck(item.id) },
            ])}>
            <View style={[styles.deckIcon, { backgroundColor: subjectColor(item.subject) + '20' }]}>
              <BookOpen size={22} color={subjectColor(item.subject)} />
            </View>
            <View style={styles.deckContent}>
              <Text style={styles.deckName}>{item.name}</Text>
              <Text style={styles.deckSubject}>{item.subject}</Text>
            </View>
            <View style={styles.deckRight}>
              <Text style={styles.deckCount}>{item.cards_count}</Text>
              <Text style={styles.deckCountLabel}>cards</Text>
            </View>
            <TouchableOpacity style={styles.deckAddCards} onPress={() => openCardManager(item)}>
              <Plus size={16} color={dark.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.dateText}>{today}</Text>
        </View>
        <View style={styles.statsChip}>
          <AlertCircle size={13} color={assignments.length > 0 ? '#f59e0b' : '#3A8F52'} />
          <Text style={[styles.statsChipText, { color: assignments.length > 0 ? '#f59e0b' : '#3A8F52' }]}>
            {assignments.length} due
          </Text>
        </View>
      </View>

      {/* Tab toggle */}
      <View style={styles.tabToggle}>
        {(['dashboard', 'flashcards'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'dashboard' ? 'Dashboard' : 'Flashcards'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'dashboard' ? renderDashboard() : renderFlashcards()}

      {/* Add Assignment Modal */}
      <Modal animationType="slide" transparent visible={assignmentModal} onRequestClose={() => setAssignmentModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Assignment</Text>
              <TouchableOpacity onPress={() => setAssignmentModal(false)}><X size={22} color={dark.textSecondary} /></TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Title" placeholderTextColor={dark.textMuted} value={newTitle} onChangeText={setNewTitle} />
            <TextInput style={styles.input} placeholder="Subject" placeholderTextColor={dark.textMuted} value={newSubject} onChangeText={setNewSubject} />
            <DatePickerField value={newDate} onChange={setNewDate} placeholder="Select due date" />
            <View style={styles.priorityRow}>
              {(['low', 'medium', 'high'] as const).map(p => (
                <TouchableOpacity key={p} style={[styles.priorityChip, newPriority === p && { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] }]} onPress={() => setNewPriority(p)}>
                  <Text style={[styles.priorityChipText, newPriority === p && { color: '#fff' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
            <TouchableOpacity style={[styles.submitBtn, savingAssignment && { opacity: 0.7 }]} onPress={addAssignment} disabled={savingAssignment}>
              <Text style={styles.submitText}>{savingAssignment ? 'Saving...' : 'Add Assignment'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Exam Modal */}
      <Modal animationType="slide" transparent visible={examModal} onRequestClose={() => setExamModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exam</Text>
              <TouchableOpacity onPress={() => setExamModal(false)}><X size={22} color={dark.textSecondary} /></TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Exam title" placeholderTextColor={dark.textMuted} value={newTitle} onChangeText={setNewTitle} />
            <TextInput style={styles.input} placeholder="Subject" placeholderTextColor={dark.textMuted} value={newSubject} onChangeText={setNewSubject} />
            <DatePickerField value={newDate} onChange={setNewDate} placeholder="Select exam date" />
            {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#C0392B' }, savingExam && { opacity: 0.7 }]} onPress={addExam} disabled={savingExam}>
              <Text style={styles.submitText}>{savingExam ? 'Saving...' : 'Add Exam'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Deck Modal */}
      <Modal animationType="slide" transparent visible={deckModal} onRequestClose={() => setDeckModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Deck</Text>
              <TouchableOpacity onPress={() => setDeckModal(false)}><X size={22} color={dark.textSecondary} /></TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Deck name" placeholderTextColor={dark.textMuted} value={newTitle} onChangeText={setNewTitle} />
            <TextInput style={styles.input} placeholder="Subject" placeholderTextColor={dark.textMuted} value={newSubject} onChangeText={setNewSubject} />
            <TouchableOpacity style={[styles.submitBtn, savingDeck && { opacity: 0.7 }]} onPress={createDeck} disabled={savingDeck}>
              <Text style={styles.submitText}>{savingDeck ? 'Saving...' : 'Create Deck'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Card Manager Modal */}
      <Modal animationType="slide" transparent visible={cardModal} onRequestClose={() => setCardModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '92%' }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDeck?.name}</Text>
              <TouchableOpacity onPress={() => setCardModal(false)}><X size={22} color={dark.textSecondary} /></TouchableOpacity>
            </View>
            <TextInput style={styles.input} placeholder="Front (question)" placeholderTextColor={dark.textMuted} value={newCardFront} onChangeText={setNewCardFront} />
            <TextInput style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]} placeholder="Back (answer)" placeholderTextColor={dark.textMuted} value={newCardBack} onChangeText={setNewCardBack} multiline />
            <TouchableOpacity style={[styles.submitBtn, savingCard && { opacity: 0.7 }]} onPress={addCard} disabled={savingCard}>
              <Text style={styles.submitText}>{savingCard ? 'Saving...' : 'Add Card'}</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <Text style={styles.sectionSmall}>Cards ({cards.length})</Text>
            <FlatList
              data={cards}
              keyExtractor={i => i.id}
              style={{ flex: 1 }}
              renderItem={({ item }) => (
                <View style={styles.cardItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardFront}>{item.front}</Text>
                    <Text style={styles.cardBack}>{item.back}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteCard(item.id)}>
                    <Trash2 size={16} color="#C0392B" />
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Study Mode Modal */}
      <Modal animationType="slide" transparent visible={studyModal} onRequestClose={() => setStudyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { flex: 1 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDeck?.name}</Text>
              <TouchableOpacity onPress={() => setStudyModal(false)}><X size={22} color={dark.textSecondary} /></TouchableOpacity>
            </View>
            {cards.length > 0 ? (
              <>
                <Text style={styles.cardProgress}>{currentCardIndex + 1} / {cards.length}</Text>
                <TouchableOpacity
                  style={styles.flashcard}
                  onPress={() => setIsFlipped(!isFlipped)}
                  activeOpacity={0.92}>
                  <Text style={styles.flashcardSide}>{isFlipped ? 'ANSWER' : 'QUESTION'}</Text>
                  <Text style={styles.flashcardText}>
                    {isFlipped ? cards[currentCardIndex].back : cards[currentCardIndex].front}
                  </Text>
                  <Text style={styles.flashcardHint}>{isFlipped ? 'Tap to flip back' : 'Tap to reveal answer'}</Text>
                </TouchableOpacity>
                <View style={styles.navRow}>
                  <TouchableOpacity
                    style={[styles.navBtn, currentCardIndex === 0 && { opacity: 0.3 }]}
                    onPress={() => { setCurrentCardIndex(p => p - 1); setIsFlipped(false); }}
                    disabled={currentCardIndex === 0}>
                    <ChevronLeft size={22} color={gold[400]} />
                    <Text style={styles.navText}>Prev</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.navBtn, currentCardIndex === cards.length - 1 && { opacity: 0.3 }]}
                    onPress={() => { setCurrentCardIndex(p => p + 1); setIsFlipped(false); }}
                    disabled={currentCardIndex === cards.length - 1}>
                    <Text style={styles.navText}>Next</Text>
                    <ChevronRight size={22} color={gold[400]} />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No cards yet</Text>
                <TouchableOpacity style={styles.submitBtn} onPress={() => { setStudyModal(false); if (selectedDeck) openCardManager(selectedDeck); }}>
                  <Text style={styles.submitText}>Add Cards</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Save Study Session Modal */}
      <Modal animationType="slide" transparent visible={sessionModal} onRequestClose={discardSession}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save Study Session</Text>
              <TouchableOpacity onPress={discardSession}><X size={22} color={dark.textSecondary} /></TouchableOpacity>
            </View>
            <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: dark.textSecondary, marginBottom: 16 }}>
              You studied for {formatTimer(studyTimer)}. Log it?
            </Text>
            <TextInput style={styles.input} placeholder="Subject (e.g. Math, History)" placeholderTextColor={dark.textMuted} value={sessionSubject} onChangeText={setSessionSubject} />
            <TextInput style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]} placeholder="Notes (optional)" placeholderTextColor={dark.textMuted} value={sessionNotes} onChangeText={setSessionNotes} multiline />
            {sessionError ? <Text style={styles.errorText}>{sessionError}</Text> : null}
            <TouchableOpacity style={[styles.submitBtn, (!sessionSubject.trim() || savingSession) && { opacity: 0.7 }]} onPress={saveStudySession} disabled={!sessionSubject.trim() || savingSession}>
              <Text style={styles.submitText}>{savingSession ? 'Saving...' : 'Save Session'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: dark.elevated, marginTop: 8 }]} onPress={discardSession}>
              <Text style={[styles.submitText, { color: dark.textSecondary }]}>Discard</Text>
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
  greeting: { fontFamily: 'Inter_700Bold', fontSize: 22, color: dark.text },
  dateText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textSecondary, marginTop: 2 },
  statsChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: dark.elevated, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: dark.border,
  },
  statsChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },

  tabToggle: {
    flexDirection: 'row', marginHorizontal: spacing.lg, marginTop: 14, marginBottom: 2,
    backgroundColor: dark.elevated, borderRadius: borderRadius.lg, padding: 4,
    borderWidth: 1, borderColor: dark.border,
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: borderRadius.md },
  tabBtnActive: { backgroundColor: dark.surface, borderWidth: 1, borderColor: `${gold[400]}50` },
  tabText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: dark.textSecondary },
  tabTextActive: { color: gold[400], fontFamily: 'Inter_600SemiBold' },

  dashScroll: { paddingHorizontal: spacing.lg, paddingTop: 14, paddingBottom: 120 },

  // Timer widget
  timerWidget: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: dark.surface, borderRadius: borderRadius.xl,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: `${gold[400]}35`,
    marginBottom: 20,
  },
  timerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timerLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: dark.textSecondary },
  timerValue: { fontFamily: 'Inter_700Bold', fontSize: 24, color: gold[400], letterSpacing: 1 },
  timerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: gold[400], justifyContent: 'center', alignItems: 'center',
  },
  timerBtnActive: { backgroundColor: gold[500] },
  timerReset: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: dark.elevated, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: dark.border,
  },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: dark.text },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: dark.elevated, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: `${gold[400]}40`,
  },
  addBtnText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: gold[400] },

  clearCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: dark.surface, borderRadius: borderRadius.lg,
    padding: 14, marginBottom: 20, borderWidth: 1, borderColor: dark.border,
  },
  clearText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: dark.textSecondary },

  assignmentList: { paddingBottom: 16, gap: 10 },
  assignCard: {
    width: 160, backgroundColor: dark.surface, borderRadius: borderRadius.xl,
    padding: 14, borderWidth: 1, borderColor: dark.border,
    borderLeftWidth: 3, marginBottom: 20,
  },
  assignCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priorityBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: borderRadius.full },
  priorityText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, textTransform: 'capitalize' },
  emptyCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: dark.borderLight },
  assignTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: dark.text, marginBottom: 4, lineHeight: 18 },
  assignSubject: { fontFamily: 'Inter_400Regular', fontSize: 12, color: dark.textSecondary, marginBottom: 8 },
  dueBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  dueText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },

  examCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: dark.surface, borderRadius: borderRadius.xl,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: dark.border,
    overflow: 'hidden',
  },
  examSubjectBar: { width: 4, borderRadius: 2, alignSelf: 'stretch', marginRight: 12 },
  examContent: { flex: 1 },
  examTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: dark.text, marginBottom: 2 },
  examSubject: { fontFamily: 'Inter_400Regular', fontSize: 12, color: dark.textSecondary },
  countdownBadge: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: borderRadius.lg, borderWidth: 1, marginLeft: 12,
  },
  countdownNumber: { fontFamily: 'Inter_700Bold', fontSize: 22, lineHeight: 26 },
  countdownLabel: { fontFamily: 'Inter_500Medium', fontSize: 10 },

  aiTutorCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: dark.goldSurface, borderRadius: borderRadius.xl,
    padding: 16, marginTop: 4, borderWidth: 1, borderColor: `${gold[400]}40`,
  },
  aiTutorLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiTutorIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: `${gold[400]}20`, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: `${gold[400]}40`,
  },
  aiTutorTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: dark.text },
  aiTutorSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: dark.textSecondary },
  aiTutorBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: `${gold[400]}15`, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: `${gold[400]}40`,
  },
  aiTutorBadgeText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: gold[400] },

  // Flashcards
  sectionRow2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: 14 },
  deckList: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  deckCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: dark.surface, borderRadius: borderRadius.xl,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: dark.border,
  },
  deckIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  deckContent: { flex: 1 },
  deckName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: dark.text, marginBottom: 2 },
  deckSubject: { fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textSecondary },
  deckRight: { alignItems: 'center', marginRight: 10 },
  deckCount: { fontFamily: 'Inter_700Bold', fontSize: 18, color: gold[400] },
  deckCountLabel: { fontFamily: 'Inter_400Regular', fontSize: 10, color: dark.textMuted },
  deckAddCards: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: dark.elevated, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: dark.border,
  },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: dark.text },
  emptySubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: dark.textSecondary, textAlign: 'center', paddingHorizontal: 32 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalSheet: {
    backgroundColor: dark.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: spacing.lg, paddingBottom: 40,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: `${gold[400]}30`,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: dark.border, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: dark.text },
  input: {
    backgroundColor: dark.elevated, borderRadius: borderRadius.lg,
    paddingHorizontal: 14, paddingVertical: 14,
    fontFamily: 'Inter_400Regular', fontSize: 15, color: dark.text,
    marginBottom: 12, borderWidth: 1, borderColor: dark.border,
  },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  priorityChip: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: borderRadius.lg, backgroundColor: dark.elevated,
    borderWidth: 1, borderColor: dark.border,
  },
  priorityChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: dark.textSecondary, textTransform: 'capitalize' },
  submitBtn: { backgroundColor: gold[400], paddingVertical: 14, borderRadius: borderRadius.lg, alignItems: 'center' },
  submitText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: dark.bg },
  divider: { height: 1, backgroundColor: dark.border, marginVertical: 16 },
  sectionSmall: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: dark.textSecondary, marginBottom: 10 },
  savedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0D1F12', borderWidth: 1, borderColor: '#3A8F5260', borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  savedBannerText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#3A8F52' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#C0392B', marginBottom: 8 },
  cardItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: dark.elevated, borderRadius: borderRadius.md,
    padding: 12, marginBottom: 8, borderWidth: 1, borderColor: dark.border,
  },
  cardFront: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: dark.text, marginBottom: 3 },
  cardBack: { fontFamily: 'Inter_400Regular', fontSize: 12, color: dark.textSecondary },

  // Study mode
  cardProgress: { fontFamily: 'Inter_500Medium', fontSize: 13, color: dark.textSecondary, textAlign: 'center', marginBottom: 20 },
  flashcard: {
    flex: 1, backgroundColor: dark.elevated, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', padding: 32,
    marginBottom: 20, borderWidth: 1, borderColor: `${gold[400]}40`,
  },
  flashcardSide: { fontFamily: 'Inter_700Bold', fontSize: 11, color: gold[400], letterSpacing: 1.5, marginBottom: 24 },
  flashcardText: { fontFamily: 'Inter_600SemiBold', fontSize: 22, color: dark.text, textAlign: 'center', lineHeight: 32 },
  flashcardHint: { fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textMuted, marginTop: 24 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between' },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 12 },
  navText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: gold[400] },
});
