var API = require('../../src/node/db/API.js'),
  async = require('../../src/node_modules/async');

exports.padUpdate = function (hook_name, _pad) {

  // The status of the users relationship with the pad -- IE if it's subscribed to this pad / if it's already on the pad
  var userStatus = {};

  // Temporary user object
  var user = {
    name:  "John McLear",
    email: "john@mclear.co.uk",
    id:    "a.n4gEeMLsv1GivNeh"
  }

  var pad = _pad.pad;
  var padId = pad.id;

  console.debug("ep_email_noficiations: padID of pad being edited:"+padId);

  async.series([
    function(callback){
      userStatus.userIsEditing = exports.isUserEditingPad(padId, user);
      callback();
    },
    function(callback){
      console.warn("FOO");
      console.warn(userStatus);
      callback();
    }
  ]);

};



exports.isUserEditingPad = function(padId, user){
  var foo = API.padUsers(padId, function(callback, padUsers){ // get the current users editing the pad

    var userIsEditing = false;
    padUsers = padUsers.padUsers;

    async.forEach(padUsers,
      function(userOnPad, callback){
        if(userOnPad.id == user.id){
          userIsEditing = true; // If the user is editing the pad then return true
          callback();
        }
      },
      function(err){
        console.warn(userIsEditing); // logs true.
        return userIsEditing; // function should return true but returns undefined
      }
    );
  });
  console.warn("FOO", foo);
  return foo;
};

