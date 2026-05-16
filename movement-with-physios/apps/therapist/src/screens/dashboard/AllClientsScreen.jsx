// src/screens/dashboard/AllClientsScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// All Clients list screen — Figma design.
// Backend dev: replace MOCK_CLIENTS with real API call.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';
import BottomTabBar from '../../components/BottomTabBar';
import { ROUTES } from '../../constants/routes';
import { apiClient } from '../../lib/apiClient';

// Backend exposes only the basics for a client (User doc fields). Stats like
// adherence, pain reduction, days-since-start, and last-session are not
// tracked server-side yet — surfacing `—` / 0 here is honest until those
// metrics ship, instead of fabricating numbers.
const STATUS_CONFIG = {
  Excellent:        { bg: '#D1FAE5', text: '#059669' },
  Good:             { bg: '#DBEAFE', text: '#2563EB' },
  'Needs Attention':{ bg: '#FEF3C7', text: '#D97706' },
  Critical:         { bg: '#FEE2E2', text: '#DC2626' },
};

const AVATAR_PALETTE = ['#FDE68A', '#BFDBFE', '#FCA5A5', '#A7F3D0', '#DDD6FE', '#FBCFE8'];

function avatarBgFor(id) {
  let h = 0;
  const s = String(id || '');
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

/**
 * Map a backend patient User doc into the row shape this screen renders.
 * @param {object} u
 * @returns {object}
 */
function normalizeClient(u) {
  return {
    id: String(u._id),
    name: u.name || u.email || 'Patient',
    age: null,
    condition: '',
    status: 'Good',
    adherence: 0,
    adherenceUp: true,
    pain: 0,
    days: 0,
    lastSession: '—',
    avatarBg: avatarBgFor(u._id),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
const AllClientsScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  // Pulls the real client list from /therapists/me/clients. Uses the same
  // includeAll=true escape hatch the Messages picker uses so therapists
  // can see all patients during dev (production should drop this flag).
  const loadClients = useCallback(() => {
    setLoading(true);
    apiClient.get('/therapists/me/clients', { limit: 50, includeAll: true }).then((res) => {
      if (res.success) {
        const arr = Array.isArray(res.data) ? res.data : [];
        setClients(arr.map(normalizeClient));
        setError(null);
      } else {
        setError(res.error || 'Could not load clients');
        setClients([]);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    loadClients();
    const unsub = navigation.addListener('focus', loadClients);
    return unsub;
  }, [loadClients, navigation]);

  const filteredClients = clients.filter((c) => {
    const matchSearch =
      searchText.trim() === '' ||
      c.name.toLowerCase().includes(searchText.toLowerCase());
    return matchSearch;
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
          <Text style={styles.subtitle}>
            {loading ? 'Loading…' : `${clients.length} active patient${clients.length === 1 ? '' : 's'}`}
          </Text>
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

      {/* Status filter tabs removed — backend doesn't yet track client
          health status (Excellent / Needs Attention / etc.). When that
          field ships, restore the horizontal filter scroller and bind to
          the real status values. */}

      {/* ── Client Cards ────────────────────────────────────────────── */}
      <Animated.ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {loading ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : filteredClients.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>
              {error ? 'Could not load clients' : 'No clients yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {error || 'Patients who book sessions with you will show up here.'}
            </Text>
          </View>
        ) : filteredClients.map((client) => {
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
                  {/* age + condition not yet tracked server-side; hide row
                      until the patient profile schema includes them. */}
                </View>
                {client.status ? (
                  <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>{client.status}</Text>
                  </View>
                ) : null}
              </View>

              {/* Stats row removed — adherence/pain/days have no backing
                  data yet. Restore once the patient progress endpoint
                  exists; for now we don't want to display fake numbers. */}

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

  // Empty / loading / error
  emptyWrap: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.lg,
    color: colors.textDark,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: fonts.sm,
    color: colors.textMedium,
    textAlign: 'center',
    lineHeight: fonts.sm * 1.5,
  },
});

export default AllClientsScreen;
