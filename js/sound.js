// Tiny synthesized sound effects (no audio files needed, works offline).
let ctx = null;

// ---------- iPad audio unlocking ----------
// iPads only let a page make sound after a tap. The voice (speech) also pauses Web Audio on iPads,
// so letter sounds are played through one <audio> player that is "unlocked" by the first tap and can
// then play any clip later without another tap.
const SILENT = 'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';
let player = null;
let playerUnlocked = false;
const diag = { errors: [] };
const note = msg => { diag.errors.push(msg); if (diag.errors.length > 6) diag.errors.shift(); };

function unlockPlayer() {
  if (!player) {
    player = new Audio();
    player.setAttribute('playsinline', '');
    player.preload = 'auto';
  }
  try {
    player.src = SILENT;
    const p = player.play();
    if (p) p.then(() => { playerUnlocked = true; }).catch(e => note(`unlock: ${e.name}`));
    else playerUnlocked = true;
  } catch (e) { note(`unlock: ${e.name || e}`); }
}

export function unlock() {
  try {
    // Safari 16.4+: play sounds even when the iPad is set to silent (like a video would).
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch { /* not supported */ }
  unlockPlayer();
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state !== 'running') ctx.resume();
  } catch { /* no Web Audio */ }
}

// Every tap is a chance to (re)unlock audio, e.g. after the app was in the background.
document.addEventListener('pointerdown', () => {
  if (!playerUnlocked && player) unlockPlayer();
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
}, true);
export const audioState = () => (ctx ? ctx.state : 'none');
export const audioDiag = () => `player ${playerUnlocked ? 'unlocked' : 'locked'}, web audio ${audioState()}${diag.errors.length ? '; ' + diag.errors.join('; ') : ''}`;

function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

// ---------- recorded clips (letter sounds) ----------
// Clips are turned into in-memory blob URLs, so the <audio> player never has to stream them
// (which iPads can refuse when the app is running offline).
const blobs = {};
let current = null;
let lastMethod = '';
export const lastClipMethod = () => lastMethod;

function blobUrl(url) {
  if (!blobs[url]) {
    blobs[url] = fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); })
      .then(b => URL.createObjectURL(new Blob([b], { type: 'audio/wav' })))
      .catch(e => { delete blobs[url]; throw e; });
  }
  return blobs[url];
}

export function preload(urls) { urls.forEach(u => blobUrl(u).catch(e => note(`load: ${e.message}`))); }

function playWithPlayer(src, rate) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = err => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      player.onended = player.onerror = null;
      if (current === handle) current = null;
      err ? reject(err) : resolve();
    };
    const handle = { stop: () => { try { player.pause(); } catch {} finish(); } };
    const t = setTimeout(() => finish(), 3500);
    player.onended = () => finish();
    player.onerror = () => finish(new Error('player error'));
    current = handle;
    player.src = src;
    player.playbackRate = rate;
    const p = player.play();
    if (p) p.catch(e => finish(e));
  });
}

function playWebAudio(url, rate) {
  return fetch(url).then(r => r.arrayBuffer())
    .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
    .then(buf => new Promise(resolve => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      src.connect(ctx.destination);
      const t = setTimeout(done, (buf.duration / rate) * 1000 + 400);
      function done() { clearTimeout(t); if (current === src) current = null; resolve(); }
      src.onended = done;
      current = src;
      src.start();
    }));
}

/** Play a recorded clip; resolves true when it played, false if it couldn't. Never throws. */
export async function playClip(url, rate = 1) {
  if (player) {
    try {
      const src = await blobUrl(url);
      await playWithPlayer(src, rate);
      lastMethod = 'audio player';
      return true;
    } catch (e) { note(`player: ${e.name || ''} ${e.message || e}`.trim()); }
  }
  if (ctx && ctx.state === 'running') {
    try { await playWebAudio(url, rate); lastMethod = 'web audio'; return true; }
    catch (e) { note(`web audio: ${e.message || e}`); }
  }
  lastMethod = 'failed';
  return false;
}

export function stopClip() {
  try { current?.stop(); } catch { /* already stopped */ }
  current = null;
}

export function pop() { tone(660, 0, 0.12, 'triangle', 0.15); }
export function correct() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle')); }
export function wrong() { tone(330, 0, 0.18, 'sine', 0.12); tone(262, 0.16, 0.25, 'sine', 0.12); }
export function fanfare() {
  [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.3, 'triangle', 0.16));
}
