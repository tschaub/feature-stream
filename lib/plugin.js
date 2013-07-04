var fs = require('fs');
var stream = require('stream');
var http = require('http');
var https = require('https');
var url = require('url');

var old = false;
if (!stream.Readable) {
  old = true;
  stream = require('readable-stream');
}


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
  if (old) {
    response = new stream.Readable().wrap(response);
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
Plugin.prototype.createReadStream = function(str, options) {
  var stream;
  if (!hasAuthority(str)) {
    // assume file path
    stream = fs.createReadStream(str, options);
    if (old) {
      stream = new stream.Readable().wrap(stream);
    }
  } else {
    var parts = url.parse(str);
    if (parts.protocol === 'http' || parts.protocol === 'https') {
      // apply user options
      if (options) {
        for (var key in options) {
          parts[key] = options[key];
        }
      }
      stream = new HttpReader(parts);
    } else {
      throw new Error('Unsupported protocol: ' + parts.protocol);
    }
  }
  return stream;
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
 * @param {function(Error, stream.Transform)} callback Callback.
 */
Plugin.prototype.createReadTransform = function(str, options, callback) {
  process.nextTick(function() {
    callback(null, new stream.PassThrough());
  });
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
Plugin.prototype.createWriteStream = function(str, options, callback) {
  var stream;
  if (!hasAuthority(str)) {
    // assume file path
    fs.createWriteStream(str, options);
  } else {
    var parts = url.parse(str);
    var protocol;
    if (parts.protocol === 'http') {
      protocol = http;
    } else if (parts.protocol === 'https') {
      protocol = https;
    }
    if (protocol) {
      stream = protocol.request(str, options, callback);
    } else {
      throw new Error('Unsupported protocol: ' + parts.protocol);
    }
  }
  return stream;
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
