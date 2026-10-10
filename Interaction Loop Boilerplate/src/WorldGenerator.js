import { T, WORLD_W, WORLD_H, LOCATION_NAMES, ENEMY_TYPES, NPC_TYPES } from './worldData.js'

function hash(x,y){let h=(x*374761393+y*668265263)|0;h=((h^(h>>>13))*1274126177)|0;return((h^(h>>>16))>>>0)/0xFFFFFFFF}
function smoothNoise(x,y,scale){const xi=Math.floor(x/scale),yi=Math.floor(y/scale),xf=x/scale-xi,yf=y/scale-yi;const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);return hash(xi,yi)*(1-u)*(1-v)+hash(xi+1,yi)*u*(1-v)+hash(xi,yi+1)*(1-u)*v+hash(xi+1,yi+1)*u*v}
function octaveNoise(x,y,oct=5){let val=0,amp=0.5,freq=1,max=0;for(let i=0;i<oct;i++){val+=smoothNoise(x*freq,y*freq,40)*amp;max+=amp;freq*=2.1;amp*=0.45}return val/max}
function generateHeightmap(seed=1337){const map=new Float32Array(WORLD_W*WORLD_H),cx=WORLD_W/2,cy=WORLD_H/2;for(let y=0;y<WORLD_H;y++)for(let x=0;x<WORLD_W;x++){let h=octaveNoise((x+seed)/8,(y+seed*0.7)/8);const dx=(x-cx)/(cx*0.7),dy=(y-cy)/(cy*0.7);h=h*0.6+smoothNoise(x/60,y/60,1)*0.8*0.4-Math.sqrt(dx*dx+dy*dy)*0.35;map[y*WORLD_W+x]=Math.max(0,Math.min(1,h))}return map}
function heightToTile(h,x,y,m){const mo=m[y*WORLD_W+x];if(h<0.18)return T.DEEP_SEA;if(h<0.26)return T.SEA;if(h<0.32)return T.SHALLOW;if(h<0.36)return T.BEACH;if(h<0.45)return mo>0.55?T.TALL_GRASS:T.GRASS;if(h<0.58)return mo>0.6?T.FOREST:mo>0.4?T.TALL_GRASS:T.GRASS;if(h<0.68)return mo>0.5?T.DENSE_FOREST:T.FOREST;if(h<0.75)return T.ROCK;if(h<0.85)return T.MOUNTAIN;return T.SNOW}
function carvePath(tiles,x1,y1,x2,y2){let cx=x1,cy=y1;while(cx!==x2||cy!==y2){const t=tiles[cy*WORLD_W+cx];if(t!==T.DEEP_SEA&&t!==T.SEA)tiles[cy*WORLD_W+cx]=T.PATH;if(Math.abs(cx-x2)>Math.abs(cy-y2))cx+=cx<x2?1:-1;else cy+=cy<y2?1:-1}}

