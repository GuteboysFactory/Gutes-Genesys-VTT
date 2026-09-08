import { createCoreParryTalent, createCoreSecondWindTalent, createTerrinothFinesseTalent, normalizeTalentDefinition } from "../domain/rules/index.js";
import { rerenderRenderedCharacterSheet } from "./live-sheet-state.js";

const SYSTEM_ID = "genesys-vtt";
const LIBRARY_PROTOCOL = "genesys-talent-library-v1";

function esc(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function clone(value) {
    if (value === undefined)
        return undefined;
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
}

function integer(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const n = Number(value ?? fallback);
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(max, Math.max(min, Math.trunc(n)));
}

function actorItems(actor) {
    return Array.isArray(actor?.items?.contents) ? actor.items.contents : Array.from(actor?.items ?? []);
}

function referenceTalents() {
    return [createCoreParryTalent(1), createCoreSecondWindTalent(1), createTerrinothFinesseTalent()]
        .map((talent) => ({ ...talent, librarySource: "System Reference", packId: "system-reference" }));
}

function registryTalents() {
    try {
        const rows = game?.genesysContent?.getContent?.("talents") ?? [];
        return rows.map((row) => {
            const normalized = normalizeTalentDefinition({
                id: row.id,
                name: row.label ?? row.name,
                system: {
                    ...row,
                    sourceId: row.sourceId || row.id,
                    sourceType: row.sourceType || "content-pack"
                }
            });
            return {
                ...normalized,
                description: String(row.description ?? row.notes ?? normalized.notes ?? ""),
                requirements: clone(row.requirements ?? row.prerequisites ?? []),
                librarySource: String(row.packLabel ?? row.sourceType ?? "Content Pack"),
                packId: String(row.packId ?? "")
            };
        });
    }
    catch (error) {
        console.warn(`${SYSTEM_ID} | Talent Library could not read Character Content Registry`, error);
        return [];
    }
}

let compendiumTalents=[];
export async function loadCompendiumTalents(){
    const rows=[];
    for(const pack of Array.from(game.packs?.values?.() ?? [])){
        if(pack.documentName!=='Item' || !(game.user?.isGM || pack.visible))continue;
        const docs=await pack.getDocuments();
        if(!(game.user?.isGM || pack.visible))continue;
        for(const item of docs){
            if(item.type!=='talent')continue;
            rows.push({...normalizeTalentDefinition({name:item.name,system:{...item.system,sourceId:`Compendium.${pack.collection}.${item.id}`}}),documentId:item.id,packId:pack.collection,librarySource:pack.metadata?.label||pack.collection});
        }
    }
    compendiumTalents=rows;
    return rows;
}
function visibleCompendiumTalents(){
    return compendiumTalents.filter(row=>{const pack=game.packs?.get(row.packId);return pack && (game.user?.isGM || pack.visible);});
}

export function worldTalents() {
    return Array.from(game.items?.contents ?? []).filter(item => item.type === 'talent' && (game.user?.isGM || item.testUserPermission?.(game.user, 'OBSERVER'))).map(item => ({
        ...normalizeTalentDefinition({name:item.name,system:{...item.system,sourceId:item.flags?.[SYSTEM_ID]?.catalogTalentId || `world-talent:${item.id}`}}),
        requirements:clone(item.flags?.[SYSTEM_ID]?.catalogRequirements ?? []),
        documentId:item.id, librarySource:'World Items', packId:'world'
    }));
}

function dedupeTalents(rows) {
    const map = new Map();
    for (const row of rows) {
        const talent = normalizeTalentDefinition(row);
        const existing = map.get(talent.id);
        const merged = {
            ...talent,
            documentId: row.documentId ?? talent.documentId,
            description: String(row.description ?? row.notes ?? talent.notes ?? ""),
            requirements: clone(row.requirements ?? existing?.requirements ?? []),
            librarySource: String(row.librarySource ?? existing?.librarySource ?? talent.sourceType),
            packId: String(row.packId ?? existing?.packId ?? "")
        };
        // A content pack is authoritative over the built-in regression/reference definition.
        if (!existing || merged.packId !== "system-reference")
            map.set(talent.id, merged);
    }
    return [...map.values()].sort((a, b) => a.tier - b.tier || a.label.localeCompare(b.label));
}

export function listTalentLibraryEntries() {
    const nativeIds=new Set(Array.from(game.items?.contents??[]).map(item=>item.flags?.[SYSTEM_ID]?.catalogTalentId).filter(Boolean));
    return dedupeTalents([...referenceTalents(), ...registryTalents()].filter(row=>!nativeIds.has(row.id)).concat(worldTalents(),visibleCompendiumTalents()));
}
let installingCatalog=false;
export async function installTalentCatalog(){
    const authority=()=>{if(!game.user?.isGM || game.users?.activeGM?.id!==game.user.id)throw Error('Only the active GM can install the catalog.');};
    authority();if(installingCatalog)throw Error('Catalog installation is already running.');
    installingCatalog=true;let created=0;
    try{
        const rows=dedupeTalents([...referenceTalents(),...registryTalents()]);
        for(const talent of rows){
            authority();
            if(Array.from(game.items?.contents??[]).some(item=>item.type==='talent'&&item.flags?.[SYSTEM_ID]?.catalogTalentId===talent.id))continue;
            const data=talentItemData(talent);
            data.ownership={default:2};
            data.flags={[SYSTEM_ID]:{catalogTalentId:talent.id,catalogRequirements:clone(talent.requirements??[])}};
            const item=await foundry.documents.Item.create(data);
            if(!item)throw Error('Item creation failed.');
            created++;
        }
        return created;
    }catch(error){throw Error(`${created} Talents created before stopping: ${error.message}`);}
    finally{installingCatalog=false;}
}

function actorTalentItems(actor) {
    return actorItems(actor).filter((item) => item?.type === "talent");
}

function ownedTalent(actor, sourceId) {
    return actorTalentItems(actor).find((item) => String(item?.system?.sourceId ?? "") === String(sourceId)) ?? null;
}

export function talentPurchaseTiers(talentInput) {
    const talent = normalizeTalentDefinition(talentInput);
    const count = talent.ranked ? Math.max(1, integer(talent.rank, 1, 1, 99)) : 1;
    return Array.from({ length: count }, (_, index) => Math.min(5, talent.tier + index));
}

export function actorTalentPyramid(actor) {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const item of actorTalentItems(actor)) {
        for (const tier of talentPurchaseTiers(item))
            counts[tier] += 1;
    }
    return counts;
}

