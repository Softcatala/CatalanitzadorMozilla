const {Cc, Ci, Cr, Cu} = require("chrome");

const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
// const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}"; Not possible now

const widgets = require("widget");
const localdata = require("self").data

const prefsBundle = require("preferences-service");
const StringBundle = require("app-strings").StringBundle;

const defaultlang = "ca-valencia";
const secondlang = "ca";
const defaultlangstr = "ca-valencia, ca, en-US, en";
const defaultmatchOS = false;

// Create icon for the toolbar
var widget = widgets.Widget({
  id: "navega-link",
  label: "Navega en valencià",
  tooltip: 'Navega en valencià',
  contentURL: localdata.url("icon16.png"),
  onClick: function() {
    detchanlang(true);
  }
});

// Check on every Firefox start
detchanlang(false);

// Uninstall / disable parameters
exports.onUnload = function (reason) {
  
  if (reason == 'uninstall' || reason == 'disable') {

  var prev_locale;
  var prev_accept;
  var prev_match;

  prev_locale = prefsBundle.get("extensions.softvalencia.localeprev", defaultlang);
  prev_accept = prefsBundle.get("extensions.softvalencia.acceptprev", defaultlangstr);
  prev_match = prefsBundle.get("extensions.softvalencia.matchprev", defaultmatchOS);

  prefsBundle.set("general.useragent.locale", prev_locale);
  prefsBundle.set("intl.accept_languages", prev_accept);
  prefsBundle.set("intl.locale.matchOS", prev_match);
  
  prefsBundle.set("extensions.softvalencia.localeprev", "");
  prefsBundle.set("extensions.softvalencia.acceptprev", "");
  prefsBundle.set("extensions.softvalencia.matchprev", false);
  prefsBundle.set("extensions.softvalencia.first", 0);

  }  

};


function detchanlang(clicktrigger) {

  var notifications = require("notifications");
  var iconpopup = localdata.url("icon32.png");
  
  // Check if locale, default assume default lang
  var uilang = prefsBundle.get("general.useragent.locale", defaultlang);

  // Get user interface language
  if (uilang == "chrome://global/locale/intl.properties") {
    var bundle = StringBundle(uilang);
    uilang = bundle.get("general.useragent.locale");
  }
  
  // Get accept languages
  var preflangs = prefsBundle.get("intl.accept_languages", defaultlangstr);

  // Extract lang codes
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
  var osmatch = prefsBundle.get("intl.locale.matchOS", defaultmatchOS);
  
  //Create extensions branch if it doesn't exist, store previous

  //Set First run -> 0 
  if (!prefsBundle.has('extensions.softvalencia.first')) {
    prefsBundle.set("extensions.softvalencia.first", 0);	
  }  

  //Locale interface
  if (!prefsBundle.has('extensions.softvalencia.localeprev')) {
    prefsBundle.set("extensions.softvalencia.localeprev", uilang);
  }
  else {
    if (prefsBundle.get('extensions.softvalencia.localeprev') == '') {
      prefsBundle.set("extensions.softvalencia.localeprev", uilang);
    }
  }
  
  //Accept language
  listlangstr = listlangs.join(",");
  if (!prefsBundle.has('extensions.softvalencia.acceptprev')) {
    prefsBundle.set("extensions.softvalencia.acceptprev", listlangstr);
  }
  else {
    if (prefsBundle.get('extensions.softvalencia.acceptprev') == '') {
      prefsBundle.set("extensions.softvalencia.acceptprev", listlangstr);
    }
  }

  //MatchOS
  if (!prefsBundle.has('extensions.softvalencia.matchprev')) {
    prefsBundle.set("extensions.softvalencia.matchprev", osmatch);
  }

  // Uses regexp for ensuring lang code

  var lngRegexp = new RegExp("^"+defaultlang,"g");
  var lngRegexp2 = new RegExp("^"+secondlang,"g");
  
  // Register if langpack is downloaded
  var performed = new Boolean(false);
  
  // Check whether langpack action should go on
  var toDownload = new Boolean(false);
  toDownload = makeNewListLangs(lngRegexp, lngRegexp2, listlangs);

  if (toDownload) {
    performed = downFirefox(defaultlang, uilang);
  }

  else {
    
    // If everything Ok, don't do anything, unless it's been clicked
    if (clicktrigger) {
      
      notifications.notify({
	text: "Enhorabona! Ja navegàveu en valencià",
	iconURL: iconpopup
      });
      
      performed = downFirefox(defaultlang, uilang);     
    }
    
    // Last performed check - First time
    if (prefsBundle.get("extensions.softvalencia.first") < 2) {
	performed = false;
    } 
    
  }
  
    // Periodical checking
  if (!performed) {
    
    var lngRegexp = new RegExp("^"+defaultlang,"g");
    var existlocale = new Boolean(false);
    existlocale = detectLocale(lngRegexp);

    if (!existlocale) {

      notifications.notify({
      text: "Es prova d'activar la interfície en valencià...",
      iconURL: iconpopup
      });

      downFirefox(defaultlang, uilang);
    }

    else {
      // Last performed check - First time
      if (prefsBundle.get("extensions.softvalencia.first") < 2) {
	downFirefox(defaultlang, uilang);
      } 	
    }

  }

  return(true);

}

