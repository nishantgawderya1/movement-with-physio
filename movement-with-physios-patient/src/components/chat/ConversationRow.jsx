import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

/**
 * Formats an ISO timestamp for conversation list display.
 * @param {string} isoString
 * @returns {string}
 */
function formatTime(isoString) {
  var d = new Date(isoString);
  var now = new Date();
  var diffMs = now - d;
  var diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return diffMins + 'm';
  var diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return diffHrs + 'h';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

/**
 * Generates initials from a therapist's full name.
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  var parts = name.split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * A single conversation row in the messages list.
 * WhatsApp-style: avatar | name + last message | time + unread badge
 *
 * @param {{
 *   conversation: {
 *     roomId: string,
 *     therapistName: string,
 *     therapistAvatar: string | null,
 *     lastMessage: string,
 *     lastMessageTime: string,
 *     unreadCount: number,
 *     isOnline: boolean
 *   },
 *   onPress: Function
 * }} props
 */
export default function ConversationRow({ conversation, onPress }) {
  var initials = getInitials(conversation.therapistName);
  var hasUnread = conversation.unreadCount > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={'Chat with ' + conversation.therapistName}
    >
      {/* Avatar with online dot */}
      <View style={styles.avatarWrapper}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        {conversation.isOnline && <View style={styles.onlineDot} />}
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{conversation.therapistName}</Text>
          <Text style={styles.time}>{formatTime(conversation.lastMessageTime)}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.preview, hasUnread && styles.previewBold]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {conversation.lastMessage}
          </Text>
          {hasUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

var styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },

  // Avatar
  avatarWrapper: {
    position: 'relative',
    width: 52,
    height: 52,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.md,
    color: '#FFFFFF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#48BB78',
    borderWidth: 2,
    borderColor: colors.background,
  },

  // Content
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.md,
    color: colors.textDark,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.textLight,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.sm,
    color: colors.textMedium,
    flex: 1,
    marginRight: 8,
  },
  previewBold: {
    fontFamily: fonts.body.semibold,
    color: colors.textDark,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontFamily: fonts.body.semibold,
    fontSize: 11,
    color: '#FFFFFF',
  },
});
