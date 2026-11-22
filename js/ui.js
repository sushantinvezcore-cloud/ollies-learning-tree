// Small DOM + randomness helpers shared by the math and reading modules.
import * as speech from './speech.js';
import * as sound from './sound.js';
import * as store from './store.js';

export const $ = (sel, root = document) => root.querySelector(sel);

/** h('div', {class:'x', onclick: fn}, child, 'text', ...) */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [p, val] of Object.entries(v)) {
        if (p.startsWith('--')) el.style.setProperty(p, val);
        else el.style[p] = val;
      }
    }
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** Pick `count` distinct items from arr, excluding any for which reject(item) is true. */
export function pickN(arr, count, reject = () => false) {
  return shuffle(arr.filter(x => !reject(x))).slice(0, count);
}

// ---------- no-repeat picking within one round ----------
// Every picture, object or word used in the current round is remembered, so the next question
// picks something new. Once a whole list has been used it starts over (never the same one twice in a row).
const used = new Set();
let lastPicked = null;
export function resetFresh() { used.clear(); lastPicked = null; }
export const isUsed = key => used.has(key);

export function fresh(list, keyFn = x => x, reject = () => false) {
  const ok = list.filter(x => !reject(x));
  let avail = ok.filter(x => !used.has(keyFn(x)));
  if (!avail.length) {
    ok.forEach(x => used.delete(keyFn(x)));
    avail = ok.filter(x => keyFn(x) !== lastPicked);
    if (!avail.length) avail = ok;
  }
  const item = pick(avail);
  if (item !== undefined) { used.add(keyFn(item)); lastPicked = keyFn(item); }
  return item;
}

/** n distinct items, preferring ones not yet seen this round. */
export function freshN(list, n, keyFn = x => x, reject = () => false) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const taken = new Set(out.map(keyFn));
    const item = fresh(list, keyFn, x => reject(x) || taken.has(keyFn(x)));
    if (item === undefined) break;
    out.push(item);
  }
  return out;
}

/** The answer plus nearby distinct distractors within [lo, hi], shuffled. */
export function numberChoices(answer, lo, hi, count = 3) {
  const pool = [];
  for (let d = 1; d <= 3; d++) {
    if (answer - d >= lo) pool.push(answer - d);
    if (answer + d <= hi) pool.push(answer + d);
  }
  const near = shuffle(pool.slice(0, 4)).slice(0, count - 1);
  let extra = lo;
  while (near.length < count - 1 && extra <= hi) {
    if (extra !== answer && !near.includes(extra)) near.push(extra);
    extra++;
  }
  return shuffle([answer, ...near]);
}

export function dotsHTML(n) {
  return `<span class="dots">${'<i></i>'.repeat(n)}</span>`;
}

/** A group of tappable emoji objects, laid out in rows of five. */
export function countGroup(n, emoji, size, cols = 5) {
  const sz = size || (n <= 3 ? 'xl' : n <= 5 ? 'lg' : 'md');
  const el = h('div', { class: `objs size-${sz}`, style: { '--cols': Math.min(n, cols) } });
  const objs = [];
  for (let i = 0; i < n; i++) {
    const o = h('button', { class: 'obj', 'aria-label': 'thing' }, h('span', { class: 'e' }, emoji));
    o.style.animationDelay = `${Math.min(i * 30, 450)}ms`; // big groups still appear quickly
    el.append(o);
    objs.push(o);
  }
  return { el, objs };
}

/** Tap-to-count: each tap numbers an object and says the number (teaches one-to-one counting). */
export class Counter {
  constructor(objs) {
    this.objs = objs;
    this.n = 0;
    for (const o of objs) o.addEventListener('click', () => this.tap(o));
  }
  tap(o) {
    if (o.classList.contains('counted') || o.classList.contains('gone')) return;
    this.n++;
    this.mark(o, this.n);
    sound.pop();
    speech.speak({ text: String(this.n), rate: 1.05 });
  }
  mark(o, n) {
    o.classList.add('counted');
    o.dataset.n = n;
  }
  clear() {
    this.n = 0;
    for (const o of this.objs) { o.classList.remove('counted'); delete o.dataset.n; }
  }
  /** Speech parts that count every object aloud, numbering them in sync. */
  autoParts() {
    return [
      () => this.clear(),
      ...this.objs.flatMap((o, i) => [
        () => { this.n = i + 1; this.mark(o, i + 1); sound.pop(); },
        { text: String(i + 1), rate: 1.05 },
      ]),
    ];
  }
}

/** '2 + 1 = ?' style equation. */
export function equation(a, op, b) {
  const ans = h('span', { class: 'ans' }, '?');
  const el = h('div', { class: 'eq' },
    h('span', { class: 'n' }, a), h('span', { class: 'op' }, op), h('span', { class: 'n' }, b),
    h('span', { class: 'op' }, '='), ans);
  return { el, reveal(v) { ans.textContent = v; ans.classList.add('shown'); } };
}

/**
 * Finger-tracing board: a big grey number to trace over.
 * Calls onDone() once enough of the number is covered without scribbling everywhere,
 * and onMessy() when most of the ink is off the number (the board then clears).
 */
