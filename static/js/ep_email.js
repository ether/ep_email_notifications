var cookie = require('ep_etherpad-lite/static/js/pad_cookie').padcookie;
var optionsAlreadyRecovered = false;

if(typeof exports == 'undefined'){
  var exports = this['mymodule'] = {};
}

exports.postAceInit = function(hook, context){
  // Test if settings are good before continuing
  if (typeof clientVars.panelDisplayLocation != "object") {
    $.gritter.add({
      // (string | mandatory) the heading of the notification
      title: "Email subscription error",
      // (string | mandatory) the text inside the notification
      text: "Some settings for the 'email_Notifications' plugin are missing.<br />Please contact your administrator.",
      // (int | optional) the time you want it to be alive for before fading out
      time: 10000,
    });

    // Hide the notification menu in mysettings
    $('#options-emailNotifications').parent().hide();

    return false;
  }

  // If plugin settings set panel form in mysettings menu
  if (clientVars.panelDisplayLocation.mysettings == true) {
    // Uncheck the checkbox incase of reminiscence
    $('#options-emailNotifications').prop('checked', false);

    $('#options-emailNotifications').on('click', function() {
      if (!optionsAlreadyRecovered) {
        getDataForUserId('ep_email_form_mysettings');
        optionsAlreadyRecovered = true;
      } else {
        $('.ep_email_settings').slideToggle();
      }
    });

    // Prepare subscription before submit form
    $('[name=ep_email_subscribe]').on('click', function(e) {
      $('[name=ep_email_option]').val('subscribe');
      checkAndSend(e);
    });

    // Prepare unsubscription before submit form
    $('[name=ep_email_unsubscribe]').on('click', function(e) {
      $('[name=ep_email_option]').val('unsubscribe');
      checkAndSend(e);
    });

    // subscribe by email can be active..
    $('#ep_email_form_mysettings').submit(function(){
      sendEmailToServer('ep_email_form_mysettings');
      return false;
    });
  } else {
    // Hide the notification menu in mysettings
    $('#options-emailNotifications').parent().hide();
  }

  // If settings set popup panel form to true, show it
  if (clientVars.panelDisplayLocation.popup == true) {
    // after 10 seconds if we dont already have an email for this author then prompt them
    setTimeout(function(){initPopupForm()},10000);
  }
}

exports.handleClientMessage_emailSubscriptionSuccess = function(hook, context){ // was subscribing to the email a big win or fail?
  if(context.payload.success == false) {
    showAlreadyRegistered(context.payload.type);
    $('#' + context.payload.formName + ' [name=ep_email]').select();
  } else {
    showRegistrationSuccess();

    if (clientVars.panelDisplayLocation.mysettings == true && $('.ep_email_settings').is(":visible")) {
      $('.ep_email_settings').slideToggle();
      $('#options-emailNotifications').prop('checked', false);
    }

    if (clientVars.panelDisplayLocation.popup == true && $('#ep_email_form_popup').is(":visible")) {
      $('#ep_email_form_popup').parent().parent().parent().hide();
    }
  }
}

exports.handleClientMessage_emailUnsubscriptionSuccess = function(hook, context){ // was subscribing to the email a big win or fail?
  if(context.payload.success == false) {
    showWasNotRegistered();
    $('#' + context.payload.formName + ' [name=ep_email]').select();
  } else {
    showUnregistrationSuccess();

    if (clientVars.panelDisplayLocation.mysettings == true && $('.ep_email_settings').is(":visible")) {
      $('.ep_email_settings').slideToggle();
      $('#options-emailNotifications').prop('checked', false);
    }

    if (clientVars.panelDisplayLocation.popup == true && $('#ep_email_form_popup').is(":visible")) {
      $('#ep_email_form_popup').parent().parent().parent().hide();
    }
  }
}

exports.handleClientMessage_emailNotificationGetUserInfo = function (hook, context) { // return the existing options for this userId
  var result = context.payload;
  if(result.success == true){ // If data found, set the options with them
    $('[name=ep_email]').val(result.email);
    $('[name=ep_email_onStart]').prop('checked', result.onStart);
    $('[name=ep_email_onEnd]').prop('checked', result.onEnd);
  } else {  // No data found, set the options to default values
    $('[name=ep_email_onStart]').prop('checked', true);
    $('[name=ep_email_onEnd]').prop('checked', false);
  }

  if (result.formName == 'ep_email_form_mysettings') {
    $('.ep_email_settings').slideToggle();
  }
}

/**
 * Initialize the popup panel form for subscription
 */
function initPopupForm(){
  var popUpIsAlreadyVisible = $('#ep_email_form_popup').is(":visible");
  if(!popUpIsAlreadyVisible){ // if the popup isn't already visible
    var cookieVal = pad.getPadId() + "email";
    if(cookie.getPref(cookieVal) !== "true"){ // if this user hasn't already subscribed
      askClientToEnterEmail(); // ask the client to register TODO uncomment me for a pop up
    }
  }
}

