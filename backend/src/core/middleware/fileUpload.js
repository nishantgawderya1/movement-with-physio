'use strict';

const multer = require('multer');
const path = require('path');
const { FILE_LIMITS } = require('../utils/constants');
const apiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

// Memory storage — multer buffers the file, then we stream it to S3
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: FILE_LIMITS.MAX_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (FILE_LIMITS.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`), false);
    }
  },
});

/**
 * File upload middleware.
 * Uses multer memory storage and streams to S3 via storageProvider.
 *
 * @param {string} fieldName - form field name
 * @param {{ container: object }} context - must expose container.storage
 * @returns {Function[]} array of middleware functions
 */
function fileUpload(fieldName, { container }) {
  return [
    // Step 1: multer parses multipart
    (req, res, next) => {
      upload.single(fieldName)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          return apiResponse.error(res, `Upload error: ${err.message}`, 400, req.correlationId);
        }
        if (err) {
          return apiResponse.error(res, err.message, 400, req.correlationId);
        }
        next();
      });
    },

    // Step 2: stream buffer to S3
    async (req, res, next) => {
      if (!req.file) return next();

      try {
        const ext = path.extname(req.file.originalname);
        const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

        const stream = require('stream').Readable.from(req.file.buffer);
        const result = await container.storage.streamUpload(stream, key, req.file.mimetype);

        req.uploadedFile = result;
        logger.info({ event: 'FILE_UPLOADED', key: result.key });
        next();
      } catch (err) {
        logger.error({ event: 'FILE_UPLOAD_FAILED', err: err.message });
        return apiResponse.error(res, 'File upload failed', 500, req.correlationId);
      }
    },
  ];
}

module.exports = fileUpload;
