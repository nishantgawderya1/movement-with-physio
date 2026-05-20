/**
 * VideoCallScreen — the full-screen video session UI for the therapist.
 *
 * Layout (z-order, back to front):
 *   1. Remote stream  — RTCView, edge-to-edge, objectFit="cover"
 *   2. Local PiP      — small RTCView (110x150), draggable via PanResponder
 *   3. Top status bar — patient name, body part badge, elapsed timer
 *   4. AssessmentPanel— bottom-sheet, persistent (only if assessmentId set)
 *   5. Control bar    — mute / camera / switch / end-call (large red)
 *
 * Therapist is the ANSWERER. The useVideoCall hook owns the peer
 * connection + signaling; this screen owns the layout + control wiring.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RTCView } from 'react-native-webrtc';

import { colors } from '../../constants/colors';
import { fonts } from '../../constants/fonts';
import { useVideoCall } from '../../hooks/useVideoCall';
import AssessmentPanel from '../../components/video/AssessmentPanel';
import BodyPartBadge from '../../components/video/BodyPartBadge';
import { getCall } from '../../services/videoCallService';

var SCREEN = Dimensions.get('window');

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
  var assessmentId = params.assessmentId;
  var bookingId = params.bookingId;

  // Self user id — resolved via the ClerkTokenBridge helper if available,
  // otherwise null. The backend only needs to know which side we are for
  // future-proofing; the signaling 'to' field uses otherUserId directly.
  var [selfUserId, setSelfUserId] = useState(null);
  var [callMeta, setCallMeta] = useState(null);

  useEffect(function () {
    var cancelled = false;
    async function loadMeta() {
      var resp = await getCall(callId);
      if (!cancelled && resp.success) {
        setCallMeta(resp.data);
        // The /video/calls/:id response includes participants; pick the entry
        // whose role is 'therapist' — that's us.
        var parts = (resp.data && resp.data.participants) || [];
        var me = parts.find(function (p) { return p.role === 'therapist'; });
        if (me) setSelfUserId(me.id);
      }
    }
    loadMeta();
    return function () { cancelled = true; };
  }, [callId]);

  var hook = useVideoCall({
    callId: callId,
    selfUserId: selfUserId,
    otherUserId: otherUserId,
    role: 'therapist',
  });

  // Trigger join() once we have the self id (so the backend can record
  // joinState by the correct ObjectId).
  var hasJoinedRef = useRef(false);
  useEffect(function () {
    if (!hasJoinedRef.current) {
      hasJoinedRef.current = true;
      hook.join();
    }
  }, [hook]);

  // ── Elapsed timer ───────────────────────────────────────────────
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

  // ── End call + navigate ─────────────────────────────────────────
  async function handleEndCall() {
    await hook.leave();
    navigation.replace('SessionEnded', {
      callId: callId,
      bookingId: bookingId,
      assessmentId: assessmentId,
      durationSeconds: elapsed,
    });
  }

  // ── Auto-navigate on call_ended from the peer side ──────────────
  useEffect(function () {
    if (hook.callStatus === 'ended') {
      navigation.replace('SessionEnded', {
        callId: callId,
        bookingId: bookingId,
        assessmentId: assessmentId,
        durationSeconds: elapsed,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.callStatus]);

  // ── Draggable PiP (PanResponder + Animated.ValueXY) ─────────────
  var pipPos = useRef(new Animated.ValueXY({ x: 12, y: 80 })).current;
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

  var bodyPart = (callMeta && callMeta.assessmentMode && callMeta.assessmentId)
    ? null   // will resolve via Booking → assessment.bodyParts in detail screen; for now derive from meta
    : null;
  // /video/calls/:id doesn't currently expose bodyParts inline. Caller routes
  // generally pass assessmentId; AssessmentPanel will surface body context.

  var remoteUrl = hook.remoteStream ? hook.remoteStream.toURL() : null;
  var localUrl  = hook.localStream  ? hook.localStream.toURL()  : null;

  return (
    <View style={styles.root}>
      {/* Remote stream (full screen) */}
      {remoteUrl ? (
        <RTCView streamURL={remoteUrl} style={StyleSheet.absoluteFill} objectFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <ActivityIndicator color={colors.white} />
          <Text style={styles.placeholderText}>
            {hook.callStatus === 'failed' ? 'Connection failed' : 'Waiting for patient to join…'}
          </Text>
        </View>
      )}

      {/* Local PiP */}
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
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName} numberOfLines={1}>
              {(callMeta && callMeta.otherParty && callMeta.otherParty.name) || 'Patient'}
            </Text>
            <View style={styles.topBarSub}>
              <Text style={styles.elapsed}>{formatElapsed(elapsed)}</Text>
              {bodyPart ? <BodyPartBadge bodyPart={bodyPart} compact /> : null}
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
              <Ionicons name="call" size={18} color={colors.white} />
              <Text style={styles.endBtnText}>End</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Control bar — above the AssessmentPanel by virtue of being absolutely
          positioned above its top edge. */}
      <SafeAreaView edges={['bottom']} style={styles.controlsWrap} pointerEvents="box-none">
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.controlBtn} onPress={hook.toggleMute}>
            <Ionicons
              name={hook.isMuted ? 'mic-off' : 'mic'}
              size={20}
              color={colors.white}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={hook.toggleCamera}>
            <Ionicons
              name={hook.isCameraOff ? 'videocam-off' : 'videocam'}
              size={20}
              color={colors.white}
            />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlBtn, styles.endControl]} onPress={handleEndCall}>
            <Ionicons name="call" size={20} color={colors.white} style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={hook.switchCamera}>
            <Ionicons name="camera-reverse" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* AssessmentPanel — only mounted when this is a therapist_driven call */}
      {assessmentId ? (
        <AssessmentPanel
          assessmentId={assessmentId}
          onComplete={function () { /* keep the panel showing until end of call */ }}
        />
      ) : null}
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
  placeholderText: { color: colors.white, fontSize: fonts.sm },

  pip: {
    position: 'absolute',
    width: 110, height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: '#000',
  },

  topBarWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    gap: 8,
  },
  patientName: {
    color: colors.white, fontSize: fonts.md, fontWeight: fonts.semibold,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4,
  },
  topBarSub: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  elapsed: {
    color: colors.white, fontSize: fonts.xs, fontWeight: fonts.medium,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3,
  },

  controlsWrap: {
    position: 'absolute', left: 0, right: 0,
    bottom: 360,    // sits above the AssessmentPanel's expanded ~360px
  },
  controlsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 16, paddingVertical: 10,
  },
  controlBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(30,30,30,0.78)',
    alignItems: 'center', justifyContent: 'center',
  },
  endControl: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: colors.error,
  },

  errorOverlay: {
    position: 'absolute', top: '40%', left: 24, right: 24,
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderRadius: 16, padding: 20, alignItems: 'center', gap: 12,
  },
  errorTitle: { color: colors.white, fontSize: fonts.lg, fontWeight: fonts.semibold },
  errorActions: { flexDirection: 'row', gap: 10 },
  retryBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
    backgroundColor: colors.white,
  },
  retryBtnText: { color: colors.textDark, fontWeight: fonts.semibold, fontSize: fonts.sm },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
    backgroundColor: colors.error,
  },
  endBtnText: { color: colors.white, fontWeight: fonts.semibold, fontSize: fonts.sm },
});
