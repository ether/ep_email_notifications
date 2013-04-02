var db = require('ep_etherpad-lite/node/db/DB').db,
 async = require('../../src/node_modules/async'),
 settings = require('../../src/node/utils/Settings');

// Remove cache for this procedure
db['dbSettings'].cache = 0;

exports.registerRoute = function (hook_name, args, callback) {
  // Catching (un)subscribe addresses
  args.app.get('/p/*/(un){0,1}subscribe=*', function(req, res) {
    var fullURL = req.protocol + "://" + req.get('host') + req.url;
    var path=req.url.split("/");
    var padId=path[2];
    var param = path[3].split("=");
    var action = param[0];
    var actionId = param[1];
    var padURL = req.protocol + "://" + req.get('host') + "/p/" +padId;
    var resultDb = {};

    async.series(
      [
        function(cb) {
          // Is the (un)subscription valid (exists & not older than 24h)
          db.get("emailSubscription:"+padId, function(err, userIds){

            var foundInDb = false;
            var timeDiffGood = false;
            var email = "your email";

            if(userIds && userIds['pending'] && userIds['pending'].length > 0){
              async.forEach(Object.keys(userIds['pending']), function(user){
                var userInfo = userIds['pending'][user];

                //  If we have Id int the Db, then we are good ot really unsubscribe the user
                if(userInfo[action + 'Id'] == actionId){
                  console.debug("emailSubscription:", user, "found in DB:", userInfo);

                  foundInDb = true;
                  email = user;

                  // Checking if the demand is not older than 24h
                  var timeDiff = new Date().getTime() - userInfo.timestamp;
                  timeDiffGood = timeDiff < 1000 * 60 * 60 * 24;

                  if(action == 'subscribe' && timeDiffGood == true) {
                    // Subscription process
                    setAuthorEmail(
                      userInfo,
                      user
                    );

                    setAuthorEmailRegistered(
                      userIds,
                      userInfo,
                      user,
                      padId
                    );
                  } else if (action == 'unsubscribe' && timeDiffGood == true) {
                    // Unsubscription process
                    unsetAuthorEmail(
                      userInfo,
                      user
                    );

                    unsetAuthorEmailRegistered(
                      userIds,
                      user,
                      padId
                    );
                  }
                }
              },

              function(err, msg){
                // There should be something in here!
                console.error("Error in emailSubscription async in first function", err, " -> ", msg);
              }); // end async for each
            }

            resultDb = {
              "foundInDb": foundInDb,
              "timeDiffGood": timeDiffGood,
              "email": email
            }

            cb(null, 1);
          });
        },

        function(cb) {
          // Create and send the output message
          sendContent(res, args, action, padId, padURL, resultDb);

          cb(null, 2);
        },

        function(cb) {
          // Take a moment to clean all obsolete pending data
          cleanPendingData(padId);

          cb(null, 3);
        }
      ],
      function(err, results){
        console.error("Callback async.series: Err -> ", err, " / results -> ", results);
      }
    );
  });

  callback(); // Am I even called?
}

/**
 * Database manipulation
 */

// Updates the database with the email record
setAuthorEmail = function (userInfo, email){
  db.setSub("globalAuthor:" + userInfo.authorId, ["email"], email);
}

// Write email and padId to the database
setAuthorEmailRegistered = function(userIds, userInfo, email, padId){
  console.debug("setAuthorEmailRegistered: Initial userIds:", userIds);
  var timestamp = new Date().getTime();
  var registered = {
      authorId: userInfo.authorId,
      onStart: userInfo.onStart,
      onEnd: userInfo.onEnd,
      timestamp: timestamp
  };

  // add the registered values to the object
  userIds[email] = registered;

  // remove the pending data
  delete userIds['pending'][email];

  // Write the modified datas back in the Db
  console.warn("written to database");
  db.set("emailSubscription:" + padId, userIds); // stick it in the database

  console.debug("setAuthorEmailRegistered: Modified userIds:", userIds);
}

// Updates the database by removing the email record for that AuthorId
unsetAuthorEmail = function (userInfo, email){
  db.get("globalAuthor:" + userInfo.authorId, function(err, value){ // get the current value
    if (value['email'] == email) {
      // Remove the email option from the datas
      delete value['email'];

      // Write the modified datas back in the Db
      db.set("globalAuthor:" + userInfo.authorId, value);
    }
  });
}

// Remove email, options and padId from the database
unsetAuthorEmailRegistered = function(userIds, email, padId){
  console.debug("unsetAuthorEmailRegistered: initial userIds:", userIds);
  // remove the registered options from the object
  delete userIds[email];

  // remove the pending data
  delete userIds['pending'][email];

  // Write the modified datas back in the Db
  console.warn("written to database");
  db.set("emailSubscription:" + padId, userIds);

  console.debug("unsetAuthorEmailRegistered: modified userIds:", userIds);
}

