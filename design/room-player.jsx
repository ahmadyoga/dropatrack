// room-player.jsx — video stage + now-playing + transport
const { useState:useStateP, useRef:useRefP, useEffect:useEffectP } = React;

/* draggable bar used for both progress + volume */
function Scrubber({ value, max, onChange, color='var(--accent)', height=14, knob=true }){
  const ref = useRefP(null);
  const [drag, setDrag] = useStateP(false);
  const pct = max? Math.max(0,Math.min(1, value/max)) : 0;
  const set = (clientX)=>{
    const r = ref.current.getBoundingClientRect();
    onChange(Math.max(0,Math.min(1,(clientX-r.left)/r.width))*max);
  };
  useEffectP(()=>{
    if(!drag) return;
    const mv=e=>set(e.clientX ?? e.touches?.[0]?.clientX);
    const up=()=>setDrag(false);
    window.addEventListener('pointermove',mv); window.addEventListener('pointerup',up);
    return ()=>{ window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up); };
  });
  return (
    <div ref={ref} onPointerDown={e=>{ setDrag(true); set(e.clientX); }}
      style={{ position:'relative', height, flex:1, cursor:'pointer', display:'flex', alignItems:'center', touchAction:'none' }}>
      <div style={{ position:'absolute', left:0, right:0, height:height*0.6, top:'50%', transform:'translateY(-50%)',
        background:'var(--panel-3)', border:'2.5px solid var(--outline)', borderRadius:20 }}/>
      <div style={{ position:'absolute', left:0, width:`calc(${pct*100}% )`, height:height*0.6, top:'50%', transform:'translateY(-50%)',
        background:color, border:'2.5px solid var(--outline)', borderRadius:20, transition:drag?'none':'width .15s linear' }}/>
      {knob && <div style={{ position:'absolute', left:`${pct*100}%`, top:'50%', transform:'translate(-50%,-50%)',
        width:height+8, height:height+8, background:'var(--panel)', border:'3px solid var(--outline)', borderRadius:'50%',
        boxShadow:'2px 2px 0 var(--shadow)', transition:drag?'none':'left .15s linear' }}/>}
    </div>
  );
}

