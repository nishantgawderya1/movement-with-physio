import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../context/OnboardingContext';
import OnboardingShell from '../../components/auth/OnboardingShell';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';

/**
 * Step 5 — Has the patient received previous treatment? (single select yes/no)
 * If yes, show optional details text input.
 *
 * @param {{ navigation: object }} props
 */
export default function TreatmentHistoryScreen({ navigation }) {
  var {
    hadPreviousTreatment: contextHad,
    previousTreatmentDetails: contextDetails,
    updateOnboardingData,
  } = useOnboarding();

  var [hadTreatment, setHadTreatment] = useState(
    contextHad !== null && contextHad !== undefined ? contextHad : null
  );
  var [details, setDetails] = useState(contextDetails || '');

  function handleContinue() {
    updateOnboardingData({
      hadPreviousTreatment: hadTreatment,
      previousTreatmentDetails: hadTreatment ? details : '',
    });
    navigation.navigate(PATIENT_ROUTES.RECOVERY_GOALS);
  }

  function handleBack() {
    navigation.goBack();
  }

  var CARD_OPTIONS = [
    { value: true,  label: 'Yes', sub: 'I have received treatment before',   icon: 'checkmark-circle-outline' },
    { value: false, label: 'No',  sub: 'This is my first time seeking help', icon: 'close-circle-outline' },
  ];

  return (
    <OnboardingShell
      step={5}
      heading="Have you been treated before?"
      subtitle="Previous physiotherapy or medical treatment"
      onBack={handleBack}
      onContinue={handleContinue}
      isContinueDisabled={hadTreatment === null}
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ gap: 14, marginBottom: 20 }}>
          {CARD_OPTIONS.map(function (option) {
            var isSelected = hadTreatment === option.value;
            return (
              <TouchableOpacity
                key={String(option.value)}
                onPress={function () {
                  setHadTreatment(option.value);
                  if (!option.value) { setDetails(''); }
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                  padding: 22,
                  borderRadius: 18,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? colors.primary : colors.cardBorder,
                  backgroundColor: isSelected ? '#E0F7F2' : colors.white,
                }}
              >
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 99,
                  backgroundColor: isSelected ? colors.primary : colors.inputBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Ionicons
                    name={option.icon}
                    size={26}
                    color={isSelected ? colors.white : colors.textLight}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 20,
                    fontFamily: fonts.heading.semibold,
                    color: isSelected ? colors.primary : colors.textDark,
                  }}>
                    {option.label}
                  </Text>
                  <Text style={{
                    fontSize: fonts.sm,
                    color: colors.textMedium,
                    marginTop: 3,
                    lineHeight: 18,
                  }}>
                    {option.sub}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Details text input — shown only when Yes is selected */}
        {hadTreatment === true && (
          <View style={styles.detailsWrapper}>
            <Text style={styles.detailsLabel}>Brief details (optional)</Text>
            <TextInput
              style={styles.detailsInput}
              placeholder="e.g. 6 months of physiotherapy at a clinic"
              placeholderTextColor={colors.placeholder}
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Previous treatment details"
            />
          </View>
        )}
      </View>
    </OnboardingShell>
  );
}

var styles = StyleSheet.create({
  detailsWrapper: {
    width: '100%',
  },
  detailsLabel: {
    fontSize: fonts.sm,
    color: colors.textMedium,
    fontWeight: fonts.medium,
    marginBottom: 8,
  },
  detailsInput: {
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    padding: 14,
    fontSize: fonts.md,
    color: colors.textDark,
    backgroundColor: colors.inputBg,
    minHeight: 80,
  },
});
