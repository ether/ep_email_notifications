exports.postAceInit = function(){

  // after 10 seconds if we dont already have an email for this author then prompt them
  setTimeout(function(){askClientToEnterEmail()},10000);
}

function askClientToEnterEmail(){
  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: "Recieve Email notifications for this pad",
    // (string | mandatory) the text inside the notification
    text: "<form id='ep_email_form'><label for='ep_email'><input type=text id='ep_email'><input type=submit></form>",
    // (bool | optional) if you want it to fade out on its own or just sit there
    sticky: true,
    // (int | optional) the time you want it to be alive for before fading out
    time: '2000',
    // the function to bind to the form
    after_open: function(e){
      $('#ep_email_form').submit(function(){
        $(e).hide();

        $.gritter.add({
          // (string | mandatory) the heading of the notification
          title: "Email subscribed",
          // (string | mandatory) the text inside the notification
          text: "You will recieve email when someone changes this.    If this is the first time you have requested emails you will need to confirm your email address"
        });
        sendEmailToServer();
        return false;
      });
    }
  });
}

function sendEmailToServer(){
  var email = $('#ep_email').val();
  var userId = pad.getUserId();
  var message = {};
  message.type = 'USERINFO_UPDATE';
  message.userInfo = {};
//  message.userInfo.colorId = "#0000";
  message.userInfo.email = email;
  message.userInfo.userId = userId;

  if(email){
    pad.collabClient.sendMessage(message);
  }
}
