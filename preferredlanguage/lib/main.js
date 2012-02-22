const {Cc, Ci, Cr, Cu} = require("chrome");

const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";

const widgets = require("widget");
const localdata = require("self").data

const prefsBundle = require("preferences-service");
const StringBundle = require("app-strings").StringBundle;

const defaultlang = "ca";

// Create main widget
var widget = widgets.Widget({
  id: "navega-link",
  label: "Navega en català",
  tooltip: 'Navega en català',
  contentURL: localdata.url("icon16.png"),
  onClick: function() {
    detchanlang(true);
  }
});

// Check on Firefox start
detchanlang(false);

// Uninstall / disable parameters
exports.onUnload = function (reason) {
  
  if (reason == 'uninstall' || reason == 'disable') {

  var prev_locale;
  var prev_accept;
  var prev_match;

  prev_locale = prefsBundle.get("extensions.softcatala.localeprev", "ca");
  prev_accept = prefsBundle.get("extensions.softcatala.acceptprev", "ca, en-US, en");
  prev_match = prefsBundle.get("extensions.softcatala.matchprev", "false");

  prefsBundle.set("general.useragent.locale", prev_locale);
  prefsBundle.set("intl.accept_languages", prev_accept);
  prefsBundle.set("intl.locale.matchOS", prev_match);
  
  prefsBundle.set("extensions.softcatala.localeprev", "");
  prefsBundle.set("extensions.softcatala.acceptprev", "");
  prefsBundle.set("extensions.softcatala.matchprev", false);
  prefsBundle.set("extensions.softcatala.first", 0);
  
  }  

};


