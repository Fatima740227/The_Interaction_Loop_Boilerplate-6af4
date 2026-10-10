import * as THREE from 'three'
import { EffectComposer }  from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass }      from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass }      from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass }      from 'three/examples/jsm/postprocessing/OutputPass.js'
import { T, TILE_S, WORLD_W, WORLD_H, TIME_CONFIGS, ENEMY_TYPES } from './worldData.js'

const ToonShader = {
  uniforms: { tDiffuse:{value:null}, uBrightness:{value:1.05}, uSaturation:{value:1.35}, uContrast:{value:1.08}, uNightBlue:{value:0} },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uBrightness,uSaturation,uContrast,uNightBlue; varying vec2 vUv;
    void main(){ vec4 c=texture2D(tDiffuse,vUv); c.rgb*=uBrightness; float l=dot(c.rgb,vec3(.299,.587,.114)); c.rgb=mix(vec3(l),c.rgb,uSaturation); c.rgb=(c.rgb-.5)*uContrast+.5; c.r*=mix(1.04,.80,uNightBlue); c.g*=mix(1.01,.86,uNightBlue); c.b*=mix(.98,1.25,uNightBlue); gl_FragColor=vec4(clamp(c.rgb,0.,1.),c.a); }`,
}
const TCOL={[T.DEEP_SEA]:0x1a4a7a,[T.SEA]:0x2a6aaa,[T.SHALLOW]:0x5aaccc,[T.BEACH]:0xd4b86a,[T.GRASS]:0x5ec832,[T.TALL_GRASS]:0x3ea820,[T.FOREST]:0x2a8018,[T.DENSE_FOREST]:0x1a6010,[T.ROCK]:0x9a9488,[T.MOUNTAIN]:0x8a8480,[T.SNOW]:0xe8ecf8,[T.PATH]:0xb09060,[T.VILLAGE]:0x8a7050,[T.SHRINE]:0x7a58a8,[T.BAMBOO]:0x3ac838,[T.RUINS]:0x786850,[T.BRIDGE]:0x9a7858}
const PI2=Math.PI*2, R=Math.random
function getTC(h){const C=TIME_CONFIGS;for(let i=0;i<C.length-1;i++)if(h>=C[i].h&&h<C[i+1].h)return{a:C[i],b:C[i+1],t:(h-C[i].h)/(C[i+1].h-C[i].h)};return{a:C[0],b:C[1],t:0}}
function lerpC(c1,c2,t){return new THREE.Color().lerpColors(new THREE.Color(c1),new THREE.Color(c2),t)}
const _tl=new THREE.TextureLoader(),_tc=new Map()
function pollTex(prompt,seed=1,repeat=4){const key=`${prompt}|${seed}`;if(_tc.has(key))return Promise.resolve(_tc.get(key));const url=`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt+', seamless tileable texture, photorealistic, 4k')}?width=512&height=512&nologo=true&seed=${seed}&model=flux`;return new Promise(r=>_tl.load(url,t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.colorSpace=THREE.SRGBColorSpace;_tc.set(key,t);r(t)},undefined,()=>r(null)))}
const lam=c=>new THREE.MeshLambertMaterial({color:c})
const std=(c,r=.85,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m})
const basic=c=>new THREE.MeshBasicMaterial({color:c})
const D=new THREE.Object3D()
function place(mesh,x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1,i=0){D.position.set(x,y,z);D.rotation.set(rx,ry,rz);D.scale.set(sx,sy,sz);D.updateMatrix();mesh.setMatrixAt(i,D.matrix)}
function iMesh(geo,mat,n,sc,cast=false,recv=false){const m=new THREE.InstancedMesh(geo,mat,n);if(cast)m.castShadow=true;if(recv)m.receiveShadow=true;sc.add(m);return m}
function commit(...ms){for(const m of ms){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true}}

export class ThreeRenderer {
  constructor(container){
    this.W=innerWidth;this.H=innerHeight;this.clock=new THREE.Clock()
    const r=this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'})
    r.setSize(this.W,this.H);r.setPixelRatio(Math.min(devicePixelRatio,2))
    r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap
    r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.2;r.outputColorSpace=THREE.SRGBColorSpace
    container.appendChild(r.domElement)
    const sc=this.scene=new THREE.Scene()
    sc.background=new THREE.Color(0xaaddf8);sc.fog=new THREE.FogExp2(0xc0e8f8,.0005)
    this.camera=new THREE.PerspectiveCamera(55,this.W/this.H,.5,10000)
    this.camera.position.set(0,220,280);this.camera.lookAt(0,0,0);this._camTarget=new THREE.Vector3()
    const addL=(L)=>{sc.add(L);return L}
    this.ambientLight=addL(new THREE.AmbientLight(0xfff5e0,1))
    this.sunLight=addL(new THREE.DirectionalLight(0xfff0c0,2.5))
    this.sunLight.position.set(500,800,300);this.sunLight.castShadow=true;this.sunLight.shadow.mapSize.set(2048,2048)
    Object.assign(this.sunLight.shadow.camera,{near:1,far:3000,left:-800,right:800,top:800,bottom:-800});this.sunLight.shadow.bias=-.001
    this.moonLight=addL(new THREE.DirectionalLight(0x8899dd,0));this.moonLight.position.set(-600,800,-400)
    this.nightFill=addL(new THREE.HemisphereLight(0x223366,0x112233,0))
    this.fillLight=addL(new THREE.HemisphereLight(0x99ddff,0x55bb33,.7))
    this._torchLights=[];this._lanternLights=[];this.entityMeshes=new Map()
    this._buildSky();this._buildComposer()
    window.addEventListener('resize',this._onResize=()=>this.resize())
  }

  _buildSky(){
    const sc=this.scene,sg=new THREE.SphereGeometry(5000,16,8);sg.scale(-1,1,1)
    this.skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,uniforms:{uTopColor:{value:new THREE.Color(0x4ab0f0)},uBotColor:{value:new THREE.Color(0xc0e8f8)},uHorizon:{value:.32}},vertexShader:`varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform vec3 uTopColor,uBotColor;uniform float uHorizon;varying vec3 vPos;void main(){float h=normalize(vPos).y;gl_FragColor=vec4(mix(uBotColor,uTopColor,smoothstep(-uHorizon,uHorizon,h)),1.);}`})
    sc.add(new THREE.Mesh(sg,this.skyMat))
    this.sunSphere=new THREE.Mesh(new THREE.SphereGeometry(32,12,8),basic(0xfffce0));sc.add(this.sunSphere)
    this.moonSphere=new THREE.Mesh(new THREE.SphereGeometry(26,12,8),basic(0xeef4ff));sc.add(this.moonSphere)
    const sp=new Float32Array(7200)
    for(let i=0;i<2400;i++){const th=R()*PI2,ph=Math.acos(2*R()-1),r=4000;sp[i*3]=r*Math.sin(ph)*Math.cos(th);sp[i*3+1]=Math.abs(r*Math.cos(ph))+100;sp[i*3+2]=r*Math.sin(ph)*Math.sin(th)}
    const sg2=new THREE.BufferGeometry();sg2.setAttribute('position',new THREE.BufferAttribute(sp,3))
    this.starMat=new THREE.PointsMaterial({color:0xffffff,size:3.5,sizeAttenuation:false,transparent:true,opacity:0})
    sc.add(new THREE.Points(sg2,this.starMat))
    this.cloudGroup=new THREE.Group()
    const cMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.88})
    for(let i=0;i<22;i++){const cg=new THREE.Group(),w=150+R()*220,h=28+R()*22;for(let j=0;j<5;j++){const b=new THREE.Mesh(new THREE.SphereGeometry(1,7,5),cMat);b.scale.set(w*(.35+j*.22),h*(.7+R()*.5),w*.26);b.position.set((j-2)*w*.28,R()*h*.3,0);cg.add(b)}cg.position.set((R()-.5)*6000,680+R()*500,(R()-.5)*6000);this.cloudGroup.add(cg)}
    sc.add(this.cloudGroup)
  }

  _buildComposer(){
    this.composer=new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene,this.camera))
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(this.W,this.H),.38,.52,.80))
    this.colorPass=new ShaderPass(ToonShader);this.composer.addPass(this.colorPass)
    this.composer.addPass(new OutputPass())
  }

  buildTerrain(tiles,heights){
    if(this.terrainBuilt)return;this.terrainBuilt=true
    const TW=WORLD_W*TILE_S,TH=WORLD_H*TILE_S,sc=this.scene
    const geo=new THREE.PlaneGeometry(TW,TH,WORLD_W-1,WORLD_H-1);geo.rotateX(-Math.PI/2)
    const pos=geo.attributes.position,cols=new Float32Array(pos.count*3)
    for(let i=0;i<pos.count;i++){
      const wx=pos.getX(i)+TW/2,wz=pos.getZ(i)+TH/2
      const tx=Math.max(0,Math.min(WORLD_W-1,Math.round(wx/TILE_S))),ty=Math.max(0,Math.min(WORLD_H-1,Math.round(wz/TILE_S)))
      const h=heights[ty*WORLD_W+tx]??0;pos.setY(i,h<.3?-10:(h-.3)*360)
      const c=new THREE.Color(TCOL[tiles[ty*WORLD_W+tx]]??0x3a3a3a);cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b
    }
    pos.needsUpdate=true;geo.setAttribute('color',new THREE.BufferAttribute(cols,3));geo.computeVertexNormals()
    this.terrainMat=std(0xffffff,.9,0);this.terrainMat.vertexColors=true
    this.terrainMesh=new THREE.Mesh(geo,this.terrainMat);this.terrainMesh.receiveShadow=true;sc.add(this.terrainMesh)
    this.waterMat=new THREE.MeshStandardMaterial({color:0x3a9acc,transparent:true,opacity:.82,roughness:.1,metalness:.3})
    const wg=new THREE.PlaneGeometry(TW,TH);wg.rotateX(-Math.PI/2)
    this.waterMesh=new THREE.Mesh(wg,this.waterMat);this.waterMesh.position.y=-3;sc.add(this.waterMesh)
    this._scatter(tiles,heights);this._loadAllTextures()
  }

  _w2t(wx,wy,h){
    const tx=Math.max(0,Math.min(WORLD_W-1,~~(wx/TILE_S))),ty=Math.max(0,Math.min(WORLD_H-1,~~(wy/TILE_S)))
    const hv=h?h[ty*WORLD_W+tx]??0:0
    return new THREE.Vector3(wx-WORLD_W*TILE_S/2,hv<.3?0:(hv-.3)*360,wy-WORLD_H*TILE_S/2)
  }

  _pts(tiles,set,prob=1){
    const out=[]
    for(let ty=0;ty<WORLD_H;ty++)for(let tx=0;tx<WORLD_W;tx++){const t=tiles[ty*WORLD_W+tx];if(set.has(t)&&R()<prob)out.push({wx:(tx+R())*TILE_S,wy:(ty+R())*TILE_S,t})}
    return out
  }

  // Shared helper: scatter multi-color instanced meshes (flowers, mushrooms, crops, shells)
  _multiColor(pts,cnt,stemGeo,stemMat,topGeo,colors,sc,topYFn=(s)=>s*9){
    const stems=iMesh(stemGeo,stemMat,cnt,sc)
    const tops=colors.map(c=>iMesh(topGeo,lam(c),Math.ceil(cnt/colors.length),sc))
    const counts=new Array(colors.length).fill(0),per=Math.ceil(cnt/colors.length)
    return{stems,tops,counts,per}
  }

  _scatter(tiles,heights){
    const sc=this.scene,S=new Set

    // ── Grass ──────────────────────────────────────────────
    const gPts=this._pts(tiles,new Set([T.GRASS,T.TALL_GRASS,T.FOREST,T.BAMBOO,T.VILLAGE,T.RUINS]),1).flatMap(p=>[p,p,p,p,p,p,p])
    const gCnt=Math.min(gPts.length,90000),gGeo=new THREE.BoxGeometry(3,18,1.5);gGeo.translate(0,9,0)
    this.grassMat=lam(0x4ec830);this.grassMat.side=THREE.DoubleSide
    this.grassMesh=iMesh(gGeo,this.grassMat,gCnt,sc,false,true)
    for(let i=0;i<gCnt;i++){const{wx,wy}=gPts[i],p=this._w2t(wx,wy,heights),s=.6+R();place(this.grassMesh,p.x,p.y,p.z,0,R()*PI2,0,s,s,s,i);this.grassMesh.setColorAt(i,new THREE.Color(.16,.48+R()*.38,.07))}
    commit(this.grassMesh);this._grassPositions=gPts.slice(0,gCnt)

    // ── Rocks ──────────────────────────────────────────────
    const rPts=[];for(let ty=0;ty<WORLD_H;ty++)for(let tx=0;tx<WORLD_W;tx++){const t=tiles[ty*WORLD_W+tx],p=t===T.ROCK||t===T.MOUNTAIN?.3:t===T.BEACH?.08:t===T.GRASS?.03:0;if(p&&R()<p)rPts.push({wx:(tx+.5)*TILE_S,wy:(ty+.5)*TILE_S})}
    const rCnt=Math.min(rPts.length,3000);this.rockMat=std(0xaaa090,.9)
    this.rockMesh=iMesh(new THREE.BoxGeometry(1,1,1),this.rockMat,rCnt,sc,true,true)
    for(let i=0;i<rCnt;i++){const{wx,wy}=rPts[i],p=this._w2t(wx,wy,heights),s=10+R()*26;place(this.rockMesh,p.x+(R()-.5)*18,p.y+s*.4,p.z+(R()-.5)*18,0,R()*Math.PI,0,s,s*(.5+R()*.5),s*(.6+R()*.5),i)}
    commit(this.rockMesh)

    // ── Trees ──────────────────────────────────────────────
    const tPts=this._pts(tiles,new Set([T.FOREST,T.DENSE_FOREST,T.BAMBOO]),.22),tCnt=Math.min(tPts.length,5000)
    this.trunkMat=std(0x7a5030,.95);this.canopyMat=std(0x2a8820,.85)
    this.trunkMesh=iMesh(new THREE.CylinderGeometry(2.5,4,22,6),this.trunkMat,tCnt,sc,true)
    this.canopy1=iMesh(new THREE.ConeGeometry(22,28,7),this.canopyMat,tCnt,sc,true)
    this.canopy2=iMesh(new THREE.ConeGeometry(17,22,7),this.canopyMat.clone(),tCnt,sc,true)
    this.canopy3=iMesh(new THREE.ConeGeometry(11,18,7),this.canopyMat.clone(),tCnt,sc,true)
    for(let i=0;i<tCnt;i++){const{wx,wy,t}=tPts[i],p=this._w2t(wx,wy,heights),s=t===T.DENSE_FOREST?1.3:t===T.BAMBOO?.55:1,ry=R()*PI2;place(this.trunkMesh,p.x,p.y+11,p.z,0,ry,0,s,s,s,i);place(this.canopy1,p.x,p.y+22*s,p.z,0,ry,0,s,s,s,i);place(this.canopy2,p.x,p.y+36*s,p.z,0,ry+.3,0,s,s,s,i);place(this.canopy3,p.x,p.y+48*s,p.z,0,ry+.6,0,s,s,s,i);const g=.4+R()*.32;this.canopy1.setColorAt(i,new THREE.Color(.12,g,.10));this.canopy2.setColorAt(i,new THREE.Color(.14,g+.05,.10));this.canopy3.setColorAt(i,new THREE.Color(.16,g+.08,.10))}
    commit(this.trunkMesh,this.canopy1,this.canopy2,this.canopy3)

    // ── Flowers, Mushrooms, Crops (multi-color pattern) ────
    const fPts=this._pts(tiles,new Set([T.GRASS,T.TALL_GRASS,T.FOREST,T.BEACH,T.VILLAGE,T.RUINS,T.BAMBOO]),.18),fCnt=Math.min(fPts.length,8000)
    const fCols=[0xff4488,0xffdd22,0xff8822,0xffffff,0xcc44ff,0xff6644]
    this.flowerStems=iMesh(new THREE.CylinderGeometry(.5,.5,8,4),lam(0x44aa22),fCnt,sc)
    this.flowerPetals=fCols.map(c=>iMesh(new THREE.SphereGeometry(3.5,5,4),lam(c),Math.ceil(fCnt/fCols.length),sc))
    const fpC=new Array(fCols.length).fill(0),fpP=Math.ceil(fCnt/fCols.length)
    for(let i=0;i<fCnt;i++){const{wx,wy}=fPts[i],p=this._w2t(wx,wy,heights),s=.5+R()*.8;place(this.flowerStems,p.x,p.y+4*s,p.z,0,R()*PI2,0,s,s,s,i);const ci=i%fCols.length;if(fpC[ci]<fpP)place(this.flowerPetals[ci],p.x,p.y+9*s,p.z,0,0,0,s,s,s,fpC[ci]++)}
    commit(this.flowerStems,...this.flowerPetals)

    const mPts=this._pts(tiles,new Set([T.FOREST,T.DENSE_FOREST,T.RUINS,T.BAMBOO]),.10),mCnt=Math.min(mPts.length,2000)
    const mCols=[0xdd2222,0xff8822,0xcc44aa,0xddaa22]
    this.mushStemMesh=iMesh(new THREE.CylinderGeometry(2,2.5,8,6),lam(0xeeddcc),mCnt,sc)
    this.mushCapMeshes=mCols.map(c=>iMesh(new THREE.SphereGeometry(1,7,5,0,PI2,0,Math.PI*.55),lam(c),Math.ceil(mCnt/mCols.length),sc))
    const mcC=new Array(mCols.length).fill(0),mcP=Math.ceil(mCnt/mCols.length)
    for(let i=0;i<mCnt;i++){const{wx,wy}=mPts[i],p=this._w2t(wx,wy,heights),s=.6+R()*1.2;place(this.mushStemMesh,p.x,p.y+4*s,p.z,0,0,0,s,s,s,i);const ci=i%mCols.length;if(mcC[ci]<mcP)place(this.mushCapMeshes[ci],p.x,p.y+9*s,p.z,0,0,0,s*1.8,s,s*1.8,mcC[ci]++)}
    commit(this.mushStemMesh,...this.mushCapMeshes)

    // ── Logs, Bushes, Path stones ──────────────────────────
    const lPts=this._pts(tiles,new Set([T.FOREST,T.DENSE_FOREST,T.RUINS]),.04),lCnt=Math.min(lPts.length,600)
    this.logMat=std(0x6a4020,.95);this.logMesh=iMesh(new THREE.CylinderGeometry(4,5,40,7),this.logMat,lCnt,sc,true,true)
    for(let i=0;i<lCnt;i++){const{wx,wy}=lPts[i],p=this._w2t(wx,wy,heights),s=.7+R()*.8;place(this.logMesh,p.x,p.y+4,p.z,Math.PI/2,0,R()*Math.PI,s,s,s,i)}
    commit(this.logMesh)

    const bPts=this._pts(tiles,new Set([T.GRASS,T.TALL_GRASS,T.VILLAGE,T.RUINS,T.BEACH]),.08),bCnt=Math.min(bPts.length,3000)
    this.bushMat=std(0x2a9a20,.85);this.bushMesh=iMesh(new THREE.SphereGeometry(1,6,5),this.bushMat,bCnt,sc,true,true)
    for(let i=0;i<bCnt;i++){const{wx,wy}=bPts[i],p=this._w2t(wx,wy,heights),s=8+R()*16;place(this.bushMesh,p.x,p.y+s*.5,p.z,0,0,0,s,s*(.6+R()*.4),s*(.8+R()*.3),i);this.bushMesh.setColorAt(i,new THREE.Color(.10,.45+R()*.35,.08))}
    commit(this.bushMesh)

    const psPts=[];for(let ty=0;ty<WORLD_H;ty++)for(let tx=0;tx<WORLD_W;tx++){const t=tiles[ty*WORLD_W+tx];if(t===T.PATH||t===T.BRIDGE)psPts.push({wx:(tx+.5)*TILE_S,wy:(ty+.5)*TILE_S})}
    const psCnt=Math.min(psPts.length,3000);this.pathStoneMat=std(0xb0a090,.88)
    this.pathStoneMesh=iMesh(new THREE.BoxGeometry(1,1,1),this.pathStoneMat,psCnt,sc,false,true)
    for(let i=0;i<psCnt;i++){const{wx,wy}=psPts[i],p=this._w2t(wx,wy,heights),sw=28+R()*16,sd=28+R()*16;place(this.pathStoneMesh,p.x+(R()-.5)*8,p.y+1.5,p.z+(R()-.5)*8,0,R()*.4,0,sw,3,sd,i)}
    commit(this.pathStoneMesh)

    // ── Beach ──────────────────────────────────────────────
    const bePts=this._pts(tiles,new Set([T.BEACH]),.15),beCnt=Math.min(bePts.length,1200)
    this.driftMat=std(0xc8b090,.95);this.driftMesh=iMesh(new THREE.CylinderGeometry(2,3,28,5),this.driftMat,beCnt,sc,true)
    const shCols=[0xffeedd,0xffccaa,0xddbbaa,0xffaaaa],shC=new Array(shCols.length).fill(0),shP=Math.ceil(beCnt/shCols.length)
    this.shellMeshes=shCols.map(c=>iMesh(new THREE.SphereGeometry(3,5,4),lam(c),shP,sc))
    this.palmTrunkMat=std(0xaa8850,.9);this.palmLeafMat=std(0x44aa22,.85)
    const pCnt=Math.min(~~(beCnt*.15),200)
    this.palmTrunkMesh=iMesh(new THREE.CylinderGeometry(2,3.5,50,6),this.palmTrunkMat,pCnt,sc,true)
    this.palmLeafMesh=iMesh(new THREE.ConeGeometry(18,12,5),this.palmLeafMat,pCnt*4,sc,true)
    let pi=0,pli=0
    for(let i=0;i<beCnt;i++){const{wx,wy}=bePts[i],p=this._w2t(wx,wy,heights),s=.5+R()*.8;place(this.driftMesh,p.x,p.y+3,p.z,Math.PI/2,0,R()*Math.PI,s,s,s,i);const ci=i%shCols.length;if(shC[ci]<shP)place(this.shellMeshes[ci],p.x+(R()-.5)*20,p.y+2,p.z+(R()-.5)*20,0,R()*PI2,0,.4+R()*.6,.4+R()*.6,.4+R()*.6,shC[ci]++);if(pi<pCnt&&R()>.85){place(this.palmTrunkMesh,p.x,p.y+25,p.z,0,0,0,1,1,1,pi);for(let lf=0;lf<4&&pli<pCnt*4;lf++){const a=(lf/4)*PI2;place(this.palmLeafMesh,p.x+Math.cos(a)*8,p.y+52,p.z+Math.sin(a)*8,-.6,a,0,1,1,1,pli++);}pi++}}
    commit(this.driftMesh,...this.shellMeshes,this.palmTrunkMesh,this.palmLeafMesh)

    // ── Mountain, Snow, Ruins ──────────────────────────────
    const mpPts=this._pts(tiles,new Set([T.MOUNTAIN,T.ROCK,T.SNOW]),.20),mpCnt=Math.min(mpPts.length,2500)
    this.boulderMat=std(0x888078,.92);this.snowCapMat=std(0xeef4ff,.7)
    this.boulderMesh=iMesh(new THREE.DodecahedronGeometry(1,1),this.boulderMat,mpCnt,sc,true,true)
    this.snowCapMesh=iMesh(new THREE.SphereGeometry(1,6,4,0,PI2,0,Math.PI*.4),this.snowCapMat,mpCnt,sc)
    for(let i=0;i<mpCnt;i++){const{wx,wy,t}=mpPts[i],p=this._w2t(wx,wy,heights),s=12+R()*30;place(this.boulderMesh,p.x+(R()-.5)*20,p.y+s*.5,p.z+(R()-.5)*20,R()*.3,R()*Math.PI,R()*.3,s,s*(.6+R()*.5),s*(.7+R()*.4),i);if(t===T.SNOW||t===T.MOUNTAIN)place(this.snowCapMesh,p.x+(R()-.5)*20,p.y+s,p.z+(R()-.5)*20,0,0,0,s*.9,s*.4,s*.9,i);else{D.scale.setScalar(0);D.updateMatrix();this.snowCapMesh.setMatrixAt(i,D.matrix)}}
    commit(this.boulderMesh,this.snowCapMesh)

    const snPts=this._pts(tiles,new Set([T.SNOW]),.15),snCnt=Math.min(snPts.length,1500)
    this.snowBallMat=std(0xeef4ff,.6);this.snowBallMesh=iMesh(new THREE.SphereGeometry(1,6,5),this.snowBallMat,snCnt,sc,false,true)
    for(let i=0;i<snCnt;i++){const{wx,wy}=snPts[i],p=this._w2t(wx,wy,heights),s=5+R()*12;place(this.snowBallMesh,p.x+(R()-.5)*16,p.y+s*.5,p.z+(R()-.5)*16,0,0,0,s,s,s,i)}
    commit(this.snowBallMesh)

    const ruPts=this._pts(tiles,new Set([T.RUINS]),.30),ruCnt=Math.min(ruPts.length,1000)
    this.pillarMat=std(0x9a9080,.9);this.rubbleMat=std(0x888070,.92)
    this.pillarMesh=iMesh(new THREE.CylinderGeometry(5,6,40,8),this.pillarMat,ruCnt,sc,true,true)
    this.rubbleMesh=iMesh(new THREE.BoxGeometry(1,1,1),this.rubbleMat,ruCnt,sc,true)
    for(let i=0;i<ruCnt;i++){const{wx,wy}=ruPts[i],p=this._w2t(wx,wy,heights),tilt=(R()-.5)*.6,s=.6+R()*.8;place(this.pillarMesh,p.x,p.y+20,p.z,tilt,R()*Math.PI,tilt*.5,s,s,s,i);const rs=8+R()*18;place(this.rubbleMesh,p.x+(R()-.5)*30,p.y+rs*.4,p.z+(R()-.5)*30,R()*.5,R()*Math.PI,R()*.5,rs,rs*(.4+R()*.5),rs*(.5+R()*.5),i)}
    commit(this.pillarMesh,this.rubbleMesh)

    // ── Shrine ─────────────────────────────────────────────
    const shPts=this._pts(tiles,new Set([T.SHRINE]),.35),shCnt=Math.min(shPts.length,400)
    this.toriiMat=std(0xcc3322,.8);this.lanternMat=std(0x888878,.9)
    this.toriiPostMesh=iMesh(new THREE.CylinderGeometry(3,3.5,60,7),this.toriiMat,shCnt*2,sc,true)
    this.toriiBarMesh=iMesh(new THREE.BoxGeometry(70,6,6),this.toriiMat.clone(),shCnt,sc,true)
    this.lanternBaseMesh=iMesh(new THREE.BoxGeometry(8,20,8),this.lanternMat,shCnt,sc,true)
    this.lanternCapMesh=iMesh(new THREE.ConeGeometry(7,8,4),this.lanternMat.clone(),shCnt,sc)
    this.lanternBoxMesh=iMesh(new THREE.BoxGeometry(10,10,10),basic(0xffee88),shCnt,sc)
    for(let i=0;i<shCnt;i++){const{wx,wy}=shPts[i],p=this._w2t(wx,wy,heights),ry=R()*PI2,ox=(R()-.5)*40,oz=(R()-.5)*40;place(this.toriiPostMesh,p.x-18,p.y+30,p.z,0,ry,0,1,1,1,i*2);place(this.toriiPostMesh,p.x+18,p.y+30,p.z,0,ry,0,1,1,1,i*2+1);place(this.toriiBarMesh,p.x,p.y+58,p.z,0,ry,0,1,1,1,i);place(this.lanternBaseMesh,p.x+ox,p.y+10,p.z+oz,0,ry,0,1,1,1,i);place(this.lanternCapMesh,p.x+ox,p.y+25,p.z+oz,0,ry+Math.PI/4,0,1,1,1,i);place(this.lanternBoxMesh,p.x+ox,p.y+20,p.z+oz,0,0,0,1,1,1,i);if(i<40){const pl=new THREE.PointLight(0xffee88,1.5,100);pl.position.set(p.x+ox,p.y+22,p.z+oz);sc.add(pl);this._lanternLights.push(pl)}}
    commit(this.toriiPostMesh,this.toriiBarMesh,this.lanternBaseMesh,this.lanternCapMesh,this.lanternBoxMesh)

    // ── Village ────────────────────────────────────────────
    const vPts=this._pts(tiles,new Set([T.VILLAGE]),.18),vCnt=Math.min(vPts.length,400)
    this.wallMat=std(0x9a9080,.92);this.trimMat=std(0xd4a840,.88);this.roofMat=std(0x7a5030,.9);this.doorMat=std(0x5a3010,.95)
    this.wallMesh=iMesh(new THREE.BoxGeometry(1,1,1),this.wallMat,vCnt,sc,true,true)
    this.trimMesh=iMesh(new THREE.BoxGeometry(1,1,1),this.trimMat,vCnt,sc)
    this.roofMesh=iMesh(new THREE.ConeGeometry(1,1,4),this.roofMat,vCnt,sc,true)
    this.rTrimMesh=iMesh(new THREE.TorusGeometry(1,.12,4,4),this.trimMat.clone(),vCnt,sc)
    this.doorMesh=iMesh(new THREE.BoxGeometry(1,1,.5),this.doorMat,vCnt,sc)
    this.winMesh=iMesh(new THREE.BoxGeometry(1,1,.5),basic(0xffee88),vCnt*2,sc)
    for(let i=0;i<vCnt;i++){const{wx,wy}=vPts[i],p=this._w2t(wx,wy,heights),w=36+R()*20,d=36+R()*20,h=40+R()*20,ry=(~~(R()*4))*Math.PI/2;place(this.wallMesh,p.x,p.y+h/2,p.z,0,ry,0,w,h,d,i);place(this.trimMesh,p.x,p.y+h+4,p.z,0,ry,0,w+4,8,d+4,i);place(this.roofMesh,p.x,p.y+h+8+w*.45,p.z,0,ry+Math.PI/4,0,w*.82,w*.9,w*.82,i);place(this.rTrimMesh,p.x,p.y+h+8,p.z,Math.PI/2,0,ry,w*.62,w*.62,1,i);place(this.doorMesh,p.x,p.y+10,p.z+d/2+.5,0,0,0,10,18,2,i);place(this.winMesh,p.x-w*.28,p.y+h*.6,p.z+d/2+.5,0,0,0,8,8,2,i*2);place(this.winMesh,p.x+w*.28,p.y+h*.6,p.z+d/2+.5,0,0,0,8,8,2,i*2+1);if(i<60){const tl=new THREE.PointLight(0xff8822,1.8,120);tl.position.set(p.x+(R()-.5)*w,p.y+h*.7,p.z+d/2+4);sc.add(tl);this._torchLights.push(tl)}}
    commit(this.wallMesh,this.trimMesh,this.roofMesh,this.rTrimMesh,this.doorMesh,this.winMesh)

    const fnPts=this._pts(tiles,new Set([T.VILLAGE]),.25),fnCnt=Math.min(fnPts.length,1200)
    this.fencePostMat=std(0x8a6030,.95);this.fenceRailMat=std(0x9a7040,.92)
    this.fencePostMesh=iMesh(new THREE.BoxGeometry(4,22,4),this.fencePostMat,fnCnt*2,sc,true)
    this.fenceRailMesh=iMesh(new THREE.BoxGeometry(36,3,2),this.fenceRailMat,fnCnt*2,sc,true)
    for(let i=0;i<fnCnt;i++){const{wx,wy}=fnPts[i],p=this._w2t(wx,wy,heights),a=R()*Math.PI,ox=Math.cos(a)*18,oz=Math.sin(a)*18;place(this.fencePostMesh,p.x-ox,p.y+11,p.z-oz,0,a,0,1,1,1,i*2);place(this.fencePostMesh,p.x+ox,p.y+11,p.z+oz,0,a,0,1,1,1,i*2+1);place(this.fenceRailMesh,p.x,p.y+8,p.z,0,a,0,1,1,1,i*2);place(this.fenceRailMesh,p.x,p.y+16,p.z,0,a,0,1,1,1,i*2+1)}
    commit(this.fencePostMesh,this.fenceRailMesh)

    const crPts=this._pts(tiles,new Set([T.VILLAGE]),.20),crCnt=Math.min(crPts.length,1500),crCols=[0xdd2222,0xffaa00,0x44cc22,0xffdd00,0xcc44aa]
    this.cropStemMesh=iMesh(new THREE.CylinderGeometry(1,1,10,4),lam(0x44aa22),crCnt,sc)
    this.cropMeshes=crCols.map(c=>iMesh(new THREE.SphereGeometry(4,5,4),lam(c),Math.ceil(crCnt/crCols.length),sc))
    const crC=new Array(crCols.length).fill(0),crP=Math.ceil(crCnt/crCols.length)
    for(let i=0;i<crCnt;i++){const{wx,wy}=crPts[i],p=this._w2t(wx,wy,heights);place(this.cropStemMesh,p.x,p.y+5,p.z,0,0,0,1,1,1,i);const ci=i%crCols.length;if(crC[ci]<crP){const s=.7+R()*.5;place(this.cropMeshes[ci],p.x,p.y+12,p.z,0,0,0,s,s,s,crC[ci]++)}}
    commit(this.cropStemMesh,...this.cropMeshes)
  }

  _loadAllTextures(){
    const mats=()=>[this.terrainMat,this.wallMat,this.trunkMat,this.canopyMat,this.trimMat,this.roofMat,this.pathStoneMat,this.waterMat,this.driftMat,this.snowBallMat,this.fencePostMat,this.rockMat]
    ;[['lush green grass, top-down',1,6,t=>this.terrainMat&&(this.terrainMat.map=t)],['rough stone brick, medieval mossy',2,4,t=>this.wallMat&&(this.wallMat.map=t)],['dark tree bark, rough',3,3,t=>this.trunkMat&&(this.trunkMat.map=t)],['pine leaves, dark green',4,3,t=>this.canopyMat&&(this.canopyMat.map=t)],['golden straw thatch',5,4,t=>this.trimMat&&(this.trimMat.map=t)],['dark wood shingles, aged',6,4,t=>this.roofMat&&(this.roofMat.map=t)],['cobblestone path, worn',7,5,t=>this.pathStoneMat&&(this.pathStoneMat.map=t)],['blue water surface, ripples',8,6,t=>this.waterMat&&(this.waterMat.map=t)],['sandy beach, golden sand',9,5,t=>this.driftMat&&(this.driftMat.map=t)],['white snow, icy',10,4,t=>this.snowBallMat&&(this.snowBallMat.map=t)],['weathered wood planks',11,3,t=>this.fencePostMat&&(this.fencePostMat.map=t)],['grey granite boulder',12,3,t=>this.rockMat&&(this.rockMat.map=t)]].forEach(([p,s,r,apply])=>pollTex(p,s,r).then(t=>{if(!t)return;apply(t);mats().forEach(m=>{if(m)m.needsUpdate=true})}))
  }

  _getEntityMesh(type,isPlayer=false){
    const g=new THREE.Group()
    const skin=isPlayer?0xf0c890:(ENEMY_TYPES[type]?.color?new THREE.Color(ENEMY_TYPES[type].color).getHex():0xcc4422)
    const cloth=isPlayer?0x2244aa:0x882222,hair=isPlayer?0x1a0a00:0x220000
    const add=(geo,col,x,y,z)=>{const m=new THREE.Mesh(geo,lam(col));m.position.set(x,y,z);m.castShadow=true;g.add(m)}
    // [geo, color, x, y, z]
    ;[[new THREE.BoxGeometry(7,14,7),cloth,-4,7,0],[new THREE.BoxGeometry(7,14,7),cloth,4,7,0],[new THREE.BoxGeometry(16,18,10),cloth,0,23,0],[new THREE.BoxGeometry(5,16,5),skin,-11,22,0],[new THREE.BoxGeometry(5,16,5),skin,11,22,0],[new THREE.BoxGeometry(14,14,12),skin,0,38,0],[new THREE.BoxGeometry(3,2.5,1),0x111111,-3,39,6],[new THREE.BoxGeometry(3,2.5,1),0x111111,3,39,6],[new THREE.BoxGeometry(15,6,13),hair,0,44,0]].forEach(([geo,col,x,y,z])=>add(geo,col,x,y,z))
    if(isPlayer){add(new THREE.BoxGeometry(14,20,2),0x8822aa,0,22,-6);add(new THREE.BoxGeometry(2,28,2),0xccccdd,14,20,0);add(new THREE.BoxGeometry(8,3,3),0xaa8822,14,8,0)}
    g.scale.setScalar(.9);return g
  }

  updatePlayer(player,heights){
    if(!this._playerMesh){this._playerMesh=this._getEntityMesh(null,true);this._playerMeshYaw=0;this.scene.add(this._playerMesh)}
    const p=this._w2t(player.x,player.y,heights);this._playerMesh.position.set(p.x,p.y,p.z)
    if(player.facingYaw!==undefined&&player.state==='walking'){let d=player.facingYaw-this._playerMeshYaw;while(d>Math.PI)d-=PI2;while(d<-Math.PI)d+=PI2;this._playerMeshYaw+=d*.18;this._playerMesh.rotation.y=this._playerMeshYaw}
    if(player.state==='walking')this._playerMesh.position.y+=Math.abs(Math.sin(player.walkFrame*.5))*3
    this._playerMesh.rotation.x=player.state==='attacking'?-.25:0
    const flash=player.hitFlash>0
    this._playerMesh.traverse(c=>{if(c.isMesh&&c.material.emissive)c.material.emissive.set(flash?0xff2222:0)})
  }

  updateEnemies(enemies,heights){
    for(const e of enemies){
      if(!e.alive){if(this.entityMeshes.has(e)){this.scene.remove(this.entityMeshes.get(e));this.entityMeshes.delete(e)}continue}
      if(!this.entityMeshes.has(e)){const m=this._getEntityMesh(e.type,false);this.scene.add(m);this.entityMeshes.set(e,m)}
      const m=this.entityMeshes.get(e),p=this._w2t(e.x,e.y,heights)
      m.position.set(p.x,p.y,p.z);m.rotation.y=e.facingDir==='left'?Math.PI/2:-Math.PI/2
    }
  }

  updateBoss(bossFight,heights){
    if(!bossFight?.entity){if(this._bossMesh){this.scene.remove(this._bossMesh);this._bossMesh=null}return}
    if(!this._bossMesh){this._bossMesh=this._getEntityMesh('DEMON',false);this._bossMesh.scale.setScalar(2.2);this.scene.add(this._bossMesh)}
    const{entity:boss,phase:ph}=bossFight,p=this._w2t(boss.x,boss.y,heights)
    this._bossMesh.position.set(p.x,p.y,p.z)
    this._bossMesh.traverse(c=>{if(c.isMesh&&c.material.emissive)c.material.emissive.set(ph===3?0x440000:ph===2?0x220000:0)})
  }

  updateCamera(player,heights){
    if(!this._camOrbit)this._camOrbit={yaw:0,pitch:.55,dist:260}
    const{yaw,pitch,dist}=this._camOrbit,p=this._w2t(player.x,player.y,heights)
    this._camTarget.set(p.x+Math.sin(yaw)*Math.cos(pitch)*dist,p.y+Math.sin(pitch)*dist,p.z+Math.cos(yaw)*Math.cos(pitch)*dist)
    this.camera.position.lerp(this._camTarget,.08);this.camera.lookAt(p.x,p.y+20,p.z)
  }

  orbitCamera(dx,dy){if(!this._camOrbit)this._camOrbit={yaw:0,pitch:.55,dist:260};this._camOrbit.yaw-=dx*.006;this._camOrbit.pitch=Math.max(.15,Math.min(1.2,this._camOrbit.pitch+dy*.005))}
  getCameraYaw(){return this._camOrbit?.yaw??0}
  zoomCamera(delta){if(!this._camOrbit)this._camOrbit={yaw:0,pitch:.55,dist:260};this._camOrbit.dist=Math.max(80,Math.min(600,this._camOrbit.dist+delta*.3))}

  screenToWorld(sx,sy){
    const rect=this.renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster()
    ray.setFromCamera(new THREE.Vector2(((sx-rect.left)/rect.width)*2-1,-((sy-rect.top)/rect.height)*2+1),this.camera)
    if(!this.terrainMesh)return null
    const hits=ray.intersectObject(this.terrainMesh);if(!hits.length)return null
    return{wx:hits[0].point.x+WORLD_W*TILE_S/2,wy:hits[0].point.z+WORLD_H*TILE_S/2}
  }

  updateTimeOfDay(hour){
    const{a,b,t}=getTC(hour),isNight=hour<6||hour>20
    const nT=isNight?Math.min(1,hour<6?(6-hour)/6:(hour-20)/4):0,dT=1-nT
    this.skyMat.uniforms.uTopColor.value.copy(lerpC(a.top,b.top,t))
    this.skyMat.uniforms.uBotColor.value.copy(lerpC(a.bot,b.bot,t))
    const sa=((hour/24)*PI2)-Math.PI/2
    this.sunSphere.position.set(Math.cos(sa)*1800,Math.sin(sa)*1800,-600)
    this.moonSphere.position.set(-Math.cos(sa)*1800,-Math.sin(sa)*1800,-600)
    this.ambientLight.intensity=.65+dT*.55;this.sunLight.intensity=dT*2.5
    this.moonLight.intensity=nT*1.8;this.nightFill.intensity=nT*.9;this.fillLight.intensity=dT*.7
    this.sunLight.color.copy(lerpC(a.lc,b.lc,t));this.starMat.opacity=nT*.95
    if(this.colorPass){this.colorPass.uniforms.uNightBlue.value=nT*.75;this.colorPass.uniforms.uBrightness.value=1.05+nT*.18}
    this.scene.fog.color.copy(lerpC(a.bot,b.bot,t))
    const fl=1+Math.sin(Date.now()*.008)*.25+R()*.12
    for(const l of this._torchLights)l.intensity=fl*(1.2+nT*1.2)
    for(const l of this._lanternLights)l.intensity=fl*(1+nT)
    if(this.waterMat?.map){this.waterMat.map.offset.x=(Date.now()*.00003)%1;this.waterMat.map.offset.y=(Date.now()*.00002)%1}
    if(this.cloudGroup)this.cloudGroup.position.x=Math.sin(Date.now()*.00004)*80
  }

  _animateGrass(time){
    if(!this.grassMesh||!this._grassPositions)return
    const wave=Math.sin(time*1.8)*.12,cnt=Math.min(this._grassPositions.length,2000)
    for(let i=0;i<cnt;i++){this.grassMesh.getMatrixAt(i,D.matrix);D.matrix.decompose(D.position,D.quaternion,D.scale);D.rotation.z=wave+Math.sin(time*2.2+i*.3)*.08;D.updateMatrix();this.grassMesh.setMatrixAt(i,D.matrix)}
    this.grassMesh.instanceMatrix.needsUpdate=true
  }

  render(gs){
    const{player,world,timeOfDay,bossFight}=gs,h=world.heights
    this.updateTimeOfDay(timeOfDay);this.updateCamera(player,h);this.updatePlayer(player,h)
    this.updateEnemies(gs.enemies,h);this.updateBoss(bossFight,h);this._animateGrass(this.clock.getElapsedTime())
    this.composer.render()
  }

  resize(){this.W=innerWidth;this.H=innerHeight;this.camera.aspect=this.W/this.H;this.camera.updateProjectionMatrix();this.renderer.setSize(this.W,this.H);this.composer.setSize(this.W,this.H)}

  dispose(){
    window.removeEventListener('resize',this._onResize);this.renderer.dispose();this.composer.dispose()
    this.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const m=o.material;Array.isArray(m)?m.forEach(x=>x.dispose()):m.dispose()}})
  }
}
