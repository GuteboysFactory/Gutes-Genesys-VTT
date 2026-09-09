import {openGmHealth} from '../gm-health.js';
import {heroicDockControls,runHeroicDockControl} from '../heroic-dock-controls-v1861.js';
import { normalizeActorRole } from "../../domain/adversaries/index.js";

const SYSTEM_ID = "genesys-vtt";
const LAUNCHER_POSITION_SETTING = "gmDockLauncherPosition";
const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
let gmDockApp = null;
let gmDockLauncher = null;
let storyPointActionPending = false;
let partyXpActionPending = false;
let encounterAddPending = false;
let recoveryPending = false;

function integer(value, fallback = 0) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : fallback;
}

function escapeHtml(value) {
  const node = document.createElement("div");
  node.textContent = String(value ?? "");
  return node.innerHTML;
}

function requireGm({ notify = true } = {}) {
  const allowed = Boolean(game?.user?.isGM);
  if (!allowed && notify) ui?.notifications?.warn?.("GM Dock is available to the GM only.");
  return allowed;
}

function requireDockWriter() {
  if (!requireGm()) return false;
  if (game.users?.activeGM?.id === game.user.id) return true;
  ui.notifications.warn("Shared controls are managed by the active GM.");
  return false;
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

export function encounterSummary() {
  const state = game?.genesysVtt?.initiative?.sceneState?.() ?? {};
  const status = String(state.status ?? "collecting");
  const mode = String(state.mode ?? "side-slots");
  const entries = Array.from(state.entries ?? []);
  const activeRefs = new Set(entries.filter(entry => (entry.encounterStatus ?? "active") === "active").map(entry => entry.actorRef));
  const activations = Array.from(state.activationEntitlements ?? []);
  const regular = activations.filter(row => row.kind !== "gm-override" && activeRefs.has(row.actorRef));
  const current = activations.find(row => row.id === state.activeActivationId);
  const labels = { active: "Active", defeated: "Defeated", "out-of-fight": "Out of Fight", dead: "Dead" };
  return {
    status,
    statusLabel: status === "active" ? "Active" : status === "ended" ? "Ended" : "Preparing",
    active: status === "active",
    mode,
    modeLabel: mode === "popcorn" ? "Popcorn Initiative" : "Core Side Slots",
    round: integer(state.round, 1),
    participantCount: entries.length,
    activeCount: activeRefs.size,
    outCount: entries.length - activeRefs.size,
    usedCount: regular.filter(row => row.used).length,
    totalCount: regular.length,
    endRound: status === "active" && state.roundPhase === "end-round",
    activeActorRef: String(state.activeActorRef ?? ""),
    activeActorLabel: String(state.activeActorLabel || "Awaiting claim"),
    activeSourceLabel: current?.sourceLabel ?? "",
    participants: entries.map(entry => ({
      actorRef: entry.actorRef, name: entry.label || "Unnamed participant",
      sideLabel: entry.side === "pc" ? "PC" : "NPC",
      statusLabel: labels[entry.encounterStatus ?? "active"] ?? "Unknown",
      isOut: !activeRefs.has(entry.actorRef),
      isCurrent: state.activeActorRef === entry.actorRef
    }))
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
      openRuleJournal: async function(_event, target){try{await game.genesysJournals.open(target.dataset.book);}catch(e){ui.notifications.error(e.message);}},
      consumables: async function(){try{await game.genesysConsumables.openConsumables();}catch(e){ui.notifications.warn(e.message);}},
      mountedCombat: async function(){try{await game.genesysMounts.openMountedCombat();}catch(e){ui.notifications.warn(e.message);}},
      itemModifications: async function(){try{await game.genesysItemModifications.openItemModifications();}catch(e){ui.notifications.warn(e.message);}},
      runes: async function(){try{await game.genesysRunes.openRunes();}catch(e){ui.notifications.warn(e.message);}},
      archetypeAbilities: async function(){try{await game.genesysArchetypes.openArchetypeAbilities();}catch(e){ui.notifications.warn(e.message);}},
      socialEncounter: async function(){try{await game.genesysSocial.openSocialEncounter();}catch(e){ui.notifications.warn(e.message);}},
      criticalEffects: async function(){try{await game.genesysCriticalLifecycle.recoverPending();}catch(e){ui.notifications.warn(e.message);}},
      environment: async function(){try{await game.genesysEnvironment.openEnvironment();}catch(e){ui.notifications.warn(e.message);}},
      repairEquipment: async function(){try{await game.genesysRepairs.openRepair();}catch(e){ui.notifications.warn(e.message);}},
      crafting: async function(){try{await game.genesysCrafting.openCrafting();}catch(e){ui.notifications.warn(e.message);}},
      resolveFear: async function(){try{if(!game.genesysFear)throw Error('Fear profiles are not ready.');await game.genesysFear.openFearPanel();}catch(e){ui.notifications.warn(e.message);}},
      criticalRecovery: async function(){try{await game.genesysCriticalRecovery.openCriticalRecovery();}catch(e){ui.notifications.warn(e.message);}},
      medicalCare: async function(){try{await game.genesysMedicalCare.openMedicalCare();}catch(e){ui.notifications.warn(e.message);}},
      painkillers: async function(){try{await game.genesysPainkillers.openPainkillers();}catch(e){ui.notifications.warn(e.message);}},
      openHealth: async function(){await openGmHealth();},
      navigateSection: this.#navigateSection,
      openEncounter: this.#openEncounter,
      openParticipant: this.#openParticipant,
      addEncounterTokens: this.#addEncounterTokens,
      openActors: this.#openActors,
      openCharacterCreator: this.#openCharacterCreator,
      openAdversaryForge: this.#openAdversaryForge,
      openActor: this.#openActor,
      storyCheck: async function(){try{await game.genesysStoryCheck.openStoryCheck();}catch(e){ui.notifications.warn(e.message);}},
      spendStoryPoint: this.#spendStoryPoint,
      adjustStoryPoint: this.#adjustStoryPoint,
      awardPartyXp: this.#awardPartyXp,
      sessionControl: this.#sessionControl,
      activateHeroic: this.#activateHeroic,
      heroicEffect: this.#heroicEffect,
      recoverHeroic: this.#recoverHeroic,
      resetHeroicSession: this.#resetHeroicSession,
      applyNightRest: this.#applyNightRest,
      recoverEncounterStrain: this.#recoverEncounterStrain,
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
      dockWriter: game.users?.activeGM?.id === game.user.id,
      dockWriterName: game.users?.activeGM?.name ?? "No active GM",
      worldName: String(game?.world?.title ?? "Current World"),
      sceneName: String(canvas?.scene?.name ?? "No active Scene"),
      connectedUserCount: connectedUsers(),
      actorCount: actors.length,
      pcCount: pcs.length,
      npcCount: npcs.length,
      totalAvailableXp,
      session: game.genesysSession?.snapshot() ?? {},
      sessionHistory: (game.genesysSession?.snapshot().history ?? []).slice(0, 6).map(entry => ({ ...entry, label: entry.action === "start" ? "Started" : "Ended", timeLabel: new Date(entry.timestamp).toLocaleString() })),
      storyPoints,
      storyPointHistory: Array.from(storyPoints.history ?? []).slice(0, 8).map((entry) => ({
        ...entry,
        timeLabel: entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"
      })),
      actors,
      pcs,
      heroicRows: characterActors().map(actor => ({...game.genesysHeroic?.liveSummary?.(actor),...heroicDockControls(actor,game.genesysHeroic?.secondaryOptions?.(actor)??[])})).filter(row => row?.selected),
      encounterRecovery: game.genesysEncounterRecovery?.recoveryRoster() ?? { ready: false },
      apothecaries: game.genesysRecovery?.listApothecaries?.() ?? [],
      recoveryRows: characterActors().filter(actor => ["pc","rival","nemesis"].includes(actor.system?.role)).map(actor => {
        try { return game.genesysRecovery.nightRestPreview(actor); }
        catch (error) { return { id: actor.id, name: actor.name, blocked: true, reason: error.message }; }
      }),
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
    const forge=this.element.querySelector('#genesys-gm-forge');
    forge?.addEventListener('dragover',event=>{event.preventDefault();});
    forge?.addEventListener('drop',event=>{event.preventDefault();event.stopPropagation();if(!requireDockWriter())return;const file=event.dataTransfer?.files?.[0];if(file)void import('../adversary-library.js').then(m=>m.openAdversaryLibrary({file})).catch(e=>ui.notifications.warn(e.message));});
    if (!context.dockWriter) {
      const mutations = ["spendStoryPoint", "adjustStoryPoint", "awardPartyXp", "sessionControl", "applyNightRest", "recoverEncounterStrain", "addEncounterTokens", "resetHeroicSession", "activateHeroic", "heroicEffect", "recoverHeroic"];
      for (const action of mutations) for (const button of this.element.querySelectorAll(`[data-action="${action}"]`)) button.disabled = true;
    }
    if (context.unauthorized) {
      ui?.notifications?.warn?.("GM Dock is available to the GM only.");
      void this.close();
    }
  }

  _onClose(options) {
    if (gmDockApp === this) gmDockApp = null;
    return super._onClose(options);
  }

  static #navigateSection(event, target) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!requireGm()) return;
    const sectionId = target?.dataset?.section;
    if (!["session", "story", "xp", "encounter", "actors", "forge", "rules"].some(name => sectionId === `genesys-gm-${name}`)) return;
    const root = this.element;
    const section = root?.querySelector?.(`#${sectionId}`);
    const content = root?.querySelector?.(".window-content");
    const nav = root?.querySelector?.(".genesys-gm-dock-nav-v1830");
    if (!section || !content) return;
    const top = content.scrollTop + section.getBoundingClientRect().top - content.getBoundingClientRect().top - (nav?.getBoundingClientRect().height ?? 0) - 8;
    content.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  }

  static async #openParticipant(_event, target) {
    if (!requireGm()) return;
    const actor = game.genesysVtt?.initiative?.resolveActorRef?.(target.dataset.actorRef);
    if (!actor?.sheet) return ui.notifications.warn("Participant is no longer available in this scene.");
    actor.sheet.render(true);
  }

  static async #addEncounterTokens(_event, target) {
    if (!requireDockWriter() || encounterAddPending) return;
    const scene = canvas?.scene;
    const service = game.genesysVtt?.initiative;
    if (!scene || !service?.addSceneParticipant) return ui.notifications.warn("Open a scene before adding participants.");
    if (service.sceneState(scene).status !== "collecting") return ui.notifications.warn("Use Encounter Tracker to change participants after encounter start.");
    const selected = [...(canvas?.tokens?.controlled ?? [])];
    if (!selected.length) return ui.notifications.warn("Select one or more tokens on the canvas first.");
    encounterAddPending = true;
    target.disabled = true;
    let added = 0;
    try {
      for (const token of selected) {
        const actor = token.actor;
        if (!actor?.uuid) continue;
        const state = service.sceneState(scene);
        if (state.status !== "collecting") throw new Error("Encounter started. Remaining tokens were not added.");
        if (state.entries.some(entry => entry.actorRef === actor.uuid)) continue;
        await service.addSceneParticipant(actor, undefined, "vigilance", scene);
        added++;
      }
      ui.notifications.info(`Added ${added} participant${added === 1 ? "" : "s"} with manual initiative 0/0.`);
    } catch (error) { ui.notifications.warn(`${error.message} (${added} added.)`); }
    finally { encounterAddPending = false; target.disabled = false; refreshOpenDock(); }
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

  static async #openAdversaryForge() {
    if (!requireDockWriter()) return;
    try { await (await import('../adversary-library.js')).openAdversaryLibrary(); }
    catch(error) { ui.notifications.warn(error.message); }
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
    if (!requireDockWriter() || storyPointActionPending) return;
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
    if (!requireDockWriter() || storyPointActionPending) return;
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

  static async #awardPartyXp(_event, target) {
    if (!requireDockWriter() || partyXpActionPending) return;
    const panel = target?.closest?.("#genesys-gm-xp");
    const amount = integer(panel?.querySelector?.("[data-party-xp-amount]")?.value, 0);
    const note = String(panel?.querySelector?.("[data-party-xp-note]")?.value ?? "").trim();
    const actorIds = Array.from(panel?.querySelectorAll?.("[data-party-xp-actor]:checked") ?? []).map((input) => String(input.value));
    if (!amount) return ui?.notifications?.warn?.("Enter an XP amount greater than zero.");
    if (!actorIds.length) return ui?.notifications?.warn?.("Select at least one player character.");
    const actors = [...new Set(actorIds)].map((id) => game?.actors?.get?.(id));
    if (actors.some((actor) => !actor || !actorSummary(actor).isPc)) return ui.notifications.warn("Selection changed. Refresh and select player characters again.");
    if (typeof game?.genesysAdvancement?.awardXp !== "function") return ui.notifications.error("XP service unavailable.");
    partyXpActionPending = true;
    target.disabled = true;
    try {
      for (const actor of actors) {
        if (!requireDockWriter()) throw new Error("Active GM changed; remaining awards were stopped.");
        await game.genesysAdvancement.awardXp(actor, amount, {
          kind: "party-award",
          label: note || `Party award · ${amount} XP`,
          sourceId: "gm-dock:party-xp"
        });
      }
      const names = actors.map((actor) => String(actor.name ?? "Unnamed Actor")).join(", ");
      await foundry.documents.ChatMessage.create({
        content: `<section class="genesys-party-xp-chat-v1833"><strong><i class="fa-solid fa-arrow-trend-up"></i> Party XP</strong><p>${amount} XP awarded to ${escapeHtml(names)}</p>${note ? `<small>${escapeHtml(note)}</small>` : ""}</section>`,
        speaker: { alias: String(game?.user?.name ?? "GM") }
      });
      ui?.notifications?.info?.(`${amount} XP awarded to ${actors.length} character${actors.length === 1 ? "" : "s"}.`);
    } catch (error) {
      ui?.notifications?.error?.(error?.message ?? "Party XP award failed.");
    } finally {
      partyXpActionPending = false;
      target.disabled = false;
      if (gmDockApp?.rendered) await gmDockApp.render({ force: true });
    }
  }

  static async #recoverEncounterStrain(_event, target) {
    if (!requireDockWriter() || target.disabled) return;
    const row = target.closest("[data-encounter-recovery-row]");
    target.disabled = true;
    try {
      await game.genesysEncounterRecovery.recover(target.dataset.actorRef, row.querySelector("select").value, Number(row.querySelector("input").value));
    } catch (error) { ui.notifications.warn(error.message); }
    finally { target.disabled = false; refreshOpenDock(); }
  }

  static async #applyNightRest(_event, target) {
    if (!requireDockWriter() || recoveryPending) return;
    const panel = target.closest("[data-night-rest]");
    const confirmed = panel?.querySelector("[data-rest-confirmed]")?.checked === true;
    const rows = Array.from(panel?.querySelectorAll("[data-rest-actor]:checked") ?? []).map(input => ({ id: input.value, wounds: Number(input.dataset.wounds), strain: Number(input.dataset.strain) }));
    recoveryPending = true;
    target.disabled = true;
    try {
      if (!game.genesysRecovery) throw new Error("Recovery service unavailable.");
      const caregiverId=panel?.querySelector('[data-rest-caregiver]')?.value || '';
      let care=null;
      if(caregiverId){
        if(!confirmed)throw Error('Confirm a full night of rest first.');
        care=game.genesysRecovery.carePreview(caregiverId);
        if(!await foundry.applications.api.DialogV2.confirm({window:{title:'Apothecary care'},content:`<p>Confirm that all selected patients rested under this caregiver. Each heals ${1+care.bonus} wounds total, up to their current wounds; all strain is recovered. Other recovery effects remain GM-managed.</p>`,rejectClose:false}))return;
      }
      const result = await game.genesysRecovery.applyNightRest(rows, confirmed, care);
      if (result.applied.length) ui.notifications.info(`Full night of rest applied to ${result.applied.length} character(s).`);
      for (const failure of result.failed) ui.notifications.warn(`${failure.name}: ${failure.reason}`);
    } catch (error) { ui.notifications.warn(error.message); }
    finally { recoveryPending = false; target.disabled = false; refreshOpenDock(); }
  }

  static async #heroicEffect(_event,target) {
    if(!requireDockWriter() || target.disabled)return;
    target.disabled=true;
    try {await runHeroicDockControl(game.actors.get(target.dataset.actorId),target.dataset.effect);}
    catch(error){ui.notifications.warn(error.message);}
    finally{target.disabled=false;refreshOpenDock();}
  }
  static async #activateHeroic(_event, target) {
    if (!requireDockWriter() || target.disabled) return;
    target.disabled = true;
    try { await game.genesysHeroicLive.activate(game.actors.get(target.dataset.actorId)); }
    catch (error) { ui.notifications.warn(error.message); }
    finally { target.disabled = false; refreshOpenDock(); }
  }
  static async #recoverHeroic() {
    if (!requireDockWriter()) return;
    try { await game.genesysHeroicLive.recover(); ui.notifications.info("Interrupted activation restored."); }
    catch (error) { ui.notifications.warn(error.message); }
    finally { refreshOpenDock(); }
  }
  static async #resetHeroicSession(_event, target) {
    if (!requireDockWriter() || target.disabled) return;
    target.disabled = true;
    try {
      const actor = game.actors.get(target.dataset.actorId);
      const confirmed = target.closest("[data-heroic-row]")?.querySelector("input")?.checked === true;
      await game.genesysHeroic.resetActorSession(actor, confirmed);
      ui.notifications.info("Heroic uses reset and active duration cleared.");
    } catch (error) { ui.notifications.warn(error.message); }
    finally { target.disabled = false; refreshOpenDock(); }
  }

  static async #sessionControl(_event, target) {
    if (!requireDockWriter() || target.disabled) return;
    target.disabled = true;
    try {
      if (!game.genesysSession) throw new Error("Session service unavailable.");
      const options={};
      if(target.dataset.sessionAction==='start'){
        const count=await foundry.applications.api.DialogV2.wait({window:{title:'Start Session — players'},content:`<p>Confirm the number of players taking part, including those not connected yet. Players receive one Story Point each; the GM receives one.</p><input name="players" type="number" min="0" step="1" value="${[...game.users].filter(u=>!u.isGM&&u.active).length}">`,buttons:[{action:'start',label:'Start Session',callback:(_e,_b,d)=>Number(d.element.querySelector('[name=players]').value)},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false});
        if(count===null||count===undefined)return;
        if(!Number.isSafeInteger(count)||count<0)throw Error('Enter a whole player count.');
        options.playerCount=count;
      }
      await game.genesysSession.transition(target.dataset.sessionAction,options);
    } catch (error) { ui.notifications.warn(error.message); }
    finally { target.disabled = false; }
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

Hooks.on("genesysSessionChanged", refreshOpenDock);

Hooks.on("canvasReady", refreshOpenDock);
Hooks.on("updateToken", refreshOpenDock);
Hooks.on("deleteToken", refreshOpenDock);

Hooks.on("userConnected", refreshOpenDock);
Hooks.on("genesysGmDockResync", refreshOpenDock);
Hooks.once("ready", () => {
  const resync = () => Hooks.callAll("genesysGmDockResync");
  game.socket?.on?.("connect", resync);
  window.addEventListener("focus", resync);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) resync(); });
});
function syncDockAccess() {
  if (!game.user?.isGM) {
    gmDockLauncher?.remove();
    gmDockLauncher = null;
    if (gmDockApp?.rendered) void gmDockApp.close();
  } else installGmDockLauncher();
}
Hooks.on("updateUser", syncDockAccess);
Hooks.on("genesysGmDockResync", syncDockAccess);
