const {Cc, Ci, Cr, Cu} = require("chrome");

const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
// const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}"; Not possible now

const widgets = require("widget");
const localdata = require("self").data

const prefsBundle = require("preferences-service");
const StringBundle = require("app-strings").StringBundle;

const defaultlang = "ca";
const defaultlangstr = "ca, en-US, en";
const defaultmatchOS = false;

// Create icon for the toolbar
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

    // Get former values
    prev_locale = prefsBundle.get("extensions.softcatala.localeprev", defaultlang);
    prev_accept = prefsBundle.get("extensions.softcatala.acceptprev", defaultlangstr);
    prev_match = prefsBundle.get("extensions.softcatala.matchprev", defaultmatchOS);

    // Recover former values
    prefsBundle.set("general.useragent.locale", prev_locale);
    prefsBundle.set("intl.accept_languages", prev_accept);
    prefsBundle.set("intl.locale.matchOS", prev_match);
  
    // Empty old storage
    prefsBundle.set("extensions.softcatala.localeprev", "");
    prefsBundle.set("extensions.softcatala.acceptprev", "");
    prefsBundle.set("extensions.softcatala.matchprev", false);
    prefsBundle.set("extensions.softcatala.first", 0);
  
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

  // Uses regexp for ensuring lang code
  var lngRegexp = new RegExp("^"+defaultlang,"g");

  // Register if langpack is downloaded
  var performed = false;

  var insdef = 0;
  var newlistlangs;
  
  // Review Accept language
  for (clist = 0; clist < listlangs.length; clist++) {
    
    // Check first entry
    if (clist == 0) {
      
      // If first entry is already default lang -> Done    
      if (lngRegexp.test(listlangs[clist])) {
	insdef++;
	break;
      }
    }
    
    // Otherwise
    else {
      
      // If default lang is somewhere
      if (lngRegexp.test(listlangs[clist])) {
	
	// Mark detected
	insdef++;

	// Default change is defaultang [ca]
	var lngchg = defaultlang;

	// Other cases [ca-valencia], [ca-ES], etc.
	if (listlangs[clist] != defaultlang) {
	  lngchg = listlangs[clist];
	}

	listlangs.splice(clist, 1);
	listlangs.unshift(lngchg);
	  
	// Create new array
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
  
 
  // Periodical checking
  if (!performed) {
    
    var lngRegexp = new RegExp("^"+defaultlang,"g");
    var existlocale = new Boolean(false);
    existlocale = detectLocale(lngRegexp);

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
  var localeprev = prefsBundle.get("extensions.softcatala.localeprev", defaultlang);

  // Firefox channel
  var channel = prefsBundle.get("app.update.channel");

  var info = Cc["@mozilla.org/xre/app-info;1"]
           .getService(Components.interfaces.nsIXULAppInfo);  
	     
  var version = info.version; 
  //version = simplifyVersion(version); -> For Mozilla Langpacks not
  
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
  
  // If UI locale is forced by the OS (e.g. Linux distros) -> change it
  if (osmatch) {
    prefsBundle.set("intl.locale.matchOS", false);
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

	notifications.notify({
	  text: "Esteu navegant en català! Descobriu què més podeu fer.",
	  iconURL: iconpopup
	});

	prefsBundle.set("extensions.softcatala.first", 2);
      }
    }
    else {

      prefsBundle.set("general.useragent.locale", defaultlang);

      notifications.notify({
	text: "Cal que reinicieu el Firefox perquè els canvis tinguin efecte.",
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
      
      getLangpack(version, os, "firefox", channel);
      
      //After this, we suppose that langpack is enabled
      prefsBundle.set("extensions.softcatala.first", 1);
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

  // Warn is not available for aurora or nightly
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

    var langpackurl = "http://ftp.mozilla.org/pub/"+app+"/releases/"+version+"/"+os+"/xpi/"+defaultlang+".xpi";    	
  

    tabs.open({
      url: langpackurl,
      inBackground: true
    });
    
  }

}

function trim(stringToTrim) {
  return stringToTrim.replace(/^\s+|\s+$/g,"");
}

function simplifyVersion(version) {
  var splitted = version.split(".");
  version = splitted[0]+"."+splitted[1];
  return(version);
}