function clientHasAlreadyRegistered(){ // Has the client already registered for emails on this?
  // Given a specific AuthorID do we have an email address in the database?
  // Given that email address is it registered to this pad?
  // need to pass the server a message to check
  var userId = pad.getUserId();
  var message = {};
  message.type = 'USERINFO_AUTHOR_EMAIL_IS_REGISTERED_TO_PAD';
  message.userInfo = {};
  message.userInfo.userId = userId;
  pad.collabClient.sendMessage(message);
}

function askClientToEnterEmail(){
  var formContent = $('.ep_email_settings')
    .html()
    .replace('ep_email_form_mysettings', 'ep_email_form_popup');

  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: "Email subscription",
    // (string | mandatory) the text inside the notification
    text: "<p>(Receive an email when someone modifies this pad)</p>" + formContent,
    // (bool | optional) if you want it to fade out on its own or just sit there
    sticky: true,
    // (int | optional) the time you want it to be alive for before fading out
    time: 2000,
    // the function to bind to the form
    after_open: function(e){
      $('#ep_email_form_popup').submit(function(){
        sendEmailToServer('ep_email_form_popup');
        return false;
      });

      // Prepare subscription before submit form
      $('#ep_email_form_popup [name=ep_email_subscribe]').on('click', function(e) {
        $('#ep_email_form_popup [name=ep_email_option]').val('subscribe');
        checkAndSend(e);
      });

      // Prepare unsubscription before submit form
      $('#ep_email_form_popup [name=ep_email_unsubscribe]').on('click', function(e) {
        $('#ep_email_form_popup [name=ep_email_option]').val('unsubscribe');
        checkAndSend(e);
      });

      getDataForUserId('ep_email_form_popup');
      optionsAlreadyRecovered = true;
    }
  });
}

/**
 * Control options before submitting the form
 */
function checkAndSend(e) {
  var formName = $(e.currentTarget.parentNode).attr('id');

  var email = $('#' + formName + ' [name=ep_email]').val();

  if (email && $('#' + formName + ' [name=ep_email_option]').val() == 'subscribe'
      && !$('#' + formName + ' [name=ep_email_onStart]').is(':checked')
      && !$('#' + formName + ' [name=ep_email_onEnd]').is(':checked')) {
    $.gritter.add({
      // (string | mandatory) the heading of the notification
      title: "Email subscription error",
      // (string | mandatory) the text inside the notification
      text: "You need to check at least one of the two options from 'Send a mail when someone..'"
    });
  } else if (email) {
    $('#' + formName).submit();
  }
  return false;
}

/**
 * Ask the server to register the email
 */
function sendEmailToServer(formName){
  var email = $('#' + formName + ' [name=ep_email]').val();
  var userId = pad.getUserId();
  var message = {};
  message.type = 'USERINFO_UPDATE';
  message.userInfo = {};
  message.padId = pad.getPadId();
  message.userInfo.email = email;
  message.userInfo.email_option = $('#' + formName + ' [name=ep_email_option]').val();
  message.userInfo.email_onStart = $('#' + formName + ' [name=ep_email_onStart]').is(':checked');
  message.userInfo.email_onEnd = $('#' + formName + ' [name=ep_email_onEnd]').is(':checked');
  message.userInfo.formName = formName;
  message.userInfo.userId = userId;
  if(email){
    pad.collabClient.sendMessage(message);
    cookie.setPref(message.padId+"email", "true");
  }
}

/**
 * Thanks to the userId, we can get back from the Db the options set for this user
 * and fill the fields with them
 */
function getDataForUserId(formName) {
  var userId = pad.getUserId();
  var message = {};
  message.type = 'USERINFO_GET';
  message.padId = pad.getPadId();
  message.userInfo = {};
  message.userInfo.userId = userId;
  message.userInfo.formName = formName;

  pad.collabClient.sendMessage(message);
}

/*************************************
Manage return msgs from server
*************************************/

/**
 * Show a successful registration message
 */
function showRegistrationSuccess(){
  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: "Email subscription",
    // (string | mandatory) the text inside the notification
    text: "An email was sent to your address.<br />Click on the link in order to validate your subscription.",
    // (int | optional) the time you want it to be alive for before fading out
    time: 10000
  });
}

/**
 * The client already registered for emails on this pad so notify the UI
 */
function showAlreadyRegistered(type){
  if (type == "malformedEmail") {
    var msg = "The email address is malformed";
  } else if (type == "alreadyRegistered") {
    var msg = "You are already registered for emails for this pad";
  } else {
    var msg = "Unknown error";
  }
  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: "Email subscription",
    // (string | mandatory) the text inside the notification
    text: msg,
    // (bool | optional) if you want it to fade out on its own or just sit there
    sticky: false
  });

}

/**
 * Show a successful unregistration message
 */
function showUnregistrationSuccess(){
  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: "Email unsubscription",
    // (string | mandatory) the text inside the notification
    text: "An email was sent to your address.<br />Click on the link in order to validate your unsubscription.",
    // (int | optional) the time you want it to be alive for before fading out
    time: 10000
  });
}

/**
 * The client wasn't registered for emails
 */
function showWasNotRegistered(){
  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: "Email unsubscription",
    // (string | mandatory) the text inside the notification
    text: "This email address is not registered for this pad",
    // (bool | optional) if you want it to fade out on its own or just sit there
    sticky: false
  });

}
