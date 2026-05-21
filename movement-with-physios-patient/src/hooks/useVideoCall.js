/**
 * useVideoCall — patient-side video call orchestrator.
 *
 * Patient is the OFFERER:
 *
 *   - Patient joins, sets up local media + peer connection + listeners.
 *
 *   - On 'user_joined' (therapist arrived after patient) — OR after a
 *     1-second fallback timer if therapist was already in the call room
 *     when patient joined (server doesn't replay user_joined) — patient
 *     creates the offer.
 *
 *   - hasMadeOfferRef makes offer creation one-shot.
 *
 *   - Patient receives 'answer' from therapist, setRemoteDescription.
 *     This is the primary connection path — failure is fatal.
 *
 *   - ICE candidates may arrive before the answer; buffer them and drain
 *     the buffer after setRemoteDescription completes.
 *
 *   - Local toggles (mute, camera, switch) operate on the local stream.
 *
 *   - leave() emits end_call socket event + HTTP /leave backstop + teardown.
 *
 *   - Unmount safety: teardown if hasJoinedRef is set.
 *
 * Ported from movement-with-physios/apps/therapist/src/hooks/useVideoCall.js
 * with role flipped:
 *
 *   - Therapist's user_joined handler is a no-op; patient's CREATES the offer.
 *
 *   - Therapist's offer handler is the primary path; patient's is defensive
 *     (should not fire).
 *
 *   - Therapist's answer handler is defensive; patient's is the primary
 *     connection path (failure is fatal — sets status to 'failed').
 *
 *   - ICE candidate buffering added — see the iceCandidateBufferRef path below.
 *
 * Status machine: idle → connecting → active → ended | failed
 *
 * selfUserId is read from tokenProvider.getMyUserId() (set by
 * ClerkTokenBridge after sign-in). Caller should NOT pass it.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
} from 'react-native-webrtc';
import { videoSocket } from '../lib/videoSocket';
import { tokenProvider } from '../lib/tokenProvider';
import { joinCall as apiJoinCall, leaveCall as apiLeaveCall } from '../services/videoCallService';

/**
 * @param {object} args
 * @param {string} args.callId       - VideoCall._id (string)
 * @param {string} args.otherUserId  - therapist Mongo _id; passed as 'to' field
 *                                    in socket emits (metadata only, not used for routing)
 * @param {'patient'|'therapist'} [args.role='patient']
 */
export function useVideoCall({ callId, otherUserId, role = 'patient' }) {
  var [localStream, setLocalStream] = useState(null);
  var [remoteStream, setRemoteStream] = useState(null);
  var [callStatus, setCallStatus] = useState('idle');
  var [isMuted, setIsMuted] = useState(false);
  var [isCameraOff, setIsCameraOff] = useState(false);
  var [error, setError] = useState(null);

  var pcRef = useRef(null);
  var localStreamRef = useRef(null);
  var hasJoinedRef = useRef(false);
  var hasMadeOfferRef = useRef(false);                  // NEW: one-shot offer guard
  var remoteDescriptionSetRef = useRef(false);           // NEW: drain ICE buffer after this
  var iceCandidateBufferRef = useRef([]);                // NEW: buffer for early ICE candidates
  var connectTimeoutRef = useRef(null);
  var fallbackOfferTimeoutRef = useRef(null);            // NEW: 1s "make offer if no user_joined" timer
  var unsubscribesRef = useRef([]);

  // Defined first so callbacks below can reference it.
  var teardown = useCallback(function () {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    if (fallbackOfferTimeoutRef.current) {
      clearTimeout(fallbackOfferTimeoutRef.current);
      fallbackOfferTimeoutRef.current = null;
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
    unsubscribesRef.current.forEach(function (unsub) {
      try { unsub(); } catch (e) {}
    });
    unsubscribesRef.current = [];
    hasMadeOfferRef.current = false;
    remoteDescriptionSetRef.current = false;
    iceCandidateBufferRef.current = [];
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
      // 1) Tell backend we're joining; gets short-lived ICE config.
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

      // 4) Offer-making helper — closes over pc, callId, otherUserId.
      var makeOffer = async function () {
        if (hasMadeOfferRef.current) return;
        if (!pcRef.current) return;
        hasMadeOfferRef.current = true;
        if (fallbackOfferTimeoutRef.current) {
          clearTimeout(fallbackOfferTimeoutRef.current);
          fallbackOfferTimeoutRef.current = null;
        }
        try {
          var offer = await pcRef.current.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pcRef.current.setLocalDescription(offer);
          videoSocket.emit('offer', {
            callId: callId,
            to: otherUserId,
            offer: offer,
          });
        } catch (e) {
          setError('OFFER_CREATION_FAILED');
          setCallStatus('failed');
          hasMadeOfferRef.current = false;
        }
      };

      // 5) Ensure the socket is connected, then attach signaling handlers.
      await videoSocket.connect();
      videoSocket.emit('join_call', { callId: callId });

      // Patient (offerer): user_joined triggers makeOffer.
      var unsubUserJoined = videoSocket.on('user_joined', function (_payload) {
        makeOffer();
      });

      // Defensive: patient should NOT receive offer events.
      var unsubOffer = videoSocket.on('offer', function () {
        // Race: both parties trying to be offerer. Ignore — our offer is in flight.
      });

      // Primary path: therapist's answer. Fatal on failure.
      var unsubAnswer = videoSocket.on('answer', async function (payload) {
        if (!pcRef.current || !payload || !payload.answer) return;
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
          remoteDescriptionSetRef.current = true;
          // Drain buffered ICE candidates that arrived before this.
          var buffered = iceCandidateBufferRef.current;
          iceCandidateBufferRef.current = [];
          for (var i = 0; i < buffered.length; i++) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(buffered[i]));
            } catch (e) {
              // Best-effort; skip a candidate that fails.
            }
          }
        } catch (e) {
          setError('ANSWER_HANDLING_FAILED');
          setCallStatus('failed');
        }
      });

      // ICE candidates — buffer if remote description not yet set.
      var unsubIce = videoSocket.on('ice_candidate', async function (payload) {
        if (!pcRef.current || !payload || !payload.candidate) return;
        if (!remoteDescriptionSetRef.current) {
          iceCandidateBufferRef.current.push(payload.candidate);
          return;
        }
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
          // Candidate may be invalid; ignore.
        }
      });

      var unsubEnded = videoSocket.on('call_ended', function () {
        teardown();
        setCallStatus('ended');
      });

      unsubscribesRef.current = [unsubUserJoined, unsubOffer, unsubAnswer, unsubIce, unsubEnded];

      // 6) Fallback offer timer: 1s after join_call, make the offer if user_joined
      // hasn't fired. Covers the case where therapist was already in the room.
      fallbackOfferTimeoutRef.current = setTimeout(function () {
        makeOffer();
      }, 1000);

      // 7) 30-second failure timeout if peer never connects.
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
      hasMadeOfferRef.current = false;
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
    selfUserId: tokenProvider.getMyUserId(),
  };
}
