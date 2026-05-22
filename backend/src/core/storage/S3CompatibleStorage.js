'use strict';

const { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const StorageAdapter = require('./StorageAdapter');

class S3CompatibleStorage extends StorageAdapter {
  constructor({ endpoint, region, bucket, accessKeyId, secretAccessKey, forcePathStyle, publicBaseUrl }) {
    super();
    this.bucket = bucket;
    this.publicBaseUrl = publicBaseUrl ? publicBaseUrl.replace(/\/$/, '') : null;
    this.client = new S3Client({
      ...(endpoint ? { endpoint } : {}),
      region: region || 'auto',
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: forcePathStyle !== false,
    });
  }

  async putPdf(buffer, key, opts = {}) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
      ...(opts.contentDisposition ? { ContentDisposition: opts.contentDisposition } : {}),
    }));
    return {
      key,
      url: this.publicBaseUrl ? `${this.publicBaseUrl}/${key}` : null,
      driver: 's3',
    };
  }

  async getSignedUrl(key, { expiresInSeconds = 300 } = {}) {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, cmd, { expiresIn: expiresInSeconds });
  }

  async exists(key) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (err) {
      if (err.$metadata?.httpStatusCode === 404) return false;
      throw err;
    }
  }
}

module.exports = S3CompatibleStorage;
