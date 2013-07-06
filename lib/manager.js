


/**
 * Plugin manager.
 * @constructor
 */
var Manager = exports.Manager = function Manager() {
  this.plugins = [];
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


/**
 * Create a readable feature stream.
 *
 * @param {string} str Connection string.  The connection string can either be
 *     a file path (e.g. './foo.txt', 'c:\foo bar') or a URI with a scheme that
 *     uses an authority (e.g. 'http://example.com/foo.txt' or any other scheme
 *     followed by a double slash).
 * @param {Object} options Options to be passed to the plugin that handles the
 *     connection.
 * @return {stream.Readable} A readable feature stream.
 */
Manager.prototype.from = function(str, options) {
  var plugin = this.findPlugin(str, options);
  if (!plugin) {
    throw new Error('No suitable plugin found');
  }
  var read = plugin.createReadStream(str, options);
  if (!read) {
    throw new Error('Failed to get read stream from plugin: ' + plugin);
  }
  var transform = plugin.createReadTransform(str, options);
  if (!transform) {
    throw new Error('Failed to get read transform from plugin: ' + plugin);
  }
  return read.pipe(transform);
};


/**
 * Create a writable feature stream.
 *
 * @param {string} str Connection string.  The connection string can either be
 *     a file path (e.g. './foo.txt', 'c:\foo bar') or a URI with a scheme that
 *     uses an authority (e.g. 'http://example.com/foo.txt' or any other scheme
 *     followed by a double slash).
 * @param {Object} options Options to be passed to the plugin that handles the
 *     connection.
 * @return {stream.Writable} A writable feature stream.
 */
Manager.prototype.to = function(str, options) {
  var plugin = this.findPlugin(str, options);
  if (!plugin) {
    throw new Error('No suitable plugin found');
  }
  var transform = plugin.createWriteTransform(str, options);
  if (!transform) {
    throw new Error('Failed to get write transform from plugin: ' + plugin);
  }
  var write = plugin.createWriteStream(str, options);
  if (!write) {
    throw new Error('Failed to get write stream from plugin: ' + plugin);
  }
  return transform.pipe(write);
};


/**
 * Initialize and register a plugin with the manager.
 *
 * @param {Plugin} plugin The plugin to use.
 * @param {Object} options Any options for initializing the plugin.
 */
Manager.prototype.use = function(plugin, options) {
  plugin.init(options);
  this.plugins.push(plugin);
};


