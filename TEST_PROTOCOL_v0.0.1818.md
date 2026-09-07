# QA protocol — v0.0.1818 Narrative Dice Transfer

## Install

Use the QA manifest and confirm the character sheet footer reports `v0.0.1818`.

## Core transfer

1. Open a character and expand **Actions → Dice Tools**.
2. Under **Narrative Dice Transfer**, send one Boost to the same character.
3. Confirm the incoming list shows the die, count, and sending Actor.
4. Reload Foundry and confirm the incoming die remains.
5. Roll a Skill check. Confirm the Boost appears in the rolled pool and the chat card names the sender.
6. Roll again. Confirm the Boost is no longer added.

## Roll surfaces

Repeat with one waiting die for each surface:

- Quick Dice Pool
- Skill check
- Weapon attack against a target
- Magic action
- Advanced Check Setup

Each waiting die must be consumed by the first actual roll only.

## Player and GM relay

1. Log in with a GM and a player.
2. From the player's owned Actor, send a Boost to another Actor the player does not own.
3. Confirm the recipient receives it while the GM is online.
4. Roll for the recipient and confirm the die and sender appear.
5. Try the same operation without an active GM; confirm a clear error appears and no false success is reported.

## Regression

- Open old and newly created characters.
- Confirm the portrait remains square and the Forge crop still matches the sheet.
- Confirm Dice Tools remains fixed beside Actions and can collapse normally.
- Confirm Talent descriptions in Character Creator still expand and match Talent Library.
