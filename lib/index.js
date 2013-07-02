var Manager = require('./manager').Manager;
var Plugin = require('./plugin').Plugin;

var manager = new Manager();


/**
 * Plugin constructor.
 */
exports.Plugin = Plugin;


/**
 * Create a readable feature stream.
 */
exports.from = function() {
  throw new Error('Not implemented');
};


/**
 * Create a writable feature stream.
 */
exports.to = function() {
  throw new Error('Not implemented');
};


/**
 * Create a feature stream transform.
 */
exports.transform = function() {
  throw new Error('Not implemented');
};


/**
 * Register a plugin for use with feature stream.
 *
 * @param {Plugin} plugin A feature stream plugin.
 * @param {Object} options Optional plugin options.
 */
exports.use = function(plugin, options) {
  manager.register(plugin, options);
};
