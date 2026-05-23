import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import TabScreenWrapper from '../../components/navigation/TabScreenWrapper';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';

/**
 * AppointmentsRootScreen — root of the Appointments tab (formerly Book).
 *
 * SCAFFOLD ONLY in this commit (P4.3). The full data fetch + Accept/
 * Decline UI lands in P4.4. Sections are empty placeholders so the
 * navigation restructure can land first and the P4.2 push response
 * listener has a valid target screen.
 *
 * Layout (final design per Agent C Section 4):
 *   Header "My Appointments"
 *   Pending Proposals section — hidden when empty
 *   Upcoming Sessions section
 *   Past Sessions section (collapsed in final design)
 *   Floating "Book a new session" CTA → BookTherapistScreen
 *
 * Route params consumed from P4.2's notification response listener:
 *   { acceptProposalId? } — P4.4 will fire proposalService.acceptProposal
 *   { declineProposalId? } — P4.4 will open DeclineProposalSheet
 *   { focusProposalId? } — P4.4 will scroll to that row
 * For now, just logged. P4.4 wires the real handlers.
 *
 * Tab root: wrapped in TabScreenWrapper tabIndex={1} (Book/Appointments
 * tab position is unchanged at index 1; only the label flipped).
 *
 * @returns {React.Element}
 */
export default function AppointmentsRootScreen() {
  var navigation = useNavigation();
  var route = useRoute();
  var insets = useSafeAreaInsets();
  var params = (route && route.params) || {};

  useEffect(function () {
    // P4.4 will replace these logs with the real consumers — fire
    // acceptProposal, open DeclineProposalSheet, or scroll-to-row.
    if (params.acceptProposalId) {
      // eslint-disable-next-line no-console
      console.log('[appointments] pending acceptProposalId:', params.acceptProposalId);
    }
    if (params.declineProposalId) {
      // eslint-disable-next-line no-console
      console.log('[appointments] pending declineProposalId:', params.declineProposalId);
    }
    if (params.focusProposalId) {
      // eslint-disable-next-line no-console
      console.log('[appointments] pending focusProposalId:', params.focusProposalId);
    }
  }, [params.acceptProposalId, params.declineProposalId, params.focusProposalId]);

  function handleBookNewSession() {
    navigation.navigate(PATIENT_ROUTES.BOOK_THERAPIST);
  }

  return (
    <TabScreenWrapper tabIndex={1}>
      <SafeAreaView style={styles.safe} edges={['top']}>
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
          {/* Pending Proposals — P4.4 renders rows from listProposals.
              Section is hidden when zero proposals (no clutter). */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
            <Text style={styles.empty}>No upcoming sessions yet</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past Sessions</Text>
            <Text style={styles.empty}>No past sessions yet</Text>
          </View>
        </ScrollView>

        <View style={[styles.fab, { bottom: 60 + insets.bottom + 16 }]}>
          <PrimaryButton label="Book a new session" onPress={handleBookNewSession} />
        </View>
      </SafeAreaView>
    </TabScreenWrapper>
  );
}

var styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
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
    paddingVertical: 24,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
});
