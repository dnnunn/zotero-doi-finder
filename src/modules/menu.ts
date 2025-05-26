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
  Zotero.DOIFinder.findDOIsForSelected = async () => {
    const ZP = Zotero.getActiveZoteroPane();
    const items = ZP.getSelectedItems();
    const itemsWithoutDOI = items.filter(
      (item: any) => {
        const doi = item.getField('DOI');
        return item.isRegularItem() && (!doi || doi.trim() === '' || doi.trim() === '-');
      }
    );
    
    if (itemsWithoutDOI.length === 0) {
      Services.prompt.alert(null, getString("findDOI.noneSelected"), getString("findDOI.allHaveDOI"));
      return;
    }
    
    const result = await Zotero.DOIFinder.processItems(itemsWithoutDOI);
    
    Services.prompt.alert(
      null,
      getString("findDOI.title"),
      getString("findDOI.complete", result)
    );
  };
}
