// App flow: splash -> home -> (lesson when a new level starts) -> 10 questions -> sticker reward.
import * as speech from './speech.js';
import * as sound from './sound.js';
import * as store from './store.js';
import { $, h, pick, shuffle, resetFresh } from './ui.js';
import { LEVELS as MATH, writingQuestion as mathWriting } from './math.js';
import { LEVELS as READ, LETTERS, soundClip, writingQuestion as readWriting } from './reading.js';

const CURRICULA = { math: MATH, read: READ };
const WRITERS = { math: mathWriting, read: readWriting };
const TRACK_NAMES = { math: 'Numbers', read: 'Letters' };
const PRAISE = ['Great job!', 'You got it!', 'Yay!', 'Super!', 'Well done!', 'Awesome!', 'Hooray!', 'Wonderful!'];
const STICKERS = ['🦄', '🐶', '🐱', '🦊', '🐼', '🐨', '🐯', '🦁', '🐸', '🐵', '🐧', '🐥', '🦋', '🐞', '🐢', '🐙', '🦀', '🐠',
  '🐬', '🐳', '🦒', '🦓', '🐘', '🦔', '🦩', '🦚', '🌈', '🌟', '🌸', '🌻', '🍓', '🍉', '🧁', '🍩', '🎈', '🚀', '🎠', '🪁',
  '🏰', '👑', '🦕', '🐝', '🐰', '🐻', '🦉', '🐿️', '🍦', '🎀'];

const S = store.get;
const APP_VERSION = 7;
let session = null;

// ---------------- screens ----------------
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === `screen-${id}`));
}

function goHome() {
  speech.stop();
  session = null;
  renderHome();
  show('home');
}

document.addEventListener('click', e => {
  const a = e.target.closest('[data-action="home"]');
  if (a) { sound.pop(); goHome(); }
});

// ---------------- splash ----------------
$('#btn-start').addEventListener('click', () => {
  speech.unlock();
  sound.unlock();
  speech.configure({ rate: S().rate, voiceName: S().voiceName });
  sound.preload(Object.keys(LETTERS).map(soundClip));
  goHome();
  const name = S().name;
  speech.speak(name ? `Hi ${name}! Let's learn!` : "Hi! Let's learn!", 'Pick numbers, or letters.');
});

// ---------------- home ----------------
function starsHTML(done, total) {
  let s = '';
  for (let i = 0; i < total; i++) s += `<i class="${i < done ? 'on' : ''}">★</i>`;
  return s;
}

function trackFinishedToday(track) {
  const t = store.today(track);
  return t.done >= S().perDay;
}

function renderHome() {
  const st = S();
  $('#greeting').textContent = st.name ? `Hi ${st.name}!` : "Let's learn!";
  $('#streak').textContent = `🔥 ${store.streak()}`;
  $('#sticker-count').textContent = st.stickers.length;
  for (const track of ['math', 'read']) {
    const t = store.today(track);
    const done = Math.min(t.done, st.perDay);
    $(`#stars-${track}`).innerHTML = starsHTML(done, st.perDay);
    $(`#card-${track}`).classList.toggle('finished', trackFinishedToday(track));
  }
}

for (const track of ['math', 'read']) {
  $(`#card-${track}`).addEventListener('click', () => {
    sound.pop();
    if (trackFinishedToday(track) && !S().extraPractice) {
      speech.speak(`You finished ${TRACK_NAMES[track]} today!`, 'Great work! Come back tomorrow for more.');
      $(`#card-${track}`).classList.add('wiggle');
      setTimeout(() => $(`#card-${track}`).classList.remove('wiggle'), 600);
      return;
    }
    startSession(track);
  });
}

$('#btn-stickers').addEventListener('click', () => {
  sound.pop();
  const grid = $('#sticker-grid');
  grid.innerHTML = '';
  const list = S().stickers;
  if (!list.length) grid.append(h('div', { class: 'empty' }, '🌱'));
  list.forEach((s, i) => grid.append(h('div', { class: 'sticker', style: { animationDelay: `${Math.min(i, 30) * 30}ms` } }, s)));
  show('stickers');
  speech.speak(list.length ? `You have ${list.length} sticker${list.length === 1 ? '' : 's'}!` : 'Finish your games to get stickers!');
});

// Parent gate: press and hold the gear for 2 seconds.
(() => {
  const btn = $('#btn-parent');
  let timer = null;
  const start = e => {
    e.preventDefault();
    btn.classList.add('holding');
    timer = setTimeout(() => { btn.classList.remove('holding'); openParent(); }, 2000);
  };
  const cancel = () => { clearTimeout(timer); btn.classList.remove('holding'); };
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', cancel);
  btn.addEventListener('pointerleave', cancel);
  btn.addEventListener('pointercancel', cancel);
  btn.addEventListener('contextmenu', e => e.preventDefault());
  btn.addEventListener('click', () => {
    const hint = $('#parent-hint');
    hint.classList.add('show');
    setTimeout(() => hint.classList.remove('show'), 2000);
  });
})();

