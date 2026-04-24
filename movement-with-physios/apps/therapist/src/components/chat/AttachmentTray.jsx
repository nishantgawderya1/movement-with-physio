// components/chat/AttachmentTray.jsx
// 2×2 slide-up tray of attachment action tiles

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

const TILE_DATA = [
  {
    id: 'photo',
    icon: 'image-outline',
    label: 'Photo & File',
    color: '#6366F1',
    bg: '#EEF2FF',
  },
  {
    id: 'voice',
    icon: 'mic-outline',
    label: 'Voice Note',
    color: '#EF4444',
    bg: '#FEE2E2',
  },
  {
    id: 'quick',
    icon: 'flash-outline',
    label: 'Quick Replies',
    color: '#F59E0B',
    bg: '#FEF3C7',
  },
  {
    id: 'exercise',
    icon: 'barbell-outline',
    label: 'Assign Exercise',
    color: '#22C55E',
    bg: '#DCFCE7',
  },
];

const AttachmentTray = ({
  visible,
  onSelectImage,
  onStartRecording,
  onQuickReplies,
  onExercise,
}) => {
  const slideAnim = useRef(new Animated.Value(120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 120,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handlePhotoTile = async () => {
    // Show both options: camera roll + document
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.length > 0) {
      onSelectImage(result.assets[0].uri);
    }
  };

  const handleDocumentTile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'application/msword'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        onSelectImage(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Document pick error:', e);
    }
  };

  const handleTilePress = (id) => {
    if (id === 'photo') handlePhotoTile();
    else if (id === 'voice') onStartRecording();
    else if (id === 'quick') onQuickReplies();
    else if (id === 'exercise') onExercise();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.tray,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.tilesRow}>
        {TILE_DATA.map((tile) => (
          <TouchableOpacity
            key={tile.id}
            style={styles.tile}
            onPress={() => handleTilePress(tile.id)}
            activeOpacity={0.75}
          >
            <View style={[styles.tileIcon, { backgroundColor: tile.bg }]}>
              <Ionicons name={tile.icon} size={24} color={tile.color} />
            </View>
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tray: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  tilesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tile: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tileIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
  },
});

export default AttachmentTray;
