'use strict';

const mongoose = require('mongoose');
const softDeletePlugin = require('../core/utils/softDelete');

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: { type: String, required: true, index: true },
    read: { type: Boolean, default: false, index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

NotificationSchema.plugin(softDeletePlugin);

// Indexes
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', NotificationSchema);
module.exports = Notification;
