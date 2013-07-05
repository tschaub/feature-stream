var stream = require('stream');

if (!stream.Readable) {
  stream = require('readable-stream');

  /**
   * Allow us to check whether we need wrapping later.
   * @type {boolean}
   */
  stream.old = true;
}


/**
 * Stream exports.
 * @type {Object}
 */
module.exports = exports = stream;
