import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { usePatient } from '../../context/PatientContext';
import TabScreenWrapper from '../../components/navigation/TabScreenWrapper';


/**
 * A single tappable menu row.
 * @param {{ icon: string, label: string, onPress: function }} props
 */
function MenuRow({ icon, label, onPress }) {
  return (
    <Pressable style={rowStyles.row} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={rowStyles.label}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
    </Pressable>
  );
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
});

/**
 * Profile tab screen.
 * Shows patient avatar, stats chips, menu rows, and a logout button.
 */
export default function ProfileScreen({ navigation }) {
  var { resetOnboarding } = usePatient();
  var insets = useSafeAreaInsets();

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
            <Text style={styles.avatarInitials}>PS</Text>
          </View>
          <Text style={styles.name}>Priya Sharma</Text>
          <Text style={styles.email}>priya.sharma@gmail.com</Text>

          {/* Stats chips */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>42 Days</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>85%</Text>
              <Text style={styles.statLabel}>Adherence</Text>
            </View>
          </View>
        </View>

        {/* ── MENU ── */}
        <View style={styles.menuSection}>
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
          onPress={resetOnboarding}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        </ScrollView>
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
});
