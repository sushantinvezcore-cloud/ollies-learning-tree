// Tiny synthesized sound effects (no audio files needed, works offline).
let ctx = null;

export function unlock() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* no audio */ }
}

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
const buffers = {};
const loading = {};
let current = null;

function decode(ab) {
  // Older Safari only supports the callback form of decodeAudioData.
  return new Promise((resolve, reject) => ctx.decodeAudioData(ab, resolve, reject));
}

export function loadClip(url) {
  if (buffers[url]) return Promise.resolve(buffers[url]);
  if (!loading[url]) {
    loading[url] = fetch(url)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(decode)
      .then(b => (buffers[url] = b))
      .catch(e => { delete loading[url]; throw e; });
  }
  return loading[url];
}

export function preload(urls) { if (ctx) urls.forEach(u => loadClip(u).catch(() => {})); }

/** Play a clip; resolves when it ends. Rejects if audio isn't available (caller falls back to speech). */
export async function playClip(url, rate = 1) {
  if (!ctx) throw new Error('no audio');
  if (ctx.state === 'suspended') await ctx.resume();
  const buf = await loadClip(url);
  return new Promise(resolve => {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = 1;
    src.connect(g).connect(ctx.destination);
    const t = setTimeout(done, (buf.duration / rate) * 1000 + 400);
    function done() { clearTimeout(t); if (current === src) current = null; resolve(); }
    src.onended = done;
    current = src;
    src.start();
  });
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
