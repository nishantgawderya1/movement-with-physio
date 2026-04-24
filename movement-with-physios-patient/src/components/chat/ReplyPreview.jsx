import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

/**
 * Reply-to preview bar shown in the composer when replying to a message.
 * Displays a teal left-border strip with the quoted text and a dismiss button.
 *
 * @param {{ replyTo: { id: string, text: string } | null, onDismiss: Function }} props
 */
export default function ReplyPreview({ replyTo, onDismiss }) {
  if (!replyTo) return null;

  return (
    <View style={styles.container}>
      <View style={styles.strip} />
      <View style={styles.content}>
        <Text style={styles.label}>Replying to</Text>
        <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
          {replyTo.text}
        </Text>
      </View>
      <Pressable
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.closeBtn}
        accessibilityLabel="Dismiss reply"
      >
        <Ionicons name="close" size={18} color={colors.textMedium} />
      </Pressable>
    </View>
  );
}

var styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  strip: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  label: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.xs,
    color: colors.primary,
    marginBottom: 2,
  },
  text: {
    fontFamily: fonts.body.regular,
    fontSize: fonts.sm,
    color: colors.textMedium,
  },
  closeBtn: {
    paddingHorizontal: 10,
    alignSelf: 'center',
  },
});
