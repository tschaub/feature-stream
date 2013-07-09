var stream = require('stream');

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
