// components/chat/MessageBubble.jsx
// Handles all message types: text, image, voice, exercise
// Supports: reactions, reply quotes, read receipts, long-press, swipe-right

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// ── Static waveform bars for voice messages ────────────────────────────────────
const WAVEFORM_HEIGHTS = [12, 20, 28, 18, 32, 22, 16, 30, 14, 24];

const WaveformBars = ({ color }) => (
  <View style={styles.waveform}>
    {WAVEFORM_HEIGHTS.map((h, i) => (
      <View
        key={i}
        style={[styles.waveBar, { height: h, backgroundColor: color }]}
      />
    ))}
  </View>
);

// ── Read receipt ticks ─────────────────────────────────────────────────────────
const ReadReceipt = ({ status }) => {
  if (status === 'sent') {
    return <Ionicons name="checkmark" size={13} color="#6B7280" />;
  }
  if (status === 'delivered') {
    return (
      <View style={styles.doubleCheck}>
        <Ionicons name="checkmark" size={13} color="#6B7280" style={{ marginRight: -5 }} />
        <Ionicons name="checkmark" size={13} color="#6B7280" />
      </View>
    );
  }
  if (status === 'seen') {
    return (
      <View style={styles.doubleCheck}>
        <Ionicons name="checkmark" size={13} color="#22C55E" style={{ marginRight: -5 }} />
        <Ionicons name="checkmark" size={13} color="#22C55E" />
      </View>
    );
  }
  return null;
};

// ── Reply Quote Box ─────────────────────────────────────────────────────────────
const ReplyQuote = ({ replyTo, isSent }) => (
  <View style={[styles.replyQuote, isSent && styles.replyQuoteSent]}>
    <View style={styles.replyQuoteBar} />
    <View style={{ flex: 1 }}>
      <Text style={[styles.replyQuoteName, isSent && { color: '#A7F3D0' }]}>
        {replyTo.senderName}
      </Text>
      <Text
        style={[styles.replyQuoteText, isSent && { color: 'rgba(255,255,255,0.7)' }]}
        numberOfLines={1}
      >
        {replyTo.preview}
      </Text>
    </View>
  </View>
);

