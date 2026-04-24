// src/screens/dashboard/AllClientsScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// All Clients list screen — Figma design.
// Backend dev: replace MOCK_CLIENTS with real API call.
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

// ── Mock data — replace with API calls ───────────────────────────────────────
const MOCK_CLIENTS = [
  {
    id: 1,
    name: 'Priya Sharma',
    age: 34,
    condition: 'Lower Back Pain',
    status: 'Excellent',
    adherence: 85,
    adherenceUp: true,
    pain: 42,
    days: 42,
    lastSession: '2 hours ago',
    avatarBg: '#FDE68A',
    avatarIcon: 'person',
  },
  {
    id: 2,
    name: 'Rahul Patel',
    age: 45,
    condition: 'Post-Knee Surgery',
    status: 'Needs Attention',
    adherence: 65,
    adherenceUp: false,
    pain: 28,
    days: 18,
    lastSession: '1 day ago',
    avatarBg: '#BFDBFE',
    avatarIcon: 'person',
  },
  {
    id: 3,
    name: 'Meera Singh',
    age: 62,
    condition: 'Shoulder Impingement',
    status: 'Excellent',
    adherence: 92,
    adherenceUp: true,
    pain: 42,
    days: 32,
    lastSession: '5 hours ago',
    avatarBg: '#FCA5A5',
    avatarIcon: 'person',
  },
  {
    id: 4,
    name: 'Vikram Mehta',
    age: 51,
    condition: 'Hip Replacement Recovery',
    status: 'Critical',
    adherence: 85,
    adherenceUp: true,
    pain: 42,
    days: 42,
    lastSession: '5 days ago',
    avatarBg: '#A7F3D0',
    avatarIcon: 'person',
  },
  {
    id: 5,
    name: 'Anjali Kumar',
    age: 29,
    condition: 'Rotator Cuff Tear',
    status: 'Excellent',
    adherence: 78,
    adherenceUp: true,
    pain: 35,
    days: 22,
    lastSession: '3 hours ago',
    avatarBg: '#DDD6FE',
    avatarIcon: 'person',
  },
];

const FILTER_TABS = ['All Clients', 'Excellent', 'Good', 'Needs Attention', 'Critical'];

const STATUS_CONFIG = {
  Excellent:        { bg: '#D1FAE5', text: '#059669' },
  Good:             { bg: '#DBEAFE', text: '#2563EB' },
  'Needs Attention':{ bg: '#FEF3C7', text: '#D97706' },
  Critical:         { bg: '#FEE2E2', text: '#DC2626' },
};

