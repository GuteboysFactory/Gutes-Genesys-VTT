const { readFileSync } = require("node:fs");
const assert = require("node:assert/strict");
const { chromium } = require(require.resolve("playwright", { paths: [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES] }));

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="root"><span id="value">10</span></div>');
    const source = readFileSync("dist/module/ui-mount-coordinator-v1812.js", "utf8");
    await page.evaluate(async (source) => {
      window.originalObserver = MutationObserver;
      const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
      const { GenesysUiObserver } = await import(url);
      window.count = 0;
      window.client = new GenesysUiObserver(() => {
        window.count++;
        // Deliberately non-idempotent: the old vitals bug must not loop here.
        document.querySelector("#value").textContent = "10";
      });
      client.observe(document.body, { childList: true, subtree: true });
    }, source);
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => count), 2);
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => count), 2, "UI must settle");
    assert.equal(await page.evaluate(() => MutationObserver === originalObserver), true);
    await page.evaluate(() => document.querySelector("#root").append(document.createElement("b")));
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => count), 4, "Later changes still enhance");
    await page.evaluate(() => client.disconnect());
    await page.evaluate(() => document.body.append(document.createElement("i")));
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => count), 4, "Disconnected clients stay stopped");
    console.log("PASS: real Chromium DOM, bounded self-writes, later mounts, disconnect, native observer preserved");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
