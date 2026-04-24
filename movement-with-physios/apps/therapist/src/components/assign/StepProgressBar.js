// src/components/assign/StepProgressBar.js
// Reusable 4-step progress indicator for the Assign Exercises flow.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

const STEP_LABELS = ['Client', 'Schedule', 'Review', 'Done'];

const StepProgressBar = ({ currentStep, totalSteps = 4 }) => (
  <View style={styles.container}>
    {Array.from({ length: totalSteps }, (_, i) => {
      const stepNum = i + 1;
      const isCompleted = stepNum < currentStep;
      const isActive    = stepNum === currentStep;

      return (
        <React.Fragment key={stepNum}>
          {/* Connector line before each step except the first */}
          {i > 0 && (
            <View style={[styles.line, isCompleted && styles.lineCompleted]} />
          )}

          <View style={styles.stepWrapper}>
            <View style={[
              styles.circle,
              isCompleted && styles.circleCompleted,
              isActive    && styles.circleActive,
            ]}>
              {isCompleted ? (
                <Ionicons name="checkmark" size={11} color={colors.white} />
              ) : (
                <Text style={[
                  styles.stepNum,
                  isActive && styles.stepNumActive,
                ]}>
                  {stepNum}
                </Text>
              )}
            </View>
            <Text style={[
              styles.stepLabel,
              isActive    && styles.stepLabelActive,
              isCompleted && styles.stepLabelCompleted,
            ]}>
              {STEP_LABELS[i]}
            </Text>
          </View>
        </React.Fragment>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },

  line: {
    flex: 1,
    height: 2,
    backgroundColor: colors.cardBorder,
    marginBottom: 14,
  },
  lineCompleted: {
    backgroundColor: colors.primary,
  },

  stepWrapper: {
    alignItems: 'center',
    gap: 4,
  },

  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  circleActive: {
    backgroundColor: colors.white,
    borderColor: colors.primary,
  },

  stepNum: {
    fontSize: fonts.xs,
    fontWeight: fonts.semibold,
    color: '#94A3B8',
  },
  stepNumActive: {
    color: colors.primary,
  },

  stepLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: fonts.medium,
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: fonts.semibold,
  },
  stepLabelCompleted: {
    color: colors.primary,
  },
});

export default StepProgressBar;
