// components/chat/ReplyPreviewBar.jsx
// Green-bordered reply-to preview bar shown above the composer

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ReplyPreviewBar = ({ replyTo, onCancel }) => {
  if (!replyTo) return null;

  return (
    <View style={styles.container}>
      <View style={styles.greenBar} />
      <View style={styles.content}>
        <Text style={styles.senderName} numberOfLines={1}>
          {replyTo.senderName}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {replyTo.preview}
        </Text>
      </View>
      <TouchableOpacity onPress={onCancel} style={styles.closeBtn} activeOpacity={0.7}>
        <Ionicons name="close" size={18} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FFF8',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  greenBar: {
    width: 3,
    height: '100%',
    minHeight: 34,
    backgroundColor: '#22C55E',
    borderRadius: 2,
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22C55E',
    marginBottom: 2,
  },
  preview: {
    fontSize: 12,
    color: '#6B7280',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});

export default ReplyPreviewBar;
