import { config } from "../package.json";
import { registerMenus } from "./modules/menu";
import { getString } from "./utils/locale";

declare const Zotero: any;
declare const Services: any;
declare const Components: any;

if (!Zotero.DOIFinder) {
  Zotero.DOIFinder = {
    id: config.addonID,
    name: config.addonName,
    version: "0.0.1",
    initialized: false,
  };
}

(async function() {
  if (Zotero.DOIFinder.initialized) {
    return;
  }
  
  Zotero.DOIFinder.initialized = true;
  
  // Register menus
  registerMenus();
  
  // Add keyboard shortcut
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
  
  // Add toolbar button
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
  
  // Export functions
  Zotero.DOIFinder.findDOIs = findDOIs;
  Zotero.DOIFinder.findDOIForItem = findDOIForItem;
  Zotero.DOIFinder.processItems = processItems;
  
  Zotero.debug("DOI Finder: Initialized");
})();

function hasValidDOI(item: any): boolean {
  const doi = item.getField('DOI');
  return doi && doi.trim() !== '' && doi.trim() !== '-';
}

async function findDOIForItem(item: any): Promise<string | null> {
  const doi = item.getField('DOI');
  Zotero.debug(`DOI Finder: Checking item ${item.id}, title: "${item.getField('title')}", DOI field: "${doi}"`);
  
  if (!item.isRegularItem() || hasValidDOI(item)) {
    Zotero.debug(`DOI Finder: Item ${item.id} skipped - regular: ${item.isRegularItem()}, has valid DOI: ${hasValidDOI(item)}`);
    return null;
  }

  const title = item.getField('title');
  const creators = item.getCreators();
  
  if (!title) {
    Zotero.debug(`DOI Finder: Item ${item.id} has no title`);
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

  const year = item.getField('date')?.match(/\d{4}/)?.[0];
  if (year) {
    queryParts.push(`filter=from-pub-date:${year},until-pub-date:${year}`);
  }

  const url = `https://api.crossref.org/works?${queryParts.join('&')}&rows=5`;
  Zotero.debug(`DOI Finder: Querying CrossRef: ${url}`);

  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.setRequestHeader('User-Agent', `Zotero DOI Finder/0.0.1`);
    xhr.send();
    
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);
      const items = data.message?.items || [];

      for (const crossrefItem of items) {
        if (crossrefItem.DOI && isTitleMatch(title, crossrefItem.title?.[0])) {
          Zotero.debug(`DOI Finder: Found matching DOI: ${crossrefItem.DOI}`);
          return crossrefItem.DOI;
        }
      }
    }
  } catch (error) {
    Zotero.debug(`DOI Finder: Error fetching from CrossRef: ${error}`);
  }

  return null;
}

function isTitleMatch(title1: string, title2: string): boolean {
  if (!title1 || !title2) return false;
  
  const normalize = (str: string) => 
    str.toLowerCase()
       .replace(/[^\w\s]/g, '')
       .replace(/\s+/g, ' ')
       .trim();
  
  const norm1 = normalize(title1);
  const norm2 = normalize(title2);
  
  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  const similarity = calculateSimilarity(norm1, norm2);
  return similarity > 0.85;
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
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

async function processItems(items: any[]): Promise<{ found: number; total: number }> {
  // Create progress window
  const progressWin = new Zotero.ProgressWindow({
    closeOnClick: false
  });
  progressWin.changeHeadline(getString("findDOI.progress.title") || "Finding DOIs");
  
  // Create progress indicator
  const progressText = getString("findDOI.progress.processing") || "Processing items...";
  const icon = "chrome://zotero/skin/16/universal/book.svg";
  progressWin.addLines(progressText, icon);
  
  progressWin.show();
  
  let found = 0;
  const total = items.length;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Update progress text
    const percent = Math.round(((i + 1) / total) * 100);
    const newProgressText = getString("findDOI.progress.item", { 
      current: i + 1, 
      total: total, 
      percent: percent 
    }) || `Processing item ${i + 1} of ${total} (${percent}%)`;
    
    progressWin.changeHeadline(newProgressText);
    
    try {
      const doi = await findDOIForItem(item);
      if (doi) {
        item.setField('DOI', doi);
        await item.saveTx();
        found++;
      }
    } catch (error) {
      Zotero.debug(`DOI Finder: Error processing item ${item.id}: ${error}`);
    }

    await Zotero.Promise.delay(300);
  }
  
  progressWin.close();
  
  return { found, total };
}

async function findDOIs(): Promise<void> {
  const ZP = Zotero.getActiveZoteroPane();
  const collection = ZP.getSelectedCollection();
  const libraryID = collection ? collection.libraryID : ZP.getSelectedLibraryID();
  
  let items: any[];
  if (collection) {
    items = collection.getChildItems();
  } else {
    items = await Zotero.Items.getAll(libraryID);
  }

  Zotero.debug(`DOI Finder: Processing ${items.length} total items`);

  const itemsWithoutDOI = items.filter((item: any) => {
    const doi = item.getField('DOI');
    const needsDOI = item.isRegularItem() && (!doi || doi.trim() === '' || doi.trim() === '-');
    Zotero.debug(`DOI Finder: Item ${item.id} - regular: ${item.isRegularItem()}, DOI: "${doi}", needs DOI: ${needsDOI}`);
    return needsDOI;
  });

  Zotero.debug(`DOI Finder: Found ${itemsWithoutDOI.length} items without DOI`);

  if (itemsWithoutDOI.length === 0) {
    Services.prompt.alert(null, getString("findDOI.noneFound"), getString("findDOI.allHaveDOI"));
    return;
  }

  const result = await processItems(itemsWithoutDOI);

  Services.prompt.alert(
    null, 
    getString("findDOI.title"),
    getString("findDOI.complete", result)
  );
}

export default {};