// ── Main MessageBubble ──────────────────────────────────────────────────────────
const MessageBubble = ({ message, onLongPress, onReply, onReact }) => {
  const isSent = message.sender === 'therapist';
  const navigation = useNavigation();
  const swipeAnim = useRef(new Animated.Value(0)).current;

  // — Entrance animation: slide up + fade + scale on mount
  const mountSlide = useRef(new Animated.Value(24)).current;  // starts 24px below
  const mountFade  = useRef(new Animated.Value(0)).current;   // starts invisible
  const mountScale = useRef(new Animated.Value(0.94)).current; // starts slightly small

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mountFade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(mountSlide, {
        toValue: 0,
        speed: 20,
        bounciness: 4,
        useNativeDriver: true,
      }),
      Animated.spring(mountScale, {
        toValue: 1,
        speed: 20,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Swipe right to reply
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dx > 8 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => {
        if (g.dx > 0 && g.dx < 70) {
          swipeAnim.setValue(g.dx);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > 45) {
          onReply && onReply(message);
        }
        Animated.spring(swipeAnim, {
          toValue: 0,
          tension: 200,
          friction: 12,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <View style={styles.imageMsgWrap}>
            <Image
              source={{ uri: message.imageUri }}
              style={styles.imageMsg}
              resizeMode="cover"
            />
            <View style={styles.imageTimestampRow}>
              <Text style={styles.imageTimestamp}>
                {formatTime(message.timestamp)}
              </Text>
              {isSent && <ReadReceipt status={message.status} />}
            </View>
          </View>
        );

      case 'voice':
        return (
          <View style={styles.voiceBubble}>
            {/* Top row: play button + waveform bars */}
            <View style={styles.voiceTopRow}>
              <TouchableOpacity style={styles.playBtn} activeOpacity={0.8}>
                <Ionicons
                  name="play"
                  size={16}
                  color={isSent ? '#FFFFFF' : '#374151'}
                />
              </TouchableOpacity>
              <WaveformBars color={isSent ? 'rgba(255,255,255,0.7)' : '#9CA3AF'} />
            </View>
            {/* Bottom row: duration + read receipt */}
            <View style={styles.voiceFooter}>
              <Text style={[styles.voiceDuration, isSent && { color: 'rgba(255,255,255,0.8)' }]}>
                {message.voiceDuration || '0:00'}
              </Text>
              {isSent && <ReadReceipt status={message.status} />}
            </View>
          </View>
        );

      case 'exercise':
        return (
          <View style={styles.exerciseCardFlat}>
            {/* Header row: icon + name */}
            <View style={styles.exFlatTop}>
              <Text style={styles.exFlatIcon}>🏋️</Text>
              <Text style={styles.exFlatName} numberOfLines={3}>
                {message.exercise?.name}
              </Text>
            </View>

            {/* Details */}
            <Text style={styles.exFlatMeta}>
              {message.exercise?.sets} sets × {message.exercise?.reps} reps{'  ·  '}{message.exercise?.duration}
            </Text>

            {/* CTA */}
            <TouchableOpacity
              style={styles.exFlatBtn}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('ExerciseDetail', {
                  exercise: message.exercise,
                })
              }
            >
              <Text style={styles.exFlatBtnText}>View Exercise →</Text>
            </TouchableOpacity>

            {/* Timestamp + tick */}
            <View style={styles.exFlatFooter}>
              <Text style={styles.exFlatTimestamp}>{formatTime(message.timestamp)}</Text>
              {isSent && <ReadReceipt status={message.status} />}
            </View>
          </View>
        );

      default: // text
        return (
          <View>
            {message.replyTo && (
              <ReplyQuote replyTo={message.replyTo} isSent={isSent} />
            )}
            <Text style={[styles.messageText, isSent && styles.sentText]}>
              {message.content}
            </Text>
            <View style={styles.textFooter}>
              <Text style={[styles.timestamp, isSent && styles.sentTimestamp]}>
                {formatTime(message.timestamp)}
              </Text>
              {isSent && <ReadReceipt status={message.status} />}
            </View>
          </View>
        );
    }
  };

  return (
    // Outer row: flex-row + justifyContent pushes bubble to correct side
    <View style={[styles.rowOuter, isSent ? styles.rowRight : styles.rowLeft]}>
      {/* Constrained width wrapper so bubble never exceeds 75% */}
      <View style={styles.bubbleWrapper}>
        {/* Mount animation wraps everything inside the width-constrained box */}
        <Animated.View
          style={{
            opacity: mountFade,
            transform: [
              { translateY: mountSlide },
              { scale: mountScale },
            ],
          }}
        >
          <Animated.View
            {...panResponder.panHandlers}
            style={{ transform: [{ translateX: swipeAnim }] }}
          >
            <TouchableOpacity
              onLongPress={() => onLongPress && onLongPress(message)}
              delayLongPress={350}
              activeOpacity={0.92}
            >
              <View
                style={[
                  styles.bubble,
                  isSent ? styles.sentBubble : styles.receivedBubble,
                  message.type === 'exercise' && styles.exerciseBubble,
                ]}
              >
                {renderContent()}
              </View>
            </TouchableOpacity>

            {/* Reactions — pinned below bubble, aligned to same side */}
            {message.reactions && message.reactions.length > 0 && (
              <View style={[styles.reactionsRow, isSent ? styles.reactionsRight : styles.reactionsLeft]}>
                {message.reactions.map((r, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.reactionPill, r.reacted && styles.reactionPillActive]}
                    onPress={() => onReact && onReact(message.id, r.emoji)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                    {r.count > 1 && (
                      <Text style={styles.reactionCount}>{r.count}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
};

// Helper
const formatTime = (ts) => {
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Outer row: flex-row so justifyContent controls left/right side
  rowOuter: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 12,
    marginVertical: 2,
  },
  rowLeft:  { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },

  // Constrained to 75% so bubble never touches screen edges
  bubbleWrapper: {
    maxWidth: '75%',
  },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  sentBubble: {
    backgroundColor: '#22C55E',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  messageText: {
    fontSize: 15,
    color: '#1A202C',
    lineHeight: 21,
  },
  sentText: {
    color: '#FFFFFF',
  },

  textFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 3,
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  sentTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },

  doubleCheck: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Reply quote
  replyQuote: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 10,
    padding: 7,
    marginBottom: 6,
  },
  replyQuoteSent: {
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  replyQuoteBar: {
    width: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    marginRight: 8,
    opacity: 0.7,
  },
  replyQuoteName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A7F3D0',
    marginBottom: 2,
  },
  replyQuoteText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
  },

  // Image
  imageMsgWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageMsg: {
    width: 220,
    height: 180,
    borderRadius: 12,
  },
  imageTimestampRow: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageTimestamp: {
    fontSize: 11,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Voice — column layout prevents wrap overflow
  voiceBubble: {
    flexDirection: 'column',
    minWidth: 180,
    gap: 4,
  },
  voiceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    flex: 1,
  },
  voiceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
  },
  voiceDuration: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Exercise card — completely flat column, no nested row issues
  exerciseBubble: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  exerciseCardFlat: {
    padding: 12,
    flexDirection: 'column',
  },
  exFlatTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  exFlatIcon: {
    fontSize: 18,
    marginRight: 8,
    flexShrink: 0,
  },
  exFlatName: {
    flex: 1,                  // takes all remaining width
    fontSize: 14,
    fontWeight: '700',
    color: '#1A202C',
    flexWrap: 'wrap',
    lineHeight: 20,
  },
  exFlatMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 16,
  },
  exFlatBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#22C55E',
    marginBottom: 8,
  },
  exFlatBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22C55E',
  },
  exFlatFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  exFlatTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Old exercise styles (unused, kept to avoid import errors if referenced elsewhere)
  exerciseCard: { padding: 2 },
  exerciseCardInner: { flexDirection: 'row', overflow: 'hidden', borderRadius: 14 },
  exerciseGreenBar: { width: 4, backgroundColor: '#22C55E', borderRadius: 2 },
  exerciseBody: { flex: 1, padding: 12, gap: 4 },
  exerciseTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  exerciseCardIcon: { fontSize: 18 },
  exerciseName: { fontSize: 14, fontWeight: '700', color: '#1A202C', flex: 1, flexShrink: 1, flexWrap: 'wrap' },
  exerciseMeta: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  viewExBtn: { alignSelf: 'flex-start', backgroundColor: '#DCFCE7', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  viewExText: { fontSize: 12, fontWeight: '600', color: '#16A34A' },

  // Reactions — overlap bubble bottom slightly, align to same side as bubble
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: -6,        // slight overlap with bubble bottom edge
    marginHorizontal: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  reactionsLeft:  { justifyContent: 'flex-start' },
  reactionsRight: { justifyContent: 'flex-end' },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  reactionPillActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
});

export default MessageBubble;
