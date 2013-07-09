var fs = require('fs');
var http = require('http');
var https = require('https');
var stream = require('stream');
var util = require('util');
var zlib = require('zlib');


/**
 * Old style streams (i.e. node < 0.10)
 * @type {@boolean}
 */
var old = false;
if (!stream.Readable) {
  stream = require('readable-stream');
  old = true;
}


/**
 * Stream exports.
 * @type {Object}
 */
module.exports = exports = stream;


/**
 * Ensure a readable stream.
 *
 * @param {stream.Stream} input Candidate stream.
 * @return {stream.Readable} A new-style readable stream.
 */
exports.readable = function(input) {
  if (old) {
    // TODO: https://github.com/isaacs/readable-stream/pull/61
    var sub = new stream.Readable();
    sub.wrap(input);
    input = sub;
  }
  return input;
};



/**
 * Creates a single writable stream that composes a gzip->file pipe.
 *
 * @param {string} output Output file path.
 * @param  {Object} options Options for both the file and gzip stream.
 * @return {stream.Writable} A writable stream.
 */
var GzipFileWriter = exports.GzipFileWriter = function GzipFileWriter(output,
    options) {
  stream.Writable.call(this, options);
  this._fileWriter = fs.createWriteStream(output, options);
  this._gzipWriter = zlib.createGzip(options);
  this._gzipWriter.pipe(this._fileWriter);

  this._gzipWriter.on('drain', this.emit.bind(this, 'drain'));
  this._gzipWriter.on('error', this.emit.bind(this, 'error'));
  this._fileWriter.on('error', this.emit.bind(this, 'error'));
  this._fileWriter.on('close', function() {
    this.emit('finish');
    this.emit('close');
  }.bind(this));
};
util.inherits(GzipFileWriter, stream.Writable);


GzipFileWriter.prototype.end = function(chunk, encoding, callback) {
  return this._gzipWriter.end(chunk, encoding, callback);
};

GzipFileWriter.prototype.write = function(chunk, encoding, callback) {
  return this._gzipWriter.write(chunk, encoding, callback);
};



/**
 * Creates an immediately available readable stream for HTTP(S) requests.  This
 * is used to provide a synchrounous `createReadStream` method for HTTP(S)
 * requests in addition to file reading.
 *
 * @constructor
 * @param {Object} options Request options.
 */
var HttpReader = exports.HttpReader = function HttpReader(options) {
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
};
util.inherits(HttpReader, stream.Readable);


/**
 * Handle the HTTP(S) response.
 * @param {http.ServerResponse|https.ServerResponse} response Server response.
 */
HttpReader.prototype._handleResponse = function(response) {
  response = stream.readable(response);
  var encoding = response.headers['content-encoding'];
  if (encoding === 'gzip') {
    response = response.pipe(zlib.createGunzip());
  }
  this._response = response;
  response.on('readable', function() {
    this.emit('readable');
  }.bind(this));
};


/**
 * Asynchronous read.
 * @param {number} size Number of bytes to read.
 */
HttpReader.prototype._read = function(size) {
  if (this._response) {
    var chunk = this._response.read(size);
    if (chunk) {
      this.push(chunk);
    }
  }
};
