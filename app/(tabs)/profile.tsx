import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { LogOut, Mail, User, Shield } from 'lucide-react-native';
import { dark, gold, spacing, borderRadius } from '@/lib/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const confirmSignOut = async () => {
    setConfirmVisible(false);
    const { error } = await signOut();
    if (error) {
      Alert.alert('Sign Out Failed', error.message);
      return;
    }
    router.replace('/auth/login');
  };

  const getUserInitial = () => {
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>Manage your account</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getUserInitial()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.email || 'User'}</Text>
            <Text style={styles.profileLabel}>Helping Hand AI Student</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Mail size={20} color={gold[400]} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Email</Text>
              <Text style={styles.menuValue}>{user?.email || 'Not set'}</Text>
            </View>
          </View>

          <View style={[styles.menuItem, styles.menuItemLast]}>
            <View style={styles.menuIconContainer}>
              <Shield size={20} color={gold[400]} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Account Status</Text>
              <Text style={[styles.menuValue, { color: '#3A8F52' }]}>Active</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={() => setConfirmVisible(true)}>
          <LogOut size={20} color={dark.bg} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="fade" transparent visible={confirmVisible} onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMessage}>Are you sure you want to sign out?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setConfirmVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmSignOut}>
                <Text style={styles.modalConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: dark.bg },
  header: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.xl + 20, paddingBottom: spacing.md,
    backgroundColor: dark.surface, borderBottomWidth: 1, borderBottomColor: `${gold[400]}30`,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 28, color: dark.text, marginBottom: 4 },
  headerSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: dark.textSecondary },
  content: { padding: spacing.md },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: dark.surface,
    borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: `${gold[400]}40`,
  },
  avatarContainer: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: gold[400],
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
    shadowColor: gold[400], shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 28, color: dark.bg },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: dark.text, marginBottom: 4 },
  profileLabel: { fontFamily: 'Inter_400Regular', fontSize: 14, color: dark.textSecondary },
  section: { backgroundColor: dark.surface, borderRadius: borderRadius.lg, marginBottom: spacing.lg, overflow: 'hidden', borderWidth: 1, borderColor: dark.border },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold', fontSize: 12, color: gold[400],
    textTransform: 'uppercase', letterSpacing: 1.5,
    marginBottom: spacing.sm, marginTop: spacing.md, marginHorizontal: spacing.md,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: dark.border,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIconContainer: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: dark.goldSurface,
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
    borderWidth: 1, borderColor: `${gold[400]}30`,
  },
  menuContent: { flex: 1 },
  menuLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, color: dark.textSecondary, marginBottom: 2 },
  menuValue: { fontFamily: 'Inter_500Medium', fontSize: 15, color: dark.text },
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#C0392B', paddingVertical: spacing.md,
    borderRadius: borderRadius.lg, marginTop: spacing.xl, gap: spacing.sm,
    borderWidth: 1, borderColor: '#E74C3C40',
  },
  signOutText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: dark.bg },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: spacing.lg },
  modalCard: {
    width: '100%', maxWidth: 360, backgroundColor: dark.surface, borderRadius: borderRadius.xl,
    padding: spacing.lg, borderWidth: 1, borderColor: `${gold[400]}30`,
  },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: dark.text, marginBottom: 8 },
  modalMessage: { fontFamily: 'Inter_400Regular', fontSize: 14, color: dark.textSecondary, marginBottom: spacing.lg },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: borderRadius.lg, alignItems: 'center',
    backgroundColor: dark.elevated, borderWidth: 1, borderColor: dark.border,
  },
  modalCancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: dark.textSecondary },
  modalConfirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: borderRadius.lg, alignItems: 'center',
    backgroundColor: '#C0392B', borderWidth: 1, borderColor: '#E74C3C40',
  },
  modalConfirmText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },
});
