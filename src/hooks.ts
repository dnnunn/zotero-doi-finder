declare const ztoolkit: any;

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  // Plugin is initialized directly in index.ts
}

async function onShutdown() {
  ztoolkit.unregisterAll();
}

async function onMainWindowLoad(_win: Window) {
  // Main window setup is done in index.ts
}

async function onMainWindowUnload(_win: Window) {
  ztoolkit.unregisterAll();
}

async function onDialogEvents(type: string) {
  if (type === "findDOIs" && Zotero.DOIFinder?.findDOIs) {
    Zotero.DOIFinder.findDOIs();
  }
}

async function onShortcut(type: string) {
  if (type === "doi" && Zotero.DOIFinder?.findDOIs) {
    Zotero.DOIFinder.findDOIs();
  }
}

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onDialogEvents,
  onShortcut,
};