// ---------------- session ----------------
function buildQuestions(track, count) {
  const levels = CURRICULA[track];
  const level = S().tracks[track].level;
  // Mostly the current level, with ~30% review from the previous few levels mixed in.
  const reviewCount = level === 0 ? 0 : Math.min(3, Math.round(count * 0.3));
  const reviewSlots = new Set(shuffle([...Array(count).keys()]).slice(0, reviewCount));
  return [...Array(count).keys()].map(i => {
    const review = reviewSlots.has(i);
    const lv = review ? level - 1 - Math.floor(Math.random() * Math.min(level, 3)) : level;
    return { level: lv, current: !review, make: () => levels[lv].gen() };
  });
}

/**
 * Swap 2–3 questions a day for a writing activity (trace a word / count and write).
 * The day's number is picked once and remembered, so stopping and coming back doesn't add more.
 */
function addWriting(track, plan, extraRound) {
  const t = store.today(track);
  if (!t.writeTarget) { t.writeTarget = 2 + Math.floor(Math.random() * 2); store.save(); }
  const left = extraRound ? 0 : Math.max(0, t.writeTarget - (t.writes || 0));
  const n = Math.min(left, Math.max(0, plan.length - 1));
  if (!n) return plan;
  // Spread them out: one in each part of the round, never as the very first question.
  const level = S().tracks[track].level;
  const size = (plan.length - 1) / n;
  for (let k = 0; k < n; k++) {
    const i = 1 + Math.floor(k * size + Math.random() * size);
    plan[Math.min(i, plan.length - 1)] = { level, current: false, writing: true, make: () => WRITERS[track](level) };
  }
  return plan;
}

function startSession(track) {
  resetFresh(); // no picture, object or word repeats within this round
  const st = S();
  const t = store.today(track);
  const finished = t.done >= st.perDay;
  const remaining = finished ? st.perDay : st.perDay - t.done;
  session = {
    track,
    extra: finished,
    plan: addWriting(track, buildQuestions(track, remaining), finished),
    idx: 0,
    total: st.perDay,
    offset: finished ? 0 : t.done,
    correctFirst: 0,
    leveledUp: false,
    lastKey: null,
  };
  const level = st.tracks[track].level;
  if (!st.tracks[track].lessonSeen[level]) runLesson(track, level).then(ok => { if (ok) nextQuestion(); });
  else nextQuestion();
}

// ---------------- lesson ----------------
function runLesson(track, level) {
  return new Promise(resolve => {
    const slides = CURRICULA[track][level].lesson();
    let i = 0;
    let ctx = null;
    const stage = $('#lesson-stage');
    const next = $('#lesson-next');
    const replay = $('#lesson-replay');
    const mySession = session;
    let playId = 0;

    const play = async () => {
      const id = ++playId;
      next.classList.remove('ready');
      await speech.speak(slides[i].say(ctx));
      if (session === mySession && id === playId) next.classList.add('ready');
    };
    const render = () => {
      stage.innerHTML = '';
      const inner = h('div', { class: 'lesson-inner fade-in' });
      stage.append(inner);
      ctx = slides[i].render(inner);
      play();
    };
    next.onclick = () => {
      if (session !== mySession) return;
      sound.pop();
      i++;
      if (i >= slides.length) {
        S().tracks[track].lessonSeen[level] = true;
        store.save();
        speech.speak("Let's play!");
        resolve(true);
        return;
      }
      render();
    };
    replay.onclick = () => { sound.pop(); render(); };
    show('lesson');
    render();
  });
}

// ---------------- questions ----------------
function renderProgress() {
  const p = $('#progress');
  const done = session.offset + session.idx;
  p.innerHTML = starsHTML(done, session.total);
}

function nextQuestion() {
  if (!session) return;
  if (session.idx >= session.plan.length) return finishSession();
  const slot = session.plan[session.idx];
  let q = slot.make();
  for (let tries = 0; tries < 6 && q.key === session.lastKey; tries++) q = slot.make();
  session.lastKey = q.key;
  session.q = q;
  session.slot = slot;
  session.firstTry = true;
  session.locked = false;

  renderProgress();
  const stage = $('#play-stage');
  stage.innerHTML = '';
  const inner = h('div', { class: 'stage-inner fade-in' });
  stage.append(inner);

  const choices = $('#choices');
  choices.innerHTML = '';
  choices.className = `choices ${q.choices?.[0]?.cls || ''}`;
  // Interactive questions (tracing, spelling) drive themselves through this api.
  const s = session;
  const api = {
    choicesEl: choices,
    success: () => { if (session === s && !s.locked) onCorrect(s, null); },
    miss: () => { if (session === s) { s.firstTry = false; sound.wrong(); } },
  };
  q.render(inner, api);

  for (const c of q.choices || []) {
    const b = h('button', { class: `choice ${c.cls || ''}`, html: c.html });
    b.addEventListener('click', () => answer(c, b));
    choices.append(b);
  }
  show('play');
  speech.speak(promptOf(q));
}

