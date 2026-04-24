import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../context/OnboardingContext';
import OnboardingShell from '../../components/auth/OnboardingShell';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';

var DURATION_OPTIONS = [
  'Less than 1 week',
  '1–4 weeks',
  '1–3 months',
  'More than 3 months',
];

var DURATION_ICONS = [
  'time-outline',
  'calendar-outline',
  'calendar-clear-outline',
  'today-outline',
];

/**
 * Step 4 — Select how long the patient has had pain (single select).
 *
 * @param {{ navigation: object }} props
 */
export default function PainDurationScreen({ navigation }) {
  var { painDuration: contextDuration, updateOnboardingData } = useOnboarding();

  var [selectedDuration, setSelectedDuration] = useState(contextDuration || null);

  function handleContinue() {
    updateOnboardingData({ painDuration: selectedDuration });
    navigation.navigate(PATIENT_ROUTES.TREATMENT_HISTORY);
  }

  function handleBack() {
    navigation.goBack();
  }

  return (
    <OnboardingShell
      step={4}
      heading="How long have you had this pain?"
      subtitle="Select the closest option"
      onBack={handleBack}
      onContinue={handleContinue}
      isContinueDisabled={!selectedDuration}
    >
      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
        {DURATION_OPTIONS.map(function (option, index) {
          var isSelected = selectedDuration === option;
          return (
            <TouchableOpacity
              key={option}
              onPress={function () { setSelectedDuration(option); }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
                padding: 20,
                borderRadius: 16,
                borderWidth: isSelected ? 2 : 1,
                borderColor: isSelected ? colors.primary : colors.cardBorder,
                backgroundColor: isSelected ? '#E0F7F2' : colors.white,
              }}
            >
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 99,
                backgroundColor: isSelected ? colors.primary : colors.inputBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Ionicons
                  name={DURATION_ICONS[index]}
                  size={22}
                  color={isSelected ? colors.white : colors.textLight}
                />
              </View>
              <Text style={{
                flex: 1,
                fontSize: fonts.md,
                fontFamily: isSelected ? fonts.heading.semibold : fonts.body.medium,
                color: isSelected ? colors.primary : colors.textDark,
              }}>
                {option}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingShell>
  );
}
