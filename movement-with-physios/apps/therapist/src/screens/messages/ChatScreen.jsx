// screens/messages/ChatScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Full-featured chat screen for MWP Therapist App
// Features: text/image/voice/exercise messages, reactions, reply-to,
//           typing indicator, read receipts, attachment tray
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Keyboard,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';

import MessageBubble from '../../components/chat/MessageBubble';
import ComposerBar from '../../components/chat/ComposerBar';
import AttachmentTray from '../../components/chat/AttachmentTray';
import TypingIndicator from '../../components/chat/TypingIndicator';
import ReactionPicker from '../../components/chat/ReactionPicker';
import QuickRepliesSheet from '../../components/chat/QuickRepliesSheet';
import ExerciseSelectModal from '../../components/chat/ExerciseSelectModal';

// ── Unique ID helper ─────────────────────────────────────────────────────────
let _id = 100;
const uid = () => String(++_id);

// ── Mock initial messages ────────────────────────────────────────────────────
const makeMockMessages = () => [
  {
    id: '1',
    type: 'text',
    content: 'Hi Doctor! I completed all the exercises today 💪',
    sender: 'client',
    timestamp: new Date(Date.now() - 14 * 60000),
    status: null,
    replyTo: null,
    reactions: [],
    imageUri: null,
    voiceDuration: null,
    exercise: null,
  },
  {
    id: '2',
    type: 'text',
    content: 'That\'s excellent progress, Priya! How is the pain level today?',
    sender: 'therapist',
    timestamp: new Date(Date.now() - 12 * 60000),
    status: 'seen',
    replyTo: null,
    reactions: [{ emoji: '👍', count: 1, reacted: false }],
    imageUri: null,
    voiceDuration: null,
    exercise: null,
  },
  {
    id: '3',
    type: 'exercise',
    content: '',
    sender: 'therapist',
    timestamp: new Date(Date.now() - 10 * 60000),
    status: 'delivered',
    replyTo: null,
    reactions: [],
    imageUri: null,
    voiceDuration: null,
    exercise: { name: 'Wall Slides', sets: 3, reps: 12, duration: '5 min' },
  },
  {
    id: '4',
    type: 'voice',
    content: '',
    sender: 'client',
    timestamp: new Date(Date.now() - 8 * 60000),
    status: null,
    replyTo: null,
    reactions: [],
    imageUri: null,
    voiceDuration: '0:32',
    exercise: null,
  },
  {
    id: '5',
    type: 'text',
    content: 'Pain is around 2/10 now, much better than last week!',
    sender: 'client',
    timestamp: new Date(Date.now() - 6 * 60000),
    status: null,
    replyTo: null,
    reactions: [{ emoji: '❤️', count: 1, reacted: true }],
    imageUri: null,
    voiceDuration: null,
    exercise: null,
  },
  {
    id: '6',
    type: 'text',
    content: 'Great to hear! Keep on with the program and let me know if anything feels off.',
    sender: 'therapist',
    timestamp: new Date(Date.now() - 4 * 60000),
    status: 'seen',
    replyTo: null,
    reactions: [],
    imageUri: null,
    voiceDuration: null,
    exercise: null,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
const ChatScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const conv = route?.params?.conv ?? {
    id: 1,
    name: 'Priya Sharma',
    online: true,
    avatarBg: '#FDE68A',
    avatarEmoji: '👩',
  };

  const [messages, setMessages] = useState(makeMockMessages);
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [typingVisible, setTypingVisible] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [reactionTarget, setReactionTarget] = useState(null); // message id
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);

  const flatListRef = useRef(null);
  const typingTimerRef = useRef(null);
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  // ── Keyboard listeners — lifts composer in sync with keyboard ────────────
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration : 200,
        useNativeDriver: false,
      }).start();
    });

    const hide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration : 200,
        useNativeDriver: false,
      }).start();
    });

    return () => { show.remove(); hide.remove(); };
  }, []);

  // ── Send a text/image message ──────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text && !attachmentPreview) return;

    const newMsg = {
      id: uid(),
      type: attachmentPreview ? 'image' : 'text',
      content: text,
      sender: 'therapist',
      timestamp: new Date(),
      status: 'sent',
      replyTo: replyTo
        ? { ...replyTo }
        : null,
      reactions: [],
      imageUri: attachmentPreview || null,
      voiceDuration: null,
      exercise: null,
    };

    setMessages((prev) => [newMsg, ...prev]);
    setInputText('');
    setAttachmentPreview(null);
    setReplyTo(null);
    setTrayOpen(false);

    // Scroll to bottom (index 0 on inverted list = newest message)
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);

    // Simulate status progression: sent → delivered → seen
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'delivered' } : m))
      );
    }, 800);
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'seen' } : m))
      );
    }, 2000);

    // Show typing indicator after 2s
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setTypingVisible(true);
      // Auto-hide + mock reply after 3s
      setTimeout(() => {
        setTypingVisible(false);
        const replies = [
          'Thanks, I\'ll keep that in mind!',
          'Got it, doctor 🙏',
          'I understand, will do!',
          'Thank you for the guidance!',
        ];
        const mockReply = {
          id: uid(),
          type: 'text',
          content: replies[Math.floor(Math.random() * replies.length)],
          sender: 'client',
          timestamp: new Date(),
          status: null,
          replyTo: null,
          reactions: [],
          imageUri: null,
          voiceDuration: null,
          exercise: null,
        };
        setMessages((prev) => [mockReply, ...prev]);
      }, 3000);
    }, 2000);
  }, [inputText, attachmentPreview, replyTo]);

  // ── Voice message send ────────────────────────────────────────────────────
  const handleVoiceSend = useCallback(({ uri, duration }) => {
    const newMsg = {
      id: uid(),
      type: 'voice',
      content: '',
      sender: 'therapist',
      timestamp: new Date(),
      status: 'sent',
      replyTo: null,
      reactions: [],
      imageUri: null,
      voiceDuration: duration,
      exercise: null,
    };
    setMessages((prev) => [newMsg, ...prev]);
    setIsRecording(false);
    setTrayOpen(false);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'delivered' } : m))
      );
    }, 800);
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'seen' } : m))
      );
    }, 2000);
  }, []);

  // ── Exercise send ─────────────────────────────────────────────────────────
  const handleExerciseSelect = useCallback((exercise) => {
    const newMsg = {
      id: uid(),
      type: 'exercise',
      content: '',
      sender: 'therapist',
      timestamp: new Date(),
      status: 'sent',
      replyTo: null,
      reactions: [],
      imageUri: null,
      voiceDuration: null,
      exercise,
    };
    setMessages((prev) => [newMsg, ...prev]);
    setExerciseModalOpen(false);
    setTrayOpen(false);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  }, []);

  // ── React to a message ────────────────────────────────────────────────────
  const handleReact = useCallback((messageId, emoji) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const existing = m.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          if (existing.reacted) {
            // Remove own reaction
            const newReactions = m.reactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: r.count - 1, reacted: false }
                  : r
              )
              .filter((r) => r.count > 0);
            return { ...m, reactions: newReactions };
          } else {
            return {
              ...m,
              reactions: m.reactions.map((r) =>
                r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r
              ),
            };
          }
        } else {
          return {
            ...m,
            reactions: [...m.reactions, { emoji, count: 1, reacted: true }],
          };
        }
      })
    );
    setReactionTarget(null);
  }, []);

  // Cleanup timers
  useEffect(() => {
    return () => clearTimeout(typingTimerRef.current);
  }, []);

  // ── Render message + typing at top of inverted list ───────────────────────
  const renderItem = ({ item }) => (
    <MessageBubble
      message={item}
      onLongPress={(msg) => setReactionTarget(msg.id)}
      onReply={(msg) =>
        setReplyTo({
          id: msg.id,
          senderName: msg.sender === 'therapist' ? 'You' : conv.name,
          preview: msg.content || (msg.type === 'voice' ? '🎤 Voice note' : msg.type === 'exercise' ? `🏋️ ${msg.exercise?.name}` : '📷 Image'),
        })
      }
      onReact={(msgId, emoji) => handleReact(msgId, emoji)}
    />
  );

  const ListHeader = () =>
    typingVisible ? (
      <TypingIndicator avatarBg={conv.avatarBg} avatarEmoji={conv.avatarEmoji} />
    ) : null;

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>

      {/* ── Header — OUTSIDE KeyboardAvoidingView so offset is exact ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textDark} />
        </TouchableOpacity>

        <View style={[styles.headerAvatar, { backgroundColor: conv.avatarBg }]}>
          <Text style={styles.headerAvatarEmoji}>{conv.avatarEmoji}</Text>
          {conv.online && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>{conv.name}</Text>
          <Text style={styles.headerStatus}>
            {conv.online ? '🟢 Online' : 'Last seen recently'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7}>
            <Ionicons name="videocam-outline" size={20} color={colors.textDark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7}>
            <Ionicons name="call-outline" size={20} color={colors.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Chat Body ────────────────────────────────────────────── */}
      <View style={{ flex: 1 }}>
        {/* Message list (inverted = newest at bottom) */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          inverted
          ListHeaderComponent={<ListHeader />}
          ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToOffset({ offset: 0, animated: false })
          }
          onLayout={() =>
            flatListRef.current?.scrollToOffset({ offset: 0, animated: false })
          }
        />

        {/* Attachment Tray */}
        <AttachmentTray
          visible={trayOpen}
          onSelectImage={(uri) => {
            setAttachmentPreview(uri);
            setTrayOpen(false);
          }}
          onStartRecording={() => {
            setIsRecording(true);
            setTrayOpen(false);
          }}
          onQuickReplies={() => {
            setQuickRepliesOpen(true);
            setTrayOpen(false);
          }}
          onExercise={() => {
            setExerciseModalOpen(true);
            setTrayOpen(false);
          }}
        />

        {/* Composer — paddingBottom animated in sync with keyboard */}
        <Animated.View style={[styles.composerWrap, { paddingBottom: keyboardHeight, marginBottom: insets.bottom }]}>
          <ComposerBar
            value={inputText}
            onChangeText={setInputText}
            onSend={handleSend}
            onVoiceSend={handleVoiceSend}
            onToggleTray={() => setTrayOpen((v) => !v)}
            trayOpen={trayOpen}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            attachmentPreview={attachmentPreview}
            onRemoveAttachment={() => setAttachmentPreview(null)}
            isRecording={isRecording}
            onStartRecording={() => setIsRecording(true)}
            onCancelRecording={() => setIsRecording(false)}
          />
        </Animated.View>
      </View>

      {/* ── Reaction Picker (modal) ──────────────────────────── */}
      <ReactionPicker
        visible={!!reactionTarget}
        onReact={(emoji) => reactionTarget && handleReact(reactionTarget, emoji)}
        onClose={() => setReactionTarget(null)}
      />

      {/* ── Quick Replies Sheet ──────────────────────────────── */}
      <QuickRepliesSheet
        visible={quickRepliesOpen}
        onSelect={(text) => {
          setInputText(text);
          setQuickRepliesOpen(false);
        }}
        onClose={() => setQuickRepliesOpen(false)}
      />

      {/* ── Exercise Select Modal ────────────────────────────── */}
      <ExerciseSelectModal
        visible={exerciseModalOpen}
        onSelect={handleExerciseSelect}
        onClose={() => setExerciseModalOpen(false)}
      />
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },

  // Composer wrapper — gives bottom safe-area clearance
  composerWrap: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerAvatarEmoji: { fontSize: 20 },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: fonts.md,
    fontWeight: fonts.semibold,
    color: colors.textDark,
    lineHeight: 20,
  },
  headerStatus: {
    fontSize: fonts.xs,
    color: colors.textLight,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },

  messageList: {
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
});

export default ChatScreen;
