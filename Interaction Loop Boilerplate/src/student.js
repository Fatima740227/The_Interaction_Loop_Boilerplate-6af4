// ============================================================
//  LESSON 5 — Combat, Loot & Quests
//  ✏️  Write your Lesson 5 code in the marked section below.
//  Do NOT modify engine.js or App.jsx
//
//  Lesson 4 code is pre-filled and working — do not change it.
//  Your Lesson 5 code goes at the bottom.
// ============================================================

import { ENEMY_TYPES, createEnemyTemplate } from './engine.js'

// ════════════════════════════════════════════════════════════
//  ✅ LESSON 4 — Complete (do not change)
// ════════════════════════════════════════════════════════════

export function createPlayer(startX = 0, startY = 0) {
  return {
    x: startX,
    y: startY,
    hp: 120,
    maxHp: 120,
    stamina: 100,
    maxStamina: 100,
    xp: 0,
    level: 1,
    gold: 0,
    potions: 3,
    kills: 0,
    state: 'idle',
    dir: 'down',
    facingDir: 'right',
    comboCount: 0,
    invincible: 0,
    attackCd: 0,
    dodgeCd: 0,
    score: 0,
  }
}

export function movePlayer(player, direction, tiles) {
  const TILE_S = 48, WORLD_W = 20, WORLD_H = 15
  let newX = player.x
  let newY = player.y
  if (direction === 'up')    newY -= TILE_S
  if (direction === 'down')  newY += TILE_S
  if (direction === 'left')  newX -= TILE_S
  if (direction === 'right') newX += TILE_S
  const tx = Math.floor(newX / TILE_S)
  const ty = Math.floor(newY / TILE_S)
  if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) return player
  const T = { DEEP_SEA:0, SEA:1, ROCK:8, MOUNTAIN:9 }
  const t = tiles[ty][tx]
  if (t === T.DEEP_SEA || t === T.SEA || t === T.ROCK || t === T.MOUNTAIN) return player
  return { ...player, x: newX, y: newY, dir: direction, facingDir: direction === 'left' ? 'left' : 'right', state: 'walking' }
}

export function getSpeedMultiplier(player, tiles) {
  const TILE_S = 48, WORLD_W = 20, WORLD_H = 15
  const tx = Math.floor(player.x / TILE_S)
  const ty = Math.floor(player.y / TILE_S)
  if (tx < 0 || tx >= WORLD_W || ty < 0 || ty >= WORLD_H) return 1.0
  const T = { SHALLOW:2, FOREST:6, DENSE_FOREST:7, BAMBOO:14, TALL_GRASS:5, PATH:11, BRIDGE:16, SNOW:10 }
  const t = tiles[ty][tx]
  if (t === T.SHALLOW) return 0.5
  if (t === T.FOREST || t === T.DENSE_FOREST || t === T.BAMBOO) return 0.72
  if (t === T.TALL_GRASS) return 0.85
  if (t === T.PATH || t === T.BRIDGE) return 1.18
  if (t === T.SNOW) return 0.78
  return 1.0
}

export function collectItem(player, item) {
  if (item.type === 'coin') {
    return { player: { ...player, gold: player.gold + 10 }, message: '💰 +10 gold' }
  }
  if (item.type === 'potion') {
    return { player: { ...player, potions: player.potions + 1 }, message: '🧪 +1 potion' }
  }
  return { player, message: '' }
}

export function checkLevelUp(player) {
  const threshold = player.level * 150
  if (player.xp >= threshold) {
    return {
      player: {
        ...player,
        level: player.level + 1,
        xp: player.xp - threshold,
        maxHp: player.maxHp + 12,
        hp: player.maxHp + 12,
        maxStamina: player.maxStamina + 5,
        stamina: player.maxStamina + 5,
      },
      leveledUp: true,
    }
  }
  return { player, leveledUp: false }
}

// ════════════════════════════════════════════════════════════
//  ✏️ LESSON 5 — Write your code below
// ════════════════════════════════════════════════════════════

// ── TASK 1 ───────────────────────────────────────────────────
// spawnEnemy(type)
// Use createEnemyTemplate(type) from engine.js.
// Set a random angle: Math.random() * Math.PI * 2
// Returns the enemy object.

export function spawnEnemy(type) {
    const enemy = createEnemyTemplate(type)
    enemy.angle = Math.random() * Math.PI * 2
    return enemy
  }

  // Test: in the browser, 8 enemies should appear around the player when the game starts.
  // If this function is broken, no enemies will appear.


// ── TASK 2 ───────────────────────────────────────────────────
// attackEnemy(player, enemy)
// Damage formula:
//   newCombo = (player.comboCount + 1) % 4
//   isBig    = (newCombo === 3)
//   damage   = 12 + player.level * 3 + (isBig ? 22 : 0) + Math.floor(Math.random() * 8)
//
// Apply damage to enemy.hp (min 0).
// If killed:
//   enemy.alive = false
//   player.xp   += ENEMY_TYPES[enemy.type].xp
//   player.gold  += Math.floor(ENEMY_TYPES[enemy.type].xp * 0.5)
//   player.kills += 1
//   player.score += ENEMY_TYPES[enemy.type].xp * 10
//
// Returns: { player, enemy, damage, killed, isBig }

export function attackEnemy(player, enemy) {
    const newCombo = (player.comboCount + 1) % 4
    const isBig = newCombo === 3
    const damage = 12 + player.level * 3 + (isBig ? 22 : 0) + Math.floor(Math.random() * 8)
    const newHp = Math.max(0, enemy.hp - damage)
    const killed = newHp <= 0
    let p = { ...player, comboCount: newCombo }

    if (killed) {
      p.xp += ENEMY_TYPES[enemy.type].xp
      p.gold += Math.floor(ENEMY_TYPES[enemy.type].xp * 0.5)
      p.kills += 1
      p.score += ENEMY_TYPES[enemy.type].xp * 10
    }
  }



// ── TASK 3 ───────────────────────────────────────────────────
// enemyAttack(enemy, player)
// damage = ENEMY_TYPES[enemy.type].atk + Math.floor(Math.random() * 7)
// player.hp = Math.max(0, player.hp - damage)
// player.invincible = 0.42
// Returns: { player, damage }

export function enemyAttack(enemy, player) {
    const damage = ENEMY_TYPES[enemy.type].atk + Math.floor(Math.random() * 7)
    return {
      player: { ...player, hp: Math.max(0, player.hp - damage), invincible: 0.42 },
      damage,
    }
  }

// ── TASK 4 ───────────────────────────────────────────────────
// usePotion(player)
// If player.potions <= 0: return { player, healed: 0 }
// heal = Math.min(55, player.maxHp - player.hp)
// player.hp += heal
// player.potions -= 1
// Returns: { player, healed }

export function usePotion(player) {
    if (player.potions <= 0) return { player, healed: 0 }

    const heal = Math.min(55, player.maxHp - player.hp)

    return {
      player: { ...player, hp: player.hp + heal, potions: player.potions - 1 },
      healed: heal,
    }
  }


// ── TASK 5 ───────────────────────────────────────────────────
// updateQuestProgress(quests, type, amount)
// For each quest:
//   Skip if quest.completed or quest.type !== type
//   quest.progress = (quest.progress ?? 0) + amount
//   If quest.progress >= quest.count: quest.completed = true
// Returns updated quests array (use .map())



export function updateQuestProgress(quests, type, amount) {
  return quests.map(q => {
    if (q.completed || q.type !== type) return q
    const progress = (q.progress ?? 0) + amount
    return { ...q, progress, completed: progress >= (q.count ?? 1) }
  })
}

