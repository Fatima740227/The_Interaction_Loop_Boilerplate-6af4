// ── Lesson 5 Engine — matches main game exactly ───────────────

// From src/data/worldData.js — exact same ENEMY_TYPES
export const ENEMY_TYPES = {
  RONIN:  { name:'Rogue Ronin',    hp:60,  atk:15, spd:1.2, range:55, color:'#8a3010', xp:40  },
  BANDIT: { name:'Forest Bandit',  hp:40,  atk:10, spd:1.5, range:50, color:'#5a4020', xp:25  },
  GUARD:  { name:'Corrupted Guard',hp:80,  atk:20, spd:1.0, range:60, color:'#303060', xp:60  },
  DEMON:  { name:'Mountain Oni',   hp:120, atk:30, spd:0.8, range:70, color:'#8a0010', xp:100 },
  ARCHER: { name:'Shadow Archer',  hp:35,  atk:18, spd:1.8, range:200,color:'#1a3a10', xp:35  },
}

// From src/data/worldData.js — exact same QUEST_TEMPLATES (subset for lesson)
export const QUEST_TEMPLATES = [
  { id:'rid_bandits', title:'Clear the Bandits', desc:'Defeat 5 enemies.', type:'kill', count:5,  reward:200 },
  { id:'coin_gather', title:'Tribute Collection', desc:'Collect 3 items.',  type:'collect', count:3, reward:160 },
]

// Player shape matching main game GameCanvas.jsx
export function createDefaultPlayer() {
  return {
    x: 0, y: 0,
    hp: 120, maxHp: 120,
    stamina: 100, maxStamina: 100,
    xp: 0, level: 1, gold: 0, potions: 3,
    kills: 0, state: 'idle', dir: 'down',
    facingDir: 'right', comboCount: 0,
    attackCd: 0, invincible: 0,
  }
}

// Enemy shape matching main game WorldGenerator.js
export function createEnemyTemplate(type, x = 0, y = 0) {
  const stats = ENEMY_TYPES[type]
  return {
    id: `e_${Date.now()}`, type,
    x, y, homeX: x, homeY: y,
    hp: stats.hp, maxHp: stats.hp,
    state: 'patrol', angle: 0,
    patrolTimer: 0, alertTimer: 0,
    attackTimer: 0, alive: true,
  }
}
