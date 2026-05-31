// room.jsx — RoomView: shared state, layout, reactions, modals, mobile nav
const { useState:useStateR, useRef:useRefR, useEffect:useEffectR, useCallback } = React;

/* ---- floating emoji burst ---- */
function spawnReactions(emoji, n){
  const layer = document.getElementById('react-layer');
  if(!layer) return;
  for(let i=0;i<n;i++){
    const el = document.createElement('div');
    el.className = 'float-emoji';
    el.textContent = emoji;
    const dur = 3.2 + Math.random()*2.4;
    el.style.left = (4 + Math.random()*92) + 'vw';
    el.style.setProperty('--dur', dur+'s');
    el.style.setProperty('--drift', (Math.random()*160-80)+'px');
    el.style.setProperty('--rot', (Math.random()*40-20)+'deg');
    el.style.setProperty('--rot2', (Math.random()*60-30)+'deg');
    el.style.fontSize = (24 + Math.random()*26)+'px';
    el.style.animationDelay = (Math.random()*0.5)+'s';
    layer.appendChild(el);
    setTimeout(()=>el.remove(), (dur+0.6)*1000);
  }
}

function ReactionBar({ onReact }){
  const [pick,setPick] = useStateR(false);
  const fire = (e)=>{ onReact(e, 50 + Math.floor(Math.random()*45)); };
  return (
    <div className="pop wobble-2" style={{ padding:'11px 13px', boxShadow:'6px 6px 0 var(--shadow)', position:'relative' }}>
      <div className="row" style={{ gap:9, justifyContent:'space-between' }}>
        <div className="mono" style={{ fontSize:10, color:'var(--ink-dim)', letterSpacing:'.1em', writingMode:'horizontal-tb', flex:'none' }}>REACT →</div>
        <div className="row" style={{ gap:7, flex:1, justifyContent:'center', flexWrap:'wrap' }}>
          {QUICK_EMOJI.map(e=>(
            <button key={e} onClick={()=>fire(e)} className="pop-sm" style={{ fontSize:22, width:40, height:40, borderRadius:11, background:'var(--panel-2)', border:'2.5px solid var(--outline)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'transform .08s' }}
                onMouseDown={ev=>ev.currentTarget.style.transform='scale(.85)'} onMouseUp={ev=>ev.currentTarget.style.transform='scale(1)'} onMouseLeave={ev=>ev.currentTarget.style.transform='scale(1)'}>{e}</button>
          ))}
        </div>
        <button className="btn pop-sm btn-icon" onClick={()=>setPick(p=>!p)} title="More emoji" style={{ flex:'none' }}><Icon name="plus" size={18}/></button>
      </div>
      {pick && <div className="pop wobble popin" style={{ position:'absolute', bottom:'calc(100% + 10px)', right:0, padding:11, width:286, zIndex:40, boxShadow:'6px 6px 0 var(--accent)' }}>
        <div className="row" style={{ justifyContent:'space-between', marginBottom:8 }}>
          <div className="mono" style={{ fontSize:10, letterSpacing:'.1em', color:'var(--ink-dim)' }}>FULL PICKER</div>
          <button className="btn btn-ghost btn-icon" onClick={()=>setPick(false)} style={{ padding:2, boxShadow:'none', border:'none' }}><Icon name="close" size={15}/></button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:5 }}>
          {EMOJI_PICKER.map(e=>(
            <button key={e} onClick={()=>{ fire(e); }} style={{ fontSize:20, height:32, borderRadius:8, background:'transparent', border:'none', cursor:'pointer' }}
              onMouseEnter={ev=>ev.currentTarget.style.background='var(--panel-3)'} onMouseLeave={ev=>ev.currentTarget.style.background='transparent'}>{e}</button>
          ))}
        </div>
      </div>}
    </div>
  );
}

