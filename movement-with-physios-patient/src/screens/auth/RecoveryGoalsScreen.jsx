import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../context/OnboardingContext';
import OnboardingShell from '../../components/auth/OnboardingShell';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';

var GOAL_OPTIONS = [
  'Reduce Pain',
  'Improve Mobility',
  'Post-Surgery Recovery',
  'Sports Performance',
  'Posture Correction',
  'General Wellness',
];

var GOAL_ICONS = [
  'medkit-outline',
  'walk-outline',
  'bandage-outline',
  'trophy-outline',
  'body-outline',
  'heart-outline',
];

/**
 * Step 6 — Select recovery goals (multi-select, 2-column icon cards).
 *
 * @param {{ navigation: object }} props
 */
export default function RecoveryGoalsScreen({ navigation }) {
  var { recoveryGoals: contextGoals, updateOnboardingData } = useOnboarding();

  var [selectedGoals, setSelectedGoals] = useState(
    contextGoals && contextGoals.length > 0 ? contextGoals : []
  );

  function toggleGoal(goal) {
    setSelectedGoals(function (prev) {
      if (prev.includes(goal)) {
        return prev.filter(function (g) { return g !== goal; });
      }
      return prev.concat(goal);
    });
  }

  function handleContinue() {
    updateOnboardingData({ recoveryGoals: selectedGoals });
    navigation.navigate(PATIENT_ROUTES.AVAILABILITY);
  }

  function handleBack() {
    navigation.goBack();
  }

  return (
    <OnboardingShell
      step={6}
      heading="What's your goal?"
      subtitle="Select all that apply"
      onBack={handleBack}
      onContinue={handleContinue}
      isContinueDisabled={selectedGoals.length === 0}
    >
      <View style={{
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        alignContent: 'center',
      }}>
        {GOAL_OPTIONS.map(function (goal, index) {
          var isSelected = selectedGoals.includes(goal);
          return (
            <TouchableOpacity
              key={goal}
              onPress={function () { toggleGoal(goal); }}
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
                  name={GOAL_ICONS[index]}
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
                {goal}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </OnboardingShell>
  );
}
