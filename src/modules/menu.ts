import { config } from "../../package.json";
import { getString } from "../utils/locale";

declare const Zotero: any;
declare const Services: any;

export function registerMenus() {
  const doc = Zotero.getMainWindow().document;
  
  // Tools menu
  const toolsMenu = doc.getElementById("menu_ToolsPopup");
  if (toolsMenu) {
    const menuitem = doc.createXULElement("menuitem");
    menuitem.id = `${config.addonRef}-tools-menu`;
    menuitem.setAttribute("label", getString("menu.findDOILibrary"));
    menuitem.setAttribute("oncommand", "Zotero.DOIFinder.findDOIs();");
    toolsMenu.appendChild(menuitem);
  }
  
  // Right-click menu for items
  const itemMenu = doc.getElementById("zotero-itemmenu");
  if (itemMenu) {
    const menuitem = doc.createXULElement("menuitem");
    menuitem.id = `${config.addonRef}-item-menu`;
    menuitem.setAttribute("label", getString("menu.findDOI"));
    menuitem.setAttribute("oncommand", "Zotero.DOIFinder.findDOIsForSelected();");
    itemMenu.appendChild(menuitem);
  }
  
  // Export function for selected items
  // Export function for selected items
  Zotero.DOIFinder.findDOIsForSelected = async () => {
    const ZP = Zotero.getActiveZoteroPane();
    const items = ZP.getSelectedItems();
    
    // Use the same filtering logic as main function
    const itemsToProcess = items.filter((item: any) => {
      if (!item.isRegularItem()) return false;
      
      const doi = item.getField('DOI');
      const abstract = item.getField('abstractNote');
      
      const needsDOI = !doi || doi.trim() === '' || doi.trim() === '-';
      const needsAbstract = !abstract || abstract.trim() === '';
      
      return needsDOI || needsAbstract;
    });
    
    if (itemsToProcess.length === 0) {
      Services.prompt.alert(null, getString("findDOI.noneSelected") || "Complete", "All selected items already have DOI numbers and abstracts.");
      return;
    }
    
    const result = await Zotero.DOIFinder.processItems(itemsToProcess);
    
    // Use the same detailed message as main function
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
  };
}
