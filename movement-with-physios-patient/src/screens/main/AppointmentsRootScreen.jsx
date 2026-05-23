import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import TabScreenWrapper from '../../components/navigation/TabScreenWrapper';
import PrimaryButton from '../../components/ui/PrimaryButton';
import InlineBanner from '../../components/common/InlineBanner';
import PendingProposalRow from '../../components/proposals/PendingProposalRow';
import DeclineProposalSheet from '../../components/proposals/DeclineProposalSheet';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';
import { listBookings } from '../../services/bookingService';
import {
  listProposals,
  acceptProposal,
  declineProposal,
} from '../../services/proposalService';

/**
 * Mock-first per CLAUDE.md. Set USE_MOCK_PROPOSALS=false (or just delete
 * the MOCK_PROPOSALS branch) once dev-client + backend are wired and the
 * first real proposal lands. This array is shape-compatible with what
 * proposalService.listProposals() returns (data items).
 */
var USE_MOCK_PROPOSALS = false;
var MOCK_PROPOSALS = [
  {
    _id: 'mock-1',
    slotStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    meetingType: 'video',
    notes: 'Follow-up after last session — bring the resistance band.',
    therapistId: { _id: 'therapist-1', name: 'Anjali Sharma' },
  },
];

function friendlyAcceptError(rawError) {
  if (!rawError) return 'Could not accept. Please try again.';
  var s = String(rawError).toUpperCase();
  if (s.indexOf('PROPOSAL_NOT_FOUND') >= 0 || s.indexOf('PROPOSAL_EXPIRED') >= 0) {
    return 'This proposal is no longer available.';
  }
  if (s.indexOf('PROPOSAL_SLOT_NOW_TAKEN') >= 0 || s.indexOf('SLOT_CONFLICT') >= 0) {
    return 'You already have a session at this time.';
  }
  if (s.indexOf('PROPOSAL_ALREADY_RESPONDED') >= 0) {
    return 'This proposal has already been responded to.';
  }
  return 'Could not accept. Please try again.';
}

function formatBookingDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatBookingTime(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var h = d.getHours();
  var m = d.getMinutes();
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return h + ':' + (m < 10 ? '0' + m : m) + ' ' + ampm;
}

/**
 * AppointmentsRootScreen — full implementation (P4.4).
 * Sections: Pending Proposals (when ≥1) → Upcoming Sessions → Past Sessions.
 * Floating "Book a new session" CTA. Accept/Decline + cross-stack
 * notification tap consumption.
 */
