import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react-native';
import { dark, gold, spacing, borderRadius } from '@/lib/theme';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function parseISO(dateStr: string): { month: number; day: number; year: number } {
  const today = new Date();
  if (!dateStr || dateStr.length < 10) {
    return { month: today.getMonth() + 1, day: today.getDate(), year: today.getFullYear() };
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
    return { month: today.getMonth() + 1, day: today.getDate(), year: today.getFullYear() };
  }
  return { month: m, day: d, year: y };
}

function formatDisplay(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

interface Props {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  minYear?: number;
  maxYear?: number;
}

export function DatePickerField({
  value,
  onChange,
  placeholder = 'Select date',
  minYear,
  maxYear,
}: Props) {
  const todayDate = new Date();
  const defaultMinYear = todayDate.getFullYear();
  const defaultMaxYear = todayDate.getFullYear() + 3;
  const resolvedMinYear = minYear ?? defaultMinYear;
  const resolvedMaxYear = maxYear ?? defaultMaxYear;

  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(todayDate.getMonth() + 1);
  const [day, setDay] = useState(todayDate.getDate());
  const [year, setYear] = useState(todayDate.getFullYear());

  const maxDay = getDaysInMonth(month, year);
  const clampedDay = Math.min(day, maxDay);

  function openPicker() {
    const parsed = parseISO(value || todayDate.toISOString().split('T')[0]);
    const safeYear = Math.max(resolvedMinYear, Math.min(resolvedMaxYear, parsed.year));
    setMonth(parsed.month);
    setYear(safeYear);
    setDay(Math.min(parsed.day, getDaysInMonth(parsed.month, safeYear)));
    setOpen(true);
  }

  function stepMonth(dir: 1 | -1) {
    let m = month + dir;
    if (m < 1) m = 12;
    if (m > 12) m = 1;
    setMonth(m);
    setDay(d => Math.min(d, getDaysInMonth(m, year)));
  }

  function stepDay(dir: 1 | -1) {
    setDay(d => {
      const next = d + dir;
      if (next < 1) return maxDay;
      if (next > maxDay) return 1;
      return next;
    });
  }

  function stepYear(dir: 1 | -1) {
    setYear(y => {
      const next = Math.max(resolvedMinYear, Math.min(resolvedMaxYear, y + dir));
      setDay(d => Math.min(d, getDaysInMonth(month, next)));
      return next;
    });
  }

  function confirm() {
    const finalDay = Math.min(day, getDaysInMonth(month, year));
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
    onChange(dateStr);
    setOpen(false);
  }

  const G = gold[400];
  const previewLabel = `${MONTHS[month - 1]} ${String(clampedDay).padStart(2, '0')}, ${year}`;

  return (
    <>
      <TouchableOpacity
        style={[s.field, value ? s.fieldFilled : null]}
        onPress={openPicker}
        activeOpacity={0.8}>
        <Calendar size={16} color={value ? G : dark.textMuted} />
        <Text style={[s.fieldText, !value && s.placeholder]}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        <ChevronRight size={14} color={dark.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />

            <View style={s.header}>
              <TouchableOpacity onPress={() => setOpen(false)} style={s.closeBtn}>
                <X size={18} color={dark.textSecondary} />
              </TouchableOpacity>
              <Text style={s.headerTitle}>Select Date</Text>
              <TouchableOpacity onPress={confirm} style={s.doneBtn}>
                <Text style={s.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={s.selectors}>
              {/* Month */}
              <View style={[s.col, s.colWide]}>
                <Text style={s.colLabel}>Month</Text>
                <TouchableOpacity style={s.arrow} onPress={() => stepMonth(-1)}>
                  <ChevronLeft size={20} color={G} />
                </TouchableOpacity>
                <View style={s.valueBox}>
                  <Text style={s.valueText} numberOfLines={1} adjustsFontSizeToFit>
                    {MONTHS[month - 1]}
                  </Text>
                </View>
                <TouchableOpacity style={s.arrow} onPress={() => stepMonth(1)}>
                  <ChevronRight size={20} color={G} />
                </TouchableOpacity>
              </View>

              <View style={s.colDivider} />

              {/* Day */}
              <View style={s.col}>
                <Text style={s.colLabel}>Day</Text>
                <TouchableOpacity style={s.arrow} onPress={() => stepDay(-1)}>
                  <ChevronLeft size={20} color={G} />
                </TouchableOpacity>
                <View style={s.valueBox}>
                  <Text style={s.valueText}>{String(clampedDay).padStart(2, '0')}</Text>
                </View>
                <TouchableOpacity style={s.arrow} onPress={() => stepDay(1)}>
                  <ChevronRight size={20} color={G} />
                </TouchableOpacity>
              </View>

              <View style={s.colDivider} />

              {/* Year */}
              <View style={s.col}>
                <Text style={s.colLabel}>Year</Text>
                <TouchableOpacity
                  style={[s.arrow, year <= resolvedMinYear && s.arrowOff]}
                  onPress={() => stepYear(-1)}
                  disabled={year <= resolvedMinYear}>
                  <ChevronLeft size={20} color={year <= resolvedMinYear ? dark.textMuted : G} />
                </TouchableOpacity>
                <View style={s.valueBox}>
                  <Text style={s.valueText}>{year}</Text>
                </View>
                <TouchableOpacity
                  style={[s.arrow, year >= resolvedMaxYear && s.arrowOff]}
                  onPress={() => stepYear(1)}
                  disabled={year >= resolvedMaxYear}>
                  <ChevronRight size={20} color={year >= resolvedMaxYear ? dark.textMuted : G} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.preview}>
              <Calendar size={14} color={G} />
              <Text style={s.previewText}>{previewLabel}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const G = gold[400];

const s = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: dark.elevated, borderRadius: borderRadius.lg,
    paddingHorizontal: 14, paddingVertical: 14,
    marginBottom: 12, borderWidth: 1, borderColor: dark.border,
  },
  fieldFilled: { borderColor: `${G}50` },
  fieldText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 15, color: dark.text },
  placeholder: { color: dark.textMuted, fontFamily: 'Inter_400Regular' },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: {
    backgroundColor: dark.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 36,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: `${G}30`,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: dark.border,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: dark.border,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: dark.elevated,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: dark.border,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, color: dark.text },
  doneBtn: {
    paddingHorizontal: 18, paddingVertical: 8,
    backgroundColor: G, borderRadius: borderRadius.full,
  },
  doneBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: dark.bg },

  selectors: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: 6,
  },
  col: { alignItems: 'center', gap: 10, flex: 1 },
  colWide: { flex: 1.6 },
  colLabel: {
    fontFamily: 'Inter_600SemiBold', fontSize: 10, color: dark.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  arrow: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: dark.elevated, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: `${G}35`,
  },
  arrowOff: { opacity: 0.3 },
  valueBox: {
    backgroundColor: dark.elevated, borderRadius: borderRadius.md,
    paddingHorizontal: 8, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: `${G}45`, minWidth: 56, width: '100%',
  },
  valueText: {
    fontFamily: 'Inter_700Bold', fontSize: 20, color: G,
    textAlign: 'center',
  },
  colDivider: { width: 1, height: 100, backgroundColor: dark.border, marginHorizontal: 2 },

  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    marginHorizontal: spacing.lg, paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: dark.goldSurface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: `${G}30`,
  },
  previewText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: dark.text },
});
