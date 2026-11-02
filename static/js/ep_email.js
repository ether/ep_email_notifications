'use strict';

const cookie = require('ep_etherpad-lite/static/js/pad_cookie').padcookie;
let optionsAlreadyRecovered = false;

// Etherpad core sets `_ = html10n.get` (an unbound reference). Calling
// `_('key')` puts `this = window` inside the get implementation, so
// `this.translations` is `undefined` and the function falls into its
// "No translations available (yet)" branch and returns undefined — every
// time, regardless of whether translations have actually loaded. Newer
// jquery-gritter versions validate the `text` parameter and reject calls
// where it's undefined, so all of this plugin's $.gritter.add calls would
// silently fail to render. Use a properly-bound localizer instead.
const _ = (key) => {
  const h = window.html10n;
  if (!h || typeof h.get !== 'function') return key;
  const out = h.get.call(h, key);
  return out == null ? key : out;
};

exports.postAceInit = (hook, context) => {
  // If panelDisplayLocation setting is missing, set default value
  if (typeof clientVars.panelDisplayLocation !== 'object') {
    clientVars.panelDisplayLocation = {
      mysettings: true, // In the "mysettings" menu
      popup: true,
    };
  }

  // If plugin settings set panel form in mysettings menu
  if (clientVars.panelDisplayLocation.mysettings === true) {
    // Uncheck the checkbox incase of reminiscence
    $('#options-emailNotifications').prop('checked', false);

    $('#options-emailNotifications').on('click', () => {
      if (!optionsAlreadyRecovered) {
        getDataForUserId('ep_email_form_mysettings');
      } else {
        $('.ep_email_settings').slideToggle();
      }
    });

    // Prepare subscription before submit form
    $('[name=ep_email_subscribe]').on('click', (e) => {
      $('[name=ep_email_option]').val('subscribe');
      checkAndSend(e);
    });

    // Prepare unsubscription before submit form
    $('[name=ep_email_unsubscribe]').on('click', (e) => {
      $('[name=ep_email_option]').val('unsubscribe');
      checkAndSend(e);
    });

    // subscribe by email can be active..
    $('#ep_email_form_mysettings').submit(() => {
      sendEmailToServer('ep_email_form_mysettings');
      return false;
    });
  } else {
    // Hide the notification menu in mysettings
    $('#options-emailNotifications').parent().hide();
  }

  // If settings set popup panel form to true, show it
  if (clientVars.panelDisplayLocation.popup === true && !clientVars.ep_email_missing) {
    // after 10 seconds if we dont already have an email for this author then prompt them
    setTimeout(() => { initPopupForm(); }, 10000);
  }
};

exports.handleClientMessage_emailSubscriptionSuccess = (hook, context) => {
  // was subscribing to the email a big win or fail?
  if (context.payload.success === false) {
    showAlreadyRegistered(context.payload.type);
    $(`#${context.payload.formName} [name=ep_email]`).select();
  } else {
    showRegistrationSuccess();

    // Add cookie to say an email is registered for this pad
    cookie.setPref(`${pad.getPadId()}email`, 'true');

    if (clientVars.panelDisplayLocation.mysettings === true &&
          $('.ep_email_settings').is(':visible')) {
      $('.ep_email_settings').slideToggle();
      $('#options-emailNotifications').prop('checked', false);
    }
  }
};

exports.handleClientMessage_emailUnsubscriptionSuccess = (hook, context) => {
  // was subscribing to the email a big win or fail?
  if (context.payload.success === false) {
    showWasNotRegistered();
    $(`#${context.payload.formName} [name=ep_email]`).select();
  } else {
    showUnregistrationSuccess();

    // Set cookie to say no email is registered for this pad
    cookie.setPref(`${pad.getPadId()}email`, 'false');

    if (clientVars.panelDisplayLocation.mysettings === true &&
          $('.ep_email_settings').is(':visible')) {
      $('.ep_email_settings').slideToggle();
      $('#options-emailNotifications').prop('checked', false);
    }
  }
};

exports.handleClientMessage_emailNotificationGetUserInfo = (hook, context) => {
  // return the existing options for this userId
  const result = context.payload;

  // Only use first data from the server.
  // (case when 2 emails subscribed for the same pad & authorId)
  if (optionsAlreadyRecovered === false) {
    if (result.success === true) { // If data found, set the options with them
      $('[name=ep_email]').val(result.email);
      $('[name=ep_email_onStart]').prop('checked', result.onStart);
      $('[name=ep_email_onEnd]').prop('checked', result.onEnd);
    } else { // No data found, set the options to default values
      $('[name=ep_email_onStart]').prop('checked', true);
      $('[name=ep_email_onEnd]').prop('checked', false);
    }

    if (result.formName === 'ep_email_form_mysettings') {
      $('.ep_email_settings').slideToggle();
    }

    optionsAlreadyRecovered = true;
  }
};

exports.handleClientMessage_emailNotificationMissingParams = (hook, context) => {
  // Settings are missing in settings.json file
  clientVars.ep_email_missing = true;

  if (context.payload === true) {
    $.gritter.add({
      // (string | mandatory) the heading of the notification
      title: `× ${_('ep_email_notifications.titleGritterError')}`,
      // (string | mandatory) the text inside the notification
      text: _('ep_email_notifications.msgParamsMissing'),
      // (bool | optional) if you want it to fade out on its own or just sit there
      sticky: true,
      // (string | optional) add a class name to the gritter msg
      class_name: 'emailNotificationsParamsMissing',
    });

    // Hide the notification menu in mysettings
    if (clientVars.panelDisplayLocation.mysettings === true &&
          $('.ep_email_settings').is(':visible')) {
      $('.ep_email_settings').slideToggle();
      $('#options-emailNotifications').prop('checked', false);
      $('#options-emailNotifications').parent().hide();
    }

    // Hide the popup if it is visible
  }
};

