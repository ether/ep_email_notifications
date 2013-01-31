 var  db = require('../../src/node/db/DB').db,
     API = require('../../src/node/db/API.js'),
   async = require('../../src/node_modules/async'),
   check = require('validator').check,
settings = require('../../src/node/utils/Settings');

var pluginSettings = settings.ep_email_notifications;

// When a new message comes in from the client - FML this is ugly
exports.handleMessage = function(hook_name, context, callback){
  if (context.message && context.message.data){
    if (context.message.data.type == 'USERINFO_UPDATE' ) { // if it's a request to update an authors email
      if (context.message.data.userInfo){
        if(context.message.data.userInfo.email){ // it contains email
          console.debug(context.message);

          // does email Subscription already exist for this email address?
          db.get("emailSubscription:"+context.message.data.padId, function(err, userIds){

            var alreadyExists = false;
            if(userIds){
              async.forEach(Object.keys(userIds), function(user, cb){
                console.debug("UserIds subscribed by email to this pad:", userIds);
                  if(user == context.message.data.userInfo.email){ //  If we already have this email registered for this pad

                  // This user ID is already assigned to this padId so don't do anything except tell the user they are already subscribed somehow..
                  alreadyExists = true;
                  console.debug("email ", user, "already subscribed to ", context.message.data.padId, " so sending message to client");

                  context.client.json.send({ type: "COLLABROOM",
                    data:{
                      type: "emailSubscriptionSuccess",
                      payload: false
                    }
                  });
                }
                cb();
              },

              function(err){
                // There should be something in here!
              }); // end async for each
            }
            var validatesAsEmail = check(context.message.data.userInfo.email).isEmail();
            if(!validatesAsEmail){ // send validation failed if it's malformed..  y'know in general fuck em!
              console.warn("Dropped email subscription due to malformed email address");
              context.client.json.send({ type: "COLLABROOM",
                data:{
                  type: "emailSubscriptionSuccess",
                  payload: false
                 }
              });
            }
            if(alreadyExists == false && validatesAsEmail){
              console.debug ("Wrote to the database and sent client a positive response ",context.message.data.userInfo.email);

              exports.setAuthorEmail(
                context.message.data.userInfo.userId,
                context.message.data.userInfo.email, callback
              );

              exports.setAuthorEmailRegistered(
                context.message.data.userInfo.email,
                context.message.data.userInfo.userId,
                context.message.data.padId
              );

              context.client.json.send({ type: "COLLABROOM",
                data:{
                  type: "emailSubscriptionSuccess",
                  payload: true
                 }
              });
            }
          }); // close db get

          callback(null); // don't run onto passing colorId or anything else to the message handler

        }
      }
    }
  }
  callback();
}

// Updates the database with the email record
exports.setAuthorEmail = function (author, email, callback){
  db.setSub("globalAuthor:" + author, ["email"], email, callback);
}

// Write email and padId to the database
exports.setAuthorEmailRegistered = function(email, authorId, padId){
  var timestamp = new Date().getTime();
  var registered = {
      authorId: authorId,
      timestamp: timestamp
  };
  console.debug("registered", registered, " to ", padId);
  // Here we have to basically hack a new value into the database, this isn't clean or polite.
  db.get("emailSubscription:" + padId, function(err, value){ // get the current value
    if(!value){value = {};} // if an emailSubscription doesnt exist yet for this padId don't panic
    value[email] = registered; // add the registered values to the object
    console.warn("written to database");
    db.set("emailSubscription:" + padId, value); // stick it in the database
  });

}