// ── Component ─────────────────────────────────────────────────────────────────
const AllClientsScreen = ({ navigation }) => {
  const [searchText,   setSearchText]   = useState('');
  const [activeFilter, setActiveFilter] = useState('All Clients');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const filteredClients = MOCK_CLIENTS.filter((c) => {
    const matchSearch =
      searchText.trim() === '' ||
      c.name.toLowerCase().includes(searchText.toLowerCase()) ||
      c.condition.toLowerCase().includes(searchText.toLowerCase());

    const matchFilter =
      activeFilter === 'All Clients' || c.status === activeFilter;

    return matchSearch && matchFilter;
  });

  const handleTabPress = (tabId) => {
    if (tabId === 'home') {
      navigation.navigate(ROUTES.DASHBOARD);
    } else if (tabId === 'exercise') {
      navigation.navigate(ROUTES.EXERCISES);
    } else if (tabId === 'messages') {
      navigation.navigate(ROUTES.MESSAGES);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>All Clients</Text>
          <Text style={styles.subtitle}>{MOCK_CLIENTS.length} active patients</Text>
        </View>
      </View>

      {/* ── Search + Filter ─────────────────────────────────────────── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={15} color={colors.placeholder} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or condition..."
            placeholderTextColor={colors.placeholder}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>
          <Ionicons name="options-outline" size={16} color={colors.textDark} />
          <Text style={styles.filterBtnText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* ── Status Filter Tabs ──────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterTabsContainer}
        style={styles.filterTabsScroll}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab;
          const count = tab === 'All Clients'
            ? MOCK_CLIENTS.length
            : MOCK_CLIENTS.filter((c) => c.status === tab).length;
          if (count === 0 && tab !== 'All Clients') return null;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {tab === 'All Clients' ? `All Clients (${count})` : `${tab} (${count})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Client Cards ────────────────────────────────────────────── */}
      <Animated.ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {filteredClients.map((client) => {
          const statusCfg = STATUS_CONFIG[client.status] ?? { bg: '#F3F4F6', text: '#6B7280' };
          return (
            <TouchableOpacity key={client.id} style={styles.clientCard} activeOpacity={0.85}>

              {/* Top row: avatar + name + status badge */}
              <View style={styles.cardTopRow}>
                <View style={[styles.avatar, { backgroundColor: client.avatarBg }]}>
                  <Ionicons name="person" size={20} color={colors.white} />
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{client.name}</Text>
                  <Text style={styles.clientMeta}>{client.age} years • {client.condition}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>{client.status}</Text>
                </View>
              </View>

              {/* Stats row: Adherence | Pain | Days */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Adherence</Text>
                  <View style={styles.statValueRow}>
                    <Text style={[styles.statValue, { color: client.adherenceUp ? '#10B981' : '#EF4444' }]}>
                      {client.adherence}%
                    </Text>
                    <Ionicons
                      name={client.adherenceUp ? 'trending-up' : 'trending-down'}
                      size={14}
                      color={client.adherenceUp ? '#10B981' : '#EF4444'}
                      style={{ marginLeft: 3 }}
                    />
                  </View>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Pain ↓</Text>
                  <Text style={[styles.statValue, { color: '#10B981' }]}>{client.pain}%</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Days</Text>
                  <Text style={[styles.statValue, { color: colors.textDark }]}>{client.days}</Text>
                </View>
              </View>

              {/* Last session */}
              <Text style={styles.lastSession}>Last session: {client.lastSession}</Text>

            </TouchableOpacity>
          );
        })}
        <View style={{ height: 16 }} />
      </Animated.ScrollView>

      {/* ── Bottom Tab Bar ───────────────────────────────────────────── */}
      <BottomTabBar activeTab="clients" onTabPress={handleTabPress} />

    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xl,
    color: colors.textDark,
    lineHeight: 26,
  },
  subtitle: { fontSize: fonts.xs, color: colors.textMedium, marginTop: 1 },

  // Search + Filter row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: colors.white,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder,
    paddingHorizontal: 12, height: 40,
  },
  searchInput: {
    flex: 1, fontSize: fonts.sm, color: colors.textDark, paddingVertical: 0,
  },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 40, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder,
    backgroundColor: colors.white,
  },
  filterBtnText: { fontSize: fonts.sm, color: colors.textDark, fontWeight: fonts.medium },

  // Filter tabs (horizontal scroll)
  filterTabsScroll: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    maxHeight: 48,
  },
  filterTabsContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1, borderColor: colors.cardBorder,
    backgroundColor: colors.white,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: fonts.sm, fontWeight: fonts.medium, color: colors.textMedium,
  },
  filterTabTextActive: {
    color: colors.white,
  },

  // Client list
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },

  // Client card
  clientCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  clientInfo: { flex: 1 },
  clientName: {
    fontSize: fonts.md, fontWeight: fonts.semibold, color: colors.textDark, marginBottom: 2,
  },
  clientMeta: { fontSize: fonts.xs, color: colors.textMedium },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: { fontSize: fonts.xs, fontWeight: fonts.semibold },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: fonts.xs, color: colors.textMedium, marginBottom: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'center' },
  statValue: { fontSize: fonts.md, fontWeight: fonts.bold },
  statDivider: { width: 1, height: 32, backgroundColor: colors.cardBorder },

  lastSession: { fontSize: fonts.xs, color: colors.textLight },
});

export default AllClientsScreen;