function nextEffectiveTier(actor, talentInput) {
    const talent = normalizeTalentDefinition(talentInput);
    const existing = ownedTalent(actor, talent.id);
    if (!talent.ranked)
        return talent.tier;
    const currentRank = existing ? integer(existing.system?.rank, 1, 1, 99) : 0;
    return Math.min(5, talent.tier + currentRank);
}

export function validateTalentPyramidPurchase(actor, talentInput) {
    const talent = normalizeTalentDefinition(talentInput);
    const existing = ownedTalent(actor, talent.id);
    if (existing && !talent.ranked)
        return { allowed: false, reason: `${talent.label} is not ranked and is already owned.` };

    const effectiveTier = nextEffectiveTier(actor, talent);
    const before = actorTalentPyramid(actor);
    const after = { ...before, [effectiveTier]: before[effectiveTier] + 1 };
    if (effectiveTier > 1 && after[effectiveTier - 1] <= after[effectiveTier]) {
        return {
            allowed: false,
            reason: `Talent Pyramid requires more Tier ${effectiveTier - 1} purchases than Tier ${effectiveTier} purchases after this purchase.`,
            effectiveTier,
            before,
            after
        };
    }
    return { allowed: true, reason: "", effectiveTier, before, after };
}

export function actorAvailableXp(actor) {
    const xp = actor?.system?.xp ?? {};
    return Math.max(0, integer(xp.starting, 0) + integer(xp.earned, 0) - integer(xp.spent, 0));
}

