# The Interaction Loop — Student Workspace

## What You're Building

You'll implement the combat system. 8 enemies patrol the world around you. When done, you can attack them, they'll fight back, you can heal with potions, and quest progress will track your kills and collections.

## Setup

```bash
npm install
npm run dev
```

Opens at `http://localhost:4005`

## Before You Start

This lesson **builds on Lesson 4**. The following functions from Lesson 4 are pre-filled in `src/student.js` — paste your own solutions in the marked stubs if you want to use your own code:

- `createPlayer` ✅ pre-filled
- `movePlayer` — paste your Lesson 4 solution
- `getSpeedMultiplier` — paste your Lesson 4 solution
- `collectItem` — paste your Lesson 4 solution
- `checkLevelUp` ✅ pre-filled

## Your Task

Open `src/student.js` and implement the 5 new functions at the bottom:

| Task | Function | What it does |
|------|----------|--------------|
| 1 | `spawnEnemy(type)` | Create an enemy using `createEnemyTemplate(type)` |
| 2 | `attackEnemy(player, enemy)` | Deal damage with combo system, award XP on kill |
| 3 | `enemyAttack(enemy, player)` | Enemy deals damage to player |
| 4 | `usePotion(player)` | Heal up to 55 HP, consume one potion |
| 5 | `updateQuestProgress(quests, type, amount)` | Advance quest progress, mark complete |

## How It Works

- 8 enemies spawn around your start position
- SPACE or J to attack nearby enemies
- F to use a potion
- E to interact with NPCs and pick up items
- The enemy counter at the top shows how many remain

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| SPACE / J | Attack |
| Q | Dodge roll |
| F | Use potion |
| E | Interact / pick up |
| Mouse | Camera |
| Scroll | Zoom |

## Reference

All constants are in `src/engine.js` (read-only):

- `ENEMY_TYPES` — stats for each enemy type (hp, atk, spd, xp, etc.)
- `createEnemyTemplate(type)` — creates a base enemy object
- `QUEST_TEMPLATES` — available quest definitions

## Damage Formula

```js
newCombo = (player.comboCount + 1) % 4
isBig    = (newCombo === 3)
damage   = 12 + player.level * 3 + (isBig ? 22 : 0) + Math.floor(Math.random() * 8)
```

## Tips

- `attackEnemy` must return `{ player, enemy, damage, killed, isBig }` — all fields required
- `enemyAttack` sets `player.invincible = 0.42` to prevent instant re-hits
- `updateQuestProgress` uses `.map()` — return a new array, don't mutate
