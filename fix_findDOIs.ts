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
