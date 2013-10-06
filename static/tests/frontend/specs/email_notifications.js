describe("email notifications plugin", function(){
  //create a new pad before each test run
  beforeEach(function(cb){
    helper.newPad(cb);
    this.timeout(60000);
  });

  // Subscribe malformed email
  var malformedEmail = "tutti@bad-email";

  // Subscribe good email
  var goodEmail = "tutti@non-existing-domain.org";

  // Test the form in mysetting menu

  // Launch the tests
  // First test without options selected
  it("makes test without options selected", function(done) {
    var chrome$ = helper.padChrome$;

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    // Show the notification form
    chrome$('.ep_email_settings').slideDown(function() {

      chrome$('#ep_email_form_mysettings [name=ep_email]').val(goodEmail);
      chrome$('#ep_email_form_mysettings [name=ep_email_onStart]').prop('checked', false);
      chrome$('#ep_email_form_mysettings [name=ep_email_onEnd]').prop('checked', false);

      chrome$('#ep_email_form_mysettings [name=ep_email_subscribe]').click(); //function() {

      // Is the correct gritter msg there
      helper.waitFor(function() {
        return chrome$(".gritter-item").is(':visible') == true;
      })
      .done(function(){
        expect(chrome$(".emailNotificationsSubscrOptionsMissing").is(':visible')).to.be(true);
        done();
      });
    });
  });

  // Second, test with a malformed email
  it("makes test subscription with malformed email address", function(done) {
    var chrome$ = helper.padChrome$;

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    // Show the notification form
    chrome$('.ep_email_settings').slideDown(function() {

      chrome$('#ep_email_form_mysettings [name=ep_email]').val(malformedEmail);
      chrome$('#ep_email_form_mysettings [name=ep_email_onStart]').prop('checked', true);

      chrome$('#ep_email_form_mysettings [name=ep_email_subscribe]').click();

      // Is the correct gritter msg there
      helper.waitFor(function() {
        return chrome$(".gritter-item").is(':visible') == true;
      })
      .done(function(){
        expect(chrome$(".emailNotificationsSubscrResponseBad").is(':visible')).to.be(true);
        done();
      });
    });
  });

  // Third, test unsubscription with an email not registered
  it("makes test unsubscription with an unregistered email address", function(done) {
    var chrome$ = helper.padChrome$;

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    // Show the notification form
    chrome$('.ep_email_settings').slideDown(function() {

      chrome$('#ep_email_form_mysettings [name=ep_email]').val(goodEmail);

      chrome$('#ep_email_form_mysettings [name=ep_email_unsubscribe]').click();

      // Is the correct gritter msg there
      helper.waitFor(function() {
        return chrome$(".gritter-item").is(':visible') == true;
      })
      .done(function(){
        expect(chrome$(".emailNotificationsUnsubscrResponseBad").is(':visible')).to.be(true);

        done();
      });
    });
  });

  // Fourth, test subscription with a good email
  it("makes test subscription with an unregistered email address", function(done) {
    var chrome$ = helper.padChrome$;

    //click on the settings button to make settings visible
    var $settingsButton = chrome$(".buttonicon-settings");
    $settingsButton.click();

    // Show the notification form
    chrome$('.ep_email_settings').slideDown(function() {

      chrome$('#ep_email_form_mysettings [name=ep_email]').val(goodEmail);
      chrome$('#ep_email_form_mysettings [name=ep_email_onStart]').prop('checked', true);

      chrome$('#ep_email_form_mysettings [name=ep_email_subscribe]').click();

      // Is the correct gritter msg there
      helper.waitFor(function() {
        return chrome$(".gritter-item").is(':visible') == true;
      })
      .done(function(){
        expect(chrome$(".emailNotificationsSubscrResponseGood").is(':visible')).to.be(true);

        done();
      });
    });
  });
});
