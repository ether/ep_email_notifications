 var  db = require('../../src/node/db/DB').db,
     API = require('../../src/node/db/API.js'),
   async = require('../../src/node_modules/async'),
settings = require('../../src/node/utils/Settings');

var pluginSettings = settings.ep_email_notifications;
var checkInterval = 60000; // Move me to the settings file
var staleTime = 3600000; // Move me to settings
var timers = {};

// When a new message comes in from the client
exports.handleMessage = function(hook_name, context, callback){
  if (context.message && context.message.data){
    if (context.message.data.type == 'USERINFO_UPDATE' ) { // if it's a request to update an authors email
      if (context.message.data.userInfo){
        console.debug("userInfo",context.message.data.userInfo);
        if(context.message.data.userInfo.email){ // it contains email
          // console.warn(context.message.data.userInfo.userId);

          console.debug(context.message);

          db.get("emailSubscription:"+context.message.data.padId, function(err, userIds){ // does email Subscription already exist for this user?

            console.debug("UserIds subscribed by email to this pad:", userIds);

            if(userIds){ //  THIS NEEDS TO BE AN OBJECT :: TODO
              // This user ID is already assigned to this padId so don't do anything except tell the user they are already subscribed somehow..

              context.client.json.send({ type: "COLLABROOM",
                data:{
                  type: email_subscription_success,
                  payload: false
                }
              });

            }else{

              // console.warn ("WRITE MY GOODNESS TO THE DATABASE!",context.message.data.userInfo.email);

              exports.setAuthorEmail(
                context.message.data.userInfo.userId, 
                context.message.data.userInfo.email, callback
              );

              exports.setAuthorEmailRegistered(
                context.message.data.userInfo.userId,
                context.message.data.padId, callback
              );
 
              context.client.json.send({ type: "COLLABROOM",
                data:{
                  type: email_subscription_success,
                  payload: true
                }
              });

            }
          });

          callback(null); // don't run onto passing colorId or anything else to the message handler

        }
      }
    }
  }
  callback();
}

exports.doesPadIdEmailAssociationAlreadyExist = function (padId, email){
  var found = false;
  db.get("emailSubscription:"+padId, function(err, value){
    return value;
  });
}

exports.padUpdate = function (hook_name, _pad) {

  var pad = _pad.pad;
  var padId = pad.id;
  exports.sendUpdates(padId);

  // does an interval not exist for this pad?
  if(!timers[padId]){
    console.debug("Created an interval time check for "+padId);
    // if not then create one and write it to the timers object
    timers[padId] = exports.createInterval(padId, checkInterval); 
  }else{ // an interval already exists so don't create

  }

};

exports.sendUpdates = function(padId){

  // check to see if we can delete this interval
  API.getLastEdited(padId, function(callback, message){

    // we delete an interval if a pad hasn't been edited in X seconds.
    var currTS = new Date().getTime();
    if(currTS - message.lastEdited > staleTime){
      console.warn("Interval went stale so deleting it from object and timer");
      var interval = timers[padId];
      clearInterval(timers[padId]); // remove the interval timer
      delete timers[padId]; // remove the entry from the padId
      
    }else{
      console.debug("email timeotu not stale so not deleting");
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

// Updates the database with the email record
exports.setAuthorEmail = function (author, email, callback){
  db.setSub("globalAuthor:" + author, ["email"], email, callback);
}

// Write email and padId to the database
exports.setAuthorEmailRegistered = function(author, padId, callback){
  db.set("emailSubscription:" + padId, author);
}
