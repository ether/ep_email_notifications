'use strict';

const db = require('ep_etherpad-lite/node/db/DB').db;
const email = require('emailjs');
const randomString = require('ep_etherpad-lite/static/js/pad_utils').randomString;
const settings = require('ep_etherpad-lite/node/utils/Settings');

const SMTPClient = email.SMTPClient;

const pluginSettings = settings.ep_email_notifications;
const areParamsOk = (pluginSettings) ? true : false;
const fromName = (pluginSettings && pluginSettings.fromName)
  ? pluginSettings.fromName : 'Etherpad';
const fromEmail = (pluginSettings && pluginSettings.fromEmail)
  ? pluginSettings.fromEmail : 'pad@etherpad.org';
const urlToPads = (pluginSettings && pluginSettings.urlToPads)
  ? pluginSettings.urlToPads : 'http://beta.etherpad.org/p/';
const emailServer = (pluginSettings && pluginSettings.emailServer)
  ? pluginSettings.emailServer : {host: '127.0.0.1'};

if (areParamsOk === false) {
  console.warn('Settings for ep_email_notifications plugin are missing in settings.json file');
}

// Connect to the email server --
// This might not be the ideal place to connect but it stops us having lots of connections
const server = new SMTPClient(emailServer);

// When a new message comes in from the client - FML this is ugly
exports.handleMessage = (hookName, context, callback) => {
  if (context.message && context.message.data) {
    if (context.message.data.type === 'USERINFO_UPDATE') {
      // if it's a request to update an authors email
      if (areParamsOk === false) {
        context.client.json.send({type: 'COLLABROOM',
          data: {
            type: 'emailNotificationMissingParams',
            payload: true,
          }});
        console.error(
            'Settings for ep_email_notifications plugin are missing in settings.json file');
        return callback([null]);
        // don't run onto passing colorId or anything else to the message handler
      } else if (context.message.data.userInfo) {
        if (context.message.data.userInfo.email) { // it contains email
          console.debug(context.message);

          // does email (Un)Subscription already exist for this email address?
          db.get(`emailSubscription:${context.message.data.padId}`, (err, userIds) => {
            console.debug('emailSubscription');

            let alreadyExists = false;

            for (const user of Object.keys(userIds || {})) {
              console.debug('UserIds subscribed by email to this pad:', userIds);
              if (user === context.message.data.userInfo.email) {
                //  If we already have this email registered for this pad
                // This user ID is already assigned to this padId so don't do
                // anything except tell the user they are already subscribed somehow..
                alreadyExists = true;

                if (context.message.data.userInfo.email_option === 'subscribe') {
                  // Subscription process
                  exports.subscriptionEmail(
                      context,
                      context.message.data.userInfo.email,
                      alreadyExists,
                      context.message.data.userInfo,
                      context.message.data.padId,
                      callback
                  );
                } else if (context.message.data.userInfo.email_option === 'unsubscribe') {
                  // Unsubscription process
                  exports.unsubscriptionEmail(
                      context,
                      alreadyExists,
                      context.message.data.userInfo,
                      context.message.data.padId
                  );
                }
              }
            }

            // In case we didn't find it in the Db
            if (alreadyExists === false) {
              if (context.message.data.userInfo.email_option === 'subscribe') {
                // Subscription process
                exports.subscriptionEmail(
                    context,
                    context.message.data.userInfo.email,
                    alreadyExists,
                    context.message.data.userInfo,
                    context.message.data.padId,
                    callback
                );
              } else if (context.message.data.userInfo.email_option === 'unsubscribe') {
                // Unsubscription process
                exports.unsubscriptionEmail(
                    context,
                    alreadyExists,
                    context.message.data.userInfo,
                    context.message.data.padId
                );
              }
            }
          }); // close db get

          return callback([null]);
          // don't run onto passing colorId or anything else to the message handler
        }
      }
    } else if (context.message.data.type === 'USERINFO_GET') {
      // A request to find datas for a userId
      if (context.message.data.userInfo) {
        if (context.message.data.userInfo.userId) { // it contains the userId
          console.debug(context.message);

          // does email Subscription already exist for this UserId?
          db.get(`emailSubscription:${context.message.data.padId}`, (err, userIds) => {
            let userIdFound = false;

            for (const user of Object.keys(userIds || {})) {
              if (userIds[user].authorId === context.message.data.userInfo.userId) {
                //  if we find the same Id in the Db as the one used by the user
                console.debug(
                    'Options for this pad ', userIds[user].authorId, ' found in the Db');
                userIdFound = true;

                // Request user subscription info process
                exports.sendUserInfo(
                    context,
                    userIdFound,
                    user,
                    userIds[user]
                );
              }
            }

            if (userIdFound === false) {
              // Request user subscription info process
              exports.sendUserInfo(
                  context,
                  userIdFound,
                  '',
                  ''
              );
            }
          });
          return callback([null]);
        }
      }
    }
  }
  callback();
};

