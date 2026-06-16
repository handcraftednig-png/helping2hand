import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Send,
  Sparkles,
  X,
  BookOpen,
  Lightbulb,
  Trophy,
  Zap,
  Brain,
  Clock,
} from 'lucide-react-native';
import { dark, gold } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { PrayingHandsIcon } from '@/components/PrayingHandsIcon';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface QuickAction {
  id: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  title: string;
  description: string;
  prompt: string;
}

const quickActions: QuickAction[] = [
  {
    id: '1',
    Icon: BookOpen,
    title: 'Study Plan',
    description: 'Build a personalized schedule',
    prompt: 'Create a personalized 7-day study plan with effective habits and scheduled breaks.',
  },
  {
    id: '2',
    Icon: Lightbulb,
    title: 'Explain It',
    description: 'Break down any concept simply',
    prompt: "I'd like you to explain a concept to me. Ask me which topic or subject I need help understanding.",
  },
  {
    id: '3',
    Icon: Trophy,
    title: 'Exam Prep',
    description: 'Ace your next test',
    prompt: 'What are the most effective strategies for preparing for and acing exams?',
  },
  {
    id: '4',
    Icon: Zap,
    title: 'Stay Focused',
    description: 'Beat distractions',
    prompt: 'Give me 5 proven techniques to improve focus and overcome procrastination while studying.',
  },
  {
    id: '5',
    Icon: Brain,
    title: 'Manage Stress',
    description: 'Handle academic pressure',
    prompt: 'How can I manage academic stress and prevent study burnout effectively?',
  },
  {
    id: '6',
    Icon: Clock,
    title: 'Time Management',
    description: 'Make every hour count',
    prompt: 'Help me create a practical time management system as a busy student.',
  },
];

const TAB_BAR_HEIGHT = 88;
const G = gold[400]; // #D4A017

function formatTime(isoString: string) {
  const d = new Date(isoString);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

// ─── Animated background orbs ────────────────────────────────────────────────
function BackgroundGlow() {
  const a = useSharedValue(0);
  const b = useSharedValue(0);

  useEffect(() => {
    a.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 5000, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
    b.value = withDelay(
      2500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.sin) })
        ),
        -1
      )
    );
  }, []);

  const styleA = useAnimatedStyle(() => ({
    opacity: interpolate(a.value, [0, 1], [0.04, 0.13]),
  }));
  const styleB = useAnimatedStyle(() => ({
    opacity: interpolate(b.value, [0, 1], [0.03, 0.09]),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.orb1, styleA]}>
        <LinearGradient
          colors={['#D4A017', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.orb2, styleB]}>
        <LinearGradient
          colors={['#C9A227', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

// ─── Glowing AI avatar ────────────────────────────────────────────────────────
function GlowingAvatar({ size = 44 }: { size?: number }) {
  const ring = useSharedValue(0);

  useEffect(() => {
    ring.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 1], [0.25, 0.75]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [1, 1.18]) }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          styles.avatarRing,
          {
            width: size + 14,
            height: size + 14,
            borderRadius: (size + 14) / 2,
          },
          ringStyle,
        ]}
      />
      <View
        style={[
          styles.avatarInner,
          { width: size, height: size, borderRadius: size / 2 },
        ]}>
        <PrayingHandsIcon size={size * 0.62} />
      </View>
    </View>
  );
}

// ─── Animated typing dots ─────────────────────────────────────────────────────
function BouncingDots() {
  const d0 = useSharedValue(0);
  const d1 = useSharedValue(0);
  const d2 = useSharedValue(0);

  const bounce = (v: SharedValue<number>, delay: number) => {
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-7, { duration: 280, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 400 })
        ),
        -1
      )
    );
  };

  useEffect(() => {
    bounce(d0, 0);
    bounce(d1, 160);
    bounce(d2, 320);
  }, []);

  const s0 = useAnimatedStyle(() => ({ transform: [{ translateY: d0.value }] }));
  const s1 = useAnimatedStyle(() => ({ transform: [{ translateY: d1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateY: d2.value }] }));

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.dot, s0]} />
      <Animated.View style={[styles.dot, s1]} />
      <Animated.View style={[styles.dot, s2]} />
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={styles.typingRow}>
      <GlowingAvatar size={28} />
      <BlurView intensity={18} tint="dark" style={styles.typingBubble}>
        <View style={styles.typingBubbleOverlay}>
          <BouncingDots />
        </View>
      </BlurView>
    </View>
  );
}

