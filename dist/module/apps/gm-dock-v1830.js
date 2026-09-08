import { normalizeActorRole } from "../../domain/adversaries/index.js";

const SYSTEM_ID = "genesys-vtt";
const LAUNCHER_POSITION_SETTING = "gmDockLauncherPosition";
const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
let gmDockApp = null;
let gmDockLauncher = null;
let storyPointActionPending = false;

function integer(value, fallback = 0) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : fallback;
}

function requireGm({ notify = true } = {}) {
  const allowed = Boolean(game?.user?.isGM);
  if (!allowed && notify) ui?.notifications?.warn?.("GM Dock is available to the GM only.");
  return allowed;
}

function characterActors() {
  return Array.from(game?.actors?.contents ?? game?.actors ?? []).filter((actor) => actor?.type === "character");
}

function actorXp(actor) {
  const snapshot = game?.genesysAdvancement?.snapshot?.(actor)?.xp ?? actor?.system?.xp ?? {};
  const starting = integer(snapshot.starting);
  const earned = integer(snapshot.earned);
  const spent = integer(snapshot.spent);
  return {
    starting,
    earned,
    spent,
    available: integer(snapshot.available, Math.max(0, starting + earned - spent))
  };
}

function actorSummary(actor) {
  const role = normalizeActorRole(actor?.system?.role ?? (actor?.hasPlayerOwner ? "pc" : "rival"));
  const xp = actorXp(actor);
  return {
    id: String(actor?.id ?? ""),
    name: String(actor?.name ?? "Unnamed Actor"),
    img: String(actor?.img ?? "icons/svg/mystery-man.svg"),
    role,
    roleLabel: role === "pc" ? "Player Character" : role.charAt(0).toUpperCase() + role.slice(1),
    isPc: role === "pc",
    xp
  };
}

function encounterSummary() {
  const state = game?.genesysVtt?.initiative?.sceneState?.() ?? {};
  const status = String(state.status ?? "collecting");
  const mode = String(state.mode ?? "side-slots");
  return {
    status,
    statusLabel: status === "active" ? "Active" : status === "ended" ? "Ended" : "Preparing",
    active: status === "active",
    mode,
    modeLabel: mode === "popcorn" ? "Popcorn Initiative" : "Core Side Slots",
    round: integer(state.round, 1),
    participantCount: Array.from(state.entries ?? []).length,
    activeActorLabel: String(state.activeActorLabel ?? "Awaiting claim")
  };
}

function connectedUsers() {
  return Array.from(game?.users ?? []).filter((user) => user?.active).length;
}

async function renderDirectory(app) {
  if (!app?.render) return false;
  try {
    await app.render({ force: true });
  } catch {
    await app.render(true);
  }
  return true;
}

