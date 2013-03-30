 var  db = require('../../src/node/db/DB').db,
     API = require('../../src/node/db/API.js'),
   async = require('../../src/node_modules/async'),
settings = require('../../src/node/utils/Settings');

var pluginSettings = settings.ep_email_notifications;

// When a new message comes in from the client - FML this is ugly
exports.handleMessage = function(hook_name, context, callback){
  if (context.message && context.message.data){
    if (context.message.data.type == 'USERINFO_UPDATE' ) { // if it's a request to update an authors email
      if (context.message.data.userInfo){
        if(context.message.data.userInfo.email){ // it contains email
          console.debug(context.message);

          // does email (Un)Subscription already exist for this email address?
          db.get("emailSubscription:"+context.message.data.padId, function(err, userIds){

            var alreadyExists = false;

            if(userIds){
              async.forEach(Object.keys(userIds), function(user, cb){
                console.debug("UserIds subscribed by email to this pad:", userIds);
                if(user == context.message.data.userInfo.email){ //  If we already have this email registered for this pad
                  // This user ID is already assigned to this padId so don't do anything except tell the user they are already subscribed somehow..
                  alreadyExists = true;

                  if(context.message.data.userInfo.email_option == 'subscribe') {
                    // Subscription process
                    exports.subscriptionEmail(
                      context,
                      context.message.data.userInfo.email,
                      alreadyExists,
                      context.message.data.userInfo,
                      context.message.data.padId,
                      callback
                    );
                  } else if (context.message.data.userInfo.email_option == 'unsubscribe') {
                    // Unsubscription process
                    exports.unsubscriptionEmail(
                      context,
                      alreadyExists,
                      context.message.data.userInfo,
                      context.message.data.padId
                    );
                  }
                }
                cb();
              },

              function(err){
                // There should be something in here!
              }); // end async for each
            }

            // In case we didn't find it in the Db
            if (alreadyExists == false) {
              if(context.message.data.userInfo.email_option == 'subscribe') {
                // Subscription process
                exports.subscriptionEmail(
                  context,
                  context.message.data.userInfo.email,
                  alreadyExists,
                  context.message.data.userInfo,
                  context.message.data.padId,
                  callback
                );
              } else if (context.message.data.userInfo.email_option == 'unsubscribe') {
                // Unsubscription process
                exports.unsubscriptionEmail(
                  context,
                  alreadyExists,
                  context.message.data.userInfo,
                  context.message.data.padId
                );
              }
            }

          }); // close db get

          callback([null]); // don't run onto passing colorId or anything else to the message handler

        }
      }

    } else if (context.message.data.type == 'USERINFO_GET' ) { // A request to find datas for a userId
      if (context.message.data.userInfo){
        if(context.message.data.userInfo.userId){ // it contains the userId
          console.debug(context.message);

          // does email Subscription already exist for this UserId?
          db.get("emailSubscription:"+context.message.data.padId, function(err, userIds){
            var userIdFound = false;

            if(userIds){
              async.forEach(Object.keys(userIds), function(user, cb){
                if(userIds[user].authorId == context.message.data.userInfo.userId){ //  if we find the same Id in the Db as the one used by the user
                  console.debug("Options for this pad ", userIds[user].authorId, " found in the Db");
                  userIdFound = true;

                  // Request user subscription info process
                  exports.sendUserInfo (
                    context,
                    userIdFound,
                    user,
                    userIds[user]
                  );
                }
                cb();
              },

              function(err){
                // There should be something in here!
              }); // end async for each
            }

            if (userIdFound == false) {
              // Request user subscription info process
              exports.sendUserInfo (
                context,
                userIdFound,
                "", 
                ""
              );
            }
          });

          callback([null]);
        }
      }
    }
  }
  callback();
}

/**
 * Subscription process
 */
exports.subscriptionEmail = function (context, email, emailFound, userInfo, padId, callback) {
  var validatesAsEmail = exports.checkEmailValidation(email);

  if(emailFound == false && validatesAsEmail){
    // Subscription -> Go for it
    console.debug ("Subscription: Wrote to the database and sent client a positive response ",context.message.data.userInfo.email);

    exports.setAuthorEmail(
      userInfo.userId,
      userInfo,
      callback
    );

    exports.setAuthorEmailRegistered(
      userInfo,
      userInfo.userId,
      padId
    );

    context.client.json.send({ type: "COLLABROOM",
      data:{
        type: "emailSubscriptionSuccess",
        payload: {
          formName: userInfo.formName,
          success: true
        }
      }
    });
  } else if (!validatesAsEmail) {
    // Subscription -> failed coz mail malformed..  y'know in general fuck em!
    console.warn("Dropped email subscription due to malformed email address");
    context.client.json.send({ type: "COLLABROOM",
      data:{
        type: "emailSubscriptionSuccess",
        payload: {
          type: "malformedEmail",
          formName: userInfo.formName,
          success: false
        }
      }
    });
  } else {
    // Subscription -> failed coz email already subscribed for this pad
    console.debug("email ", context.message.data.userInfo.email, "already subscribed to ", context.message.data.padId, " so sending message to client");

    context.client.json.send({ type: "COLLABROOM",
      data:{
        type: "emailSubscriptionSuccess",
        payload: {
          type: "alreadyRegistered",
          formName: userInfo.formName,
          success: false
        }
      }
    });
  }
}

