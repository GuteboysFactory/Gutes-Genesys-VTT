import { registerReactionProvider } from "./reaction-service.js";
import { getMagicBarrierReaction } from "./magic-effect-rules-v1810.js";

const SYSTEM_ID = "genesys-vtt";
const VERSION = "0.0.1810";

Hooks.once("ready", () => {
  registerReactionProvider((actor, context) => {
    if (context?.timing !== "pre-commit") return [];
    if (!context?.tags?.includes?.("combat") || !context?.tags?.includes?.("hit")) return [];
    const reaction = getMagicBarrierReaction(actor);
    return reaction ? [reaction] : [];
  });
  console.log(`${SYSTEM_ID} | ${VERSION} Magic Barrier combat runtime ready`);
});