export class GenesysGmDock extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "genesys-gm-dock",
    classes: ["genesys-vtt", "genesys-gm-dock"],
    position: { width: 1040, height: 760 },
    window: { title: "Genesys GM Dock", resizable: true },
    actions: {
      openEncounter: this.#openEncounter,
      openActors: this.#openActors,
      openCharacterCreator: this.#openCharacterCreator,
      openActor: this.#openActor,
      spendStoryPoint: this.#spendStoryPoint,
      adjustStoryPoint: this.#adjustStoryPoint,
      refresh: this.#refresh,
      unavailable: this.#unavailable
    }
  };

  static PARTS = {
    main: { template: "systems/genesys-vtt/templates/gm/gm-dock-v1830.hbs" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    if (!requireGm({ notify: false })) return { ...context, unauthorized: true };

    const actors = characterActors().map(actorSummary).sort((a, b) => a.name.localeCompare(b.name));
    const pcs = actors.filter((actor) => actor.isPc);
    const npcs = actors.filter((actor) => !actor.isPc);
    const totalAvailableXp = pcs.reduce((sum, actor) => sum + actor.xp.available, 0);
    const storyPoints = game?.genesysStoryPoints?.snapshot?.() ?? { player: 0, gm: 0, revision: 0, history: [] };

    return {
      ...context,
      unauthorized: false,
      systemVersion: String(game?.system?.version ?? "0.0.1830"),
      worldName: String(game?.world?.title ?? "Current World"),
      sceneName: String(canvas?.scene?.name ?? "No active Scene"),
      connectedUserCount: connectedUsers(),
      actorCount: actors.length,
      pcCount: pcs.length,
      npcCount: npcs.length,
      totalAvailableXp,
      storyPoints,
      storyPointHistory: Array.from(storyPoints.history ?? []).slice(0, 8).map((entry) => ({
        ...entry,
        timeLabel: entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"
      })),
      actors,
      pcs,
      recentActors: actors.slice(0, 8),
      encounter: encounterSummary(),
      advancementReady: Boolean(game?.genesysAdvancement),
      storyPointFoundationReady: Boolean(game?.genesysStoryPoints),
      characterCreatorReady: Boolean(game?.genesysCharacterCreator),
      encounterReady: Boolean(game?.genesysVtt?.encounter?.open)
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (context.unauthorized) {
      ui?.notifications?.warn?.("GM Dock is available to the GM only.");
      void this.close();
    }
  }

  _onClose(options) {
    if (gmDockApp === this) gmDockApp = null;
    return super._onClose(options);
  }

  static async #openEncounter() {
    if (!requireGm()) return;
    const open = game?.genesysVtt?.encounter?.open;
    if (!open) return ui?.notifications?.warn?.("Encounter Tracker is not ready.");
    open();
  }

  static async #openActors() {
    if (!requireGm()) return;
    if (!(await renderDirectory(ui?.actors))) ui?.notifications?.warn?.("Actors Directory is not available.");
  }

  static async #openCharacterCreator() {
    if (!requireGm()) return;
    const open = game?.genesysCharacterCreator?.open;
    if (!open) return ui?.notifications?.warn?.("Character Creator is not ready.");
    open();
  }

  static async #openActor(_event, target) {
    if (!requireGm()) return;
    const actorId = String(target?.closest?.("[data-actor-id]")?.dataset.actorId ?? "");
    const actor = game?.actors?.get?.(actorId);
    if (!actor) return ui?.notifications?.warn?.("That Actor is no longer available.");
    actor.sheet?.render?.(true);
  }

  static async #spendStoryPoint(_event, target) {
    if (!requireGm() || storyPointActionPending) return;
    const side = target?.dataset?.side === "gm" ? "gm" : "player";
    storyPointActionPending = true;
    try {
      await game?.genesysStoryPoints?.spend?.(side);
    } catch (error) {
      ui?.notifications?.warn?.(error?.message ?? "Story Point transfer failed.");
    } finally {
      storyPointActionPending = false;
      if (gmDockApp?.rendered) await gmDockApp.render({ force: true });
    }
  }

  static async #adjustStoryPoint(_event, target) {
    if (!requireGm() || storyPointActionPending) return;
    const side = target?.dataset?.side === "gm" ? "gm" : "player";
    const delta = Number(target?.dataset?.delta ?? 0);
    storyPointActionPending = true;
    try {
      await game?.genesysStoryPoints?.adjust?.(side, delta);
    } catch (error) {
      ui?.notifications?.warn?.(error?.message ?? "Story Point adjustment failed.");
    } finally {
      storyPointActionPending = false;
      if (gmDockApp?.rendered) await gmDockApp.render({ force: true });
    }
  }

  static async #refresh() {
    if (!requireGm()) return;
    if (gmDockApp?.rendered) await gmDockApp.render({ force: true });
  }

  static async #unavailable(_event, target) {
    if (!requireGm()) return;
    const feature = String(target?.dataset?.feature ?? "This feature");
    ui?.notifications?.info?.(`${feature} is scheduled for a later GM Dock QA gate.`);
  }
}

export function openGmDock() {
  if (!requireGm()) return null;
  if (!gmDockApp) gmDockApp = new GenesysGmDock();
  void gmDockApp.render({ force: true });
  return gmDockApp;
}

export function getGmDock() {
  return gmDockApp;
}

function clampLauncherPosition(position, launcher = gmDockLauncher) {
  const width = launcher?.offsetWidth || 112;
  const height = launcher?.offsetHeight || 34;
  return {
    left: Math.max(8, Math.min(integer(position?.left, 12), Math.max(8, window.innerWidth - width - 8))),
    top: Math.max(8, Math.min(integer(position?.top, 520), Math.max(8, window.innerHeight - height - 8)))
  };
}

