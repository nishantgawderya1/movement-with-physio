import React, { useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReplyPreview from './ReplyPreview';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

/**
 * Chat composer bar — attach icon | text input | send button.
 *
 * Pinned to the bottom of ChatRoomScreen above the tab bar.
 * Uses only the standard React Native Animated API (no reanimated,
 * no keyboard-controller, no useAnimatedKeyboard).
 *
 * @param {{
 *   value: string,
 *   onChangeText: Function,
 *   onSend: Function,
 *   replyTo: { id: string, text: string } | null,
 *   onDismissReply: Function,
 * }} props
 */
export default function ComposerBar({
  value,
  onChangeText,
  onSend,
  replyTo,
  onDismissReply,
}) {
  var sendScale = useRef(new Animated.Value(1)).current;
  var canSend = value.trim().length > 0;

  /**
   * Scale pulse: 1 → 1.12 → 1 over 150ms total, useNativeDriver.
   */
  function animateSend() {
    Animated.sequence([
      Animated.timing(sendScale, {
        toValue: 1.12,
        duration: 75,
        useNativeDriver: true,
      }),
      Animated.timing(sendScale, {
        toValue: 1,
        duration: 75,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function handleSend() {
    if (!canSend) return;
    animateSend();
    onSend();
  }

  return (
    <View style={styles.outerContainer}>
      {/* Reply preview strip above the input row */}
      <ReplyPreview replyTo={replyTo} onDismiss={onDismissReply} />

      <View style={styles.row}>
        {/* ── Attach icon (placeholder, no action) ── */}
        <Pressable
          style={styles.attachBtn}
          accessibilityLabel="Attach file (coming soon)"
        >
          <Ionicons name="attach" size={24} color={colors.textLight} />
        </Pressable>

        {/* ── Text input ── */}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="Type a message..."
          placeholderTextColor={colors.textLight}
          multiline
          maxHeight={120}
          returnKeyType="default"
          blurOnSubmit={false}
        />

        {/* ── Send button ── */}
        <Animated.View style={{ transform: [{ scale: sendScale }] }}>
          <Pressable
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleSend}
            accessibilityLabel="Send message"
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color="#FFFFFF"
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

var styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  attachBtn: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 21,
    marginBottom: 0,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontFamily: fonts.body.regular,
    fontSize: fonts.md,
    color: colors.textDark,
    minHeight: 42,
    maxHeight: 120,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  sendBtnDisabled: {
    backgroundColor: colors.textLight,
  },
});
