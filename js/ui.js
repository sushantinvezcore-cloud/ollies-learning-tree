// Small DOM + randomness helpers shared by the math and reading modules.
import * as speech from './speech.js';
import * as sound from './sound.js';

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
export function countGroup(n, emoji, size) {
  const sz = size || (n <= 3 ? 'xl' : n <= 5 ? 'lg' : 'md');
  const el = h('div', { class: `objs size-${sz}`, style: { '--cols': Math.min(n, 5) } });
  const objs = [];
  for (let i = 0; i < n; i++) {
    const o = h('button', { class: 'obj', 'aria-label': 'thing' }, h('span', { class: 'e' }, emoji));
    o.style.animationDelay = `${i * 60}ms`;
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
    ictx.strokeStyle = '#8e6cf0';
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
  return { el };
}

export const glow = el => () => el && el.classList.add('glow');
export const unglow = el => () => el && el.classList.remove('glow');
/** Highlight one element (removing highlight from siblings in `all`). */
export const focusOn = (all, el) => () => { all.forEach(x => x.classList.remove('glow')); el && el.classList.add('glow'); };
