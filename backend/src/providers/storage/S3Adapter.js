'use strict';

const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const StorageProvider = require('../interfaces/StorageProvider');
const logger = require('../../core/utils/logger');

class S3Adapter extends StorageProvider {
  constructor({ region, accessKeyId, secretAccessKey, bucket }) {
    super();
    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.bucket = bucket;
  }

  /**
   * Upload a buffer (small file).
   * @param {Buffer} buffer
   * @param {string} key
   * @param {string} mimeType
   * @returns {Promise<{ key: string, url: string }>}
   */
  async upload(buffer, key, mimeType) {
    return this.streamUpload(
      require('stream').Readable.from(buffer),
      key,
      mimeType
    );
  }

  /**
   * Stream-upload using S3 multipart — RAM stays bounded.
   * @param {import('stream').Readable} fileStream
   * @param {string} key
   * @param {string} mimeType
   * @returns {Promise<{ key: string, url: string }>}
   */
  async streamUpload(fileStream, key, mimeType) {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: fileStream,
        ContentType: mimeType,
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024, // 5 MB parts
    });

    const result = await upload.done();
    logger.info({ event: 'S3_UPLOAD', key });
    return { key, url: result.Location || `https://${this.bucket}.s3.amazonaws.com/${key}` };
  }

  /**
   * Generate a presigned GET URL.
   * @param {string} key
   * @param {number} expiresInSeconds
   * @returns {Promise<string>}
   */
  async getSignedUrl(key, expiresInSeconds = 43200) {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}

module.exports = S3Adapter;
