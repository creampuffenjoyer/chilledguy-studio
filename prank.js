const SW = screen.availWidth;
const SH = screen.availHeight;
const WW = 480;
const WH = 300;
const V = 15;
const MG = 10;
const TICK = 50;

const MAX_POPUPS = 8;          // how many popups at once
const SPAWN_EVERY_MS = 2000;   // a new popup every 3 seconds until MAX_POPUPS
const RESPAWN_ON_CLOSE = true; // a closed popup gets replaced
const RESPAWN_CHECK_MS = 500;  // how fast the replacement comes
const SHOW_EXIT = false;       // true = show a "Let me out" button after 15s
const AUDIO_HEARTBEAT_MS = 1000;
const AUDIO_PEER_TIMEOUT_MS = 5000;

const G = 'assets/';
const SONG = 'assets/caramel.m4a';
const SALT = 'assets/notavirus.jpg';
const MAIN_GIF = 'epsdancing.gif';   // file name inside assets/
const BACKDROPS = ['cat.gif', 'duck.gif', 'epsdancing.gif', 'rickroll.gif', 'speed.gif', 'speed2.gif'];
const STICKERS = ['chillguy.png', 'notavirus.jpg', 'cat-pointing-at-camera-with-yellow-fist-l2flu758w19ody7c.webp'];

const M = {
  pikachu: [MAIN_GIF, 'RIPBOZO'],
  troll:   ['cat.gif', 'RIPBOZO'],
  chad:    ['speed.gif', 'RIPBOZO'],
  fine:    ['duck.gif', 'RIPBOZO'],
  bonk:    [STICKERS[2], 'RIPBOZO'],
  cry:     ['speed2.gif', 'RIPBOZO'],
  chungus: ['chillguy.png', 'RIPBOZO'],
  stonks:  ['notavirus.jpg', 'RIPBOZO'],
  nyan:    ['cat.gif', 'RIPBOZO'],
  doge:    ['duck.gif', 'RIPBOZO'],
  sponge:  ['speed.gif', 'RIPBOZO'],
  head:    ['speed2.gif', 'RIPBOZO'],
  banana:  [STICKERS[2], 'RIPBOZO'],
  rick:    ['rickroll.gif', 'RIPBOZO'],
  dance:   [MAIN_GIF, 'RIPBOZO']
};

const PHRASES = [
  'nigga',
  'nigga',
  'nigga',
  'nigga',
  'nigga',
  'nigga',
  'nigga'
];

const K = Object.keys(M);
const $ = id => document.getElementById(id);
const R = n => Math.random() * n;
const pick = a => a[Math.floor(R(a.length))];

const sameOrigin = () => {
  try {
    return window.opener.location.origin === location.origin;
  } catch {
    return false;
  }
};

const isChild =
  (window.opener && sameOrigin()) ||
  new URLSearchParams(location.search).has('child');

let on = true;
let started = isChild;
let count = 0;
let wins = [];
let fake = [];
let timers = [];
let audio = null;
let lj = 0;
let mx = -1;
let my = -1;
let th = 0;
let audioContext = null;
let peak = 0;
let saltDone = false;

const myId = Math.random().toString(36).slice(2);
const bc = new BroadcastChannel('cgs');
const audioPeers = new Map();
let audioJoined = false;
let audioPlaying = false;
let audioAllowed = true;
let audioCheckpoint = { position: 0, at: Date.now() };

if (!localStorage.getItem('cgs_session') && !isChild) {
  location.replace('login.html');
}

/* ---------- audio ---------- */

function announceAudio() {
  if (!on || !audioJoined) return;
  const state = {
    t: 'audio-state', id: myId, playing: audioPlaying,
    allowed: audioAllowed, position: audioPlaying ? audio.currentTime : audioCheckpoint.position,
    at: audioPlaying ? Date.now() : audioCheckpoint.at
  };
  audioPeers.set(myId, { ...state, seen: Date.now() });
  bc.postMessage(state);
}

function electAudio() {
  if (!on || !audioJoined) return;
  const now = Date.now();
  for (const [id, peer] of audioPeers) {
    if (id !== myId && now - peer.seen > AUDIO_PEER_TIMEOUT_MS) audioPeers.delete(id);
  }
  // Keep an existing player; otherwise every survivor elects the same successor.
  const candidates = [...audioPeers.values()].filter(p => p.allowed);
  candidates.sort((a, b) => Number(b.playing) - Number(a.playing) || a.id.localeCompare(b.id));
  const leader = candidates[0];
  if (leader?.id === myId) startAudio();
  else if (leader?.playing && audio) {
    stopAudio();
    announceAudio();
  }
  if ($('audio-resume')) $('audio-resume').hidden = audioAllowed || Boolean(leader?.playing);
}

