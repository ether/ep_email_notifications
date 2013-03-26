var eejs = require("ep_etherpad-lite/node/eejs");
var settings = require('ep_etherpad-lite/node/utils/Settings');
var checked_state = '';

exports.eejsBlock_scripts = function (hook_name, args, cb) {
  args.content = args.content + eejs.require("ep_email_notifications/templates/scripts.html", {}, module);
  return cb();
};

/*
exports.eejsBlock_embedPopup = function (hook_name, args, cb) {
  args.content = args.content + eejs.require("ep_email_notifications/templates/embedFrame.html", {}, module);
  return cb();
};
*/

exports.eejsBlock_mySettings = function (hook_name, args, cb) {
  args.content = args.content + eejs.require('ep_email_notifications/templates/email_notifications_settings.ejs', {checked : checked_state});
  return cb();
};

exports.eejsBlock_styles = function (hook_name, args, cb) {
  args.content = args.content + '<link href="../static/plugins/ep_email_notifications/static/css/email_notifications.css" rel="stylesheet">';
};

