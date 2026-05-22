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

import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { ROUTES } from '../../constants/routes';
import BottomTabBar from '../../components/BottomTabBar';
import BodyPartBadge from '../../components/video/BodyPartBadge';
import { listBookings } from '../../services/bookingService';

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
    </SafeAreaView>
  );
}

var styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8,
  },
  headerTitle: { fontSize: fonts.xxl, color: colors.textDark, fontWeight: fonts.bold },

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
});
