import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { useClerk } from '@clerk/clerk-expo';
import { usePatient } from '../../context/PatientContext';
import { updatePatientProfile, BACKEND_BODY_PARTS } from '../../services/auth/patientService';
import TabScreenWrapper from '../../components/navigation/TabScreenWrapper';


/**
 * A single tappable menu row.
 * @param {{ icon: string, label: string, value?: string, onPress: function }} props
 */
function MenuRow({ icon, label, value, onPress }) {
  return (
    <Pressable style={rowStyles.row} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={rowStyles.label}>{label}</Text>
      {value ? <Text style={rowStyles.value}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
    </Pressable>
  );
}

/**
 * Format a backend painLocation enum value for display.
 * @param {string|null} value
 * @returns {string}
 */
function formatPainLocation(value) {
  if (!value) return 'Not set';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

var rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 14,
    paddingHorizontal: 16,
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: colors.textDark,
  },
  value: {
    fontSize: 14,
    color: colors.textMedium,
    marginRight: 4,
  },
});

/**
 * Profile tab screen.
 * Shows patient avatar, stats chips, menu rows, and a logout button.
 */
/**
 * Two-letter initials from a full name. Falls back to '?' when the user
 * has no name on file yet (e.g. signed in but skipped PersonalInfo).
 * @param {string} fullName
 * @returns {string}
 */
function getInitials(fullName) {
  if (!fullName || !fullName.trim()) return '?';
  var parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function ProfileScreen({ navigation }) {
  const { signOut } = useClerk();
  var insets = useSafeAreaInsets();
  var patient = usePatient();
  var [isBodyPartModalOpen, setIsBodyPartModalOpen] = useState(false);
  var [isSavingBodyPart, setIsSavingBodyPart] = useState(false);
  var [bodyPartError, setBodyPartError] = useState(null);

  async function handleSelectBodyPart(value) {
    if (isSavingBodyPart) return;
    setBodyPartError(null);
    setIsSavingBodyPart(true);
    var result = await updatePatientProfile({ painLocation: value });
    setIsSavingBodyPart(false);
    if (result.success) {
      // Refresh PatientContext so the new value reflects on this row
      // (the modal closes; the next render reads patient.painLocation).
      if (typeof patient.refresh === 'function') {
        patient.refresh();
      }
      setIsBodyPartModalOpen(false);
    } else {
      setBodyPartError(result.error || 'Failed to update body part');
    }
  }

  async function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (e) {
            Alert.alert('Error', 'Could not sign out. Please try again.');
          }
        },
      },
    ]);
  }

  function handleComingSoon() {
    Alert.alert('Coming soon', '', [{ text: 'OK' }]);
  }

  return (
    <TabScreenWrapper tabIndex={4}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
        {/* ── HEADER ── */}
        <View style={styles.headerSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{getInitials(patient.name || patient.email)}</Text>
          </View>
          <Text style={styles.name}>{patient.name || patient.email || 'Patient'}</Text>
          {patient.email ? <Text style={styles.email}>{patient.email}</Text> : null}

          {/* Stats chips removed — "42 days" and "85% adherence" were
              hardcoded mock numbers. Backend does not yet track activity
              streaks or adherence percentages, so showing real zeros here
              would be misleading. Restore once those metrics ship. */}
        </View>

        {/* ── MENU ── */}
        <View style={styles.menuSection}>
          <MenuRow
            icon="body-outline"
            label="Primary body part"
            value={formatPainLocation(patient.painLocation)}
            onPress={function () { setIsBodyPartModalOpen(true); }}
          />
          <MenuRow
            icon="person-outline"
            label="Personal Information"
            onPress={handleComingSoon}
          />
          <MenuRow
            icon="notifications-outline"
            label="Notifications"
            onPress={handleComingSoon}
          />
          <MenuRow
            icon="settings-outline"
            label="Settings"
            onPress={handleComingSoon}
          />
          <MenuRow
            icon="help-circle-outline"
            label="Help & Support"
            onPress={handleComingSoon}
          />
        </View>

        {/* ── LOGOUT ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        </ScrollView>

        {/* ── BODY-PART MODAL ── */}
        <Modal
          visible={isBodyPartModalOpen}
          animationType="fade"
          transparent={true}
          onRequestClose={function () { setIsBodyPartModalOpen(false); }}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={function () { setIsBodyPartModalOpen(false); }}
          >
            <Pressable style={styles.modalCard} onPress={function () {}}>
              <Text style={styles.modalTitle}>Primary body part</Text>
              <Text style={styles.modalSubtitle}>Used to tailor your clinical assessment.</Text>
              <View style={styles.modalGrid}>
                {BACKEND_BODY_PARTS.map(function (option) {
                  var isCurrent = patient.painLocation === option;
                  return (
                    <Pressable
                      key={option}
                      style={[
                        styles.modalOption,
                        isCurrent ? styles.modalOptionSelected : null,
                      ]}
                      onPress={function () { handleSelectBodyPart(option); }}
                      disabled={isSavingBodyPart}
                    >
                      <Text
                        style={[
                          styles.modalOptionLabel,
                          isCurrent ? styles.modalOptionLabelSelected : null,
                        ]}
                      >
                        {formatPainLocation(option)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {isSavingBodyPart ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary}
                  style={styles.modalSpinner}
                />
              ) : null}
              {bodyPartError ? (
                <Text style={styles.modalError}>{bodyPartError}</Text>
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </TabScreenWrapper>
  );
}

var styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header section
  headerSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.primary,
  },
  name: {
    fontFamily: fonts.heading.regular,
    fontSize: 22,
    lineHeight: 22 * 1.35,
    color: colors.textDark,
    marginBottom: 4,
  },
  email: {
    fontSize: fonts.sm,
    color: colors.textMedium,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    color: colors.primary,
  },
  statLabel: {
    fontSize: fonts.xs,
    color: colors.textMedium,
    marginTop: 2,
  },

  // Menu section
  menuSection: {
    marginTop: 8,
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    marginHorizontal: 16,
    height: 52,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.danger,
  },

  // Body-part modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontFamily: fonts.heading.regular,
    fontSize: 20,
    lineHeight: 20 * 1.35,
    color: colors.textDark,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: fonts.sm,
    color: colors.textMedium,
    marginBottom: 16,
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.surface,
  },
  modalOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalOptionLabel: {
    fontSize: fonts.sm,
    color: colors.textDark,
  },
  modalOptionLabelSelected: {
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
  modalSpinner: {
    marginTop: 12,
  },
  modalError: {
    fontSize: fonts.sm,
    color: colors.danger,
    marginTop: 8,
    textAlign: 'center',
  },
});
