'use strict';

const CircuitBreakerLib = require('opossum');
const logger = require('./logger');

/**
 * Opossum circuit breaker wrapper.
 * Provides a standard wrapper around any async function.
 *
 * @param {string} name - identifier for logging
 * @param {object} options - opossum options
 */
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.defaultOptions = {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      ...options,
    };
    this._breakers = new Map();
  }

  /**
   * Wrap an async function in a circuit breaker.
   * @param {Function} fn - async function to protect
   * @param {Function} [fallback] - called on open circuit
   * @returns {import('opossum').CircuitBreaker}
   */
  wrap(fn, fallback) {
    const breaker = new CircuitBreakerLib(fn, this.defaultOptions);

    breaker.on('open', () => logger.warn({ event: 'CIRCUIT_OPEN', name: this.name }));
    breaker.on('halfOpen', () => logger.info({ event: 'CIRCUIT_HALF_OPEN', name: this.name }));
    breaker.on('close', () => logger.info({ event: 'CIRCUIT_CLOSED', name: this.name }));
    breaker.on('failure', (err) => logger.error({ event: 'CIRCUIT_FAILURE', name: this.name, err: err.message }));

    if (fallback) breaker.fallback(fallback);

    return breaker;
  }
}

module.exports = CircuitBreaker;
