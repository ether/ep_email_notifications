var cookie = require('ep_etherpad-lite/static/js/pad_cookie').padcookie;
var firstRun = true;

if(typeof exports == 'undefined'){
  var exports = this['mymodule'] = {};
}

exports.postAceInit = function(hook, context){
  // Uncheck the checkbox
  $('#options-emailNotifications').attr('checked', false);
  setDefaultOptions();

  /* on click */
  $('#options-emailNotifications').on('click', function() {
    if (firstRun) {
      getDatasForUserId();
      firstRun = false;
    } else {
      $('.ep_email_settings').slideToggle();
    }
  });

  // Prepare subscription before submit form
  $('#ep_email_subscribe').on('click', function() {
	$('#ep_email_option').val('subscribe');
	checkAndSend();
  });

  // Prepare unsubscription before submit form
  $('#ep_email_unsubscribe').on('click', function() {
	$('#ep_email_option').val('unsubscribe');
	checkAndSend();
  });

  // subscribe by email can be active..
  $('.ep_email_form').submit(function(){
    sendEmailToServer();
    $('.ep_email_settings').slideToggle();
    $('#options-emailNotifications').attr('checked', false);
    return false;
  });
}

exports.handleClientMessage_emailSubscriptionSuccess = function(hook, context){ // was subscribing to the email a big win or fail?
  if(context.payload == false){
    showAlreadyRegistered();
  }else{
    showRegistrationSuccess();
  }
}

exports.handleClientMessage_emailUnsubscriptionSuccess = function(hook, context){ // was subscribing to the email a big win or fail?
  if(context.payload == false){
    showWasNotRegistered();
  }else{
    showUnregistrationSuccess();
  }
}

exports.handleClientMessage_emailNotificationGetUserInfo = function (hook, context) { // return the existing options for this userId
  var datas = context.payload;
  if(datas.success == true){ // If datas were found, set the options with them
    if (datas.email) $('#ep_email').val(datas.email);
    if (datas.onStart && typeof datas.onStart === 'boolean') $('#ep_email_onStart').attr('checked', datas.onStart);
    if (datas.onEnd && typeof datas.onEnd === 'boolean') $('#ep_email_onEnd').attr('checked', datas.onEnd);
  } else {  // No datas were found, set the options to default values
    setDefaultOptions();
  }

  $('.ep_email_settings').slideToggle();
}

/**
 * Set the options in the frame to a default value
 */
function setDefaultOptions() {
  $('#ep_email_onStart').attr('checked', true);
  $('#ep_email_onEnd').attr('checked', false);
}

/**
 * Control options before submitting the form
 */
function checkAndSend() {
  var email = getEmail();
  if (email && $('#ep_email_option').val() == 'subscribe' && !$('#ep_email_onStart').is(':checked') && !$('#ep_email_onEnd').is(':checked')) {
    $.gritter.add({
      // (string | mandatory) the heading of the notification
      title: "Email subscription error",
      // (string | mandatory) the text inside the notification
      text: "You need to check at least one of the two options from 'Send a mail when someone..'"
    });
  } else if (email) {
    $('.ep_email_form').submit();
  }
  return false;
}

/**
 * Return the email from the user
 */
function getEmail() {
  var email = $('#ep_email').val();
  if(!email){ // if we're not using the top value use the notification value
    email = $('#ep_email_notification').val();
  }
  return email;
}

/**
 * Ask the server to register the email
 */
function sendEmailToServer(){
  var email = getEmail();
  var userId = pad.getUserId();
  var message = {};
  message.type = 'USERINFO_UPDATE';
  message.userInfo = {};
  message.padId = pad.getPadId();
  message.userInfo.email = email;
  message.userInfo.email_option = $('#ep_email_option').val();
  message.userInfo.email_onStart = $('#ep_email_onStart').is(':checked');
  message.userInfo.email_onEnd = $('#ep_email_onEnd').is(':checked');
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
function getDatasForUserId() {
  var userId = pad.getUserId();
  var message = {};
  message.type = 'USERINFO_GET';
  message.padId = pad.getPadId();
  message.userInfo = {};
  message.userInfo.userId = userId;

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
    title: "Email subscribed",
    // (string | mandatory) the text inside the notification
    text: "You will receive email when someone changes this pad.  If this is the first time you have requested emails you may need to confirm your email address"
  });
}

/**
 * The client already registered for emails on this pad so notify the UI
 */
function showAlreadyRegistered(){
  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: "Email subscription",
    // (string | mandatory) the text inside the notification
    text: "You are already registered for emails for this pad",
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
    title: "Email unsubscribed",
    // (string | mandatory) the text inside the notification
    text: "You won't receive anymore email when someone changes this pad."
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
