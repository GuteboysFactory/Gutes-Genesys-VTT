const SYSTEM_ID = "genesys-vtt";
const POSITION_SETTING = "storyPointCounterPosition";
let counter = null;
let actionPending = false;

function number(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function defaultPosition(element = counter) {
  return {
    left: Math.max(8, window.innerWidth - (element?.offsetWidth || 238) - 318),
    top: Math.max(8, window.innerHeight - (element?.offsetHeight || 68) - 46)
  };
}

function clampPosition(position, element = counter) {
  const fallback = defaultPosition(element);
  const width = element?.offsetWidth || 238;
  const height = element?.offsetHeight || 68;
  const left = Number(position?.left);
  const top = Number(position?.top);
  return {
    left: Math.max(8, Math.min(Number.isFinite(left) ? left : fallback.left, Math.max(8, window.innerWidth - width - 8))),
    top: Math.max(8, Math.min(Number.isFinite(top) ? top : fallback.top, Math.max(8, window.innerHeight - height - 8)))
  };
}

function applyPosition(position) {
  if (!counter) return;
  const next = clampPosition(position);
  counter.style.left = `${next.left}px`;
  counter.style.top = `${next.top}px`;
}

async function savePosition() {
  if (!counter) return;
  const next = clampPosition({ left: Number.parseFloat(counter.style.left), top: Number.parseFloat(counter.style.top) });
  applyPosition(next);
  await game.settings.set(SYSTEM_ID, POSITION_SETTING, next);
}

function renderCounter() {
  if (!counter) return;
  const state = game?.genesysStoryPoints?.snapshot?.() ?? { player: 0, gm: 0 };
  const gm = Boolean(game?.user?.isGM);
  counter.innerHTML = `
    <div class="genesys-sp-counter-grip-v1833" title="Drag Story Points"><i class="fa-solid fa-grip-vertical"></i><span>STORY<br>POINTS</span></div>
    ${["player", "gm"].map((side, index) => `${index ? '<div class="genesys-sp-counter-swap-v1833"><i class="fa-solid fa-right-left"></i></div>' : ''}<div class="is-${side} genesys-sp-pool-v1834"><small>${side === "gm" ? "GM" : "PLAYER"}</small><strong>${number(state[side])}</strong><button type="button" data-spend-side="${side}" ${!gm || actionPending || !number(state[side]) ? "disabled" : ""} title="${gm ? `Spend one ${side} point` : "GM controls Story Point spending"}">Spend</button></div>`).join("")}`;
}

function installDrag() {
  let drag = null;
  let frame = 0;
  const paint = () => {
    frame = 0;
    if (drag) counter.style.transform = `translate3d(${drag.dx}px, ${drag.dy}px, 0)`;
  };
  counter.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !event.target.closest(".genesys-sp-counter-grip-v1833")) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: Number.parseFloat(counter.style.left), top: Number.parseFloat(counter.style.top), dx: 0, dy: 0 };
    counter.setPointerCapture?.(event.pointerId);
    counter.classList.add("is-dragging");
  });
  counter.addEventListener("pointermove", (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const next = clampPosition({ left: drag.left + event.clientX - drag.x, top: drag.top + event.clientY - drag.y });
    drag.dx = next.left - drag.left;
    drag.dy = next.top - drag.top;
    if (!frame) frame = requestAnimationFrame(paint);
    event.preventDefault();
  });
  const finish = (event) => {
    if (!drag || (event?.pointerId !== undefined && drag.id !== event.pointerId)) return;
    const next = { left: drag.left + drag.dx, top: drag.top + drag.dy };
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    drag = null;
    counter.style.transform = "none";
    counter.classList.remove("is-dragging");
    applyPosition(next);
    void savePosition();
  };
  counter.addEventListener("pointerup", finish);
  counter.addEventListener("pointercancel", finish);
}

function installCounter() {
  if (counter?.isConnected) return;
  counter = document.createElement("aside");
  counter.className = "genesys-story-point-counter-v1833";
  counter.setAttribute("aria-label", "Genesys Story Point pools");
  document.body.append(counter);
  renderCounter();
  applyPosition(game.settings.get(SYSTEM_ID, POSITION_SETTING));
  installDrag();
  counter.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-spend-side]");
    if (!button || button.disabled || !game?.user?.isGM || actionPending) return;
    actionPending = true;
    const side = button.dataset.spendSide;
    renderCounter();
    try { await game?.genesysStoryPoints?.spend?.(side); }
    catch (error) { ui?.notifications?.warn?.(error?.message ?? "Story Point transfer failed."); }
    finally { actionPending = false; renderCounter(); }
  });
}

Hooks.once("init", () => {
  game.settings.register(SYSTEM_ID, POSITION_SETTING, {
    name: "Story Point Counter Position",
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });
});

Hooks.once("ready", () => {
  installCounter();
  window.addEventListener("resize", () => applyPosition(game.settings.get(SYSTEM_ID, POSITION_SETTING)));
});
Hooks.on("genesysStoryPointsChanged", renderCounter);

