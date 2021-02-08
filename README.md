![Publish Status](https://github.com/ether/ep_email_notifications/workflows/Node.js%20Package/badge.svg) ![Backend Tests Status](https://github.com/ether/ep_email_notifications/workflows/Backend%20tests/badge.svg)

# BROKEN PLUGIN, NEEDS FIXING
This plugin allows users to subscribe to pads and receive email updates when a pad is being modified.  You can modify the frequency.  This plugin is still in early stage and has things TODO (See TODO).

# Source code
On Github : https://github.com/JohnMcLear/ep_email_notifications

# Installation
Make sure an SMTP gateway is installed IE postfix

Configure SPF and RDNS records to ensure proper mail flow <-- Search online

Copy/Edit the below to your settings.json

Connect to a pad, Click on the Share/Embed link and enter in your email address.

Open that pad in ANOTHER BROWSER then begin modifying, you should receive an email when the pad has begun editing and once the pad has gone stale (when everyone stops editing it and a time period passes).

NOTE: You will NOT receive an email if you(the author that registered their email) are currently on or editing that pad!

```
 "ep_email_notifications" : {
    "panelDisplayLocation": { // Where you want to have the subscription panel
      "mysettings": true,
      "popup": true
    },
    "checkFrequency": "6000", // checkFrequency = How frequently(milliseconds) to check for pad updates -- Move me to the settings file
    "staleTime": "30000",  // staleTime = How stale(milliseconds) does a pad need to be before notifying subscribers?  Move me to settings
    "fromName": "Etherpad SETTINGS FILE!",
    "fromEmail": "pad@etherpad.org",
    "urlToPads": "http://beta.etherpad.org/p/", // urlToPads = The URL to your pads note the trailing /
    "emailServer": { // See https://github.com/eleith/emailjs for settings
      "host": "127.0.0.1"
    }
  }
```

# Translation
This plugin has for now translations for english, french and german.
In case you would like to have it in another language, you can easily translate the few sentences and then contact us on irc (#etherpad-lite-dev on irc.freenode.net) or create a Pull-Request on the GitHub repository.
You can find the sentences to translate in the ep_email_notifications/locales/ directory.
Specials chars written in unicode (See https://fr.wikipedia.org/wiki/Table_des_caract%C3%A8res_Unicode_%280000-0FFF%29)

# License

Licensed under the Apache License, Version 2.0 (the "License"); you may not
use this file except in compliance with the License.  You may obtain a copy
of the License at <http://www.apache.org/licenses/LICENSE-2.0>.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
License for the specific language governing permissions and limitations
under the License.

# TODO
* Clean up all code

# FUTURE VERSIONS TODO
* v2 - Get the modified contents from the API HTML diff and append that to the Email and make the email from the server HTML not plain text
* v2 - Keep a record of when a user was last on a pad

# FAiling tests
Tests fail due to notifications coming in front of objects IE color picker test.  This is something that needs fixing..
