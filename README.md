# Karryn's Hot Desk

Adds four Receptionist battle actions for Karryn:

- `Charm Goblin (Pussy)`
- `Charm Goblin (Anal)`
- `Charm Goblin (Cunni)`
- `Strip Down`

## Version

- `1.4.0`

## What it does

- Creates three custom `Charm Goblin` skills that can target a goblin behind Karryn and force immediate receptionist sex by selected type (`Pussy`, `Anal`, or `Cunni`).
- Creates a custom `Strip Down` skill that instantly removes Karryn's clothes and panties.
- Builds all four skills from receptionist base skills at runtime.
- Ensures Karryn learns all four skills automatically on:
  - skill setup
  - new game object creation
  - save load extraction
- Uses sex-type-specific Charm combat log replacements (`Pussy`, `Anal`, `Cunni`).
- Chooses normal vs extreme Charm replacement text based on Karryn cock desire (`<= 100` normal, `> 100` extreme).
- Replaces malformed `Karryn kicks Karryn away!` log lines in Charm flows with the selected Charm replacement text.

## Files

- `www/mods/KarrynsHotDesk.js`
