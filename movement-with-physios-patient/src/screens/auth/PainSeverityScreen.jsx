import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import OnboardingShell from '../../components/auth/OnboardingShell';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';

var SEVERITY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

var PAIN_LABELS = [
  'No pain', 'Very mild', 'Mild', 'Noticeable', 'Moderate',
  'Uncomfortable', 'Severe', 'Very severe', 'Intense', 'Unbearable',
];

/**
 * Step 3 — Rate pain severity on a scale of 1–10 (single select).
 *
 * @param {{ navigation: object }} props
 */
export default function PainSeverityScreen({ navigation }) {
  var { painSeverity: contextSeverity, updateOnboardingData } = useOnboarding();

  var [selectedSeverity, setSelectedSeverity] = useState(
    contextSeverity !== null && contextSeverity !== undefined ? contextSeverity : null
  );

  function handleContinue() {
    updateOnboardingData({ painSeverity: selectedSeverity });
    navigation.navigate(PATIENT_ROUTES.PAIN_DURATION);
  }

  function handleBack() {
    navigation.goBack();
  }

  return (
    <OnboardingShell
      step={3}
      heading="How severe is your pain?"
      subtitle="On a scale of 1 to 10"
      onBack={handleBack}
      onContinue={handleContinue}
      isContinueDisabled={selectedSeverity === null}
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>

        {/* Large display when selected */}
        {selectedSeverity !== null && (
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text style={{
              fontSize: 72,
              fontFamily: fonts.heading.semibold,
              color: colors.primary,
              lineHeight: 78,
            }}>
              {selectedSeverity}
            </Text>
            <Text style={{
              fontSize: fonts.sm,
              color: colors.textMedium,
              marginTop: 4,
              fontFamily: fonts.body.medium,
            }}>
              {PAIN_LABELS[selectedSeverity - 1]}
            </Text>
          </View>
        )}

        {selectedSeverity === null && (
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text style={{ fontSize: fonts.md, color: colors.textLight, fontFamily: fonts.body.medium }}>
              Tap a number to rate your pain
            </Text>
          </View>
        )}

        {/* 5 × 2 perfect circle grid */}
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 14,
        }}>
          {SEVERITY_LEVELS.map(function (level) {
            var isSelected = selectedSeverity === level;
            var CIRCLE = 58;
            return (
              <Pressable
                key={level}
                onPress={function () { setSelectedSeverity(level); }}
                style={{
                  width: CIRCLE,
                  height: CIRCLE,
                  borderRadius: CIRCLE / 2,
                  borderWidth: isSelected ? 0 : 1.5,
                  borderColor: colors.cardBorder,
                  backgroundColor: isSelected ? colors.primary : colors.white,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isSelected ? 0 : 0.06,
                  shadowRadius: 3,
                  elevation: isSelected ? 0 : 2,
                }}
                accessibilityRole="button"
                accessibilityLabel={'Pain level ' + level}
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={{
                  fontSize: level === 10 ? fonts.sm : fonts.md,
                  fontFamily: fonts.heading.semibold,
                  color: isSelected ? colors.white : colors.textDark,
                }}>
                  {level}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Legend */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 20,
          paddingHorizontal: 4,
        }}>
          <Text style={{ fontSize: fonts.xs, color: colors.textLight }}>1 = No pain</Text>
          <Text style={{ fontSize: fonts.xs, color: colors.textLight }}>10 = Worst pain</Text>
        </View>

      </View>
    </OnboardingShell>
  );
}
