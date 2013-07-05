


/**
 * Plugin manager.
 * @constructor
 */
var Manager = exports.Manager = function Manager() {
  this.plugins = [];
};


/**
 * Register a plugin with the manager.
 *
 * @param {Plugin} plugin The plugin to register.
 * @param {Object} options Any options for initializing the plugin.
 */
Manager.prototype.register = function(plugin, options) {
  plugin.init(options);
  this.plugins.push(plugin);
};


/**
 * Find a plugin that handles the given connection string.  Plugins are
 * prioritized in reverse registration order (most recently registered gets
 * asked first).
 *
 * @param {string} str Connection string.
 * @param {Object} options User options.
 * @return {Plugin} A plugin that handles the connection or null if no plugin
 *     was found.
 */
Manager.prototype.findPlugin = function(str, options) {
  var plugin = null;
  for (var i = this.plugins.length - 1; i >= 0; --i) {
    if (this.plugins[i].handles(str, options)) {
      plugin = this.plugins[i];
      break;
    }
  }
  return plugin;
};