export function talentPurchaseCost(effectiveTier) {
    return 5 * integer(effectiveTier, 1, 1, 5);
}

export function evaluateTalentPurchase(actor, talentInput) {
    const talent = normalizeTalentDefinition(talentInput);
    const pyramid = validateTalentPyramidPurchase(actor, talent);
    const effectiveTier = pyramid.effectiveTier ?? nextEffectiveTier(actor, talent);
    const cost = talentPurchaseCost(effectiveTier);
    const availableXp = actorAvailableXp(actor);
    const reasons = [];
    if (!pyramid.allowed)
        reasons.push(pyramid.reason);
    if (cost > availableXp)
        reasons.push(`Not enough XP. Need ${cost}, have ${availableXp}.`);
    if (!(actor?.isOwner !== false || game?.user?.isGM))
        reasons.push("You do not have permission to modify this character.");
    return {
        allowed: reasons.length === 0,
        reasons,
        talent,
        effectiveTier,
        cost,
        availableXp,
        owned: Boolean(ownedTalent(actor, talent.id)),
        currentRank: integer(ownedTalent(actor, talent.id)?.system?.rank, 0, 0, 99),
        pyramid
    };
}

function talentItemData(talent, rank = 1) {
    return {
        name: talent.label,
        type: "talent",
        system: {
            sourceId: talent.id,
            sourceType: talent.sourceType,
            tier: talent.tier,
            ranked: talent.ranked,
            rank,
            activation: talent.activation,
            enabled: talent.enabled !== false,
            tags: clone(talent.tags ?? []),
            rules: clone(talent.rules ?? []),
            notes: String(talent.notes ?? talent.description ?? "")
        }
    };
}

export async function purchaseTalentForActor(actor, talentInput, { chargeXp = true } = {}) {
    const evaluation = evaluateTalentPurchase(actor, talentInput);
    if (!evaluation.allowed && chargeXp)
        throw new Error(evaluation.reasons.join(" "));

    const talent = evaluation.talent;
    const existing = ownedTalent(actor, talent.id);
    let item;
    if (existing && talent.ranked) {
        const rank = integer(existing.system?.rank, 1, 1, 99) + 1;
        await existing.update({
            name: talent.label,
            "system.sourceType": talent.sourceType,
            "system.tier": talent.tier,
            "system.ranked": true,
            "system.rank": rank,
            "system.activation": talent.activation,
            "system.enabled": talent.enabled !== false,
            "system.tags": clone(talent.tags ?? []),
            "system.rules": clone(talent.rules ?? []),
            "system.notes": String(talent.notes ?? talent.description ?? "")
        });
        item = existing;
    }
    else if (existing) {
        item = existing;
    }
    else {
        const created = await actor.createEmbeddedDocuments("Item", [talentItemData(talent, 1)]);
        item = created?.[0] ?? null;
    }

    if (chargeXp) {
        const spent = integer(actor?.system?.xp?.spent, 0) + evaluation.cost;
        await actor.update({ "system.xp.spent": spent });
    }

    await rerenderRenderedCharacterSheet(actor);
    Hooks.callAll("genesysTalentPurchased", actor, item, clone(evaluation));
    return { item, evaluation };
}

function requirementText(requirements) {
    if (!requirements || (Array.isArray(requirements) && !requirements.length))
        return "None listed";
    if (typeof requirements === "string")
        return requirements;
    if (Array.isArray(requirements))
        return requirements.map((row) => typeof row === "string" ? row : row?.label ?? row?.id ?? JSON.stringify(row)).join(" · ");
    return requirements.label ?? requirements.id ?? JSON.stringify(requirements);
}

