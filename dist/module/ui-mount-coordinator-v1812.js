// Explicit Genesys-only adapter. Never replace the browser's MutationObserver.
// Existing enhancers remain ordered and synchronous. Their own DOM writes are
// performed with observation disconnected, so they cannot feed back forever.
const clients = new Set();
let scheduled = false;
let running = false;
const native = new MutationObserver(() => schedule());

function connect() {
  if (clients.size && document.body) native.observe(document.body, { childList: true, subtree: true });
}

function schedule() {
  if (scheduled || running) return;
  scheduled = true;
  requestAnimationFrame(flush);
}

function flush() {
  scheduled = false;
  running = true;
  native.disconnect();
  try {
    // A second bounded pass supports enhancers whose host is built by a later
    // registered enhancer (e.g. equipment toolbar and biography controls).
    for (let pass = 0; pass < 2; pass++) {
      for (const client of [...clients]) {
        if (!clients.has(client)) continue;
        try { client.callback([], client); }
        catch (error) { console.error("genesys-vtt | UI enhancer failed", error); }
      }
    }
  } finally {
    running = false;
    connect();
  }
}

export class GenesysUiObserver {
  constructor(callback) { this.callback = callback; }
  observe(target, options) {
    if (target !== document.body || !options?.childList || !options?.subtree) {
      throw new Error("GenesysUiObserver only supports body child-list enhancement");
    }
    clients.add(this);
    if (!running) connect();
    schedule();
  }
  disconnect() {
    clients.delete(this);
    if (!clients.size) native.disconnect();
  }
  takeRecords() { return []; }
}
