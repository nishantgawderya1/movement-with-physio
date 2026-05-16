import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';
import TherapistCard from '../../components/booking/TherapistCard';
import TabScreenWrapper from '../../components/navigation/TabScreenWrapper';
import { apiClient } from '../../lib/apiClient';

/**
 * Map a backend User (therapist) document into the shape TherapistCard
 * expects. Fields the backend doesn't yet expose (years of experience,
 * review counts, next slot, languages) get safe defaults so the card
 * always renders without crashing.
 *
 * @param {object} u - backend therapist user doc
 * @returns {object}
 */
function normalizeTherapist(u) {
  return {
    id: String(u._id),
    name: u.name || u.email || 'Therapist',
    spec: u.specialty || 'Physiotherapist',
    exp: '',
    rating: typeof u.rating === 'number' ? u.rating : 0,
    reviews: 0,
    langs: ['English'],
    slot: 'Available',
  };
}

/**
 * Book Therapist tab screen.
 * Shows a featured banner and a list of available therapists.
 * @param {{ navigation: object }} props
 */
export default function BookTherapistScreen({ navigation }) {
  var [therapists, setTherapists] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);

  var loadTherapists = useCallback(function () {
    setLoading(true);
    // includeUnverified=true so therapists who haven't been admin-verified
    // yet still appear during dev — the gate stays in place for production
    // by passing nothing here later.
    apiClient.get('/therapists', { limit: 50, includeUnverified: true }).then(function (res) {
      if (res.success) {
        var raw = Array.isArray(res.data) ? res.data : [];
        setTherapists(raw.map(normalizeTherapist));
        setError(null);
      } else {
        setError(res.error || 'Could not load therapists');
      }
      setLoading(false);
    });
  }, []);

  useEffect(function () {
    loadTherapists();
  }, [loadTherapists]);

  function handleTherapistPress(therapist) {
    navigation.navigate(PATIENT_ROUTES.SLOT_SELECTION, { therapist: therapist });
  }

  function renderItem({ item }) {
    return (
      <TherapistCard
        therapist={item}
        onPress={function () { handleTherapistPress(item); }}
      />
    );
  }

  function renderEmpty() {
    if (loading) {
      return (
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>
          {error ? 'Could not load therapists' : 'No therapists available yet'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {error || 'Check back soon — new therapists join regularly.'}
        </Text>
      </View>
    );
  }

  return (
    <TabScreenWrapper tabIndex={1}>
      <SafeAreaView style={styles.safe}>
        {/* Header — title only, no back button on a tab root screen */}
        <Text style={styles.headerTitle}>Book Therapist</Text>

        <FlatList
          data={therapists}
          keyExtractor={function (item) { return String(item.id); }}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          ListHeaderComponent={
            /* Featured Banner */
            <View style={styles.featuredBanner}>
              <View style={styles.featuredAccent} />
              <View style={styles.featuredBody}>
                <Text style={styles.featuredTitle}>30-Minute Video Consultation</Text>
                <Text style={styles.featuredSub}>
                  Get personalized guidance from licensed physiotherapists via secure video call
                </Text>
              </View>
              <Ionicons name="videocam" size={28} color={colors.primary} />
            </View>
          }
          ItemSeparatorComponent={null}
        />
      </SafeAreaView>
    </TabScreenWrapper>
  );
}

var styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  headerTitle: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.lg,
    lineHeight: fonts.lg * 1.35,
    color: colors.textDark,
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Featured banner
  featuredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    overflow: 'hidden',
  },
  featuredAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  featuredBody: {
    flex: 1,
    paddingLeft: 8,
  },
  featuredTitle: {
    fontSize: fonts.md,
    fontWeight: fonts.bold,
    color: colors.primaryDark,
    marginBottom: 4,
  },
  featuredSub: {
    fontSize: fonts.sm,
    color: colors.textMedium,
    lineHeight: fonts.sm * 1.5,
  },

  // Empty / loading state
  emptyWrap: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.heading.regular,
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
