function sendEmailToServer(){
  var email = "john@mclear.co.uk";
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
