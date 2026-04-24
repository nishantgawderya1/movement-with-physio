// components/chat/ComposerBar.jsx
// Full bottom composer bar: [+] expand | text input (multiline) | mic/send

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VoiceRecorder from './VoiceRecorder';
import ReplyPreviewBar from './ReplyPreviewBar';

const ComposerBar = ({
  value,
  onChangeText,
  onSend,
  onVoiceSend,
  onToggleTray,
  trayOpen,
  replyTo,
  onCancelReply,
  attachmentPreview,
  onRemoveAttachment,
  isRecording,
  onStartRecording,
  onCancelRecording,
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const handleToggleTray = () => {
    Animated.timing(rotateAnim, {
      toValue: trayOpen ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    onToggleTray();
  };

  const plusRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const hasContent = value.trim().length > 0 || !!attachmentPreview;

  return (
    <View style={styles.outerContainer}>
      {/* Reply preview bar */}
      {replyTo && (
        <ReplyPreviewBar replyTo={replyTo} onCancel={onCancelReply} />
      )}

      {/* Attachment preview (image thumb) */}
      {attachmentPreview && (
        <View style={styles.attachPreviewContainer}>
          <Image
            source={{ uri: attachmentPreview }}
            style={styles.attachThumb}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.removeAttachBtn}
            onPress={onRemoveAttachment}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Main bar */}
      <View style={styles.bar}>
        {isRecording ? (
          <VoiceRecorder
            onCancel={onCancelRecording}
            onSend={onVoiceSend}
          />
        ) : (
          <>
            {/* [+] expand button */}
            <TouchableOpacity
              onPress={handleToggleTray}
              style={styles.expandBtn}
              activeOpacity={0.75}
            >
              <Animated.View style={{ transform: [{ rotate: plusRotate }] }}>
                <Ionicons name="add" size={24} color="#6B7280" />
              </Animated.View>
            </TouchableOpacity>

            {/* Text input */}
            <TextInput
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor="#9CA3AF"
              value={value}
              onChangeText={onChangeText}
              multiline
              maxLength={2000}
              scrollEnabled
            />

            {/* Right action: mic or send */}
            {hasContent ? (
              <TouchableOpacity
                onPress={onSend}
                style={styles.sendBtn}
                activeOpacity={0.85}
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onStartRecording}
                style={styles.micBtn}
                activeOpacity={0.75}
              >
                <Ionicons name="mic-outline" size={22} color="#6B7280" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  attachPreviewContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 10,
    position: 'relative',
  },
  attachThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  removeAttachBtn: {
    position: 'absolute',
    top: 4,
    left: 74,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  expandBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A202C',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
});

export default ComposerBar;
