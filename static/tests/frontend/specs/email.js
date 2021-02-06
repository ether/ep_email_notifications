'use strict';

describe('email notifications plugin', function () {
  // create a new pad before each test run
  beforeEach(function (cb) {
    helper.newPad(cb);
    this.timeout(60000);
  });

  // Subscribe malformed email
  const malformedEmail = 'tutti@bad-email';

  // Subscribe good email
  const goodEmail = 'tutti@non-existing-domain.org';

  // Test the form in mysetting menu

  // Launch the tests
  // First test without options selected
  it('makes test without options selected', function (done) {
    const chrome$ = helper.padChrome$;

    // click on the settings button to make settings visible
    const $settingsButton = chrome$('.buttonicon-settings');
    $settingsButton.click();

    // Show the notification form
    chrome$('.ep_email_settings').slideDown(() => {
      chrome$('#ep_email_form_mysettings [name=ep_email]').val(goodEmail);
      chrome$('#ep_email_form_mysettings [name=ep_email_onStart]').prop('checked', false);
      chrome$('#ep_email_form_mysettings [name=ep_email_onEnd]').prop('checked', false);

      chrome$('#ep_email_form_mysettings [name=ep_email_subscribe]').click(); // function() {

      // Is the correct gritter msg there
      helper.waitFor(() => chrome$('.gritter-item').is(':visible') === true)
          .done(() => {
            expect(chrome$('.emailNotificationsSubscrOptionsMissing').is(':visible')).to.be(true);
            done();
          });
    });
  });

  // Second, test with a malformed email
  it('makes test subscription with malformed email address', function (done) {
    const chrome$ = helper.padChrome$;

    // click on the settings button to make settings visible
    const $settingsButton = chrome$('.buttonicon-settings');
    $settingsButton.click();

    // Show the notification form
    chrome$('.ep_email_settings').slideDown(() => {
      chrome$('#ep_email_form_mysettings [name=ep_email]').val(malformedEmail);
      chrome$('#ep_email_form_mysettings [name=ep_email_onStart]').prop('checked', true);

      chrome$('#ep_email_form_mysettings [name=ep_email_subscribe]').click();

      // Is the correct gritter msg there
      helper.waitFor(() => chrome$('.gritter-item').is(':visible') === true)
          .done(() => {
            const clientVars = $('iframe')[0].contentWindow.window.clientVars;
            if (clientVars.ep_email_missing) { // don't test if settings aren't set
              return done();
            }
            expect(chrome$('.emailNotificationsSubscrResponseBad').is(':visible')).to.be(true);
            done();
          });
    });
  });

  // Third, test unsubscription with an email not registered
  it('makes test unsubscription with an unregistered email address', function (done) {
    const chrome$ = helper.padChrome$;

    // click on the settings button to make settings visible
    const $settingsButton = chrome$('.buttonicon-settings');
    $settingsButton.click();

    // Show the notification form
    chrome$('.ep_email_settings').slideDown(() => {
      chrome$('#ep_email_form_mysettings [name=ep_email]').val(goodEmail);

      chrome$('#ep_email_form_mysettings [name=ep_email_unsubscribe]').click();

      // Is the correct gritter msg there
      helper.waitFor(() => chrome$('.gritter-item').is(':visible') === true)
          .done(() => {
            const clientVars = $('iframe')[0].contentWindow.window.clientVars;
            if (clientVars.ep_email_missing) { // don't test if settings aren't set
              return done();
            }

            expect(chrome$('.emailNotificationsUnsubscrResponseBad').is(':visible')).to.be(true);

            done();
          });
    });
  });

  // Fourth, test subscription with a good email
  it('makes test subscription with an unregistered email address', function (done) {
    const chrome$ = helper.padChrome$;

    // click on the settings button to make settings visible
    const $settingsButton = chrome$('.buttonicon-settings');
    $settingsButton.click();

    // Show the notification form
    chrome$('.ep_email_settings').slideDown(() => {
      chrome$('#ep_email_form_mysettings [name=ep_email]').val(goodEmail);
      chrome$('#ep_email_form_mysettings [name=ep_email_onStart]').prop('checked', true);

      chrome$('#ep_email_form_mysettings [name=ep_email_subscribe]').click();

      // Is the correct gritter msg there
      helper.waitFor(() => chrome$('.gritter-item').is(':visible') === true)
          .done(() => {
            const clientVars = $('iframe')[0].contentWindow.window.clientVars;
            if (clientVars.ep_email_missing) { // don't test if settings aren't set
              return done();
            }

            expect(chrome$('.emailNotificationsSubscrResponseGood').is(':visible')).to.be(true);

            done();
          });
    });
  });
});
