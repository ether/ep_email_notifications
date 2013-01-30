function sendEmailToServer(){
  var email = "john@mclear.co.uk";
  var message = {};
  message.type = 'USERINFO_UPDATE';
  message.userInfo = {};
  message.userInfo.colorId = "#0000";
  message.userInfo.email = "test";
  message.userInfo.userId = "FUCKING TEST";

  if(email){
    pad.collabClient.sendMessage(message);
  }
}
