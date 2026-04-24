import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Pressable,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';

/**
 * Attachment options data — 6 items in a 2-column grid.
 * @type {Array<{ icon: string, label: string }>}
 */
var ATTACHMENT_OPTIONS = [
  { icon: 'camera-outline',         label: 'Camera'   },
  { icon: 'image-outline',          label: 'Gallery'  },
  { icon: 'document-outline',       label: 'Document' },
  { icon: 'folder-outline',         label: 'Files'    },
  { icon: 'location-outline',       label: 'Location' },
  { icon: 'musical-notes-outline',  label: 'Audio'    },
];

/** Teal tint background for each icon circle */
var ICON_BG   = '#E8F5F0';
/** Icon foreground color */
var ICON_COLOR = '#1A5C4A';

/**
 * AnimatedSheet — the white panel that slides up.
 * Kept as an inner component so the Animated.Value is always fresh
 * when the Modal mounts (avoids stale ref issues).
 *
 * @param {{ onClose: () => void }} props
 */
function AnimatedSheet({ onClose }) {
  var translateY = useRef(new Animated.Value(400)).current;

  // Slide in on mount
  useEffect(function () {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();
  }, []);

  function slideDown(callback) {
    Animated.spring(translateY, {
      toValue: 400,
      useNativeDriver: true,
      bounciness: 0,
      speed: 20,
    }).start(function () {
      if (callback) callback();
    });
  }

  function handleClose() {
    slideDown(onClose);
  }

  function handleOptionPress(label) {
    console.log('[AttachmentSheet] selected:', label);
    slideDown(onClose);
  }

  return (
    /* Full-screen overlay — backdrop fills screen, sheet at bottom */
    <View style={styles.overlay}>
      {/* Backdrop — tap to dismiss */}
      <Pressable style={styles.backdrop} onPress={handleClose} />

      {/* Sliding sheet panel */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: translateY }] }]}
      >
        {/* Drag handle pill */}
        <View style={styles.handle} />

        {/* "Share" title */}
        <Text style={styles.sheetTitle}>Share</Text>

        {/* 2-column grid of 6 options */}
        <View style={styles.grid}>
          {ATTACHMENT_OPTIONS.map(function (option) {
            return (
              <Pressable
                key={option.label}
                style={styles.optionCell}
                onPress={function () { handleOptionPress(option.label); }}
                accessibilityLabel={option.label}
              >
                <View style={styles.iconCircle}>
                  <Ionicons
                    name={option.icon}
                    size={26}
                    color={ICON_COLOR}
                  />
                </View>
                <Text style={styles.optionLabel}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * AttachmentSheet — modal attachment picker that slides up from the bottom.
 *
 * Renders as a Modal with a semi-transparent backdrop and a spring-animated
 * white panel. Dismissed by tapping the backdrop or pressing any option.
 *
 * @param {{ visible: boolean, onClose: () => void }} props
 */
export default function AttachmentSheet({ visible, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Re-mount AnimatedSheet on every open so the spring always starts fresh */}
      {visible && <AnimatedSheet onClose={onClose} />}
    </Modal>
  );
}

var styles = StyleSheet.create({
  // Full-screen flex column — sheet anchors at the bottom
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  // Semi-transparent black backdrop fills remaining space above the sheet
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // White panel — positioned at bottom:0 (flex-end takes care of it)
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },

  // Gray pill drag handle at the very top of the sheet
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },

  sheetTitle: {
    fontFamily: fonts.body.semibold,
    fontSize: fonts.md,
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 22,
  },

  // 2-column flex-wrap grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 20,
  },

  // Each cell takes ~50% width, centers its content
  optionCell: {
    width: '30%',
    alignItems: 'center',
    gap: 8,
  },

  // Teal tinted circle behind the icon
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: ICON_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },

  optionLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.textMedium,
    textAlign: 'center',
  },
});
