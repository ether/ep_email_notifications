'use strict';

// Main job is to check pads periodically for activity and notify owners when
// someone begins editing and when someone finishes.
const db = require('ep_etherpad-lite/node/db/DB');
const API = require('ep_etherpad-lite/node/db/API.js');
const email = require('emailjs');
const settings = require('ep_etherpad-lite/node/utils/Settings');
const util = require('util');

const SMTPClient = email.SMTPClient;

// Settings -- EDIT THESE IN settings.json not here..
const pluginSettings = settings.ep_email_notifications;
const checkFrequency = (pluginSettings && pluginSettings.checkFrequency)
  ? pluginSettings.checkFrequency : 60000; // 10 seconds
const staleTime = (pluginSettings && pluginSettings.staleTime)
  ? pluginSettings.staleTime : 300000; // 5 minutes
const fromName = (pluginSettings && pluginSettings.fromName)
  ? pluginSettings.fromName : 'Etherpad';
const fromEmail = (pluginSettings && pluginSettings.fromEmail)
  ? pluginSettings.fromEmail : 'pad@etherpad.org';
const urlToPads = (pluginSettings && pluginSettings.urlToPads)
  ? pluginSettings.urlToPads : 'http://beta.etherpad.org/p/';
const emailServer = (pluginSettings && pluginSettings.emailServer)
  ? pluginSettings.emailServer : {host: '127.0.0.1'};

// A timer object we maintain to control how we send emails
const timers = {};

// Connect to the email server -- This might not be the ideal place to connect
// but it stops us having lots of connections

const server = new SMTPClient(emailServer);

const emailFooter = "\nYou can unsubscribe from these emails in the pad's Settings window.\n";

exports.padUpdate = (hookName, _pad) => {
  if (!pluginSettings) return false;

  const pad = _pad.pad;
  const padId = pad.id;
  sendUpdates(padId);

  if (timers[padId]) return; // an interval already exists so don't create

  console.debug(`Someone started editing ${padId}`);
  notifyBegin(padId);
  console.debug(`Created an interval time check for ${padId}`);
  // if not then create one and write it to the timers object
  timers[padId] = setInterval(() => sendUpdates(padId), checkFrequency);
};

const padUrl = (padId) => urlToPads + encodeURIComponent(padId);

const notifyBegin = async (padId) => {
  console.warn(`Getting pad email stuff for ${padId}`);
  const recipients = await db.get(`emailSubscription:${padId}`); // get everyone we need to email
  if (!recipients) return;
  await Promise.all(Object.keys(recipients).map(async (recipient) => {
    // avoid the 'pending' section
    if (recipient === 'pending') return;
    // Is this recipient already on the pad?
    const userIsOnPad = await isUserEditingPad(padId, recipients[recipient].authorId);
    // is the user already on the pad?
    const {onStart = true} = recipients[recipient];
    // In case onStart wasn't defined we set it to true
    if (userIsOnPad || !onStart) {
      console.debug("Didn't send an email because user is already on the pad");
      return;
    }
    console.debug(`Emailing ${recipient} about a new begin update`);
    let message;
    try {
      message = await util.promisify(server.send.bind(server))({
        text: `This pad is now being edited:\n  <${padUrl(padId)}>\n${emailFooter}`,
        from: `${fromName} <${fromEmail}>`,
        to: recipient,
        subject: `Someone started editing ${padId}`,
      });
    } catch (err) {
      console.error(err);
      return;
    }
    console.log(message);
  }));
};

const notifyEnd = async (padId) => {
  // TODO: get the modified contents to include in the email

  const recipients = await db.get(`emailSubscription:${padId}`); // get everyone we need to email
  if (!recipients) return;
  await Promise.all(Object.keys(recipients).map(async (recipient) => {
    // avoid the 'pending' section
    if (recipient === 'pending') return;
    // Is this recipient already on the pad?
    const userIsOnPad = await isUserEditingPad(padId, recipients[recipient].authorId);
    const {onEnd = true} = recipients[recipient];
    // In case onEnd wasn't defined we set it to false

    if (userIsOnPad || !onEnd) {
      console.debug("Didn't send an email because user is already on the pad");
      return;
    }
    console.debug(`Emailing ${recipient} about a pad finished being updated`);
    let message;
    try {
      message = await util.promisify(server.send.bind(server))({
        text: `This pad is done being edited:\n  <${padUrl(padId)}>\n${emailFooter}`,
        from: `${fromName} <${fromEmail}>`,
        to: recipient,
        subject: `Someone finished editing ${padId}`,
      });
    } catch (err) {
      console.error(err);
      return;
    }
    console.log(message);
  }));
};

const sendUpdates = async (padId) => {
  // check to see if we can delete this interval
  const message = await API.getLastEdited(padId);
  // we delete an interval if a pad hasn't been edited in X seconds.
  const currTS = new Date().getTime();
  if (currTS - message.lastEdited <= staleTime) {
    console.debug('email timeout not stale so not deleting');
    return;
  }
  console.warn('Interval went stale so deleting it from object and timer');
  clearInterval(timers[padId]); // remove the interval timer
  delete timers[padId]; // remove the entry from the padId
  await notifyEnd(padId);
  // The status of the users relationship with the pad --
  // IE if it's subscribed to this pad / if it's already on the pad
  // This comes frmo the database
};

const isUserEditingPad = async (padId, user) => {
  const {padUsers} = await API.padUsers(padId);
  return padUsers.map((author) => author.id).includes(user);
};
