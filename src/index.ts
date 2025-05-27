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


// Abstract finding functions
async function findAbstractFromSemanticScholar(doi: string): Promise<string | null> {
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${doi}?fields=abstract`;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.setRequestHeader('User-Agent', 'Zotero DOI Finder/0.0.1');
    xhr.send();
    
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);
      return data.abstract || null;
    }
  } catch (error) {
    Zotero.debug(`DOI Finder: Semantic Scholar failed: ${error}`);
  }
  return null;
}

async function findAbstractFromPubMed(doi: string): Promise<string | null> {
  try {
    // First search for PMID using DOI
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(doi)}&retmode=json`;
    const searchXhr = new XMLHttpRequest();
    searchXhr.open('GET', searchUrl, false);
    searchXhr.send();
    
    if (searchXhr.status !== 200) return null;
    
    const searchData = JSON.parse(searchXhr.responseText);
    if (!searchData.esearchresult?.idlist?.length) return null;
    
    const pmid = searchData.esearchresult.idlist[0];
    
    // Get abstract using PMID
    const abstractUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`;
    const abstractXhr = new XMLHttpRequest();
    abstractXhr.open('GET', abstractUrl, false);
    abstractXhr.send();
    
    if (abstractXhr.status !== 200) return null;
    
    // Parse XML to extract abstract
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(abstractXhr.responseText, "text/xml");
    const abstractNode = xmlDoc.querySelector("AbstractText");
    
    return abstractNode ? abstractNode.textContent : null;
  } catch (error) {
    Zotero.debug(`DOI Finder: PubMed failed: ${error}`);
  }
  return null;
}

async function findAbstractFromOpenAlex(doi: string): Promise<string | null> {
  try {
    const url = `https://api.openalex.org/works/doi:${doi}`;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.setRequestHeader('User-Agent', 'Zotero DOI Finder/0.0.1');
    xhr.send();
    
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);
      if (data.abstract_inverted_index) {
        return reconstructAbstract(data.abstract_inverted_index);
      }
    }
  } catch (error) {
    Zotero.debug(`DOI Finder: OpenAlex failed: ${error}`);
  }
  return null;
}

function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  const words: string[] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }
  return words.join(' ');
}

async function findAbstractForItem(item: any, doi: string): Promise<string | null> {
  if (!doi) return null;
  
  // Check if abstract already exists
  const existingAbstract = item.getField('abstractNote');
  if (existingAbstract && existingAbstract.trim() !== '') {
    Zotero.debug(`DOI Finder: Item ${item.id} already has abstract`);
    return null;
  }
  
  Zotero.debug(`DOI Finder: Searching for abstract with DOI: ${doi}`);
  
  // Try Semantic Scholar first
  let abstract = await findAbstractFromSemanticScholar(doi);
  if (abstract) {
    Zotero.debug("DOI Finder: Abstract found via Semantic Scholar");
    return abstract;
  }
  
  // Try PubMed second
  abstract = await findAbstractFromPubMed(doi);
  if (abstract) {
    Zotero.debug("DOI Finder: Abstract found via PubMed");
    return abstract;
  }
  
  // Try OpenAlex last
  abstract = await findAbstractFromOpenAlex(doi);
  if (abstract) {
    Zotero.debug("DOI Finder: Abstract found via OpenAlex");
    return abstract;
  }
  
  Zotero.debug("DOI Finder: Abstract not found in any source");
  return null;
}


