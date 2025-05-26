export function getString(key: string, params?: any): string {
  const strings: { [key: string]: string } = {
    "toolbar.label": "Find DOIs",
    "toolbar.tooltip": "Find missing DOIs for items in the current view",
    "menu.findDOI": "Find DOI",
    "menu.findDOILibrary": "Find DOIs in Library",
    "findDOI.title": "DOI Finder",
    "findDOI.noneFound": "No items without DOIs",
    "findDOI.noneSelected": "No items selected",
    "findDOI.allHaveDOI": "All selected items already have DOI numbers",
    "findDOI.complete": "Found ${found} DOIs out of ${total} items",
    "findDOI.progress.title": "Finding DOIs",
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
