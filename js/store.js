// Progress is saved on the device (localStorage). Nothing leaves the iPad.
const KEY = 'ollies-learning-tree-v1';

const DEFAULT = () => ({
  name: '',
  perDay: 10,
  rate: 0.85,
  voiceName: null,
  extraPractice: false,
  tracks: {
    math: { level: 0, history: [], lessonSeen: {} },
    read: { level: 0, history: [], lessonSeen: {} },
  },
  days: {},      // 'YYYY-MM-DD' -> { math: {done, correct}, read: {done, correct} }
  stickers: [],
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT();
    const s = JSON.parse(raw);
    const d = DEFAULT();
    return { ...d, ...s, tracks: { ...d.tracks, ...(s.tracks || {}) } };
  } catch {
    return DEFAULT();
  }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
}

export function get() { return state; }

export function reset() { state = DEFAULT(); save(); }

export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function today(track) {
  const k = todayKey();
  state.days[k] ??= {};
  state.days[k][track] ??= { done: 0, correct: 0, rounds: 0 };
  return state.days[k][track];
}

/** Consecutive days (ending today or yesterday) on which at least one track was finished. */
export function streak() {
  const finished = k => {
    const d = state.days[k];
    return d && ['math', 'read'].some(t => d[t] && (d[t].rounds > 0 || d[t].done >= state.perDay));
  };
  let n = 0;
  const d = new Date();
  if (!finished(todayKey(d))) d.setDate(d.getDate() - 1);
  while (finished(todayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/** Record a first-try result at the track's current level. Returns true if the child just mastered the level. */
export function recordResult(track, ok, maxLevel) {
  const t = state.tracks[track];
  t.history.push(ok ? 1 : 0);
  if (t.history.length > 10) t.history.shift();
  const correct = t.history.reduce((a, b) => a + b, 0);
  if (t.history.length >= 8 && correct >= 8 && t.level < maxLevel) {
    t.level++;
    t.history = [];
    return true;
  }
  return false;
}

export function setLevel(track, level) {
  const t = state.tracks[track];
  t.level = level;
  t.history = [];
  delete t.lessonSeen[level];
  save();
}
