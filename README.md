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

* a point to unsubscribe and validate/verify email https://github.com/alfredwesterveld/node-email-verification
* stop the ui prompting if already subscribed
* Clean up all code
* Get the modified contents from the API HTML diff
* Keep a record of when a user was last on a pad
* Re-enable the pop up 
* Some schpeil about setting your server up IE Postfix / RDNS & SPF records
* Exports is undefined error
* Stop it emailing me if I'm the person who made the updates
* Allow for various SMTP auth / connectivity types
