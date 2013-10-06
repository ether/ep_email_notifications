var eejs = require("ep_etherpad-lite/node/eejs");
var settings = require('../../src/node/utils/Settings');

exports.eejsBlock_scripts = function (hook_name, args, cb) {
  args.content = args.content + eejs.require("ep_email_notifications/templates/scripts.html", {}, module);
  return cb();
};

exports.eejsBlock_mySettings = function (hook_name, args, cb) {
  args.content = args.content + eejs.require('ep_email_notifications/templates/email_notifications_settings.ejs');
  return cb();
};

exports.eejsBlock_styles = function (hook_name, args, cb) {
  args.content = args.content + '<link href="../static/plugins/ep_email_notifications/static/css/email_notifications.css" rel="stylesheet">';
};

exports.clientVars = function(hook, context, callback) {
  var pluginSettings = settings.ep_email_notifications;
  var panelDisplayLocation = (pluginSettings && pluginSettings.panelDisplayLocation)?pluginSettings.panelDisplayLocation:"undefined";
  // return the setting to the clientVars, sending the value
  return callback({ "panelDisplayLocation": panelDisplayLocation });
};
