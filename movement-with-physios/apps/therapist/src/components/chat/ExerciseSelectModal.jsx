// components/chat/ExerciseSelectModal.jsx
// Modal sheet for selecting an exercise to send as a card message

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

const EXERCISES = [
  { id: 1, name: 'Wall Slides', sets: 3, reps: 12, duration: '5 min', icon: '🏋️' },
  { id: 2, name: 'Clamshell Exercise', sets: 2, reps: 15, duration: '4 min', icon: '🦵' },
  { id: 3, name: 'Glute Bridge', sets: 3, reps: 10, duration: '6 min', icon: '💪' },
  { id: 4, name: 'Cervical Retraction', sets: 3, reps: 10, duration: '3 min', icon: '🧘' },
  { id: 5, name: 'Ankle Pumps', sets: 2, reps: 20, duration: '3 min', icon: '🦶' },
  { id: 6, name: 'Shoulder Pendulum', sets: 2, reps: 15, duration: '5 min', icon: '🔄' },
];

const ExerciseSelectModal = ({ visible, onSelect, onClose }) => {
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
              <View style={styles.handle} />

              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.headerIcon}>🏋️</Text>
                  <Text style={styles.headerTitle}>Assign Exercise</Text>
                </View>
                <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.subtitle}>Select an exercise to send as a card</Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                {EXERCISES.map((ex, idx) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={[
                      styles.row,
                      idx < EXERCISES.length - 1 && styles.rowBorder,
                    ]}
                    onPress={() => onSelect(ex)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconWrap}>
                      <Text style={styles.exIcon}>{ex.icon}</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.exName}>{ex.name}</Text>
                      <Text style={styles.exMeta}>
                        {ex.sets} sets × {ex.reps} reps · {ex.duration}
                      </Text>
                    </View>
                    <View style={styles.assignBtn}>
                      <Text style={styles.assignBtnText}>Assign</Text>
                    </View>
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
    maxHeight: SCREEN_H * 0.70,
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
  headerIcon: { fontSize: 18 },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exIcon: { fontSize: 22 },
  info: { flex: 1 },
  exName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 3,
  },
  exMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  assignBtn: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  assignBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
});

export default ExerciseSelectModal;
