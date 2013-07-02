

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
  // default is to do nothing.
};