// ─── Single message bubble ────────────────────────────────────────────────────
function MessageBubble({ item, isUser, isLastInGroup }: {
  item: Message;
  isUser: boolean;
  isLastInGroup: boolean;
}) {
  const y = useSharedValue(14);
  const o = useSharedValue(0);

  useEffect(() => {
    y.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.back(1.2)) });
    o.value = withTiming(1, { duration: 250 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: y.value }],
  }));

  if (isUser) {
    return (
      <Animated.View
        style={[
          styles.messageRow,
          styles.messageRowUser,
          animStyle,
        ]}>
        <LinearGradient
          colors={['#E8B820', '#B8870A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.bubble,
            styles.userBubble,
            isLastInGroup && styles.userBubbleTail,
          ]}>
          <Text style={styles.userBubbleText}>{item.content}</Text>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.messageRow,
        styles.messageRowAI,
        animStyle,
      ]}>
      {isLastInGroup ? (
        <View style={styles.aiAvatarSmall}>
          <GlowingAvatar size={28} />
        </View>
      ) : (
        <View style={styles.aiAvatarSpacer} />
      )}
      <BlurView
        intensity={16}
        tint="dark"
        style={[
          styles.bubble,
          styles.aiBubble,
          isLastInGroup && styles.aiBubbleTail,
        ]}>
        <View style={styles.aiBubbleOverlay}>
          <Text style={styles.aiBubbleText}>{item.content}</Text>
        </View>
      </BlurView>
    </Animated.View>
  );
}