/**
 * We take a moment to remove too old pending (un)subscription
 */
cleanPendingData = function (padId) {
  var modifiedData, areDataModified = false;

  db.get("emailSubscription:" + padId, function(err, userIds){ // get the current value
    console.debug("cleanPendingData: Initial userIds:", userIds);
    modifiedData = userIds;
    if(userIds && userIds['pending']){
      async.forEach(Object.keys(userIds['pending']), function(user){
        var timeDiff = new Date().getTime() - userIds['pending'][user].timestamp;
        var timeDiffGood = timeDiff < 1000 * 60 * 60 * 24;

        if(timeDiffGood == false) {    
          delete modifiedData['pending'][user];

          areDataModified = true;
        }
      });
    }

    if (areDataModified == true) {
      // Write the modified datas back in the Db
      db.set("emailSubscription:" + padId, modifiedData);
    }

    console.debug("cleanPendingData: Modified userIds:", modifiedData, " / areDataModified:", areDataModified);
  });
}

/**
 * Create html output with the status of the process
 */
function sendContent(res, args, action, padId, padURL, resultDb) {
  console.debug("starting sendContent: args ->", action, " / ", padId, " / ", padURL, " / ", resultDb);

  if (action == 'subscribe') {
    var actionMsg = "Subscribing '" + resultDb.email + "' to pad " + padId;
  } else {
    var actionMsg = "Unsubscribing '" + resultDb.email + "' from pad " + padId;
  }
  var msgCause, resultMsg, classResult;

  if (resultDb.foundInDb == true && resultDb.timeDiffGood == true) {
    // Pending data were found un Db and updated -> good
    resultMsg = "Success";
    classResult = "good";
  } else if (resultDb.foundInDb == true) {
    // Pending data were found but older than a day -> fail
    msgCause = "You have max 24h to click the link in your confirmation email.";
    resultMsg = "Too late!";
    resultMsg += '<div>\n';
    resultMsg += msgCause;
    resultMsg += '</div>\n';
    classResult = "bad";
  } else {
    // Pending data weren't found in Db -> fail
    msgCause = "We couldn't find any pending " + (action == 'subscribe'?'subscription':'unsubscription') + "<br />in our system with this Id.<br />Maybe you wait more than 24h before validating";
    resultMsg = "Fail\n";
    resultMsg += '<div>\n';
    resultMsg += msgCause;
    resultMsg += '</div>\n';
    classResult = "bad";
  }

  res.contentType("text/html; charset=utf-8");

  args.content = '<html>\n';
  args.content += '<head>\n';
  args.content += '<meta charset="utf-8">\n';
  args.content += '<title>Email Notifications Subscription</title>\n';
//    args.content += '<link href="../../static/css/email_notifications.css" media="all" rel="stylesheet" type="text/css" />\n';
  args.content += '<style>\n';
  args.content += '.emailSubscription {\n';
  args.content += '  width: 600px;\n';
  args.content += '  margin: 0 auto;\n';
  args.content += '  text-align: center;\n';
  args.content += '  font-size: bigger;\n';
  args.content += '  font-weight: bold;\n';
  args.content += '  font-color: green;\n';
  args.content += '}\n';
  args.content += '.emailSubscription > div {\n';
  args.content += '  border: solid 2px #333;\n';
  args.content += '  padding: .3em;\n';
  args.content += '  margin-bottom: .5em;\n';
  args.content += '}\n';
  args.content += '.good {\n';
  args.content += '  background-color: green;\n';
  args.content += '}\n';
  args.content += '.bad {\n';
  args.content += '  background-color: red;\n';
  args.content += '}\n';
  args.content += '</style>\n';
  args.content += '</head>\n';
  args.content += '<body style="text-align:center;">\n';
  args.content += '<h1>Email notifications</h1>\n';
  args.content += '<div class="emailSubscription">\n';
  args.content += actionMsg + "\n";
  args.content += '<div class="' + classResult + '">\n';
  args.content += resultMsg;
  if (action == 'subscribe' && classResult == 'good') {
    args.content += "<div style='margin:0; padding:.2em; font-weight:normal;'>You will receive email when someone changes this pad.</div>"
  } else if (action == 'unsubscribe' && classResult == 'good'){
    args.content += "<div style='margin:0; padding:.2em; font-weight:normal;'>You won't receive anymore email when someone changes this pad.</div>";
  }
  args.content += '</div>\n';
  args.content += 'Go to the pad: <a href="' + padURL + '">' + padURL + '</a>';
  args.content += '</div>\n';
  args.content += '</body>\n';
  args.content += '</html>\n';
  res.send(args.content); // Send it to the requester
}