function makeNewListLangs(lngRegexp, lngRegexp2, listlangs) {

  var insdef = 0;
  var newlistlangs;
  var change = 0;
  
  // Review Accept language
  for (clist = 0; clist < listlangs.length; clist++) {
    
    // Check first entry
    if (clist == 0) {
      
      // Ensure more than 2 elements
      if (typeof listlangs[clist+1] !== 'undefined') {
	// If first entry is already default lang and second entry is second lang-> Done    
	if ((listlangs[clist] == defaultlang) && (listlangs[clist+1] == secondlang) ) {
	  insdef++;
	  break;
	}
      }
      
      else {
      
	if (listlangs[clist] == defaultlang) {
	  listlangs.splice(clist, 1);
	}
      
	if (listlangs[clist] == secondlang) {
	  listlangs.splice(clist, 1);
	}
      }
    }
    
    // Otherwise
    else {
      
      // If default lang is somewhere
      if (lngRegexp.test(listlangs[clist])) {
	
	// Mark detected
	insdef++;

	//Remove instance
	listlangs.splice(clist, 1);
	
	//remove any other ca like
	for (slist = 0; slist < listlangs.length; slist++) {
	  if (lngRegexp2.test(listlangs[slist])) {
	    listlangs.splice(slist, 1);
	  }
	}
	
	// put lang pair
	listlangs.unshift(secondlang);
	listlangs.unshift(defaultlang);
	  
	// Create new array
	newlistlangs = listlangs.join(',');
	prefsBundle.set("intl.accept_languages", newlistlangs);
	change = 1;
	break;
      
      }
      
      else {
	
	//Remove any ca for last case
	if (lngRegexp2.test(listlangs[clist])) {
	  listlangs.splice(clist, 1);
	}
	
      }
      
    }
  }
  
  //If default lang is nowhere, add at the beginning
  if (insdef == 0) {
    listlangs.unshift(defaultlang);
    listlangs.unshift(secondlang);

    newlistlangs = listlangs.join(',');
    
    prefsBundle.set("intl.accept_languages", newlistlangs);
    change = 1;
  }
  
  if (change > 0) {
    return true;
  }
  else {
    return false;
  }

}

