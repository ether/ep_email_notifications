'use strict';

const eejs = require('ep_etherpad-lite/node/eejs');
const settings = require('ep_etherpad-lite/node/utils/Settings');

exports.eejsBlock_mySettings = (hookName, args, cb) => {
  args.content += eejs.require('ep_email_notifications/templates/email_notifications_settings.ejs');
  cb();
};

exports.eejsBlock_styles = (hookName, args, cb) => {
  const url = '../static/plugins/ep_email_notifications/static/css/email_notifications.css';
  args.content += `<link href="${url}" rel="stylesheet">`;
  cb();
};

exports.clientVars = (hook, context, callback) => {
  const pluginSettings = settings.ep_email_notifications;
  const panelDisplayLocation = (pluginSettings && pluginSettings.panelDisplayLocation)
    ? pluginSettings.panelDisplayLocation : 'undefined';
  // return the setting to the clientVars, sending the value
  callback({panelDisplayLocation});
};
