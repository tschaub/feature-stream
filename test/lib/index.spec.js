var path = require('path');
var fs = require('fs');

var stream = require('../../lib/stream');
var features = require('../../lib/index');
var helper = require('../helper');

var assert = helper.assert;

describe('feature-stream', function() {

  var data;
  before(function(done) {
    helper.before('basic', function(err, dir) {
      data = dir;
      done(err);
    });
  });

  after(helper.after);

  describe('from()', function() {

    it('creates a readable stream', function() {
      var reader = features.from(path.join(data, 'test.json'));
      assert.instanceOf(reader, stream.Readable);
    });

  });

  describe('to()', function() {

    it('creates a writable stream', function(done) {
      var writer = features.to(path.join(data, 'test2.json'));
      assert.isTrue(writer.writable);
      writer.end();
      writer.on('close', done);
    });

    it('can be used to copy data', function(done) {
      var output = path.join(data, 'test2.json');
      var reader = features.from(path.join(data, 'test.json'));
      var writer = features.to(output);
      writer.on('close', function() {
        fs.exists(output, function(exists) {
          assert.isTrue(exists, 'file copied');
          done();
        });
      });
      reader.pipe(writer);
    });

  });

  xdescribe('transform()', function() {

    it('creates a transform stream', function() {
      var transform = features.transform(function(feature, callback) {
        feature.set('transformed', true);
        callback(null, feature);
      });
      assert.instanceof(transform, stream.Transform);
    });

  });


});
