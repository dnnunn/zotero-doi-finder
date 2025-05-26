export function getString(key: string, params?: any): string {
  const strings: { [key: string]: string } = {
    "toolbar.label": "Find DOIs and Abstracts",
    "toolbar.tooltip": "Find missing DOIs and abstracts for items in the current view",
    "menu.findDOI": "Find DOI and Abstract",
    "menu.findDOILibrary": "Find DOIs and Abstracts in Library",
    "findDOI.title": "DOI and Abstract Finder",
    "findDOI.noneFound": "No items without DOIs or abstracts",
    "findDOI.noneSelected": "No items selected",
    "findDOI.allHaveDOI": "All selected items already have DOI numbers and abstracts",
    "findDOI.complete": "Found ${foundDOIs} DOIs and ${foundAbstracts} abstracts out of ${total} items",
    "findDOI.progress.title": "Finding DOIs and Abstracts",
    "findDOI.progress.processing": "Processing items...",
    "findDOI.progress.item": "Processing item ${current} of ${total} (${percent}%)"
  };
  
  let str = strings[key] || key;
  
  if (params) {
    for (const param in params) {
      str = str.replace(`\${${param}}`, params[param]);
    }
  }
  
  return str;
}