function applyLauncherPosition(position) {
  if (!gmDockLauncher) return;
  const next = clampLauncherPosition(position);
  gmDockLauncher.style.left = `${next.left}px`;
  gmDockLauncher.style.top = `${next.top}px`;
}

async function saveLauncherPosition() {
  if (!gmDockLauncher) return;
  const position = clampLauncherPosition({
    left: Number.parseFloat(gmDockLauncher.style.left),
    top: Number.parseFloat(gmDockLauncher.style.top)
  });
  applyLauncherPosition(position);
  await game.settings.set(SYSTEM_ID, LAUNCHER_POSITION_SETTING, position);
}

function installGmDockLauncher() {
  if (!requireGm({ notify: false }) || gmDockLauncher?.isConnected) return;
  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "genesys-gm-dock-launcher-v1831";
  launcher.title = "Open Genesys GM Dock · drag to move";
  launcher.setAttribute("aria-label", "Open Genesys GM Dock. Drag to move.");
  launcher.innerHTML = '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i><span>GM Dock</span><i class="fa-solid fa-grip-lines" aria-hidden="true"></i>';
  document.body.append(launcher);
  gmDockLauncher = launcher;
  applyLauncherPosition(game.settings.get(SYSTEM_ID, LAUNCHER_POSITION_SETTING));

  let drag = null;
  let dragFrame = 0;
  const paintDrag = () => {
    dragFrame = 0;
    if (!drag) return;
    launcher.style.transform = `translate3d(${drag.dx}px, ${drag.dy}px, 0)`;
  };
  launcher.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: Number.parseFloat(launcher.style.left) || 12, top: Number.parseFloat(launcher.style.top) || 520, dx: 0, dy: 0, moved: false };
    launcher.setPointerCapture?.(event.pointerId);
    launcher.classList.add("is-dragging");
  });
  launcher.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    const next = clampLauncherPosition({ left: drag.left + dx, top: drag.top + dy });
    drag.dx = next.left - drag.left;
    drag.dy = next.top - drag.top;
    if (!dragFrame) dragFrame = requestAnimationFrame(paintDrag);
    event.preventDefault();
  });
  launcher.addEventListener("pointerup", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const moved = drag.moved;
    const position = { left: drag.left + drag.dx, top: drag.top + drag.dy };
    if (dragFrame) cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    drag = null;
    launcher.style.transform = "none";
    applyLauncherPosition(position);
    launcher.classList.remove("is-dragging");
    launcher.releasePointerCapture?.(event.pointerId);
    if (moved) void saveLauncherPosition();
    else openGmDock();
  });
  launcher.addEventListener("pointercancel", () => {
    if (dragFrame) cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    drag = null;
    launcher.style.transform = "none";
    launcher.classList.remove("is-dragging");
    void saveLauncherPosition();
  });
}

function refreshOpenDock() {
  if (gmDockApp?.rendered) void gmDockApp.render({ force: true });
}

Hooks.on("updateActor", refreshOpenDock);
Hooks.on("createActor", refreshOpenDock);
Hooks.on("deleteActor", refreshOpenDock);
Hooks.on("updateScene", refreshOpenDock);
Hooks.on("updateUser", refreshOpenDock);
Hooks.on("genesysStoryPointsChanged", refreshOpenDock);

Hooks.once("init", () => {
  game.settings.register(SYSTEM_ID, LAUNCHER_POSITION_SETTING, {
    name: "GM Dock Launcher Position",
    scope: "client",
    config: false,
    type: Object,
    default: { left: 12, top: 520 }
  });
});

Hooks.once("ready", () => {
  const api = Object.freeze({ open: openGmDock, get: getGmDock });
  Object.defineProperty(game, "genesysGmDock", { configurable: true, value: api });
  installGmDockLauncher();
  window.addEventListener("resize", () => applyLauncherPosition(game.settings.get(SYSTEM_ID, LAUNCHER_POSITION_SETTING)));
  console.log(`${SYSTEM_ID} | GM Dock shell ready`);
});
