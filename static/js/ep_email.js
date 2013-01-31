var cookie = require('ep_etherpad-lite/static/js/pad_cookie').padcookie;

if(typeof exports == 'undefined'){
  var exports = this['mymodule'] = {};
}

exports.postAceInit = function(hook, context){
  // after 10 seconds if we dont already have an email for this author then prompt them
  setTimeout(function(){init()},10000);

  // subscribe by email can be active..
  $('.ep_email_form').submit(function(){
    sendEmailToServer();
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

function init(){
  var popUpIsAlreadyVisible = $('.ep_email_form').is(":visible");
  if(!popUpIsAlreadyVisible){ // if the popup isn't already visible
    if(clientHasAlreadyRegistered()){ // if the client has already registered for emails on this pad.
      // showAlreadyRegistered(); // client has already registered, let em know..
    }else{
      var cookieVal = pad.getPadId() + "email";
      if(cookie.getPref(cookieVal) !== "true"){ // if this user hasn't already subscribed
        askClientToEnterEmail(); // ask the client to register TODO uncomment me for a pop up
      }
    }
  }
}

function showRegistrationSuccess(){ // show a successful registration message
  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: "Email subscribed",
    // (string | mandatory) the text inside the notification
    text: "You will recieve email when someone changes this pad.  If this is the first time you have requested emails you may need to confirm your email address"
  });
}

function showAlreadyRegistered(){ // the client already registered for emails on this pad so notify the UI
  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: "Email subscription",
    // (string | mandatory) the text inside the notification
    text: "You are already registered for emails for this pad",
    // (bool | optional) if you want it to fade out on its own or just sit there
    sticky: false
  });

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
  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: "Enter your email to recieve an email when someone modifies this pad",
    // (string | mandatory) the text inside the notification
    text: "<form class='ep_email_form'><label for='ep_email'><input id='ep_email_notification' placeholder='your@email.com' style='padding:5px;width:180px;' type=email><input type=submit value=subscribe style='padding:5px;'></form>",
    // (bool | optional) if you want it to fade out on its own or just sit there
    sticky: true,
    // (int | optional) the time you want it to be alive for before fading out
    time: '2000',
    // the function to bind to the form
    after_open: function(e){
      $('.ep_email_form').submit(function(){
        $(e).hide();
        sendEmailToServer();
        return false;
      });
    }
  });
}

function sendEmailToServer(){
  var email = $('#ep_email').val();
  if(!email){ // if we're not using the top value use the notification value
    email = $('#ep_email_notification').val(); 
  }
  var userId = pad.getUserId();
  var message = {};
  message.type = 'USERINFO_UPDATE';
  message.userInfo = {};
  message.padId = pad.getPadId();
  message.userInfo.email = email;
  message.userInfo.userId = userId;
  if(email){
    pad.collabClient.sendMessage(message);
    cookie.setPref(message.padId+"email", "true");
  }
}

