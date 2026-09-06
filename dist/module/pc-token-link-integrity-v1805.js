import { normalizeActorRole } from "../domain/adversaries/index.js";

const SYSTEM_ID = "genesys-vtt";
const VERSION = "0.0.1805";
const syncingActors = new Set();
const syncingTokens = new Set();

function isPc(actor) {
  return Boolean(actor?.type === "character" && normalizeActorRole(actor?.system?.role) === "pc");
}

function canEditActor(actor) {
  return Boolean(actor && (game?.user?.isGM || actor?.isOwner));
}

function tokenId(tokenOrDocument) {
  return String(tokenOrDocument?.id ?? tokenOrDocument?.document?.id ?? "");
}

function tokenDocument(tokenOrDocument) {
  return tokenOrDocument?.document ?? tokenOrDocument ?? null;
}

function baseActorForTokenDocument(document) {
  const actorId = String(document?.actorId ?? "");
  return actorId ? (game?.actors?.get?.(actorId) ?? null) : null;
}

async function ensurePcPrototypeLinked(actor) {
  if (!isPc(actor) || !canEditActor(actor)) return false;
  const id = String(actor.id ?? actor.uuid ?? "");
  if (!id || syncingActors.has(id)) return false;
  if (actor?.prototypeToken?.actorLink === true) return false;
  syncingActors.add(id);
  try {
    await actor.update({ "prototypeToken.actorLink": true });
    return true;
  }
  finally {
    syncingActors.delete(id);
  }
}

async function ensurePlacedPcTokenLinked(tokenOrDocument) {
  if (!game?.user?.isGM) return false;
  const document = tokenDocument(tokenOrDocument);
  if (!document) return false;
  const id = tokenId(document);
  if (!id || syncingTokens.has(id)) return false;
  const baseActor = baseActorForTokenDocument(document);
  if (!isPc(baseActor) || document.actorLink === true) return false;
  syncingTokens.add(id);
  try {
    await document.update({ actorLink: true });
    return true;
  }
  finally {
    syncingTokens.delete(id);
  }
}

async function repairWorldPcPrototypes() {
  const actors = Array.from(game?.actors?.contents ?? game?.actors ?? []);
  for (const actor of actors) await ensurePcPrototypeLinked(actor);
}

async function repairCurrentScenePcTokens() {
  if (!game?.user?.isGM) return;
  const tokens = Array.from(globalThis.canvas?.tokens?.placeables ?? []);
  for (const token of tokens) await ensurePlacedPcTokenLinked(token);
}

function basePcActorForTargetRef(reference) {
  const ref = String(reference ?? "");
  if (!ref.startsWith("token:")) return null;
  const id = ref.slice(6);
  const token = globalThis.canvas?.tokens?.get?.(id)
    ?? Array.from(globalThis.canvas?.tokens?.placeables ?? []).find((entry) => tokenId(entry) === id)
    ?? null;
  const document = tokenDocument(token);
  const baseActor = baseActorForTokenDocument(document);
  return isPc(baseActor) ? baseActor : null;
}

function translatePcTargetReference(reference) {
  const baseActor = basePcActorForTargetRef(reference);
  return baseActor?.id ? `actor:${baseActor.id}` : String(reference ?? "");
}

function wrapMagicResolutionApi() {
  const base = game?.genesysMagicResolution;
  if (!base?.cast || base.__pcTargetIntegrityV1805) return;
  const wrapped = Object.freeze({
    ...base,
    version: VERSION,
    __pcTargetIntegrityV1805: true,
    resolveTarget(caster, reference) {
      const translated = translatePcTargetReference(reference);
      return base.resolveTarget?.(caster, translated) ?? null;
    },
    async cast(caster, input = {}) {
      const translated = translatePcTargetReference(input?.targetRef);
      return base.cast(caster, { ...input, targetRef: translated });
    }
  });
  Object.defineProperty(game, "genesysMagicResolution", { configurable: true, value: wrapped });
}

Hooks.on("createActor", (actor) => {
  void ensurePcPrototypeLinked(actor).catch((error) => console.error(`${SYSTEM_ID} | ${VERSION} PC prototype link repair failed`, error));
});

Hooks.on("updateActor", (actor) => {
  void ensurePcPrototypeLinked(actor).catch((error) => console.error(`${SYSTEM_ID} | ${VERSION} PC prototype link repair failed`, error));
});

Hooks.on("createToken", (document) => {
  void ensurePlacedPcTokenLinked(document).catch((error) => console.error(`${SYSTEM_ID} | ${VERSION} placed PC token link repair failed`, error));
});

Hooks.on("updateToken", (document) => {
  void ensurePlacedPcTokenLinked(document).catch((error) => console.error(`${SYSTEM_ID} | ${VERSION} placed PC token link repair failed`, error));
});

Hooks.on("canvasReady", () => {
  void repairCurrentScenePcTokens().catch((error) => console.error(`${SYSTEM_ID} | ${VERSION} scene PC token repair failed`, error));
});

Hooks.once("ready", async () => {
  wrapMagicResolutionApi();
  try {
    await repairWorldPcPrototypes();
    await repairCurrentScenePcTokens();
  }
  catch (error) {
    console.error(`${SYSTEM_ID} | ${VERSION} PC token link integrity migration failed`, error);
  }
  console.log(`${SYSTEM_ID} | ${VERSION} PC Token Link Integrity ready`);
});