export function generateWorld(seed=Date.now()%100000){
  const heights=generateHeightmap(seed),moisture=generateHeightmap(seed+7777)
  const tiles=new Uint8Array(WORLD_W*WORLD_H)
  for(let i=0;i<WORLD_W*WORLD_H;i++)tiles[i]=heightToTile(heights[i],i%WORLD_W,~~(i/WORLD_W),moisture)
  for(let y=5;y<WORLD_H-5;y++)for(let x=5;x<WORLD_W-5;x++){const t=tiles[y*WORLD_W+x];if((t===T.FOREST||t===T.TALL_GRASS)&&moisture[y*WORLD_W+x]>0.75&&Math.random()<0.06)tiles[y*WORLD_W+x]=T.BAMBOO}
  const land=[];for(let y=10;y<WORLD_H-10;y++)for(let x=10;x<WORLD_W-10;x++){const t=tiles[y*WORLD_W+x];if(t===T.GRASS||t===T.TALL_GRASS)land.push({x,y})}
  land.sort(()=>Math.random()-0.5)
  const vc=land.slice(0,8),sc=land.slice(8,14),rc=land.slice(14,20)
  vc.forEach(({x,y})=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(x+dx>=0&&x+dx<WORLD_W&&y+dy>=0&&y+dy<WORLD_H)tiles[(y+dy)*WORLD_W+(x+dx)]=T.VILLAGE}})
  sc.forEach(({x,y})=>{tiles[y*WORLD_W+x]=T.SHRINE});rc.forEach(({x,y})=>{tiles[y*WORLD_W+x]=T.RUINS})
  for(let i=0;i<vc.length-1;i++)carvePath(tiles,vc[i].x,vc[i].y,vc[i+1].x,vc[i+1].y)
  for(let r=0;r<4;r++){const sc2=land[land.length-1-r];if(!sc2)continue;let rx=sc2.x,ry=sc2.y;for(let s=0;s<200;s++){const t=tiles[ry*WORLD_W+rx];if(t===T.SEA||t===T.DEEP_SEA||t===T.SHALLOW)break;if(t!==T.VILLAGE&&t!==T.PATH)tiles[ry*WORLD_W+rx]=T.SHALLOW;const dirs=[{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0}];let bH=heights[ry*WORLD_W+rx],bD=dirs[0];for(const d of dirs){const nx=rx+d.dx,ny=ry+d.dy;if(nx>=0&&nx<WORLD_W&&ny>=0&&ny<WORLD_H&&heights[ny*WORLD_W+nx]<bH){bH=heights[ny*WORLD_W+nx];bD=d}}rx+=bD.dx;ry+=bD.dy}}
  for(let y=1;y<WORLD_H-1;y++)for(let x=1;x<WORLD_W-1;x++){if(tiles[y*WORLD_W+x]===T.SHALLOW){const a=tiles[(y-1)*WORLD_W+x],b=tiles[(y+1)*WORLD_W+x],l=tiles[y*WORLD_W+(x-1)],r=tiles[y*WORLD_W+(x+1)];if((a===T.PATH&&b===T.PATH)||(l===T.PATH&&r===T.PATH))tiles[y*WORLD_W+x]=T.BRIDGE}}
  const locations=[...vc,...sc,...rc].map((c,i)=>({x:c.x,y:c.y,name:LOCATION_NAMES[i%LOCATION_NAMES.length],type:i<8?'village':i<14?'shrine':'ruins',discovered:false}))
  const enemies=[],npcs=[],items=[]
  const ET=new Set([T.FOREST,T.DENSE_FOREST,T.MOUNTAIN,T.RUINS,T.GRASS,T.TALL_GRASS,T.BAMBOO,T.SHRINE,T.BEACH])
  for(let i=0;i<300;i++){const x=5+~~(Math.random()*(WORLD_W-10)),y=5+~~(Math.random()*(WORLD_H-10)),t=tiles[y*WORLD_W+x];if(!ET.has(t))continue;const pool=t===T.MOUNTAIN||t===T.RUINS?['DEMON','GUARD','RONIN']:t===T.FOREST||t===T.DENSE_FOREST||t===T.BAMBOO?['BANDIT','ARCHER','RONIN']:['BANDIT','RONIN','ARCHER'];const type=pool[~~(Math.random()*pool.length)];enemies.push({id:`e_${i}`,type,x:x*48+24,y:y*48+24,hp:ENEMY_TYPES[type].hp,maxHp:ENEMY_TYPES[type].hp,state:'patrol',angle:Math.random()*Math.PI*2,patrolTimer:0,alertTimer:0,homeX:x*48+24,homeY:y*48+24,alive:true})}
  const sv=vc[0]||{x:WORLD_W/2,y:WORLD_H/2}
  for(let i=0;i<12;i++){const a=(i/12)*Math.PI*2,r=180+Math.random()*200,ex=sv.x*48+Math.cos(a)*r,ey=sv.y*48+Math.sin(a)*r;const type=['BANDIT','RONIN','ARCHER'][i%3];enemies.push({id:`e_near_${i}`,type,x:ex,y:ey,hp:ENEMY_TYPES[type].hp,maxHp:ENEMY_TYPES[type].hp,state:'patrol',angle:Math.random()*Math.PI*2,patrolTimer:0,alertTimer:0,homeX:ex,homeY:ey,alive:true})}
  const npcKeys=Object.keys(NPC_TYPES);vc.forEach((c,i)=>npcs.push({id:`npc_${i}`,type:npcKeys[i%npcKeys.length],x:c.x*48+24+(Math.random()*40-20),y:c.y*48+24+(Math.random()*40-20),name:NPC_TYPES[npcKeys[i%npcKeys.length]].name,dialogueState:'ready'}))
  const startX=sv.x*48+24,startY=sv.y*48+24
  const IT=new Set([T.GRASS,T.FOREST,T.RUINS,T.VILLAGE,T.PATH])
  for(let i=0;i<80;i++){const x=10+~~(Math.random()*(WORLD_W-20)),y=10+~~(Math.random()*(WORLD_H-20));if(IT.has(tiles[y*WORLD_W+x]))items.push({id:`item_${i}`,x:x*48+24,y:y*48+24,type:Math.random()<0.6?'coin':'potion',collected:false})}
  for(let i=0;i<10;i++){const a=(i/10)*Math.PI*2,r=60+Math.random()*120;items.push({id:`item_start_${i}`,x:startX+Math.cos(a)*r,y:startY+Math.sin(a)*r,type:i<6?'coin':'potion',collected:false})}
  return{tiles,heights,moisture,locations,enemies,npcs,items,startX,startY,seed}
}

export function getBiome(tiles,wx,wy){const tx=~~(wx/48),ty=~~(wy/48);if(tx<0||tx>=WORLD_W||ty<0||ty>=WORLD_H)return 'coast';const t=tiles[ty*WORLD_W+tx];if(t===T.FOREST||t===T.DENSE_FOREST||t===T.BAMBOO)return 'forest';if(t===T.MOUNTAIN||t===T.SNOW||t===T.ROCK)return 'mountain';if(t===T.VILLAGE||t===T.PATH)return 'field';return 'coast'}
