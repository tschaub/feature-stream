var fs = require('fs');
var stream = require('./stream');
var http = require('http');
var https = require('https');
var url = require('url');


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
 * Creates an immediately available readable stream for HTTP(S) requests.  This
 * is used to provide a synchrounous `createReadStream` method for HTTP(S)
 * requests in addition to file reading.
 *
 * @constructor
 * @param {Object} options Request options.
 */
function HttpReader(options) {
  stream.Readable.call(this);
  // default to GET
  if (!options.method) {
    options.method = 'GET';
  }
  var protocol;
  if (options.protocol === 'http') {
    protocol = http;
  } else if (options.protocol === 'https') {
    protocol = https;
  } else {
    throw new Error('Unsupported protocol: ' + options.protocol);
  }
  this._response = null;
  var request = protocol.request(options, this._handleResponse.bind(this));
  request.end();
}
HttpReader.prototype = Object.create(stream.Readable.prototype, {
  constructor: {value: HttpReader}
});


/**
 * Handle the HTTP(S) response.
 * @param {http.ServerResponse|https.ServerResponse} response Server response.
 */
HttpReader.prototype._handleResponse = function(response) {
  if (stream.old) {
    // TODO: https://github.com/isaacs/readable-stream/pull/61
    var sub = new stream.Readable();
    sub.wrap(response);
    response = sub;
  }
  this._response = response;
  response.on('readable', function() {
    this.emit('readable');
  }.bind(this));
};


/**
 * Asynchronous read.
 * @param {[type]} size Number of bytes to read.
 */
HttpReader.prototype._read = function(size) {
  if (this._response) {
    var chunk = this._response.read(size);
    if (chunk) {
      this.push(chunk);
    }
  }
};



/**
 * Plugin base class.
 * @constructor
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
 * Create a transform stream for the provided connection.  Plugins that extend
 * this must implement this method.
 *
 * @param {string} str Connection string.  The connection string can either be
 *     a file path (e.g. './foo.txt', 'c:\foo bar') or a URI with a scheme that
 *     uses an authority (e.g. 'http://example.com/foo.txt' or any other scheme
 *     followed by a double slash).
 * @param {Object} options User options.
 * @param {function(Error, stream.Transform)} callback Callback.
 */
Plugin.prototype.createReadTransform = function(str, options, callback) {
  throw new Error('Plugins must implement the createReadTransform method');
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
 * Create a transform stream for the provided connection.  Plugins that extend
 * this must implement this method.
 *
 * @param {string} str Connection string.  The connection string can either be
 *     a file path (e.g. './foo.txt', 'c:\foo bar') or a URI with a scheme that
 *     uses an authority (e.g. 'http://example.com/foo.txt' or any other scheme
 *     followed by a double slash).
 * @param {Object} options User options.
 * @param {function(Error, stream.Transform)} callback Callback.
 */
Plugin.prototype.createWriteTransform = function(str, options, callback) {
  throw new Error('Plugins must implement the createWriteTransform method');
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
    reader = fs.createReadStream(str, options);
    if (stream.old) {
      // TODO: https://github.com/isaacs/readable-stream/pull/61
      var sub = new stream.Readable();
      sub.wrap(reader);
      reader = sub;
    }
  } else {
    if (type === 'http' || type === 'https') {
      var parts = url.parse(str);
      // apply user options
      if (options) {
        assign(parts, options);
      }
      reader = new HttpReader(parts);
    } else {
      throw new Error('Unsupported protocol: ' + type);
    }
  }
  return reader;
};


/**
 * Create a transform stream for the provided connection.  The default
 * implementation creates a pass-through stream.  Plugins should override this
 * if they use the default read stream and need to transform the read data
 * into features.
 *
 * @param {string} str Connection string.  The connection string can either be
 *     a file path (e.g. './foo.txt', 'c:\foo bar') or a URI with a scheme that
 *     uses an authority (e.g. 'http://example.com/foo.txt' or any other scheme
 *     followed by a double slash).
 * @param {Object} options User options.
 * @return {stream.Transform} A transform stream.
 */
DefaultPlugin.prototype.createReadTransform = function(str, options) {
  if (!this.handles(str, options)) {
    throw new Error('Unsupported connection type');
  }
  return new stream.PassThrough();
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
    writable = fs.createWriteStream(str, options);
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
 * Create a transform stream for the provided connection.  The default
 * implementation creates a pass-through stream.  Plugins should override this
 * if they use the default read stream and need to transform features into
 * data for the write stream.
 *
 * @param {string} str Connection string.  The connection string can either be
 *     a file path (e.g. './foo.txt', 'c:\foo bar') or a URI with a scheme that
 *     uses an authority (e.g. 'http://example.com/foo.txt' or any other scheme
 *     followed by a double slash).
 * @param {Object} options User options.
 * @return {stream.Transform} A transform stream.
 */
DefaultPlugin.prototype.createWriteTransform = function(str, options) {
  if (!this.handles(str, options)) {
    throw new Error('Unsupported connection type');
  }
  return new stream.PassThrough();
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