function joinAudio() {
  if (audioJoined || !on) return;
  audioJoined = true;
  audioCheckpoint.at = Date.now();
  announceAudio();
  bc.postMessage({ t: 'audio-hello', id: myId });
  // Allow existing players to answer before a newly opened popup elects itself.
  timers.push(setInterval(() => {
    announceAudio();
    electAudio();
  }, AUDIO_HEARTBEAT_MS));
}

function startAudio() {
  if (!on || !started || audio || !audioAllowed) return;
  const a = new Audio(SONG);
  a.loop = true;
  a.volume = 0.5;
  audio = a;
  const position = audioCheckpoint.position + (Date.now() - audioCheckpoint.at) / 1000;
  a.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(a.duration) && a.duration > 0) a.currentTime = position % a.duration;
  }, { once: true });
  a.play().then(() => {
    // A stop or another confirmed player may have superseded this request.
    if (!on || audio !== a) { a.pause(); return; }
    audioPlaying = true;
    announceAudio();
    electAudio();
  }).catch(() => {
    if (audio !== a) return;
    audio = null;
    audioPlaying = false;
    audioAllowed = false;
    announceAudio();
    electAudio();
  });
}

function stopAudio() {
  if (audio) {
    if (audioPlaying) audioCheckpoint = { position: audio.currentTime, at: Date.now() };
    audio.pause();
    audio = null;
  }
  audioPlaying = false;
}

bc.onmessage = e => {
  const d = e.data;
  if (d === 'stop') return stop();
  if (!on || !audioJoined || !d || d.id === myId) return;
  if (d.t === 'audio-hello') {
    announceAudio();
  } else if (d.t === 'audio-state') {
    audioPeers.set(d.id, { ...d, seen: Date.now() });
    if (d.playing) audioCheckpoint = { position: d.position, at: d.at };
    electAudio();
  } else if (d.t === 'audio-bye') {
    if (d.playing && Number.isFinite(d.position)) audioCheckpoint = { position: d.position, at: d.at };
    audioPeers.delete(d.id);
    electAudio();
  }
};

// Every window announces departure. No surviving window depends on its opener.
addEventListener('pagehide', () => {
  if (!audioJoined) return;
  try {
    bc.postMessage({ t: 'audio-bye', id: myId,
      playing: audioPlaying,
      position: audioPlaying ? audio.currentTime : audioCheckpoint.position,
      at: audioPlaying ? Date.now() : audioCheckpoint.at });
  } catch {}
});

/* ---------- memes ---------- */

function meme(k) {
  const [f, t] = M[k];
  const d = document.createElement('div');
  d.className = 'meme';

  const i = new Image();
  i.src = G + f;
  i.alt = t;

  i.onerror = () => {
    i.remove();
    const b = document.createElement('b');
    b.textContent = '[' + f + ']';
    d.prepend(b);
  };

  d.append(i);

  const s = document.createElement('span');
  s.textContent = t;
  d.append(s);

  return d;
}

let tt;

function toast(k) {
  const t = $('toast');
  if (!t) return;

  t.replaceChildren(meme(k));
  t.style.display = 'grid';

  clearTimeout(tt);
  tt = setTimeout(() => {
    t.style.display = 'none';
  }, 1500);
}

function speak(p) {
  try {
    const u = new SpeechSynthesisUtterance(p || pick(PHRASES));
    u.rate = 1.1;
    speechSynthesis.speak(u);
  } catch {}
}

function theremin() {
  if (th) return;
  th = 1;

  try {
    audioContext = new AudioContext();

    const o = audioContext.createOscillator();
    const g = audioContext.createGain();

    g.gain.value = 0.025;
    o.connect(g);
    g.connect(audioContext.destination);
    o.start();

    addEventListener('mousemove', e => {
      if (!on || !audioContext) return;
      o.frequency.value = 200 + (e.clientX / innerWidth) * 900;
    });
  } catch {}
}

/* ---------- download ---------- */

