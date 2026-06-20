import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react-native';
import { dark, gold, spacing, borderRadius } from '@/lib/theme';

const MINUTE_STEP = 5;

function parseTime(value: string): { hour12: number; minute: number; ampm: 'AM' | 'PM' } {
  if (!value || !value.includes(':')) return { hour12: 9, minute: 0, ampm: 'AM' };
  const [hStr, mStr] = value.split(':');
  const h24 = Math.min(23, Math.max(0, parseInt(hStr, 10) || 0));
  const minute = Math.min(55, Math.max(0, Math.round((parseInt(mStr, 10) || 0) / MINUTE_STEP) * MINUTE_STEP));
  const ampm: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, ampm };
}

function to24Hour(hour12: number, minute: number, ampm: 'AM' | 'PM'): string {
  let h24 = hour12 % 12;
  if (ampm === 'PM') h24 += 12;
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatDisplay(value: string): string {
  if (!value || !value.includes(':')) return '';
  const { hour12, minute, ampm } = parseTime(value);
  return `${hour12}:${String(minute).padStart(2, '0')} ${ampm}`;
}

interface Props {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  clearable?: boolean;
}

export function TimePickerField({ value, onChange, placeholder = 'Select time', clearable }: Props) {
  const [open, setOpen] = useState(false);
  const [hour12, setHour12] = useState(9);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');

  function openPicker() {
    const parsed = parseTime(value);
    setHour12(parsed.hour12);
    setMinute(parsed.minute);
    setAmpm(parsed.ampm);
    setOpen(true);
  }

  function stepHour(dir: 1 | -1) {
    setHour12(h => {
      const next = h + dir;
      if (next < 1) return 12;
      if (next > 12) return 1;
      return next;
    });
  }

  function stepMinute(dir: 1 | -1) {
    setMinute(m => {
      const next = m + dir * MINUTE_STEP;
      if (next < 0) return 60 - MINUTE_STEP;
      if (next > 59) return 0;
      return next;
    });
  }

  function confirm() {
    onChange(to24Hour(hour12, minute, ampm));
    setOpen(false);
  }

  const G = gold[400];

  return (
    <>
      <TouchableOpacity style={[s.field, value ? s.fieldFilled : null]} onPress={openPicker} activeOpacity={0.8}>
        <Clock size={16} color={value ? G : dark.textMuted} />
        <Text style={[s.fieldText, !value && s.placeholder]}>
          {value ? formatDisplay(value) : placeholder}
        </Text>
        {clearable && value ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={16} color={dark.textMuted} />
          </TouchableOpacity>
        ) : (
          <ChevronRight size={14} color={dark.textMuted} />
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.handle} />
            <View style={s.header}>
              <TouchableOpacity onPress={() => setOpen(false)} style={s.closeBtn}>
                <X size={18} color={dark.textSecondary} />
              </TouchableOpacity>
              <Text style={s.headerTitle}>Select Time</Text>
              <TouchableOpacity onPress={confirm} style={s.doneBtn}>
                <Text style={s.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={s.selectors}>
              <View style={s.col}>
                <Text style={s.colLabel}>Hour</Text>
                <TouchableOpacity style={s.arrow} onPress={() => stepHour(-1)}>
                  <ChevronLeft size={20} color={G} />
                </TouchableOpacity>
                <View style={s.valueBox}>
                  <Text style={s.valueText}>{hour12}</Text>
                </View>
                <TouchableOpacity style={s.arrow} onPress={() => stepHour(1)}>
                  <ChevronRight size={20} color={G} />
                </TouchableOpacity>
              </View>

              <View style={s.colDivider} />

              <View style={s.col}>
                <Text style={s.colLabel}>Minute</Text>
                <TouchableOpacity style={s.arrow} onPress={() => stepMinute(-1)}>
                  <ChevronLeft size={20} color={G} />
                </TouchableOpacity>
                <View style={s.valueBox}>
                  <Text style={s.valueText}>{String(minute).padStart(2, '0')}</Text>
                </View>
                <TouchableOpacity style={s.arrow} onPress={() => stepMinute(1)}>
                  <ChevronRight size={20} color={G} />
                </TouchableOpacity>
              </View>

              <View style={s.colDivider} />

              <View style={s.col}>
                <Text style={s.colLabel}>Period</Text>
                <TouchableOpacity
                  style={[s.ampmBtn, ampm === 'AM' && s.ampmBtnActive]}
                  onPress={() => setAmpm('AM')}>
                  <Text style={[s.ampmText, ampm === 'AM' && s.ampmTextActive]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.ampmBtn, ampm === 'PM' && s.ampmBtnActive]}
                  onPress={() => setAmpm('PM')}>
                  <Text style={[s.ampmText, ampm === 'PM' && s.ampmTextActive]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.preview}>
              <Clock size={14} color={G} />
              <Text style={s.previewText}>{hour12}:{String(minute).padStart(2, '0')} {ampm}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: dark.elevated, borderRadius: borderRadius.lg,
    paddingHorizontal: 14, paddingVertical: 14,
    marginBottom: 12, borderWidth: 1, borderColor: dark.border,
  },
  fieldFilled: { borderColor: `${gold[400]}50` },
  fieldText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 15, color: dark.text },
  placeholder: { color: dark.textMuted, fontFamily: 'Inter_400Regular' },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: {
    backgroundColor: dark.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 36,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: `${gold[400]}30`,
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
    backgroundColor: gold[400], borderRadius: borderRadius.full,
  },
  doneBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: dark.bg },

  selectors: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: 6,
  },
  col: { alignItems: 'center', gap: 10, flex: 1 },
  colLabel: {
    fontFamily: 'Inter_600SemiBold', fontSize: 10, color: dark.textMuted,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  arrow: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: dark.elevated, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: `${gold[400]}35`,
  },
  valueBox: {
    backgroundColor: dark.elevated, borderRadius: borderRadius.md,
    paddingHorizontal: 8, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: `${gold[400]}45`, minWidth: 56, width: '100%',
  },
  valueText: { fontFamily: 'Inter_700Bold', fontSize: 20, color: gold[400], textAlign: 'center' },
  colDivider: { width: 1, height: 100, backgroundColor: dark.border, marginHorizontal: 2 },

  ampmBtn: {
    width: '100%', paddingVertical: 10, borderRadius: borderRadius.md,
    backgroundColor: dark.elevated, alignItems: 'center',
    borderWidth: 1, borderColor: dark.border,
  },
  ampmBtnActive: { backgroundColor: gold[400], borderColor: gold[400] },
  ampmText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: dark.textSecondary },
  ampmTextActive: { color: dark.bg },

  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    marginHorizontal: spacing.lg, paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: dark.goldSurface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: `${gold[400]}30`,
  },
  previewText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: dark.text },
});
