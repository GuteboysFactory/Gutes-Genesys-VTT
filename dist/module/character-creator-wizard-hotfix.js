const SYSTEM_ID = "genesys-vtt";

function creatorDialogFrom(target) {
  return target?.closest?.("dialog.genesys-character-creator") ?? null;
}

function currentStepLabel(dialog) {
  return String(dialog?.querySelector?.(".genesys-creator-header small")?.textContent ?? "").trim();
}

function identityNameInput(dialog) {
  return dialog?.querySelector?.('[data-creator-field="identity.name"]') ?? null;
}

function syncIdentityGate(dialog) {
  if (!dialog || currentStepLabel(dialog) !== "Identity") return;
  const name = String(identityNameInput(dialog)?.value ?? "").trim();
  const next = dialog.querySelector("[data-creator-next]");
  if (next) next.disabled = !name;

  const warning = dialog.querySelector(".genesys-creator-step-warning");
  if (name) {
    if (warning) warning.remove();
    return;
  }

  if (!warning) {
    const footer = dialog.querySelector(".genesys-creator-footer");
    if (!footer) return;
    const row = document.createElement("div");
    row.className = "genesys-creator-step-warning";
    row.innerHTML = "<span>Enter a character name.</span>";
    footer.before(row);
  }
}

function syncStartingXpPlaceholder(dialog) {
  if (!dialog) return;
  const step = currentStepLabel(dialog);
  if (step !== "Identity" && step !== "Archetype") return;
  const firstBox = dialog.querySelector(".genesys-creator-xp span:first-child");
  const value = firstBox?.querySelector?.("strong");
  if (!value) return;

  const selectedArchetype = Boolean(dialog.querySelector('[data-creator-archetype].selected'));
  if (!selectedArchetype && String(value.textContent ?? "").trim() === "0") {
    value.textContent = "—";
    firstBox.title = "Starting XP is determined by the selected archetype/species.";
  }
}

function syncCreator(dialog) {
  syncIdentityGate(dialog);
  syncStartingXpPlaceholder(dialog);
}

function syncAllCreators() {
  for (const dialog of document.querySelectorAll("dialog.genesys-character-creator")) syncCreator(dialog);
}

document.addEventListener("input", (event) => {
  if (!event.target?.matches?.('[data-creator-field="identity.name"]')) return;
  syncIdentityGate(creatorDialogFrom(event.target));
}, true);

const observer = new MutationObserver(() => syncAllCreators());
Hooks.once("ready", () => {
  syncAllCreators();
  observer.observe(document.body, { childList: true, subtree: true });
  console.log(`${SYSTEM_ID} | Character Creator identity gate hotfix ready`);
});
import { GenesysUiObserver as MutationObserver } from "./ui-mount-coordinator-v1812.js";