/**
 * Nudge the user toward Settings → Email Notifications. Earlier versions
 * of this plugin tried to clone the entire mysettings form into the
 * gritter `text` field, but newer jquery-gritter escapes that text so
 * the popup rendered as raw HTML. The form already lives in the user
 * settings panel — point people there instead.
 */
const initPopupForm = () => {
  const cookieVal = `${pad.getPadId()}email`;
  if (cookie.getPref(cookieVal) === 'true') return;
  $.gritter.add({
    title: `× ${_('ep_email_notifications.titleGritterSubscr')}`,
    text: _('ep_email_notifications.headerGritterSubscr'),
    sticky: true,
    class_name: 'emailNotificationsPopupForm',
  });
};

/**
 * Control options before submitting the form
 */
const checkAndSend = (e) => {
  const formName = $(e.currentTarget.parentNode).attr('id');

  const email = $(`#${formName} [name=ep_email]`).val();

  if (email && $(`#${formName} [name=ep_email_option]`).val() === 'subscribe' &&
      !$(`#${formName} [name=ep_email_onStart]`).is(':checked') &&
      !$(`#${formName} [name=ep_email_onEnd]`).is(':checked')) {
    $.gritter.add({
      // (string | mandatory) the heading of the notification
      title: `× ${_('ep_email_notifications.titleGritterError')}`,
      // (string | mandatory) the text inside the notification
      text: _('ep_email_notifications.msgOptionsNotChecked'),
      // (string | optional) add a class name to the gritter msg
      class_name: 'emailNotificationsSubscrOptionsMissing',
    });
  } else if (email) {
    $(`#${formName}`).submit();
  }
  return false;
};

/**
 * Ask the server to register the email
 */
const sendEmailToServer = (formName) => {
  const email = $(`#${formName} [name=ep_email]`).val();
  const userId = pad.getUserId();
  const message = {};
  message.type = 'USERINFO_UPDATE';
  message.userInfo = {};
  message.padId = pad.getPadId();
  message.userInfo.email = email;
  message.userInfo.email_option = $(`#${formName} [name=ep_email_option]`).val();
  message.userInfo.email_onStart = $(`#${formName} [name=ep_email_onStart]`).is(':checked');
  message.userInfo.email_onEnd = $(`#${formName} [name=ep_email_onEnd]`).is(':checked');
  message.userInfo.formName = formName;
  message.userInfo.language = document.documentElement.lang || navigator.language || 'en';
  message.userInfo.userId = userId;
  if (email) {
    pad.collabClient.sendMessage(message);
  }
};

/**
 * Thanks to the userId, we can get back from the Db the options set for this user
 * and fill the fields with them
 */
const getDataForUserId = (formName) => {
  const userId = pad.getUserId();
  const message = {};
  message.type = 'USERINFO_GET';
  message.padId = pad.getPadId();
  message.userInfo = {};
  message.userInfo.userId = userId;
  message.userInfo.formName = formName;

  pad.collabClient.sendMessage(message);
};

/** ***********************************
Manage return msgs from server
*************************************/

/**
 * Show a successful registration message
 */
const showRegistrationSuccess = () => {
  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: `× ${_('ep_email_notifications.titleGritterSubscr')}`,
    // (string | mandatory) the text inside the notification
    text: _('ep_email_notifications.msgSubscrSuccess'),
    // (int | optional) the time you want it to be alive for before fading out
    time: 10000,
    // (string | optional) add a class name to the gritter msg
    class_name: 'emailNotificationsSubscrResponseGood',
  });
};

/**
 * The client already registered for emails on this pad so notify the UI
 */
const showAlreadyRegistered = (type) => {
  let msg;
  if (type === 'malformedEmail') {
    msg = _('ep_email_notifications.msgEmailMalformed');
  } else if (type === 'alreadyRegistered') {
    msg = _('ep_email_notifications.msgAlreadySubscr');
  } else {
    msg = _('ep_email_notifications.msgUnknownErr');
  }
  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: `× ${_('ep_email_notifications.titleGritterSubscr')}`,
    // (string | mandatory) the text inside the notification
    text: msg,
    // (int | optional) the time you want it to be alive for before fading out
    time: 7000,
    // (string | optional) add a class name to the gritter msg
    class_name: 'emailNotificationsSubscrResponseBad',
  });
};

/**
 * Show a successful unregistration message
 */
const showUnregistrationSuccess = () => {
  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: `× ${_('ep_email_notifications.titleGritterUnsubscr')}`,
    // (string | mandatory) the text inside the notification
    text: _('ep_email_notifications.msgUnsubscrSuccess'),
    // (int | optional) the time you want it to be alive for before fading out
    time: 10000,
    // (string | optional) add a class name to the gritter msg
    class_name: 'emailNotificationsUnsubscrResponseGood',
  });
};

/**
 * The client wasn't registered for emails
 */
const showWasNotRegistered = () => {
  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: `× ${_('ep_email_notifications.titleGritterUnsubscr')}`,
    // (string | mandatory) the text inside the notification
    text: _('ep_email_notifications.msgUnsubscrNotExisting'),
    // (int | optional) the time you want it to be alive for before fading out
    time: 7000,
    // (string | optional) add a class name to the gritter msg
    class_name: 'emailNotificationsUnsubscrResponseBad',
  });
};
