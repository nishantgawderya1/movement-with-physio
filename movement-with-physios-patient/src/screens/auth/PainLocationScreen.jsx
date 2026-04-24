import React, { useState, useCallback } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { useOnboarding } from '../../context/OnboardingContext';
import OnboardingShell from '../../components/auth/OnboardingShell';
import SelectableCard from '../../components/auth/SelectableCard';
import { PATIENT_ROUTES } from '../../constants/routes';

const PAIN_LOCATIONS = [
  { label: 'Back', iconName: 'body-outline' },
  { label: 'Neck', iconName: 'fitness-outline' },
  { label: 'Arm', iconName: 'hand-left-outline' },
  { label: 'Leg', iconName: 'walk-outline' },
  { label: 'Shoulder', iconName: 'accessibility-outline' },
  { label: 'Spine', iconName: 'git-branch-outline' },
  { label: 'Pelvic Physio', iconName: 'female-outline' },
  { label: 'Fracture', iconName: 'bandage-outline' },
];

/**
 * Step 2 — Select one or more pain locations (multi-select grid).
 *
 * @param {{ navigation: object }} props
 */
export default function PainLocationScreen({ navigation }) {
  const { painLocations: contextLocations, updateOnboardingData } = useOnboarding();

  const [selectedLocations, setSelectedLocations] = useState(
    contextLocations && contextLocations.length > 0 ? contextLocations : []
  );

  function toggleLocation(label) {
    setSelectedLocations(function (prev) {
      if (prev.includes(label)) {
        return prev.filter(function (l) { return l !== label; });
      }
      return prev.concat(label);
    });
  }

  function handleContinue() {
    updateOnboardingData({ painLocations: selectedLocations });
    navigation.navigate(PATIENT_ROUTES.PAIN_SEVERITY);
  }

  function handleBack() {
    navigation.goBack();
  }

  const renderItem = useCallback(function ({ item }) {
    return (
      <SelectableCard
        label={item.label}
        iconName={item.iconName}
        isSelected={selectedLocations.includes(item.label)}
        onPress={function () { toggleLocation(item.label); }}
      />
    );
  }, [selectedLocations]);

  const keyExtractor = useCallback(function (item) { return item.label; }, []);

  return (
    <OnboardingShell
      step={2}
      heading="Where do you feel pain?"
      subtitle="Select part of the body"
      onBack={handleBack}
      onContinue={handleContinue}
      isContinueDisabled={selectedLocations.length === 0}
    >
      <FlatList
        data={PAIN_LOCATIONS}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={3}
        scrollEnabled={false}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
      />
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  columnWrapper: {
    justifyContent: 'space-between',
  },
  listContent: {
    paddingBottom: 8,
    flexGrow: 1,
    justifyContent: 'center',
  },
});