async function salt() {
  let url;

  try {
    const r = await fetch(SALT);
    if (!r.ok) throw new Error('Image unavailable');
    url = URL.createObjectURL(await r.blob());
  } catch {
    const c = document.createElement('canvas');
    c.width = 800;
    c.height = 500;

    const x = c.getContext('2d');
    x.fillStyle = '#8b917f';
    x.fillRect(0, 0, 800, 500);
    x.fillStyle = '#23261f';
    x.textAlign = 'center';
    x.font = '700 56px sans-serif';
    x.fillText('RIPBOZO', 400, 250);

    url = await new Promise(resolve => {
      c.toBlob(blob => {
        resolve(blob ? URL.createObjectURL(blob) : '');
      }, 'image/jpeg', 0.9);
    });
  }

  if (!url) return;

  const a = document.createElement('a');
  a.href = url;
  a.download = 'ripbozo.jpg';
  document.body.append(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function saltOnce() {
  if (saltDone) return;
  saltDone = true;
  salt();
}

/* ---------- windows ---------- */

function coords() {
  return {
    x: MG + Math.floor(R(Math.max(1, SW - WW - MG))),
    y: MG + Math.floor(R(Math.max(1, SH - WH - MG)))
  };
}

function bounce() {
  let vx = V * (Math.random() > 0.5 ? 1 : -1);
  let vy = V * (Math.random() > 0.5 ? 1 : -1);

  timers.push(setInterval(() => {
    if (!on) return;

    const x = screenX;
    const y = screenY;
    const w = outerWidth;
    const h = outerHeight;

    if (x < MG) vx = Math.abs(vx);
    if (x + w > SW - MG) vx = -Math.abs(vx);
    if (y < MG + 20) vy = Math.abs(vy);
    if (y + h > SH - MG) vy = -Math.abs(vy);

    try {
      if (isChild) moveBy(vx, vy);
    } catch {}
  }, TICK));
}

function jump() {
  const n = Date.now();
  if (n - lj < 250) return;
  lj = n;

  const w = Math.max(240, outerWidth * 0.85);
  const h = Math.max(200, outerHeight * 0.85);

  try {
    if (isChild) {
      resizeTo(w, h);
      moveTo(R(Math.max(1, SW - w)), R(Math.max(1, SH - h)));
    }
  } catch {}
}

addEventListener('mousemove', e => {
  mx = e.clientX;
  my = e.clientY;

  if (on && isChild && e.clientY < 110 && e.clientX > innerWidth - 330) {
    jump();
  }
});

function openWindow() {
  wins = wins.filter(w => !w.closed);
  if (wins.length >= MAX_POPUPS) return false;

  const { x, y } = coords();
  const w = window.open(
    location.pathname + '?child=true',
    '',
    `width=${WW},height=${WH},left=${x},top=${y}`
  );
  if (!w) return false;

  wins.push(w);
  peak = Math.max(peak, wins.length);
  return true;
}

function fakeWin() {
  if (fake.length >= 8) return;

  const w = document.createElement('div');
  w.className = 'win';

  const b = document.createElement('div');
  b.className = 'bar';

  const title = document.createElement('span');
  title.textContent = 'RIPBOZO.exe';

  const x = document.createElement('button');
  x.className = 'x';
  x.textContent = 'X';
  x.setAttribute('aria-label', 'Close meme');

  b.append(title, x);
  w.append(b, meme(pick(K)));
  document.body.append(w);

  const obj = {
    w,
    x: R(Math.max(1, innerWidth - 200)),
    y: R(Math.max(1, innerHeight - 200)),
    vx: (R(6) + 3) * (Math.random() < 0.5 ? -1 : 1),
    vy: (R(6) + 3) * (Math.random() < 0.5 ? -1 : 1)
  };

  x.addEventListener('click', () => {
    w.remove();
    fake = fake.filter(o => o !== obj);
  });

  fake.push(obj);
}

(function loop() {
  for (const o of fake) {
    o.x += o.vx;
    o.y += o.vy;

    if (o.x < 0 || o.x > innerWidth - 200) o.vx *= -1;
    if (o.y < 0 || o.y > innerHeight - 150) o.vy *= -1;

    o.w.style.left = o.x + 'px';
    o.w.style.top = o.y + 'px';
  }

  if (on) requestAnimationFrame(loop);
})();

function stage() {
  const s = $('stage');
  if (!s) return;

  s.replaceChildren();
  s.style.display = 'block';
  s.classList.toggle('child-stage', Boolean(isChild));
  s.setAttribute('aria-hidden', 'true');

  const wall = document.createElement('div');
  wall.className = 'chaos-wall';
  // Rotate the order so each window has a different composition.
  const offset = Math.floor(R(BACKDROPS.length));
  const files = isChild ? [BACKDROPS[offset]] : BACKDROPS.map((_, i) => BACKDROPS[(i + offset) % BACKDROPS.length]);
  files.forEach(file => {
    const tile = document.createElement('div');
    tile.className = 'chaos-tile';
    const image = new Image();
    image.src = G + file;
    image.alt = '';
    image.onerror = () => image.remove();
    tile.append(image);
    wall.append(tile);
  });
  s.append(wall);

  STICKERS.forEach((file, i) => {
    const image = new Image();
    image.src = G + file;
    image.alt = '';
    image.className = 'chaos-sticker sticker-' + i;
    image.onerror = () => image.remove();
    s.append(image);
  });

  for (const edge of ['top', 'bottom']) {
    const ribbon = document.createElement('div');
    ribbon.className = 'chaos-ribbon ribbon-' + edge;
    const text = document.createElement('span');
    text.textContent = 'NIGGA // NIGGA // '.repeat(12);
    ribbon.append(text);
    s.append(ribbon);
  }
}

/* ---------- input ---------- */

function intercept(fn) {
  ['mousedown', 'mouseup', 'click', 'keydown'].forEach(t => {
    document.body.addEventListener(t, fn);
  });
}

const KEYS = e => {
  const k = e.key.toLowerCase();

  if (e.altKey && k === 'f4') return 'chad';
  if (e.ctrlKey && k === 'w') return 'bonk';
  if (e.key === 'Escape') return 'troll';
  if (e.key === 'F5' || (e.ctrlKey && k === 'r')) return 'rick';
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && k === 'i')) return 'sponge';
  if (e.ctrlKey && k === 's') return 'stonks';

  return null;
};

