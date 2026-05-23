/**
 * BookingsScreen — the therapist's bookings dashboard, mounted on the
 * 'calendar' tab of the BottomTabBar.
 *
 * Top tabs: Upcoming | Past
 *   Upcoming = status in [confirmed, instant_pending, pending], sorted asc by slotStart
 *   Past     = status in [completed, cancelled, instant_declined], sorted desc by slotStart
 *
 * Each row: avatar + name + date/time + body-part badge + meeting-type icon +
 *   status pill, plus a green "Join" CTA for video bookings where canJoin.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { ROUTES } from '../../constants/routes';
import BottomTabBar from '../../components/BottomTabBar';
import BodyPartBadge from '../../components/video/BodyPartBadge';
import ProposalRow from '../../components/proposals/ProposalRow';
import ProposalDetailSheet from '../../components/proposals/ProposalDetailSheet';
import { listBookings } from '../../services/bookingService';
import { listProposals } from '../../services/proposalService';

var UPCOMING_STATUSES = ['confirmed', 'instant_pending', 'pending'];
var PAST_STATUSES = ['completed', 'cancelled', 'instant_declined'];

function formatSlot(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var h = d.getHours();
  var m = d.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  var date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return date + ' · ' + h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
}

function statusColor(status) {
  switch (status) {
    case 'confirmed':       return { bg: colors.primaryLight, fg: colors.primary };
    case 'instant_pending': return { bg: '#FEF3C7', fg: '#92400E' };
    case 'pending':         return { bg: '#FEF3C7', fg: '#92400E' };
    case 'completed':       return { bg: '#E0F2FE', fg: '#075985' };
    case 'cancelled':       return { bg: '#FEE2E2', fg: colors.error };
    case 'instant_declined':return { bg: '#FEE2E2', fg: colors.error };
    default:                return { bg: colors.cardBorder, fg: colors.textMedium };
  }
}

function statusLabel(status) {
  switch (status) {
    case 'instant_pending':  return 'Instant pending';
    case 'instant_declined': return 'Declined';
    default: return (status || '').replace(/_/g, ' ');
  }
}

function patientName(b) {
  if (b && b.patientId) {
    if (typeof b.patientId === 'object') return b.patientId.name || 'Patient';
  }
  return 'Patient';
}

function patientInitials(name) {
  if (!name) return '?';
  var parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function BookingRow({ booking, onPress }) {
  var name = patientName(booking);
  var color = statusColor(booking.status);
  var isVideo = booking.meetingType === 'video';
  var bodyPart = (booking.assessmentId && Array.isArray(booking.assessmentId.bodyParts))
    ? booking.assessmentId.bodyParts[0]
    : null;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{patientInitials(name)}</Text>
      </View>
      <View style={styles.rowMid}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.metaRow}>
          <Ionicons
            name={isVideo ? 'videocam-outline' : 'person-outline'}
            size={12}
            color={colors.textLight}
          />
          <Text style={styles.time}>{formatSlot(booking.slotStart)}</Text>
        </View>
        {bodyPart ? <View style={{ marginTop: 4 }}><BodyPartBadge bodyPart={bodyPart} compact /></View> : null}
      </View>
      <View style={styles.rowRight}>
        <View style={[styles.statusPill, { backgroundColor: color.bg }]}>
          <Text style={[styles.statusPillText, { color: color.fg }]}>
            {statusLabel(booking.status)}
          </Text>
        </View>
        {isVideo && booking.canJoin ? (
          <TouchableOpacity
            style={styles.joinPill}
            onPress={function () { onPress({ joinNow: true }); }}
          >
            <Text style={styles.joinPillText}>Join</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function BookingsScreen({ navigation }) {
  var [tab, setTab] = useState('upcoming');
  var [items, setItems] = useState([]);
  var [loading, setLoading] = useState(true);
  var [refreshing, setRefreshing] = useState(false);
  var [error, setError] = useState(null);

  // P3.5 — outgoing proposals (pending + declined-within-24h, surfaced
  // above the bookings list on the Upcoming tab only).
  var [proposals, setProposals] = useState([]);
  var [proposalsError, setProposalsError] = useState(null);
  var [detailSheet, setDetailSheet] = useState({ open: false, proposal: null });

  var load = useCallback(async function () {
    setError(null);
    var statuses = tab === 'upcoming' ? UPCOMING_STATUSES : PAST_STATUSES;
    // Backend accepts a single `status` query param — we filter client-side
    // until the list endpoint grows multi-status support.
    var resp = await listBookings({ limit: 50 });
    if (resp.success) {
      var filtered = (resp.data || []).filter(function (b) {
        return statuses.indexOf(b.status) >= 0;
      });
      filtered.sort(function (a, b) {
        var ta = new Date(a.slotStart || 0).getTime();
        var tb = new Date(b.slotStart || 0).getTime();
        return tab === 'upcoming' ? ta - tb : tb - ta;
      });
      setItems(filtered);
    } else {
      setError(resp.error || 'Failed to load bookings');
    }
    setLoading(false);
    setRefreshing(false);
  }, [tab]);

  useEffect(function () {
    setLoading(true);
    load();
    var unsub = navigation.addListener('focus', load);
    return unsub;
  }, [load, navigation]);

  // P3.5 — load outgoing proposals. Backend returns the role-aware union
  // (own pending + own declined-within-24h) without a status filter.
  // Sort: pending first by slotStart asc (soonest upcoming first), then
  // declined by respondedAt desc (freshest decline first).
  var loadProposals = useCallback(function () {
    setProposalsError(null);
    listProposals().then(function (resp) {
      if (resp.success) {
        var list = (resp.data || []).slice().sort(function (a, b) {
          var ap = a.status === 'pending' ? 0 : 1;
          var bp = b.status === 'pending' ? 0 : 1;
          if (ap !== bp) return ap - bp;
          if (ap === 0) {
            return new Date(a.slotStart || 0).getTime() - new Date(b.slotStart || 0).getTime();
          }
          return new Date(b.respondedAt || 0).getTime() - new Date(a.respondedAt || 0).getTime();
        });
        setProposals(list);
      } else {
        setProposalsError(resp.error || 'Failed to load proposals');
      }
    });
  }, []);

  // Refresh on every screen focus — so a just-sent proposal from
  // ProposeSessionScreen (P3.4) appears immediately on return, and a
  // patient response that landed via push while we were elsewhere is
  // reflected here too.
  useFocusEffect(useCallback(function () {
    loadProposals();
  }, [loadProposals]));

  function onTabPress(tabId) {
    if (tabId === 'home') navigation.navigate(ROUTES.DASHBOARD);
    else if (tabId === 'clients') navigation.navigate(ROUTES.CLIENTS);
    else if (tabId === 'messages') navigation.navigate(ROUTES.MESSAGES);
    else if (tabId === 'exercise') navigation.navigate(ROUTES.EXERCISES);
    // 'calendar' = stay here
  }

  function openBooking(booking, opts) {
    var joinNow = opts && opts.joinNow;
    if (joinNow && booking.meetingType === 'video' && booking.videoCallId) {
      navigation.navigate(ROUTES.PRE_CALL_LOBBY, {
        callId: booking.videoCallId,
        bookingId: booking._id,
      });
      return;
    }
    navigation.navigate(ROUTES.BOOKING_DETAIL, { bookingId: booking._id });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bookings</Text>
        <View style={{ flex: 1 }} />
        {/* P3.4 — propose-session entry point. Mirrors the new-chat
            button pattern from MessagesScreen.jsx:122-124. */}
        <TouchableOpacity
          style={styles.proposeBtn}
          onPress={function () { navigation.navigate(ROUTES.PROPOSE_SESSION); }}
          activeOpacity={0.7}
          accessibilityLabel="Propose a session"
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsRow}>
        {['upcoming', 'past'].map(function (t) {
          var active = tab === t;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={function () { setTab(t); setLoading(true); }}
            >
              <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                {t === 'upcoming' ? 'Upcoming' : 'Past'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* P3.5 — Pending + declined proposals section. Renders only on the
          Upcoming tab AND only when there's at least one proposal to show
          (hidden entirely otherwise — keeps the bookings list visually
          unburdened when there's nothing to act on). */}
      {tab === 'upcoming' && proposals.length > 0 ? (
        <View style={styles.proposalsSection}>
          <View style={styles.proposalsHeaderRow}>
            <Text style={styles.proposalsHeader}>Proposals</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{proposals.length}</Text>
            </View>
          </View>
          <View style={{ gap: 10 }}>
            {proposals.map(function (p) {
              return (
                <ProposalRow
                  key={String(p._id)}
                  proposal={p}
                  onPress={function (proposal) {
                    setDetailSheet({ open: true, proposal: proposal });
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {tab === 'upcoming' && proposalsError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={15} color="#C53030" />
          <Text style={styles.errorBannerText}>{proposalsError}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            {tab === 'upcoming' ? 'No upcoming sessions.' : 'No past sessions.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={function () { setRefreshing(true); load(); }}
              tintColor={colors.primary}
            />
          }
        >
          {items.map(function (b) {
            return (
              <BookingRow
                key={String(b._id)}
                booking={b}
                onPress={function (opts) { openBooking(b, opts); }}
              />
            );
          })}
        </ScrollView>
      )}

      <BottomTabBar activeTab="calendar" onTabPress={onTabPress} />

      <ProposalDetailSheet
        isOpen={detailSheet.open}
        proposal={detailSheet.proposal}
        onClose={function () { setDetailSheet({ open: false, proposal: null }); }}
        onCancelled={function () {
          // Optimistic local removal — avoid a refetch round-trip. The
          // next focus event (e.g. tab switch) will reconcile via
          // loadProposals().
          var cancelledId = detailSheet.proposal && String(detailSheet.proposal._id);
          setProposals(function (curr) {
            return curr.filter(function (p) { return String(p._id) !== cancelledId; });
          });
          setDetailSheet({ open: false, proposal: null });
        }}
      />
    </SafeAreaView>
  );
}

var styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8,
  },
  headerTitle: { fontSize: fonts.xxl, color: colors.textDark, fontWeight: fonts.bold },
  // P3.4 — header right "+" button (propose session)
  proposeBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.cardBorder,
  },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    marginBottom: 10,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1, borderColor: colors.cardBorder,
    backgroundColor: colors.white,
  },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabBtnText: { fontSize: fonts.sm, color: colors.textDark, fontWeight: fonts.medium },
  tabBtnTextActive: { color: colors.white, fontWeight: fonts.semibold },

  list: { paddingHorizontal: 18, paddingBottom: 16, gap: 10 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12, paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: fonts.sm, color: colors.primary, fontWeight: fonts.bold },
  rowMid: { flex: 1, gap: 2 },
  name: { fontSize: fonts.md, color: colors.textDark, fontWeight: fonts.semibold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: { fontSize: fonts.xs, color: colors.textMedium },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusPillText: { fontSize: fonts.xs, fontWeight: fonts.semibold, textTransform: 'capitalize' },
  joinPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: colors.primary,
  },
  joinPillText: { color: colors.white, fontSize: fonts.xs, fontWeight: fonts.bold },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: fonts.sm, color: colors.textMedium },
  errorText: { fontSize: fonts.sm, color: colors.error },

  // P3.5 — proposals section above the bookings list (Upcoming tab only)
  proposalsSection: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  proposalsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4, marginBottom: 10,
  },
  proposalsHeader: {
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
    color: colors.textDark,
  },
  countPill: {
    minWidth: 22, height: 22, borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  countPillText: {
    fontSize: fonts.xs,
    fontWeight: fonts.bold,
    color: colors.white,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    marginHorizontal: 18,
    marginBottom: 10,
  },
  errorBannerText: {
    flex: 1, fontSize: fonts.sm, color: '#C53030', lineHeight: 18,
  },
});
