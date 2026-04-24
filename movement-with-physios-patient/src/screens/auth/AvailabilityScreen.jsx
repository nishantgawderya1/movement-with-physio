import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../context/OnboardingContext';
import OnboardingShell from '../../components/auth/OnboardingShell';
import { submitOnboarding } from '../../services/auth/mockOnboardingService';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';
import { StyleSheet } from 'react-native';

var SLOT_OPTIONS = [
  'Weekday Mornings',
  'Weekday Afternoons',
  'Weekday Evenings',
  'Weekend Mornings',
  'Weekend Afternoons',
  'Weekend Evenings',
];

var SLOT_ICONS = [
  'sunny-outline',
  'partly-sunny-outline',
  'moon-outline',
  'sunny-outline',
  'partly-sunny-outline',
  'moon-outline',
];

/**
 * Step 7 — Select availability slots (multi-select, 2-column icon cards).
 * On Continue: submits full onboarding payload to mock service.
 * Success → replace to OnboardingComplete.
 * Failure → show inline error.
 *
 * @param {{ navigation: object }} props
 */
export default function AvailabilityScreen({ navigation }) {
  var onboardingData = useOnboarding();
  var { availability: contextSlots, updateOnboardingData } = onboardingData;

  var [selectedSlots, setSelectedSlots] = useState(
    contextSlots && contextSlots.length > 0 ? contextSlots : []
  );
  var [isSubmitting, setIsSubmitting] = useState(false);
  var [submitError, setSubmitError] = useState(null);

  function toggleSlot(slot) {
    setSelectedSlots(function (prev) {
      if (prev.includes(slot)) {
        return prev.filter(function (s) { return s !== slot; });
      }
      return prev.concat(slot);
    });
    if (submitError) {
      setSubmitError(null);
    }
  }

  async function handleContinue() {
    if (isSubmitting) { return; }

    updateOnboardingData({ availability: selectedSlots });

    var payload = Object.assign({}, onboardingData, { availability: selectedSlots });
    delete payload.updateOnboardingData;

    setIsSubmitting(true);
    setSubmitError(null);

    var result = await submitOnboarding(payload);

    setIsSubmitting(false);

    if (result.success) {
      navigation.replace(PATIENT_ROUTES.ONBOARDING_COMPLETE);
    } else {
      setSubmitError(result.error || 'Something went wrong. Please try again.');
    }
  }

  function handleBack() {
    navigation.goBack();
  }

  return (
    <OnboardingShell
      step={7}
      heading="When are you available?"
      subtitle="Select your preferred session times"
      onBack={handleBack}
      onContinue={handleContinue}
      isContinueDisabled={selectedSlots.length === 0 || isSubmitting}
      continueLabel={isSubmitting ? 'Submitting…' : 'Finish'}
    >
      <View style={{
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        alignContent: 'center',
      }}>
        {SLOT_OPTIONS.map(function (slot, index) {
          var isSelected = selectedSlots.includes(slot);
          return (
            <TouchableOpacity
              key={slot}
              onPress={function () { toggleSlot(slot); }}
              style={{
                width: '47%',
                padding: 18,
                borderRadius: 16,
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? colors.primary : colors.cardBorder,
                backgroundColor: isSelected ? '#E0F7F2' : colors.white,
                alignItems: 'center',
                gap: 10,
              }}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 99,
                backgroundColor: isSelected ? colors.primary : colors.inputBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons
                  name={SLOT_ICONS[index]}
                  size={24}
                  color={isSelected ? colors.white : colors.textLight}
                />
              </View>
              <Text style={{
                fontSize: fonts.sm,
                fontFamily: isSelected ? fonts.heading.semibold : fonts.body.medium,
                color: isSelected ? colors.primary : colors.textDark,
                textAlign: 'center',
                lineHeight: 18,
              }}>
                {slot}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isSubmitting && (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.spinner}
        />
      )}

      {submitError !== null && (
        <Text style={styles.errorText}>{submitError}</Text>
      )}
    </OnboardingShell>
  );
}

var styles = StyleSheet.create({
  spinner: {
    marginTop: 12,
  },
  errorText: {
    fontSize: fonts.sm,
    color: colors.error,
    marginTop: 12,
    textAlign: 'center',
  },
});
