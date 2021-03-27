'use strict';

const db = require('ep_etherpad-lite/node/db/DB').db;
const fs = require('fs');
const settings = require('ep_etherpad-lite/node/utils/Settings');

// Remove cache for this procedure
db.dbSettings.cache = 0;

exports.registerRoute = (hookName, args, callback) => {
  // Catching (un)subscribe addresses
  args.app.get('/p/:padId/:action(subscribe|unsubscribe)=:actionId([\\s\\S]{0,})', (req, res) => {
    console.warn('HERE');
    const {padId, action, actionId} = req.params;
    const padURL = settings.ep_email_notifications.urlToPads + encodeURIComponent(padId);

    db.get(`emailSubscription:${padId}`, (err, userIds) => {
      let foundInDb = false;
      let timeDiffGood = false;
      let email = 'your email';
      let resultDb = {
        foundInDb,
        timeDiffGood,
        email,
      };

      if (userIds && userIds.pending) {
        for (const user of Object.keys(userIds.pending)) {
          const userInfo = userIds.pending[user];

          //  If we have Id int the Db, then we are good ot really unsubscribe the user
          if (userInfo[`${action}Id`] === actionId) {
            console.debug('emailSubscription:', user, 'found in DB:', userInfo);

            foundInDb = true;
            email = user;

            // Checking if the demand is not older than 24h
            const timeDiff = new Date().getTime() - userInfo.timestamp;
            timeDiffGood = timeDiff < 1000 * 60 * 60 * 24;

            if (action === 'subscribe' && timeDiffGood === true) {
              // Subscription process
              setAuthorEmail(
                  userInfo,
                  user
              );

              setAuthorEmailRegistered(
                  userIds,
                  userInfo,
                  user,
                  padId
              );
            } else if (action === 'unsubscribe' && timeDiffGood === true) {
              // Unsubscription process
              unsetAuthorEmail(
                  userInfo,
                  user
              );

              unsetAuthorEmailRegistered(
                  userIds,
                  user,
                  padId
              );
            }

            resultDb = {
              foundInDb,
              timeDiffGood,
              email: user,
            };
          }
        }
      }

      // Create and send the output message
      sendContent(res, args, action, padId, padURL, resultDb);

      // Take a moment to clean all obsolete pending data
      cleanPendingData(padId);
    });
  });

  callback(); // Am I even called?
};

/**
 * Database manipulation
 */

// Updates the database with the email record
const setAuthorEmail = (userInfo, email) => {
  db.setSub(`globalAuthor:${userInfo.authorId}`, ['email'], email);
};

// Write email and padId to the database
const setAuthorEmailRegistered = (userIds, userInfo, email, padId) => {
  console.debug('setAuthorEmailRegistered: Initial userIds:', userIds);
  const timestamp = new Date().getTime();
  const registered = {
    authorId: userInfo.authorId,
    onStart: userInfo.onStart,
    onEnd: userInfo.onEnd,
    timestamp,
  };

  // add the registered values to the object
  userIds[email] = registered;

  // remove the pending data
  delete userIds.pending[email];

  // Write the modified datas back in the Db
  console.warn('written to database');
  db.set(`emailSubscription:${padId}`, userIds); // stick it in the database

  console.debug('setAuthorEmailRegistered: Modified userIds:', userIds);
};

// Updates the database by removing the email record for that AuthorId
const unsetAuthorEmail = (userInfo, email) => {
  db.get(`globalAuthor:${userInfo.authorId}`, (err, value) => { // get the current value
    if (value.email === email) {
      // Remove the email option from the datas
      delete value.email;

      // Write the modified datas back in the Db
      db.set(`globalAuthor:${userInfo.authorId}`, value);
    }
  });
};

// Remove email, options and padId from the database
const unsetAuthorEmailRegistered = (userIds, email, padId) => {
  console.debug('unsetAuthorEmailRegistered: initial userIds:', userIds);
  // remove the registered options from the object
  delete userIds[email];

  // remove the pending data
  delete userIds.pending[email];

  // Write the modified datas back in the Db
  console.warn('written to database');
  db.set(`emailSubscription:${padId}`, userIds);

  console.debug('unsetAuthorEmailRegistered: modified userIds:', userIds);
};

/**
 * We take a moment to remove too old pending (un)subscription
 */
const cleanPendingData = (padId) => {
  let modifiedData; let
    areDataModified = false;

  db.get(`emailSubscription:${padId}`, (err, userIds) => { // get the current value
    console.debug('cleanPendingData: Initial userIds:', userIds);
    modifiedData = userIds;
    if (userIds && userIds.pending) {
      for (const user of Object.keys(userIds.pending)) {
        const timeDiff = new Date().getTime() - userIds.pending[user].timestamp;
        const timeDiffGood = timeDiff < 1000 * 60 * 60 * 24;

        if (timeDiffGood === false) {
          delete modifiedData.pending[user];

          areDataModified = true;
        }
      }
    }

    if (areDataModified === true) {
      // Write the modified datas back in the Db
      db.set(`emailSubscription:${padId}`, modifiedData);
    }

    console.debug(
        `cleanPendingData: Modified userIds: ${modifiedData} / ${areDataModified}`);
  });
};

/**
 * Create html output with the status of the process
 */
const sendContent = (res, args, action, padId, padURL, resultDb) => {
  console.debug(
      'starting sendContent: args ->', action, ' / ', padId, ' / ', padURL, ' / ', resultDb);
  let actionMsg;
  if (action === 'subscribe') {
    actionMsg = `Subscribing '${resultDb.email}' to pad ${padId}`;
  } else {
    actionMsg = `Unsubscribing '${resultDb.email}' from pad ${padId}`;
  }
  let msgCause, resultMsg, classResult;

  if (resultDb.foundInDb === true && resultDb.timeDiffGood === true) {
    // Pending data were found un Db and updated -> good
    resultMsg = 'Success';
    classResult = 'validationGood';
    if (action === 'subscribe') {
      msgCause = 'You will receive email when someone changes this pad.';
    } else {
      msgCause = "You won't receive anymore email when someone changes this pad.";
    }
  } else if (resultDb.foundInDb === true) {
    // Pending data were found but older than a day -> fail
    resultMsg = 'Too late!';
    classResult = 'validationBad';
    msgCause = 'You have max 24h to click the link in your confirmation email.';
  } else {
    // Pending data weren't found in Db -> fail
    resultMsg = 'Fail';
    classResult = 'validationBad';
    msgCause = `We couldn't find any pending
        ${action === 'subscribe' ? 'subscription' : 'unsubscription'}<br />
        in our system with this Id.<br />
        Maybe you wait more than 24h before validating`;
  }

  args.content = fs.readFileSync(`${__dirname}/templates/response.ejs`, 'utf-8');
  args.content = args.content
      .replace(/<%action%>/, actionMsg)
      .replace(/<%classResult%>/, classResult)
      .replace(/<%result%>/, resultMsg)
      .replace(/<%explanation%>/, msgCause)
      .replace(/<%padUrl%>/g, padURL);

  res.contentType('text/html; charset=utf-8');
  res.send(args.content); // Send it to the requester*/
};
