# QA protocol — v0.0.1819 Actions layout correction

## Layout

1. Update through the QA manifest and confirm the sheet reports `v0.0.1819`.
2. Open **Actions** on a wide character sheet.
3. Confirm the **Actions** toolbar and collapsed **Dice Tools** share the top row at equal width.
4. Expand Dice Tools and confirm it remains inside the right half without covering other controls.
5. Confirm the lower workspace reads left-to-right as:
   - General Actions — approximately 25%
   - Combat Actions — approximately 50%
   - Custom Actions with Talent Actions directly below — approximately 25%
6. Resize the sheet narrower and confirm the columns reflow without horizontal overflow.

## Regression

- Send a Boost or Setback through Narrative Dice Transfer.
- Confirm the recipient inbox, next-roll consumption, and sender line still work.
- Create, edit, and delete a Custom Action.
- Make one weapon attack from Combat Actions.