/**
 * UnsUbscription process
 */
exports.unsubscriptionEmail = function (context, emailFound, userInfo, padId) {
  if(emailFound == true) {
    // Unsubscription -> Go for it
    console.debug ("Unsubscription: Remove from the database and sent client a positive response ",context.message.data.userInfo.email);

    exports.unsetAuthorEmail(
      userInfo.userId,
      userInfo
    );

    exports.unsetAuthorEmailRegistered(
      userInfo,
      userInfo.userId,
      padId
    );

    context.client.json.send({ type: "COLLABROOM",
      data:{
        type: "emailUnsubscriptionSuccess",
        payload: {
          formName: userInfo.formName,
          success: true
        }
      }
    });
  } else {
    // Unsubscription -> Send failed as email not found
    console.debug ("Unsubscription: Send client a negative response ",context.message.data.userInfo.email);

    context.client.json.send({ type: "COLLABROOM",
      data:{
        type: "emailUnsubscriptionSuccess",
        payload: {
          formName: userInfo.formName,
          success: false
        }
      }
    });
  }
}

/**
 * Request user subscription info process
 */
exports.sendUserInfo = function (context, emailFound, email, userInfo) {
  var defaultOnStartOption = true;
  var defaultOnEndOption = false;

  if (typeof userInfo.onStart == 'boolean' && typeof userInfo.onEnd == 'boolean') {
    var onStart = userInfo.onStart;
    var onEnd = userInfo.onEnd;
  } else { // In case these options are not yet defined for this userId
    var onStart = defaultOnStartOption;
    var onEnd = defaultOnEndOption;
  }

  if (emailFound == true) {
    // We send back the options associated to this userId
    context.client.json.send({ type: "COLLABROOM",
      data:{
        type: "emailNotificationGetUserInfo",
        payload: {
          email: email,
          onStart: onStart,
          onEnd: onEnd,
          formName: context.message.data.userInfo.formName,
          success:true
        }
      }
    });
  } else {
    // No options set for this userId
    context.client.json.send({ type: "COLLABROOM",
      data:{
        type: "emailNotificationGetUserInfo",
        payload: {
          formName: context.message.data.userInfo.formName,
          success:false
        }
      }
    });
  }
}

/**
 * Function to check if an email is valid
 */
exports.checkEmailValidation = function (email) {
  var Validator = require('validator').Validator;
  var validator = new Validator();
  validator.error = function() {
    return false;
  };
  return validator.check(email).isEmail();
}

/**
 * Database manipulation
 */

// Updates the database with the email record
exports.setAuthorEmail = function (author, userInfo, callback){
  db.setSub("globalAuthor:" + author, ["email"], userInfo.email, callback);
}

// Write email and padId to the database
exports.setAuthorEmailRegistered = function(userInfo, authorId, padId){
  var timestamp = new Date().getTime();
  var registered = {
      authorId: authorId,
      onStart: userInfo.email_onStart,
      onEnd: userInfo.email_onEnd,
      timestamp: timestamp
  };
  console.debug("registered", registered, " to ", padId);
  // Here we have to basically hack a new value into the database, this isn't clean or polite.
  db.get("emailSubscription:" + padId, function(err, value){ // get the current value
    if(!value){value = {};} // if an emailSubscription doesnt exist yet for this padId don't panic
    value[userInfo.email] = registered; // add the registered values to the object
    console.warn("written to database");
    db.set("emailSubscription:" + padId, value); // stick it in the database
  });

}

// Updates the database by removing the email record for that AuthorId
exports.unsetAuthorEmail = function (author, userInfo){
  db.get("globalAuthor:" + author, function(err, value){ // get the current value

    if (value['email'] == userInfo.email) {
      // Remove the email option from the datas
      delete value['email'];

      // Write the modified datas back in the Db
      db.set("globalAuthor:" + author, value);
    }
  });
}

// Remove email, options and padId from the database
exports.unsetAuthorEmailRegistered = function(userInfo, authorId, padId){
  console.debug("unregistered", userInfo.email, " to ", padId);

  db.get("emailSubscription:" + padId, function(err, value){ // get the current value

    // remove the registered options from the object
    delete value[userInfo.email];

    // Write the modified datas back in the Db
    console.warn("written to database");
    db.set("emailSubscription:" + padId, value);
  });
}
