// room-chat.jsx — realtime chat with images + song cards
const { useState:useStateC, useRef:useRefC, useEffect:useEffectC } = React;

function relTime(t){ return typeof t==='string'? t : 'now'; }

function SongCard({ track, onAdd, added }){
  return (
    <div className="row pop-sm" style={{ gap:10, padding:8, marginTop:7, borderRadius:11, background:'var(--panel)', maxWidth:300, boxShadow:'3px 3px 0 var(--accent-2)' }}>
      <div style={{ width:46, height:46, borderRadius:9, overflow:'hidden', border:'2.5px solid var(--outline)', flex:'none', position:'relative' }}>
        <TrackArt track={track} label={false} style={{ width:'100%', height:'100%' }}/>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(20,15,31,.3)' }}><Icon name="play" size={18} style={{ color:'#fff' }}/></div>
      </div>
      <div style={{ flex:1, overflow:'hidden' }}>
        <div className="mono" style={{ fontSize:8, color:'var(--ink-dim)', letterSpacing:'.1em' }}>YOUTUBE</div>
        <div style={{ fontWeight:700, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track.title}</div>
        <div className="mono" style={{ fontSize:10, color:'var(--ink-dim)' }}>{track.artist} · {fmt(track.dur)}</div>
      </div>
      <button className={'btn pop-sm btn-icon '+(added?'':'btn-accent')} onClick={()=>onAdd(track)} disabled={added} title="Add to queue" style={{ flex:'none', padding:8, opacity:added?.6:1 }}>
        <Icon name={added?'check':'plus'} size={17}/>
      </button>
    </div>
  );
}

function Bubble({ msg, user, isMe, onAddToQueue, onOpenImage, addedSet }){
  const track = msg.card ? TRACKS.find(t=>t.id===msg.card) : null;
  return (
    <div className="row" style={{ gap:9, alignItems:'flex-start', flexDirection:isMe?'row-reverse':'row' }}>
      <div className="pop-sm" style={{ borderRadius:'50%', overflow:'hidden', border:'2.5px solid var(--outline)', width:34, height:34, flex:'none', background:'var(--panel-2)' }}>
        <Avatar seed={user?.seed||msg.uid} size={34}/>
      </div>
      <div style={{ maxWidth:'76%', display:'flex', flexDirection:'column', alignItems:isMe?'flex-end':'flex-start' }}>
        <div className="row" style={{ gap:7, marginBottom:3, flexDirection:isMe?'row-reverse':'row', alignItems:'center', maxWidth:'100%' }}>
          <span style={{ fontWeight:700, fontSize:12, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:130 }}>{isMe?'You':user?.name||'ghost'}</span>
          <span className="mono" style={{ fontSize:9, color:'var(--ink-dim)', flex:'none', whiteSpace:'nowrap' }}>{relTime(msg.t)}</span>
        </div>
        <div className="pop-sm" style={{ padding: msg.img?'5px':'9px 12px', borderRadius:13, fontSize:14, fontWeight:500, lineHeight:1.4,
          background: isMe?'var(--accent)':'var(--panel-2)', color: isMe?'#140f1f':'var(--ink)',
          borderColor:'var(--outline)', wordBreak:'break-word' }}>
          {msg.img && <img src={msg.img} onClick={()=>onOpenImage(msg.img)} style={{ display:'block', maxWidth:220, maxHeight:200, borderRadius:9, border:'2px solid var(--outline)', cursor:'zoom-in', objectFit:'cover' }}/>}
          {msg.text && <div style={{ padding: msg.img?'6px 4px 2px':0 }}>{msg.text}</div>}
        </div>
        {track && <SongCard track={track} onAdd={onAddToQueue} added={addedSet.has(msg.id)}/>}
      </div>
    </div>
  );
}

function Chat({ messages, users, meId, onSend, onAddToQueue, onOpenImage, onSeen, unread }){
  const [text,setText] = useStateC('');
  const [pending,setPending] = useStateC(null); // image dataURL
  const [added,setAdded] = useStateC(()=>new Set());
  const scrollRef = useRefC(null);
  const fileRef = useRefC(null);

  useEffectC(()=>{ if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages.length, pending]);

  const fileToUrl = (file)=>{ if(!file) return; const r=new FileReader(); r.onload=()=>setPending(r.result); r.readAsDataURL(file); };
  const onPaste = (e)=>{ const it=[...(e.clipboardData?.items||[])].find(i=>i.type.startsWith('image')); if(it){ e.preventDefault(); fileToUrl(it.getAsFile()); } };

  const send = ()=>{
    if(!text.trim() && !pending) return;
    const isLink = /youtu\.?be|youtube\.com|watch\?v=/i.test(text);
    const card = isLink ? TRACKS[Math.floor(Math.random()*TRACKS.length)].id : null;
    onSend({ id:'c'+Date.now()+Math.random(), uid:meId, text:text.trim(), img:pending, t:'now', card });
    setText(''); setPending(null);
  };
  const addQ = (track, msgId)=>{ onAddToQueue(track); };

  return (
    <div className="pop wobble" style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, minWidth:0, overflow:'hidden', boxShadow:'7px 7px 0 var(--shadow)' }} onClick={onSeen}>
      <div className="row" style={{ justifyContent:'space-between', padding:'13px 15px', borderBottom:'3px solid var(--outline)', background:'var(--panel)' }}>
        <div className="row" style={{ gap:9 }}>
          <Icon name="chat" size={20}/>
          <div className="display" style={{ fontSize:18 }}>Chat</div>
        </div>
        {unread>0 && <span className="chip" style={{ background:'var(--accent)', color:'#140f1f' }}>{unread} new</span>}
      </div>

      <div ref={scrollRef} className="scroll" style={{ flex:1, overflowY:'auto', padding:14, display:'flex', flexDirection:'column', gap:13 }}>
        {messages.map(m=>(
          <Bubble key={m.id} msg={m} user={users.find(u=>u.id===m.uid)} isMe={m.uid===meId}
            onAddToQueue={(t)=>{ addQ(t,m.id); setAdded(s=>new Set(s).add(m.id)); }} onOpenImage={onOpenImage} addedSet={added}/>
        ))}
      </div>

      {pending && <div className="row" style={{ gap:10, padding:'10px 13px', borderTop:'3px solid var(--outline)', background:'var(--panel-2)' }}>
        <img src={pending} style={{ width:48, height:48, borderRadius:9, border:'2.5px solid var(--outline)', objectFit:'cover' }}/>
        <div className="mono" style={{ fontSize:11, flex:1, color:'var(--ink-soft)' }}>image ready to send</div>
        <button className="btn btn-ghost btn-icon" onClick={()=>setPending(null)}><Icon name="close" size={16}/></button>
      </div>}

      <div className="row" style={{ gap:8, padding:'11px 13px', borderTop:'3px solid var(--outline)', background:'var(--panel)' }}>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>fileToUrl(e.target.files[0])}/>
        <button className="btn pop-sm btn-icon" onClick={()=>fileRef.current.click()} title="Attach image"><Icon name="image" size={19}/></button>
        <input className="field" value={text} onChange={e=>setText(e.target.value)} onPaste={onPaste}
          onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } }}
          placeholder="say something stellar…" style={{ flex:1, padding:'11px 14px' }}/>
        <button className="btn btn-accent pop-sm btn-icon" onClick={send} title="Send"><Icon name="send" size={19}/></button>
      </div>
    </div>
  );
}

Object.assign(window, { Chat, SongCard, Bubble });
