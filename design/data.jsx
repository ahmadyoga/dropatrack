// data.jsx — seed data for DropATrack
const TRACKS = [
  { id:'t1', title:'Neon Orbit', artist:'Astro Lounge', dur:214, hue:320, vid:'orbit' },
  { id:'t2', title:'Moondust Boogie', artist:'The Cassettes', dur:187, hue:42, vid:'moondust' },
  { id:'t3', title:'Hyperdrive Lullaby', artist:'Vela & the Voids', dur:241, hue:175, vid:'hyperdrive' },
  { id:'t4', title:'Gravity Slips', artist:'Pluto Casino', dur:198, hue:265, vid:'gravity' },
  { id:'t5', title:'Comet Tail Disco', artist:'SUPRNOVA', dur:223, hue:14, vid:'comet' },
  { id:'t6', title:'Static on Mars', artist:'Red Planet Radio', dur:176, hue:355, vid:'static' },
  { id:'t7', title:'Saturn Swing', artist:'Ring System', dur:205, hue:50, vid:'saturn' },
  { id:'t8', title:'Black Hole Sunrise', artist:'Event Horizon', dur:262, hue:200, vid:'blackhole' },
  { id:'t9', title:'Stardust in My Headphones', artist:'lofi.galaxy', dur:169, hue:285, vid:'stardust' },
  { id:'t10', title:'Cosmic Latte', artist:'Milkyway Cafe', dur:191, hue:30, vid:'latte' },
  { id:'t11', title:'Pulsar Pop', artist:'Quasar Kids', dur:158, hue:130, vid:'pulsar' },
  { id:'t12', title:'Zero-G Slow Dance', artist:'Float On', dur:233, hue:235, vid:'zerog' },
];

const SEARCH_POOL = [
  { id:'s1', title:'Retrograde Funk', artist:'Mercury Rising', dur:201, hue:18 },
  { id:'s2', title:'Andromeda After Hours', artist:'Night Nebula', dur:248, hue:300 },
  { id:'s3', title:'Solar Wind Surfer', artist:'Heliosphere', dur:179, hue:48 },
  { id:'s4', title:'Tidal Lock', artist:'Lunar Phase', dur:212, hue:210 },
  { id:'s5', title:'Supermassive Sweetheart', artist:'Gamma Ray', dur:226, hue:340 },
  { id:'s6', title:'Asteroid Belt Buckle', artist:'Rocky Bodies', dur:164, hue:90 },
  { id:'s7', title:'Interstellar Overdrive Pt.2', artist:'Voyager 3', dur:255, hue:160 },
  { id:'s8', title:'Wormhole Waltz', artist:'Curved Spacetime', dur:193, hue:270 },
];

const ROLES = {
  admin:    { key:'admin', label:'Admin', cls:'role-admin' },
  mod:      { key:'mod', label:'Mod', cls:'role-mod' },
  dj:       { key:'dj', label:'DJ', cls:'role-dj' },
  listener: { key:'listener', label:'Listener', cls:'role-listener' },
};

// avatar seed -> deterministic cosmic creature config
function avatarFor(seed){
  let h=0; for(let i=0;i<seed.length;i++){ h=(h*31+seed.charCodeAt(i))>>>0; }
  const hue=h%360;
  const types=['planet','blob','star','moon'];
  return {
    hue,
    type:types[h%types.length],
    ring:(h>>3)%3===0,
    eyes:(h>>5)%4,
    mouth:(h>>7)%4,
    spots:(h>>9)%2===0,
    rot:((h>>11)%14)-7,
  };
}

const USERS = [
  { id:'u1', name:'NovaKat', role:'admin', seed:'NovaKat' },
  { id:'u2', name:'bleep_blorp', role:'mod', seed:'bleepblorp' },
  { id:'u3', name:'DJ Wormhole', role:'dj', seed:'wormhole99' },
  { id:'u4', name:'cosmo.tina', role:'listener', seed:'cosmotina' },
  { id:'u5', name:'pulsar_pete', role:'listener', seed:'pulsarpete' },
  { id:'u6', name:'lil meteor', role:'listener', seed:'lilmeteor' },
  { id:'u7', name:'Quasar Queen', role:'dj', seed:'quasarqueen' },
  { id:'u8', name:'voidwalker', role:'listener', seed:'voidwalker' },
];
const ME_ID='u4'; // you are cosmo.tina

const ROOMS = [
  { id:'r1', name:'Late Night Launchpad', host:'NovaKat', listeners:42, genre:'lofi cosmic', nowTrack:'t9', live:true, accent:'var(--pop-magenta)' },
  { id:'r2', name:'Disco Asteroid Field', host:'Quasar Queen', listeners:128, genre:'space disco', nowTrack:'t5', live:true, accent:'var(--pop-yellow)' },
  { id:'r3', name:'Zero-G Chillout Pod', host:'bleep_blorp', listeners:17, genre:'ambient', nowTrack:'t12', live:true, accent:'var(--pop-cyan)' },
  { id:'r4', name:'Mars Rover Rave', host:'DJ Wormhole', listeners:73, genre:'techno', nowTrack:'t6', live:true, accent:'var(--pop-violet)' },
  { id:'r5', name:'The Quiet Nebula', host:'cosmo.tina', listeners:9, genre:'study beats', nowTrack:'t3', live:true, accent:'var(--pop-coral)' },
  { id:'r6', name:'Sunday Synth Brunch', host:'pulsar_pete', listeners:31, genre:'synthwave', nowTrack:'t1', live:true, accent:'var(--pop-lime)' },
];

const QUICK_EMOJI = ['🔥','💜','🚀','🛸','⭐','😭','🎉','🪐'];
const EMOJI_PICKER = ['🔥','💜','🚀','🛸','⭐','😭','🎉','🪐','👽','🌙','✨','💫','🎶','🤘','🥹','😎','🌈','⚡','💥','🌟','🛰️','☄️','🌌','🎧','🥁','🎸','💃','🕺','👾','🤯','😤','🫶','🍄','🪩','📻','💿'];

const CHAT_SEED = [
  { id:'c1', uid:'u1', text:'welcome to the launchpad fam 🚀 drop your space jams', t:'-22m' },
  { id:'c2', uid:'u3', text:'this transition is BUTTERY', t:'-18m' },
  { id:'c3', uid:'u6', text:'found a banger https://youtu.be/comet for the queue', t:'-12m', card:'t5' },
  { id:'c4', uid:'u2', text:'added it, thx meteor 🛸', t:'-11m' },
  { id:'c5', uid:'u5', text:'who let saturn swing slap this hard', t:'-6m' },
  { id:'c7', uid:'u1', text:'next up is a deep cut, buckle up', t:'-2m' },
];

Object.assign(window, {
  TRACKS, SEARCH_POOL, ROLES, USERS, ME_ID, ROOMS,
  QUICK_EMOJI, EMOJI_PICKER, CHAT_SEED, avatarFor, SEARCH_POOL,
});
