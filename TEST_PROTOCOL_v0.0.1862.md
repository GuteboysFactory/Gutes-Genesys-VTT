# v0.0.1862 — Hard to Kill soak

1. Use a PC with Hard to Kill at Base and stored soak 2. Activate Heroic and resolve a standard weapon hit: effective soak should be 6.
2. End the effect and repeat: soak returns to 2 without changing stored actor data.
3. Check Pierce through normal attack resolution. Do not manually add another +4.
4. Improved also receives +4 soak, but apply its difficulty increase manually for now. Supreme immunity is entirely manual in this slice.

Sheet displays stored soak. Live Foundry combat testing remains pending. Automated helper tests cover active/inactive, power level and unrelated abilities; existing combat regressions also run.

Next: remaining Hard to Kill mechanics and effective-soak presentation, then Miraculous Recovery.
