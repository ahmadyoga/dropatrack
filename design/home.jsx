// home.jsx — DropATrack homepage
const { useState:useStateH } = React;

function RoomCard({ room, onEnter }){
  const track = TRACKS.find(t=>t.id===room.nowTrack);
  return (
    <button className="pop wobble popin" onClick={()=>onEnter(room)} style={{
      textAlign:'left', cursor:'pointer', padding:0, overflow:'hidden', background:'var(--panel)',
      boxShadow:`7px 7px 0 ${room.accent}`, transition:'transform .1s ease, box-shadow .1s ease',
      display:'flex', flexDirection:'column' }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow=`10px 10px 0 ${room.accent}`; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow=`7px 7px 0 ${room.accent}`; }}>
      <div style={{ position:'relative', height:118 }}>
        <TrackArt track={track} label={false} style={{ position:'absolute', inset:0 }}/>
        <div style={{ position:'absolute', top:10, left:10, display:'flex', gap:6 }}>
          <span className="chip" style={{ background:'var(--panel)', gap:6 }}><span className="live-dot"/>LIVE</span>
        </div>
        <div className="chip" style={{ position:'absolute', top:10, right:10, background:room.accent, color:'#140f1f', borderColor:'var(--outline)' }}>
          <Icon name="users" size={13} sw={2.6}/> {room.listeners}
        </div>
      </div>
      <div style={{ padding:'14px 16px 16px' }}>
        <div className="display" style={{ fontSize:19, marginBottom:6, textWrap:'balance' }}>{room.name}</div>
        <div className="mono" style={{ fontSize:11, color:'var(--ink-dim)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>
          host @{room.host} · {room.genre}
        </div>
        <div className="row" style={{ gap:9, padding:'8px 10px', background:'var(--panel-2)', border:'2px solid var(--line)', borderRadius:11 }}>
          <div className="row" style={{ gap:3, flex:'none' }}>
            {[0,1,2].map(i=><span key={i} style={{ display:'block', width:3, height:11+(i%2?5:0), background:room.accent, borderRadius:2 }}/>)}
          </div>
          <div style={{ overflow:'hidden' }}>
            <div className="mono" style={{ fontSize:9, color:'var(--ink-dim)', letterSpacing:'.1em' }}>NOW PLAYING</div>
            <div style={{ fontSize:13, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{track.title}</div>
          </div>
        </div>
      </div>
    </button>
  );
}

function Home({ theme, onToggleTheme, onEnterRoom }){
  const [name, setName] = useStateH('');
  const [sort, setSort] = useStateH('popular');
  const rooms = [...ROOMS].sort((a,b)=> sort==='popular'? b.listeners-a.listeners : a.name.localeCompare(b.name));

  const create = (e)=>{ e.preventDefault(); const nm=name.trim()||'My Cosmic Room';
    onEnterRoom({ id:'new', name:nm, host:'cosmo.tina', listeners:1, genre:'fresh drop', nowTrack:'t1', live:true, accent:'var(--accent)' }); };

  return (
    <div className="scroll noscb" style={{ position:'relative', height:'100vh', zIndex:1 }}>
      <StarField n={30} seed={7}/>
      <div style={{ maxWidth:1180, margin:'0 auto', padding:'26px 26px 80px', position:'relative' }}>

        {/* top bar */}
        <div className="row" style={{ justifyContent:'space-between', marginBottom:46, flexWrap:'wrap', gap:14 }}>
          <Logo size={36}/>
          <div className="row" style={{ gap:10 }}>
            <button className="btn btn-ghost btn-icon" title="How it works"><Icon name="bolt" size={20}/></button>
            <button className="btn pop-sm" onClick={onToggleTheme} title="Toggle theme" style={{ gap:8 }}>
              <Icon name={theme==='dark'?'sun':'moon'} size={18}/>
              <span style={{ fontSize:12 }}>{theme==='dark'?'LIGHTS ON':'LIGHTS OFF'}</span>
            </button>
          </div>
        </div>

        {/* hero */}
        <div style={{ position:'relative', marginBottom:40 }}>
          <div className="chip" style={{ background:'var(--accent-3)', color:'#140f1f', marginBottom:18, transform:'rotate(-2deg)' }}>
            <Icon name="bolt" size={13}/> tune in together · across the galaxy
          </div>
          <h1 className="display" style={{ fontSize:'clamp(44px, 7.5vw, 96px)', margin:0, maxWidth:880, textWrap:'balance' }}>
            One queue.<br/>Everybody <span style={{ color:'var(--accent)', WebkitTextStroke:'2px var(--outline)' }}>floating</span> to the same beat.
          </h1>
          <p style={{ fontSize:18, color:'var(--ink-soft)', maxWidth:560, marginTop:18, fontWeight:600, lineHeight:1.5 }}>
            Spin up a room, paste a YouTube link, and drift through space with your crew —
            synced playback, live reactions, and a chat that actually has taste.
          </p>
        </div>

        {/* create room */}
        <form onSubmit={create} className="pop wobble-2" style={{ padding:'20px', marginBottom:46, position:'relative', overflow:'hidden', boxShadow:'8px 8px 0 var(--accent)' }}>
          <div style={{ position:'absolute', right:-30, top:-30, width:120, height:120, borderRadius:'50%', background:'var(--accent-2)', border:'3px solid var(--outline)', opacity:.9 }}/>
          <div style={{ position:'absolute', right:34, top:40, width:30, height:30, borderRadius:'50%', background:'var(--accent-3)', border:'3px solid var(--outline)' }}/>
          <div className="display" style={{ fontSize:22, marginBottom:4, position:'relative' }}>Start a room</div>
          <div className="mono" style={{ fontSize:11, color:'var(--ink-dim)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:16 }}>name it. you're the admin.</div>
          <div className="row" style={{ gap:12, flexWrap:'wrap', position:'relative', maxWidth:680 }}>
            <input className="field" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Midnight Meteor Shower" style={{ flex:'1 1 240px' }}/>
            <button type="submit" className="btn btn-accent pop-sm" style={{ fontSize:16, padding:'13px 24px' }}>
              <Icon name="plus" size={18}/> BLAST OFF
            </button>
          </div>
        </form>

        {/* public rooms */}
        <div className="row" style={{ justifyContent:'space-between', alignItems:'flex-end', marginBottom:18, flexWrap:'wrap', gap:12 }}>
          <div className="row" style={{ gap:12, alignItems:'center' }}>
            <h2 className="display" style={{ fontSize:30, margin:0 }}>Live rooms</h2>
            <span className="chip" style={{ background:'var(--panel-2)' }}><span className="live-dot"/>{ROOMS.length} adrift</span>
          </div>
          <div className="row pop-sm" style={{ borderRadius:12, overflow:'hidden', border:'2.5px solid var(--outline)' }}>
            {['popular','a–z'].map(s=>(
              <button key={s} onClick={()=>setSort(s==='a–z'?'az':'popular')} className="mono" style={{
                fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', padding:'8px 14px',
                border:'none', cursor:'pointer',
                background:(sort==='popular'?s==='popular':s==='a–z')?'var(--accent)':'var(--panel)',
                color:(sort==='popular'?s==='popular':s==='a–z')?'#140f1f':'var(--ink)' }}>{s}</button>
            ))}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:20 }}>
          {rooms.map(r=> <RoomCard key={r.id} room={r} onEnter={onEnterRoom}/>)}
        </div>

        <div className="row mono" style={{ justifyContent:'center', gap:8, marginTop:54, color:'var(--ink-dim)', fontSize:12, letterSpacing:'.06em' }}>
          <Icon name="pin" size={14}/> broadcasting from sector 7-G · DropATrack ©2026
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Home });
