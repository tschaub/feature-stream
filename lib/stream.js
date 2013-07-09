var fs = require('fs');
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
var GzipFileWriter = function(output, options) {
  stream.Writable.call(this, options);
  this._fileWriter = fs.createWriteStream(output, options);
  this._gzipWriter = zlib.createGzip(options);
  this._gzipWriter.pipe(this._fileWriter);

  this._gzipWriter.on('drain', this.emit.bind(this, 'drain'));
  this._gzipWriter.on('error', this.emit.bind(this, 'error'));
  this._fileWriter.on('error', this.emit.bind(this, 'error'));
  this._fileWriter.on('close', this.emit.bind(this, 'finish'));
};
util.inherits(GzipFileWriter, stream.Writable);


GzipFileWriter.prototype.end = function(chunk, encoding, callback) {
  return this._gzipWriter.end(chunk, encoding, callback);
};

GzipFileWriter.prototype.write = function(chunk, encoding, callback) {
  return this._gzipWriter.write(chunk, encoding, callback);
};
