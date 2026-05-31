// ui.jsx — shared cosmic-comic UI primitives
const { useState, useRef, useEffect, useLayoutEffect } = React;

const fmt = (s) => {
  s = Math.max(0, Math.floor(s||0));
  const m = Math.floor(s/60), ss = s%60;
  return m+':'+String(ss).padStart(2,'0');
};

/* ---------- ICONS (chunky geometric) ---------- */
const PATHS = {
  play:   <polygon points="7,5 19,12 7,19" />,
  pause:  <g><rect x="6" y="5" width="4.2" height="14" rx="1.2"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.2"/></g>,
  prev:   <g><rect x="5" y="5" width="3" height="14" rx="1"/><polygon points="20,5 9.5,12 20,19"/></g>,
  next:   <g><rect x="16" y="5" width="3" height="14" rx="1"/><polygon points="4,5 14.5,12 4,19"/></g>,
  shuffle:<g fill="none"><path d="M4 7h4l9 10h3"/><path d="M4 17h4l3-3.4"/><path d="M14.5 8.4 17 7h3"/><path d="M18 4l3 3-3 3"/><path d="M18 14l3 3-3 3"/></g>,
  volume: <g><polygon points="4,9 8,9 12,5 12,19 8,15 4,15"/><path fill="none" d="M15.5 9c1.4 1.6 1.4 4.4 0 6"/><path fill="none" d="M18 6.5c2.8 2.8 2.8 8.2 0 11"/></g>,
  mute:   <g><polygon points="4,9 8,9 12,5 12,19 8,15 4,15"/><path fill="none" d="M16 9.5l5 5M21 9.5l-5 5"/></g>,
  search: <g fill="none"><circle cx="11" cy="11" r="6"/><path d="M16 16l4.5 4.5"/></g>,
  plus:   <g fill="none"><path d="M12 5v14M5 12h14"/></g>,
  send:   <polygon points="4,4 21,12 4,20 7,12" />,
  image:  <g fill="none"><rect x="4" y="5" width="16" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M5 17l4.5-4 3.5 3 3-3 4 3.5"/></g>,
  gear:   <g fill="none"><circle cx="12" cy="12" r="3.4"/><path d="M12 3.5v3M12 17.5v3M20.5 12h-3M6.5 12h-3M18 6l-2.1 2.1M8.1 15.9 6 18M18 18l-2.1-2.1M8.1 8.1 6 6"/></g>,
  close:  <g fill="none"><path d="M6 6l12 12M18 6 6 18"/></g>,
  sun:    <g fill="none"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2 7 7M17 17l1.8 1.8M18.8 5.2 17 7M7 17l-1.8 1.8"/></g>,
  moon:   <path d="M20 14.5A8 8 0 1 1 9.5 4 6.4 6.4 0 0 0 20 14.5z" fill="currentColor"/>,
  chevD:  <g fill="none"><path d="M6 9l6 6 6-6"/></g>,
  chevR:  <g fill="none"><path d="M9 6l6 6-6 6"/></g>,
  drag:   <g><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></g>,
  trash:  <g fill="none"><path d="M5 7h14M10 7V5h4v2M6.5 7l1 12h9l1-12"/></g>,
  jump:   <g><polygon points="5,5 13,12 5,19"/><rect x="15" y="5" width="3" height="14" rx="1"/></g>,
  tonext: <g fill="none"><path d="M5 12h11"/><path d="M12 7l5 5-5 5"/><path d="M21 6v12"/></g>,
  replay: <g fill="none"><path d="M19 9a8 8 0 1 0 1.4 5"/><path d="M20 3v6h-6"/></g>,
  edit:   <g fill="none"><path d="M5 19h3l9-9-3-3-9 9z"/><path d="M14 7l3 3"/></g>,
  link:   <g fill="none"><path d="M9 15l6-6"/><path d="M11 7l1.5-1.5a3.5 3.5 0 0 1 5 5L16 12"/><path d="M13 17l-1.5 1.5a3.5 3.5 0 0 1-5-5L8 12"/></g>,
  check:  <g fill="none"><path d="M5 12l4 4 10-10"/></g>,
  list:   <g fill="none"><path d="M8 7h12M8 12h12M8 17h12"/><circle cx="4" cy="7" r="1.3" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="4" cy="17" r="1.3" fill="currentColor" stroke="none"/></g>,
  chat:   <g fill="none"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H10l-4 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z"/></g>,
  users:  <g fill="none"><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6a3 3 0 0 1 0 5.7M16.5 19a5.5 5.5 0 0 0-2-4.3"/></g>,
  speaker:<g fill="none"><polygon points="4,9 8,9 12,5 12,19 8,15 4,15"/><path d="M15.5 9c1.4 1.6 1.4 4.4 0 6M18 6.5c2.8 2.8 2.8 8.2 0 11"/></g>,
  remote: <g fill="none"><rect x="7" y="3" width="10" height="18" rx="3"/><circle cx="12" cy="8" r="1.6" fill="currentColor" stroke="none"/><path d="M9.5 13h5M9.5 16h5"/></g>,
  back:   <g fill="none"><path d="M19 12H5M11 6l-6 6 6 6"/></g>,
  bolt:   <polygon points="13,2 4,14 11,14 10,22 19,9 12,9" />,
  pin:    <g fill="none"><path d="M12 21s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10z"/><circle cx="12" cy="11" r="2.2"/></g>,
};
function Icon({ name, size=22, sw=2.4, style, className }){
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className}
      style={style} fill="currentColor" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name]||null}
    </svg>
  );
}