/* ---- settings modal ---- */
function SettingsModal({ room, theme, onToggleTheme, onClose, onLeave }){
  const [priv,setPriv] = useStateR(false);
  const [sync,setSync] = useStateR(true);
  const [auto,setAuto] = useStateR(true);
  const Toggle = ({on,set,label,sub})=>(
    <div className="row" style={{ justifyContent:'space-between', gap:14, padding:'12px 0', borderBottom:'2px solid var(--line)' }}>
      <div><div style={{ fontWeight:700, fontSize:14 }}>{label}</div><div className="mono" style={{ fontSize:11, color:'var(--ink-dim)' }}>{sub}</div></div>
      <button onClick={()=>set(!on)} style={{ width:54, height:30, borderRadius:20, border:'3px solid var(--outline)', background:on?'var(--accent)':'var(--panel-3)', position:'relative', cursor:'pointer', flex:'none', transition:'background .15s' }}>
        <span style={{ position:'absolute', top:1, left:on?25:1, width:22, height:22, borderRadius:'50%', background:'var(--panel)', border:'2.5px solid var(--outline)', transition:'left .15s' }}/>
      </button>
    </div>
  );
  return (
    <div className="scrim" onClick={onClose}>
      <div className="pop wobble-2 popin" onClick={e=>e.stopPropagation()} style={{ width:'min(480px,94vw)', overflow:'hidden', boxShadow:'9px 9px 0 var(--accent)' }}>
        <div className="row" style={{ justifyContent:'space-between', padding:'16px 18px', borderBottom:'3px solid var(--outline)', background:'var(--accent-2)', color:'#140f1f' }}>
          <div className="display" style={{ fontSize:21 }}>Room settings</div>
          <button className="btn pop-sm btn-icon" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div style={{ padding:'8px 18px 18px' }}>
          <Toggle on={priv} set={setPriv} label="Private room" sub="hide from the public galaxy"/>
          <Toggle on={sync} set={setSync} label="Locked sync" sub="everyone hears the same moment"/>
          <Toggle on={auto} set={setAuto} label="Autoplay next" sub="roll into the next track"/>
          <div className="row" style={{ justifyContent:'space-between', gap:14, padding:'14px 0 6px' }}>
            <div><div style={{ fontWeight:700, fontSize:14 }}>Lights</div><div className="mono" style={{ fontSize:11, color:'var(--ink-dim)' }}>{theme==='dark'?'deep space':'daylight cosmos'}</div></div>
            <button className="btn pop-sm" onClick={onToggleTheme} style={{ gap:8 }}><Icon name={theme==='dark'?'sun':'moon'} size={17}/> <span style={{ fontSize:12 }}>{theme==='dark'?'LIGHT':'DARK'}</span></button>
          </div>
          <button className="btn pop-sm" onClick={onLeave} style={{ width:'100%', marginTop:18, background:'var(--pop-coral)', color:'#140f1f' }}><Icon name="back" size={18}/> LEAVE ROOM</button>
        </div>
      </div>
    </div>
  );
}

function Lightbox({ src, onClose }){
  return (
    <div className="scrim" onClick={onClose} style={{ zIndex:320 }}>
      <div className="popin" style={{ position:'relative' }} onClick={e=>e.stopPropagation()}>
        <img src={src} style={{ maxWidth:'88vw', maxHeight:'82vh', borderRadius:16, border:'4px solid var(--outline)', boxShadow:'10px 10px 0 var(--accent)' }}/>
        <button className="btn pop-sm btn-icon" onClick={onClose} style={{ position:'absolute', top:-16, right:-16, background:'var(--accent)', color:'#140f1f' }}><Icon name="close" size={20}/></button>
      </div>
    </div>
  );
}

