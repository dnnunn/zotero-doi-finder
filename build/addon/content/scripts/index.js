"use strict";
(() => {
  // package.json
  var config = {
    addonName: "DOI Finder",
    addonID: "doifinder@zotero.org",
    addonRef: "doifinder",
    addonInstance: "DOIFinder",
    prefsPrefix: "extensions.zotero.doifinder"
  };

  // src/utils/locale.ts
  function getString(key, substitutions) {
    const strings = {
      "startup.begin": "DOI Finder is starting...",
      "startup.finish": "DOI Finder is ready!",
      "toolbar.label": "Find DOIs",
      "toolbar.tooltip": "Find missing DOI numbers for selected items",
      "menu.findDOI": "Find DOI",
      "menu.findDOICollection": "Find DOIs in Collection",
      "menu.findDOILibrary": "Find DOIs in Library",
      "findDOI.title": "Finding DOIs",
      "findDOI.processing": "Processing item {current} of {total}...",
      "findDOI.complete": "Complete! Found {found} DOIs out of {total} items",
      "findDOI.noneFound": "No Items Found",
      "findDOI.noneSelected": "No Items Selected",
      "findDOI.allHaveDOI": "All selected items already have DOI numbers"
    };
    let str = strings[key] || key;
    if (substitutions && typeof substitutions === "object") {
      Object.entries(substitutions).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  }

  // src/modules/menu.ts
  function registerMenus() {
    const doc = Zotero.getMainWindow().document;
    const toolsMenu = doc.getElementById("menu_ToolsPopup");
    if (toolsMenu) {
      const menuitem = doc.createXULElement("menuitem");
      menuitem.id = `${config.addonRef}-tools-menu`;
      menuitem.setAttribute("label", getString("menu.findDOILibrary"));
      menuitem.setAttribute("oncommand", "Zotero.DOIFinder.findDOIs();");
      toolsMenu.appendChild(menuitem);
    }
    const itemMenu = doc.getElementById("zotero-itemmenu");
    if (itemMenu) {
      const menuitem = doc.createXULElement("menuitem");
      menuitem.id = `${config.addonRef}-item-menu`;
      menuitem.setAttribute("label", getString("menu.findDOI"));
      menuitem.setAttribute("oncommand", "Zotero.DOIFinder.findDOIsForSelected();");
      itemMenu.appendChild(menuitem);
    }
    Zotero.DOIFinder.findDOIsForSelected = async () => {
      const items = ZoteroPane.getSelectedItems();
      const itemsWithoutDOI = items.filter(
        (item) => item.isRegularItem() && !item.getField("DOI")
      );
      if (itemsWithoutDOI.length === 0) {
        Services.prompt.alert(null, getString("findDOI.noneSelected"), getString("findDOI.allHaveDOI"));
        return;
      }
      let found = 0;
      for (const item of itemsWithoutDOI) {
        try {
          const doi = await Zotero.DOIFinder.findDOIForItem(item);
          if (doi) {
            item.setField("DOI", doi);
            await item.saveTx();
            found++;
          }
        } catch (error) {
          Zotero.debug(`DOI Finder: Error processing item ${item.id}: ${error}`);
        }
        await Zotero.Promise.delay(300);
      }
      Services.prompt.alert(
        null,
        getString("findDOI.title"),
        getString("findDOI.complete", { found, total: itemsWithoutDOI.length })
      );
    };
  }

  // src/index.ts
  if (!Zotero.DOIFinder) {
    Zotero.DOIFinder = {
      id: config.addonID,
      name: config.addonName,
      version: "0.0.1",
      initialized: false
    };
  }
  (async function() {
    if (Zotero.DOIFinder.initialized) {
      return;
    }
    Zotero.DOIFinder.initialized = true;
    registerMenus();
    const keysetId = "doifinder-keyset";
    const cmdId = "doifinder-cmd-find";
    const doc = Zotero.getMainWindow().document;
    if (!doc.getElementById(keysetId)) {
      const keyset = doc.createXULElement("keyset");
      keyset.id = keysetId;
      const key = doc.createXULElement("key");
      key.id = cmdId + "-key";
      key.setAttribute("key", "D");
      key.setAttribute("modifiers", "accel alt");
      key.setAttribute("command", cmdId);
      keyset.appendChild(key);
      doc.getElementById("mainKeyset").parentElement.appendChild(keyset);
      const command = doc.createXULElement("command");
      command.id = cmdId;
      command.setAttribute("oncommand", "Zotero.DOIFinder.findDOIs();");
      doc.getElementById("mainCommandSet").appendChild(command);
    }
    const toolbar = doc.getElementById("zotero-tb-advanced-search");
    if (toolbar && !doc.getElementById(`${config.addonRef}-button`)) {
      const toolbarbutton = doc.createXULElement("toolbarbutton");
      toolbarbutton.id = `${config.addonRef}-button`;
      toolbarbutton.className = "zotero-tb-button";
      toolbarbutton.setAttribute("tooltiptext", getString("toolbar.tooltip"));
      toolbarbutton.setAttribute("label", getString("toolbar.label"));
      toolbarbutton.style.listStyleImage = `url('chrome://doifinder/content/icons/icon.png')`;
      toolbarbutton.addEventListener("command", () => Zotero.DOIFinder.findDOIs());
      toolbar.parentElement?.insertBefore(toolbarbutton, toolbar.nextSibling);
    }
    Zotero.DOIFinder.findDOIs = findDOIs;
    Zotero.DOIFinder.findDOIForItem = findDOIForItem;
    Zotero.debug("DOI Finder: Initialized");
  })();
  async function findDOIForItem(item) {
    if (!item.isRegularItem() || item.getField("DOI")) {
      return null;
    }
    const title = item.getField("title");
    const creators = item.getCreators();
    if (!title) {
      return null;
    }
    const queryParts = [];
    queryParts.push(`query.bibliographic=${encodeURIComponent(title)}`);
    if (creators.length > 0) {
      const firstAuthor = creators[0];
      if (firstAuthor.lastName) {
        queryParts.push(`query.author=${encodeURIComponent(firstAuthor.lastName)}`);
      }
    }
    const year = item.getField("date")?.match(/\d{4}/)?.[0];
    if (year) {
      queryParts.push(`filter=from-pub-date:${year},until-pub-date:${year}`);
    }
    const url = `https://api.crossref.org/works?${queryParts.join("&")}&rows=5`;
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.setRequestHeader("User-Agent", `Zotero DOI Finder/0.0.1`);
      xhr.send();
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        const items = data.message?.items || [];
        for (const crossrefItem of items) {
          if (crossrefItem.DOI && isTitleMatch(title, crossrefItem.title?.[0])) {
            return crossrefItem.DOI;
          }
        }
      }
    } catch (error) {
      Zotero.debug(`DOI Finder: Error fetching from CrossRef: ${error}`);
    }
    return null;
  }
  function isTitleMatch(title1, title2) {
    if (!title1 || !title2)
      return false;
    const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
    const norm1 = normalize(title1);
    const norm2 = normalize(title2);
    if (norm1 === norm2)
      return true;
    if (norm1.includes(norm2) || norm2.includes(norm1))
      return true;
    const similarity = calculateSimilarity(norm1, norm2);
    return similarity > 0.85;
  }
  function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0)
      return 1;
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  function levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }
  async function findDOIs() {
    const ZP = Zotero.getActiveZoteroPane();
    const collection = ZP.getSelectedCollection();
    const libraryID = collection ? collection.libraryID : ZP.getSelectedLibraryID();
    let items;
    if (collection) {
      items = collection.getChildItems();
    } else {
      items = await Zotero.Items.getAll(libraryID);
    }
    const itemsWithoutDOI = items.filter(
      (item) => item.isRegularItem() && !item.getField("DOI")
    );
    if (itemsWithoutDOI.length === 0) {
      Services.prompt.alert(null, getString("findDOI.noneFound"), getString("findDOI.allHaveDOI"));
      return;
    }
    let found = 0;
    for (const item of itemsWithoutDOI) {
      try {
        const doi = await findDOIForItem(item);
        if (doi) {
          item.setField("DOI", doi);
          await item.saveTx();
          found++;
        }
      } catch (error) {
        Zotero.debug(`DOI Finder: Error processing item ${item.id}: ${error}`);
      }
      await Zotero.Promise.delay(300);
    }
    Services.prompt.alert(
      null,
      getString("findDOI.title"),
      getString("findDOI.complete", { found, total: itemsWithoutDOI.length })
    );
  }
  var src_default = {};
})();