/* ---------- LOGO ---------- */
function Logo({ size=34 }){
  return (
    <div className="row" style={{ gap:12, alignItems:'center' }}>
      <div style={{ position:'relative', width:size*1.25, height:size*1.25, flex:'none' }}>
        <div className="spin" style={{
          position:'absolute', inset:0, borderRadius:'50%',
          border:'3px solid var(--outline)', background:'var(--accent-3)',
          boxShadow:'3px 3px 0 var(--shadow)' }}/>
        <div style={{
          position:'absolute', left:'50%', top:'50%', width:size*0.42, height:size*0.42,
          transform:'translate(-50%,-50%)', borderRadius:'50%', background:'var(--accent)',
          border:'3px solid var(--outline)' }}/>
        {/* orbiting dot */}
        <div className="spin" style={{ position:'absolute', inset:0 }}>
          <div style={{ position:'absolute', top:-4, left:'50%', width:9, height:9, marginLeft:-4,
            borderRadius:'50%', background:'var(--accent-2)', border:'2px solid var(--outline)' }}/>
        </div>
      </div>
      <div className="display" style={{ fontSize:size*0.82, lineHeight:.9 }}>
        Drop<span style={{ color:'var(--accent)' }}>A</span>Track
      </div>
    </div>
  );
}

/* ---------- CARTOON AVATAR ---------- */
function Avatar({ seed, size=44, ring=true }){
  const a = avatarFor(seed||'x');
  const c = `oklch(0.72 0.17 ${a.hue})`;
  const c2 = `oklch(0.58 0.18 ${a.hue})`;
  const cx=24, cy=24, R=16;
  const eyeY = a.type==='star'?23:22;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ display:'block', transform:`rotate(${a.rot}deg)` }}>
      <g stroke="var(--outline)" strokeWidth="2.6" strokeLinejoin="round">
        {a.ring && ring && <ellipse cx={cx} cy={cy} rx="21" ry="8" fill="none" transform={`rotate(-18 ${cx} ${cy})`} />}
        {a.type==='star'
          ? <polygon points="24,6 29,19 43,19 31,27 36,41 24,32 12,41 17,27 5,19 19,19" fill={c} />
          : a.type==='moon'
          ? <circle cx={cx} cy={cy} r={R} fill={c} />
          : <circle cx={cx} cy={cy} r={R} fill={c} />}
        {a.spots && a.type!=='star' && <g fill={c2} stroke="none">
          <circle cx="16" cy="18" r="2.4"/><circle cx="31" cy="28" r="3"/><circle cx="29" cy="16" r="1.8"/>
        </g>}
        {/* eyes */}
        {a.eyes===3
          ? <g><circle cx="24" cy={eyeY} r="3.4" fill="#fff"/><circle cx="24" cy={eyeY+0.5} r="1.5" fill="#140f1f" stroke="none"/></g>
          : <g>
              <circle cx="19" cy={eyeY} r="3.1" fill="#fff"/><circle cx="29" cy={eyeY} r="3.1" fill="#fff"/>
              <circle cx={a.eyes===1?20:19} cy={eyeY+0.6} r="1.4" fill="#140f1f" stroke="none"/>
              <circle cx={a.eyes===1?30:29} cy={eyeY+0.6} r="1.4" fill="#140f1f" stroke="none"/>
            </g>}
        {/* mouth */}
        {a.mouth===0 && <path d={`M19 ${eyeY+6} q5 4 10 0`} fill="none"/>}
        {a.mouth===1 && <path d={`M20 ${eyeY+7} q4 -3 8 0`} fill="none"/>}
        {a.mouth===2 && <circle cx="24" cy={eyeY+6} r="2.3" fill="#140f1f" stroke="none"/>}
        {a.mouth===3 && <path d={`M20 ${eyeY+6} h8`} fill="none"/>}
      </g>
    </svg>
  );
}

