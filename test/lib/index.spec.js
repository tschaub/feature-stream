var path = require('path');
var fs = require('fs');
var Buffer = require('buffer').Buffer;

var stream = require('../../lib/stream');
var features = require('../../lib/index');
var helper = require('../helper');

var assert = helper.assert;

describe('feature-stream', function() {

  var data;
  beforeEach(function(done) {
    helper.before('basic', function(err, dir) {
      data = dir;
      done(err);
    });
  });

  afterEach(helper.after);

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
      var input = path.join(data, 'test.json');
      var output = path.join(data, 'test2.json');
      var writer = features.from(input).pipe(features.to(output));
      writer.on('close', function() {
        assert.isTrue(fs.existsSync(output));
        assert.equal(fs.statSync(output).size, fs.statSync(input).size);
        done();
      });
    });

  });

  describe('transform()', function() {

    it('creates a transform stream', function() {
      var transform = features.transform(function(feature, callback) {
        callback(null, feature);
      });
      assert.instanceOf(transform, stream.Transform);
    });

    it('can be used to modify the stream', function(done) {
      var input = path.join(data, 'test.json');
      var output = path.join(data, 'test2.json');
      var transform = features.transform(function(buffer, callback) {
        // since the default plugin doesn't do any transforming, we've
        // got a plain buffer
        for (var i = 0, ii = buffer.length; i < ii; ++i) {
          buffer[i] = 'X'.charCodeAt(0);
        }
        callback(null, buffer);
      });
      var writer = features.from(input)
          .pipe(transform)
          .pipe(features.to(output));
      assert.instanceOf(transform, stream.Transform);
      writer.on('close', function() {
        assert.isTrue(fs.existsSync(output));
        assert.equal(fs.statSync(output).size, fs.statSync(input).size);
        var reader = fs.createReadStream(output);
        reader.on('data', function(chunk) {
          assert.isTrue(/^X+$/.test(String(chunk)));
        });
        reader.on('close', done);
      });
    });

    it('can be used to remove from the stream', function(done) {
      var input = path.join(data, 'test.json');
      var output = path.join(data, 'test2.json');
      var c = 0;
      var transform = features.transform(function(feature, callback) {
        // remove every other feature
        if (c % 2 === 0) {
          callback(null, feature);
        } else {
          callback();
        }
        ++c;
      });
      // using Node 0.8 and 0.10 options for fs.ReadStream here
      var writer = features.from(input, {highWaterMark: 10, bufferSize: 10})
          .pipe(transform)
          .pipe(features.to(output));
      assert.instanceOf(transform, stream.Transform);
      writer.on('close', function() {
        assert.isTrue(fs.existsSync(output));
        assert.isTrue(fs.statSync(output).size < fs.statSync(input).size);
        done();
      });
    });

    it('can be used to add to the stream', function(done) {
      var input = path.join(data, 'test.json');
      var output = path.join(data, 'test2.json');
      var c = 0;
      var transform = features.transform(function(buffer, callback) {
        // add an extra "feature" for every one found
        var newBuffer = new Buffer(buffer.length);
        buffer.copy(newBuffer);
        callback(null, [buffer, newBuffer]);
      });
      // using Node 0.8 and 0.10 options for fs.ReadStream here
      var writer = features.from(input, {highWaterMark: 10, bufferSize: 10})
          .pipe(transform)
          .pipe(features.to(output));
      assert.instanceOf(transform, stream.Transform);
      writer.on('close', function() {
        assert.isTrue(fs.existsSync(output));
        assert.isTrue(fs.statSync(output).size > fs.statSync(input).size);
        done();
      });
    });

  });


});
