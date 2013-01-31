// We check pads periodically for activity and notify owners when someone begins editing and when someone finishes.

 var  db = require('../../src/node/db/DB').db,
     API = require('../../src/node/db/API.js'),
   async = require('../../src/node_modules/async'),
   check = require('validator').check,
   email = require('emailjs'),
settings = require('../../src/node/utils/Settings');

var pluginSettings = settings.ep_email_notifications;
var checkInterval = 3000; // How frequently to check for pad updates -- Move me to the settings file
var staleTime = 3000; // How stale does a pad need to be before notifying subscribers?  Move me to settings
var timers = {};
var fromName = "John McLear";
var fromEmail = "john@mclear.co.uk";
var urlToPads = "http://beta.etherpad.org/p/";

var server  = email.server.connect({
   user:    "username", 
   password:"password", 
   host:    "smtp.gmail.com", 
});

exports.padUpdate = function (hook_name, _pad) {

  var pad = _pad.pad;
  var padId = pad.id;
  exports.sendUpdates(padId);

  // does an interval not exist for this pad?
  if(!timers[padId]){
    console.warn("Someone started editing "+padId);
    exports.notifyBegin(padId);
    console.debug("Created an interval time check for "+padId);
    // if not then create one and write it to the timers object
    timers[padId] = exports.createInterval(padId, checkInterval); 
  }else{ // an interval already exists so don't create

  }

};

exports.notifyBegin = function(padId){
  db.get("emailSubscription:" + padId, function(err, recipients){ // get everyone we need to email
    async.forEach(Object.keys(recipients), function(recipient, cb){
      console.debug("Emailing "+recipient +" about a new begin update");

      server.send({
        text:    "Your pad at "+urlToPads+"/p/"+padId +" is being edited, we're just emailing you let you know :)", 
        from:    fromName+ "<"+fromEmail+">", 
        to:      recipient,
        subject: "Someone begin editing "+padId
      }, function(err, message) { console.log(err || message); });

      cb(); // finish each user
    },
    function(err){

    });
  });
}

exports.notifyEnd = function(padId){
  // get the modified contents...
  

  db.get("emailSubscription:" + padId, function(err, recipients){ // get everyone we need to email
    async.forEach(Object.keys(recipients), function(recipient, cb){
      console.debug("Emailing "+recipient +" about a new begin update");

      server.send({
        text:    "Your pad at "+urlToPads+"/p/"+padId +" has finished being edited, we're just emailing you let you know :)  The changes look like this:" + changesToPad,
        from:    fromName+ "<"+fromEmail+">",
        to:      recipient,
        subject: "Someone begin editing "+padId
      }, function(err, message) { console.log(err || message); });

      cb(); // finish each user
    },
    function(err){

    });
  });
}

exports.sendUpdates = function(padId){

  // check to see if we can delete this interval
  API.getLastEdited(padId, function(callback, message){

    // we delete an interval if a pad hasn't been edited in X seconds.
    var currTS = new Date().getTime();
    if(currTS - message.lastEdited > staleTime){
      exports.notifyEnd(padId);
      console.warn("Interval went stale so deleting it from object and timer");
      var interval = timers[padId];
      clearInterval(timers[padId]); // remove the interval timer
      delete timers[padId]; // remove the entry from the padId
      
    }else{
      console.debug("email timeout not stale so not deleting");
    }

  });

  // The status of the users relationship with the pad -- IE if it's subscribed to this pad / if it's already on the pad
  // This comes frmo the database
  var userStatus = {};

  // Temporary user object
  var user = {
    name:  "John McLear",
    email: "john@mclear.co.uk",
    id:    "a.n4gEeMLsv1GivNeh"
  }

  console.debug("ep_email_noficiations: padID of pad being edited:"+padId);
  exports.isUserEditingPad(padId, user, function(err,results){
    userStatus.userIsEditing = results;
    console.debug("isUserEditingPad is:", results);
  });

}


// Is the user editing the pad?
exports.isUserEditingPad = function(padId, user, cb){
  API.padUsers(padId, function(callback, padUsers){ // get the current users editing the pad

    var userIsEditing = false;
    console.debug("Pad Users:"+padUsers);

    // for each user on the pad right now
    async.forEach(padUsers.padUsers,

      function(userOnPad, callback){

        if(userOnPad.id == user.id){
          console.debug("I'm on the pad so don't send any notification");
          userIsEditing = true; // If the user is editing the pad then return true
        }else{
          userIsEditing = false; // If the user isnt on this pad then that'd be okay to contact em
        }
        callback(userIsEditing);

      },

      function(err){
        cb(null, userIsEditing);
      });

   });
};

// Creates an interval process to check to send Updates based on checkInterval and it returns an ID
exports.createInterval = function(padId){
  return setInterval(function(){
    exports.sendUpdates(padId), checkInterval
  });
}

