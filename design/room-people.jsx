// room-people.jsx — connected users, roles, inline rename, role management
const { useState:useStateU, useRef:useRefU, useEffect:useEffectU } = React;

function PersonRow({ user, isMe, canManage, onRename, onRole }){
  const [editing,setEditing] = useStateU(false);
  const [val,setVal] = useStateU(user.name);
  const [menu,setMenu] = useStateU(false);
  const role = ROLES[user.role];
  const save = ()=>{ const v=val.trim(); if(v) onRename(user.id,v); setEditing(false); };

  return (
    <div className="row" style={{ gap:11, padding:'8px 9px', borderRadius:12, border:'2.5px solid '+(isMe?'var(--accent)':'var(--line)'),
      background: isMe?'var(--panel-3)':'transparent', position:'relative' }}>
      <div style={{ position:'relative', flex:'none' }}>
        <div className="pop-sm" style={{ borderRadius:'50%', overflow:'hidden', border:'2.5px solid var(--outline)', width:42, height:42, background:'var(--panel-2)' }}>
          <Avatar seed={user.seed} size={42}/>
        </div>
        <span style={{ position:'absolute', right:-2, bottom:-2, width:13, height:13, borderRadius:'50%', background:'var(--pop-lime)', border:'2.5px solid var(--outline)' }}/>
      </div>
      <div style={{ flex:1, overflow:'hidden' }}>
        {editing
          ? <input autoFocus className="field" value={val} onChange={e=>setVal(e.target.value)} onBlur={save}
              onKeyDown={e=>{ if(e.key==='Enter') save(); if(e.key==='Escape'){ setVal(user.name); setEditing(false); } }}
              style={{ padding:'5px 9px', fontSize:14 }}/>
          : <div className="row" style={{ gap:6 }}>
              <span style={{ fontWeight:700, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', borderBottom: isMe?'2px dashed var(--accent)':'none' }}>{user.name}</span>
              {isMe && <span className="mono" style={{ fontSize:9, color:'var(--ink-dim)' }}>(you)</span>}
              {isMe && <button onClick={()=>{ setVal(user.name); setEditing(true); }} className="btn btn-ghost btn-icon" style={{ padding:3, boxShadow:'none', border:'none', color:'var(--accent)' }} title="Edit your name"><Icon name="edit" size={14}/></button>}
            </div>}
        <div style={{ marginTop:4 }}>
          <button className={'chip '+role.cls} onClick={()=>canManage && !isMe && setMenu(m=>!m)} style={{ cursor: canManage&&!isMe?'pointer':'default', fontSize:10, padding:'3px 9px' }}>
            {role.label}{canManage && !isMe && <Icon name="chevD" size={11} sw={3}/>}
          </button>
        </div>
        {menu && <div className="pop wobble popin" style={{ position:'absolute', zIndex:30, left:54, marginTop:4, padding:6, display:'flex', flexDirection:'column', gap:3, width:140 }}>
          {Object.values(ROLES).map(r=>(
            <button key={r.key} onClick={()=>{ onRole(user.id,r.key); setMenu(false); }} className="row"
              style={{ gap:8, padding:'7px 9px', borderRadius:8, border:'none', cursor:'pointer', background: user.role===r.key?'var(--panel-3)':'transparent', textAlign:'left' }}>
              <span className={'chip '+r.cls} style={{ fontSize:9, padding:'2px 8px' }}>{r.label}</span>
              {user.role===r.key && <Icon name="check" size={14} style={{ marginLeft:'auto' }}/>}
            </button>
          ))}
        </div>}
      </div>
    </div>
  );
}

function People({ users, meId, onRename, onRole }){
  const me = users.find(u=>u.id===meId);
  const isAdmin = me && me.role==='admin';
  const order = { admin:0, mod:1, dj:2, listener:3 };
  const sorted = [...users].sort((a,b)=> order[a.role]-order[b.role] || a.name.localeCompare(b.name));
  return (
    <div className="pop wobble" style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, minWidth:0, overflow:'hidden', boxShadow:'7px 7px 0 var(--shadow)' }}>
      <div className="row" style={{ justifyContent:'space-between', padding:'13px 15px', borderBottom:'3px solid var(--outline)' }}>
        <div className="row" style={{ gap:9 }}>
          <Icon name="users" size={20}/>
          <div className="display" style={{ fontSize:18 }}>In the room</div>
        </div>
        <span className="chip" style={{ background:'var(--accent-2)', color:'#140f1f' }}>{users.length}</span>
      </div>
      <div className="scroll" style={{ flex:1, overflowY:'auto', padding:11, display:'flex', flexDirection:'column', gap:7 }}>
        {sorted.map(u=>(
          <PersonRow key={u.id} user={u} isMe={u.id===meId} canManage={isAdmin} onRename={onRename} onRole={onRole}/>
        ))}
      </div>
      {isAdmin && <div className="mono" style={{ fontSize:10, color:'var(--ink-dim)', padding:'9px 14px', borderTop:'2.5px solid var(--line)', letterSpacing:'.05em' }}>
        <Icon name="bolt" size={12} style={{ verticalAlign:-2 }}/> you're admin — tap a badge to reassign roles
      </div>}
    </div>
  );
}

