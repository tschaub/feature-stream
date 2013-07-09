var fs = require('fs');
var zlib = require('zlib');
var http = require('http');
var https = require('https');
var url = require('url');

var stream = require('./stream');


/**
 * Rough check to see whether a connection string is a URI that uses a scheme
 * with an authority (e.g. 'http://example.com/') or a file path (e.g.
 * './foo.txt' or 'c:\foo bar').
 *
 * @param {string} str The candidate string.
 * @return {boolean} The connection string looks like a URI that uses a scheme
 *     with an authority.
 */
function hasAuthority(str) {
  return (/^[^:]+:\/\//).test(str);
}


/**
 * Get the connection type.  Supported connection strings are either file paths
 * or URI with an authority (we don't coerce file paths to URI to avoid
 * conversion hassles).
 *
 * @param {string} str Connection string.
 * @return {string} The connection string type (e.g. 'file', 'http', 'https').
 */
function getConnectionType(str) {
  return !hasAuthority(str) ? 'file' : url.parse(str).protocol;
}


/**
 * Assign properties of one object to another.
 * @param {Object} object Destination object.
 * @param {Object} source Source object.
 * @return {Object} The destination object.
 */
function assign(object, source) {
  for (var key in source) {
    object[key] = source.key;
  }
  return object;
}



/**
 * Plugin base class.
 * @constructor
 */
var Plugin = exports.Plugin = function Plugin() {};


/**
 * Initialize the plugin.  Plugins may override this method to handle user
 * options.
 *
 * @param {Object} options User options for plugin.
 */
Plugin.prototype.init = function(options) {
  // default is to do nothing
};


/**
 * Create a readable stream for the provided connection.  Plugins that extend
 * this must implement this method.
 *
 * @param {string} str Connection string.  The connection string can either be
 *     a file path (e.g. './foo.txt', 'c:\foo bar') or a URI with a scheme that
 *     uses an authority (e.g. 'http://example.com/foo.txt' or any other scheme
 *     followed by a double slash).
 * @param {Object} options User options.
 * @return {stream.Readable} A readable stream.
 */
Plugin.prototype.createReadStream = function(str, options) {
  throw new Error('Plugins must implement the createReadStream method');
};


/**
 * Create a transform stream for the provided connection.  The default
 * implementation does not provide a transform.  Plugins should override this
 * if they use the default read stream and need to transform the read data
 * into features.
 *
 *
 * @param {string} str Connection string.  The connection string can either be
 *     a file path (e.g. './foo.txt', 'c:\foo bar') or a URI with a scheme that
 *     uses an authority (e.g. 'http://example.com/foo.txt' or any other scheme
 *     followed by a double slash).
 * @param {Object} options User options.
 * @return {stream.Transform} transform A transform stream.
 */
Plugin.prototype.createReadTransform = function(str, options) {
  if (!this.handles(str, options)) {
    throw new Error('Unsupported connection type');
  }
  return null;
};


/**
 * Create a writable stream for the provided connection.  Plugins that extend
 * this must implement this method.
 *
 * @param {string} str Connection string.  The connection string can either be
 *     a file path (e.g. './foo.txt', 'c:\foo bar') or a URI with a scheme that
 *     uses an authority (e.g. 'http://example.com/foo.txt' or any other scheme
 *     followed by a double slash).
 * @param {Object} options User options.
 * @param {function} callback Optional callback (e.g. for http response).
 * @return {stream.Writable} Writable stream.
 */
Plugin.prototype.createWriteStream = function(str, options, callback) {
  throw new Error('Plugins must implement the createWriteStream method');
};


/**
 * Create a transform stream for the provided connection.  The default
 * implementation does not provide a transform.  Plugins should override this
 * if they use the default read stream and need to transform features into
 * data for the write stream.
 *
 * @param {string} str Connection string.  The connection string can either be
 *     a file path (e.g. './foo.txt', 'c:\foo bar') or a URI with a scheme that
 *     uses an authority (e.g. 'http://example.com/foo.txt' or any other scheme
 *     followed by a double slash).
 * @param {Object} options User options.
 * @return {stream.Transform} transform A transform stream.
 */
Plugin.prototype.createWriteTransform = function(str, options, callback) {
  if (!this.handles(str, options)) {
    throw new Error('Unsupported connection type');
  }
  return null;
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
  throw new Error('Plugins must implement the handles method');
};


/**
 * @return {string} String representation of the plugin.
 */
Plugin.prototype.toString = function() {
  return '[object ' + this.constructor.name + ']';
};



/**
 * Default plugin.
 * @constructor
 */
var DefaultPlugin = exports.DefaultPlugin = function DefaultPlugin() {};
DefaultPlugin.prototype = Object.create(Plugin.prototype, {
  constructor: {value: DefaultPlugin}
});


/**
 * Create a readable stream for the provided connection.  The default
 * implementation provides read streams for file, http, and https connections.
 * Other plugins may override this to provide additional read streams.
 *
 * @param {string} str Connection string.  The connection string can either be
 *     a file path (e.g. './foo.txt', 'c:\foo bar') or a URI with a scheme that
 *     uses an authority (e.g. 'http://example.com/foo.txt' or any other scheme
 *     followed by a double slash).
 * @param {Object} options User options.
 * @return {stream.Readable} A readable stream.
 */
DefaultPlugin.prototype.createReadStream = function(str, options) {
  if (!this.handles(str, options)) {
    throw new Error('Unsupported connection type');
  }
  var reader;
  var type = getConnectionType(str);
  if (type === 'file') {
    reader = stream.readable(fs.createReadStream(str, options));
    if (str.match(/\.gz$/i)) {
      reader = reader.pipe(zlib.createGunzip());
    }
  } else {
    if (type === 'http' || type === 'https') {
      var parts = url.parse(str);
      // apply user options
      if (options) {
        assign(parts, options);
      }
      reader = new stream.HttpReader(parts);
    } else {
      throw new Error('Unsupported protocol: ' + type);
    }
  }
  return reader;
};


/**
 * Create a writable stream for the provided connection.  The default
 * implementation provides write streams for file, http, and https connections.
 * Other plugins may override this to provide additional write streams.
 *
 * @param {string} str Connection string.  The connection string can either be
 *     a file path (e.g. './foo.txt', 'c:\foo bar') or a URI with a scheme that
 *     uses an authority (e.g. 'http://example.com/foo.txt' or any other scheme
 *     followed by a double slash).
 * @param {Object} options User options.
 * @param {function} callback Optional callback (e.g. for http response).
 * @return {stream.Writable} Writable stream.
 */
DefaultPlugin.prototype.createWriteStream = function(str, options, callback) {
  if (!this.handles(str, options)) {
    throw new Error('Unsupported connection type');
  }
  var writable;
  var type = getConnectionType(str);
  if (type === 'file') {
    if (str.match(/\.gz$/i)) {
      writable = new stream.GzipFileWriter(str, options);
    } else {
      writable = fs.createWriteStream(str, options);
    }
  } else {
    var protocol;
    if (type === 'http') {
      protocol = http;
    } else if (type === 'https') {
      protocol = https;
    }
    if (protocol) {
      var parts = url.parse(str);
      if (options) {
        assign(parts, options);
      }
      // default to POST
      if (!parts.method) {
        parts.method = 'POST';
      }
      writable = protocol.request(parts, callback);
    } else {
      throw new Error('Unsupported protocol: ' + type);
    }
  }
  return writable;
};


/**
 * Decide if this plugin handles the provided connection.  The default
 * implementation handles file paths and http(s) URLs.
 *
 * @param {string} str Connection string.
 * @param {Object} options User options.
 *
 * @return {boolean} This plugin handles the provided connection.
 */
DefaultPlugin.prototype.handles = function(str, options) {
  // file paths are the only non-authority connection string supported
  var handles = !hasAuthority(str);
  if (!handles) {
    // also check for http(s)
    var parts = url.parse(str);
    handles = parts.protocol === 'http' || parts.protocol === 'https';
  }
  return handles;
};
