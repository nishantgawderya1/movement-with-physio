// src/screens/messages/MessagesScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Messages / Conversations list screen — Figma design.
// Backend dev: replace MOCK_CONVERSATIONS with real API call.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Modal,
  Pressable,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';
import BottomTabBar from '../../components/BottomTabBar';
import { ROUTES } from '../../constants/routes';
import { chatService } from '../../services/chatService';

// ── Component ─────────────────────────────────────────────────────────────────
const MessagesScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  const loadConversations = useCallback(() => {
    chatService.getConversations().then((res) => {
      if (res.success) setConversations(res.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
    loadConversations();
  }, [loadConversations]);

  // Refresh when returning from a chat
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadConversations);
    return unsub;
  }, [navigation, loadConversations]);

  const openNewChat = () => {
    setNewChatOpen(true);
    setClientsLoading(true);
    chatService.listMyClients().then((res) => {
      if (res.success) setClients(res.data);
      else Alert.alert('Could not load clients', res.error || 'Try again');
      setClientsLoading(false);
    });
  };

  const startChatWithClient = async (client) => {
    setNewChatOpen(false);
    const res = await chatService.createRoomWithPatient(client.id);
    if (!res.success) {
      Alert.alert('Could not start chat', res.error || 'Try again');
      return;
    }
    navigation.navigate(ROUTES.CHAT, { conv: res.data });
  };

  const filteredConversations = conversations.filter((c) =>
    searchText.trim() === '' ||
    (c.name || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const handleTabPress = (tabId) => {
    if (tabId === 'home')     navigation.navigate(ROUTES.DASHBOARD);
    if (tabId === 'clients')  navigation.navigate(ROUTES.CLIENTS);
    if (tabId === 'exercise') navigation.navigate(ROUTES.EXERCISES);
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.newChatBtn} onPress={openNewChat} activeOpacity={0.7}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Search ──────────────────────────────────────────────────── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={15} color={colors.placeholder} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={colors.placeholder}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* ── Conversation List ────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          contentContainerStyle={styles.listContent}
        >
          {filteredConversations.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>Tap the + button to start a chat with one of your clients.</Text>
            </View>
          ) : filteredConversations.map((conv) => (
            <TouchableOpacity key={conv.id} style={styles.row} activeOpacity={0.8}
              onPress={() => navigation.navigate(ROUTES.CHAT, { conv })}
            >

              {/* Avatar with online dot */}
              <View style={styles.avatarWrap}>
                <View style={[styles.avatar, { backgroundColor: conv.avatarBg }]}>
                  <Text style={styles.avatarEmoji}>{conv.avatarEmoji}</Text>
                </View>
                {conv.online && <View style={styles.onlineDot} />}
              </View>

              {/* Name + preview */}
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.convName}>{conv.name}</Text>
                  <Text style={styles.convTime}>{conv.time}</Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text style={styles.convPreview} numberOfLines={1}>{conv.lastMessage}</Text>
                  {conv.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{conv.unread}</Text>
                    </View>
                  )}
                </View>
              </View>

            </TouchableOpacity>
          ))}
          <View style={{ height: 16 }} />
        </Animated.ScrollView>
      )}

      {/* ── Bottom Tab Bar ───────────────────────────────────────────── */}
      <BottomTabBar activeTab="messages" onTabPress={handleTabPress} />

      {/* ── New Chat Modal ───────────────────────────────────────────── */}
      <Modal
        visible={newChatOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNewChatOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setNewChatOpen(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Start a new chat</Text>
          {clientsLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : clients.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptySubtitle}>No clients yet. Once a patient books a session with you, they'll appear here.</Text>
            </View>
          ) : (
            <FlatList
              data={clients}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.clientRow} onPress={() => startChatWithClient(item)}>
                  <View style={[styles.avatar, { backgroundColor: item.avatarBg }]}>
                    <Text style={styles.avatarEmoji}>{item.avatarEmoji}</Text>
                  </View>
                  <Text style={styles.clientName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.xl,
    color: colors.textDark,
  },

  searchRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder,
    paddingHorizontal: 12, height: 40,
  },
  searchInput: {
    flex: 1, fontSize: fonts.sm, color: colors.textDark, paddingVertical: 0,
  },

  listContent: { paddingTop: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },

  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 22 },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2, borderColor: colors.white,
  },

  rowBody: { flex: 1 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convName: {
    fontSize: fonts.md, fontWeight: fonts.semibold, color: colors.textDark,
  },
  convTime: { fontSize: fonts.xs, color: colors.textLight },

  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  convPreview: {
    flex: 1, fontSize: fonts.sm, color: colors.textMedium, marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10, minWidth: 20, height: 20,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { fontSize: fonts.xs, fontWeight: fonts.bold, color: colors.white },

  // Loading / empty
  loadingWrap: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 40, marginBottom: 4 },
  emptyTitle: {
    fontSize: fonts.lg, fontWeight: fonts.semibold, color: colors.textDark, marginTop: 4,
  },
  emptySubtitle: {
    fontSize: fonts.sm, color: colors.textMedium, textAlign: 'center', lineHeight: 20,
  },

  // New chat header button
  newChatBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1, borderColor: colors.cardBorder,
  },

  // New chat modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingTop: 8, paddingHorizontal: 18, paddingBottom: 24,
    maxHeight: '70%',
  },
  modalHandle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: colors.cardBorder, marginBottom: 12,
  },
  modalTitle: {
    fontFamily: fontFamilies.instrumentSerif,
    fontSize: fonts.lg, color: colors.textDark, marginBottom: 12,
  },
  clientRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 14,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  clientName: {
    fontSize: fonts.md, fontWeight: fonts.semibold, color: colors.textDark,
  },
});

export default MessagesScreen;