const promptOf = q => (typeof q.prompt === 'function' ? q.prompt() : q.prompt);

$('#play-replay').addEventListener('click', () => {
  if (!session?.q) return;
  sound.pop();
  speech.speak(promptOf(session.q));
});

async function answer(choice, btn) {
  const s = session;
  if (!s || s.locked || btn.disabled) return;
  const q = s.q;
  if (choice.value === q.answer) {
    onCorrect(s, btn);
  } else {
    s.firstTry = false;
    btn.classList.add('nope');
    btn.disabled = true;
    sound.wrong();
    await speech.speak(pick(['Oops!', 'Not quite.', 'Try again!']), q.wrong(choice.value));
  }
}

async function onCorrect(s, btn) {
  const q = s.q;
  s.locked = true;
  {
    btn?.classList.add('yes');
    sound.correct();
    if (s.firstTry) s.correctFirst++;
    // Tracing is handwriting practice, so it doesn't count towards moving up a level.
    if (s.slot.current && !s.extra && !q.noScore) {
      if (store.recordResult(s.track, s.firstTry, CURRICULA[s.track].length - 1)) s.leveledUp = true;
    }
    if (!s.extra) {
      const t = store.today(s.track);
      t.done++;
      if (s.firstTry && !q.noScore) t.correct++;
      if (q.writing) t.writes = (t.writes || 0) + 1;
    }
    store.save();
    s.idx++;
    renderProgress();
    const star = $('#progress').children[s.offset + s.idx - 1];
    star?.classList.add('pop');
    const t0 = Date.now();
    await speech.speak(pick(PRAISE), q.right());
    if (session !== s) return;
    const wait = Math.max(0, 900 - (Date.now() - t0));
    setTimeout(() => { if (session === s) nextQuestion(); }, wait);
  }
}

// ---------------- reward ----------------
function finishSession() {
  const s = session;
  const st = S();
  const sticker = pick(STICKERS);
  if (!s.extra) {
    store.today(s.track).rounds = (store.today(s.track).rounds || 0) + 1;
  }
  st.stickers.push(sticker);
  store.save();

  $('#reward-sticker').textContent = sticker;
  $('#reward-stars').innerHTML = starsHTML(s.total, s.total);
  $('#reward-note').textContent = s.leveledUp ? `✨ Next time: something new! ✨` : '';
  show('reward');
  sound.fanfare();
  confetti();
  const other = s.track === 'math' ? 'read' : 'math';
  const otherLeft = !trackFinishedToday(other);
  speech.speak(
    'You did it!', 'You got a new sticker!',
    s.leveledUp ? 'You learned so much! Next time, I will teach you something new.' : null,
    otherLeft ? (other === 'read' ? 'Do you want to play letters too?' : 'Do you want to play numbers too?') : 'See you tomorrow!',
  );
}

function confetti() {
  const c = $('#confetti');
  c.innerHTML = '';
  const bits = ['🎉', '⭐', '🎊', '✨', '🌟', '🎈'];
  for (let i = 0; i < 28; i++) {
    const b = h('span', { class: 'bit' }, pick(bits));
    b.style.left = `${Math.random() * 100}%`;
    b.style.animationDelay = `${Math.random() * 1.2}s`;
    b.style.animationDuration = `${2.2 + Math.random() * 1.6}s`;
    b.style.fontSize = `${24 + Math.random() * 30}px`;
    c.append(b);
  }
  setTimeout(() => { c.innerHTML = ''; }, 5000);
}

