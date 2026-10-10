export const T = {
  DEEP_SEA: 0, SEA: 1, SHALLOW: 2, BEACH: 3,
  GRASS: 4, TALL_GRASS: 5, FOREST: 6, DENSE_FOREST: 7,
  ROCK: 8, MOUNTAIN: 9, SNOW: 10,
  PATH: 11, VILLAGE: 12, SHRINE: 13,
  BAMBOO: 14, RUINS: 15, BRIDGE: 16,
}
export const TILE_DEF = {
  [0]:{ walk:false,color:'#0a1e3a' },[1]:{ walk:false,color:'#0e2e5a' },[2]:{ walk:false,color:'#1a4a7a' },
  [3]:{ walk:true,color:'#c8a050' },[4]:{ walk:true,color:'#3a6a20' },[5]:{ walk:true,color:'#2a5a18' },
  [6]:{ walk:true,color:'#1a4a0e' },[7]:{ walk:true,color:'#122e08' },[8]:{ walk:false,color:'#5a5550' },
  [9]:{ walk:false,color:'#484440' },[10]:{ walk:true,color:'#d8dce8' },[11]:{ walk:true,color:'#8a6a3a' },
  [12]:{ walk:true,color:'#7a5030' },[13]:{ walk:true,color:'#5a3a7a' },[14]:{ walk:true,color:'#2a6a2a' },
  [15]:{ walk:true,color:'#4a4030' },[16]:{ walk:true,color:'#7a5a38' },
}
export const WORLD_W=200, WORLD_H=150, TILE_S=48, VIEW_W=22, VIEW_H=14
export const BIOMES = {
  coast:{sky:['#87ceeb','#4a90d9'],fog:'rgba(180,220,255,0.08)'},
  forest:{sky:['#2d5a1b','#6aaa3a'],fog:'rgba(30,80,20,0.12)'},
  mountain:{sky:['#4a5a6a','#8090a0'],fog:'rgba(100,130,160,0.15)'},
  field:{sky:['#c8a030','#e8d080'],fog:'rgba(200,180,100,0.1)'},
}
export const TIME_CONFIGS = [
  {h:0,top:'#020518',bot:'#0a0e28',amb:'rgba(20,30,60,0.6)',angle:180,lc:'#2030a0',fog:0.7},
  {h:5,top:'#0a1035',bot:'#2a1a50',amb:'rgba(30,20,70,0.4)',angle:120,lc:'#4050d0',fog:0.5},
  {h:6,top:'#d4601a',bot:'#f0a040',amb:'rgba(200,100,40,0.2)',angle:90,lc:'#ff8040',fog:0.3},
  {h:8,top:'#4a9ad0',bot:'#8ac4f0',amb:'rgba(100,160,220,0.1)',angle:60,lc:'#ffe0a0',fog:0.15},
  {h:12,top:'#2a78c0',bot:'#70b4e8',amb:'rgba(80,140,210,0.05)',angle:0,lc:'#fffadd',fog:0.08},
  {h:17,top:'#d06010',bot:'#f4a040',amb:'rgba(210,120,30,0.2)',angle:60,lc:'#ffc060',fog:0.2},
  {h:19,top:'#801828',bot:'#d04030',amb:'rgba(180,60,40,0.3)',angle:90,lc:'#ff6040',fog:0.35},
  {h:21,top:'#0e1838',bot:'#1a2a58',amb:'rgba(20,30,80,0.45)',angle:150,lc:'#3040a0',fog:0.5},
  {h:24,top:'#020518',bot:'#0a0e28',amb:'rgba(20,30,60,0.6)',angle:180,lc:'#2030a0',fog:0.7},
]
export const ENEMY_TYPES = {
  RONIN:{name:'Rogue Ronin',hp:60,atk:15,spd:1.2,range:55,color:'#8a3010',xp:40},
  BANDIT:{name:'Forest Bandit',hp:40,atk:10,spd:1.5,range:50,color:'#5a4020',xp:25},
  GUARD:{name:'Corrupted Guard',hp:80,atk:20,spd:1.0,range:60,color:'#303060',xp:60},
  DEMON:{name:'Mountain Oni',hp:120,atk:30,spd:0.8,range:70,color:'#8a0010',xp:100},
  ARCHER:{name:'Shadow Archer',hp:35,atk:18,spd:1.8,range:200,color:'#1a3a10',xp:35},
}
export const NPC_TYPES = {
  ELDER:{name:'Village Elder',color:'#7a5a30',dialogue:[]},
  MERCHANT:{name:'Traveling Merchant',color:'#4a5a7a',dialogue:[]},
  MONK:{name:'Temple Monk',color:'#7a6a40',dialogue:[]},
  FARMER:{name:'Farmer',color:'#5a5a30',dialogue:[]},
  WARRIOR:{name:'Wandering Warrior',color:'#4a3a6a',dialogue:[]},
}
export const LOCATION_NAMES = [
  'Tsurumi Village','Shimura Harbor','Iron Mountain','Ghost Shrine',
  'Bamboo Forest','Fallen Temple','Widow Peak','Dragon Cave',
  'Mist Valley','Sakura Crossing','Storm Cliffs','Sacred Spring',
  'Burned Bridge','Crow Forest','Hidden Dojo','Forsaken Castle',
]
export const QUEST_TEMPLATES = [
  {id:'rid_bandits',title:'Clear the Bandits',desc:'Bandits have overrun the eastern road.',type:'kill',count:5,reward:200},
  {id:'ronin_hunt',title:'Hunt the Ronin',desc:'Rogue ronin terrorize the village outskirts.',type:'kill',count:4,reward:180},
  {id:'demon_slayer',title:'Demon Slayer',desc:'Mountain Oni have descended from the peaks.',type:'kill',count:3,reward:260},
  {id:'coin_gather',title:'Tribute Collection',desc:'Gather tribute coins scattered across the land.',type:'collect',count:8,reward:160},
  {id:'cleanse',title:'Cleanse the Ruins',desc:'Evil spirits haunt the ancient ruins.',type:'boss',reward:300},
  {id:'demon_overlord',title:'The Demon Overlord',desc:'Face the Demon Overlord and survive.',type:'boss',reward:500},
  {id:'find_shrine',title:'The Hidden Shrine',desc:'An ancient shrine lies somewhere in the forest.',type:'reach',count:1,reward:150},
  {id:'survivor',title:"Survivor's Oath",desc:'Reach level 3 to prove you can endure this land.',type:'level',count:3,reward:220},
]
export const AREA_PROMPTS = {}
