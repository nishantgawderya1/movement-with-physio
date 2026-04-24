import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';
import TherapistCard from '../../components/booking/TherapistCard';
import TabScreenWrapper from '../../components/navigation/TabScreenWrapper';

var MOCK_THERAPISTS = [
  {
    id: 1,
    name: 'Dr. Anjali Sharma',
    spec: 'Sports & Rehab',
    exp: '12 years',
    rating: 4.9,
    reviews: 234,
    langs: ['English', 'Hindi'],
    slot: 'Today, 3:00 PM',
  },
  {
    id: 2,
    name: 'Dr. Rajesh Kumar',
    spec: 'Orthopedic Therapy',
    exp: '15 years',
    rating: 4.8,
    reviews: 156,
    langs: ['English', 'Hindi', 'Tamil'],
    slot: 'Tomorrow, 10:00 AM',
  },
  {
    id: 3,
    name: 'Dr. Priya Mehta',
    spec: 'Posture Correction',
    exp: '8 years',
    rating: 4.8,
    reviews: 90,
    langs: ['English', 'Hindi', 'Marathi'],
    slot: 'Today, 5:00 PM',
  },
];

/**
 * Book Therapist tab screen.
 * Shows a featured banner and a list of available therapists.
 * @param {{ navigation: object }} props
 */
export default function BookTherapistScreen({ navigation }) {
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

  return (
    <TabScreenWrapper tabIndex={1}>
      <SafeAreaView style={styles.safe}>
        {/* Header — title only, no back button on a tab root screen */}
        <Text style={styles.headerTitle}>Book Therapist</Text>

        <FlatList
          data={MOCK_THERAPISTS}
          keyExtractor={function (item) { return String(item.id); }}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
});