/* ---------- TRACK ART (placeholder, hue-driven) ---------- */
function TrackArt({ track, className='', style={}, label=true, big=false }){
  if(!track) return <div className={'ph '+className} style={style}/>;
  const h = track.hue;
  return (
    <div className={className} style={{
      position:'relative', overflow:'hidden',
      background:`radial-gradient(120% 120% at 25% 15%, oklch(0.6 0.2 ${h}) 0%, oklch(0.42 0.18 ${(h+40)%360}) 60%, oklch(0.28 0.12 ${(h+80)%360}) 100%)`,
      ...style }}>
      {/* concentric rings */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:.5 }}>
        {[42,30,18].map((r,i)=>(
          <circle key={i} cx="72" cy="26" r={r} fill="none" stroke="#fff" strokeWidth="1.4" opacity={.35-i*0.07}/>
        ))}
      </svg>
      {/* vinyl */}
      <div className="spin" style={{ position:'absolute', left:big?'18%':'12%', bottom:big?'-30%':'-34%',
        width:big?'62%':'70%', aspectRatio:'1', borderRadius:'50%',
        background:`repeating-radial-gradient(circle at center, #14101f 0 3px, oklch(0.32 0.1 ${h}) 3px 6px)`,
        border:'3px solid var(--outline)', boxShadow:'inset 0 0 0 8px rgba(255,255,255,.05)' }}>
        <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
          width:'22%', aspectRatio:'1', borderRadius:'50%', background:`oklch(0.7 0.2 ${h})`, border:'2.5px solid var(--outline)' }}/>
      </div>
      {label && <div className="ph-label" style={{ top:'18%', left:'18%', transform:'rotate(-3deg)', background:'rgba(20,15,31,.7)', color:'#fff', borderColor:'rgba(255,255,255,.4)' }}>video</div>}
    </div>
  );
}

/* ---------- STAR FIELD DECOR ---------- */
function StarField({ n=22, seed=1 }){
  const stars = useRef(null);
  if(!stars.current){
    let s=seed*9301+49297; const rnd=()=>{ s=(s*9301+49297)%233280; return s/233280; };
    stars.current = Array.from({length:n}).map((_,i)=>({
      x:rnd()*100, y:rnd()*100, sz:3+rnd()*7, d:rnd()*3, type:rnd()>0.7?'plus':'dot', delay:rnd()*3
    }));
  }
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
      {stars.current.map((st,i)=>(
        <div key={i} className="twinkle" style={{ position:'absolute', left:st.x+'%', top:st.y+'%', animationDelay:st.delay+'s' }}>
          {st.type==='plus'
            ? <svg width={st.sz*2} height={st.sz*2} viewBox="0 0 10 10"><path d="M5 0v10M0 5h10" stroke="var(--star)" strokeWidth="2" strokeLinecap="round"/></svg>
            : <div style={{ width:st.sz, height:st.sz, borderRadius:'50%', background:'var(--star)' }}/>}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { fmt, Icon, Logo, Avatar, TrackArt, StarField });