/**
 * Subscription process
 */
exports.subscriptionEmail = (context, email, emailFound, userInfo, padId, callback) => {
  const validatesAsEmail = exports.checkEmailValidation(email);
  const subscribeId = randomString(25);
  if (emailFound === false && validatesAsEmail) {
    // Subscription -> Go for it
    console.debug('Subscription: Wrote to the database and sent client a positive response ',
        context.message.data.userInfo.email);

    exports.setAuthorEmailRegistered(
        userInfo,
        userInfo.userId,
        subscribeId,
        padId
    );

    console.debug('emailSubSucc');
    context.client.json.send({type: 'COLLABROOM',
      data: {
        type: 'emailSubscriptionSuccess',
        payload: {
          formName: userInfo.formName,
          success: true,
        },
      }});

    // Send mail to user with the link for validation
    server.send(
        {
          text: `Please click on this link in order to validate your subscription to the pad
              ${padId}\n${urlToPads}${encodeURI(padId)}/subscribe=${subscribeId}`,
          from: `${fromName}<${fromEmail}>`,
          to: userInfo.email,
          subject: `Email subscription confirmation for pad ${padId}`,
        },
        (err, message) => {
          console.error(err || message);
        }
    );
  } else if (!validatesAsEmail) {
    // Subscription -> failed coz mail malformed..  y'know in general fuck em!
    console.debug('Dropped email subscription due to malformed email address');
    context.client.json.send({type: 'COLLABROOM',
      data: {
        type: 'emailSubscriptionSuccess',
        payload: {
          type: 'malformedEmail',
          formName: userInfo.formName,
          success: false,
        },
      }});
  } else {
    // Subscription -> failed coz email already subscribed for this pad
    console.debug('email ', context.message.data.userInfo.email,
        'already subscribed to ', context.message.data.padId, ' so sending message to client');

    context.client.json.send({type: 'COLLABROOM',
      data: {
        type: 'emailSubscriptionSuccess',
        payload: {
          type: 'alreadyRegistered',
          formName: userInfo.formName,
          success: false,
        },
      }});
  }
};

/**
 * UnsUbscription process
 */
