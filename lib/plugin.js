var fs = require('fs');
var stream = require('stream');

var old = false;
if (!stream.Readable) {
  old = true;
  stream = require('readable-stream');
}


/**
 * Plugin base class.
 */
var Plugin = exports.Plugin = function Plugin() {};


/**
 * Initialize the plugin.  Plugins may override this method to handle user
 * options.
 *
 * @param {[type]} options User options for plugin.
 */
Plugin.prototype.init = function(options) {
  // default is to do nothing
};


/**
 * Get a readable stream for the provided connection.  The default
 * implementation provides read streams for file, http, and https connections.
 * Other plugins may override this to provide additional read streams.
 *
 * @param {string} str Connection string.  The connection string can either be
 *     a file path (e.g. './foo.txt', 'c:\foo bar') or a URI with a scheme that
 *     uses an authority (e.g. 'http://example.com/foo.txt' or any other scheme
 *     followed by a double slash).
 * @param {Object} options User options.
 * @param {function(Error, stream.Readable)} callback Callback.
 */
Plugin.prototype.getReadStream = function(str, options, callback) {
  var stream;
  // rough check for a scheme with an authority
  if (!str.match(/^[^:]+:\/\//)) {
    // assume file path
    stream = fs.createReadStream(str, options);
    if (old) {
      stream = new stream.Readable().wrap(stream);
    }
    process.nextTick(function() {
      callback.call(null, stream);
    });
  } else {
    callback.call(new Error('Only file path handled at the moment'));
  }
};


/**
 * Decide if this plugin handles the provided connection.
 *
 * @param {string} str Connection string.
 * @param {Object} options User options.
 *
 * @return {boolean} This plugin handles the provided connection.
 */
Plugin.prototype.handles = function(str, options) {
  throw new Error('Plugins must implement the "handles" method');
};
