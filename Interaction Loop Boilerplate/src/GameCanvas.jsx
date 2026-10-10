import React, { useRef, useEffect, useCallback, forwardRef } from 'react'
import { T, TILE_S, WORLD_W, WORLD_H, ENEMY_TYPES, NPC_TYPES, QUEST_TEMPLATES } from './worldData.js'
import { generateWorld, getBiome } from './WorldGenerator.js'
import { ThreeRenderer } from './ThreeRenderer.js'
import { generateNPCDialogue, generateAreaNarration, getWeather } from './api.js'
import { playSwordSlash, playHit, playPlayerHurt, playDodge, playFootstep, playPickup, playEnemyDeath, playLevelUp, playDiscovery, startWind, playShrinebell } from './AudioEngine.js'
import { saveGame, loadGame, applySaveToWorld } from './SaveSystem.js'

// ── Student functions (called by engine) ─────────────────────
import { createPlayer, checkLevelUp, spawnEnemy, attackEnemy, enemyAttack, usePotion, updateQuestProgress } from './student.js'

const SPD=185, MAX_HP=120, MAX_ST=100, ATK_CD=0.45, DODGE_CD=0.85, I_RANGE=90, E_DETECT=170, BOSS_HP=320, BOSS_ATK=28
const SURF={[T.PATH]:'path',[T.BRIDGE]:'path',[T.VILLAGE]:'path',[T.BEACH]:'sand',[T.SNOW]:'snow',[T.FOREST]:'grass',[T.DENSE_FOREST]:'grass',[T.GRASS]:'grass',[T.TALL_GRASS]:'grass'}
const GAME_KEYS=[' ','arrowup','arrowdown','arrowleft','arrowright','tab','f','e','q','j','r','b','p','m','w','a','s','d']
const ENEMY_COUNT = 8  // Lesson 5: 5-10 enemies only



