import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  Animated,
  Keyboard,
  PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { chatService } from '../../services/chatService';
import MessageBubble from '../../components/chat/MessageBubble';
import TypingIndicator from '../../components/chat/TypingIndicator';
import ReplyPreview from '../../components/chat/ReplyPreview';
import AttachmentSheet from '../../components/chat/AttachmentSheet';

/**
 * Generates initials from a therapist's full name for the header avatar.
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name) return '?';
  var parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Chat room screen — full WhatsApp-style messaging interface.
 *
 * Features:
 *  - FlatList inverted for natural bottom-up message rendering
 *  - Patient bubbles (right, teal) + therapist bubbles (left, surface)
 *  - Inline reply strips + ReplyPreview in composer
 *  - Typing indicator via mock polling (setInterval)
 *  - Optimistic message send with scale-pulse animation on send button
 *  - Pure RN Keyboard API — manual Keyboard.addListener (no KeyboardAvoidingView)
 *  - AttachmentSheet slides up from bottom on paperclip press
 *  - PanResponder on composer row: swipe down > 20px → Keyboard.dismiss()
 *  - FlatList onScrollBeginDrag → Keyboard.dismiss() (standard chat UX)
 *
 * @param {{ navigation: object, route: object }} props
 */
export default function ChatRoomScreen({ navigation, route }) {
  var { roomId, therapistName, isOnline } = route.params || {};
  var insets = useSafeAreaInsets();

  var [messages, setMessages] = useState([]);
  var [loading, setLoading] = useState(true);
  var [inputText, setInputText] = useState('');
  var [replyTo, setReplyTo] = useState(null);
  var [isTyping, setIsTyping] = useState(false);
  var [keyboardHeight, setKeyboardHeight] = useState(0);
  var [isAttachmentOpen, setIsAttachmentOpen] = useState(false);

  var typingInterval = useRef(null);
  var flatListRef = useRef(null);
  var sendScale = useRef(new Animated.Value(1)).current;

  var canSend = inputText.trim().length > 0;

  // ── Attachment sheet handlers ───────────────────────────────────────────

  function openAttachmentSheet() {
    setIsAttachmentOpen(true);
  }

  function closeAttachmentSheet() {
    setIsAttachmentOpen(false);
  }

  // ── PanResponder — swipe down on composer to dismiss keyboard ──────────
  //
  // Applied to the outer composerOuter View only (NOT wrapping the TextInput).
  // The TextInput itself sits inside composerRow which is a sibling of the
  // PanResponder's View via the composerRow being a child — but we attach the
  // responder to composerOuter so taps inside TextInput still propagate normally.

  var composerPanResponder = useRef(
    PanResponder.create({
      // Only capture a clearly downward swipe, not horizontal scroll-like moves
      onMoveShouldSetPanResponder: function (evt, gestureState) {
        return gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
      },
      onPanResponderRelease: function (evt, gestureState) {
        if (gestureState.dy > 20) {
          Keyboard.dismiss();
        }
      },
    })
  ).current;

  // ── Load messages ──────────────────────────────────────────────────────

  var loadMessages = useCallback(function () {
    chatService.getMessages(roomId).then(function (result) {
      if (result.success) {
        setMessages(result.data.messages);
        chatService.markAsRead(roomId, null);
      }
      setLoading(false);
    });
  }, [roomId]);

  useEffect(function () {
    loadMessages();
  }, [loadMessages]);

  // ── Keyboard listener (replaces KeyboardAvoidingView) ─────────────────

  useEffect(function () {
    var show = Keyboard.addListener('keyboardWillShow', function (e) {
      setKeyboardHeight(e.endCoordinates.height);
    });
    var hide = Keyboard.addListener('keyboardWillHide', function () {
      setKeyboardHeight(0);
    });
    return function () {
      show.remove();
      hide.remove();
    };
  }, []);

  // ── Typing indicator polling ───────────────────────────────────────────

  useEffect(function () {
    typingInterval.current = setInterval(function () {
      chatService.getTypingStatus(roomId).then(function (result) {
        if (result.success) {
          setIsTyping(result.data.isTyping);
        }
      });
    }, 3000);

    return function () {
      if (typingInterval.current) {
        clearInterval(typingInterval.current);
      }
    };
  }, [roomId]);

  // ── Send animation ─────────────────────────────────────────────────────

  function animateSend() {
    Animated.sequence([
      Animated.timing(sendScale, { toValue: 1.12, duration: 75, useNativeDriver: true }),
      Animated.timing(sendScale, { toValue: 1, duration: 75, useNativeDriver: true }),
    ]).start();
  }

  // ── Send message ───────────────────────────────────────────────────────

  function handleSend() {
    var text = inputText.trim();
    if (!text) return;

    animateSend();

    var optimistic = {
      id: 'optimistic-' + Date.now(),
      roomId: roomId,
      senderId: 'patient',
      senderRole: 'patient',
      text: text,
      timestamp: new Date().toISOString(),
      status: 'sent',
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text } : null,
    };

    setMessages(function (prev) { return [optimistic].concat(prev); });
    setInputText('');
    setReplyTo(null);

    chatService.sendMessage(roomId, text, replyTo).then(function (result) {
      if (result.success) {
        setMessages(function (prev) {
          return prev.map(function (m) {
            return m.id === optimistic.id ? result.data : m;
          });
        });
      }
    });
  }

  // ── Reply on long press ────────────────────────────────────────────────

  function handleLongPress(msg) {
    setReplyTo({ id: msg.id, text: msg.text });
  }

  // ── Render ─────────────────────────────────────────────────────────────

  function renderMessage({ item }) {
    return (
      <MessageBubble
        message={item}
        animDelay={0}
        onLongPress={function () { handleLongPress(item); }}
      />
    );
  }

  function renderListHeader() {
    return <TypingIndicator visible={isTyping} />;
  }

  var initials = getInitials(therapistName);

  // Composer bottom padding:
  //   keyboard open  → flat 12px (keyboard sits flush below)
  //   keyboard closed → home-indicator safe area (or 12px minimum)
  var composerPaddingBottom = keyboardHeight > 0
    ? 12
    : insets.bottom > 0 ? insets.bottom : 12;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── CUSTOM NAVIGATION HEADER ── */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={function () { navigation.goBack(); }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color={colors.textDark} />
        </Pressable>

        <View style={styles.headerAvatarWrapper}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{initials}</Text>
          </View>
          {isOnline && <View style={styles.headerOnlineDot} />}
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{therapistName}</Text>
          <Text style={styles.headerStatus}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>

        <Pressable
          style={styles.videoBtn}
          onPress={function () {}}
          accessibilityLabel="Video call (coming soon)"
        >
          <Ionicons name="videocam-outline" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.headerDivider} />

      {/* ── MESSAGE LIST ── */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={function (item) { return item.id; }}
          renderItem={renderMessage}
          inverted
          ListHeaderComponent={renderListHeader}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          style={styles.flex}
          // Swipe anywhere on the message list to dismiss keyboard
          onScrollBeginDrag={function () { Keyboard.dismiss(); }}
        />
      )}

      {/* ── COMPOSER BAR ────────────────────────────────────────────────────
          marginBottom: keyboardHeight pushes the bar exactly above the
          keyboard — no estimation, no offset guessing.
          Rendered OUTSIDE the loading ternary so it is always visible.

          PanResponder attached here (composerOuter) — NOT wrapping TextInput,
          so normal typing is never interrupted. The gesture only fires when
          the user swipes downward on the composer's background area.
      ── */}
      <View
        style={[
          styles.composerOuter,
          { paddingBottom: composerPaddingBottom, marginBottom: keyboardHeight },
        ]}
        {...composerPanResponder.panHandlers}
      >
        {/* Reply preview strip */}
        <ReplyPreview replyTo={replyTo} onDismiss={function () { setReplyTo(null); }} />

        {/* Input row */}
        <View style={styles.composerRow}>
          {/* Attach icon — opens AttachmentSheet */}
          <Pressable
            style={styles.attachBtn}
            onPress={openAttachmentSheet}
            accessibilityLabel="Open attachment options"
          >
            <Ionicons name="attach" size={24} color={colors.textLight} />
          </Pressable>

          {/* Text input — PanResponder is on the parent, not here */}
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={colors.textLight}
            multiline
            maxHeight={120}
            returnKeyType="default"
            blurOnSubmit={false}
          />

          {/* Send button with scale-pulse animation */}
          <Animated.View style={{ transform: [{ scale: sendScale }] }}>
            <Pressable
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
              onPress={handleSend}
              accessibilityLabel="Send message"
            >
              <Ionicons name="arrow-up" size={20} color={colors.textOnPrimary} />
            </Pressable>
          </Animated.View>
        </View>
      </View>

      {/* ── ATTACHMENT SHEET OVERLAY ────────────────────────────────────────
          Rendered at the bottom of the root View (outside FlatList and
          composer) so it overlays the entire screen.
      ── */}
      <AttachmentSheet
        visible={isAttachmentOpen}
        onClose={closeAttachmentSheet}
      />

    </SafeAreaView>
  );
}

var styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: colors.background,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarWrapper: {
    position: 'relative',
    width: 40,
    height: 40,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.sm,
    color: colors.textOnPrimary,
  },
  headerOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#48BB78',
    borderWidth: 2,
    borderColor: colors.background,
  },
  headerInfo: {
    flex: 1,
    gap: 1,
  },
  headerName: {
    fontFamily: fonts.heading.regular,
    fontSize: fonts.md,
    color: colors.textDark,
    lineHeight: fonts.md * 1.3,
  },
  headerStatus: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.textMedium,
  },
  videoBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    marginRight: 4,
  },
  headerDivider: {
    height: 0.5,
    backgroundColor: colors.border,
  },

  // ── Message list ────────────────────────────────────────────────────────
  listContent: {
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Composer ────────────────────────────────────────────────────────────
  // composerOuter wraps the reply preview + input row.
  // paddingBottom is set inline — keyboard open: 12px, closed: insets.bottom
  composerOuter: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  composerRow: {
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
  },
  sendBtnDisabled: {
    backgroundColor: colors.textLight,
  },
});
