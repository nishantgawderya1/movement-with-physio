// src/components/proposals/DeclineProposalSheet.jsx
// Bottom-sheet for declining a session proposal. Single "Decline" button
// always enabled (LOCKED DECISION — NO Send/Skip split). Cancel = no API
// call. Optional reason text (max 500 chars). Pattern mirrors
// AttachmentSheet (Modal + inner AnimatedSheet that re-mounts on visible
// so the spring starts fresh each open).

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import PrimaryButton from '../ui/PrimaryButton';
import OutlineButton from '../ui/OutlineButton';

/**
 * Inner panel — re-mounted every time the Modal opens so translateY
 * always starts at 400. Avoids stale animated-value issues.
 */
function AnimatedSheet(props) {
  var onClose = props.onClose;
  var onSubmit = props.onSubmit;
  var submitting = !!props.submitting;
  var errorMessage = props.errorMessage || '';

  var [reason, setReason] = useState('');
  var translateY = useRef(new Animated.Value(400)).current;

  useEffect(function () {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  }, []);

  function slideDown(cb) {
    Animated.spring(translateY, {
      toValue: 400,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start(function () { if (cb) cb(); });
  }

  function handleCancel() {
    if (submitting) return;
    slideDown(onClose);
  }

  function handleDecline() {
    if (submitting) return;
    var trimmed = (reason || '').trim();
    onSubmit(trimmed.length > 0 ? trimmed : null);
  }

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={handleCancel} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY: translateY }] }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Decline this session?</Text>
        <Text style={styles.subtitle}>Let your therapist know why (optional)</Text>

        <TextInput
          style={styles.input}
          value={reason}
          onChangeText={setReason}
          placeholder="I'm not available at this time..."
          placeholderTextColor={colors.placeholder}
          multiline
          maxLength={500}
          textAlignVertical="top"
          editable={!submitting}
        />
        <Text style={styles.counter}>{reason.length}/500</Text>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.btnRow}>
          <View style={styles.btnSlot}>
            <OutlineButton
              label="Cancel"
              onPress={handleCancel}
              disabled={submitting}
            />
          </View>
          <View style={styles.btnSlot}>
            <PrimaryButton
              label={submitting ? 'Declining...' : 'Decline'}
              onPress={handleDecline}
              disabled={submitting}
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   onSubmit: (reason: string | null) => void,
 *   submitting?: boolean,
 *   errorMessage?: string
 * }} props
 */
export default function DeclineProposalSheet(props) {
  return (
    <Modal
      visible={!!props.isOpen}
      transparent
      animationType="none"
      onRequestClose={props.onClose}
      statusBarTranslucent
    >
      {props.isOpen ? (
        <AnimatedSheet
          onClose={props.onClose}
          onSubmit={props.onSubmit}
          submitting={!!props.submitting}
          errorMessage={props.errorMessage}
        />
      ) : null}
    </Modal>
  );
}

var styles = StyleSheet.create({
  overlay: {
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
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.lg,
    color: colors.textDark,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.sm,
    color: colors.textMedium,
    marginBottom: 14,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 96,
    fontFamily: fonts.body.regular,
    fontSize: fonts.md,
    color: colors.textDark,
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: 4,
    fontFamily: fonts.body.regular,
    fontSize: fonts.xs,
    color: colors.textLight,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  errorBannerText: {
    fontFamily: fonts.body.medium,
    fontSize: fonts.sm,
    color: '#C53030',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  btnSlot: {
    flex: 1,
  },
});
