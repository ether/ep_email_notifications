// Main job is to check pads periodically for activity and notify owners when someone begins editing and when someone finishes.
const db = require('../../src/node/db/DB').db;
const API = require('../../src/node/db/API.js');
const async = require('../../src/node_modules/async');
const check = require('validator').check;
const email = require('emailjs');
const settings = require('../../src/node/utils/Settings');
const util = require('util');

const SMTPClient = email.SMTPClient;

// Settings -- EDIT THESE IN settings.json not here..
const pluginSettings = settings.ep_email_notifications;
const areParamsOk = (pluginSettings) ? true : false;
const checkFrequency = (pluginSettings && pluginSettings.checkFrequency) ? pluginSettings.checkFrequency : 60000; // 10 seconds
const staleTime = (pluginSettings && pluginSettings.staleTime) ? pluginSettings.staleTime : 300000; // 5 minutes
const fromName = (pluginSettings && pluginSettings.fromName) ? pluginSettings.fromName : 'Etherpad';
const fromEmail = (pluginSettings && pluginSettings.fromEmail) ? pluginSettings.fromEmail : 'pad@etherpad.org';
const urlToPads = (pluginSettings && pluginSettings.urlToPads) ? pluginSettings.urlToPads : 'http://beta.etherpad.org/p/';
const emailServer = (pluginSettings && pluginSettings.emailServer) ? pluginSettings.emailServer : {host: '127.0.0.1'};

// A timer object we maintain to control how we send emails
const timers = {};

// Connect to the email server -- This might not be the ideal place to connect but it stops us having lots of connections
// var server = email.server.connect(emailServer);

const server = new SMTPClient(emailServer);

const emailFooter = "\nYou can unsubscribe from these emails in the pad's Settings window.\n";

exports.padUpdate = function (hook_name, _pad) {
  if (areParamsOk == false) return false;

  const pad = _pad.pad;
  const padId = pad.id;
  exports.sendUpdates(padId);

  // does an interval not exist for this pad?
  if (!timers[padId]) {
    console.debug(`Someone started editing ${padId}`);
    exports.notifyBegin(padId);
    console.debug(`Created an interval time check for ${padId}`);
    // if not then create one and write it to the timers object
    timers[padId] = exports.createInterval(padId, checkFrequency);
  } else { // an interval already exists so don't create

  }
};

padUrl = function (padId, fmt) {
  fmt = fmt || '%s';
  return util.format(fmt, urlToPads + padId);
};

exports.notifyBegin = function (padId) {
  console.warn(`Getting pad email stuff for ${padId}`);
  db.get(`emailSubscription:${padId}`, (err, recipients) => { // get everyone we need to email
    if (recipients) {
      async.forEach(Object.keys(recipients), (recipient, cb) => {
        // avoid the 'pending' section
        if (recipient != 'pending') {
          // Is this recipient already on the pad?
          exports.isUserEditingPad(padId, recipients[recipient].authorId, (err, userIsOnPad) => { // is the user already on the pad?
            const onStart = typeof (recipients[recipient].onStart) === 'undefined' || recipients[recipient].onStart ? true : false; // In case onStart wasn't defined we set it to true
            if (!userIsOnPad && onStart) {
              console.debug(`Emailing ${recipient} about a new begin update`);
              server.send({
                text: `This pad is now being edited:\n${padUrl(padId, '  <%s>\n')}${emailFooter}`,
                from: `${fromName}<${fromEmail}>`,
                to: recipient,
                subject: `Someone started editing ${padId}`,
              }, (err, message) => { console.log(err || message); });
            } else {
              console.debug("Didn't send an email because user is already on the pad");
            }
          });
        }
        cb(); // finish each user
      },
      (err) => {
        // do some error handling..
      });
    }
  });
};

exports.notifyEnd = function (padId) {
  // TODO: get the modified contents to include in the email

  db.get(`emailSubscription:${padId}`, (err, recipients) => { // get everyone we need to email
    if (recipients) {
      async.forEach(Object.keys(recipients), (recipient, cb) => {
        // avoid the 'pending' section
        if (recipient != 'pending') {
          // Is this recipient already on the pad?
          exports.isUserEditingPad(padId, recipients[recipient].authorId, (err, userIsOnPad) => { // is the user already on the$
            const onEnd = typeof (recipients[recipient].onEnd) === 'undefined' || recipients[recipient].onEnd ? true : false; // In case onEnd wasn't defined we set it to false

            if (!userIsOnPad && onEnd) {
              console.debug(`Emailing ${recipient} about a pad finished being updated`);
              server.send({
                text: `This pad is done being edited:\n${padUrl(padId, '  <%s>\n')}${emailFooter}`,
                from: `${fromName}<${fromEmail}>`,
                to: recipient,
                subject: `Someone finished editing ${padId}`,
              }, (err, message) => { console.log(err || message); });
            } else {
              console.debug("Didn't send an email because user is already on the pad");
            }
          });
        }
        cb(); // finish each user
      },
      (err) => {
        // do some error handling..
      });
    }
  });
};

exports.sendUpdates = function (padId) {
  // check to see if we can delete this interval
  API.getLastEdited(padId, (callback, message) => {
    // we delete an interval if a pad hasn't been edited in X seconds.
    const currTS = new Date().getTime();
    if (currTS - message.lastEdited > staleTime) {
      exports.notifyEnd(padId);
      console.warn('Interval went stale so deleting it from object and timer');
      const interval = timers[padId];
      clearInterval(timers[padId]); // remove the interval timer
      delete timers[padId]; // remove the entry from the padId
    } else {
      console.debug('email timeout not stale so not deleting');
    }
  });
  // The status of the users relationship with the pad -- IE if it's subscribed to this pad / if it's already on the pad
  // This comes frmo the database
  const userStatus = {}; // I'm not even sure we use this value..  I put it here when drunk or something
};


// Is the user editing the pad?
exports.isUserEditingPad = function (padId, user, cb) {
  console.warn('padId is', padId);
  /*
  API.padUsers(padId, function(callback, padUsers){ // get the current users editing the pad
    var userIsEditing = false;
    console.debug("Current Pad Users:"+padUsers);
    // for each user on the pad right now
    async.forEach(padUsers.padUsers,
      function(userOnPad, callback){
        if(userOnPad.id == user){
          console.debug("User is on the pad so don't send any notification");
          userIsEditing = true; // If the user is editing the pad then return true
        }else{
          userIsEditing = false; // If the user isnt on this pad then that'd be okay to contact em
        }
        callback(userIsEditing);

      },
      function(err){
        cb(null, userIsEditing);
      });
   });
  */
  cb(null, false);
};

// Creates an interval process to check to send Updates based on checkFrequency and it returns an ID
exports.createInterval = function (padId) {
  return setInterval(() => {
    exports.sendUpdates(padId), checkFrequency;
  });
};
