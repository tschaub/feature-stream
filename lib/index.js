var Manager = require('./manager').Manager;
var Plugin = require('./plugin').Plugin;
var DefaultPlugin = require('./plugin').DefaultPlugin;
var stream = require('./stream');

var manager = new Manager();
manager.use(new DefaultPlugin());


/**
 * Plugin constructor.
 */
exports.Plugin = Plugin;


/**
 * Default plugin constructor.
 */
exports.DefaultPlugin = DefaultPlugin;


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
exports.from = function(str, options) {
  var plugin = manager.findPlugin(str, options);
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
exports.to = function(str, options) {
  var plugin = manager.findPlugin(str, options);
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
 * Create a feature stream transform.  The transform can be used to modify
 * existing features, create new features, and remove features.  The resulting
 * stream can be piped to another feature stream (e.g.
 * `readable.pipe(transform)` or `transform.pipe(writable)`).
 *
 * @param {function(Feature, function(Error, Feature))} fn Transform function.
 *     This function will be called with each feature in the stream.  After
 *     transforming the feature, it should call the provided callback with any
 *     error and the transformed feature.  To remove a feature from the stream,
 *     call the callback without a feature.  To add features to the stream, call
 *     the callback with an array instead of a single feature.
 * @return {stream.Transform} A transform stream.
 */
exports.transform = function(fn) {
  var transform = new stream.Transform();
  transform._transform = function(chunk, encoding, callback) {
    fn(chunk, function(err, feature) {
      if (err) {
        return callback(err);
      }
      if (Array.isArray(feature)) {
        for (var i = 0, ii = feature.length; i < ii; ++i) {
          transform.push(feature[i]);
        }
      } else if (feature) {
        transform.push(feature);
      }
      callback();
    });
  };
  return transform;
};


/**
 * Register a plugin for use with feature stream.
 *
 * @param {Plugin} plugin A feature stream plugin.
 * @param {Object} options Optional plugin options.
 */
exports.use = function(plugin, options) {
  manager.use(plugin, options);
};
