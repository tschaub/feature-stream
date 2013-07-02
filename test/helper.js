var fs = require('fs');
var path = require('path');

var chai = require('chai');
var tmp = require('tmp');
var wrench = require('wrench');

var fixtures = path.join(__dirname, 'fixtures');
var tmpDir = 'tmp';


/** @type {boolean} */
chai.Assertion.includeStack = true;


/** @type {function} */
exports.assert = chai.assert;


/**
 * Set up before tests are run.
 * @param {string} name Fixture name (directory within the fixtures directory).
 * @param {function(Error, string)} done Callback.
 */
exports.before = function(name, done) {
  var fixture = path.join(fixtures, name);

  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir);
  }

  tmp.dir({dir: tmpDir}, function(error, dir) {
    if (error) {
      return done(error);
    }
    var scratch = path.join(dir, name);
    wrench.copyDirRecursive(fixture, scratch, function(error) {
      done(error, scratch);
    });
  });

};


/**
 * Clean up after running tests.
 * @param {function} done Callback.
 */
exports.after = function(done) {
  var error;
  try {
    wrench.rmdirSyncRecursive(tmpDir, false);
  } catch (err) {
    error = err;
  }
  done(error);
};
