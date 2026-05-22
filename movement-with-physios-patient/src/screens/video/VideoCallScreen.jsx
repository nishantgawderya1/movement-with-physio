/**
 * VideoCallScreen — full-screen video session UI for the patient.
 *
 * Layout (z-order, back to front):
 *   1. Remote stream    — RTCView, edge-to-edge, objectFit="cover"
 *   2. "Waiting" placeholder — fills the screen until remote stream arrives
 *   3. Local PiP        — small RTCView (110x150), top-right, draggable
 *   4. Top status bar   — therapist name, elapsed timer (width-constrained
 *                          so it can't run under the PiP)
 *   5. Control bar      — mute / camera / end / switch, anchored to the
 *                          bottom safe-area inset via SafeAreaView edges=['bottom']
 *
 * Ported from movement-with-physios/apps/therapist/src/screens/video/VideoCallScreen.jsx
 * with patient-specific simplifications:
 *   - Patient is the OFFERER (useVideoCall handles the role flip).
 *   - No AssessmentPanel — patient never sees the assessment. All
 *     panel-height plumbing (Animated.Value mirror, addListener,
 *     DEFAULT_EXPANDED / COLLAPSED_HEIGHT) removed.
 *   - No body-part badge.
 *   - assessmentId is accepted in route params for parity but unused.
 *   - selfUserId resolution removed — useVideoCall reads it internally
 *     via tokenProvider.getMyUserId(); we just join() once on mount.
 *   - "Waiting for patient" → "Waiting for therapist…".
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RTCView } from 'react-native-webrtc';

import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { PATIENT_ROUTES } from '../../constants/routes';
import { useVideoCall } from '../../hooks/useVideoCall';
import { getCall } from '../../services/videoCallService';

var PIP_WIDTH = 110;
var PIP_HEIGHT = 150;
var PIP_MARGIN = 12;
var TOP_PAD = 24; // budget for top-bar paddingHorizontal on each side

function formatElapsed(seconds) {
  if (seconds < 0) seconds = 0;
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  return m + ':' + (s < 10 ? '0' + s : s);
}

export default function VideoCallScreen({ navigation, route }) {
  var params = route.params || {};
  var callId = params.callId;
  var otherUserId = params.otherUserId;
  // assessmentId accepted in params for parity with therapist route signature;
  // patient never uses it.
  // var assessmentId = params.assessmentId;
  var bookingId = params.bookingId;

  var { width: SCREEN_WIDTH } = useWindowDimensions();

  var [callMeta, setCallMeta] = useState(null);

  // ── Load call meta for the top-bar name display.
  useEffect(function () {
    var cancelled = false;
    async function loadMeta() {
      var resp = await getCall(callId);
      if (!cancelled && resp.success) {
        setCallMeta(resp.data);
      }
    }
    loadMeta();
    return function () { cancelled = true; };
  }, [callId]);

  var hook = useVideoCall({
    callId: callId,
    otherUserId: otherUserId,
    role: 'patient',
  });

  // ── Trigger join() once on mount. Gated on hasJoinedRef so React
  //    StrictMode / re-renders can't double-join. The hook also has
  //    its own internal hasJoinedRef guard.
  var hasJoinedRef = useRef(false);
  useEffect(function () {
    if (!hasJoinedRef.current) {
      hasJoinedRef.current = true;
      hook.join();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Elapsed timer
  var [elapsed, setElapsed] = useState(0);
  var startedAtRef = useRef(null);
  useEffect(function () {
    if (hook.callStatus === 'active' && !startedAtRef.current) {
      startedAtRef.current = Date.now();
    }
    var t = setInterval(function () {
      if (startedAtRef.current) {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);
    return function () { clearInterval(t); };
  }, [hook.callStatus]);

  // ── End call + navigate
  async function handleEndCall() {
    await hook.leave();
    navigation.replace(PATIENT_ROUTES.SESSION_ENDED, {
      callId: callId,
      bookingId: bookingId,
      durationSeconds: elapsed,
    });
  }

  // ── Auto-navigate when peer ends the call
  useEffect(function () {
    if (hook.callStatus === 'ended') {
      navigation.replace(PATIENT_ROUTES.SESSION_ENDED, {
        callId: callId,
        bookingId: bookingId,
        durationSeconds: elapsed,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.callStatus]);

  // ── Draggable PiP (PanResponder + Animated.ValueXY). Initial position
  //    top-right; once the user drags it, their chosen position wins.
  var pipPos = useRef(new Animated.ValueXY({
    x: SCREEN_WIDTH - PIP_WIDTH - PIP_MARGIN,
    y: 80,
  })).current;
  var pipPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: function (_e, g) {
        return Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4;
      },
      onPanResponderGrant: function () {
        pipPos.setOffset({ x: pipPos.x._value, y: pipPos.y._value });
        pipPos.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pipPos.x, dy: pipPos.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: function () {
        pipPos.flattenOffset();
      },
    })
  ).current;

  var remoteUrl = hook.remoteStream ? hook.remoteStream.toURL() : null;
  var localUrl  = hook.localStream  ? hook.localStream.toURL()  : null;
  var nameMaxWidth = SCREEN_WIDTH - PIP_WIDTH - TOP_PAD - PIP_MARGIN;

  return (
    <View style={styles.root}>
      {/* Remote stream (full screen) */}
      {remoteUrl ? (
        <RTCView streamURL={remoteUrl} style={StyleSheet.absoluteFill} objectFit="cover" />
      ) : (
        <View style={[styles.placeholder, StyleSheet.absoluteFill]}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.placeholderText}>
            {hook.callStatus === 'failed' ? 'Connection failed' : 'Waiting for therapist…'}
          </Text>
        </View>
      )}

      {/* Local PiP — top-right by default */}
      {localUrl ? (
        <Animated.View
          style={[styles.pip, { transform: pipPos.getTranslateTransform() }]}
          {...pipPanResponder.panHandlers}
        >
          <RTCView
            streamURL={localUrl}
            style={StyleSheet.absoluteFill}
            objectFit="cover"
            mirror={true}
            zOrder={1}
          />
        </Animated.View>
      ) : null}

      {/* Top status bar */}
      <SafeAreaView edges={['top']} style={styles.topBarWrap} pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={{ flex: 1, maxWidth: nameMaxWidth }}>
            <Text style={styles.patientName} numberOfLines={1}>
              {(callMeta && callMeta.otherParty && callMeta.otherParty.name) || 'Therapist'}
            </Text>
            <View style={styles.topBarSub}>
              <Text style={styles.elapsed}>{formatElapsed(elapsed)}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Error overlay */}
      {(hook.error === 'PEER_CONNECTION_FAILED' || hook.error === 'OTHER_PARTY_NOT_ANSWERING') ? (
        <View style={styles.errorOverlay} pointerEvents="auto">
          <Text style={styles.errorTitle}>
            {hook.error === 'OTHER_PARTY_NOT_ANSWERING' ? 'No answer' : 'Connection failed'}
          </Text>
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.retryBtn} onPress={hook.join}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.endBtn} onPress={handleEndCall}>
              <Ionicons name="call" size={18} color="#FFFFFF" />
              <Text style={styles.endBtnText}>End</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Control bar — anchored to the bottom safe-area inset. */}
      <SafeAreaView
        edges={['bottom']}
        style={styles.controlsWrap}
        pointerEvents="box-none"
      >
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.controlBtn} onPress={hook.toggleMute}>
            <Ionicons
              name={hook.isMuted ? 'mic-off' : 'mic'}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={hook.toggleCamera}>
            <Ionicons
              name={hook.isCameraOff ? 'videocam-off' : 'videocam'}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, styles.endControl]} onPress={handleEndCall}>
            <Ionicons name="call" size={20} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={hook.switchCamera}>
            <Ionicons name="camera-reverse" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

var styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  placeholder: {
    backgroundColor: '#0a0a0a',
    alignItems: 'center', justifyContent: 'center',
    gap: 12,
  },
  placeholderText: { color: '#FFFFFF', fontSize: fonts.sm },

  pip: {
    position: 'absolute',
    width: PIP_WIDTH, height: PIP_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },

  topBarWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    gap: 8,
  },
  patientName: {
    color: '#FFFFFF', fontSize: fonts.md, fontWeight: fonts.semibold,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4,
  },
  topBarSub: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  elapsed: {
    color: '#FFFFFF', fontSize: fonts.xs, fontWeight: fonts.medium,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3,
  },

  controlsWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
  },
  controlsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 20, paddingVertical: 10,
  },
  controlBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(30,30,30,0.78)',
    alignItems: 'center', justifyContent: 'center',
  },
  endControl: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: colors.danger,
  },

  errorOverlay: {
    position: 'absolute', top: '40%', left: 24, right: 24,
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderRadius: 16, padding: 20, alignItems: 'center', gap: 12,
  },
  errorTitle: { color: '#FFFFFF', fontSize: fonts.lg, fontWeight: fonts.semibold },
  errorActions: { flexDirection: 'row', gap: 10 },
  retryBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  retryBtnText: { color: colors.textDark, fontWeight: fonts.semibold, fontSize: fonts.sm },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
    backgroundColor: colors.danger,
  },
  endBtnText: { color: '#FFFFFF', fontWeight: fonts.semibold, fontSize: fonts.sm },
});