function ruleSummary(talent) {
    if (!talent.rules?.length)
        return "No automated Rule Elements";
    return talent.rules.map((rule) => `${rule.type} @ ${rule.timing}`).join(" · ");
}

function libraryHtml(actor) {
    const talents = listTalentLibraryEntries();
    const sources = [...new Set(talents.map((row) => row.librarySource).filter(Boolean))].sort();
    const cards = talents.map((talent) => {
        const evaluation = evaluateTalentPurchase(actor, talent);
        const owned = evaluation.owned ? (talent.ranked ? `Rank ${evaluation.currentRank}` : "Owned") : "";
        const purchaseLabel = talent.ranked && evaluation.owned ? `Buy Rank ${evaluation.currentRank + 1}` : "Purchase";
        const title = evaluation.reasons.join(" ");
        return `<article class="genesys-library-talent-card" data-library-talent="${esc(talent.id)}" data-tier="${talent.tier}" data-source="${esc(talent.librarySource)}" data-search="${esc(`${talent.label} ${talent.notes} ${talent.librarySource}`.toLowerCase())}">
          <header><div><strong>${esc(talent.label)}</strong><span>${esc(talent.librarySource)}</span></div><b>T${talent.tier}</b></header>
          <div class="genesys-library-talent-meta"><span>${talent.ranked ? "Ranked" : "Non-Ranked"}</span><span>${esc(talent.activation)}</span><span>${evaluation.cost} XP</span>${owned ? `<span>${esc(owned)}</span>` : ""}</div>
          <p>${esc(talent.notes || talent.description || "No description supplied by this content pack.")}</p>
          <div class="genesys-library-talent-actions">${talent.documentId && (talent.packId === "world" || talent.id.startsWith("Compendium.")) ? `<button type="button" data-library-edit-world="${esc(talent.documentId)}" data-library-pack="${esc(talent.packId)}">Open source</button>` : ""}<button type="button" data-library-view="${esc(talent.id)}">View</button><button type="button" class="genesys-primary-action" data-library-purchase="${esc(talent.id)}" ${evaluation.allowed ? "" : "disabled"} title="${esc(title)}">${esc(purchaseLabel)}</button></div>
        </article>`;
    }).join("") || `<p class="genesys-empty-row">No Talents are registered. Import a Character Content Pack to populate the library.</p>`;

    return `<dialog class="genesys-talent-library" data-talent-library-dialog>
      <div class="genesys-talent-library-shell">
        <header class="genesys-talent-library-header"><div><strong>Talent Library</strong><small>${esc(actor?.name ?? "Character")} · ${talents.length} registered Talents</small></div><div class="genesys-talent-library-xp"><span>XP Available</span><strong data-library-xp>${actorAvailableXp(actor)}</strong></div><button type="button" data-library-close aria-label="Close">×</button></header>
        <div class="genesys-talent-library-controls">${game.user?.isGM ? `<button type="button" data-library-create-world>Create world Talent</button><button type="button" data-library-install-catalog>Install catalog as Items</button>` : ""}<button type="button" data-library-load-packs>Load / refresh Compendiums</button><input type="search" data-library-search placeholder="Search Talents…"/><select data-library-tier><option value="all">All Tiers</option><option value="1">Tier 1</option><option value="2">Tier 2</option><option value="3">Tier 3</option><option value="4">Tier 4</option><option value="5">Tier 5</option></select><select data-library-source><option value="all">All Sources</option>${sources.map((source) => `<option value="${esc(source)}">${esc(source)}</option>`).join("")}</select></div>
        <div class="genesys-talent-library-body"><div class="genesys-talent-library-list">${cards}</div><aside class="genesys-talent-library-detail" data-library-detail><div class="genesys-library-detail-placeholder"><i class="fa-solid fa-book-open"></i><strong>Select a Talent</strong><p>View requirements, Rule Elements, source, XP cost, and purchase eligibility.</p></div></aside></div>
      </div>
    </dialog>`;
}