async function processItems(items: any[], alreadyComplete: { withDOI: number; withAbstract: number; totalRegular: number }): Promise<{ foundDOIs: number; foundAbstracts: number; total: number }> {
  // Create progress window
  const progressWin = new Zotero.ProgressWindow({
    closeOnClick: false
  });
  progressWin.changeHeadline(getString("findDOI.progress.title") || "Finding DOIs and Abstracts");
  
  // Create progress indicator
  const initialText = `Processing ${items.length} items (${alreadyComplete.withDOI} of ${alreadyComplete.totalRegular} already have DOIs, ${alreadyComplete.withAbstract} have abstracts)`;
  const progressText = getString("findDOI.progress.processing") || initialText;  const icon = "chrome://zotero/skin/16/universal/book.svg";
  progressWin.addLines(progressText, icon);
  
  progressWin.show();
  
  let foundDOIs = 0;
  let foundAbstracts = 0;
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
      // First, try to find DOI if missing
      let doi = item.getField('DOI');
      if (!doi || doi.trim() === '' || doi.trim() === '-') {
        doi = await findDOIForItem(item);
        if (doi) {
          item.setField('DOI', doi);
          await item.saveTx();
          foundDOIs++;
        }
      } else {
        // Item already has DOI, just get it for abstract finding
        doi = doi.trim();
      }
      
      // Now try to find abstract if we have a DOI
      if (doi) {
        const abstract = await findAbstractForItem(item, doi);
        if (abstract) {
          item.setField('abstractNote', abstract);
          await item.saveTx();
          foundAbstracts++;
        }
      }
    } catch (error) {
      Zotero.debug(`DOI Finder: Error processing item ${item.id}: ${error}`);
    }

    await Zotero.Promise.delay(300);
  }
  
  progressWin.close();
  
  return { foundDOIs, foundAbstracts, total };
}

async function findDOIs(): Promise<void> {
  const ZP = Zotero.getActiveZoteroPane();
  
  // First check if items are selected
  let items: any[] = ZP.getSelectedItems();
  
  // If no items selected, process the collection or library
  if (items.length === 0) {
    const collection = ZP.getSelectedCollection();
    const libraryID = collection ? collection.libraryID : ZP.getSelectedLibraryID();
    
    if (collection) {
      items = collection.getChildItems();
    } else {
      items = await Zotero.Items.getAll(libraryID);
    }
  }

  Zotero.debug(`DOI Finder: Processing ${items.length} total items`);


  // Count items with DOIs and abstracts before filtering
  let totalRegularItems = 0;
  let itemsWithDOI = 0;
  let itemsWithAbstract = 0;
  
  items.forEach((item: any) => {
    if (item.isRegularItem()) {
      totalRegularItems++;
      const doi = item.getField("DOI");
      const abstract = item.getField("abstractNote");
      
      if (doi && doi.trim() !== "" && doi.trim() !== "-") {
        itemsWithDOI++;
      }
      if (abstract && abstract.trim() !== "") {
        itemsWithAbstract++;
      }
    }
  });
  const itemsToProcess = items.filter((item: any) => {
    if (!item.isRegularItem()) return false;
    
    const doi = item.getField('DOI');
    const abstract = item.getField('abstractNote');
    
    const needsDOI = !doi || doi.trim() === '' || doi.trim() === '-';
    const needsAbstract = !abstract || abstract.trim() === '';
    
    const shouldProcess = needsDOI || needsAbstract;
    
    Zotero.debug(`DOI Finder: Item ${item.id} - DOI: "${doi}", Abstract: "${abstract ? 'exists' : 'missing'}", needs processing: ${shouldProcess}`);
    return shouldProcess;
  });

  Zotero.debug(`DOI Finder: Found ${itemsToProcess.length} items that need DOIs or abstracts`);

  if (itemsToProcess.length === 0) {
    Services.prompt.alert(null, getString("findDOI.noneFound") || "Complete", "All selected items already have DOI numbers and abstracts.");
    return;
  }

  const result = await processItems(itemsToProcess, {
    withDOI: itemsWithDOI,
    withAbstract: itemsWithAbstract,
    totalRegular: totalRegularItems
  });

  // Create a more detailed completion message
  let message = `Found ${result.foundDOIs} new DOIs and ${result.foundAbstracts} abstracts for ${result.total} items processed.`;
  
  if (result.foundDOIs === 0 && result.foundAbstracts === 0) {
    message = "No new DOIs or abstracts were found.";
  } else if (result.foundDOIs === 0) {
    message = `Found ${result.foundAbstracts} new abstracts. No new DOIs were found.`;
  } else if (result.foundAbstracts === 0) {
    message = `Found ${result.foundDOIs} new DOIs. No abstracts were found.`;
  }

  Services.prompt.alert(
    null, 
    getString("findDOI.title") || "DOI and Abstract Finder",
    message
  );
}

export default {};
