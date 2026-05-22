/**
 * VideoCallScreen — full-screen video session UI for the therapist.
 *
 * Layout (z-order, back to front):
 *   1. Remote stream    — RTCView, edge-to-edge, objectFit="cover"
 *   2. "Waiting" placeholder — only the visible region above the panel
 *   3. Local PiP        — small RTCView (110x150), top-right, draggable
 *   4. Top status bar   — patient name, elapsed timer (width-constrained
 *                          so it can't run under the PiP)
 *   5. AssessmentPanel  — bottom-sheet, persistent (only if assessmentId)
 *   6. Control bar      — mute / camera / end / switch, sits 12px above
 *                          the panel (or 12px above the safe-area bottom
 *                          when there's no panel)
 *
 * Panel-height plumbing (Phase 3B UI pass):
 *   - This screen OWNS the panel's Animated.Value and passes it down via
 *     AssessmentPanel's heightValue prop.
 *   - A `panelHeightPx` useState mirror tracks the value via addListener,
 *     so the controls bar + placeholder can use a plain number in their
 *     style (not a binding) — works reliably for layout props across RN
 *     versions, ~60 re-renders per second during the spring is fine for
 *     this single screen.
 *
 * Therapist is the ANSWERER. useVideoCall owns the peer connection +
 * signaling; this screen owns layout + control wiring.
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
import { useVideoCall } from '../../hooks/useVideoCall';
import AssessmentPanel, { DEFAULT_EXPANDED, COLLAPSED_HEIGHT } from '../../components/video/AssessmentPanel';
import { getCall } from '../../services/videoCallService';

var PIP_WIDTH = 110;
var PIP_HEIGHT = 150;
var PIP_MARGIN = 12;
var TOP_PAD = 24; // budget for top-bar paddingHorizontal on each side
var CONTROLS_GAP = 12;

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

  var { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  var [selfUserId, setSelfUserId] = useState(null);
  var [callMeta, setCallMeta] = useState(null);

  // ── Panel-height plumbing (parent-owned Animated.Value + listener mirror)
  var initialPanelHeight = assessmentId ? DEFAULT_EXPANDED : 0;
  var panelHeight = useRef(new Animated.Value(initialPanelHeight)).current;
  var [panelHeightPx, setPanelHeightPx] = useState(initialPanelHeight);

  useEffect(function () {
    var id = panelHeight.addListener(function (v) { setPanelHeightPx(v.value); });
    return function () { panelHeight.removeListener(id); };
  }, [panelHeight]);

  // ── Load call meta (used to resolve self id + display patient name)
  useEffect(function () {
    var cancelled = false;
    async function loadMeta() {
      var resp = await getCall(callId);
      if (!cancelled && resp.success) {
        setCallMeta(resp.data);
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

  // ── Trigger join() once selfUserId is resolved. Gated on hasJoinedRef
  //    so React StrictMode / re-renders can't double-join. Deps are
  //    [selfUserId] only — hook is a fresh object every render and using
  //    it as a dep here would re-fire on each render.
  var hasJoinedRef = useRef(false);
  useEffect(function () {
    if (selfUserId && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      hook.join();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfUserId]);

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
    navigation.replace('SessionEnded', {
      callId: callId,
      bookingId: bookingId,
      assessmentId: assessmentId,
      durationSeconds: elapsed,
    });
  }

  // ── Auto-navigate when peer ends the call
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

  // TODO: surface body part when getCall response includes it.

  var remoteUrl = hook.remoteStream ? hook.remoteStream.toURL() : null;
  var localUrl  = hook.localStream  ? hook.localStream.toURL()  : null;
  var nameMaxWidth = SCREEN_WIDTH - PIP_WIDTH - TOP_PAD - PIP_MARGIN;

  return (
    <View style={styles.root}>
      {/* Remote stream (full screen) */}
      {remoteUrl ? (
        <RTCView streamURL={remoteUrl} style={StyleSheet.absoluteFill} objectFit="cover" />
      ) : (
        // Placeholder fills only the region above the panel so the
        // "Waiting…" text centers in what the user can actually see.
        <View
          style={[
            styles.placeholder,
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: panelHeightPx },
          ]}
        >
          <ActivityIndicator color={colors.white} />
          <Text style={styles.placeholderText}>
            {hook.callStatus === 'failed' ? 'Connection failed' : 'Waiting for patient to join…'}
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
              {(callMeta && callMeta.otherParty && callMeta.otherParty.name) || 'Patient'}
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
              <Ionicons name="call" size={18} color={colors.white} />
              <Text style={styles.endBtnText}>End</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Control bar — sits CONTROLS_GAP px above the panel (or above the
          safe-area bottom when no panel). Wrapped in SafeAreaView so
          the no-panel case respects the home-indicator inset. */}
      <SafeAreaView
        edges={['bottom']}
        style={[styles.controlsWrap, { bottom: panelHeightPx + CONTROLS_GAP }]}
        pointerEvents="box-none"
      >
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

      {/* AssessmentPanel — mounted when this is a therapist_driven call.
          Passes the parent-owned Animated.Value so the controls bar can
          ride along with the panel's expand/collapse spring. */}
      {assessmentId ? (
        <AssessmentPanel
          assessmentId={assessmentId}
          heightValue={panelHeight}
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
    // `bottom` is set inline so it can track panelHeightPx via the
    // addListener mirror — keeping the controls anchored above the
    // AssessmentPanel as it expands/collapses.
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