function renderTalentDetail(dialog, actor, talent) {
    const detail = dialog.querySelector("[data-library-detail]");
    if (!detail)
        return;
    const evaluation = evaluateTalentPurchase(actor, talent);
    const pyramid = evaluation.pyramid?.before ?? actorTalentPyramid(actor);
    detail.innerHTML = `<div class="genesys-library-detail-title"><div><strong>${esc(talent.label)}</strong><span>${esc(talent.librarySource)}</span></div><b>Tier ${talent.tier}</b></div>
      <dl><div><dt>Ranked</dt><dd>${talent.ranked ? "Yes" : "No"}</dd></div><div><dt>Activation</dt><dd>${esc(talent.activation)}</dd></div><div><dt>Next Effective Tier</dt><dd>T${evaluation.effectiveTier}</dd></div><div><dt>Cost</dt><dd>${evaluation.cost} XP</dd></div></dl>
      <section><h3>Description</h3><p>${esc(talent.notes || talent.description || "No description supplied by this content pack.")}</p></section>
      <section><h3>Requirements</h3><p>${esc(requirementText(talent.requirements))}</p></section>
      <section><h3>Automation</h3><p>${esc(ruleSummary(talent))}</p></section>
      <section><h3>Current Pyramid</h3><p>T1 ${pyramid[1]} · T2 ${pyramid[2]} · T3 ${pyramid[3]} · T4 ${pyramid[4]} · T5 ${pyramid[5]}</p></section>
      ${evaluation.reasons.length ? `<div class="genesys-library-warning">${evaluation.reasons.map((reason) => `<p>${esc(reason)}</p>`).join("")}</div>` : `<div class="genesys-library-ok">Legal purchase · ${evaluation.availableXp} XP available before purchase.</div>`}
      <button type="button" class="genesys-primary-action genesys-library-detail-purchase" data-library-purchase="${esc(talent.id)}" ${evaluation.allowed ? "" : "disabled"}>${talent.ranked && evaluation.owned ? `Buy Rank ${evaluation.currentRank + 1}` : "Purchase Talent"} · ${evaluation.cost} XP</button>`;
}

function applyFilters(dialog) {
    const query = String(dialog.querySelector("[data-library-search]")?.value ?? "").trim().toLowerCase();
    const tier = String(dialog.querySelector("[data-library-tier]")?.value ?? "all");
    const source = String(dialog.querySelector("[data-library-source]")?.value ?? "all");
    for (const card of dialog.querySelectorAll("[data-library-talent]")) {
        const visible = (!query || String(card.dataset.search ?? "").includes(query))
            && (tier === "all" || card.dataset.tier === tier)
            && (source === "all" || card.dataset.source === source);
        card.hidden = !visible;
    }
}

function actorForRoot(root) {
    const actorId = String(root?.dataset?.actorId ?? "");
    if (actorId && game?.actors?.get?.(actorId))
        return game.actors.get(actorId);
    const name = String(root?.dataset?.actorName ?? "");
    return Array.from(game?.actors ?? []).find((actor) => actor?.name === name && actor?.isOwner)
        ?? Array.from(canvas?.tokens?.placeables ?? []).map((token) => token?.actor).find((actor) => actor?.name === name && actor?.isOwner)
        ?? null;
}

export function openTalentLibrary(actor, root = null) {
    if (!actor)
        throw new Error("Talent Library requires a character Actor.");
    const host = root ?? document.body;
    host.querySelector?.("[data-talent-library-dialog]")?.remove();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = libraryHtml(actor);
    const dialog = wrapper.firstElementChild;
    host.append(dialog);
    dialog._genesysActor = actor;
    dialog.showModal?.();
    return dialog;
}

