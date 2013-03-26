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
                }
                cb();
              },

              function(err){
                // There should be something in here!
              }); // end async for each
            }

	    if(context.message.data.userInfo.email_option == 'subscribe' && alreadyExists == true){
	      // SUbscription
	      console.debug("email ", context.message.data.userInfo.email, "already subscribed to ", context.message.data.padId, " so sending message to client");

	      context.client.json.send({ type: "COLLABROOM",
                data:{
                  type: "emailSubscriptionSuccess",
                  payload: false
                }
              });
            } else if(context.message.data.userInfo.email_option == 'subscribe' && alreadyExists == false){
	      // SUbscription
              var validatesAsEmail = check(context.message.data.userInfo.email).isEmail();
              if(!validatesAsEmail){ // send validation failed if it's malformed..  y'know in general fuck em!
                console.warn("Dropped email subscription due to malformed email address");
                context.client.json.send({ type: "COLLABROOM",
                  data:{
                    type: "emailSubscriptionSuccess",
                    payload: false
                   }
                });
              } else {
                console.debug ("Subscription: Wrote to the database and sent client a positive response ",context.message.data.userInfo.email);

                exports.setAuthorEmail(
                  context.message.data.userInfo.userId,
                  context.message.data.userInfo,
		  callback
                );

                exports.setAuthorEmailRegistered(
                  context.message.data.userInfo,
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
            } else if(context.message.data.userInfo.email_option == 'unsubscribe' && alreadyExists == true) {
	      // Unsubscription
              console.debug ("Unsubscription: Remove from the database and sent client a positive response ",context.message.data.userInfo.email);

	      exports.unsetAuthorEmail(
                context.message.data.userInfo.userId,
                context.message.data.userInfo,
		callback
              );

              exports.unsetAuthorEmailRegistered(
                context.message.data.userInfo,
                context.message.data.userInfo.userId,
                context.message.data.padId
              );

              context.client.json.send({ type: "COLLABROOM",
                data:{
                  type: "emailUnsubscriptionSuccess",
                  payload: true
                 }
              });
	    } else if(context.message.data.userInfo.email_option == 'unsubscribe' && alreadyExists == false) {
	      // Unsubscription
	      console.debug ("Unsubscription: Send client a negative response ",context.message.data.userInfo.email);

	      context.client.json.send({ type: "COLLABROOM",
                data:{
                  type: "emailUnsubscriptionSuccess",
                  payload: false
                }
              });
	    }
          }); // close db get

          callback([null]); // don't run onto passing colorId or anything else to the message handler

        }
      }
    } else if (context.message.data.type == 'USERINFO_GET' ) { // A request to find datas for a username
      if (context.message.data.userInfo){
        if(context.message.data.userInfo.userId){ // it contains the userId
          console.debug(context.message);

          var userIdFound = false;
          // does email Subscription already exist for this name and padID?
          db.get("emailSubscription:"+context.message.data.padId, function(err, userIds){
            if(userIds){
              async.forEach(Object.keys(userIds), function(user, cb){
                if(userIds[user].authorId == context.message.data.userInfo.userId){ //  if we find the same Id in the Db as the one used by the user
                  console.debug("Options for this pad ", userIds[user].authorId, " found in the Db");
                  userIdFound = true;

                  // We send back the options set for this user
                  context.client.json.send({ type: "COLLABROOM",
                    data:{
                      type: "emailNotificationGetUserInfo",
                      payload: {
                        email: user,
                        onStart: userIds[user].onStart && typeof userIds[user].onStart === 'boolean'?userIds[user].onStart:true,
                        onEnd: userIds[user].onEnd && typeof userIds[user].onEnd === 'boolean'?userIds[user].onEnd:false,
                        success:true
                      }
                    }
                  });
                }
                cb();
              },

              function(err){
                // There should be something in here!
              }); // end async for each
            }
          });

          if (!userIdFound) {
            // We send back the options set for this user
            context.client.json.send({ type: "COLLABROOM",
              data:{
                type: "emailNotificationGetUserInfo",
                payload: {
                  success:false
                }  
              }
            });
          }
        }
      }
    }
  }
  callback();
}

// Updates the database with the email record
exports.setAuthorEmail = function (author, datas, callback){
  db.setSub("globalAuthor:" + author, ["email"], datas.email, callback);
}

// Write email and padId to the database
exports.setAuthorEmailRegistered = function(datas, authorId, padId){
  var timestamp = new Date().getTime();
  var registered = {
      authorId: authorId,
      onStart: datas.email_onStart,
      onEnd: datas.email_onEnd,
      timestamp: timestamp
  };
  console.debug("registered", registered, " to ", padId);
  // Here we have to basically hack a new value into the database, this isn't clean or polite.
  db.get("emailSubscription:" + padId, function(err, value){ // get the current value
    if(!value){value = {};} // if an emailSubscription doesnt exist yet for this padId don't panic
    value[datas.email] = registered; // add the registered values to the object
    console.warn("written to database");
    db.set("emailSubscription:" + padId, value); // stick it in the database
  });

}

// Updates the database by removing the email record for that AuthorId
exports.unsetAuthorEmail = function (author, datas, callback){
  db.get("globalAuthor:" + author, function(err, value){ // get the current value
    delete value['email'];
    db.set("globalAuthor:" + author, value);
  });
}

// Remove email and padId from the database
exports.unsetAuthorEmailRegistered = function(datas, authorId, padId){
  console.debug("unregistered", datas.email, " to ", padId);
  // Here we have to basically hack a new value into the database, this isn't clean or polite.
  db.get("emailSubscription:" + padId, function(err, value){ // get the current value
    delete value[datas.email]; // remove the registered values to the object
    console.warn("written to database");
    db.set("emailSubscription:" + padId, value); // stick it in the database
  });

}
