/* global Components, Services */
"use strict";

if (typeof Zotero == "undefined") {
  var Zotero = Components.classes["@zotero.org/Zotero;1"]
    .getService(Components.interfaces.nsISupports).wrappedJSObject;
}

var chromeHandle;

async function startup({ id, version, resourceURI, rootURI = resourceURI.spec }) {
  await Zotero.uiReadyPromise;
  
  Zotero.debug("DOI Finder: Starting up");

  // Register chrome package
  var aomStartup = Components.classes[
    "@mozilla.org/addons/addon-manager-startup;1"
  ].getService(Components.interfaces.amIAddonManagerStartup);
  var manifestURI = Services.io.newURI(rootURI + "manifest.json");
  chromeHandle = aomStartup.registerChrome(manifestURI, [
    ["content", "doifinder", rootURI + "content/"],
  ]);

  // Load plugin code
  Services.scriptloader.loadSubScript(
    rootURI + "content/scripts/index.js",
    {}
  );
}

function shutdown() {
  Zotero.debug("DOI Finder: Shutting down");
  
  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }
  
  // Unregister everything
  if (typeof ztoolkit !== "undefined") {
    ztoolkit.unregisterAll();
  }
  
  // Remove from Zotero namespace
  delete Zotero.DOIFinder;
}

function install(data, reason) {
  Zotero.debug("DOI Finder: Installed");
}

function uninstall(data, reason) {
  Zotero.debug("DOI Finder: Uninstalled");
}
