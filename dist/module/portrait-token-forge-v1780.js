const SYSTEM_ID = "genesys-vtt";
const FORGE_VERSION = "0.0.1781";
const ART_ROOT = () => `worlds/${game.world.id}/genesys-vtt`;
const ART_DIR = () => `${ART_ROOT()}/actor-art`;
const FALLBACK_ART = "systems/genesys-vtt/assets/items/v1775/actor-human.svg";
const syncingActors = new Set();
let activeForge = null;

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function slug(value, fallback = "actor") {
  const out = String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return out || fallback;
}

function actorForRoot(root) {
  const actorId = String(root?.dataset?.actorId ?? "");
  if (actorId && game?.actors?.get?.(actorId)) return game.actors.get(actorId);
  const name = String(root?.dataset?.actorName ?? "").trim();
  const actor = Array.from(game?.actors ?? []).find((entry) => entry?.name === name && (entry?.isOwner || game?.user?.isGM))
    ?? Array.from(globalThis.canvas?.tokens?.placeables ?? []).map((token) => token?.actor).find((entry) => entry?.name === name && (entry?.isOwner || game?.user?.isGM))
    ?? null;
  if (actor && root) root.dataset.actorId = String(actor.id ?? "");
  return actor;
}

function canEditActor(actor) {
  return Boolean(actor && (actor.isOwner || game?.user?.isGM));
}

function tokenPathFromPortrait(path = "") {
  const value = String(path ?? "");
  if (!value.includes("/genesys-vtt/actor-art/")) return "";
  if (/-portrait\.png(?:\?.*)?$/i.test(value)) return value.replace(/-portrait\.png(?:\?.*)?$/i, "-token.png");
  return "";
}