/* ---- compact horizontal crew chip (for the "strip" layout) ---- */
function CrewChip({ user, isMe, canManage, onRename, onRole }){
  const [menu,setMenu] = useStateU(false);
  const [editing,setEditing] = useStateU(false);
  const [val,setVal] = useStateU(user.name);
  const role = ROLES[user.role];
  const save = ()=>{ const v=val.trim(); if(v) onRename(user.id,v); setEditing(false); };
  return (
    <div className="col" style={{ position:'relative', flex:'none', width:104, alignItems:'center', gap:7, padding:'11px 8px',
      borderRadius:14, border:'2.5px solid '+(isMe?'var(--accent)':'var(--line)'), background: isMe?'var(--panel-3)':'transparent' }}>
      <div style={{ position:'relative' }}>
        <div className="pop-sm" style={{ borderRadius:'50%', overflow:'hidden', border:'2.5px solid var(--outline)', width:46, height:46, background:'var(--panel-2)' }}>
          <Avatar seed={user.seed} size={46}/>
        </div>
        <span style={{ position:'absolute', right:-2, bottom:-2, width:13, height:13, borderRadius:'50%', background:'var(--pop-lime)', border:'2.5px solid var(--outline)' }}/>
      </div>
      {editing
        ? <input autoFocus className="field" value={val} onChange={e=>setVal(e.target.value)} onBlur={save}
            onKeyDown={e=>{ if(e.key==='Enter') save(); if(e.key==='Escape'){ setVal(user.name); setEditing(false); } }}
            style={{ padding:'4px 6px', fontSize:12, textAlign:'center', width:'100%' }}/>
        : isMe
          ? <button onClick={()=>{ setVal(user.name); setEditing(true); }} className="row"
              style={{ gap:4, justifyContent:'center', background:'none', border:'none', padding:0, cursor:'text', color:'inherit', maxWidth:'100%' }} title="Edit your name">
              <span style={{ fontWeight:700, fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:64, borderBottom:'2px dashed var(--accent)' }}>{user.name}</span>
              <Icon name="edit" size={13} style={{ flex:'none', color:'var(--accent)' }}/>
            </button>
          : <span style={{ fontWeight:700, fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', display:'block', maxWidth:88, textAlign:'center' }} title={user.name}>{user.name}</span>}
      <button className={'chip '+role.cls} onClick={()=>canManage && !isMe && setMenu(m=>!m)}
        style={{ cursor: canManage&&!isMe?'pointer':'default', fontSize:9, padding:'3px 8px' }}>
        {role.label}{canManage && !isMe && <Icon name="chevD" size={10} sw={3}/>}
      </button>
      {menu && <div className="pop wobble popin" style={{ position:'absolute', zIndex:30, top:'100%', left:'50%', transform:'translateX(-50%)', marginTop:6, padding:6, display:'flex', flexDirection:'column', gap:3, width:140 }}>
        {Object.values(ROLES).map(r=>(
          <button key={r.key} onClick={()=>{ onRole(user.id,r.key); setMenu(false); }} className="row"
            style={{ gap:8, padding:'7px 9px', borderRadius:8, border:'none', cursor:'pointer', background: user.role===r.key?'var(--panel-3)':'transparent', textAlign:'left' }}>
            <span className={'chip '+r.cls} style={{ fontSize:9, padding:'2px 8px' }}>{r.label}</span>
            {user.role===r.key && <Icon name="check" size={14} style={{ marginLeft:'auto' }}/>}
          </button>
        ))}
      </div>}
    </div>
  );
}

function CrewStrip({ users, meId, onRename, onRole }){
  const me = users.find(u=>u.id===meId);
  const isAdmin = me && me.role==='admin';
  const order = { admin:0, mod:1, dj:2, listener:3 };
  const sorted = [...users].sort((a,b)=> order[a.role]-order[b.role] || a.name.localeCompare(b.name));
  return (
    <div className="pop wobble" style={{ flex:'none', marginBottom:16, display:'flex', flexDirection:'column', boxShadow:'7px 7px 0 var(--shadow)' }}>
      <div className="row" style={{ justifyContent:'space-between', padding:'11px 15px', borderBottom:'3px solid var(--outline)' }}>
        <div className="row" style={{ gap:9 }}>
          <Icon name="users" size={19}/>
          <div className="display" style={{ fontSize:17 }}>In the room</div>
          <span className="chip" style={{ background:'var(--accent-2)', color:'#140f1f' }}>{users.length}</span>
        </div>
        {isAdmin && <div className="mono" style={{ fontSize:10, color:'var(--ink-dim)', letterSpacing:'.05em' }}>
          <Icon name="bolt" size={12} style={{ verticalAlign:-2 }}/> tap a badge to reassign roles
        </div>}
      </div>
      <div className="scroll noscb row" style={{ overflowX:'auto', overflowY:'visible', padding:11, gap:9 }}>
        {sorted.map(u=>(
          <CrewChip key={u.id} user={u} isMe={u.id===meId} canManage={isAdmin} onRename={onRename} onRole={onRole}/>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { People, PersonRow, CrewStrip, CrewChip });