export function traceBoard(text, { onDone, onMessy }) {
  const guide = h('canvas', { class: 'trace-guide' });
  const ink = h('canvas', { class: 'trace-ink' });
  const clearBtn = h('button', { class: 'icon-btn trace-clear', 'aria-label': 'Start again' }, '🔄');
  const el = h('div', { class: 'trace-wrap' }, guide, ink, clearBtn);
  let W = 0, H = 0, mask = null, near = null, ictx = null, done = false, lastX = 0, lastY = 0, drawing = false;
  const STEP = 4;

  function glyph(ctx, mode, width) {
    ctx.font = `700 ${Math.round(H * 0.82)}px Andika, 'Chalkboard SE', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (mode === 'stroke') { ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.strokeText(text, W / 2, H * 0.54); }
    ctx.fillText(text, W / 2, H * 0.54);
  }
  function sample(ctx) {
    const data = ctx.getImageData(0, 0, W, H).data;
    const out = [];
    for (let y = 0; y < H; y += STEP) for (let x = 0; x < W; x += STEP) out.push(data[(y * W + x) * 4 + 3] > 40 ? 1 : 0);
    return out;
  }
  function setup() {
    const r = el.getBoundingClientRect();
    if (!r.width) { requestAnimationFrame(setup); return; }
    W = Math.round(r.width); H = Math.round(r.height);
    for (const c of [guide, ink]) { c.width = W; c.height = H; }
    const g = guide.getContext('2d');
    g.fillStyle = '#e4ddf7';
    glyph(g);
    g.setLineDash([H * 0.02, H * 0.025]);
    g.strokeStyle = '#b9aee0';
    g.lineWidth = Math.max(2, H * 0.008);
    g.strokeText(text, W / 2, H * 0.54);
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const o = off.getContext('2d', { willReadFrequently: true });
    glyph(o);
    mask = sample(o);
    o.clearRect(0, 0, W, H);
    glyph(o, 'stroke', H * 0.16);
    near = sample(o);
    ictx = ink.getContext('2d', { willReadFrequently: true });
    ictx.strokeStyle = inkColor();
    ictx.lineCap = 'round';
    ictx.lineJoin = 'round';
    ictx.lineWidth = H * 0.085;
  }
  const pos = e => { const r = ink.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  ink.addEventListener('pointerdown', e => {
    if (done || !ictx) return;
    e.preventDefault();
    ink.setPointerCapture?.(e.pointerId);
    drawing = true;
    [lastX, lastY] = pos(e);
    ictx.beginPath(); ictx.arc(lastX, lastY, ictx.lineWidth / 2, 0, Math.PI * 2); ictx.fillStyle = ictx.strokeStyle; ictx.fill();
  });
  ink.addEventListener('pointermove', e => {
    if (!drawing) return;
    const [x, y] = pos(e);
    ictx.beginPath(); ictx.moveTo(lastX, lastY); ictx.lineTo(x, y); ictx.stroke();
    lastX = x; lastY = y;
  });
  const end = () => {
    if (!drawing) return;
    drawing = false;
    const got = sample(ictx);
    let onGlyph = 0, glyphTotal = 0, inkTotal = 0, off = 0;
    for (let k = 0; k < got.length; k++) {
      if (mask[k]) { glyphTotal++; if (got[k]) onGlyph++; }
      if (got[k]) { inkTotal++; if (!near[k]) off++; }
    }
    const cover = onGlyph / Math.max(1, glyphTotal);
    const offRatio = off / Math.max(1, inkTotal);
    if (cover >= 0.6 && offRatio < 0.4) { done = true; onDone(); }
    else if (inkTotal > glyphTotal * 0.8 && offRatio >= 0.4) { clear(); onMessy?.(); }
  };
  ink.addEventListener('pointerup', end);
  ink.addEventListener('pointercancel', end);
  const clear = () => ictx && ictx.clearRect(0, 0, W, H);
  clearBtn.addEventListener('click', () => { if (!done) clear(); });
  const start = () => requestAnimationFrame(setup);
  if (document.fonts?.ready) document.fonts.ready.then(start); else start();
  return { el, setColor: c => { if (ictx) ictx.strokeStyle = c; } };
}

export const glow = el => () => el && el.classList.add('glow');
export const unglow = el => () => el && el.classList.remove('glow');
/** Highlight one element (removing highlight from siblings in `all`). */
export const focusOn = (all, el) => () => { all.forEach(x => x.classList.remove('glow')); el && el.classList.add('glow'); };

// ---------- writing: pen colours and a free drawing pad ----------
// All dark, so whatever she writes is easy to read on the white pad.
export const INK_COLORS = [
  ['#111111', 'black'], ['#4e342e', 'brown'], ['#7a1f1f', 'dark red'], ['#b0123f', 'red'], ['#8e0e5c', 'berry'],
  ['#6a1b9a', 'purple'], ['#3a2a8c', 'indigo'], ['#1a237e', 'navy'], ['#0d47a1', 'blue'], ['#01579b', 'ocean blue'],
  ['#00695c', 'teal'], ['#1b5e20', 'green'], ['#33691e', 'leaf green'], ['#8a4b08', 'orange brown'], ['#37474f', 'grey'],
];
export function inkColor() {
  const c = store.get().inkColor;
  return INK_COLORS.some(x => x[0] === c) ? c : INK_COLORS[8][0];
}

/** A row of 15 colour dots. Picking one is remembered for next time. */
export function colorPicker(onPick) {
  const current = inkColor();
  const dots = INK_COLORS.map(([c, name]) => {
    const b = h('button', { class: `swatch ${c === current ? 'on' : ''}`, style: { background: c }, 'aria-label': name });
    b.addEventListener('click', () => {
      dots.forEach(d => d.classList.remove('on'));
      b.classList.add('on');
      store.get().inkColor = c;
      store.save();
      sound.pop();
      speech.speak(`${name}!`);
      onPick(c);
    });
    return b;
  });
  return h('div', { class: 'swatches' }, dots);
}

/**
 * Free drawing pad. With `guide` text, the text is drawn big in dotted grey letters to trace over.
 * No checking: onInk() fires once she has drawn a little, so the Done button can light up.
 */
export function drawPad({ guide = '', onInk = () => {}, cls = '' } = {}) {
  const guideC = h('canvas', { class: 'pad-guide' });
  const ink = h('canvas', { class: 'pad-ink' });
  const clearBtn = h('button', { class: 'icon-btn pad-clear', 'aria-label': 'Start again' }, '🔄');
  const el = h('div', { class: `pad-wrap ${cls}` }, guideC, ink, clearBtn);
  let W = 0, H = 0, ctx = null, drawing = false, lastX = 0, lastY = 0, inkLen = 0, told = false, lineW = 12;

  function setup() {
    const r = el.getBoundingClientRect();
    if (!r.width) { requestAnimationFrame(setup); return; }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    for (const c of [guideC, ink]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const g = guideC.getContext('2d');
    g.scale(dpr, dpr);
    let size = H * 0.72;
    if (guide) {
      g.font = `700 100px Andika, 'Chalkboard SE', sans-serif`;
      const w100 = g.measureText(guide).width;
      size = Math.min(H * 0.8, (W * 0.9 * 100) / w100);
      g.font = `700 ${size}px Andika, 'Chalkboard SE', sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'alphabetic';
      const y = H * 0.5 + size * 0.28;
      // writing lines: baseline and middle line help her place the letters
      g.strokeStyle = '#d9d2ef'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(W * 0.03, y); g.lineTo(W * 0.97, y); g.stroke();
      g.setLineDash([8, 10]);
      g.beginPath(); g.moveTo(W * 0.03, y - size * 0.47); g.lineTo(W * 0.97, y - size * 0.47); g.stroke();
      g.fillStyle = '#ece8f7';
      g.fillText(guide, W / 2, y);
      g.setLineDash([size * 0.03, size * 0.035]);
      g.strokeStyle = '#a79bd6';
      g.lineWidth = Math.max(2, size * 0.012);
      g.strokeText(guide, W / 2, y);
      lineW = Math.max(8, size * 0.085);
    } else {
      lineW = Math.max(10, H * 0.045);
    }
    ctx = ink.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lineW;
    ctx.strokeStyle = inkColor();
    ctx.fillStyle = inkColor();
  }
  const pos = e => { const r = ink.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  ink.addEventListener('pointerdown', e => {
    if (!ctx) return;
    e.preventDefault();
    ink.setPointerCapture?.(e.pointerId);
    drawing = true;
    [lastX, lastY] = pos(e);
    ctx.beginPath(); ctx.arc(lastX, lastY, lineW / 2, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
  });
  ink.addEventListener('pointermove', e => {
    if (!drawing) return;
    const [x, y] = pos(e);
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke();
    inkLen += Math.hypot(x - lastX, y - lastY);
    lastX = x; lastY = y;
    if (!told && inkLen > Math.min(W, H) * 0.6) { told = true; onInk(); }
  });
  const end = () => { drawing = false; };
  ink.addEventListener('pointerup', end);
  ink.addEventListener('pointercancel', end);
  clearBtn.addEventListener('click', () => { if (ctx) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ink.width, ink.height); ctx.restore(); } sound.pop(); });
  const start = () => requestAnimationFrame(setup);
  if (document.fonts?.ready) document.fonts.ready.then(start); else start();
  return { el, setColor: c => { if (ctx) ctx.strokeStyle = c; } };
}

/** The big ✓ button shown under a writing activity. Lights up once she has drawn something. */
export function doneButton(onDone) {
  const b = h('button', { class: 'choice done-btn waiting', 'aria-label': 'Done' }, '✓');
  b.addEventListener('click', () => { if (!b.classList.contains('waiting')) onDone(); else speech.speak('Write first, then tap the tick.'); });
  return { el: b, ready: () => { b.classList.remove('waiting'); b.classList.add('pulse'); } };
}
