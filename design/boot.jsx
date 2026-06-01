// app.jsx — root: router, theme, tweaks (v1)
const { useState:useStateA, useEffect:useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "typeface": "Sci-Fi",
  "accent": "#ff5da2",
  "wobble": true,
  "crewLayout": "list"
}/*EDITMODE-END*/;

const TYPE_MAP = { "Cartoon":"cartoon", "Sci-Fi":"scifi", "Zine":"zine" };
const ACCENT_MAP = { "#ff5da2":"nebula", "#ff7a4d":"solar", "#46e0d4":"aurora", "#9d7bff":"berry" };

function App(){
  const [t,setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view,setView] = useStateA({ name:'home' });

  // apply theme/type/accent to <html>
  useEffectA(()=>{
    const r = document.documentElement;
    r.setAttribute('data-theme', t.theme);
    r.setAttribute('data-type', TYPE_MAP[t.typeface]||'scifi');
    r.setAttribute('data-accent', ACCENT_MAP[t.accent]||'nebula');
    r.style.setProperty('--r-wobble', t.wobble? '18px 22px 20px 24px / 24px 18px 22px 20px' : '16px');
    r.style.setProperty('--r-wobble-2', t.wobble? '22px 16px 24px 18px / 16px 24px 18px 22px' : '16px');
  }, [t.theme, t.typeface, t.accent, t.wobble]);

  const toggleTheme = ()=> setTweak('theme', t.theme==='dark'?'light':'dark');
  const enterRoom = (room)=> setView({ name:'room', room });
  const leave = ()=> setView({ name:'home' });

  return (
    <React.Fragment>
      {view.name==='home'
        ? <Home theme={t.theme} onToggleTheme={toggleTheme} onEnterRoom={enterRoom}/>
        : <RoomView room={view.room} theme={t.theme} onToggleTheme={toggleTheme} onLeave={leave} crewLayout={t.crewLayout}/>}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme"/>
        <TweakRadio label="Lights" value={t.theme} options={['dark','light']} onChange={v=>setTweak('theme',v)}/>
        <TweakColor label="Cosmic accent" value={t.accent}
          options={['#ff5da2','#ff7a4d','#46e0d4','#9d7bff']} onChange={v=>setTweak('accent',v)}/>
        <TweakSection label="Type personality"/>
        <TweakRadio label="Display font" value={t.typeface} options={['Cartoon','Sci-Fi','Zine']} onChange={v=>setTweak('typeface',v)}/>
        <TweakSection label="Shape"/>
        <TweakToggle label="Wobbly borders" value={t.wobble} onChange={v=>setTweak('wobble',v)}/>
        <TweakSection label="Layout"/>
        <TweakRadio label="Crew panel" value={t.crewLayout}
          options={[{value:'list',label:'Sidebar'},{value:'strip',label:'Top strip'}]}
          onChange={v=>setTweak('crewLayout',v)}/>
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