/* ---- mobile tab nav ---- */
function MobileNav({ tab, setTab, unread }){
  const tabs = [['player','play','Player'],['queue','list','Queue'],['people','users','Crew'],['chat','chat','Chat']];
  return (
    <div className="row pop" style={{ position:'fixed', left:10, right:10, bottom:10, zIndex:120, padding:6, gap:5, borderRadius:18, justifyContent:'space-around', boxShadow:'5px 5px 0 var(--shadow)' }}>
      {tabs.map(([id,ic,label])=>(
        <button key={id} onClick={()=>setTab(id)} className="col" style={{ flex:1, gap:2, alignItems:'center', padding:'8px 0', borderRadius:12, border:'none', cursor:'pointer',
          background: tab===id?'var(--accent)':'transparent', color: tab===id?'#140f1f':'var(--ink)', position:'relative' }}>
          <Icon name={ic} size={20}/>
          <span className="mono" style={{ fontSize:9, fontWeight:700, textTransform:'uppercase' }}>{label}</span>
          {id==='chat' && unread>0 && <span style={{ position:'absolute', top:4, right:'24%', minWidth:16, height:16, padding:'0 4px', borderRadius:10, background:'var(--pop-magenta)', color:'#fff', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--outline)' }}>{unread}</span>}
        </button>
      ))}
    </div>
  );
}

function RoomView({ room, theme, onToggleTheme, onLeave, crewLayout='list' }){
  const mkQ = (t)=>({ ...t, qid:'q'+Math.random().toString(36).slice(2) });
  const [queue,setQueue] = useStateR(()=> TRACKS.slice(0,7).map(mkQ));
  const [idx,setIdx] = useStateR(2);
  const [replay,setReplay] = useStateR(true);
  const [playing,setPlaying] = useStateR(true);
  const [time,setTime] = useStateR(37);
  const [vol,setVol] = useStateR(0.72);
  const [speaker,setSpeaker] = useStateR(true);
  const [users,setUsers] = useStateR(()=> USERS.map(u=>({...u})));
  const [messages,setMessages] = useStateR(()=> CHAT_SEED.map(m=>({...m})));
  const [unread,setUnread] = useStateR(2);
  const [light,setLight] = useStateR(null);
  const [settings,setSettings] = useStateR(false);
  const [tab,setTab] = useStateR('player');
  const [mobile,setMobile] = useStateR(window.innerWidth<980);

  const cur = queue[idx];

  useEffectR(()=>{ const f=()=>setMobile(window.innerWidth<980); window.addEventListener('resize',f); return ()=>window.removeEventListener('resize',f); },[]);

  // playback clock
  useEffectR(()=>{
    if(!playing || !cur) return;
    const iv = setInterval(()=> setTime(t=>{
      if(t+1 >= cur.dur){ next(); return 0; }
      return t+1;
    }), 1000);
    return ()=>clearInterval(iv);
  });

  // simulated incoming reactions
  useEffectR(()=>{
    const iv = setInterval(()=>{ if(Math.random()>0.55){ const e=QUICK_EMOJI[Math.floor(Math.random()*QUICK_EMOJI.length)]; spawnReactions(e, 8+Math.floor(Math.random()*10)); } }, 4200);
    return ()=>clearInterval(iv);
  },[]);

  const play = ()=>setPlaying(p=>!p);
  const next = ()=>{ setIdx(i=> i+1>=queue.length?0:i+1); setTime(0); };
  const prev = ()=>{ if(time>3){ setTime(0); return; } setIdx(i=> i-1<0?queue.length-1:i-1); setTime(0); };
  const seek = (t)=>setTime(t);
  const jump = (qid)=>{ const i=queue.findIndex(q=>q.qid===qid); if(i>=0){ setIdx(i); setTime(0); setPlaying(true); } };
  const moveNext = (qid)=>{ setQueue(q=>{ const arr=[...q]; const from=arr.findIndex(x=>x.qid===qid); if(from<0) return q; const [it]=arr.splice(from,1); const insert= from<=idx? idx : idx+1; arr.splice(insert,0,it); return arr; }); };
  const remove = (qid)=>{ setQueue(q=>{ const i=q.findIndex(x=>x.qid===qid); if(i<0) return q; const arr=q.filter(x=>x.qid!==qid); if(i<idx) setIdx(x=>x-1); return arr; }); };
  const reorder = (from,to)=>{ setQueue(q=>{ const arr=[...q]; const [it]=arr.splice(from,1); arr.splice(to,0,it);
    setIdx(ci=>{ if(from===ci) return to; let n=ci; if(from<ci) n--; if(to<=ci) n++; return n; }); return arr; }); };
  const shuffle = ()=>{ setQueue(q=>{ const head=q.slice(0,idx+1); const tail=q.slice(idx+1); for(let i=tail.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [tail[i],tail[j]]=[tail[j],tail[i]]; } return [...head,...tail]; }); };
  const addSong = (t)=>{ setQueue(q=>[...q, mkQ(t)]); };
  const react = (e,n)=>spawnReactions(e,n);

  const rename = (id,name)=>setUsers(us=>us.map(u=>u.id===id?{...u,name}:u));
  const setRole = (id,role)=>setUsers(us=>us.map(u=>u.id===id?{...u,role}:u));
  const send = (m)=>{ setMessages(ms=>[...ms,m]); };
  const seen = ()=>setUnread(0);

  // panels
  const playerEl = <Player track={cur} isPlaying={playing} currentTime={time} volume={vol} speaker={speaker}
    onPlay={play} onPrev={prev} onNext={next} onSeek={seek} onVol={setVol} onSpeaker={()=>setSpeaker(s=>!s)} onShuffle={shuffle} onReact={react}/>;
  const reactEl = <ReactionBar onReact={react}/>;
  const queueEl = <Queue queue={queue} currentIndex={idx} replay={replay} onReplay={()=>setReplay(r=>!r)} onReorder={reorder} onJump={jump} onNext={moveNext} onRemove={remove} onShuffle={shuffle} onAdd={addSong}/>;
  const peopleEl = <People users={users} meId={ME_ID} onRename={rename} onRole={setRole}/>;
  const crewStripEl = <CrewStrip users={users} meId={ME_ID} onRename={rename} onRole={setRole}/>;
  const discoverEl = <Discover onAdd={addSong}/>;
  const chatEl = <Chat messages={messages} users={users} meId={ME_ID} onSend={send} onAddToQueue={addSong} onOpenImage={setLight} onSeen={seen} unread={unread}/>;

  const header = (
    <div className="row" style={{ justifyContent:'space-between', gap:12, marginBottom:16, flexWrap:'wrap' }}>
      <div className="row" style={{ gap:13, minWidth:0 }}>
        <button className="btn pop-sm btn-icon" onClick={onLeave} title="Back to rooms"><Icon name="back" size={20}/></button>
        <div style={{ minWidth:0 }}>
          <div className="row" style={{ gap:9, alignItems:'center' }}>
            <h1 className="display" style={{ fontSize:'clamp(22px,3vw,32px)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'46vw' }}>{room.name}</h1>
            <span className="chip" style={{ background:'var(--panel)' }}><span className="live-dot"/>LIVE</span>
          </div>
          <div className="mono" style={{ fontSize:11, color:'var(--ink-dim)', letterSpacing:'.06em', marginTop:2 }}>host @{room.host} · {room.genre}</div>
        </div>
      </div>
      <div className="row" style={{ gap:9 }}>
        <span className="chip" style={{ background:'var(--accent-2)', color:'#140f1f' }}><Icon name="users" size={13}/> {users.length} aboard</span>
        <button className="btn pop-sm btn-icon" onClick={onToggleTheme} title="Toggle lights"><Icon name={theme==='dark'?'sun':'moon'} size={19}/></button>
        <button className="btn pop-sm btn-icon" onClick={()=>setSettings(true)} title="Settings"><Icon name="gear" size={20}/></button>
      </div>
    </div>
  );

  return (
    <div style={{ position:'relative', height:'100vh', zIndex:1, display:'flex', flexDirection:'column' }}>
      <StarField n={24} seed={room.id.length+3}/>
      <div style={{ padding: mobile? '16px 14px 92px':'20px 22px 22px', flex:1, minHeight:0, display:'flex', flexDirection:'column', position:'relative', overflow: mobile?'auto':'hidden' }} className={mobile?'scroll noscb':''}>
        {header}

        {!mobile ? (
          <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'minmax(440px, 1.55fr) minmax(300px, 1.02fr) minmax(330px, 1.12fr)', gap:18 }}>
            <div className="col scroll noscb" style={{ gap:14, minHeight:0, overflowY:'auto' }}>
              {playerEl}
              {reactEl}
              {crewLayout==='strip' ? (
                <div style={{ flex:1, minHeight:200, display:'flex' }}>{discoverEl}</div>
              ) : (
                <div style={{ flex:1, minHeight:230, display:'flex' }}>{peopleEl}</div>
              )}
            </div>
            <div className="col" style={{ minHeight:0 }}>{queueEl}</div>
            <div className="col" style={{ minHeight:0 }}>
              {crewLayout==='strip' && crewStripEl}
              {chatEl}
            </div>
          </div>
        ) : (
          <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>
            {tab==='player' && <div className="col" style={{ gap:14 }}>{playerEl}{reactEl}</div>}
            {tab==='queue' && <div style={{ display:'flex', minHeight:460 }}>{queueEl}</div>}
            {tab==='people' && <div style={{ display:'flex', minHeight:460 }}>{peopleEl}</div>}
            {tab==='chat' && <div style={{ display:'flex', minHeight:520 }}>{chatEl}</div>}
          </div>
        )}
      </div>

      {mobile && <MobileNav tab={tab} setTab={(t)=>{ setTab(t); if(t==='chat') seen(); }} unread={unread}/>}
      {settings && <SettingsModal room={room} theme={theme} onToggleTheme={onToggleTheme} onClose={()=>setSettings(false)} onLeave={onLeave}/>}
      {light && <Lightbox src={light} onClose={()=>setLight(null)}/>}
    </div>
  );
}

Object.assign(window, { RoomView, spawnReactions, ReactionBar, SettingsModal, Lightbox, MobileNav });
