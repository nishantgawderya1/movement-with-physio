import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

/**
 * Formats an ISO timestamp for display under a message bubble.
 * @param {string} isoString
 * @returns {string}
 */
function formatBubbleTime(isoString) {
  var d = new Date(isoString);
  var hours = d.getHours();
  var minutes = d.getMinutes();
  var ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return hours + ':' + (minutes < 10 ? '0' + minutes : minutes) + ' ' + ampm;
}

/**
 * Read-receipt icon for outgoing (patient) messages.
 * grey double-tick = delivered, teal double-tick = read
 * @param {{ status: 'sent' | 'delivered' | 'read' }} props
 */
function ReadReceipt({ status }) {
  if (status === 'sent') {
    return <Ionicons name="checkmark" size={12} color="rgba(255,255,255,0.6)" />;
  }
  var tickColor = status === 'read' ? colors.primaryLight : 'rgba(255,255,255,0.5)';
  return <Ionicons name="checkmark-done" size={13} color={tickColor} />;
}

/**
 * Inline reply reference strip inside a bubble.
 * @param {{ replyTo: { id: string, text: string }, isPatient: boolean }} props
 */
function InlineReplyStrip({ replyTo, isPatient }) {
  return (
    <View style={[styles.replyStrip, isPatient ? styles.replyStripPatient : styles.replyStripTherapist]}>
      <View style={[styles.replyStripBar, isPatient ? styles.replyStripBarPatient : styles.replyStripBarTherapist]} />
      <Text
        style={[styles.replyStripText, isPatient ? styles.replyStripTextPatient : styles.replyStripTextTherapist]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {replyTo.text}
      </Text>
    </View>
  );
}

/**
 * A single chat message bubble.
 *
 * Patient messages: right-aligned, teal bg (#00B894), white text.
 * Therapist messages: left-aligned, surface bg (#F4F6F9), textDark text.
 * Entrance animation: fade + translateY(8→0) in 200ms.
 *
 * @param {{
 *   message: {
 *     id: string,
 *     senderRole: 'patient' | 'therapist',
 *     text: string,
 *     timestamp: string,
 *     status: 'sent' | 'delivered' | 'read',
 *     replyTo: { id: string, text: string } | null
 *   },
 *   animDelay: number,
 *   onLongPress?: Function
 * }} props
 */
export default function MessageBubble({ message, animDelay, onLongPress }) {
  var isPatient = message.senderRole === 'patient';
  var opacity = useRef(new Animated.Value(0)).current;
  var translateY = useRef(new Animated.Value(8)).current;

  useEffect(function () {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        delay: animDelay || 0,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        delay: animDelay || 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        isPatient ? styles.wrapperPatient : styles.wrapperTherapist,
        { opacity: opacity, transform: [{ translateY: translateY }] },
      ]}
    >
      <Pressable
        onLongPress={onLongPress}
        style={[
          styles.bubble,
          isPatient ? styles.bubblePatient : styles.bubbleTherapist,
        ]}
        delayLongPress={350}
      >
        {/* Inline reply strip */}
        {message.replyTo && (
          <InlineReplyStrip replyTo={message.replyTo} isPatient={isPatient} />
        )}

        <Text style={[styles.text, isPatient ? styles.textPatient : styles.textTherapist]}>
          {message.text}
        </Text>

        {/* Timestamp + read receipt row */}
        <View style={[styles.metaRow, isPatient ? styles.metaRowPatient : styles.metaRowTherapist]}>
          <Text style={[styles.timestamp, isPatient ? styles.timestampPatient : styles.timestampTherapist]}>
            {formatBubbleTime(message.timestamp)}
          </Text>
          {isPatient && <ReadReceipt status={message.status} />}
        </View>
      </Pressable>
    </Animated.View>
  );
}

var styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  wrapperPatient: {
    alignItems: 'flex-end',
  },
  wrapperTherapist: {
    alignItems: 'flex-start',
  },

  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  bubblePatient: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTherapist: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },

  text: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.md,
    lineHeight: fonts.md * 1.4,
  },
  textPatient: {
    color: '#FFFFFF',
  },
  textTherapist: {
    color: colors.textDark,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  metaRowPatient: {
    justifyContent: 'flex-end',
  },
  metaRowTherapist: {
    justifyContent: 'flex-start',
  },

  timestamp: {
    fontFamily: fonts.body.regular,
    fontSize: 10,
  },
  timestampPatient: {
    color: 'rgba(255,255,255,0.7)',
  },
  timestampTherapist: {
    color: colors.textLight,
  },

  // Inline reply strip inside bubble
  replyStrip: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  replyStripPatient: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  replyStripTherapist: {
    backgroundColor: colors.primaryLight,
  },
  replyStripBar: {
    width: 3,
    borderRadius: 99,
  },
  replyStripBarPatient: {
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  replyStripBarTherapist: {
    backgroundColor: colors.primary,
  },
  replyStripText: {
    flex: 1,
    fontFamily: fonts.body.regular,
    fontSize: fonts.xs,
    paddingHorizontal: 8,
    paddingVertical: 6,
    lineHeight: fonts.xs * 1.4,
  },
  replyStripTextPatient: {
    color: 'rgba(255,255,255,0.85)',
  },
  replyStripTextTherapist: {
    color: colors.textMedium,
  },
});
