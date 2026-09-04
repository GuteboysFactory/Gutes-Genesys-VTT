# Genesys Dice Renderer Protocol v1

Protocol id: `genesys-dice-renderer-v1`

The Genesys VTT system owns all narrative dice rules and RNG. External renderers such as Genesys Dice Forge are presentation layers only. They receive an already-resolved roll and must animate the exact faces supplied by the system.

## Registration

After the Genesys VTT `ready` lifecycle, a renderer can register directly:

```js
const api = game.genesysDice;
api.registerRenderer({
  id: "genesys-dice-forge",
  label: "Genesys Dice Forge",
  protocol: api.protocol,
  priority: 100,
  capabilities: {
    threeDimensional: true,
    exactFaceLanding: true,
    sound: true,
    multiDiePool: true
  },
  canRender: async (request) => true,
  render: async (request) => {
    // Animate request.dice and resolve only when the animation is complete.
  }
});
```

A module that initializes before the system bridge can also listen for:

```js
Hooks.once("genesysVttDiceRendererApiReady", (api) => {
  // register renderer here
});
```

## Request

The renderer receives one immutable request object:

```js
{
  protocol: "genesys-dice-renderer-v1",
  rollId: "genesys-...",
  systemId: "genesys-vtt",
  systemVersion: "0.0.164",
  pool: {
    boost: 1,
    ability: 2,
    proficiency: 1,
    setback: 0,
    difficulty: 2,
    challenge: 1
  },
  dice: [
    {
      index: 0,
      type: "ability",
      faceIndex: 5,
      faceNumber: 6,
      symbols: { success: 1, advantage: 1 }
    }
  ],
  net: {
    success: 1,
    failure: 0,
    advantage: 1,
    threat: 0,
    triumph: 0,
    despair: 0
  },
  context: {
    sourceType: "skill-check",
    sourceId: "athletics",
    sourceLabel: "Athletics",
    actorId: "...",
    actorName: "...",
    itemId: "...",
    targetId: "...",
    metadata: {}
  }
}
```

## Exact face contract

`faceIndex` is zero-based and maps directly to the Genesys VTT canonical die face ordering. `faceNumber` is the same value plus one for human-readable diagnostics.

Dice Forge must not reroll the pool. It should animate each physical model so the supplied face is the final upward/result face.

Canonical die model mapping:

- `boost` -> light blue d6
- `setback` -> black d6
- `ability` -> green d8
- `difficulty` -> purple d8
- `proficiency` -> yellow d12
- `challenge` -> red d12

## Completion and fallback

The renderer's `render(request)` function returns a Promise. Resolve the Promise when the visual roll is complete. Genesys VTT waits before creating the normal chat result on integrated roll paths.

If a renderer throws, rejects, times out, or reports `canRender(request) === false`, Genesys VTT automatically falls back to the next registered renderer or to no-animation system presentation. Rules and the rolled result are never lost.

The bridge currently uses a 15 second defensive timeout unless a caller explicitly supplies another timeout.

## Hooks

The system emits:

- `genesysVttDiceRendererApiReady(api)`
- `genesysVttDiceRendererRegistered(renderer)`
- `genesysVttDiceRendererUnregistered(rendererId)`
- `genesysVttBeforeDicePresentation(request)`
- `genesysVttAfterDicePresentation(request, presentation)`
- `genesysVttDiceRendererFailed(request, renderer, error)`

## System API

`game.genesysDice` exposes:

- `protocol`
- `registerRenderer(renderer, options)`
- `unregisterRenderer(id)`
- `listRenderers()`
- `buildRequest(result, context)`
- `presentResolved(result, context)`
- `roll(pool, context)`

The bridge is intentionally optional. Genesys VTT must remain fully playable when no external renderer is installed.