function detchanlang(clicktrigger) {

  var notifications = require("notifications");
  var iconpopup = localdata.url("icon32.png");
  
    //Check if locale, trigger for ca version
  var uilang = prefsBundle.get("general.useragent.locale", "ca");

  // Get user interface language
  if (uilang == "chrome://global/locale/intl.properties") {
      var bundle = StringBundle(uilang);
      uilang = bundle.get("general.useragent.locale");
  }
  
  // Get accept languages
  var preflangs = prefsBundle.get("intl.accept_languages", "ca, en-US, en");

  var listlangs;
  
  if (preflangs == 'chrome://global/locale/intl.properties') {
  
    var bundle = StringBundle(preflangs);
    var langs = "undef";
    langs = bundle.get("intl.accept_languages");
    listlangs = langs.split(',');
  }
  
  else {
    listlangs = preflangs.split(',');	  
  }

  //Trim array
  for(j=0;j<listlangs.length;j++) {
	listlangs[j] = trim(listlangs[j]);
  }
  
  //OS match
  var osmatch = prefsBundle.get("intl.locale.matchOS", false);

  // Fist time
  
  //Create extensions branch if it doesn't exist, store previous

  //First run
  if (!prefsBundle.has('extensions.softcatala.first')) {
	prefsBundle.set("extensions.softcatala.first", 0);	
  }  

  //Locale interface
  if (!prefsBundle.has('extensions.softcatala.localeprev')) {
	prefsBundle.set("extensions.softcatala.localeprev", uilang);
  }
  else {
	if (prefsBundle.get('extensions.softcatala.localeprev') == '') {
		prefsBundle.set("extensions.softcatala.localeprev", uilang);
        }
  }
  
  //Accept language
  listlangstr = listlangs.join(",");
  if (!prefsBundle.has('extensions.softcatala.acceptprev')) {
  	prefsBundle.set("extensions.softcatala.acceptprev", listlangstr);
  }
  else {
	if (prefsBundle.get('extensions.softcatala.acceptprev') == '') {
		prefsBundle.set("extensions.softcatala.acceptprev", listlangstr);
        }
  }

  //MatchOS
  if (!prefsBundle.has('extensions.softcatala.matchprev')) {
  	prefsBundle.set("extensions.softcatala.matchprev", osmatch);
  }


  //Start playing
  
  var tempRegexp = new RegExp("^"+defaultlang,"g");


  // Check if download
  var performed = false;

  // Made it enabled - Not used for now
  var enabled = true;
  if (enabled) {
  
    var insdef = 0;
    var newlistlangs;
    
    // Review Accept language
    for (clist = 0; clist < listlangs.length; clist++) {
      
      // Check first entry
      if (clist == 0) {
	
	// If first entry is already default lang -> Done    
	if (tempRegexp.test(listlangs[clist])) {
	  insdef++;
	  break;
	}
      }
      
      // Otherwise
      else {
	
	// If default lang is somewhere
	if (tempRegexp.test(listlangs[clist])) {
  
	  // Most cases [ca]
	  if (listlangs[clist] == defaultlang) {
	    insdef++;
  
	    listlangs.splice(clist, 1);
	    listlangs.unshift(defaultlang);
	    newlistlangs = listlangs.join(',');
	    prefsBundle.set("intl.accept_languages", newlistlangs);
	    notifications.notify({
	      text: "A partir d'ara ja navegueu en català",
	      iconURL: iconpopup
	    });
	    performed = downFirefox(defaultlang, uilang);
	    break;
	  }
	  
	  // Other cases [ca-valencia], [ca-ES], etc.
	  else {
	    insdef++;
  
	    var defaultextra = listlangs[clist];
	    listlangs.splice(clist, 1);
	    listlangs.unshift(defaultextra);
	    newlistlangs = listlangs.join(',');
	    prefsBundle.set("intl.accept_languages", newlistlangs);
	    notifications.notify({
	      text: "A partir d'ara ja navegueu en català",
	      iconURL: iconpopup
	    });
	    performed = downFirefox(defaultlang, uilang);
	    break;
	  }
	}
      }
    }
  
    //If default lang is nowhere, add at the beginning
    if (insdef == 0) {
      listlangs.unshift(defaultlang);
      newlistlangs = listlangs.join(',');
      prefsBundle.set("intl.accept_languages", newlistlangs);
      notifications.notify({
	      text: "A partir d'ara ja navegueu en català",
	      iconURL: iconpopup
      });
      performed = downFirefox(defaultlang, uilang);
    }
    
    else {
      
      // If everything Ok, don't do anything, unless it's been clicked
      if (clicktrigger) {
	
	notifications.notify({
	      text: "Enhorabona! Ja navegàveu en català",
	      iconURL: iconpopup
	});
	
	performed = downFirefox(defaultlang, uilang);     
      }

        // Last performed check - First time
  	if (prefsBundle.get("extensions.softcatala.first") < 2) {
		performed = false;
  	} 	
     
    }
    
  }
 

  // Periodical checking
  if (!performed) {

	  // List locales in the system
 	 var cr = Cc["@mozilla.org/chrome/chrome-registry;1"]
	    .getService(Components.interfaces.nsIToolkitChromeRegistry);

	  var locales = cr.getLocalesForPackage("global");
	  var existlocale = false;

  	  var tempRegexp = new RegExp("^"+defaultlang,"g");

	   while (locales.hasMore()) {
     		var locale = locales.getNext();
     		if (tempRegexp.test(locale)) { existlocale = true; }
   	   }

	if (!existlocale) {

		notifications.notify({
	    	text: "Es prova d'activar la interfície en català...",
	      	iconURL: iconpopup
		});

		downFirefox(defaultlang, uilang);
	}

	else {
		// Last performed check - First time
  		if (prefsBundle.get("extensions.softcatala.first") < 2) {
			downFirefox(defaultlang, uilang);
  		} 	
	}

  }

  return(true);

}