function Player({ track, isPlaying, currentTime, volume, speaker, onPlay, onPrev, onNext, onSeek, onVol, onSpeaker, onShuffle, onReact, compact }){
  const dur = track? track.dur : 0;
  return (
    <div className="pop wobble-2" style={{ overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'7px 7px 0 var(--shadow)' }}>
      {/* video stage */}
      <div style={{ position:'relative', aspectRatio:'16/9', minHeight:0 }}>
        <TrackArt track={track} big style={{ position:'absolute', inset:0 }}/>
        {/* faux yt chrome */}
        <div style={{ position:'absolute', top:12, left:12, display:'flex', gap:7 }}>
          <span className="chip" style={{ background:'rgba(20,15,31,.7)', color:'#fff', borderColor:'rgba(255,255,255,.45)' }}><span className="live-dot"/>SYNCED · everyone at {fmt(currentTime)}</span>
        </div>
        {!speaker && <div className="chip" style={{ position:'absolute', top:12, right:12, background:'var(--pop-yellow)', color:'#140f1f', borderColor:'var(--outline)' }}>
          <Icon name="remote" size={13}/> REMOTE MODE
        </div>}
        {/* big play overlay */}
        <button onClick={onPlay} style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'transparent', border:'none', cursor:'pointer' }}>
          <div className="pop" style={{ width:84, height:84, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
            background:'var(--accent)', color:'#140f1f', boxShadow:'5px 5px 0 var(--shadow)', transform: isPlaying?'scale(.0)':'scale(1)', opacity:isPlaying?0:1, transition:'all .2s' }}>
            <Icon name="play" size={40} sw={2}/>
          </div>
        </button>
      </div>

      {/* now playing strip */}
      <div style={{ padding:'14px 16px 16px', borderTop:'3px solid var(--outline)', background:'var(--panel)' }}>
        <div className="row" style={{ gap:13, marginBottom:13 }}>
          <div className="ph" style={{ width:52, height:52, borderRadius:12, border:'2.5px solid var(--outline)', flex:'none', overflow:'hidden' }}>
            <TrackArt track={track} label={false} style={{ width:'100%', height:'100%' }}/>
          </div>
          <div style={{ overflow:'hidden', flex:1 }}>
            <div className="mono" style={{ fontSize:9, color:'var(--ink-dim)', letterSpacing:'.12em' }}>NOW PLAYING</div>
            <div className="display" style={{ fontSize:20, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track? track.title : '—'}</div>
            <div style={{ fontSize:13, color:'var(--ink-soft)', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track? track.artist : 'queue is empty'}</div>
          </div>
        </div>

        {/* progress */}
        <div className="row" style={{ gap:11 }}>
          <span className="mono" style={{ fontSize:11, fontWeight:700, width:38, textAlign:'right' }}>{fmt(currentTime)}</span>
          <Scrubber value={currentTime} max={dur||1} onChange={onSeek}/>
          <span className="mono" style={{ fontSize:11, fontWeight:700, width:38, color:'var(--ink-dim)' }}>{fmt(dur)}</span>
        </div>

        {/* transport */}
        <div className="row" style={{ marginTop:14, gap:11, flexWrap:'wrap' }}>
          <div className="row" style={{ gap:9 }}>
            <button className="btn pop-sm btn-icon" onClick={onShuffle} title="Shuffle"><Icon name="shuffle" size={20}/></button>
            <button className="btn pop-sm btn-icon" onClick={onPrev} title="Previous"><Icon name="prev" size={22}/></button>
            <button className="btn btn-accent" onClick={onPlay} style={{ width:58, height:52, padding:0 }} title="Play/Pause">
              <Icon name={isPlaying?'pause':'play'} size={26} sw={2}/>
            </button>
            <button className="btn pop-sm btn-icon" onClick={onNext} title="Next"><Icon name="next" size={22}/></button>
          </div>
          <div className="row" style={{ gap:9, flex:'1 1 150px', minWidth:140, padding:'0 13px 0 11px', borderRadius:12, border:'2.5px solid var(--outline)', background:'var(--panel)', boxShadow:'4px 4px 0 var(--shadow)', height:48 }}>
            <button onClick={()=>onVol(volume>0?0:0.72)} title="Mute" style={{ background:'none', border:'none', color:'var(--ink)', cursor:'pointer', display:'flex', padding:0, flex:'none' }}><Icon name={volume===0?'mute':'volume'} size={20}/></button>
            <Scrubber value={volume} max={1} onChange={onVol} color="var(--accent-2)" height={12}/>
            <span className="mono" style={{ fontSize:11, fontWeight:700, width:26, textAlign:'right', color:'var(--ink-dim)', flex:'none' }}>{Math.round(volume*100)}</span>
          </div>
          <button className={'btn pop-sm'} onClick={onSpeaker} title="Speaker / remote mode" style={{ gap:8, background: speaker?'var(--accent-2)':'var(--panel)', color: speaker?'#140f1f':'var(--ink)' }}>
            <Icon name={speaker?'speaker':'remote'} size={19}/>
            <span style={{ fontSize:12 }}>{speaker?'SPEAKER':'REMOTE'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- played history widget (fills left column in "strip" crew layout) ---- */
function PlayHistory({ queue, idx, onJump }){
  const played = queue.slice(0, idx).slice().reverse(); // most recent first
  return (
    <div className="pop wobble" style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, overflow:'hidden', boxShadow:'7px 7px 0 var(--shadow)' }}>
      <div className="row" style={{ justifyContent:'space-between', padding:'13px 15px', borderBottom:'3px solid var(--outline)' }}>
        <div className="row" style={{ gap:9 }}>
          <Icon name="replay" size={19}/>
          <div className="display" style={{ fontSize:18 }}>Already dropped</div>
        </div>
        <span className="chip" style={{ background:'var(--panel)' }}>{played.length}</span>
      </div>
      <div className="scroll" style={{ flex:1, overflowY:'auto', padding:11, display:'flex', flexDirection:'column', gap:7 }}>
        {played.length===0
          ? <div className="mono" style={{ fontSize:11, color:'var(--ink-dim)', textAlign:'center', margin:'auto', padding:'20px 12px', lineHeight:1.7 }}>nothing dropped yet —<br/>the night's just getting started ✨</div>
          : played.map(it=>(
              <div key={it.qid} className="row" style={{ gap:11, padding:'7px 8px', borderRadius:12, border:'2.5px solid var(--line)' }}>
                <div style={{ width:40, height:40, borderRadius:9, overflow:'hidden', border:'2.5px solid var(--outline)', flex:'none' }}>
                  <TrackArt track={it} label={false} style={{ width:'100%', height:'100%' }}/>
                </div>
                <div style={{ flex:1, overflow:'hidden' }}>
                  <div style={{ fontWeight:700, fontSize:13.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.title}</div>
                  <div className="mono" style={{ fontSize:10.5, color:'var(--ink-dim)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.artist}</div>
                </div>
                <button className="btn pop-sm btn-icon" onClick={()=>onJump(it.qid)} title="Drop it again" style={{ flex:'none' }}><Icon name="replay" size={16}/></button>
              </div>
            ))}
      </div>
    </div>
  );
}

/* ---- discover widget: curated fresh tracks to add to the queue ---- */
function Discover({ onAdd }){
  return (
    <div className="pop wobble" style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, overflow:'hidden', boxShadow:'7px 7px 0 var(--shadow)' }}>
      <div className="row" style={{ justifyContent:'space-between', padding:'13px 15px', borderBottom:'3px solid var(--outline)' }}>
        <div className="row" style={{ gap:9 }}>
          <Icon name="bolt" size={19}/>
          <div className="display" style={{ fontSize:18 }}>Discover</div>
        </div>
        <span className="chip" style={{ background:'var(--accent-2)', color:'#140f1f' }}>fresh drops</span>
      </div>
      <div className="scroll" style={{ flex:1, overflowY:'auto', padding:11, display:'flex', flexDirection:'column', gap:7 }}>
        {SEARCH_POOL.map(t=>(
          <div key={t.id} className="row" style={{ gap:11, padding:'7px 8px', borderRadius:12, border:'2.5px solid var(--line)' }}>
            <div style={{ width:40, height:40, borderRadius:9, overflow:'hidden', border:'2.5px solid var(--outline)', flex:'none' }}>
              <TrackArt track={t} label={false} style={{ width:'100%', height:'100%' }}/>
            </div>
            <div style={{ flex:1, overflow:'hidden' }}>
              <div style={{ fontWeight:700, fontSize:13.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.title}</div>
              <div className="mono" style={{ fontSize:10.5, color:'var(--ink-dim)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.artist}</div>
            </div>
            <button className="btn pop-sm btn-icon" onClick={()=>onAdd(t)} title="Add to queue" style={{ flex:'none' }}><Icon name="plus" size={17}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Player, Scrubber, PlayHistory, Discover });