exports.unsubscriptionEmail = (context, emailFound, userInfo, padId) => {
  const unsubscribeId = randomString(25);

  if (emailFound === true) {
    // Unsubscription -> Go for it
    console.debug('Unsubscription: Remove from the database and sent client a positive response ',
        context.message.data.userInfo.email);

    exports.unsetAuthorEmailRegistered(
        userInfo,
        userInfo.userId,
        unsubscribeId,
        padId
    );

    context.client.json.send({type: 'COLLABROOM',
      data: {
        type: 'emailUnsubscriptionSuccess',
        payload: {
          formName: userInfo.formName,
          success: true,
        },
      }});

    // Send mail to user with the link for validation
    server.send(
        {
          text: `Please click on this link in order to validate your unsubscription to the pad
            ${padId}\n${urlToPads}${padId}/unsubscribe=${unsubscribeId}`,
          from: `${fromName}<${fromEmail}>`,
          to: userInfo.email,
          subject: `Email unsubscription confirmation for pad ${padId}`,
        },
        (err, message) => {
          console.error(err || message);
        }
    );
  } else {
    // Unsubscription -> Send failed as email not found
    console.debug(
        'Unsubscription: Send client a negative response ', context.message.data.userInfo.email);

    context.client.json.send({type: 'COLLABROOM',
      data: {
        type: 'emailUnsubscriptionSuccess',
        payload: {
          formName: userInfo.formName,
          success: false,
        },
      }});
  }
};

/**
 * Request user subscription info process
 */
exports.sendUserInfo = (context, emailFound, email, userInfo) => {
  const defaultOnStartOption = true;
  const defaultOnEndOption = false;
  let onStart;
  let onEnd;
  if (typeof userInfo.onStart === 'boolean' && typeof userInfo.onEnd === 'boolean') {
    onStart = userInfo.onStart;
    onEnd = userInfo.onEnd;
  } else { // In case these options are not yet defined for this userId
    onStart = defaultOnStartOption;
    onEnd = defaultOnEndOption;
  }

  if (emailFound === true) {
    // We send back the options associated to this userId
    const msg = {
      type: 'emailNotificationGetUserInfo',
      payload: {
        email,
        onStart,
        onEnd,
        formName: context.message.data.userInfo.formName,
        success: true,
      },
    };

    context.client.json.send({type: 'COLLABROOM', data: msg});
  } else {
    // No options set for this userId
    context.client.json.send({type: 'COLLABROOM',
      data: {
        type: 'emailNotificationGetUserInfo',
        payload: {
          formName: context.message.data.userInfo.formName,
          success: false,
        },
      }});
  }
};

/**
 * Function to check if an email is valid
 */
exports.checkEmailValidation = (email) => {
  const validator = require('validator');
  if (validator.isEmail(email)) {
    return true;
  } else {
    return false;
  }
};

/**
 * Database manipulation
 */

// Write email, options, authorId and pendingId to the database
exports.setAuthorEmailRegistered = (userInfo, authorId, subscribeId, padId) => {
  const timestamp = new Date().getTime();
  const registered = {
    authorId,
    onStart: userInfo.email_onStart,
    onEnd: userInfo.email_onEnd,
    subscribeId,
    timestamp,
  };
  console.debug('registered', registered, ' to ', padId);

  // Here we have to basically hack a new value into the database, this isn't clean or polite.
  db.get(`emailSubscription:${padId}`, (err, value) => { // get the current value
    if (!value) {
      // if an emailSubscription doesnt exist yet for this padId don't panic
      value = {pending: {}};
    } else if (!value.pending) {
      // if the pending section doesn't exist yet for this padId, we create it
      value.pending = {};
    }

    // add the registered values to the pending section of the object
    value.pending[userInfo.email] = registered;

    // Write the modified datas back in the Db
    db.set(`emailSubscription:${padId}`, value); // stick it in the database
  });
};

// Write email, authorId and pendingId to the database
exports.unsetAuthorEmailRegistered = (userInfo, authorId, unsubscribeId, padId) => {
  const timestamp = new Date().getTime();
  const registered = {
    authorId,
    unsubscribeId,
    timestamp,
  };
  console.debug('unregistered', userInfo.email, ' to ', padId);

  db.get(`emailSubscription:${padId}`, (err, value) => { // get the current value
    // if the pending section doesn't exist yet for this padId, we create it (this shouldn't happen)
    if (!value.pending) { value.pending = {}; }

    // add the registered values to the pending section of the object
    value.pending[userInfo.email] = registered;

    // Write the modified datas back in the Db
    db.set(`emailSubscription:${padId}`, value);
  });
};