// ─── Quick action card ────────────────────────────────────────────────────────
function ActionCard({
  action,
  index,
  onPress,
}: {
  action: QuickAction;
  index: number;
  onPress: () => void;
}) {
  const y = useSharedValue(20);
  const o = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const delay = index * 75;
    o.value = withDelay(delay, withTiming(1, { duration: 340 }));
    y.value = withDelay(
      delay,
      withTiming(0, { duration: 340, easing: Easing.out(Easing.back(1.15)) })
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.cardWrap, containerStyle]}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.94, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.back(1.5)) });
        }}
        activeOpacity={1}>
        <BlurView intensity={16} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={[`${G}1A`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[`${G}70`, `${G}22`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardTopBorder}
          pointerEvents="none"
        />
        <View style={styles.cardContent}>
          <View style={styles.cardIconBadge}>
            <action.Icon size={17} color={G} strokeWidth={1.8} />
          </View>
          <Text style={styles.cardTitle}>{action.title}</Text>
          <Text style={styles.cardDescription}>{action.description}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Self-improve banner ──────────────────────────────────────────────────────
function ImproveBanner({
  banner,
  opacity,
  onDismiss,
}: {
  banner: { text: string; notes: string[] };
  opacity: SharedValue<number>;
  onDismiss: () => void;
}) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[styles.improveBanner, style]}>
      <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.improveBannerContent}>
        <View style={styles.improveBannerHeader}>
          <Sparkles size={13} color={G} />
          <Text style={styles.improveBannerTitle}>AI Updated Itself</Text>
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={13} color={dark.textMuted} />
          </TouchableOpacity>
        </View>
        <Text style={styles.improveBannerText}>{banner.text}</Text>
        {banner.notes.map((n, i) => (
          <Text key={i} style={styles.improveBannerNote}>· {n}</Text>
        ))}
      </View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [improveBanner, setImproveBanner] = useState<{ text: string; notes: string[] } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const bannerOpacity = useSharedValue(0);
  const sendGlow = useSharedValue(0);

  useEffect(() => {
    if (user) loadMessages();
  }, [user]);

  useEffect(() => {
    sendGlow.value = withTiming(inputText.trim() ? 1 : 0, { duration: 300 });
  }, [inputText]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100);
    if (!error && data) setMessages(data);
  };

  const showBanner = (text: string, notes: string[], duration = 6000) => {
    setImproveBanner({ text, notes });
    bannerOpacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(duration, withTiming(0, { duration: 400 }))
    );
    setTimeout(() => setImproveBanner(null), duration + 800);
  };

  const dismissBanner = () => {
    bannerOpacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => setImproveBanner(null), 250);
  };

  const triggerSelfImprove = async () => {
    if (isImproving) return;
    setIsImproving(true);
    setImproveBanner(null);
    try {
      const { data, error } = await supabase.functions.invoke('self-improve');
      if (error) throw error;
      const text = data?.improved
        ? data.message
        : (data?.message ?? 'Self-improvement ran but no changes were made.');
      showBanner(text, data?.personalization_notes ?? []);
    } catch {
      showBanner('Could not reach self-improvement service.', [], 4000);
    }
    setIsImproving(false);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setInputText('');
    setIsLoading(true);

    const tempUserMsg: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const chatHistory = messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      chatHistory.push({ role: 'user', content: text.trim() });

      const { data, error } = await supabase.functions.invoke('openai-chat', {
        body: { messages: chatHistory },
      });

      if (error) {
        let detail = error.message ?? 'Unknown error';
        try {
          const body = await (error as unknown as { context: Response }).context.json();
          detail = body?.error ?? body?.message ?? JSON.stringify(body);
        } catch { /* keep error.message */ }
        console.error('[openai-chat]', detail);
        throw new Error(detail);
      }

      const assistantContent = data?.message || "I apologize, I couldn't generate a response. Please try again.";

      // Reload from DB so IDs are canonical UUIDs and no duplicates appear on next mount
      const { data: dbMsgs, error: dbErr } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (!dbErr && dbMsgs && dbMsgs.length > 0) {
        setMessages(dbMsgs);
      } else {
        // DB reload failed — fall back to local state so the conversation keeps working
        setMessages(prev => [
          ...prev,
          {
            id: `temp-ai-${Date.now()}`,
            role: 'assistant' as const,
            content: assistantContent,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      setMessages(prev => [
        ...prev,
        {
          id: `temp-err-${Date.now()}`,
          role: 'assistant' as const,
          content: `⚠️ ${detail}`,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    setIsLoading(false);
  };

  const shouldShowTime = (msgs: Message[], index: number) => {
    if (index === 0) return true;
    const prev = new Date(msgs[index - 1].created_at).getTime();
    const curr = new Date(msgs[index].created_at).getTime();
    return curr - prev > 5 * 60 * 1000;
  };

  const sendGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(sendGlow.value, [0, 1], [0, 0.55]),
    transform: [{ scale: interpolate(sendGlow.value, [0, 1], [0.95, 1]) }],
  }));

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';
    const showTime = shouldShowTime(messages, index);
    const nextMsg = messages[index + 1];
    const isLastInGroup = !nextMsg || nextMsg.role !== item.role;

    return (
      <View>
        {showTime && (
          <Text style={styles.timeLabel}>{formatTime(item.created_at)}</Text>
        )}
        <MessageBubble item={item} isUser={isUser} isLastInGroup={isLastInGroup} />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <GlowingAvatar size={88} />
      <Text style={styles.emptyTitle}>Helping Hand AI</Text>
      <Text style={styles.emptySubtitle}>
        Your personal study assistant.{'\n'}Tap a card or type a message to begin.
      </Text>
      <View style={styles.cardsGrid}>
        {quickActions.map((action, i) => (
          <ActionCard
            key={action.id}
            action={action}
            index={i}
            onPress={() => sendMessage(action.prompt)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.outer}>
      <BackgroundGlow />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>

        {/* Header */}
        <BlurView intensity={40} tint="dark" style={styles.header}>
          <View style={styles.headerInner}>
            <GlowingAvatar size={42} />
            <View style={styles.headerText}>
              <Text style={styles.headerName}>Helping Hand AI</Text>
              <View style={styles.headerStatusRow}>
                <View style={[styles.statusDot, isLoading && styles.statusDotActive]} />
                <Text style={styles.headerStatus}>
                  {isLoading ? 'Thinking...' : 'AI study assistant'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.improveBtn, isImproving && styles.improveBtnActive]}
              onPress={triggerSelfImprove}
              disabled={isImproving}
              activeOpacity={0.75}>
              <Sparkles size={14} color={isImproving ? dark.bg : G} />
              <Text style={[styles.improveBtnText, isImproving && styles.improveBtnTextActive]}>
                {isImproving ? 'Improving...' : 'Self-Improve'}
              </Text>
            </TouchableOpacity>
          </View>
          {/* Gold shimmer line at bottom */}
          <LinearGradient
            colors={['transparent', `${G}60`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerBorder}
          />
        </BlurView>

        {/* Self-improve banner */}
        {improveBanner && (
          <ImproveBanner
            banner={improveBanner}
            opacity={bannerOpacity}
            onDismiss={dismissBanner}
          />
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.messagesListEmpty,
          ]}
          ListEmptyComponent={renderEmpty}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        {/* Typing indicator */}
        {isLoading && (
          <View style={styles.typingContainer}>
            <TypingIndicator />
          </View>
        )}

        {/* Input bar */}
        <BlurView intensity={55} tint="dark" style={styles.inputBar}>
          <LinearGradient
            colors={['transparent', `${G}35`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.inputBarTopBorder}
          />
          <View style={styles.inputBarInner}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={dark.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={() => {
                if (Platform.OS !== 'web') sendMessage(inputText);
              }}
            />
            <Animated.View style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled, sendGlowStyle]}>
              <TouchableOpacity
                style={styles.sendBtnTouch}
                onPress={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isLoading}
                activeOpacity={0.8}>
                <Send
                  size={17}
                  color={inputText.trim() && !isLoading ? '#0A0A0A' : dark.textMuted}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </BlurView>

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#070707',
    paddingBottom: TAB_BAR_HEIGHT,
  },
  container: {
    flex: 1,
  },

  // ─ Background orbs
  orb1: {
    position: 'absolute',
    top: -180,
    right: -180,
    width: 420,
    height: 420,
    borderRadius: 210,
    overflow: 'hidden',
  },
  orb2: {
    position: 'absolute',
    bottom: 20,
    left: -200,
    width: 380,
    height: 380,
    borderRadius: 190,
    overflow: 'hidden',
  },

  // ─ Avatar
  avatarRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: G,
    shadowColor: G,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  avatarInner: {
    backgroundColor: '#1A1505',
    borderWidth: 1,
    borderColor: `${G}55`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  // ─ Header
  header: {
    overflow: 'hidden',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 14,
  },
  headerBorder: {
    height: 1,
    width: '100%',
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#F0EDE6',
    letterSpacing: 0.3,
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: dark.textMuted,
  },
  statusDotActive: {
    backgroundColor: G,
    shadowColor: G,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  headerStatus: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: dark.textSecondary,
  },
  improveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: `${G}45`,
    backgroundColor: 'rgba(212,160,23,0.08)',
  },
  improveBtnActive: {
    backgroundColor: G,
    borderColor: G,
  },
  improveBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: G,
  },
  improveBtnTextActive: {
    color: '#0A0A0A',
  },

  // ─ Improve banner
  improveBanner: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${G}35`,
    overflow: 'hidden',
  },
  improveBannerContent: {
    padding: 14,
    gap: 4,
  },
  improveBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 5,
  },
  improveBannerTitle: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: G,
  },
  improveBannerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#F0EDE6',
    lineHeight: 19,
  },
  improveBannerNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: dark.textSecondary,
    lineHeight: 17,
  },

  // ─ Messages
  messagesList: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 12,
  },
  messagesListEmpty: {
    flex: 1,
  },
  timeLabel: {
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: dark.textMuted,
    marginVertical: 10,
    letterSpacing: 0.5,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 3,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAI: {
    justifyContent: 'flex-start',
  },
  aiAvatarSmall: {
    marginRight: 8,
    marginBottom: 2,
  },
  aiAvatarSpacer: {
    width: 28,
    marginRight: 8,
  },

  // ─ Bubbles
  bubble: {
    maxWidth: '76%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  userBubble: {
    borderBottomRightRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 11,
    shadowColor: G,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  userBubbleTail: {
    borderBottomRightRadius: 5,
  },
  userBubbleText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#0A0A0A',
  },
  aiBubble: {
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: `${G}28`,
  },
  aiBubbleTail: {
    borderBottomLeftRadius: 5,
  },
  aiBubbleOverlay: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    backgroundColor: 'rgba(12,10,3,0.72)',
  },
  aiBubbleText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#F0EDE6',
  },

  // ─ Typing indicator
  typingContainer: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  typingBubble: {
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: `${G}28`,
    overflow: 'hidden',
  },
  typingBubbleOverlay: {
    backgroundColor: 'rgba(12,10,3,0.72)',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: G,
    shadowColor: G,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  // ─ Input bar
  inputBar: {
    overflow: 'hidden',
  },
  inputBarTopBorder: {
    height: 1,
    width: '100%',
  },
  inputBarInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#F0EDE6',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: `${G}28`,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    minHeight: 46,
    maxHeight: 120,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: G,
    shadowColor: G,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  sendBtnDisabled: {
    backgroundColor: '#1E1E1E',
    shadowOpacity: 0,
  },
  sendBtnTouch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─ Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    gap: 14,
  },
  emptyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: '#F0EDE6',
    letterSpacing: 0.2,
    marginTop: 8,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: dark.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    width: '100%',
  },
  cardWrap: {
    width: '48%',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${G}28`,
    overflow: 'hidden',
    minHeight: 110,
  },
  cardTopBorder: {
    height: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  cardContent: {
    padding: 16,
    gap: 6,
  },
  cardIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${G}18`,
    borderWidth: 1,
    borderColor: `${G}38`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#F0EDE6',
    letterSpacing: 0.1,
  },
  cardDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: dark.textSecondary,
    lineHeight: 17,
  },
});
