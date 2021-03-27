'use strict';

const db = require('ep_etherpad-lite/node/db/DB');
const fs = require('fs').promises;
const settings = require('ep_etherpad-lite/node/utils/Settings');

// Remove cache for this procedure
db.db.dbSettings.cache = 0;

exports.registerRoute = (hookName, args, callback) => {
  // Catching (un)subscribe addresses
  const handle = async (req, res) => {
    console.warn('HERE');
    const {padId, action, actionId} = req.params;
    const padURL = settings.ep_email_notifications.urlToPads + encodeURIComponent(padId);

    const userIds = await db.get(`emailSubscription:${padId}`);
    let foundInDb = false;
    let timeDiffGood = false;
    let email = 'your email';

    const {pending = {}} = userIds || {};
    for (const [user, userInfo] of Object.entries(pending)) {
      //  If we have Id int the Db, then we are good ot really unsubscribe the user
      if (userInfo[`${action}Id`] !== actionId) continue;
      console.debug('emailSubscription:', user, 'found in DB:', userInfo);

      foundInDb = true;
      email = user;

      // Checking if the demand is not older than 24h
      const timeDiff = Date.now() - userInfo.timestamp;
      timeDiffGood = timeDiff < 1000 * 60 * 60 * 24;
      if (!timeDiffGood) continue;

      if (action === 'subscribe') {
        // Subscription process
        await Promise.all([
          setAuthorEmail(userInfo, user),
          setAuthorEmailRegistered(userIds, userInfo, user, padId),
        ]);
      } else if (action === 'unsubscribe') {
        // Unsubscription process
        await Promise.all([
          unsetAuthorEmail(userInfo, user),
          unsetAuthorEmailRegistered(userIds, user, padId),
        ]);
      }
    }

    // Create and send the output message
    await sendContent(res, args, action, padId, padURL, {foundInDb, timeDiffGood, email});

    // Take a moment to clean all obsolete pending data
    await cleanPendingData(padId);
  };
  args.app.get('/p/:padId/:action(subscribe|unsubscribe)=:actionId([\\s\\S]{0,})',
      (req, res, next) => handle(req, res).catch((err) => next(err || new Error(err))));

  callback(); // Am I even called?
};

/**
 * Database manipulation
 */

// Updates the database with the email record
const setAuthorEmail = async (userInfo, email) => {
  await db.setSub(`globalAuthor:${userInfo.authorId}`, ['email'], email);
};

// Write email and padId to the database
const setAuthorEmailRegistered = async (userIds, userInfo, email, padId) => {
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
  await db.set(`emailSubscription:${padId}`, userIds); // stick it in the database

  console.debug('setAuthorEmailRegistered: Modified userIds:', userIds);
};

// Updates the database by removing the email record for that AuthorId
const unsetAuthorEmail = async (userInfo, email) => {
  const value = await db.get(`globalAuthor:${userInfo.authorId}`); // get the current value
  if (value.email !== email) return;
  // Remove the email option from the datas
  delete value.email;

  // Write the modified datas back in the Db
  await db.set(`globalAuthor:${userInfo.authorId}`, value);
};

// Remove email, options and padId from the database
const unsetAuthorEmailRegistered = async (userIds, email, padId) => {
  console.debug('unsetAuthorEmailRegistered: initial userIds:', userIds);
  // remove the registered options from the object
  delete userIds[email];

  // remove the pending data
  delete userIds.pending[email];

  // Write the modified datas back in the Db
  console.warn('written to database');
  await db.set(`emailSubscription:${padId}`, userIds);

  console.debug('unsetAuthorEmailRegistered: modified userIds:', userIds);
};

/**
 * We take a moment to remove too old pending (un)subscription
 */
const cleanPendingData = async (padId) => {
  let areDataModified = false;

  const userIds = await db.get(`emailSubscription:${padId}`); // get the current value
  console.debug('cleanPendingData: Initial userIds:', userIds);
  const {pending = {}} = userIds || {};
  for (const user of Object.keys(pending)) {
    const timeDiff = new Date().getTime() - pending[user].timestamp;
    const timeDiffGood = timeDiff < 1000 * 60 * 60 * 24;

    if (timeDiffGood) continue;
    delete pending[user];

    areDataModified = true;
  }

  if (areDataModified) {
    // Write the modified datas back in the Db
    await db.set(`emailSubscription:${padId}`, userIds);
  }

  console.debug(
      `cleanPendingData: Modified userIds: ${userIds} / ${areDataModified}`);
};

/**
 * Create html output with the status of the process
 */
const sendContent = async (res, args, action, padId, padURL, resultDb) => {
  console.debug(
      'starting sendContent: args ->', action, ' / ', padId, ' / ', padURL, ' / ', resultDb);
  let actionMsg;
  if (action === 'subscribe') {
    actionMsg = `Subscribing '${resultDb.email}' to pad ${padId}`;
  } else {
    actionMsg = `Unsubscribing '${resultDb.email}' from pad ${padId}`;
  }
  let msgCause, resultMsg, classResult;

  if (resultDb.foundInDb && resultDb.timeDiffGood) {
    // Pending data were found un Db and updated -> good
    resultMsg = 'Success';
    classResult = 'validationGood';
    if (action === 'subscribe') {
      msgCause = 'You will receive email when someone changes this pad.';
    } else {
      msgCause = "You won't receive anymore email when someone changes this pad.";
    }
  } else if (resultDb.foundInDb) {
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

  args.content = await fs.readFile(`${__dirname}/templates/response.ejs`, 'utf-8');
  args.content = args.content
      .replace(/<%action%>/, actionMsg)
      .replace(/<%classResult%>/, classResult)
      .replace(/<%result%>/, resultMsg)
      .replace(/<%explanation%>/, msgCause)
      .replace(/<%padUrl%>/g, padURL);

  res.contentType('text/html; charset=utf-8');
  res.send(args.content); // Send it to the requester*/
};
