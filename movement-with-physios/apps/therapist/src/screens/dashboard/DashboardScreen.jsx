// src/screens/dashboard/DashboardScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full verified therapist dashboard.
// Matches Figma: stats grid, today's appointments, recent activity, bottom tabs.
//
// Backend dev: replace MOCK_* constants with real API calls.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';
import BottomTabBar from '../../components/BottomTabBar';
import { ROUTES } from '../../constants/routes';

// ── Mock data — replace with API calls ────────────────────────────────────────
const THERAPIST_NAME = 'Dr. Ayush';

const MOCK_STATS = [
  { id: 'clients',    label: 'Active Clients',  value: '47', trend: '+12%', icon: 'people-outline',     trendUp: true  },
  { id: 'adherence',  label: 'Avg Adherence',   value: '89%',trend: '+8%',  icon: 'trending-up-outline', trendUp: true  },
  { id: 'sessions',   label: 'Total Sessions',  value: '8',  trend: null,   icon: 'calendar-outline',   trendUp: null  },
  { id: 'messages',   label: 'Unread Messages', value: '12', trend: null,   icon: 'chatbubble-outline',  trendUp: null, badge: true },
];

const MOCK_APPOINTMENTS = [
  { id: 1, name: 'Priya Sharma',  type: 'Video Call',          time: '10:00 AM', status: 'Upcoming' },
  { id: 2, name: 'Rahul Patel',   type: 'Follow-up',           time: '11:30 AM', status: 'Upcoming' },
  { id: 3, name: 'Anjali Kumar',  type: 'Initial Assessment',  time: '2:00 PM',  status: 'Upcoming' },
];

const MOCK_ACTIVITY = [
  { id: 1, name: 'Priya Sharma', note: 'Completed Morning Mobility session',  time: '2 hours ago',  icon: 'checkmark-circle',  iconColor: '#10B981' },
  { id: 2, name: 'Rahul Patel',  note: 'Missed evening session',              time: '5 hours ago',  icon: 'alert-circle',       iconColor: '#F59E0B' },
  { id: 3, name: 'Meera Singh',  note: 'Reported pain level: 3/10',           time: '1 day ago',    icon: 'trending-down',      iconColor: colors.primary },
  { id: 4, name: 'Anjali Kumar', note: 'New message received',                time: '1 day ago',    icon: 'chatbubble-ellipses',iconColor: '#6366F1' },
];


