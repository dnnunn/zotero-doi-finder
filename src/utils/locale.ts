declare const Zotero: any;
declare const Services: any;

export function getString(key: string, substitutions?: any): string {
  // Use hardcoded strings for simplicity
  const strings: { [key: string]: string } = {
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
  
  if (substitutions && typeof substitutions === 'object') {
    Object.entries(substitutions).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, String(v));
    });
  }
  
  return str;
}
