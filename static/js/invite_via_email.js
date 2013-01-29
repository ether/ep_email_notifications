var $ = require('ep_etherpad-lite/static/js/rjquery').$; // use jQuery

exports.postAceInit = function (hook_name, args, cb){
  // add email invite to then embed div
  $("#embedcode").append(
    '</div>'+
    '<br><br>'+
    '<a>Invite someone to this pad:</a>'+
    '<br><br>'+
    '<div id="emailform">'+
    ' Your name: <br><input id="youremailnameinput" style="height:24px;width:375px;" type="text" value=""><br>'+
    ' The email address of the person you want to invite: <br><input style="height:24px;width:375px;" id="emailrcptinput" type="text" value=""><br><br>'+
    ' <button class="sendEmailButton" style="height:40px;width:200px;">Send invitation</button>'+
    '</div>'
  );

  $('.sendEmailButton').click(function(){
    var padurl = $("#linkinput").val();
    var name = $('#youremailnameinput').val();
    var email = $('#emailrcptinput').val();
    var data = "name="+name+"&email="+email+"&padurl="+padurl;
    url = "/server_invite_via_email";
    $.ajax({
      type: "GET",
      url: url,
      data: data,
    }).done(
      function(msg){
      }
    );
    alert("Invitation sent...");
    $('#embed').fadeOut();
  });
}
