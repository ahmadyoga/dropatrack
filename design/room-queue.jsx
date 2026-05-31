// room-queue.jsx — queue list (drag reorder, search, jump, move-next, remove) + add-song
const { useState:useStateQ, useRef:useRefQ } = React;

function AddSongModal({ onClose, onAdd }){
  const [q,setQ] = useStateQ('');
  const [url,setUrl] = useStateQ('');
  const results = SEARCH_POOL.filter(t=> !q || (t.title+t.artist).toLowerCase().includes(q.toLowerCase()));
  const pasteAdd = ()=>{
    if(!url.trim()) return;
    const pool=[...SEARCH_POOL,...TRACKS]; const pick=pool[Math.floor(Math.random()*pool.length)];
    onAdd({ ...pick, id:'u'+Date.now() }); setUrl('');
  };
  return (
    <div className="scrim" onClick={onClose}>
      <div className="pop wobble-2 popin" onClick={e=>e.stopPropagation()} style={{ width:'min(760px,94vw)', maxHeight:'86vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'9px 9px 0 var(--accent)' }}>
        <div className="row" style={{ justifyContent:'space-between', padding:'16px 18px', borderBottom:'3px solid var(--outline)', background:'var(--accent-3)', color:'#140f1f' }}>
          <div className="display" style={{ fontSize:21 }}>Add a song</div>
          <button className="btn pop-sm btn-icon" onClick={onClose}><Icon name="close" size={18}/></button>
        </div>
        <div style={{ padding:18, display:'flex', flexDirection:'column', gap:14, minHeight:0 }}>
          <div className="row" style={{ gap:10 }}>
            <input className="field" value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste a YouTube URL…" style={{ flex:1 }} onKeyDown={e=>e.key==='Enter'&&pasteAdd()}/>
            <button className="btn btn-accent pop-sm" onClick={pasteAdd}><Icon name="link" size={17}/> ADD</button>
          </div>
          <div className="row" style={{ gap:8 }}>
            <div style={{ flex:1, height:2.5, background:'var(--line)' }}/>
            <span className="mono" style={{ fontSize:10, color:'var(--ink-dim)', letterSpacing:'.1em' }}>OR SEARCH</span>
            <div style={{ flex:1, height:2.5, background:'var(--line)' }}/>
          </div>
          <div className="row" style={{ gap:10, position:'relative' }}>
            <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'var(--ink-dim)' }}><Icon name="search" size={18}/></span>
            <input className="field" autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search the cosmos…" style={{ paddingLeft:42 }}/>
          </div>
          <div className="scroll" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:9, overflowY:'auto', paddingRight:4 }}>
            {results.map(t=>(
              <div key={t.id} className="row pop-sm" style={{ gap:11, padding:8, borderRadius:12, background:'var(--panel-2)' }}>
                <div style={{ width:42, height:42, borderRadius:9, overflow:'hidden', border:'2.5px solid var(--outline)', flex:'none' }}>
                  <TrackArt track={t} label={false} style={{ width:'100%', height:'100%' }}/>
                </div>
                <div style={{ flex:1, overflow:'hidden' }}>
                  <div style={{ fontWeight:700, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.title}</div>
                  <div className="mono" style={{ fontSize:11, color:'var(--ink-dim)' }}>{t.artist} · {fmt(t.dur)}</div>
                </div>
                <button className="btn btn-accent pop-sm btn-icon" onClick={()=>onAdd({ ...t, id:'u'+Date.now()+Math.random() })}><Icon name="plus" size={18}/></button>
              </div>
            ))}
            {results.length===0 && <div className="mono" style={{ gridColumn:'1/-1', textAlign:'center', color:'var(--ink-dim)', padding:20, fontSize:13 }}>no signal out here… try another search 🛰️</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueRow({ item, idx, status, replay, onJump, onNext, onRemove, dnd }){
  const isNow = status==='now';
  const played = status==='played';
  const muted = played && !replay;       // looks disabled when replay is off
  return (
    <div draggable={!muted}
      onDragStart={e=>!muted&&dnd.start(e,idx)} onDragOver={e=>dnd.over(e,idx)} onDrop={e=>dnd.drop(e,idx)} onDragEnd={dnd.end}
      className={'row '+(dnd.dragIdx===idx?'dragging ':'')+(dnd.overIdx===idx?'drag-over ':'')}
      style={{ gap:10, padding:'9px 10px', borderRadius:12,
        border:'2.5px '+(played?'dashed':'solid')+' '+(isNow?'var(--accent)':'var(--line)'),
        background: isNow?'var(--panel-3)':played?'transparent':'var(--panel-2)',
        opacity: muted?0.42:1, filter: muted?'grayscale(0.6)':'none',
        transition:'opacity .2s, filter .2s', position:'relative' }}>
      <div style={{ cursor: muted?'default':'grab', color:'var(--ink-dim)', flex:'none', touchAction:'none', opacity: muted?0.4:1 }} title="Drag to reorder"><Icon name="drag" size={18}/></div>
      <div style={{ width:40, height:40, borderRadius:8, overflow:'hidden', border:'2.5px solid var(--outline)', flex:'none', position:'relative' }}>
        <TrackArt track={item} label={false} style={{ width:'100%', height:'100%' }}/>
        {isNow && <div style={{ position:'absolute', inset:0, background:'rgba(20,15,31,.45)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="row" style={{ gap:2 }}>{[0,1,2].map(i=><span key={i} style={{ width:3, height:8+(i%2?6:0), background:'var(--accent)', borderRadius:2 }}/>)}</div>
        </div>}
        {played && <div style={{ position:'absolute', inset:0, background:'rgba(20,15,31,.4)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink)' }}><Icon name="check" size={18} sw={3}/></div>}
      </div>
      <div style={{ flex:1, overflow:'hidden' }}>
        <div style={{ fontWeight:700, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.title}</div>
        <div className="mono" style={{ fontSize:11, color:'var(--ink-dim)' }}>{isNow?'▶ now playing · ':played?'played · ':''}{item.artist} · {fmt(item.dur)}</div>
      </div>
      <div className="row" style={{ gap:4, flex:'none' }}>
        {!isNow && <button className="btn btn-ghost btn-icon" disabled={muted} title={played?'Replay':'Play now'} onClick={()=>!muted&&onJump(item.qid)} style={{ padding:7, opacity:muted?0.4:1, cursor:muted?'not-allowed':'pointer' }}><Icon name="play" size={16}/></button>}
        {!isNow && <button className="btn btn-ghost btn-icon" disabled={muted} title="Move to next" onClick={()=>!muted&&onNext(item.qid)} style={{ padding:7, opacity:muted?0.4:1, cursor:muted?'not-allowed':'pointer' }}><Icon name="tonext" size={17}/></button>}
        {!isNow && <button className="btn btn-ghost btn-icon" title="Delete" onClick={()=>onRemove(item.qid)} style={{ padding:7 }}><Icon name="trash" size={17}/></button>}
      </div>
    </div>
  );
}

function Queue({ queue, currentIndex, replay, onReplay, onReorder, onJump, onNext, onRemove, onShuffle, onAdd }){
  const [q,setQ] = useStateQ('');
  const [adding,setAdding] = useStateQ(false);
  const [dragIdx,setDragIdx] = useStateQ(-1);
  const [overIdx,setOverIdx] = useStateQ(-1);
  const filtered = queue.map((it,i)=>({it,i})).filter(({it})=> !q || (it.title+it.artist).toLowerCase().includes(q.toLowerCase()));

  const dnd = {
    dragIdx, overIdx,
    start:(e,i)=>{ setDragIdx(i); e.dataTransfer.effectAllowed='move'; },
    over:(e,i)=>{ e.preventDefault(); if(i!==overIdx) setOverIdx(i); },
    drop:(e,i)=>{ e.preventDefault(); if(dragIdx>=0&&dragIdx!==i) onReorder(dragIdx,i); setDragIdx(-1); setOverIdx(-1); },
    end:()=>{ setDragIdx(-1); setOverIdx(-1); },
  };
  const upNext = queue.length-currentIndex-1;

  return (
    <div className="pop wobble" style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, minWidth:0, overflow:'hidden', boxShadow:'7px 7px 0 var(--shadow)' }}>
      <div className="row" style={{ justifyContent:'space-between', padding:'13px 15px', borderBottom:'3px solid var(--outline)', background:'var(--panel)' }}>
        <div className="row" style={{ gap:9 }}>
          <Icon name="list" size={20}/>
          <div className="display" style={{ fontSize:18 }}>Queue</div>
          <span className="chip" style={{ background:'var(--accent-3)', color:'#140f1f' }}>{upNext} next</span>
        </div>
        <div className="row" style={{ gap:7, flex:'none' }}>
          <button className="btn pop-sm btn-icon" onClick={onReplay} title={replay?'Replay: on — played songs stay active':'Replay: off — played songs are locked'} style={{ background: replay?'var(--accent-3)':'var(--panel)', color: replay?'#140f1f':'var(--ink-dim)' }}><Icon name="replay" size={18}/></button>
          <button className="btn pop-sm btn-icon" onClick={onShuffle} title="Shuffle queue"><Icon name="shuffle" size={18}/></button>
          <button className="btn btn-accent pop-sm btn-icon" onClick={()=>setAdding(true)} title="Add a song"><Icon name="plus" size={18}/></button>
        </div>
      </div>
      <div style={{ padding:'10px 13px', borderBottom:'3px solid var(--outline)', position:'relative' }}>
        <span style={{ position:'absolute', left:24, top:'50%', transform:'translateY(-50%)', color:'var(--ink-dim)' }}><Icon name="search" size={16}/></span>
        <input className="field" value={q} onChange={e=>setQ(e.target.value)} placeholder="Filter the queue…" style={{ paddingLeft:38, padding:'10px 14px 10px 38px', fontSize:14 }}/>
      </div>
      <div className="scroll" style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:8 }}>
        {filtered.map(({it,i})=>(
          <QueueRow key={it.qid} item={it} idx={i} status={i<currentIndex?'played':i===currentIndex?'now':'next'} replay={replay}
            onJump={onJump} onNext={onNext} onRemove={onRemove} dnd={dnd}/>
        ))}
        {filtered.length===0 && <div className="mono" style={{ textAlign:'center', color:'var(--ink-dim)', padding:24, fontSize:13 }}>nothing matches “{q}” 🌑</div>}
      </div>
      {adding && <AddSongModal onClose={()=>setAdding(false)} onAdd={(t)=>{ onAdd(t); }}/>}
    </div>
  );
}

Object.assign(window, { Queue, AddSongModal });
