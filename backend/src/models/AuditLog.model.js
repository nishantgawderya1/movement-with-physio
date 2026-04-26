'use strict';

const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    resourceId: { type: mongoose.Schema.Types.Mixed, default: null },
    userId: { type: String, default: null, index: true },
    changes: { type: mongoose.Schema.Types.Mixed, default: null },
    statusCode: { type: Number, default: null },
    correlationId: { type: String, default: null, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Index for admin queries
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
module.exports = AuditLog;
