'use strict';

const axios = require('axios');
const env = require('../../config/env');
const cacheManager = require('../../core/cache/cacheManager');
const logger = require('../../core/utils/logger');

const CACHE_KEY = (region) => `mwp:turn:ice:${region}`;

/**
 * GET /api/v1/video/ice-config?region=global
 *
 * Returns: { success: true, data: { iceServers: [...], ttlSeconds: <number> } }
 *
 * Uses Metered's REST API to mint a short-lived TURN credential, then
 * shapes the response into the WebRTC `iceServers` format. The result
 * is cached per region in Redis so the Metered API isn't hit on every
 * call — cache TTL is bounded below the credential TTL so we never
 * serve creds that have already expired client-side.
 */
async function getIceConfig(req, res, next) {
  try {
    const region = (req.query.region || env.METERED_REGION || 'global').toString();

    // 1) Redis cache (best-effort — failures are logged, not fatal)
    let cached = null;
    try {
      cached = await cacheManager.get(CACHE_KEY(region));
    } catch (e) {
      logger.warn({ event: 'TURN_ICE_CACHE_READ_FAILED', err: e?.message });
    }
    if (cached?.iceServers?.length) {
      return res.json({ success: true, data: cached });
    }

    // 2) Mint a short-lived credential via Metered
    const createUrl = `https://${env.METERED_DOMAIN}/api/v1/turn/credential?secretKey=${env.METERED_SECRET_KEY}`;
    const createResp = await axios.post(
      createUrl,
      {
        expiryInSeconds: env.METERED_CREDENTIAL_TTL_SECONDS,
        label: `mwp-${region}`,
      },
      { timeout: 5000 }
    );

    const { username, password } = createResp.data || {};
    if (!username || !password) {
      logger.warn({
        event: 'TURN_PROVIDER_BAD_RESPONSE',
        status: createResp.status,
        bodyKeys: Object.keys(createResp.data || {}),
      });
      return res.status(502).json({ success: false, error: { code: 'TURN_PROVIDER_ERROR' } });
    }

    // 3) Build iceServers — mirror Metered's recommended set
    const host = region === 'global'
      ? 'global.relay.metered.ca'
      : `${region}.relay.metered.ca`;

    const iceServers = [
      { urls: `stun:${host}:80` },
      { urls: `turn:${host}:80`, username, credential: password },
      { urls: `turn:${host}:80?transport=tcp`, username, credential: password },
      { urls: `turn:${host}:443`, username, credential: password },
      { urls: `turns:${host}:443?transport=tcp`, username, credential: password },
    ];

    const payload = { iceServers, ttlSeconds: env.METERED_CREDENTIAL_TTL_SECONDS };

    // 4) Cache below credential TTL so we never hand out stale creds
    const cacheTtl = Math.min(
      env.METERED_CACHE_TTL_SECONDS,
      env.METERED_CREDENTIAL_TTL_SECONDS - 60
    );
    try {
      await cacheManager.set(CACHE_KEY(region), payload, cacheTtl);
    } catch (e) {
      logger.warn({ event: 'TURN_ICE_CACHE_WRITE_FAILED', err: e?.message });
    }

    logger.info({ event: 'TURN_ICE_MINTED', region, ttlSeconds: payload.ttlSeconds });
    return res.json({ success: true, data: payload });
  } catch (err) {
    if (err.response) {
      logger.error({
        event: 'TURN_PROVIDER_HTTP_ERROR',
        status: err.response.status,
        body: typeof err.response.data === 'string'
          ? err.response.data.slice(0, 200)
          : err.response.data,
      });
      return res.status(502).json({ success: false, error: { code: 'TURN_PROVIDER_ERROR' } });
    }
    return next(err);
  }
}

module.exports = { getIceConfig };
