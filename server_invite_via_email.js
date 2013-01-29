exports.expressServer = function (hook_name, args, cb) {
  args.app.get('/server_invite_via_email', function(req, res) {
    console.log(req);
    // Get the parameters from the POST request
    var name        = req.param('name', null);  // the name of the recipient
    var emailAddy   = req.param('email', null);  // the email address of the recipient
    var padurl      = req.param('padurl', null);  // the url of the pad the recipient is being invited to
  
    // Get email and buffer tools dependencies 
    var email       = require("emailjs/email");
    var buffertools = require("buffertools");

    // Define the server connection
    var server  = email.server.connect({
       host:    "localhost",
       port:    "25",
       ssl:     false
    });
  
    // Send the message and get a callback with an error or details of the message that was sent
    server.send({
       text:    "You have been invited to collaboratively edit the pad at: " +padurl,
       from:    "Etherpad <email-invite@etherpad.org>",
       to:      "<"+emailAddy+">",
       subject: "You have been invited to a pad"
    }, function(err, message){
      // console.log(err || message);
      res.send(err || message); // Send the response back to the client
    });
  });
}
