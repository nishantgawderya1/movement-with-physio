const VideoCall = require('../../models/VideoCall.model');
const ApiError = require('../../core/utils/ApiError');
const logger = require('../../core/utils/logger');
const { NOTIFICATION_TYPES } = require('../../core/utils/constants');
const { addJob } = require('../../core/jobs/jobQueue');

class VideoService {
  constructor(container) {
    this.videoProvider = container.video;
    this.messaging = container.messaging;
    this.notification = container.notification;
  }

  /**
   * Create a new video call.
   * @param {string} initiatorId
   * @param {string[]} participantIds
   * @param {string} [roomId]
   * @returns {Promise<VideoCall>}
   */
  async createCall(initiatorId, participantIds, roomId = null) {
    const participants = [...new Set([...participantIds, initiatorId])];
    
    const call = await VideoCall.create({
      participants,
      initiatedBy: initiatorId,
      roomId,
      status: 'initiated',
    });

    // Notify other participants via push (queued)
    const otherParticipants = participantIds.filter(p => p.toString() !== initiatorId.toString());
    for (const participantId of otherParticipants) {
      await addJob('send_notification', {
        userId: participantId,
        title: 'Incoming Video Call',
        body: 'You have an incoming video call',
        type: NOTIFICATION_TYPES.VIDEO_CALL,
        data: { callId: call._id.toString() },
      });
    }

    return call;
  }

  /**
   * Get call details.
   * @param {string} callId
   * @returns {Promise<VideoCall>}
   */
  async getCall(callId) {
    const call = await VideoCall.findById(callId).populate('participants', 'name role');
    if (!call) {
      throw new ApiError(404, 'Video call not found');
    }
    return call;
  }

  /**
   * End a video call. Idempotent — short-circuits if already ended.
   * Optionally records the leaver in joinState so HTTP /leave and socket
   * end_call agree on per-participant state.
   *
   * @param {string} callId
   * @param {string} [endedByUserId] - participant who ended the call
   * @returns {Promise<VideoCall|null>}
   */
  async endCall(callId, endedByUserId = null) {
    const call = await VideoCall.findById(callId);
    if (!call || call.status === 'ended') return call;
    call.status = 'ended';
    call.endedAt = new Date();
    if (call.startedAt) {
      call.durationSeconds = Math.floor((call.endedAt - call.startedAt) / 1000);
    }
    // Sync joinState so HTTP /leave and socket end_call agree
    if (endedByUserId) {
      const key = endedByUserId.toString();
      const existing = call.joinState?.get?.(key) || {};
      call.joinState.set(key, { joinedAt: existing.joinedAt || null, leftAt: new Date() });
    }
    await call.save();
    this.messaging.emitToRoom(`call:${callId}`, 'call_ended', { callId, endedBy: endedByUserId });
    return call;
  }

  /**
   * Get TURN credentials for the client.
   * @returns {Promise<object>}
   */
  async getTurnCredentials() {
    return this.videoProvider.getTurnCredentials();
  }
}

module.exports = (container) => new VideoService(container);
