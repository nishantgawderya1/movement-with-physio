// components/chat/VoiceRecorder.jsx
// Recording UI — red pulsing dot + timer + cancel/send buttons
// Rendered inside ComposerBar when recording mode is active

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const VoiceRecorder = ({ onCancel, onSend }) => {
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing red dot
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.35,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Start recording with expo-av
  useEffect(() => {
    let rec;
    const startRec = async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording: r } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        rec = r;
        setRecording(r);
      } catch (e) {
        // Fallback — device might not support in Expo Go
        console.warn('Recording not available:', e);
      }
    };
    startRec();
    return () => {
      // Stop on unmount
      if (rec) rec.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const handleSend = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        onSend({ uri, duration: formatTime(seconds) });
      } catch (e) {
        // fallback
        onSend({ uri: null, duration: formatTime(seconds) });
      }
    } else {
      onSend({ uri: null, duration: formatTime(seconds) });
    }
  };

  const handleCancel = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {}
    }
    onCancel();
  };

  return (
    <View style={styles.container}>
      {/* Cancel */}
      <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn} activeOpacity={0.7}>
        <Ionicons name="close" size={22} color="#EF4444" />
      </TouchableOpacity>

      {/* Pulse + Timer */}
      <View style={styles.center}>
        <Animated.View style={[styles.dot, { transform: [{ scale: pulseAnim }] }]} />
        <Text style={styles.timer}>Recording... {formatTime(seconds)}</Text>
      </View>

      {/* Send */}
      <TouchableOpacity onPress={handleSend} style={styles.sendBtn} activeOpacity={0.8}>
        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 4,
    gap: 12,
  },
  cancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  timer: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VoiceRecorder;