const GameCanvas = forwardRef(function GameCanvas({ groqKey, onHudUpdate, savedSlot=null }, fwdRef) {
  const mountRef=useRef(null), threeRef=useRef(null), gsRef=useRef(null)
  const inp=useRef({}), rafRef=useRef(null), dmg=useRef([])
  const mouse=useRef({locked:false}), death=useRef({dead:false,timer:0,countdown:4})

  useEffect(() => {
    if (groqKey) globalThis.__GROQ_KEY = groqKey
    const world = generateWorld()
    const W=window.innerWidth, H=window.innerHeight

    // createPlayer() — student must implement
    const player = createPlayer(world.startX, world.startY)
    player.walkFrame = 0; player.facingYaw = 0
    player.attackTimer = 0; player.attackCd = 0
    player.dodgeTimer = 0; player.dodgeCd = 0
    player.dodgeVx = 0; player.dodgeVy = 0
    player.hitFlash = 0; player.comboTimer = 0

    // spawnEnemy() — student must implement; place enemies around start
    const nearEnemies = []
    const types = ['BANDIT','RONIN','ARCHER','GUARD','DEMON']
    for (let idx = 0; idx < ENEMY_COUNT; idx++) {
      const type = types[idx % types.length]
      const angle = (idx / ENEMY_COUNT) * Math.PI * 2
      const radius = 200 + Math.random() * 300
      const ex = world.startX + Math.cos(angle) * radius
      const ey = world.startY + Math.sin(angle) * radius
      const e = spawnEnemy(type)
      e.x = ex; e.y = ey; e.homeX = ex; e.homeY = ey; e.facingDir = 'right'
      nearEnemies.push(e)
    }

    gsRef.current = {
      world, player, enemies: nearEnemies, npcs: world.npcs, items: world.items,
      camera:{x:world.startX-W/2, y:world.startY-H/2}, W, H,
      timeOfDay:8.5, weather:'clear', currentBiome:'coast',
      locationName:world.locations[0]?.name??'Tsurumi Village',
      activeQuests:[], completedQuests:[], dialogueQueue:[],
      narration:'', narrationTimer:0, paused:false, showMinimap:true,
      gameTime:0, bossFight:null, score:0,
    }
    if (savedSlot!==null) { const s=loadGame(savedSlot); if(s) applySaveToWorld(s,gsRef.current) }
    const three = new ThreeRenderer(mountRef.current)
    threeRef.current = three
    three.buildTerrain(world.tiles, world.heights)
    startWind(0.3)
    getWeather().then(w => { if(gsRef.current) gsRef.current.weather=w })
    assignStarterQuests(gsRef.current)
    setTimeout(() => generateAreaNarration(gsRef.current.locationName,'coast','morning','clear')
      .then(n => { if(n&&gsRef.current){gsRef.current.narration=n;gsRef.current.narrationTimer=6} }), 500)
    let lastT=0
    const loop = ts => {
      const dt=Math.min((ts-lastT)/1000,0.05); lastT=ts
      try { if(gsRef.current&&!gsRef.current.paused){update(dt);threeRef.current?.render(gsRef.current)} }
      catch(e){console.error('loop:',e)}
      rafRef.current=requestAnimationFrame(loop)
    }
    rafRef.current=requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(rafRef.current); threeRef.current?.dispose(); threeRef.current=null }
  }, [])

  useEffect(() => {
    const down = e => {
      const k=e.key.toLowerCase()
      if(GAME_KEYS.includes(k)) e.preventDefault()
      inp.current[k]=true
      const gs=gsRef.current
      if(k==='p'&&gs) gs.paused=!gs.paused
      if(k==='m'&&gs) gs.showMinimap=!gs.showMinimap
      if(k==='tab') onHudUpdate&&onHudUpdate(p=>({...p,_tabToggle:(p?._tabToggle??0)+1}))
      if(k==='r'&&gs&&gs.player.hp<=0){restartGame(gs,gs.world,death);onHudUpdate&&onHudUpdate(p=>({...p,deathScreen:null}))}
      if(k==='escape'&&document.pointerLockElement) document.exitPointerLock()
    }
    const up = e => { inp.current[e.key.toLowerCase()]=false }
    document.addEventListener('keydown',down); document.addEventListener('keyup',up)
    return () => { document.removeEventListener('keydown',down); document.removeEventListener('keyup',up) }
  }, [onHudUpdate])

  useEffect(() => {
    const el=mountRef.current; if(!el) return
    const onClick=()=>{ if(document.pointerLockElement!==el) el.requestPointerLock() }
    const onPLC=()=>{ mouse.current.locked=document.pointerLockElement===el }
    const onMove=e=>{ if(mouse.current.locked) threeRef.current?.orbitCamera(e.movementX,e.movementY) }
    const onCtx=e=>{ e.preventDefault(); if(document.pointerLockElement===el) document.exitPointerLock() }
    const onWheel=e=>{ e.preventDefault(); threeRef.current?.zoomCamera(e.deltaY) }
    el.addEventListener('click',onClick); el.addEventListener('wheel',onWheel,{passive:false}); el.addEventListener('contextmenu',onCtx)
    document.addEventListener('pointerlockchange',onPLC); document.addEventListener('mousemove',onMove)
    return () => {
      el.removeEventListener('click',onClick); el.removeEventListener('wheel',onWheel); el.removeEventListener('contextmenu',onCtx)
      document.removeEventListener('pointerlockchange',onPLC); document.removeEventListener('mousemove',onMove)
      if(document.pointerLockElement===el) document.exitPointerLock()
    }
  }, [])

  function tileAt(wx,wy){const tx=~~(wx/TILE_S),ty=~~(wy/TILE_S);if(tx<0||tx>=WORLD_W||ty<0||ty>=WORLD_H)return T.DEEP_SEA;return gsRef.current.world.tiles[ty*WORLD_W+tx]}
  function walkable(wx,wy){const t=tileAt(wx,wy);return t!==T.DEEP_SEA&&t!==T.SEA&&t!==T.ROCK&&t!==T.MOUNTAIN}
  function spdMult(wx,wy){const t=tileAt(wx,wy);if(t===T.SHALLOW)return 0.5;if(t===T.FOREST||t===T.DENSE_FOREST||t===T.BAMBOO)return 0.72;if(t===T.TALL_GRASS)return 0.85;if(t===T.PATH||t===T.BRIDGE)return 1.18;if(t===T.SNOW)return 0.78;return 1}
  function dist(ax,ay,bx,by){const dx=ax-bx,dy=ay-by;return Math.sqrt(dx*dx+dy*dy)}
  function addDmg(x,y,v,type='enemy'){dmg.current.push({x,y:y-30,dmg:v,type,life:60})}
  function narrate(gs,text,t=5){gs.narration=text;gs.narrationTimer=t}

  function update(dt) {
    const gs=gsRef.current; if(!gs) return
    const {player,world,camera}=gs, i=inp.current
    gs.gameTime+=dt; gs.timeOfDay=(gs.timeOfDay+dt*(24/180))%24
    const biome=getBiome(world.tiles,player.x,player.y)
    if(biome!==gs.currentBiome){
      gs.currentBiome=biome
      generateAreaNarration(gs.locationName,biome,gs.timeOfDay<6?'night':gs.timeOfDay<12?'morning':gs.timeOfDay<18?'afternoon':'evening',gs.weather)
        .then(n=>{if(n&&gsRef.current){gsRef.current.narration=n;gsRef.current.narrationTimer=5.5}})
    }
    gs.narrationTimer=Math.max(0,gs.narrationTimer-dt)
    player.attackCd=Math.max(0,player.attackCd-dt); player.dodgeCd=Math.max(0,player.dodgeCd-dt)
    player.attackTimer=Math.max(0,player.attackTimer-dt*22); player.dodgeTimer=Math.max(0,player.dodgeTimer-dt*24)
    player.hitFlash=Math.max(0,player.hitFlash-dt*4); player.invincible=Math.max(0,player.invincible-dt)
    player.comboTimer=Math.max(0,player.comboTimer-dt); if(player.comboTimer<=0) player.comboCount=0
    if(player.state!=='dodging') player.stamina=Math.min(player.maxStamina,player.stamina+dt*20)
    const dodging=player.state==='dodging'&&player.dodgeTimer>0
    const attacking=player.state==='attacking'&&player.attackTimer>0
    const mu=i['arrowup']||i['w'], md=i['arrowdown']||i['s'], ml=i['arrowleft']||i['a'], mr=i['arrowright']||i['d']

    if(dodging){
      const ddx=player.dodgeVx*SPD*1.8*dt, ddy=player.dodgeVy*SPD*1.8*dt
      if(walkable(player.x+ddx,player.y)) player.x+=ddx
      if(walkable(player.x,player.y+ddy)) player.y+=ddy
      player.dodgeTimer-=1; if(player.dodgeTimer<=0) player.state='idle'
    } else if(!attacking) {
      let ix=(mr?1:0)-(ml?1:0), iy=(md?1:0)-(mu?1:0)
      if(ix!==0||iy!==0){
        const mag=Math.sqrt(ix*ix+iy*iy); ix/=mag; iy/=mag
        const yaw=threeRef.current?.getCameraYaw()??0
        const vx=ix*Math.cos(yaw)+iy*Math.sin(yaw), vy=-ix*Math.sin(yaw)+iy*Math.cos(yaw)
        const spd=SPD*spdMult(player.x,player.y)*dt
        if(walkable(player.x+vx*spd+vx*12,player.y)) player.x+=vx*spd
        if(walkable(player.x,player.y+vy*spd+vy*12)) player.y+=vy*spd
        player.facingYaw=Math.atan2(vx,vy); player.facingDir=vx>0?'right':'left'
        player.dir=Math.abs(vx)>Math.abs(vy)?(vx>0?'right':'left'):(vy>0?'down':'up')
        player.state='walking'; player.walkFrame+=dt*9
        playFootstep(SURF[tileAt(player.x,player.y)]??'grass')
      } else player.state='idle'
    }

    // ── TASK 2: attackEnemy() ─────────────────────────────
    if((i[' ']||i['j'])&&player.attackCd<=0&&!dodging&&player.hp>0){
      player.state='attacking'; player.attackTimer=22; player.attackCd=ATK_CD
      i[' ']=false; i['j']=false; playSwordSlash(player.comboCount)
      const rng=player.comboCount===3?100:70
      for(const e of gs.enemies){
        if(!e.alive||dist(player.x,player.y,e.x,e.y)>=rng) continue
        // attackEnemy() — student must implement
        const res = attackEnemy({...player}, {...e})
        Object.assign(player, res.player)
        Object.assign(e, res.enemy)
        addDmg(e.x, e.y-20, res.damage)
        playHit(res.isBig)
        if (res.killed) {
          e.alive = false; e.state = 'dead'
          playEnemyDeath()
          // updateQuestProgress() — student must implement
          gs.activeQuests = updateQuestProgress([...gs.activeQuests], 'kill', 1)
          // checkLevelUp() — student must implement
          const lvRes = checkLevelUp({...player})
          if (lvRes.leveledUp) { Object.assign(player, lvRes.player); narrate(gs,`★ Level Up! Lv ${player.level}`); playLevelUp() }
        }
      }
      player.comboCount=(player.comboCount+1)%4; player.comboTimer=0.85
    }

    // Dodge
    if(i['q']&&player.dodgeCd<=0&&player.stamina>=22&&player.hp>0){
      const yaw=threeRef.current?.getCameraYaw()??0
      const dm={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}
      const [lx,ly]=dm[player.dir]??[0,1]
      player.state='dodging'; player.dodgeTimer=13; player.dodgeCd=DODGE_CD
      player.dodgeVx=lx*Math.cos(yaw)+ly*Math.sin(yaw); player.dodgeVy=-lx*Math.sin(yaw)+ly*Math.cos(yaw)
      player.stamina-=22; player.invincible=0.45; i['q']=false; playDodge()
    }

    // Interact / collect
    if(i['e']&&player.hp>0){
      i['e']=false
      if(gs.dialogueQueue.length>0){
        gs.dialogueQueue.shift()
        onHudUpdate&&onHudUpdate(p=>({...p,dialogue:gs.dialogueQueue[0]??null}))
      } else {
        for(const npc of gs.npcs){
          if(dist(player.x,player.y,npc.x,npc.y)<I_RANGE){
            const ph={speaker:npc.name,text:'...'}
            gs.dialogueQueue=[ph]; onHudUpdate&&onHudUpdate(p=>({...p,dialogue:ph}))
            generateNPCDialogue(npc.name,'Wanderer',gs.locationName,`${gs.currentBiome}, ${gs.weather}, lv${player.level}`)
              .then(text=>{ if(!gsRef.current) return; const msg={speaker:npc.name,text}; gsRef.current.dialogueQueue=[msg]; onHudUpdate&&onHudUpdate(p=>({...p,dialogue:msg})) })
            break
          }
        }
        for(const it of gs.items){
          if(!it.collected&&dist(player.x,player.y,it.x,it.y)<55){
            it.collected=true
            if(it.type==='coin'){player.gold+=5+~~(Math.random()*12);playPickup('coin')}
            if(it.type==='potion'){player.potions+=1;playPickup('potion')}
            addDmg(player.x,player.y-30,it.type==='coin'?player.gold:1,'heal')
            // updateQuestProgress() — student must implement
            gs.activeQuests = updateQuestProgress([...gs.activeQuests], 'collect', 1)
          }
        }
      }
    }

    // usePotion() — student must implement
    if(i['f']&&player.hp>0){
      i['f']=false
      const res = usePotion({...player})
      if (res.healed > 0) { Object.assign(player, res.player); addDmg(player.x, player.y-30, res.healed, 'heal') }
    }

    // Save
    if(i['s']&&(i['control']||i['meta'])){i['s']=false;saveGame(0,gs);narrate(gs,'💾 Game saved.',2)}

    // Death
    if(player.hp<=0){
      const dr=death.current
      if(!dr.dead){dr.dead=true;dr.countdown=4;dr.kills=player.kills;dr.level=player.level;dr.score=gs.score;onHudUpdate&&onHudUpdate(p=>({...p,deathScreen:{countdown:4,kills:dr.kills,level:dr.level,score:dr.score}}))}
      dr.timer+=dt; dr.countdown=Math.max(0,4-Math.floor(dr.timer))
      onHudUpdate&&onHudUpdate(p=>p?.deathScreen?{...p,deathScreen:{...p.deathScreen,countdown:dr.countdown}}:p)
      if(dr.timer>=4){restartGame(gs,world,death);onHudUpdate&&onHudUpdate(p=>({...p,deathScreen:null}))}
      return
    } else { death.current.dead=false; death.current.timer=0 }

    for(const npc of gs.npcs) npc.nearPlayer=dist(player.x,player.y,npc.x,npc.y)<I_RANGE
    if(gs.dialogueQueue.length>0){onHudUpdate&&onHudUpdate(p=>({...p,dialogue:gs.dialogueQueue[0]??null}));return}

    // ── TASK 3: enemyAttack() ─────────────────────────────
    for(const e of gs.enemies){
      if(!e.alive) continue
      const d=dist(e.x,e.y,player.x,player.y)
      if(d<E_DETECT){
        e.state=d<58?'attack':'chase'
        const spd=ENEMY_TYPES[e.type].spd*dt*70, dx=(player.x-e.x)/d, dy=(player.y-e.y)/d
        const nx=e.x+dx*spd, ny=e.y+dy*spd
        if(walkable(nx,e.y)){e.x=nx;e.facingDir=dx>0?'right':'left'}
        if(walkable(e.x,ny)) e.y=ny
        if(e.state==='attack'){
          e.attackTimer=(e.attackTimer??0)+dt
          if(e.attackTimer>=(ENEMY_TYPES[e.type].range>100?1.8:1.0)){
            e.attackTimer=0
            if(player.invincible<=0&&player.hp>0){
              // enemyAttack() — student must implement
              const res = enemyAttack({...e}, {...player})
              Object.assign(player, res.player)
              addDmg(player.x,player.y-20,res.damage,'player'); playPlayerHurt()
            }
          }
        }
      } else {
        e.state='patrol'; e.patrolTimer=(e.patrolTimer??0)+dt; e.attackTimer=0
        if(e.patrolTimer>=2.2+Math.random()){e.patrolTimer=0;e.angle=Math.random()*Math.PI*2}
        const nx=e.x+Math.cos(e.angle)*dt*30, ny=e.y+Math.sin(e.angle)*dt*30
        if(dist(nx,ny,e.homeX,e.homeY)<220){
          if(walkable(nx,e.y)){e.x=nx;e.facingDir=Math.cos(e.angle)>0?'right':'left'}
          if(walkable(e.x,ny)) e.y=ny
        }
      }
    }

    for(const d2 of dmg.current){d2.y-=1.4;d2.life-=1}
    dmg.current=dmg.current.filter(d2=>d2.life>0)

    camera.x+=((player.x-gs.W/2)-camera.x)*7*dt; camera.y+=((player.y-gs.H/2)-camera.y)*7*dt
    camera.x=Math.max(0,Math.min(WORLD_W*TILE_S-gs.W,camera.x)); camera.y=Math.max(0,Math.min(WORLD_H*TILE_S-gs.H,camera.y))

    for(const loc of world.locations){
      if(!loc.discovered&&dist(player.x,player.y,loc.x*TILE_S,loc.y*TILE_S)<130){
        loc.discovered=true; gs.locationName=loc.name; narrate(gs,`✦ Discovered: ${loc.name}`)
        playDiscovery(); if(loc.type==='shrine') playShrinebell()
      }
    }

    if(~~(gs.gameTime*10)%4===0&&onHudUpdate){
      onHudUpdate(prev=>({...prev,
        hp:player.hp,maxHp:player.maxHp,stamina:player.stamina,maxStamina:player.maxStamina,
        xp:player.xp,xpNext:player.level*150,level:player.level,gold:player.gold,
        potions:player.potions,kills:player.kills,location:gs.locationName,
        time:gs.timeOfDay,weather:gs.weather,biome:gs.currentBiome,combo:player.comboCount,score:gs.score,
        narration:gs.narrationTimer>0?gs.narration:'',
        dialogue:gs.dialogueQueue.length>0?gs.dialogueQueue[0]:null,
        activeQuests:gs.activeQuests,
        boss:null, hasSave:true, showMinimap:gs.showMinimap,
        minimapData:gs.showMinimap?{tiles:world.tiles,enemies:gs.enemies,npcs:gs.npcs,playerX:player.x,playerY:player.y}:null,
        nearNPC:gs.npcs.some(n=>dist(player.x,player.y,n.x,n.y)<I_RANGE),
        nearItem:gs.items.some(it=>!it.collected&&dist(player.x,player.y,it.x,it.y)<55),
        enemiesAlive: gs.enemies.filter(e=>e.alive).length,
        enemiesTotal: gs.enemies.length,
      }))
    }
  }

  function assignStarterQuests(gs){
    const by=t=>QUEST_TEMPLATES.filter(q=>q.type===t)
    const pick=arr=>arr[~~(Math.random()*arr.length)]
    const chosen=new Set()
    const add=q=>{if(q&&!chosen.has(q.id)){chosen.add(q.id);gs.activeQuests.push({...q,progress:0})}}
    add(pick(by('kill'))); add(pick(by('collect')))
  }

  function restartGame(gs,world,deathRef){
    const dr=deathRef.current; dr.dead=false; dr.timer=0; dr.countdown=4
    const p=gs.player; p.hp=p.maxHp; p.stamina=p.maxStamina; p.x=world.startX; p.y=world.startY
    p.state='idle'; p.invincible=1.5; p.attackTimer=0; p.dodgeTimer=0
    for(const e of gs.enemies) if(!e.alive){e.alive=true;e.hp=ENEMY_TYPES[e.type]?.hp??60;e.state='patrol'}
    gs.bossFight=null; narrate(gs,'⛩ You have been reborn.')
    gs.activeQuests=[]; assignStarterQuests(gs)
  }

  const save=useCallback(slot=>gsRef.current&&saveGame(slot,gsRef.current),[])
  const spawn=useCallback(q=>{const gs=gsRef.current;if(!gs)return;gs.activeQuests.push({...q,progress:0});},[])

  useEffect(()=>{
    if(fwdRef){const node={__gameSave:save,__spawnQuest:spawn};typeof fwdRef==='function'?fwdRef(node):(fwdRef.current=node)}
  },[save,spawn,fwdRef])

  return <div ref={mountRef} style={{position:'fixed',inset:0,width:'100vw',height:'100vh',overflow:'hidden',background:'#000'}} />
})

export default GameCanvas