export default function AppointmentsRootScreen() {
  var navigation = useNavigation();
  var route = useRoute();
  var insets = useSafeAreaInsets();

  var [proposals, setProposals] = useState([]);
  var [loadingProposals, setLoadingProposals] = useState(true);
  var [bookings, setBookings] = useState([]);
  var [loadingBookings, setLoadingBookings] = useState(true);
  var [acceptSubmitting, setAcceptSubmitting] = useState({}); // { [proposalId]: bool }
  var [exitingIds, setExitingIds] = useState({}); // { [proposalId]: Animated.Value }
  var [banner, setBanner] = useState({ visible: false, message: '', variant: 'success' });
  var [declineSheet, setDeclineSheet] = useState({
    open: false, proposalId: null, submitting: false, errorMessage: '',
  });

  // Track latest proposals for the post-load route.params consumer (avoids
  // stale-closure inside the effect that fires AFTER data lands).
  var proposalsRef = useRef([]);
  proposalsRef.current = proposals;

  var loadAll = useCallback(function () {
    setLoadingProposals(true);
    setLoadingBookings(true);

    if (USE_MOCK_PROPOSALS) {
      setProposals(MOCK_PROPOSALS);
      setLoadingProposals(false);
    } else {
      listProposals({ status: 'pending' }).then(function (resp) {
        if (resp.success) {
          setProposals(Array.isArray(resp.data) ? resp.data : []);
        } else {
          setProposals([]);
        }
        setLoadingProposals(false);
      });
    }

    listBookings({ limit: 50 }).then(function (resp) {
      if (resp.success) {
        setBookings(Array.isArray(resp.data) ? resp.data : []);
      } else {
        setBookings([]);
      }
      setLoadingBookings(false);
    });
  }, []);

  useFocusEffect(useCallback(function () {
    loadAll();
  }, [loadAll]));

  function showBanner(message, variant) {
    setBanner({ visible: true, message: message, variant: variant || 'success' });
  }
  function dismissBanner() {
    setBanner(function (b) { return { visible: false, message: b.message, variant: b.variant }; });
  }

  function startRowExit(proposalId, onComplete) {
    var v = new Animated.Value(1);
    setExitingIds(function (prev) {
      var next = Object.assign({}, prev);
      next[proposalId] = v;
      return next;
    });
    Animated.parallel([
      Animated.timing(v, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start(function () {
      // Remove the proposal from list AFTER animation finishes
      setProposals(function (prev) {
        return prev.filter(function (p) { return String(p._id) !== String(proposalId); });
      });
      setExitingIds(function (prev) {
        var next = Object.assign({}, prev);
        delete next[proposalId];
        return next;
      });
      if (onComplete) onComplete();
    });
  }

  var handleAccept = useCallback(function (proposalId) {
    if (acceptSubmitting[proposalId]) return;
    setAcceptSubmitting(function (prev) {
      var next = Object.assign({}, prev); next[proposalId] = true; return next;
    });
    acceptProposal(proposalId).then(function (resp) {
      setAcceptSubmitting(function (prev) {
        var next = Object.assign({}, prev); delete next[proposalId]; return next;
      });
      if (resp.success) {
        var booking = resp.data && resp.data.booking;
        var proposal = resp.data && resp.data.proposal;
        var therapistName = 'your therapist';
        var foundProposal = proposalsRef.current.find(function (p) {
          return String(p._id) === String(proposalId);
        });
        if (foundProposal && foundProposal.therapistId && foundProposal.therapistId.name) {
          therapistName = 'Dr. ' + foundProposal.therapistId.name;
        }
        var slotIso = (booking && booking.slotStart) || (proposal && proposal.slotStart);
        startRowExit(proposalId, function () {
          if (booking) {
            setBookings(function (prev) { return [booking].concat(prev); });
          }
          var bannerMsg = 'Session confirmed with ' + therapistName +
            (slotIso ? ' on ' + formatBookingDate(slotIso) + ' at ' + formatBookingTime(slotIso) : '');
          showBanner(bannerMsg, 'success');
        });
      } else {
        showBanner(friendlyAcceptError(resp.error), 'error');
      }
    });
  }, [acceptSubmitting]);

  function handleDeclineOpen(proposalId) {
    setDeclineSheet({ open: true, proposalId: proposalId, submitting: false, errorMessage: '' });
  }
  function handleDeclineCancel() {
    setDeclineSheet({ open: false, proposalId: null, submitting: false, errorMessage: '' });
  }
  function handleDeclineSubmit(reason) {
    var pid = declineSheet.proposalId;
    if (!pid) return;
    setDeclineSheet(function (s) { return Object.assign({}, s, { submitting: true, errorMessage: '' }); });
    declineProposal(pid, reason).then(function (resp) {
      if (resp.success) {
        // Close sheet, then animate row out. No banner — quiet action.
        setDeclineSheet({ open: false, proposalId: null, submitting: false, errorMessage: '' });
        startRowExit(pid, null);
      } else {
        setDeclineSheet(function (s) {
          return Object.assign({}, s, {
            submitting: false,
            errorMessage: resp.error || 'Could not decline. Please try again.',
          });
        });
      }
    });
  }

  // Consume route.params from the notification listener (App.jsx → P4.2).
  // Fires when params land OR when proposal data finishes loading (whichever
  // is later). Clears params after consuming so re-focusing the tab doesn't
  // re-trigger.
  var params = (route && route.params) || {};
  var paramAccept = params.acceptProposalId;
  var paramDecline = params.declineProposalId;
  var paramFocus = params.focusProposalId;
  useEffect(function () {
    if (loadingProposals) return; // wait for data

    if (paramAccept) {
      handleAccept(paramAccept);
      navigation.setParams({ acceptProposalId: undefined });
    }
    if (paramDecline) {
      handleDeclineOpen(paramDecline);
      navigation.setParams({ declineProposalId: undefined });
    }
    if (paramFocus) {
      // Scroll-to + visual highlight will land in a polish pass; for now,
      // just clear the param. The proposal is still visible if it's in the
      // pending list.
      navigation.setParams({ focusProposalId: undefined });
    }
  }, [loadingProposals, paramAccept, paramDecline, paramFocus, handleAccept, navigation]);

  function handleBookNewSession() {
    navigation.navigate(PATIENT_ROUTES.BOOK_THERAPIST);
  }

  // ── Derived slices for the booking sections ─────────────────────────
  var now = Date.now();
  var upcoming = bookings
    .filter(function (b) {
      if (!b) return false;
      var future = b.slotStart && new Date(b.slotStart).getTime() >= now;
      return b.status === 'confirmed' && future;
    })
    .sort(function (a, b) {
      return new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime();
    });
  var past = bookings
    .filter(function (b) {
      if (!b) return false;
      var ts = b.slotStart ? new Date(b.slotStart).getTime() : 0;
      return b.status === 'completed' || (ts > 0 && ts < now && b.status !== 'cancelled');
    })
    .sort(function (a, b) {
      return new Date(b.slotStart).getTime() - new Date(a.slotStart).getTime();
    });

  return (
    <TabScreenWrapper tabIndex={1}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <InlineBanner
          visible={banner.visible}
          message={banner.message}
          variant={banner.variant}
          autoHideMs={3000}
          onDismiss={dismissBanner}
        />

        <View style={styles.header}>
          <Text style={styles.title}>My Appointments</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: 60 + insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Pending Proposals — hidden when empty */}
          {proposals.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Proposals</Text>
              {proposals.map(function (p) {
                var pid = String(p._id);
                var exiting = exitingIds[pid];
                var animatedStyle = exiting ? {
                  opacity: exiting,
                  transform: [{
                    translateY: exiting.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  }],
                } : null;
                return (
                  <PendingProposalRow
                    key={pid}
                    proposal={p}
                    onAccept={function () { handleAccept(pid); }}
                    onDecline={function () { handleDeclineOpen(pid); }}
                    accepting={!!acceptSubmitting[pid]}
                    animatedStyle={animatedStyle}
                  />
                );
              })}
            </View>
          ) : null}

          {/* Upcoming Sessions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
            {loadingBookings ? (
              <Text style={styles.empty}>Loading...</Text>
            ) : upcoming.length === 0 ? (
              <Text style={styles.empty}>No upcoming sessions yet</Text>
            ) : (
              upcoming.map(function (b) {
                return <BookingCard key={String(b._id)} booking={b} />;
              })
            )}
          </View>

          {/* Past Sessions (collapsed-style: show count + first 2) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past Sessions</Text>
            {loadingBookings ? null : past.length === 0 ? (
              <Text style={styles.empty}>No past sessions yet</Text>
            ) : (
              past.slice(0, 3).map(function (b) {
                return <BookingCard key={String(b._id)} booking={b} muted />;
              })
            )}
          </View>
        </ScrollView>

        <View style={[styles.fab, { bottom: 60 + insets.bottom + 16 }]}>
          <PrimaryButton label="Book a new session" onPress={handleBookNewSession} />
        </View>

        <DeclineProposalSheet
          isOpen={declineSheet.open}
          onClose={handleDeclineCancel}
          onSubmit={handleDeclineSubmit}
          submitting={declineSheet.submitting}
          errorMessage={declineSheet.errorMessage}
        />
      </SafeAreaView>
    </TabScreenWrapper>
  );
}

function BookingCard(props) {
  var b = props.booking || {};
  var muted = !!props.muted;
  var isVideo = b.meetingType === 'video';
  var therapistName = 'Therapist';
  if (b.therapistId && typeof b.therapistId === 'object' && b.therapistId.name) {
    therapistName = b.therapistId.name;
  }
  return (
    <View style={[bookingStyles.card, muted && bookingStyles.cardMuted]}>
      <View style={bookingStyles.row}>
        <Ionicons
          name={isVideo ? 'videocam-outline' : 'person-outline'}
          size={16}
          color={muted ? colors.textLight : colors.primary}
        />
        <Text style={[bookingStyles.name, muted && bookingStyles.muted]}>
          Dr. {therapistName}
        </Text>
      </View>
      <Text style={[bookingStyles.slot, muted && bookingStyles.muted]}>
        {formatBookingDate(b.slotStart)} · {formatBookingTime(b.slotStart)}
      </Text>
    </View>
  );
}

var bookingStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardMuted: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.md,
    color: colors.textDark,
  },
  slot: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.sm,
    color: colors.textMedium,
  },
  muted: { color: colors.textLight },
});

var styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.xl,
    color: colors.textDark,
    lineHeight: fonts.xl * 1.35,
  },
  scroll: {
    paddingHorizontal: 24,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.lg,
    color: colors.textDark,
    marginBottom: 12,
    lineHeight: fonts.lg * 1.35,
  },
  empty: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.sm,
    color: colors.textLight,
    paddingVertical: 16,
  },
  fab: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
});
