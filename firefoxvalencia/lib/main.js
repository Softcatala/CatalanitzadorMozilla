const {Cc, Ci, Cr, Cu} = require("chrome");

const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";

const widgets = require("widget");
const localdata = require("self").data

const prefsBundle = require("preferences-service");
const StringBundle = require("app-strings").StringBundle;

const defaultlang = "ca-valencia";
const secondlang = "ca";


// Create main widget
var widget = widgets.Widget({
  id: "navega-link",
  label: "Navega en valencià",
  tooltip: 'Navega en valencià',
  contentURL: localdata.url("icon16.png"),
  onClick: function() {
    detchanlang(true);
  }
});

var dictPanel = require("panel").Panel({
  width:215,
  height:160,
  contentURL: localdata.url("dictinstall.html"),
  contentScriptFile: [localdata.url("jquery-1.4.4.min.js"),
                      localdata.url("dictinstall.js")]
});


// Check on every Firefox start
detchanlang(false);

// Uninstall / disable parameters
exports.onUnload = function (reason) {
  
  if (reason == 'uninstall' || reason == 'disable') {

  var prev_locale;
  var prev_accept;
  var prev_match;

  prev_locale = prefsBundle.get("extensions.softvalencia.localeprev", "ca-valencia");
  prev_accept = prefsBundle.get("extensions.softvalencia.acceptprev", "ca-valencia, ca, en-US, en");
  prev_match = prefsBundle.get("extensions.softvalencia.matchprev", "false");

  prefsBundle.set("general.useragent.locale", prev_locale);
  prefsBundle.set("intl.accept_languages", prev_accept);
  prefsBundle.set("intl.locale.matchOS", prev_match);
  
  prefsBundle.set("extensions.softvalencia.localeprev", "");
  prefsBundle.set("extensions.softvalencia.acceptprev", "");
  prefsBundle.set("extensions.softvalencia.matchprev", false);
  
  }  

};


function detchanlang(clicktrigger) {

  var notifications = require("notifications");
  var iconpopup = localdata.url("icon32.png");

  //Check if locale, trigger for ca version
  var uilang = prefsBundle.get("general.useragent.locale", "ca-valencia");

  // Get user interface language
  if (uilang == "chrome://global/locale/intl.properties") {
      var bundle = StringBundle(uilang);
      uilang = bundle.get("general.useragent.locale");
  }
  
  // Get accept languages
  var preflangs = prefsBundle.get("intl.accept_languages", "ca-valencia, ca, en-US, en");

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


  //Start playing
  
  var tempRegexp = new RegExp("^"+defaultlang,"g");
  var tempRegexp2 = new RegExp("^"+secondlang,"g");


  // Made it enabled - Not used for now
  var enabled = true;

  if (enabled) {
  
    var insdef = 0;
    var newlistlangs;
    
    // Review Accept language
    for (clist = 0; clist < listlangs.length; clist++) {
      	
      // Check first entry
      if (clist == 0) {
	
	// If first entry is already default lang and second entry is second lang-> Done    
	if ((listlangs[clist] == defaultlang) && (listlangs[clist+1] == secondlang) ) {
	  insdef++;
	  break;
	}

	else {
		//if only first
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
	if (listlangs[clist] == defaultlang) {

	    insdef++;
  
	    listlangs.splice(clist, 1);
	    
	    //remove any other ca like
            for (slist = 0; slist < listlangs.length; slist++) {
	    
		if (tempRegexp2.test(listlangs[slist])) {
			listlangs.splice(slist, 1);
		}

	    }

	    // put ca-valencia and ca
	    listlangs.unshift(secondlang);
	    listlangs.unshift(defaultlang);

	    newlistlangs = listlangs.join(',');
	    prefsBundle.set("intl.accept_languages", newlistlangs);
	    notifications.notify({
	      text: "A partir d'ara ja navegueu en valencià",
	      iconURL: iconpopup
	    });
	    downFirefox(defaultlang, uilang);
	    break;
	  
	 }
	
	else {
		//Remove any ca for last case
		if (tempRegexp2.test(listlangs[clist]))	{
			listlangs.splice(clist, 1);	
		}
		//Remove any ca-valencia for last case
		if (tempRegexp.test(listlangs[clist]))	{
			listlangs.splice(clist, 1);	
		}

	}
      }

    }
  

    //If default lang is nowhere, add at the beginning
    if (insdef == 0) {
      listlangs.unshift(secondlang);
      listlangs.unshift(defaultlang);
      newlistlangs = listlangs.join(',');
      prefsBundle.set("intl.accept_languages", newlistlangs);
      notifications.notify({
	      text: "A partir d'ara ja navegueu en valencià",
	      iconURL: iconpopup
      });
      downFirefox(defaultlang, uilang);
    }
    
    else {
      
      // If everything Ok, don't do anything, unless it's been clicked
      if (clicktrigger) {
	
	notifications.notify({
	      text: "Enhorabona! Ja navegàveu en valencià",
	      iconURL: iconpopup
	});
	
	dictPanel.show();
	downFirefox(defaultlang, uilang);     
      }
      
    }
    
  }

  return(true);

}

function downFirefox(defaultlang, uilang) {
  
  var tempRegexp = new RegExp("^"+defaultlang,"g");
  var extRegexp = new RegExp("langpack-"+defaultlang);

  var osmatch = prefsBundle.get("intl.locale.matchOS", false);
  var locale = prefsBundle.get("general.useragent.locale", defaultlang);
  var enabledext = prefsBundle.get("extensions.enabledAddons", "");

  var info = Cc["@mozilla.org/xre/app-info;1"]
           .getService(Components.interfaces.nsIXULAppInfo);
  // Get the name of the application running us
  
  var version = info.version; 
  version = simplifyVersion(version);

  //Need to detect if installed langpack
  if (!extRegexp.test(enabledext)) {
	getLangpack(version, "Firefox");
  }

  //Cas de distros com Ubuntu
  if (osmatch) {
	prefsBundle.set("intl.locale.matchOS", false);
  }

  if (!tempRegexp.test(uilang)) {

    prefsBundle.set("general.useragent.locale", defaultlang);
    var tabs = require("tabs");
    tabs.open("http://www.softvalencia.org/valencianitzador-del-firefox");
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

function getLangpack(version, app) {

	var tabs = require("tabs");
	var Request = require("request").Request;
	var appJSON = Request({
  		url: "http://www.mozilla.cat/firefox-valencia.json",
  		onComplete: function (response) {
    			var all = response.json;
			var versionsarray = all["versions"];
			for (i=0; i<versionsarray.length; i++) {
				if (versionsarray[i].id == version) {
					tabs.open({url:versionsarray[i].url, inBackground:true});
				}
			}
  		}
	});
 	appJSON.get();
}