// ── Component ──────────────────────────────────────────────────────────────────
const DashboardScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');

  const handleTabPress = (tabId) => {
    if (tabId === 'clients') {
      navigation.navigate(ROUTES.CLIENTS);
    } else if (tabId === 'exercise') {
      navigation.navigate(ROUTES.EXERCISES);
    } else if (tabId === 'messages') {
      navigation.navigate(ROUTES.MESSAGES);
    }
  };

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ───────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome, {THERAPIST_NAME}</Text>
            <Text style={styles.welcomeSub}>Here's your practice overview</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconBtn} activeOpacity={0.75}>
              <Ionicons name="notifications-outline" size={20} color={colors.textDark} />
              {/* Notification dot */}
              <View style={styles.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.75}
              onPress={() => navigation.replace('Login')}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search Bar ───────────────────────────────────────────── */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={colors.placeholder} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients..."
            placeholderTextColor={colors.placeholder}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Stats Grid ───────────────────────────────────────── */}
          <View style={styles.statsGrid}>
            {MOCK_STATS.map((stat) => (
              <View key={stat.id} style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <View style={styles.statIconWrap}>
                    <Ionicons name={stat.icon} size={16} color={colors.primary} />
                  </View>
                  {stat.trend ? (
                    <View style={[styles.trendBadge, { backgroundColor: stat.trendUp ? '#D1FAE5' : '#FEE2E2' }]}>
                      <Text style={[styles.trendText, { color: stat.trendUp ? '#059669' : '#DC2626' }]}>
                        {stat.trend}
                      </Text>
                    </View>
                  ) : stat.badge ? (
                    <View style={styles.badgeDot}>
                      <Text style={styles.badgeDotText}>{stat.value}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.statValue}>{stat.badge ? null : stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Today's Appointments ─────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Appointments</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {MOCK_APPOINTMENTS.map((appt, idx) => (
              <View key={appt.id}>
                <View style={styles.apptRow}>
                  <View style={styles.apptInfo}>
                    <Text style={styles.apptName}>{appt.name}</Text>
                    <Text style={styles.apptType}>{appt.type}</Text>
                  </View>
                  <View style={styles.apptRight}>
                    <Text style={styles.apptTime}>{appt.time}</Text>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText}>{appt.status}</Text>
                    </View>
                  </View>
                </View>
                {idx < MOCK_APPOINTMENTS.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>

          {/* ── Add New Appointment ─────────────────────────────── */}
          <TouchableOpacity style={styles.addApptBtn} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.addApptText}>Add New Appointment</Text>
          </TouchableOpacity>

          {/* ── Recent Activity ──────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {MOCK_ACTIVITY.map((item, idx) => (
              <View key={item.id}>
                <View style={styles.activityRow}>
                  <View style={[styles.activityIconWrap, { backgroundColor: item.iconColor + '20' }]}>
                    <Ionicons name={item.icon} size={18} color={item.iconColor} />
                  </View>
                  <View style={styles.activityInfo}>
                    <View style={styles.activityTopRow}>
                      <Text style={styles.activityName}>{item.name}</Text>
                      <Text style={styles.activityTime}>{item.time}</Text>
                    </View>
                    <Text style={styles.activityNote}>{item.note}</Text>
                  </View>
                </View>
                {idx < MOCK_ACTIVITY.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>

          {/* Bottom spacing for tab bar */}
          <View style={{ height: 16 }} />

        </Animated.View>
      </ScrollView>

      {/* ── Bottom Tab Bar ───────────────────────────────────────── */}
      <BottomTabBar activeTab="home" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  welcomeText: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xxl,
    color: colors.textDark,
    lineHeight: 32,
  },
  welcomeSub:  { fontSize: fonts.xs, color: colors.textMedium, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
    position: 'relative',
  },
  notifDot: {
    position: 'absolute', top: 7, right: 7,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1, borderColor: colors.white,
  },
  logoutBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder,
    paddingHorizontal: 14, height: 42,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1, fontSize: fonts.sm, color: colors.textDark,
    paddingVertical: 0,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  trendBadge: {
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 20,
  },
  trendText: { fontSize: fonts.xs, fontWeight: fonts.semibold },
  badgeDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center', alignItems: 'center',
  },
  badgeDotText: { fontSize: fonts.xs, fontWeight: fonts.bold, color: colors.white },
  statValue: {
    fontSize: fonts.xxl, fontWeight: fonts.bold,
    color: colors.textDark, marginBottom: 2,
  },
  statLabel: { fontSize: fonts.xs, color: colors.textMedium },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: fonts.lg, fontWeight: fonts.bold, color: colors.textDark,
  },
  viewAll: {
    fontSize: fonts.sm, color: colors.primary, fontWeight: fonts.semibold,
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  divider: { height: 1, backgroundColor: colors.cardBorder },

  // Appointments
  apptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  apptInfo:   { flex: 1 },
  apptName:   { fontSize: fonts.md, fontWeight: fonts.semibold, color: colors.textDark, marginBottom: 2 },
  apptType:   { fontSize: fonts.sm, color: colors.textLight },
  apptRight:  { alignItems: 'flex-end', gap: 4 },
  apptTime:   { fontSize: fonts.sm, color: colors.textMedium, fontWeight: fonts.medium },
  statusPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusPillText: {
    fontSize: fonts.xs, color: colors.primary, fontWeight: fonts.semibold,
  },

  // Add appointment
  addApptBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 28,
    borderWidth: 1.5, borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    marginBottom: 24,
  },
  addApptText: {
    fontSize: fonts.md, fontWeight: fonts.semibold, color: colors.primary,
  },

  // Activity
  activityRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, gap: 12,
  },
  activityIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  activityInfo:   { flex: 1 },
  activityTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  activityName:   { fontSize: fonts.sm, fontWeight: fonts.semibold, color: colors.textDark },
  activityTime:   { fontSize: fonts.xs, color: colors.textLight },
  activityNote:   { fontSize: fonts.xs, color: colors.textMedium, lineHeight: 17 },

});

export default DashboardScreen;
