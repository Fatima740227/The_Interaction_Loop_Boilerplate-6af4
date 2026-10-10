import React, { useState, useCallback, useRef } from 'react'
import GameCanvas from './GameCanvas.jsx'

const cinzel = "'Cinzel',serif"
const gold = '#c8a030'

function TitleBtn({ onClick, disabled, children }) {
  const [h, setH] = useState(false)
  return <button onClick={onClick} disabled={disabled} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
    fontFamily: cinzel, fontSize: '.78rem', fontWeight: 600, letterSpacing: '0.2em',
    color: disabled ? '#7a6020' : h ? '#fff' : '#e8d070',
    background: h ? 'rgba(200,160,40,.15)' : 'transparent',
    border: `2px solid ${disabled ? 'rgba(120,100,40,.25)' : 'rgba(200,160,40,.5)'}`,
    borderRadius: 5, padding: '11px 32px', cursor: disabled ? 'wait' : 'pointer',
    textTransform: 'uppercase', transition: 'all .25s',
  }}>{children}</button>
}

const Divider = ({ mb = 14, op = .4 }) => <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: mb, opacity: op }}>
  {[18,8,5,5,48,48,5,5,8,18].map((w,i) => <div key={i} style={{ width: w, height: 1, background: gold }} />)}
</div>

function TitleScreen({ onStart }) {
  const [loading, setLoading] = useState(false)
  const go = () => { if (loading) return; setLoading(true); setTimeout(() => onStart(), 900) }
  return <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, #1c1208 0%, #080608 55%, #000 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Noto Serif JP',serif", overflow: 'hidden' }}>
    {Array.from({ length: 24 }).map((_, i) => <div key={i} style={{ position: 'absolute', left: `${(i*37+10)%100}%`, top: `${(i*19+5)%100}%`, width: i%5<2?3:2, height: i%5<2?3:2, borderRadius: '50%', background: `rgba(${200+i*2},${130+i*4},${60+i},${0.25+i%4*0.08})` }} />)}
    <Divider />
    <div style={{ fontFamily: "'Noto Serif JP',serif", fontSize: 'clamp(1rem,3vw,1.6rem)', color: 'rgba(200,180,120,.35)', letterSpacing: '0.5em', marginBottom: 6 }}>戦国クロニクル</div>
    <div style={{ fontFamily: "'Cinzel Decorative','Cinzel',serif", fontSize: 'clamp(2.2rem,6vw,4.2rem)', fontWeight: 900, background: 'linear-gradient(180deg,#f8e880 0%,#c8a030 40%,#7a5810 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.15em', lineHeight: 1.1, textAlign: 'center', filter: 'drop-shadow(0 4px 28px rgba(200,160,40,.35))', marginBottom: 6 }}>THE INTERACTION LOOP</div>
    <div style={{ fontFamily: cinzel, fontSize: '.63rem', color: 'rgba(180,160,100,.4)', letterSpacing: '0.28em', marginBottom: 32 }}>FULL WORLD · COMBAT · LOOT · 8 ENEMIES</div>
    <div style={{ fontSize: '4.5rem', margin: '0 0 28px', filter: 'drop-shadow(0 8px 22px rgba(200,160,40,.22))' }}>⚔</div>
    <Divider mb={28} op={.35} />
    <TitleBtn onClick={go} disabled={loading}>{loading ? '⏳  Generating World...' : '⚔  Begin  ⚔'}</TitleBtn>
    <div style={{ display: 'flex', gap: 20, marginTop: 28, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 560 }}>
      {[['👹','Task 1','spawnEnemy()'],['⚔','Task 2','attackEnemy()'],['💥','Task 3','enemyAttack()'],['🧪','Task 4','usePotion()'],['📜','Task 5','updateQuestProgress()']].map(([e,t,d]) => (
        <div key={t} style={{ textAlign: 'center', minWidth: 75 }}>
          <div style={{ fontSize: '1.2rem', marginBottom: 3 }}>{e}</div>
          <div style={{ fontFamily: cinzel, fontSize: '.5rem', color: 'rgba(180,160,80,.65)', letterSpacing: 1 }}>{t}</div>
          <div style={{ fontFamily: "'Crimson Text',serif", fontSize: '.58rem', color: 'rgba(120,100,60,.5)' }}>{d}</div>
        </div>
      ))}
    </div>
  </div>
}

function LoadingScreen() {
  return <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: '1.4rem', color: gold, letterSpacing: 4, marginBottom: 20 }}>GENERATING WORLD</div>
    <div style={{ width: 220, height: 4, background: 'rgba(200,160,40,.15)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', background: 'linear-gradient(90deg,#c8a030,#f0d060)', borderRadius: 2, animation: 'loading-bar 1.5s ease-in-out infinite' }} />
    </div>
    <div style={{ fontFamily: "'Noto Serif JP',serif", fontSize: '.68rem', color: 'rgba(200,160,80,.35)', marginTop: 14, letterSpacing: 4 }}>世界を生成中...</div>
  </div>
}

