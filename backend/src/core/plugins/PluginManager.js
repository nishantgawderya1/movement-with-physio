'use strict';

const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

/**
 * PluginManager — auto-discovers and loads plugins from `src/plugins/`.
 *
 * Each plugin directory must have an `index.js` that exports a class extending PluginBase.
 */
class PluginManager {
  constructor() {
    this.plugins = [];
  }

  /**
   * Discover all plugins in the plugins directory.
   * @param {string} pluginsDir - absolute path to src/plugins/
   */
  discover(pluginsDir) {
    if (!fs.existsSync(pluginsDir)) {
      logger.warn({ event: 'PLUGIN_DIR_NOT_FOUND', pluginsDir });
      return;
    }

    const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const indexPath = path.join(pluginsDir, entry.name, 'index.js');
      if (!fs.existsSync(indexPath)) {
        logger.warn({ event: 'PLUGIN_NO_INDEX', name: entry.name });
        continue;
      }

      try {
        const PluginClass = require(indexPath);
        const plugin = new PluginClass();
        this.plugins.push(plugin);
        logger.info({ event: 'PLUGIN_DISCOVERED', name: plugin.name });
      } catch (err) {
        logger.error({ event: 'PLUGIN_LOAD_ERROR', name: entry.name, err: err.message });
      }
    }
  }

  /**
   * Register all discovered plugins with the app.
   * @param {import('express').Application} app
   * @param {object} container
   */
  async registerAll(app, container) {
    for (const plugin of this.plugins) {
      try {
        await plugin.register(app, container);
        logger.info({ event: 'PLUGIN_REGISTERED', name: plugin.name });
      } catch (err) {
        logger.error({ event: 'PLUGIN_REGISTER_ERROR', name: plugin.name, err: err.message });
      }
    }
  }
}

module.exports = PluginManager;