function downFirefox(defaultlang, uilang) {
  
  var tempRegexp = new RegExp("^"+defaultlang,"g");
  var extRegexp = new RegExp("langpack-"+defaultlang); //Detect langpack
  var dicRegexp = new RegExp(defaultlang+"@dictionaries"); //Detect dictionary

  var osmatch = prefsBundle.get("intl.locale.matchOS", false);
  var locale = prefsBundle.get("general.useragent.locale", defaultlang);
  var enabledext = prefsBundle.get("extensions.enabledAddons", "");
  var localeprev = prefsBundle.get("extensions.softcatala.localeprev", defaultlang);

  var channel = prefsBundle.get("app.update.channel");

  var info = Cc["@mozilla.org/xre/app-info;1"]
           .getService(Components.interfaces.nsIXULAppInfo);
  // Get the name of the application running us
  
  var version = info.version; 
  //version = simplifyVersion(version); -> For Mozilla Langpacks not
  
  var osString = Cc["@mozilla.org/xre/app-info;1"]  
               .getService(Components.interfaces.nsIXULRuntime).OS; 

  //Default string
  var os = "win32";
  if (osString == "Linux") {
  	os = "linux-i686";
  }
  if (osString == "Darwin") {
	os = "mac";
  }

  // List locales in the system
  var cr = Cc["@mozilla.org/chrome/chrome-registry;1"]
    .getService(Components.interfaces.nsIToolkitChromeRegistry);

  var locales = cr.getLocalesForPackage("global");
  var existlocale = new Boolean();
  existlocale = false;

   while (locales.hasMore()) {
     var locale = locales.getNext();
     if (tempRegexp.test(locale)) { existlocale = true; }
   }
   
   // Case locale already exists -> base version or Linux system
   if (existlocale) {

	var tempRegexp = new RegExp("^"+defaultlang,"g");
	var uitest = new Boolean();
	uitest = false;
	uitest = tempRegexp.test(uilang);

	if (uitest) {
		//Cas de distros com Ubuntu
  	 	if (osmatch) {
        		prefsBundle.set("intl.locale.matchOS", false);
  	 	}

		if (prefsBundle.get("extensions.softcatala.first") == 1) {

        		var tabs = require("tabs");
			var urlff = "http://www.firefox.cat?catalanitzador=1";

			if (os == 'win32') {
				urlff = urlff + "&win=1";
			}

			if (!dicRegexp.test(enabledext)) {

				urlff = urlff + "&dic=1";
			}

			tabs.open(urlff);

			var notifications = require("notifications");
  			var iconpopup = localdata.url("icon32.png");

			notifications.notify({
	      			text: "Esteu navegant en català! Descobriu què més podeu fer.",
	      			iconURL: iconpopup
	 		});

			prefsBundle.set("extensions.softcatala.first", 2);
		}

	}
	else {
        	//Cas de distros com Ubuntu
  	 	if (osmatch) {
        		prefsBundle.set("intl.locale.matchOS", false);
  	 	}

		prefsBundle.set("general.useragent.locale", defaultlang);
		var notifications = require("notifications");
  		var iconpopup = localdata.url("icon32.png");

		notifications.notify({
	      		text: "Cal que reinicieu el Firefox perquè els canvis tinguin efecte.",
	      		iconURL: iconpopup
	 	});

	}
	 
   }

   else {

     if (!extRegexp.test(enabledext)) {
	
	  if (!tempRegexp.test(uilang)) {

		prefsBundle.set("general.useragent.locale", defaultlang);
  	  }	

          //Cas de distros com Ubuntu
  	  if (osmatch) {
        		prefsBundle.set("intl.locale.matchOS", false);
  	  }

  	  getLangpack(version, os, "firefox", channel);
	  //After this, we suppose that is enabled
	  prefsBundle.set("extensions.softcatala.first", 1);
     }

  }

  return(true);
}

function trim(stringToTrim) {
	return stringToTrim.replace(/^\s+|\s+$/g,"");
}

function simplifyVersion(version) {

        var splitted = version.split(".");
        version = splitted[0]+"."+splitted[1];
        return(version);
}


function getLangpack(version, os, app, channel) {

  	var notifications = require("notifications");
  	var iconpopup = localdata.url("icon32.png");

	if (channel == 'nightly' || channel == 'aurora') {
	      notifications.notify({
	      text: "No es pot instal·lar un paquet d'idioma en les versions de desenvolupament",
	      iconURL: iconpopup
	    });
	}

	else {
		if (channel == 'beta') {
			version = version+'b1'; //Take the first beta version
		}

		var langpackurl = "ftp://ftp.mozilla.org/pub/"+app+"/releases/"+version+"/"+os+"/xpi/"+defaultlang+".xpi";    	
	
        	var tabs = require("tabs");

		tabs.open({
  			url: langpackurl,
  			inBackground: true
		});

	}

}

function getDictionary(version, os, app, channel) {


}