function HUD({ data }) {
  if (!data) return null
  const { hp=120, maxHp=120, stamina=100, maxStamina=100, level=1, xp=0, xpNext=150, gold=0, kills=0, potions=3, location='', narration='', activeQuests=[], enemiesAlive=0, enemiesTotal=8 } = data
  const hpPct = Math.max(0, Math.min(1, hp / maxHp))
  const stPct = Math.max(0, Math.min(1, stamina / maxStamina))
  const hpCol = hpPct > 0.6 ? '#40d030' : hpPct > 0.3 ? '#d0a020' : '#e02020'
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', userSelect: 'none' }}>
      {narration && <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', maxWidth: 620, width: '90vw', textAlign: 'center', fontFamily: "'Crimson Text',serif", fontSize: '1rem', color: 'rgba(230,210,160,.92)', fontStyle: 'italic', textShadow: '0 2px 10px rgba(0,0,0,.9)' }}>{narration}</div>}
      <div style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(0,0,0,.65)', border: '1px solid rgba(200,160,40,.22)', borderRadius: 6, padding: '5px 12px' }}>
        <div style={{ fontFamily: cinzel, fontSize: '.58rem', color: 'rgba(200,180,100,.6)', letterSpacing: 2 }}>📍 {location}</div>
      </div>
      {/* Enemy counter */}
      <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.72)', border: '1px solid rgba(200,160,40,.3)', borderRadius: 8, padding: '6px 16px', backdropFilter: 'blur(6px)' }}>
        <div style={{ fontFamily: cinzel, fontSize: '.6rem', color: enemiesAlive > 0 ? '#e04040' : '#40c040', letterSpacing: 2 }}>
          {enemiesAlive > 0 ? `👹 ${enemiesAlive} / ${enemiesTotal} enemies remaining` : '✅ All enemies defeated!'}
        </div>
      </div>
      {/* Quest tracker */}
      {activeQuests.length > 0 && <div style={{ position: 'absolute', top: 60, right: 14, width: 210 }}>
        {activeQuests.slice(0,2).map((q,i) => {
          const pct = Math.min(1,(q.progress??0)/Math.max(1,q.count??1)), done = pct>=1
          return <div key={i} style={{ background: 'rgba(0,0,0,.62)', border: `1px solid ${done?'rgba(40,180,40,.3)':'rgba(200,160,40,.18)'}`, borderRadius: 5, padding: '7px 10px', marginBottom: 5, backdropFilter: 'blur(6px)' }}>
            <div style={{ fontFamily: cinzel, fontSize: '.6rem', color: done?'#40c040':gold, letterSpacing: 1, marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
              <span>{done?'✓ ':'◈ '}{q.title}</span>{q.count&&<span style={{fontSize:'.52rem',opacity:.6}}>{q.progress??0}/{q.count}</span>}
            </div>
            {q.count&&<div style={{height:2,background:'rgba(255,255,255,.08)',borderRadius:1,overflow:'hidden'}}><div style={{height:'100%',borderRadius:1,width:`${pct*100}%`,background:done?'#40c040':'linear-gradient(90deg,#c8a030,#f0d060)',transition:'width .4s'}}/></div>}
          </div>
        })}
      </div>}
      {/* Bottom HUD */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,.88) 0%, transparent 100%)', padding: '0 22px 14px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 110 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
          <div>
            <div style={{ fontFamily: cinzel, fontSize: '.48rem', color: 'rgba(200,180,100,.45)', letterSpacing: 2, marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}><span>HP</span><span>{hp}/{maxHp}</span></div>
            <div style={{ height: 7, background: 'rgba(0,0,0,.55)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${hpPct*100}%`, background: hpCol, borderRadius: 4, transition: 'width .25s' }} />
            </div>
          </div>
          <div>
            <div style={{ fontFamily: cinzel, fontSize: '.48rem', color: 'rgba(200,180,100,.45)', letterSpacing: 2, marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}><span>STAMINA</span><span>{Math.round(stamina)}/{maxStamina}</span></div>
            <div style={{ height: 5, background: 'rgba(0,0,0,.55)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stPct*100}%`, background: 'linear-gradient(90deg,#20c080,#40e0a0)', borderRadius: 3, transition: 'width .25s' }} />
            </div>
          </div>
        </div>
        <div style={{ fontFamily: cinzel, fontSize: '.5rem', color: 'rgba(200,160,40,.4)', textAlign: 'center', letterSpacing: 1, lineHeight: 1.8 }}>
          WASD · Move &nbsp;|&nbsp; SPACE · Attack &nbsp;|&nbsp; Q · Dodge &nbsp;|&nbsp; F · Potion &nbsp;|&nbsp; E · Interact
        </div>
        <div style={{ textAlign: 'right', minWidth: 120 }}>
          <div style={{ fontFamily: cinzel, fontSize: '.68rem', color: gold, background: 'rgba(0,0,0,.55)', border: '1px solid rgba(200,160,40,.3)', borderRadius: 4, padding: '3px 10px', letterSpacing: 2, marginBottom: 4, display: 'inline-block' }}>LV {level}</div>
          <div style={{ height: 3, background: 'rgba(0,0,0,.4)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ height: '100%', width: `${(xp/Math.max(1,xpNext))*100}%`, background: 'linear-gradient(90deg,#c8a030,#f0d060)', borderRadius: 2, transition: 'width .3s' }} />
          </div>
          <div style={{ fontFamily: cinzel, fontSize: '.5rem', color: 'rgba(200,160,40,.6)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <span>¥{gold}</span><span>🧪{potions}</span><span>☠{kills}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState('title')
  const [hudData, setHudData] = useState(null)
  const canvasRef = useRef(null)

  const handleHudUpdate = useCallback(fn => setHudData(prev => typeof fn === 'function' ? (fn(prev) ?? prev) : fn), [])
  const startGame = () => { setScreen('loading'); setTimeout(() => setScreen('game'), 1100) }

  return <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000', position: 'relative' }}>
    {screen === 'title'   && <TitleScreen onStart={startGame} />}
    {screen === 'loading' && <LoadingScreen />}
    {screen === 'game'    && <>
      <GameCanvas groqKey="" savedSlot={null} onHudUpdate={handleHudUpdate} ref={canvasRef} />
      <HUD data={hudData} />
    </>}
  </div>
}