function installTalentLibraryButton(root) {
    if (!root || root.dataset.genesysTalentLibrary === "true")
        return;
    const banner = root.querySelector("[data-genesys-tab-panel='talents'] .genesys-panel-banner-action");
    const createbar = banner?.querySelector(".genesys-item-createbar");
    if (!banner || !createbar)
        return;

    for (const button of createbar.querySelectorAll("[data-action='grantParry'],[data-action='grantFinesse'],[data-action='grantSecondWind']"))
        button.remove();

    if (!createbar.querySelector("[data-open-talent-library]")) {
        const library = document.createElement("button");
        library.type = "button";
        library.className = "genesys-primary-action";
        library.dataset.openTalentLibrary = "true";
        library.innerHTML = '<i class="fa-solid fa-book-open" aria-hidden="true"></i> Talent Library';
        createbar.prepend(library);
    }

    const custom = createbar.querySelector("[data-action='createItem'][data-item-type='talent']");
    if (custom)
        custom.textContent = "+ Custom Talent";
    root.dataset.genesysTalentLibrary = "true";
}

function initializeTalentLibraryButtons() {
    for (const root of document.querySelectorAll("[data-genesys-sheet-tabs]"))
        installTalentLibraryButton(root);
}

document.addEventListener("click", async (event) => {
    const install=event.target?.closest?.('[data-library-install-catalog]');
    if(install){
        event.preventDefault();const dialog=install.closest('dialog'),actor=dialog?._genesysActor,host=dialog?.parentElement;
        dialog.close();
        try{
            const yes=await foundry.applications.api.DialogV2.confirm({window:{title:'Install Talent catalog'},content:'<p>Create missing catalog Talents in Foundry Items, visible to players? Existing catalog Items and your edits are preserved. Explicitly running this again restores deleted catalog entries.</p>',rejectClose:false});
            if(yes){const count=await installTalentCatalog();ui.notifications.info(`${count} catalog Talents created.`);}
        }catch(error){ui.notifications.warn(error.message);}
        finally{if(dialog.isConnected)openTalentLibrary(actor,host);}
        return;
    }
    const loadPacks=event.target?.closest?.('[data-library-load-packs]');
    if(loadPacks){
        event.preventDefault();loadPacks.disabled=true;
        const dialog=loadPacks.closest('dialog'),actor=dialog?._genesysActor,host=dialog?.parentElement;
        try{await loadCompendiumTalents();if(dialog?.isConnected && dialog.open)openTalentLibrary(actor,host);}
        catch(error){compendiumTalents=[];ui.notifications.warn(`Compendium loading failed: ${error.message}`);}
        finally{loadPacks.disabled=false;}
        return;
    }
    const createWorld = event.target?.closest?.('[data-library-create-world]');
    const editWorld = event.target?.closest?.('[data-library-edit-world]');
    if(createWorld || editWorld){
        event.preventDefault();
        const dialog=(createWorld||editWorld).closest('dialog');
        try{
            let item;
            if(createWorld){
                if(!game.user?.isGM)throw Error('Only a GM can create shared Talents here.');
                item=await foundry.documents.Item.create({name:'New Talent',type:'talent',system:{tier:1,rank:1,ranked:false,activation:'passive'},ownership:{default:0}});
            }else if(editWorld.dataset.libraryPack==='world')item=game.items.get(editWorld.dataset.libraryEditWorld);
            else{
                const pack=game.packs.get(editWorld.dataset.libraryPack);
                if(!pack || !(game.user?.isGM || pack.visible))throw Error('Compendium is no longer available.');
                item=await pack.getDocument(editWorld.dataset.libraryEditWorld);
            }
            if(!item || !(game.user?.isGM || item.testUserPermission?.(game.user,'OBSERVER')))throw Error('Talent is no longer available.');
            dialog?.close();await item.sheet.render(true);
        }catch(error){ui.notifications.warn(error.message);}
        return;
    }
    const open = event.target?.closest?.("[data-open-talent-library]");
    if (open) {
        event.preventDefault();
        event.stopPropagation();
        const root = open.closest("[data-genesys-sheet-tabs]");
        const actor = actorForRoot(root);
        if (!actor) {
            ui?.notifications?.warn?.("Could not resolve this character for Talent Library.");
            return;
        }
        openTalentLibrary(actor, root);
        return;
    }

    const close = event.target?.closest?.("[data-library-close]");
    if (close) {
        event.preventDefault();
        close.closest("dialog")?.close?.();
        return;
    }

    const view = event.target?.closest?.("[data-library-view]");
    if (view) {
        event.preventDefault();
        const dialog = view.closest("[data-talent-library-dialog]");
        const root = dialog?.closest("[data-genesys-sheet-tabs]");
        const actor = actorForRoot(root);
        const talent = listTalentLibraryEntries().find((entry) => entry.id === view.dataset.libraryView);
        if (dialog && actor && talent)
            renderTalentDetail(dialog, actor, talent);
        return;
    }

    const purchase = event.target?.closest?.("[data-library-purchase]");
    if (purchase) {
        event.preventDefault();
        event.stopPropagation();
        const dialog = purchase.closest("[data-talent-library-dialog]");
        const root = dialog?.closest("[data-genesys-sheet-tabs]");
        const actor = actorForRoot(root);
        const talent = listTalentLibraryEntries().find((entry) => entry.id === purchase.dataset.libraryPurchase);
        if (!dialog || !actor || !talent)
            return;
        try {
            const { evaluation } = await purchaseTalentForActor(actor, talent);
            ui?.notifications?.info?.(`${talent.label} purchased for ${evaluation.cost} XP.`);
            const fresh = openTalentLibrary(actor, root);
            renderTalentDetail(fresh, actor, talent);
        }
        catch (error) {
            ui?.notifications?.warn?.(String(error?.message ?? error));
        }
    }
});

