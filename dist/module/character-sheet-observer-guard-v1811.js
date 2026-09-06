const SYSTEM_ID = "genesys-vtt";
const VERSION = "0.0.1811";

const NativeMutationObserver = globalThis.MutationObserver;

const GUARDED_MODULES = Object.freeze([
  "character-sheet-v15-controller.js",
  "character-sheet-window-polish.js",
  "character-sheet-biography-layout.js",
  "character-sheet-header-resources.js",
  "character-sheet-release-cleanup.js",
  "character-sheet-actions-tab.js",
  "character-sheet-tab-state.js",
  "character-sheet-advancement-ui.js",
  "equipment-toolbar-v1777.js",
  "magic-effect-ui-v1810.js"
]);

function isGenesysSheetNode(node) {
  if (!(node instanceof Element)) return false;
  if (node.matches?.("[data-genesys-sheet-tabs]")) return true;
  return Boolean(node.querySelector?.("[data-genesys-sheet-tabs]"));
}

function recordsContainSheetMount(records = []) {
  for (const record of records) {
    for (const node of record.addedNodes ?? []) {
      if (isGenesysSheetNode(node)) return true;
    }
  }
  return false;
}

function guardedModuleFromStack(stack = "") {
  return GUARDED_MODULES.find((name) => stack.includes(name)) ?? "";
}

if (typeof NativeMutationObserver === "function" && !globalThis.__genesysSheetObserverGuardV1811) {
  globalThis.__genesysSheetObserverGuardV1811 = true;

  class GenesysAwareMutationObserver {
    #native;
    #moduleName;
    #callback;
    #bodySheetOnly = false;
    #scheduled = false;
    #pendingRecords = [];

    constructor(callback) {
      const stack = new Error().stack ?? "";
      this.#moduleName = guardedModuleFromStack(stack);
      this.#callback = callback;
      this.#native = new NativeMutationObserver((records, observer) => {
        if (!this.#moduleName) {
          callback(records, observer);
          return;
        }

        if (this.#bodySheetOnly && !recordsContainSheetMount(records)) return;

        this.#pendingRecords.push(...records);
        if (this.#scheduled) return;
        this.#scheduled = true;

        queueMicrotask(() => {
          this.#scheduled = false;
          const pending = this.#pendingRecords.splice(0);
          const started = performance.now();
          try {
            this.#callback(pending, this);
          }
          finally {
            const elapsed = performance.now() - started;
            if (elapsed > 50) {
              console.debug(`${SYSTEM_ID} | ${VERSION} observer ${this.#moduleName} took ${elapsed.toFixed(1)}ms`);
            }
          }
        });
      });
    }

    observe(target, options) {
      this.#bodySheetOnly = Boolean(
        this.#moduleName
        && target === document.body
        && options?.childList
        && options?.subtree
      );
      return this.#native.observe(target, options);
    }

    disconnect() {
      this.#pendingRecords.length = 0;
      this.#scheduled = false;
      return this.#native.disconnect();
    }

    takeRecords() {
      return this.#native.takeRecords();
    }
  }

  globalThis.MutationObserver = GenesysAwareMutationObserver;
  console.log(`${SYSTEM_ID} | ${VERSION} Character Sheet observer guard installed`);
}
