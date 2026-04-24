// src/screens/messages/MessagesScreen.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Messages / Conversations list screen — Figma design.
// Backend dev: replace MOCK_CONVERSATIONS with real API call.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts, fontFamilies } from '../../constants/fonts';
import BottomTabBar from '../../components/BottomTabBar';
import { ROUTES } from '../../constants/routes';

// ── Mock data — replace with API calls ───────────────────────────────────────
const MOCK_CONVERSATIONS = [
  {
    id: 1,
    name: 'Priya Sharma',
    lastMessage: 'Thank you for the new exercises!',
    time: '5 min ago',
    unread: 2,
    online: true,
    avatarBg: '#FDE68A',
    avatarEmoji: '👩',
  },
  {
    id: 2,
    name: 'Rahul Patel',
    lastMessage: 'My knee is feeling much better',
    time: '1 hour ago',
    unread: 0,
    online: false,
    avatarBg: '#BFDBFE',
    avatarEmoji: '🧑',
  },
  {
    id: 3,
    name: 'Meera Singh',
    lastMessage: "Can we reschedule tomorrow's sess",
    time: '3 hours ago',
    unread: 0,
    online: true,
    avatarBg: '#FCA5A5',
    avatarEmoji: '👩',
  },
  {
    id: 4,
    name: 'Anjali Kumar',
    lastMessage: "I completed today's exercises",
    time: '1 day ago',
    unread: 0,
    online: false,
    avatarBg: '#DDD6FE',
    avatarEmoji: '👩',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
const MessagesScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const filteredConversations = MOCK_CONVERSATIONS.filter((c) =>
    searchText.trim() === '' ||
    c.name.toLowerCase().includes(searchText.toLowerCase())
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
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        contentContainerStyle={styles.listContent}
      >
        {filteredConversations.map((conv) => (
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

      {/* ── Bottom Tab Bar ───────────────────────────────────────────── */}
      <BottomTabBar activeTab="messages" onTabPress={handleTabPress} />

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
});

export default MessagesScreen;