function init(e) {
  if (!on || !started) return;

  if (e.target.closest?.('#out')) return;
  if (e.target.closest?.('#chaos-boost')) return;
  if (e.target.closest?.('#audio-resume')) return;
  if (e.target.closest?.('.win .x')) return;

  if (e.type === 'keydown') {
    const m = KEYS(e);
    if (m) toast(m);
  }

  // only the main page opens popups; if they are blocked, use in-page windows
  if (!isChild) {
    if (!openWindow()) fakeWin();
  }

  count++;

  if (!isChild || audio) {   // popups only make noise if they hold the song
    speak();
    theremin();
  }

  if (count === 1 && !isChild) {
    startAudio();
    saltOnce();

    // ramp up: a new popup every SPAWN_EVERY_MS
    timers.push(setInterval(() => {
      if (on) openWindow();
    }, SPAWN_EVERY_MS));

    // if one gets closed, replace it
    if (RESPAWN_ON_CLOSE) {
      timers.push(setInterval(() => {
        if (!on) return;
        wins = wins.filter(w => !w.closed);
        if (wins.length < peak) openWindow();
      }, RESPAWN_CHECK_MS));
    }

  }
}

/* ---------- stop ---------- */

function stop() {
  if (!on) return;
  on = false;

  timers.forEach(clearInterval);
  timers = [];
  clearTimeout(tt);

  stopAudio();

  try { speechSynthesis.cancel(); } catch {}
  try { if (audioContext) audioContext.close(); } catch {}

  wins.forEach(w => {
    try { w.close(); } catch {}
  });
  wins = [];

  fake.forEach(o => o.w.remove());
  fake = [];

  try {
    bc.postMessage('stop');
    bc.close();
  } catch {}

  if (isChild) {
    window.close();
    return;
  }

  const toastEl = $('toast');
  const stageEl = $('stage');
  const outEl = $('out');
  const revealEl = $('reveal');
  if ($('chaos-boost')) $('chaos-boost').hidden = true;
  if ($('audio-resume')) $('audio-resume').hidden = true;

  if (toastEl) toastEl.style.display = 'none';
  if (stageEl) {
    stageEl.style.display = 'none';
    stageEl.classList.remove('shake', 'spin');
    stageEl.replaceChildren();
  }
  if (outEl) outEl.style.display = 'none';
  if (revealEl) revealEl.style.display = 'grid';

  document.title = 'RIPBOZO - Chilled Guy Studio';
}

if ($('out')) {
  $('out').addEventListener('click', stop);
  if (SHOW_EXIT) {
    setTimeout(() => { $('out').style.display = 'block'; }, 15000);
  }
}

/* ---------- start ---------- */

if ($('audio-resume')) {
  $('audio-resume').addEventListener('click', e => {
    e.stopPropagation();
    if (!on || !started) return;
    audioAllowed = true;
    announceAudio();
    startAudio();
  });
}

if ($('chaos-boost')) {
  $('chaos-boost').addEventListener('click', e => {
    e.stopPropagation();
    if (!on || !started || isChild) return;
    // Keep the existing limits; blocked browser popups still get in-page company.
    for (let i = 0; i < 3; i++) {
      openWindow();
      fakeWin();
    }
    const button = $('chaos-boost');
    button.classList.remove('boost-hit');
    void button.offsetWidth;
    button.classList.add('boost-hit');
  });
}

if (isChild) {
  if ($('start')) $('start').style.display = 'none';

  stage();
  bounce();

  joinAudio();

  intercept(init);
} else {
  if ($('sign-out')) {
    $('sign-out').addEventListener('click', () => {
      localStorage.removeItem('cgs_session');
    });
  }

  if ($('go')) {
    $('go').addEventListener('click', () => {
      if (started) return;
      started = true;
      joinAudio();
      startAudio();   // the song starts on the Continue click
      saltOnce();     // and so does the download

      if ($('start')) $('start').style.display = 'none';

      stage();
      if ($('chaos-boost')) $('chaos-boost').hidden = false;
      $('stage').classList.add('shake');
      setTimeout(() => {
        if (on) $('stage').classList.add('spin');
      }, 12000);

      toast('pikachu');
    });
  }

  intercept(init);
}
