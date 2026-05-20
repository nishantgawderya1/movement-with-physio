/**
 * useVideoCall — therapist-side video call orchestrator.
 *
 * Therapist is the ANSWERER:
 *   1. patient (offerer) joins, builds and sends 'offer'
 *   2. therapist receives offer, builds answer, sends 'answer'
 *   3. ICE candidates flow both ways
 *
 * Lifecycle:
 *   - mount → caller invokes join()
 *   - active call → toggleMute / toggleCamera / switchCamera
 *   - leave() → emits end_call socket event, hits HTTP /leave as a backstop,
 *     tears down streams + peer connection + socket listeners
 *   - unmount → safety teardown if hasJoinedRef is set
 *
 * Status machine: idle → connecting → ringing(*not used today) → active → ended | failed
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
} from 'react-native-webrtc';

import { videoSocket } from '../lib/videoSocket';
import { joinCall as apiJoinCall, leaveCall as apiLeaveCall } from '../services/videoCallService';

/**
 * @param {object} args
 * @param {string} args.callId      - VideoCall._id (string)
 * @param {string} args.selfUserId  - current therapist Mongo _id (string)
 * @param {string} args.otherUserId - patient Mongo _id (string)
 * @param {'therapist'|'patient'} [args.role='therapist']
 */
export function useVideoCall({ callId, selfUserId, otherUserId, role = 'therapist' }) {
  var [localStream, setLocalStream] = useState(null);
  var [remoteStream, setRemoteStream] = useState(null);
  var [callStatus, setCallStatus] = useState('idle'); // idle|connecting|active|ended|failed
  var [isMuted, setIsMuted] = useState(false);
  var [isCameraOff, setIsCameraOff] = useState(false);
  var [error, setError] = useState(null);

  var pcRef = useRef(null);
  var localStreamRef = useRef(null);
  var hasJoinedRef = useRef(false);
  var connectTimeoutRef = useRef(null);
  var unsubscribesRef = useRef([]);

  // Defined first so callbacks below can reference it.
  var teardown = useCallback(function () {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach(function (t) { t.stop(); });
      } catch (e) {}
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (e) {}
      pcRef.current = null;
    }
    // Unsubscribe all socket listeners we attached
    unsubscribesRef.current.forEach(function (unsub) {
      try { unsub(); } catch (e) {}
    });
    unsubscribesRef.current = [];
    setRemoteStream(null);
  }, []);

  var leave = useCallback(async function () {
    try {
      try { videoSocket.emit('end_call', { callId: callId }); } catch (e) {}
      // HTTP backstop — server is idempotent on already-ended.
      try { await apiLeaveCall(callId); } catch (e) {}
    } finally {
      teardown();
      setCallStatus('ended');
    }
  }, [callId, teardown]);

  var join = useCallback(async function () {
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    setCallStatus('connecting');
    setError(null);

    try {
      // 1) Tell the backend we're joining → returns short-lived ICE config.
      var joinResp = await apiJoinCall(callId);
      if (!joinResp.success) {
        throw new Error(joinResp.error || 'JOIN_FAILED');
      }
      var iceServers = (joinResp.data && joinResp.data.iceServers) || [];

      // 2) Acquire local media (camera + mic).
      var stream = await mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'user' },
      });
      setLocalStream(stream);
      localStreamRef.current = stream;

      // 3) Build the peer connection with the freshly-minted TURN creds.
      var pc = new RTCPeerConnection({ iceServers: iceServers });
      pcRef.current = pc;

      stream.getTracks().forEach(function (track) { pc.addTrack(track, stream); });

      pc.ontrack = function (event) {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      pc.onconnectionstatechange = function () {
        var s = pc.connectionState;
        if (s === 'connected') {
          setCallStatus('active');
          if (connectTimeoutRef.current) {
            clearTimeout(connectTimeoutRef.current);
            connectTimeoutRef.current = null;
          }
        } else if (s === 'failed') {
          setCallStatus('failed');
          setError('PEER_CONNECTION_FAILED');
        }
        // 'disconnected' and 'closed' are not terminal here — leave() drives the transition.
      };

      pc.onicecandidate = function (event) {
        if (event.candidate) {
          videoSocket.emit('ice_candidate', {
            callId: callId,
            to: otherUserId,
            candidate: event.candidate,
          });
        }
      };

      // 4) Ensure the socket is connected, then attach signaling handlers.
      await videoSocket.connect();
      videoSocket.emit('join_call', { callId: callId });

      // Therapist (answerer) ignores user_joined — patient drives the offer.
      var unsubUserJoined = videoSocket.on('user_joined', function (_payload) {});

      var unsubOffer = videoSocket.on('offer', async function (payload) {
        var from = payload && payload.from;
        var offer = payload && payload.offer;
        if (!pcRef.current || !offer) return;
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
          var answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          videoSocket.emit('answer', { callId: callId, to: from, answer: answer });
        } catch (e) {
          setError('OFFER_HANDLING_FAILED');
        }
      });

      // Defensive: therapist shouldn't receive answer, but absorb gracefully.
      var unsubAnswer = videoSocket.on('answer', async function (payload) {
        if (!pcRef.current || !payload || !payload.answer) return;
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
        } catch (e) {
          // Likely already set; ignore.
        }
      });

      var unsubIce = videoSocket.on('ice_candidate', async function (payload) {
        if (!pcRef.current || !payload || !payload.candidate) return;
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
          // Candidate may arrive before remote description — ignore.
        }
      });

      var unsubEnded = videoSocket.on('call_ended', function () {
        teardown();
        setCallStatus('ended');
      });

      unsubscribesRef.current = [unsubUserJoined, unsubOffer, unsubAnswer, unsubIce, unsubEnded];

      // 5) 30-second failure timeout if peer never connects.
      connectTimeoutRef.current = setTimeout(function () {
        // Reading pcRef.current.connectionState directly so we don't race
        // against React state updates batching the 'active' transition.
        if (!pcRef.current || pcRef.current.connectionState !== 'connected') {
          setCallStatus('failed');
          setError('OTHER_PARTY_NOT_ANSWERING');
        }
      }, 30000);
    } catch (e) {
      setCallStatus('failed');
      setError((e && e.message) || 'JOIN_FAILED');
      hasJoinedRef.current = false;
      teardown();
    }
  }, [callId, otherUserId, teardown]);

  var toggleMute = useCallback(function () {
    var stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach(function (t) { t.enabled = !t.enabled; });
    setIsMuted(function (prev) { return !prev; });
  }, []);

  var toggleCamera = useCallback(function () {
    var stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach(function (t) { t.enabled = !t.enabled; });
    setIsCameraOff(function (prev) { return !prev; });
  }, []);

  var switchCamera = useCallback(function () {
    var stream = localStreamRef.current;
    if (!stream) return;
    var videoTrack = stream.getVideoTracks()[0];
    if (videoTrack && typeof videoTrack._switchCamera === 'function') {
      videoTrack._switchCamera();
    }
  }, []);

  // Unmount safety: if the screen unmounts while a call is active, tear down.
  useEffect(function () {
    return function () {
      if (hasJoinedRef.current) {
        teardown();
      }
    };
  }, [teardown]);

  return {
    localStream: localStream,
    remoteStream: remoteStream,
    callStatus: callStatus,
    isMuted: isMuted,
    isCameraOff: isCameraOff,
    error: error,
    join: join,
    leave: leave,
    toggleMute: toggleMute,
    toggleCamera: toggleCamera,
    switchCamera: switchCamera,
    role: role,
    selfUserId: selfUserId,
  };
}