// ---------------- parent area ----------------
function openParent() {
  speech.stop();
  const st = S();
  const body = $('#parent-body');
  body.innerHTML = '';

  const section = (title, ...kids) => h('div', { class: 'p-card' }, h('h3', {}, title), ...kids);

  // Today + recent history
  const days = Object.keys(st.days).sort().reverse().slice(0, 14);
  const table = h('table', { class: 'p-table' },
    h('tr', {}, h('th', {}, 'Day'), h('th', {}, 'Numbers'), h('th', {}, 'Letters')),
    ...days.map(d => {
      const cell = t => {
        const x = st.days[d][t];
        return x ? `${x.correct}/${x.done} first try` : '—';
      };
      return h('tr', {}, h('td', {}, d), h('td', {}, cell('math')), h('td', {}, cell('read')));
    }));

  const levelPicker = track => {
    const levels = CURRICULA[track];
    const t = st.tracks[track];
    const sel = h('select', {
      onchange: e => { store.setLevel(track, Number(e.target.value)); openParent(); },
    }, ...levels.map((l, i) => {
      const o = h('option', { value: i }, `${i + 1}. ${l.name}`);
      if (i === t.level) o.selected = true;
      return o;
    }));
    const recent = t.history.length ? `${t.history.reduce((a, b) => a + b, 0)}/${t.history.length} right on first try at this level` : 'No answers at this level yet';
    return h('div', { class: 'p-row' }, h('label', {}, TRACK_NAMES[track]), sel, h('div', { class: 'p-sub' }, recent));
  };

  const nameInput = h('input', { type: 'text', value: st.name, placeholder: "Child's name", maxlength: 20 });
  nameInput.addEventListener('change', () => { st.name = nameInput.value.trim(); store.save(); });

  const perDay = h('select', { onchange: e => { st.perDay = Number(e.target.value); store.save(); } },
    ...[5, 8, 10, 12, 15].map(n => { const o = h('option', { value: n }, `${n} questions`); if (n === st.perDay) o.selected = true; return o; }));

  const extra = h('input', { type: 'checkbox' });
  extra.checked = st.extraPractice;
  extra.addEventListener('change', () => { st.extraPractice = extra.checked; store.save(); });

  const rate = h('input', { type: 'range', min: 0.6, max: 1.1, step: 0.05, value: st.rate });
  rate.addEventListener('change', () => { st.rate = Number(rate.value); store.save(); speech.configure({ rate: st.rate }); speech.speak('This is how fast I talk.'); });

  // Best-sounding voices first; robotic novelty voices are left out.
  const voices = speech.englishVoices().filter(v => speech.voiceScore(v) > -100).sort((a, b) => speech.voiceScore(b) - speech.voiceScore(a));
  const voiceSel = h('select', {
    onchange: e => { st.voiceName = e.target.value || null; store.save(); speech.configure({ voiceName: st.voiceName }); speech.speak('Hi! I am Ollie the owl. This is how I sound.'); },
  }, h('option', { value: '' }, 'Automatic'), ...voices.map(v => {
    const o = h('option', { value: v.name }, `${v.name} (${v.lang})`);
    if (v.name === st.voiceName) o.selected = true;
    return o;
  }));

  body.append(
    section('Progress', levelPicker('math'), levelPicker('read'),
      h('p', { class: 'p-note' }, 'Levels go up automatically after 8 of the last 10 answers are right on the first try. Changing a level here replays its lesson.')),
    section('Last 14 days', table),
    section('Settings',
      h('div', { class: 'p-row' }, h('label', {}, 'Name'), nameInput),
      h('div', { class: 'p-row' }, h('label', {}, 'Daily amount'), perDay),
      h('div', { class: 'p-row' }, h('label', {}, 'Allow extra rounds after finishing'), extra),
      h('div', { class: 'p-row' }, h('label', {}, 'Voice speed'), rate),
      h('div', { class: 'p-row' }, h('label', {}, 'Voice'), voiceSel),
      h('p', { class: 'p-note' }, `Current voice: ${speech.currentVoiceName() || 'none found'}.`),
      speech.currentVoiceIsBasic()
        ? h('p', { class: 'p-tip' }, '💡 For a warm, natural teacher voice: on the iPad open Settings → Accessibility → Read & Speak (or Spoken Content) → Voices → English, and download "Ava (Premium)" or "Zoe (Premium)". Then come back here and pick it. It works offline once downloaded.')
        : null,
      h('div', { class: 'p-row' }, h('label', {}, 'Letter sounds'),
        h('button', { class: 'p-btn', onclick: async e => {
          const out = e.target.nextElementSibling;
          out.textContent = 'Playing s, a, t…';
          for (const l of ['s', 'a', 't']) { await sound.playClip(soundClip(l)); await new Promise(r => setTimeout(r, 300)); }
          out.textContent = sound.lastClipMethod().startsWith('failed')
            ? `Couldn't play sounds (${sound.lastClipMethod()}). Check the iPad volume.`
            : `Played with ${sound.lastClipMethod()}. You should hear "sss", "a" (as in ant), "t".`;
        } }, '▶ Test'), h('span', { class: 'p-sub' }, ''))),
    section('About', h('p', { class: 'p-note' }, `Version ${APP_VERSION}`)),
    section('Reset',
      h('button', { class: 'p-danger', onclick: () => { if (confirm('Erase all progress and stickers?')) { store.reset(); openParent(); } } }, 'Erase all progress')),
  );
  show('parent');
}

// ---------------- offline support ----------------
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Stop iOS double-tap zoom / long-press callouts inside the game.
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());

// Re-render home when coming back to the app on a new day.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && $('#screen-home').classList.contains('active')) renderHome();
});