document.addEventListener("input", (event) => {
    const dialog = event.target?.closest?.("[data-talent-library-dialog]");
    if (dialog && event.target?.matches?.("[data-library-search]"))
        applyFilters(dialog);
});

document.addEventListener("change", (event) => {
    const dialog = event.target?.closest?.("[data-talent-library-dialog]");
    if (dialog && event.target?.matches?.("[data-library-tier],[data-library-source]"))
        applyFilters(dialog);
});

Hooks.once("ready", () => {
    Object.defineProperty(game, "genesysTalentLibrary", {
        configurable: true,
        value: Object.freeze({
            protocol: LIBRARY_PROTOCOL,
            list: listTalentLibraryEntries,
            open: openTalentLibrary,
            pyramid: actorTalentPyramid,
            purchaseTiers: talentPurchaseTiers,
            evaluatePurchase: evaluateTalentPurchase,
            purchase: purchaseTalentForActor,
            availableXp: actorAvailableXp
        })
    });
    initializeTalentLibraryButtons();
    const observer = new MutationObserver(() => initializeTalentLibraryButtons());
    observer.observe(document.body, { childList: true, subtree: true });
});
import { GenesysUiObserver as MutationObserver } from "./ui-mount-coordinator-v1812.js";

// Rebuild open Library views from native documents; owned talent copies remain independent.
for(const name of ['createItem','updateItem','deleteItem']) Hooks.on(name,item=>{
    if(item.parent || item.type!=='talent')return;
    if(item.pack)compendiumTalents=[];
    for(const dialog of document.querySelectorAll('[data-talent-library-dialog]')){
        if(!dialog.open || !dialog._genesysActor)continue;
        const filters=['search','tier','source'].map(key=>[key,dialog.querySelector(`[data-library-${key}]`)?.value]);
        const fresh=openTalentLibrary(dialog._genesysActor,dialog.parentElement);
        for(const [key,value] of filters){const input=fresh.querySelector(`[data-library-${key}]`);if(input)input.value=value;}
        applyFilters(fresh);
    }
});

// Invalidate snapshots after native pack changes; refresh explicitly before using changed entries.
for(const event of ['updateCompendium','deleteCompendium']) Hooks.on(event,()=>{compendiumTalents=[];});
