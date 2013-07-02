


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
