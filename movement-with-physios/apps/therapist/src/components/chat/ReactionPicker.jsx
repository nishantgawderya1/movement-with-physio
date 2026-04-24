// components/chat/ReactionPicker.jsx
// Floating emoji reaction picker with:
//  • Spring scale + fade entrance
//  • 35ms staggered emoji pop-in
//  • Reverse dismiss animation before unmounting

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';

const REACTIONS = ['👍', '❤️', '😊', '💪', '👏', '✅'];

const ReactionPicker = ({ visible, onReact, onClose }) => {
  // ── Picker container animation ───────────────────────────────────────────
  const containerScale = useRef(new Animated.Value(0.6)).current;
  const containerFade  = useRef(new Animated.Value(0)).current;

  // ── Per-emoji stagger anims (one ref per emoji, stable across renders) ───
  const emojiAnims = useRef(REACTIONS.map(() => new Animated.Value(0))).current;

  // Track whether the modal should render at all (kept open through dismiss anim)
  const [modalVisible, setModalVisible] = useState(false);
  const dismissingRef = useRef(false);

  // ── Open ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      dismissingRef.current = false;
      setModalVisible(true);

      // Reset all values
      containerScale.setValue(0.6);
      containerFade.setValue(0);
      emojiAnims.forEach((a) => a.setValue(0));

      // Container enters
      Animated.parallel([
        Animated.spring(containerScale, {
          toValue: 1,
          speed: 18,
          bounciness: 10,
          useNativeDriver: true,
        }),
        Animated.timing(containerFade, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      // Staggered emoji pop-ins (35ms apart)
      Animated.stagger(
        35,
        emojiAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            speed: 20,
            bounciness: 8,
            useNativeDriver: true,
          })
        )
      ).start();
    }
  }, [visible]);

  // ── Dismiss (reverse) then actually close ────────────────────────────────
  const dismiss = useCallback(
    (afterDismiss) => {
      if (dismissingRef.current) return;
      dismissingRef.current = true;

      Animated.parallel([
        Animated.timing(containerScale, {
          toValue: 0.6,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(containerFade, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
        afterDismiss && afterDismiss();
      });
    },
    []
  );

  // When visible flips to false from outside (e.g. after handleReact)
  // we run the dismiss anim rather than hard-hiding
  useEffect(() => {
    if (!visible && modalVisible && !dismissingRef.current) {
      dismiss(onClose);
    }
  }, [visible]);

  return (
    <Modal
      transparent
      animationType="none"
      visible={modalVisible}
      onRequestClose={() => dismiss(onClose)}
    >
      <TouchableWithoutFeedback onPress={() => dismiss(onClose)}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.picker,
                {
                  opacity: containerFade,
                  transform: [{ scale: containerScale }],
                },
              ]}
            >
              {REACTIONS.map((emoji, index) => (
                <Animated.View
                  key={emoji}
                  style={{
                    opacity: emojiAnims[index],
                    transform: [{ scale: emojiAnims[index] }],
                  }}
                >
                  <TouchableOpacity
                    style={styles.emojiBtn}
                    onPress={() => {
                      dismiss(() => {
                        onReact(emoji);
                        onClose();
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
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
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  picker: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  emojiBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 26,
  },
});

export default ReactionPicker;
