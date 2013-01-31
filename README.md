# Description
This plugin allows users to subscribe to pads and recieve email updates when a pad is being modified.  You can modify the frequency.  This plugin is very much in alpha stage and has a lot of things TODO (See TODO).

# Installation
Make sure an SMTP gateway is installed IE postfix
Configure SPF and RDNS records to ensure proper mail flow <-- Search online
Copy/Edit the below to your settings.json
Connect to a pad, Click on the Share/Embed link and enter in your email address.
Open that pad in ANOTHER BROWSER then begin modifying, you should recieve an email when the pad has begun editing and once the pad has gone stale (when everyone stops editing it and a time period passes).

```
 "ep_email_notifications" : {
    checkFrequency: 6000, // checkFrequency = How frequently(milliseconds) to check for pad updates -- Move me to the settings file
    staleTime: 30000,  // staleTime = How stale(milliseconds) does a pad need to be before notifying subscribers?  Move me to settings
    fromName: "Etherpad SETTINGS FILE!",
    fromEmail: "pad@etherpad.org",
    urlToPads: "http://beta.etherpad.org/p/", // urlToPads = The URL to your pads note the trailing /
    smtpHostname: "127.0.0.1"
  }
```

# TODO
* stop the ui prompting if already subscribed
* Clean up all code
* Stop it emailing me if I'm already on the pad
* Re-enable the pop up
* Allow for various SMTP auth / connectivity types

# FUTURE VERSIONS TODO
* v2 - Get the modified contents from the API HTML diff and append that to the Email and make the email from the server HTML not plain text
* v2 - a point to unsubscribe and validate/verify email https://github.com/alfredwesterveld/node-email-verification
* v2 - Keep a record of when a user was last on a pad
