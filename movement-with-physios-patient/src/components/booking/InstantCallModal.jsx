/**
 * InstantCallModal — patient-facing bottom-sheet for requesting an instant
 * video call with a specific therapist.
 *
 * Props:
 *   visible    : boolean — controls modal visibility
 *   therapist  : { _id, name } | null — call target; if null, only Cancel is shown
 *   onClose    : () => void — fired on backdrop tap / Cancel button
 *   onSuccess  : (booking) => void — fired AFTER a successful
 *                requestInstantCall. The returned booking has _id but
 *                videoCall is ALWAYS null at this stage — videoCall is
 *                created only on therapist accept. WaitingForTherapistScreen
 *                polls for the status flip + populated videoCallId.
 *
 * Server validations the user may hit (errorMessage rendered as-is):
 *   400 INVALID_DELAY              — should not happen (we constrain UI to 15/30)
 *   403 NO_PRIOR_RELATIONSHIP      — surfaced as the server-provided message
 *   409 THERAPIST_NOT_AVAILABLE    — surfaced as the server-provided message
 *   409 INSTANT_ALREADY_PENDING    — surfaced as the server-provided message
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';

import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { requestInstantCall } from '../../services/bookingService';

var DELAY_OPTIONS = [15, 30];

/**
 * @param {{
 *   visible: boolean,
 *   therapist: { _id: string, name: string } | null,
 *   onClose: () => void,
 *   onSuccess: (booking: object) => void,
 * }} props
 */
export default function InstantCallModal(props) {
  var visible = props.visible;
  var therapist = props.therapist;
  var onClose = props.onClose;
  var onSuccess = props.onSuccess;

  var [delayMinutes, setDelayMinutes] = useState(15);
  var [submitting, setSubmitting] = useState(false);
  var [errorMessage, setErrorMessage] = useState(null);

  var canRequest = !!therapist && !submitting;

  function handleBackdropPress() {
    // Don't allow closing mid-request — keep the modal locked so the
    // user can see the spinner / error.
    if (submitting) return;
    setErrorMessage(null);
    onClose();
  }

  function handleSelectDelay(value) {
    if (submitting) return;
    setDelayMinutes(value);
  }

  async function handleRequest() {
    if (!therapist || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    var result = await requestInstantCall({
      therapistId: therapist._id,
      instantDelayMinutes: delayMinutes,
    });
    setSubmitting(false);
    if (result.success) {
      onSuccess(result.data && result.data.booking);
      onClose();
    } else {
      setErrorMessage(result.error || 'Could not request call');
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleBackdropPress}
    >
      <View style={styles.root}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleBackdropPress}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>
            {therapist ? 'Call now with ' + therapist.name : 'Call now'}
          </Text>
          <Text style={styles.subtitle}>When should the call start?</Text>

          {therapist ? (
            <View style={styles.optionsRow}>
              {DELAY_OPTIONS.map(function (value) {
                var isSelected = value === delayMinutes;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.optionCard,
                      isSelected ? styles.optionCardSelected : null,
                    ]}
                    onPress={function () { handleSelectDelay(value); }}
                    disabled={submitting}
                  >
                    <Text
                      style={[
                        styles.optionValue,
                        isSelected ? styles.optionValueSelected : null,
                      ]}
                    >
                      {value}
                    </Text>
                    <Text
                      style={[
                        styles.optionUnit,
                        isSelected ? styles.optionUnitSelected : null,
                      ]}
                    >
                      min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, !canRequest && styles.primaryBtnDisabled]}
            onPress={handleRequest}
            disabled={!canRequest}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Request Call</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleBackdropPress}
            disabled={submitting}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

var styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.lg,
    color: colors.textDark,
    lineHeight: fonts.lg * 1.35,
  },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.sm,
    color: colors.textMedium,
  },

  optionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  optionCard: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionValue: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.xxl,
    color: colors.textDark,
  },
  optionValueSelected: {
    color: colors.primary,
  },
  optionUnit: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.sm,
    color: colors.textMedium,
  },
  optionUnitSelected: {
    color: colors.primary,
  },

  errorBox: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.sm,
    color: colors.danger,
  },

  primaryBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.md,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontFamily: fonts.body.medium,
    fontSize: fonts.sm,
    color: colors.textMedium,
  },
});
