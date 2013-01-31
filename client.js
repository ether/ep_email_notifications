var eejs = require("ep_etherpad-lite/node/eejs");

exports.eejsBlock_scripts = function (hook_name, args, cb) {
  args.content = args.content + eejs.require("ep_email_notifications/templates/scripts.html", {}, module);
  return cb();
};

exports.eejsBlock_embedPopup = function (hook_name, args, cb) {
  args.content = args.content + eejs.require("ep_email_notifications/templates/embedFrame.html", {}, module);
  return cb();
};
