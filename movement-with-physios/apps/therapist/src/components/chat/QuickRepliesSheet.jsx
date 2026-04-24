// components/chat/QuickRepliesSheet.jsx
// Modal sheet with predefined therapist reply templates

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  ScrollView,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_H } = Dimensions.get('window');

const TEMPLATES = [
  { id: 1, icon: '💪', text: 'Great progress! Keep it up 💪' },
  { id: 2, icon: '📋', text: 'Please complete today\'s exercises before our session.' },
  { id: 3, icon: '❓', text: 'How is the pain level today? (1-10)' },
  { id: 4, icon: '⏸️', text: 'Remember to rest between sets.' },
  { id: 5, icon: '📅', text: 'Your next session is scheduled. See you soon!' },
  { id: 6, icon: '🏃', text: 'Exercises assigned — check your program.' },
];

const QuickRepliesSheet = ({ visible, onSelect, onClose }) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 90,
        friction: 12,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
            >
              {/* Handle */}
              <View style={styles.handle} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Ionicons name="flash" size={18} color="#22C55E" />
                  <Text style={styles.headerTitle}>Quick Replies</Text>
                </View>
                <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>Tap a template to fill it in the message box</Text>

              {/* Template list */}
              <ScrollView showsVerticalScrollIndicator={false}>
                {TEMPLATES.map((tmpl, idx) => (
                  <TouchableOpacity
                    key={tmpl.id}
                    style={[
                      styles.templateRow,
                      idx < TEMPLATES.length - 1 && styles.templateBorder,
                    ]}
                    onPress={() => onSelect(tmpl.text)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.templateIcon}>{tmpl.icon}</Text>
                    <Text style={styles.templateText}>{tmpl.text}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#CBD5E0" />
                  </TouchableOpacity>
                ))}
                <View style={{ height: 24 }} />
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 12,
    maxHeight: SCREEN_H * 0.65,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A202C',
  },
  subtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 14,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  templateBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  templateIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  templateText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});

export default QuickRepliesSheet;