function downFirefox(defaultlang, uilang) {
  
  // Get ready for notifications
  var notifications = require("notifications");
  var iconpopup = localdata.url("icon32.png");
  
  // Detect regexps
  var lngRegexp = new RegExp("^"+defaultlang,"g");
  var extRegexp = new RegExp("langpack-"+defaultlang); //Detect langpack
  var dicRegexp = new RegExp(defaultlang+"@dictionaries"); //Detect dictionary

  var osmatch = prefsBundle.get("intl.locale.matchOS", defaultmatchOS);
  var locale = prefsBundle.get("general.useragent.locale", defaultlang);
  var enabledext = prefsBundle.get("extensions.enabledAddons", "");
  var localeprev = prefsBundle.get("extensions.softvalencia.localeprev", defaultlang);

  // Firefox channel
  var channel = prefsBundle.get("app.update.channel");

  var info = Cc["@mozilla.org/xre/app-info;1"]
           .getService(Components.interfaces.nsIXULAppInfo);  
	     
  var version = info.version; 
  version = simplifyVersion(version); // For Mozilla Langpacks not
  
  var osString = Cc["@mozilla.org/xre/app-info;1"]  
               .getService(Components.interfaces.nsIXULRuntime).OS; 

  //Default string for OS
  var os = "win32";
  if (osString == "Linux") {
  	os = "linux-i686";
  }
  if (osString == "Darwin") {
	os = "mac";
  }
  
  var existlocale = new Boolean(false);
  existlocale = detectLocale(lngRegexp);
   
  // Case locale already exists -> base version or Linux system
  if (existlocale) {

    var lngRegexp = new RegExp("^"+defaultlang,"g");
    var uitest = new Boolean(false);
    var uitest = lngRegexp.test(uilang);

    if (uitest) {

      // After langpack is installed -> Landing page
      if (prefsBundle.get("extensions.softvalencia.first") == 1) {

	var tabs = require("tabs");
	tabs.open("http://www.softvalencia.org/valencianitzador-del-firefox");

	notifications.notify({
	  text: "Ara ja navegueu en valencià!",
	  iconURL: iconpopup
	});

	prefsBundle.set("extensions.softvalencia.first", 2);
      }
    }
    else {

      prefsBundle.set("general.useragent.locale", defaultlang);

      // If UI locale is forced by the OS (e.g. Linux distros) -> change it
      if (osmatch) {
	prefsBundle.set("intl.locale.matchOS", false);
      }

      notifications.notify({
	text: "Cal que reinicieu el Firefox perquè els canvis tinguen efecte.",
	iconURL: iconpopup
      });
    } 
  }

  // Add langpack
  else {

    if (!extRegexp.test(enabledext)) {
	
      if (!lngRegexp.test(uilang)) {
	prefsBundle.set("general.useragent.locale", defaultlang);
      }
      
      // If UI locale is forced by the OS (e.g. Linux distros) -> change it
      if (osmatch) {
	prefsBundle.set("intl.locale.matchOS", false);
      }
      
      getLangpack(version, os, "firefox", channel);
      
      //After this, we suppose that langpack is enabled
      prefsBundle.set("extensions.softvalencia.first", 1);
    }

  }
  
  return(true);
  
}


function detectLocale(lngRegexp) {
  
  // List locales in the system
  var cr = Cc["@mozilla.org/chrome/chrome-registry;1"]
    .getService(Components.interfaces.nsIToolkitChromeRegistry);

  var locales = cr.getLocalesForPackage("global");
  
  while (locales.hasMore()) {
    var locale = locales.getNext();
    if (lngRegexp.test(locale)) { return true; }
  }
  
  return false;
  
}

function getLangpack(version, os, app, channel) {
  
  var notifications = require("notifications");
  var iconpopup = localdata.url("icon32.png");
  var tabs = require("tabs");
  
  var found = 0;
  
  var Request = require("request").Request;
  var appJSON = Request({
	  url: "http://www.mozilla.cat/firefox-valencia.json",
	  onComplete: function (response) {
		  var all = response.json;
		  var versionsarray = all["versions"];
		  for (i=0; i<versionsarray.length; i++) {
			  if (versionsarray[i].id == version) {
				  tabs.open({url:versionsarray[i].url, inBackground:true});
				  found = 1;
			  }
		  }
		  
		  if (found == 0) {
		    notifications.notify({
		      text: "No hi ha cap paquet d'idioma disponible encara per a la vostra versió del Firefox",
		      iconURL: iconpopup
		    });
		  }
	  }
  });
  appJSON.get();
  
}

function trim(stringToTrim) {
  return stringToTrim.replace(/^\s+|\s+$/g,"");
}

function simplifyVersion(version) {
  var splitted = version.split(".");
  version = splitted[0]+"."+splitted[1];
  return(version);
}
