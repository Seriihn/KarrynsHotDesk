# Karryn's Hot Desk

Adds two Receptionist battle actions for Karryn:

- `Charm Goblin`
- `Strip Down`

## Version

- `1.3.0`

## What it does

- Creates a custom `Charm Goblin` skill that can target a goblin behind Karryn and force an immediate receptionist sex join.
- Creates a custom `Strip Down` skill that instantly removes Karryn's clothes and panties.
- Installs both custom skills from receptionist base skills at runtime.
- Ensures Karryn learns both skills automatically:
  - on skill setup
  - on new game object creation
  - after save load extraction
- Patches battle/action/log flows so the charm action executes and displays custom text instead of malformed kick-away messaging.

## Files

- `www/mods/KarrynsHotDesk.js`
