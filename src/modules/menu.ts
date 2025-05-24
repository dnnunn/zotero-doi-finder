import { config } from "../../package.json";
import { getString } from "../utils/locale";

declare const Zotero: any;
declare const ZoteroPane: any;

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
  Zotero.DOIFinder.findDOIsForSelected = async () => {
    const items = ZoteroPane.getSelectedItems();
    const itemsWithoutDOI = items.filter(
      (item: any) => item.isRegularItem() && !item.getField('DOI')
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
          item.setField('DOI', doi);
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
