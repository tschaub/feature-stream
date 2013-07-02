

/**
 * @param {Object} grunt Grunt DSL object.
 */
module.exports = function(grunt) {

  var testSrc = 'test/**/*.js';
  var libSrc = 'lib/**/*.js';

  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      gruntfile: {
        src: 'gruntfile.js'
      },
      test: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        src: testSrc
      },
      lib: {
        src: libSrc
      }
    },
    mochaTest: {
      all: {
        options: {
          reporter: 'spec'
        },
        src: ['test/**/*.spec.js']
      }
    }
  });

  grunt.registerTask('test', ['jshint', 'mochaTest']);
  grunt.registerTask('default', 'test');

};
