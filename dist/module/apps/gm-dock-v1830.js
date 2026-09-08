import { normalizeActorRole } from "../../domain/adversaries/index.js";

const SYSTEM_ID = "genesys-vtt";
const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
let gmDockApp = null;

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
      actors,
      pcs,
      recentActors: actors.slice(0, 8),
      encounter: encounterSummary(),
      advancementReady: Boolean(game?.genesysAdvancement),
      storyPointFoundationReady: Boolean(game?.genesysVtt?.storyPoints),
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

function installActorDirectoryButton(app, html) {
  if (!requireGm({ notify: false })) return;
  const root = html instanceof HTMLElement ? html : html?.[0] ?? app?.element;
  if (!root?.querySelector || root.querySelector("[data-open-genesys-gm-dock]")) return;
  const header = root.querySelector(".directory-header .header-actions") ?? root.querySelector(".directory-header");
  if (!header) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "genesys-gm-dock-directory-button";
  button.dataset.openGenesysGmDock = "true";
  button.innerHTML = '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i> GM Dock';
  button.addEventListener("click", (event) => {
    event.preventDefault();
    openGmDock();
  });
  header.prepend(button);
}

function refreshOpenDock() {
  if (gmDockApp?.rendered) void gmDockApp.render({ force: true });
}

Hooks.on("renderActorDirectory", installActorDirectoryButton);
Hooks.on("updateActor", refreshOpenDock);
Hooks.on("createActor", refreshOpenDock);
Hooks.on("deleteActor", refreshOpenDock);
Hooks.on("updateScene", refreshOpenDock);
Hooks.on("updateUser", refreshOpenDock);

Hooks.once("ready", () => {
  const api = Object.freeze({ open: openGmDock, get: getGmDock });
  Object.defineProperty(game, "genesysGmDock", { configurable: true, value: api });
  console.log(`${SYSTEM_ID} | GM Dock shell ready`);
});
