import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  var [pickerOpen, setPickerOpen] = useState(false);
  var [therapists, setTherapists] = useState([]);
  var [therapistsLoading, setTherapistsLoading] = useState(false);

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
    var unsub = navigation.addListener('focus', loadConversations);
    return unsub;
  }, [navigation, loadConversations]);

  function openPicker() {
    setPickerOpen(true);
    setTherapistsLoading(true);
    chatService.listAvailableTherapists().then(function (result) {
      if (result.success) {
        setTherapists(result.data);
      } else {
        Alert.alert('Could not load therapists', result.error || 'Try again');
      }
      setTherapistsLoading(false);
    });
  }

  function closePicker() {
    setPickerOpen(false);
  }

  async function startChatWith(therapist) {
    setPickerOpen(false);
    var res = await chatService.createRoom(therapist.id);
    if (!res.success) {
      Alert.alert('Could not start chat', res.error || 'Try again');
      return;
    }
    navigation.navigate(PATIENT_ROUTES.CHAT_ROOM, {
      roomId: res.data.roomId,
      therapistId: res.data.therapistId || (therapist && therapist.id) || null,
      therapistName: res.data.therapistName || therapist.name,
      therapistAvatar: res.data.therapistAvatar,
      isOnline: res.data.isOnline,
    });
    // Refresh list when the user lands back here.
    loadConversations();
  }

  function handleConversationPress(conv) {
    navigation.navigate(PATIENT_ROUTES.CHAT_ROOM, {
      roomId: conv.roomId,
      therapistId: conv.therapistId,
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
          Tap the + button above to start a chat with a therapist.
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

  function getInitials(name) {
    if (!name || !name.trim()) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function renderTherapistRow({ item }) {
    return (
      <TouchableOpacity
        style={styles.therapistRow}
        onPress={function () { startChatWith(item); }}
        activeOpacity={0.7}
      >
        <View style={styles.therapistAvatar}>
          <Text style={styles.therapistAvatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.therapistBody}>
          <Text style={styles.therapistName}>{item.name}</Text>
          {item.specialty ? <Text style={styles.therapistSpecialty}>{item.specialty}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
      </TouchableOpacity>
    );
  }

  return (
    <TabScreenWrapper tabIndex={2}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity style={styles.newChatBtn} onPress={openPicker} activeOpacity={0.7}>
            <Ionicons name="add" size={22} color={colors.primary} />
          </TouchableOpacity>
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

        {/* Therapist picker modal */}
        <Modal
          visible={pickerOpen}
          transparent
          animationType="slide"
          onRequestClose={closePicker}
        >
          <Pressable style={styles.modalBackdrop} onPress={closePicker} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Start a new chat</Text>
            {therapistsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : therapists.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptySubtitle}>
                  No therapists available yet.
                </Text>
              </View>
            ) : (
              <FlatList
                data={therapists}
                keyExtractor={function (item) { return item.id; }}
                renderItem={renderTherapistRow}
                ItemSeparatorComponent={renderSeparator}
              />
            )}
          </View>
        </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.heading.regular,
    fontSize: 22,
    lineHeight: 22 * 1.35,
    color: colors.textDark,
  },
  newChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
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
    minHeight: 120,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
    minHeight: 120,
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

  // Modal
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    maxHeight: '70%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 10,
  },
  modalTitle: {
    fontFamily: fonts.heading.regular,
    fontSize: 18,
    color: colors.textDark,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },

  // Therapist picker row
  therapistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  therapistAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  therapistAvatarText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary,
  },
  therapistBody: {
    flex: 1,
  },
  therapistName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textDark,
  },
  therapistSpecialty: {
    fontSize: fonts.xs,
    color: colors.textMedium,
    marginTop: 2,
  },
});
