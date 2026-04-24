import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';
import { chatService } from '../../services/chatService';
import TabScreenWrapper from '../../components/navigation/TabScreenWrapper';
import ConversationRow from '../../components/chat/ConversationRow';

/**
 * Messages screen — WhatsApp-style conversation list.
 * Tab root screen for the Chat tab (index 2).
 *
 * @param {{ navigation: object }} props
 */
export default function MessagesScreen({ navigation }) {
  var insets = useSafeAreaInsets();
  var [conversations, setConversations] = useState([]);
  var [loading, setLoading] = useState(true);

  var loadConversations = useCallback(function () {
    chatService.getConversations().then(function (result) {
      if (result.success) {
        setConversations(result.data);
      }
      setLoading(false);
    });
  }, []);

  useEffect(function () {
    loadConversations();
  }, []);

  function handleConversationPress(conv) {
    navigation.navigate(PATIENT_ROUTES.CHAT_ROOM, {
      roomId: conv.roomId,
      therapistName: conv.therapistName,
      therapistAvatar: conv.therapistAvatar,
      isOnline: conv.isOnline,
    });
  }

  function renderSeparator() {
    return (
      <View
        style={styles.separator}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    );
  }

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={styles.emptyTitle}>No conversations yet</Text>
        <Text style={styles.emptySubtitle}>
          Your therapist will reach out once your session is booked.
        </Text>
      </View>
    );
  }

  function renderItem({ item }) {
    return (
      <ConversationRow
        conversation={item}
        onPress={function () { handleConversationPress(item); }}
      />
    );
  }

  return (
    <TabScreenWrapper tabIndex={2}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>

        {/* Divider */}
        <View style={styles.headerDivider} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={function (item) { return item.roomId; }}
            renderItem={renderItem}
            ItemSeparatorComponent={renderSeparator}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={[
              styles.listContent,
              conversations.length === 0 && styles.listContentEmpty,
              { paddingBottom: 60 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </TabScreenWrapper>
  );
}

var styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTitle: {
    fontFamily: fonts.heading.regular,
    fontSize: 22,
    lineHeight: 22 * 1.35,
    color: colors.textDark,
  },
  headerDivider: {
    height: 0.5,
    backgroundColor: colors.border,
  },

  // List
  listContent: {
    paddingTop: 4,
  },
  listContentEmpty: {
    flex: 1,
  },
  separator: {
    height: 0.5,
    backgroundColor: colors.divider,
    marginLeft: 80,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: fonts.heading.regular,
    fontSize: 20,
    color: colors.textDark,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.sm,
    color: colors.textMedium,
    textAlign: 'center',
    lineHeight: fonts.sm * 1.6,
  },
});
