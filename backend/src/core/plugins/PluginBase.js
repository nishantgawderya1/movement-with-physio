'use strict';

/**
 * PluginBase — abstract base class for all plugins.
 *
 * Subclasses must define a `get name()` getter and implement `register(app, container)`.
 * Plugins are auto-discovered by PluginManager from `src/plugins/`.
 *
 * @example
 *   class MyPlugin extends PluginBase {
 *     get name() { return 'my-plugin'; }
 *     get version() { return '1.0.0'; }
 *     async register(app, container) { ... }
 *   }
 */
class PluginBase {
  /**
   * Plugin name — subclasses must override with a getter.
   * @returns {string}
   */
  get name() {
    throw new Error('Plugin must implement get name()');
  }

  /**
   * Plugin version (optional).
   * @returns {string}
   */
  get version() {
    return '1.0.0';
  }

  /**
   * Register the plugin with the Express app.
   * Mount routes, attach event listeners, warm caches, etc.
   *
   * @param {import('express').Application} app
   * @param {object} container - DI container with all providers
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async register(app, container) {
    throw new Error(`Plugin "${this.name}" must implement register(app, container)`);
  }
}

module.exports = PluginBase;