function filePickerImplementation() {
  const picker = globalThis.foundry?.applications?.apps?.FilePicker?.implementation;
  if (!picker?.upload || !picker?.createDirectory) throw new Error("Foundry FilePicker implementation is not available.");
  return picker;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${src}`));
    image.src = src;
  });
}

function drawCover(ctx, image, size, state) {
  const zoom = clamp(state.zoom ?? 1, 1, 5);
  const base = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const scale = base * zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const offsetX = (Number(state.offsetX ?? 0) / 100) * size;
  const offsetY = (Number(state.offsetY ?? 0) / 100) * size;
  ctx.drawImage(image, (size - width) / 2 + offsetX, (size - height) / 2 + offsetY, width, height);
}

function drawPortrait(canvas, image, state) {
  if (!canvas) return;
  const size = canvas.width;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = state.background === "parchment" ? "#d6c39a" : "#0b141a";
  ctx.fillRect(0, 0, size, size);
  drawCover(ctx, image, size, state);
  if (state.frame !== "none") {
    ctx.save();
    const steel = state.frame === "steel";
    ctx.strokeStyle = steel ? "#87949a" : "#d4a84d";
    ctx.lineWidth = 14;
    ctx.strokeRect(8, 8, size - 16, size - 16);
    ctx.strokeStyle = steel ? "#27343a" : "#62461d";
    ctx.lineWidth = 4;
    ctx.strokeRect(22, 22, size - 44, size - 44);
    ctx.restore();
  }
}

function drawToken(canvas, image, state) {
  if (!canvas) return;
  const size = canvas.width;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.43, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = state.background === "parchment" ? "#d6c39a" : "#0b141a";
  ctx.fillRect(0, 0, size, size);
  drawCover(ctx, image, size, state);
  ctx.restore();
  if (state.frame !== "none") {
    const steel = state.frame === "steel";
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.445, 0, Math.PI * 2);
    ctx.strokeStyle = steel ? "#87949a" : "#d4a84d";
    ctx.lineWidth = 18;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.405, 0, Math.PI * 2);
    ctx.strokeStyle = steel ? "#27343a" : "#62461d";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
  }
}

function renderPreviews(session) {
  if (!session?.image) return;
  drawPortrait(session.dialog.querySelector("[data-forge-portrait-canvas]"), session.image, session.state);
  drawToken(session.dialog.querySelector("[data-forge-token-canvas]"), session.image, session.state);
  const zoomLabel = session.dialog.querySelector("[data-forge-zoom-label]");
  if (zoomLabel) zoomLabel.textContent = `${Number(session.state.zoom ?? 1).toFixed(2)}×`;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Canvas export failed.")), "image/png", 0.94));
}

function ignorableDirectoryError(error) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return message.includes("already exists") || message.includes("eexist") || message.includes("exists already");
}

async function ensureDirectory(picker, target) {
  try { await picker.createDirectory("data", target, { notify: false }); }
  catch (error) {
    if (!ignorableDirectoryError(error)) throw error;
  }
}

async function ensureArtDirectory() {
  const picker = filePickerImplementation();
  await ensureDirectory(picker, ART_ROOT());
  await ensureDirectory(picker, ART_DIR());
  return picker;
}

function validUploadedImagePath(value) {
  const path = String(value ?? "").trim();
  return /\.(?:png|webp|jpe?g)(?:[?#].*)?$/i.test(path) ? path : "";
}

async function uploadBlob(blob, filename) {
  const picker = await ensureArtDirectory();
  const file = new File([blob], filename, { type: "image/png" });
  const result = await picker.upload("data", ART_DIR(), file, {}, { notify: false });
  const path = validUploadedImagePath(typeof result === "string" ? result : result?.path);
  if (!path) throw new Error(`Foundry did not return a valid image path for ${filename}.`);
  return path;
}

async function exportForgeArt(session) {
  if (!session.image) throw new Error("Choose an image first.");
  const portraitCanvas = session.dialog.querySelector("[data-forge-portrait-canvas]");
  const tokenCanvas = session.dialog.querySelector("[data-forge-token-canvas]");
  const [portraitBlob, tokenBlob] = await Promise.all([canvasBlob(portraitCanvas), canvasBlob(tokenCanvas)]);
  const actorName = session.actor?.name || session.wizardName || "actor";
  const identity = session.actor?.id || foundry?.utils?.randomID?.(8) || Math.random().toString(36).slice(2, 10);
  const stem = `${slug(actorName)}-${slug(identity, "actor")}-${Date.now()}`;
  const portraitPath = await uploadBlob(portraitBlob, `${stem}-portrait.png`);
  const tokenPath = await uploadBlob(tokenBlob, `${stem}-token.png`);
  return { portraitPath, tokenPath };
}

async function updatePlacedTokens(actor, tokenPath) {
  const active = actor?.getActiveTokens?.(true, true) ?? [];
  for (const token of active) {
    const document = token?.document ?? token;
    if (document?.update) await document.update({ "texture.src": tokenPath });
  }
}

async function applyForge(session) {
  if (session.actor && !canEditActor(session.actor)) throw new Error("You do not have permission to edit this Actor.");
  const { portraitPath, tokenPath } = await exportForgeArt(session);
  if (session.actor) {
    await session.actor.update({ img: portraitPath, "prototypeToken.texture.src": tokenPath });
    if (session.dialog.querySelector("[data-forge-update-placed]")?.checked) await updatePlacedTokens(session.actor, tokenPath);
    ui?.notifications?.info?.(`${session.actor.name}: portrait and prototype token updated.`);
  }
  if (session.wizardInput) {
    session.wizardInput.value = portraitPath;
    session.wizardInput.dataset.genesysForgeTokenPath = tokenPath;
    session.wizardInput.dispatchEvent(new Event("input", { bubbles: true }));
    session.wizardInput.dispatchEvent(new Event("change", { bubbles: true }));
    const preview = session.wizardInput.closest(".genesys-creator-panel")?.querySelector("[data-wizard-forge-preview]");
    if (preview) preview.src = portraitPath;
    ui?.notifications?.info?.("Actor Art added to the Character Creator draft.");
  }
  session.dialog.close();
  return { portraitPath, tokenPath };
}

function forgeMarkup(session) {
  const title = session.actor?.name || session.wizardName || "Actor";
  return `<div class="genesys-forge-shell">
    <header class="genesys-forge-header"><div><strong>Genesys Portrait &amp; Token Forge</strong><small>${esc(title)} · ${session.actor ? "Actor" : "Create Actor Wizard"}</small></div><button type="button" data-forge-close aria-label="Close">×</button></header>
    <div class="genesys-forge-grid">
      <section class="genesys-forge-source"><h3>Source Image</h3><div class="genesys-forge-dropzone" data-forge-dropzone tabindex="0"><i class="fa-solid fa-image"></i><strong>Drop image here</strong><span>or choose a file from your computer</span><button type="button" data-forge-choose-file>Choose Image</button><input type="file" accept="image/*" data-forge-file hidden /></div><p data-forge-source-label>${esc(session.initialSrc || "No image selected")}</p></section>
      <section class="genesys-forge-preview"><h3>Actor Portrait</h3><canvas width="512" height="512" data-forge-portrait-canvas></canvas><small>Drag to position · Ctrl + mouse wheel to zoom</small></section>
      <section class="genesys-forge-preview"><h3>Prototype Token</h3><canvas width="512" height="512" data-forge-token-canvas></canvas><small>Drag to position · Ctrl + mouse wheel to zoom</small></section>
    </div>
    <div class="genesys-forge-controls genesys-forge-controls-v1781">
      <div class="genesys-forge-direct-help"><i class="fa-solid fa-hand"></i><span><strong>Direct Crop</strong> Drag either preview to move the image. Hold <b>Ctrl</b> and use the mouse wheel to zoom. Current zoom: <b data-forge-zoom-label>1.00×</b></span></div>
      <label>Frame <select data-forge-control="frame"><option value="gold">Genesys Gold</option><option value="steel">Dark Steel</option><option value="none">No Frame</option></select></label>
      <label>Background <select data-forge-control="background"><option value="dark">Dark</option><option value="parchment">Parchment</option></select></label>
    </div>
    <footer class="genesys-forge-footer"><div><button type="button" data-forge-reset>Reset Crop</button>${session.actor ? '<label class="genesys-forge-check"><input type="checkbox" data-forge-update-placed /> Update placed tokens</label>' : ""}</div><div><button type="button" data-forge-close>Cancel</button><button type="button" class="genesys-primary-action" data-forge-apply>${session.actor ? "Save & Apply" : "Use in Wizard"}</button></div></footer>
  </div>`;
}

async function setSource(session, src, label = "") {
  if (!src) return;
  try {
    const image = await loadImage(src);
    session.image = image;
    session.sourceSrc = src;
    const sourceLabel = session.dialog.querySelector("[data-forge-source-label]");
    if (sourceLabel) sourceLabel.textContent = label || src;
    renderPreviews(session);
  }
  catch (error) {
    console.error(`${SYSTEM_ID} | Forge image load failed`, error);
    ui?.notifications?.error?.("Genesys Forge could not load that image.");
  }
}

function wireCanvasManipulation(session, canvas) {
  if (!canvas) return;
  let drag = null;

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture?.(event.pointerId);
    canvas.classList.add("dragging");
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    session.state.offsetX = clamp((session.state.offsetX ?? 0) + (dx / rect.width) * 100, -100, 100);
    session.state.offsetY = clamp((session.state.offsetY ?? 0) + (dy / rect.height) * 100, -100, 100);
    renderPreviews(session);
  });

  const stopDrag = (event) => {
    if (drag && event.pointerId === drag.id) {
      try { canvas.releasePointerCapture?.(event.pointerId); } catch {}
      drag = null;
      canvas.classList.remove("dragging");
    }
  };
  canvas.addEventListener("pointerup", stopDrag);
  canvas.addEventListener("pointercancel", stopDrag);

  canvas.addEventListener("wheel", (event) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    const factor = Math.exp(-event.deltaY * 0.0018);
    session.state.zoom = clamp((session.state.zoom ?? 1) * factor, 1, 5);
    renderPreviews(session);
  }, { passive: false });
}

function wireForge(session) {
  const dialog = session.dialog;
  const fileInput = dialog.querySelector("[data-forge-file]");
  wireCanvasManipulation(session, dialog.querySelector("[data-forge-portrait-canvas]"));
  wireCanvasManipulation(session, dialog.querySelector("[data-forge-token-canvas]"));

  dialog.addEventListener("click", async (event) => {
    const button = event.target?.closest?.("button");
    if (!button) return;
    if (button.matches("[data-forge-close]")) return dialog.close();
    if (button.matches("[data-forge-choose-file]")) return fileInput?.click();
    if (button.matches("[data-forge-reset]")) {
      Object.assign(session.state, { zoom: 1, offsetX: 0, offsetY: 0 });
      return renderPreviews(session);
    }
    if (button.matches("[data-forge-apply]")) {
      button.disabled = true;
      try { await applyForge(session); }
      catch (error) {
        console.error(`${SYSTEM_ID} | Portrait & Token Forge apply failed`, error);
        ui?.notifications?.error?.(error?.message ?? "Portrait & Token Forge failed.");
        button.disabled = false;
      }
    }
  });

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    setSource(session, URL.createObjectURL(file), file.name);
  });

  const dropzone = dialog.querySelector("[data-forge-dropzone]");
  for (const type of ["dragenter", "dragover"]) dropzone?.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.add("dragover"); });
  for (const type of ["dragleave", "drop"]) dropzone?.addEventListener(type, (event) => { event.preventDefault(); dropzone.classList.remove("dragover"); });
  dropzone?.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file?.type?.startsWith("image/")) setSource(session, URL.createObjectURL(file), file.name);
  });

  dialog.addEventListener("input", (event) => {
    const control = event.target?.closest?.("[data-forge-control]");
    if (!control) return;
    session.state[control.dataset.forgeControl] = control.value;
    renderPreviews(session);
  });

  dialog.addEventListener("close", () => { if (activeForge === session) activeForge = null; dialog.remove(); });
}

export function openPortraitTokenForge({ actor = null, wizardInput = null, wizardName = "", initialSrc = "" } = {}) {
  if (activeForge?.dialog?.open) activeForge.dialog.close();
  const dialog = document.createElement("dialog");
  dialog.className = "genesys-portrait-token-forge";
  const session = {
    actor,
    wizardInput,
    wizardName,
    initialSrc: initialSrc || actor?.img || wizardInput?.value || FALLBACK_ART,
    sourceSrc: "",
    image: null,
    dialog,
    state: { zoom: 1, offsetX: 0, offsetY: 0, frame: "gold", background: "dark" }
  };
  dialog.innerHTML = forgeMarkup(session);
  document.body.append(dialog);
  wireForge(session);
  dialog.showModal();
  activeForge = session;
  setSource(session, session.initialSrc, session.initialSrc);
  return session;
}

function ensureActorForgeButtons() {
  for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]")) {
    const frame = root.querySelector(".genesys-portrait-frame");
    if (!frame || frame.querySelector("[data-open-actor-art-forge]")) continue;
    const actor = actorForRoot(root);
    if (!canEditActor(actor)) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "genesys-portrait-forge-button";
    button.dataset.openActorArtForge = "true";
    button.title = "Portrait & Token Forge";
    button.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i><span>Forge</span>';
    frame.append(button);
  }
}

function ensureWizardForge() {
  for (const dialog of document.querySelectorAll(".genesys-character-creator")) {
    const portraitInput = dialog.querySelector("input[data-creator-field='identity.portrait']");
    if (!portraitInput) continue;
    const panel = portraitInput.closest(".genesys-creator-panel");
    if (!panel || panel.querySelector("[data-wizard-art-forge]")) continue;
    const block = document.createElement("div");
    block.className = "genesys-wizard-art-forge";
    block.dataset.wizardArtForge = "true";
    const src = portraitInput.value || FALLBACK_ART;
    block.innerHTML = `<img src="${esc(src)}" alt="Actor Art" data-wizard-forge-preview /><div><strong>Actor Art</strong><span>Build both the portrait and Prototype Token from one image.</span><button type="button" data-open-wizard-art-forge><i class="fa-solid fa-wand-magic-sparkles"></i> Open Portrait &amp; Token Forge</button></div>`;
    portraitInput.closest("label")?.insertAdjacentElement("afterend", block);
  }
}

function initializeEntrypoints() {
  ensureActorForgeButtons();
  ensureWizardForge();
}

async function syncPrototypeFromForgePortrait(actor) {
  if (!actor || syncingActors.has(actor.id)) return;
  const tokenPath = tokenPathFromPortrait(actor.img);
  if (!tokenPath || String(actor.prototypeToken?.texture?.src ?? "") === tokenPath) return;
  syncingActors.add(actor.id);
  try { await actor.update({ "prototypeToken.texture.src": tokenPath }); }
  catch (error) { console.warn(`${SYSTEM_ID} | Could not sync Forge Prototype Token for ${actor.name}`, error); }
  finally { syncingActors.delete(actor.id); }
}

document.addEventListener("click", (event) => {
  const actorButton = event.target?.closest?.("[data-open-actor-art-forge]");
  if (actorButton) {
    event.preventDefault();
    event.stopPropagation();
    const root = actorButton.closest("[data-genesys-sheet-tabs]");
    const actor = actorForRoot(root);
    if (actor) openPortraitTokenForge({ actor });
    return;
  }
  const wizardButton = event.target?.closest?.("[data-open-wizard-art-forge]");
  if (wizardButton) {
    event.preventDefault();
    const dialog = wizardButton.closest(".genesys-character-creator");
    const input = dialog?.querySelector("input[data-creator-field='identity.portrait']");
    const name = dialog?.querySelector("input[data-creator-field='identity.name']")?.value || "Actor";
    if (input) openPortraitTokenForge({ wizardInput: input, wizardName: name, initialSrc: input.value || FALLBACK_ART });
  }
});

Hooks.once("ready", () => {
  Object.defineProperty(game, "genesysPortraitTokenForge", {
    configurable: true,
    value: Object.freeze({ open: openPortraitTokenForge, tokenPathFromPortrait })
  });
  initializeEntrypoints();
  const observer = new MutationObserver(() => initializeEntrypoints());
  observer.observe(document.body, { childList: true, subtree: true });
  for (const actor of Array.from(game?.actors ?? [])) syncPrototypeFromForgePortrait(actor);
  console.log(`${SYSTEM_ID} | ${FORGE_VERSION} Portrait & Token Forge ready for all Actor roles`);
});

Hooks.on("createActor", (actor) => syncPrototypeFromForgePortrait(actor));
Hooks.on("updateActor", (actor, changes) => {
  if (Object.prototype.hasOwnProperty.call(changes ?? {}, "img")) syncPrototypeFromForgePortrait(actor);
});
import { GenesysUiObserver as MutationObserver } from "./ui-mount-coordinator-v1812.js";
