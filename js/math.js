// Math curriculum: counting -> number shapes -> adding -> taking away.
// Each level has a teaching lesson (shown once, when the level starts) and a question generator.
import { h, rand, pick, pickN, numberChoices, dotsHTML, countGroup, Counter, equation, focusOn, glow, traceBoard } from './ui.js';
import * as speech from './speech.js';
import { qPattern, qShapeFind, qShapeThing, qQuickLook, patternSlide, shapesSlide, shapeThingsSlide, quickLookSlide } from './explore.js';

const THINGS = [
  { e: '🍎', one: 'apple', many: 'apples' },
  { e: '🐥', one: 'chick', many: 'chicks' },
  { e: '⭐', one: 'star', many: 'stars' },
  { e: '🐟', one: 'fish', many: 'fish' },
  { e: '🦋', one: 'butterfly', many: 'butterflies' },
  { e: '🐞', one: 'ladybug', many: 'ladybugs' },
  { e: '🍓', one: 'strawberry', many: 'strawberries' },
  { e: '🚗', one: 'car', many: 'cars' },
  { e: '🎈', one: 'balloon', many: 'balloons' },
  { e: '🐶', one: 'puppy', many: 'puppies' },
  { e: '🌸', one: 'flower', many: 'flowers' },
  { e: '🍪', one: 'cookie', many: 'cookies' },
  { e: '🐸', one: 'frog', many: 'frogs' },
  { e: '🦆', one: 'duck', many: 'ducks' },
  { e: '🍌', one: 'banana', many: 'bananas' },
  { e: '🧁', one: 'cupcake', many: 'cupcakes' },
];
const AWAY = [
  { e: '🐦', one: 'bird', many: 'birds', go1: 'flies away', goN: 'fly away' },
  { e: '🐟', one: 'fish', many: 'fish', go1: 'swims away', goN: 'swim away' },
  { e: '🍪', one: 'cookie', many: 'cookies', go1: 'gets eaten', goN: 'get eaten' },
  { e: '🐸', one: 'frog', many: 'frogs', go1: 'hops away', goN: 'hop away' },
  { e: '🎈', one: 'balloon', many: 'balloons', go1: 'pops', goN: 'pop' },
  { e: '🐰', one: 'bunny', many: 'bunnies', go1: 'hops away', goN: 'hop away' },
  { e: '🐞', one: 'ladybug', many: 'ladybugs', go1: 'flies away', goN: 'fly away' },
];
const noun = (t, n) => (n === 1 ? t.one : t.many);

// ---------- answer buttons ----------
function numChoices(answer, lo, hi, withDots) {
  return numberChoices(answer, lo, hi).map(v => ({
    value: v,
    html: `<span class="num">${v}</span>${withDots ? dotsHTML(v) : ''}`,
  }));
}

// ---------- scenes reused by lessons and questions ----------
function addScene(a, b, t) {
  const size = a + b <= 6 ? 'lg' : 'md';
  const gA = countGroup(a, t.e, size);
  const gB = countGroup(b, t.e, size);
  const eq = equation(a, '+', b);
  const el = h('div', { class: 'scene' },
    h('div', { class: 'add-row' }, gA.el, h('div', { class: 'big-op' }, '+'), gB.el), eq.el);
  return { el, gA, gB, eq, counter: new Counter([...gA.objs, ...gB.objs]) };
}

function subScene(a, b, t) {
  const g = countGroup(a, t.e, a > 5 ? 'md' : 'lg');
  const keep = g.objs.slice(0, a - b);
  const gone = g.objs.slice(a - b);
  const eq = equation(a, '−', b);
  const el = h('div', { class: 'scene' }, g.el, eq.el);
  return {
    el, g, eq, counter: new Counter(keep),
    markGone: () => gone.forEach((o, i) => setTimeout(() => o.classList.add('gone'), i * 150)),
  };
}

function numberCards(from, to, withDots = true) {
  const cards = [];
  const el = h('div', { class: 'num-cards' });
  for (let i = from; i <= to; i++) {
    const c = h('div', { class: 'num-card', html: `<span class="num">${i}</span>${withDots ? dotsHTML(i) : ''}` });
    cards.push(c);
    el.append(c);
  }
  return { el, cards };
}

const mascot = (text) => h('div', { class: 'mascot-wrap' }, h('div', { class: 'mascot bob' }, '🦉'), text ? h('div', { class: 'mascot-text' }, text) : null);

// ---------- question generators ----------
function qCount(lo, hi, withDots) {
  const n = rand(lo, hi);
  const t = pick(THINGS);
  let counter;
  return {
    key: `count${n}${t.e}`,
    prompt: [`How many ${t.many}?`, 'Touch each one to count.'],
    render(stage) {
      const g = countGroup(n, t.e);
      counter = new Counter(g.objs);
      stage.append(h('div', { class: 'scene' }, g.el));
    },
    choices: numChoices(n, 1, Math.max(hi, 3), withDots),
    answer: n,
    wrong: v => [`That's ${v}.`, "Let's count together!", counter.autoParts(), { pause: 200 }, `${n}!`],
    right: () => [`${n} ${noun(t, n)}!`],
  };
}

function qFind(lo, hi) {
  const n = rand(lo, hi);
  return {
    key: `find${n}`,
    prompt: [`Find the number ${n}.`],
    render(stage) { stage.append(mascot('?')); },
    choices: numChoices(n, lo, hi, false),
    answer: n,
    wrong: v => [`That's ${v}.`, `Find ${n}.`],
    right: () => [`That's ${n}!`],
  };
}

function qMatch(lo, hi) {
  const n = rand(lo, hi);
  const t = pick(THINGS);
  return {
    key: `match${n}`,
    prompt: [`This is ${n}.`, `Which one has ${n}?`],
    render(stage) {
      stage.append(h('div', { class: 'scene' }, h('div', { class: 'giant-num' }, n)));
    },
    choices: numberChoices(n, Math.max(1, lo - 1), hi).map(v => ({
      value: v,
      cls: 'group-choice',
      html: `<span class="mini" style="--cols:${Math.min(v, 5)}">${`<i>${t.e}</i>`.repeat(v)}</span>`,
    })),
    answer: n,
    wrong: v => [`That one has ${v}.`, `Find ${n}.`],
    right: () => [`${n} ${noun(t, n)}!`],
  };
}

function qAdd(maxSum) {
  const a = rand(1, maxSum - 1);
  const b = rand(1, Math.min(maxSum - a, 5));
  const t = pick(THINGS);
  let s;
  return {
    key: `add${a}${b}`,
    prompt: [
      () => s && focusOn([s.gA.el, s.gB.el], s.gA.el)(), `${a} ${noun(t, a)}.`,
      () => s && focusOn([s.gA.el, s.gB.el], s.gB.el)(), `And ${b} more.`,
      () => s && focusOn([s.gA.el, s.gB.el], null)(), `How many ${t.many} altogether?`,
    ],
    render(stage) { s = addScene(a, b, t); stage.append(s.el); },
    choices: numChoices(a + b, 1, maxSum, false),
    answer: a + b,
    wrong: v => [`That's ${v}.`, "Let's count them all!", s.counter.autoParts(), { pause: 200 }, `${a} plus ${b} is ${a + b}.`],
    right: () => [() => s.eq.reveal(a + b), `${a} plus ${b} equals ${a + b}!`],
  };
}

function qSub(max) {
  const a = rand(2, max);
  const b = rand(1, Math.min(a - 1, 5));
  const t = pick(AWAY);
  let s;
  return {
    key: `sub${a}${b}`,
    prompt: [`There are ${a} ${noun(t, a)}.`, () => s && s.markGone(), `${b} ${b === 1 ? t.go1 : t.goN}.`, 'How many are left?'],
    render(stage) { s = subScene(a, b, t); stage.append(s.el); },
    choices: numChoices(a - b, 1, max, false),
    answer: a - b,
    wrong: v => [`That's ${v}.`, "Let's count the ones that are left!", s.counter.autoParts(), { pause: 200 }, `${a} take away ${b} is ${a - b}.`],
    right: () => [() => s.eq.reveal(a - b), `${a} minus ${b} equals ${a - b}!`],
  };
}

// What comes next? 1, 2, 3, _
function qNext(lo, hi) {
  const shown = rand(2, 3);
  const start = rand(lo, hi - shown);
  const seq = Array.from({ length: shown }, (_, k) => start + k);
  const ans = start + shown;
  let nc;
  return {
    key: `next${start}`,
    prompt: [...seq.map((n, k) => [() => nc && focusOn(nc.cards, nc.cards[k])(), `${n}`]), () => nc && focusOn(nc.cards, null)(), 'What comes next?'],
    render(stage) {
      const cards = [...seq.map(n => h('div', { class: 'num-card' }, h('span', { class: 'num' }, n))), h('div', { class: 'num-card mystery' }, h('span', { class: 'num' }, '?'))];
      nc = { cards };
      stage.append(h('div', { class: 'num-cards' }, cards));
    },
    choices: numChoices(ans, Math.max(1, lo), hi, false),
    answer: ans,
    wrong: v => [`That's ${v}.`, "Let's count.", ...seq.map(n => `${n}`), 'What comes next?'],
    right: () => [() => { const m = nc.cards[nc.cards.length - 1]; m.firstChild.textContent = ans; m.classList.add('glow'); }, ...seq.map(n => `${n}`), `${ans}!`],
  };
}

// Which group has more (or fewer)?
function qMore(max, allowFewer) {
  const fewer = allowFewer && Math.random() < 0.4;
  const t = pick(THINGS);
  const minGap = max <= 5 ? 2 : 1;
  let a, b;
  do { a = rand(1, max); b = rand(1, max); } while (Math.abs(a - b) < minGap);
  const ans = fewer ? Math.min(a, b) : Math.max(a, b);
  const word = fewer ? 'fewer' : 'more';
  return {
    key: `more${a}${b}${word}`,
    prompt: [`Which side has ${word} ${t.many}?`],
    render(stage) { stage.append(mascot(fewer ? '🤏' : '🙌')); },
    choices: [a, b].map(v => ({
      value: v,
      cls: 'group-choice more-choice',
      html: `<span class="mini" style="--cols:${Math.min(v, 5)}">${`<i>${t.e}</i>`.repeat(v)}</span>`,
    })),
    answer: ans,
    wrong: v => [`That side has ${v}.`, `The other side has ${v === a ? b : a}.`, `${ans} is ${word}!`],
    right: () => [`Yes! ${ans} is ${word} than ${ans === a ? b : a}!`],
  };
}

// Trace a number with a finger (handwriting practice; doesn't count towards levelling up).
function qTrace(lo, hi) {
  const n = rand(lo, hi);
  return {
    key: `trace${n}`,
    noScore: true,
    prompt: [`This is ${n}.`, `Trace ${n} with your finger.`, 'Follow the grey line.'],
    render(stage, api) {
      const board = traceBoard(String(n), {
        onDone: () => api.success(),
        onMessy: () => speech.speak('Try to stay on the grey line. You can do it!'),
      });
      stage.append(board.el);
    },
    right: () => [`You wrote ${n}!`],
  };
}

// ---------- lessons ----------
const countSlide = (n, t, intro) => ({
  render(stage) {
    const g = countGroup(n, t.e);
    const c = new Counter(g.objs);
    stage.append(h('div', { class: 'scene' }, g.el));
    return c;
  },
  say: c => [intro, c.autoParts(), { pause: 250 }, `${n} ${noun(t, n)}!`],
});

const numeralsSlide = (from, to, intro, withDots = true, outro) => ({
  render(stage) { const nc = numberCards(from, to, withDots); stage.append(nc.el); return nc; },
  say: nc => [intro, ...nc.cards.flatMap((c, i) => [focusOn(nc.cards, c), `${from + i}`]), focusOn(nc.cards, null), outro],
});

const tryItSlide = (n, t, text) => ({
  render(stage) {
    const g = countGroup(n, t.e);
    new Counter(g.objs);
    stage.append(mascot(), h('div', { class: 'scene' }, g.el));
  },
  say: () => [text],
});

const addLessonSlides = (a, b, t, first) => [{
  render(stage) { const s = addScene(a, b, t); stage.append(s.el); return s; },
  say: s => [
    first ? "Let's put things together!" : "Let's add!",
    focusOn([s.gA.el, s.gB.el], s.gA.el), `${a} ${noun(t, a)}.`,
    focusOn([s.gA.el, s.gB.el], s.gB.el), `And ${b} more.`,
    focusOn([s.gA.el, s.gB.el], null), 'Put them together and count them all.',
    s.counter.autoParts(), { pause: 200 },
    () => s.eq.reveal(a + b), glow(s.eq.el),
    first ? 'This little cross means plus. Plus means put together.' : null,
    `${a} plus ${b} equals ${a + b}!`,
  ],
}];

const subLessonSlides = (a, b, t, first) => [{
  render(stage) { const s = subScene(a, b, t); stage.append(s.el); return s; },
  say: s => [
    first ? "Now let's learn to take away!" : "Let's take away!",
    `There are ${a} ${noun(t, a)}.`, () => s.markGone(), { pause: 400 },
    `${b} ${b === 1 ? t.go1 : t.goN}.`,
    "Let's count the ones that are left.",
    s.counter.autoParts(), { pause: 200 },
    () => s.eq.reveal(a - b), glow(s.eq.el),
    first ? 'This little line means minus. Minus means take away.' : null,
    `${a} minus ${b} equals ${a - b}!`,
  ],
}];

const T = e => THINGS.find(t => t.e === e);
const A = e => AWAY.find(t => t.e === e);

const compareSlide = (a, b, t, fewer) => ({
  render(stage) {
    const gA = countGroup(a, t.e, 'md'), gB = countGroup(b, t.e, 'md');
    stage.append(h('div', { class: 'scene' }, h('div', { class: 'add-row compare-row' }, gA.el, h('div', { class: 'big-op' }, 'or'), gB.el)));
    return { gA, gB };
  },
  say: ({ gA, gB }) => [
    fewer ? 'Fewer means not as many.' : "Let's see which side has more!",
    focusOn([gA.el, gB.el], gA.el), `This side has ${a}.`,
    focusOn([gA.el, gB.el], gB.el), `This side has ${b}.`,
    focusOn([gA.el, gB.el], (fewer ? a < b : a > b) ? gA.el : gB.el),
    fewer ? `${Math.min(a, b)} is fewer than ${Math.max(a, b)}.` : `${Math.max(a, b)} is more than ${Math.min(a, b)}!`,
  ],
});

const nextSlide = {
  render(stage) { const nc = numberCards(1, 5, false); stage.append(nc.el); return nc; },
  say: nc => ['Numbers always go in the same order.', ...nc.cards.flatMap((c, k) => [focusOn(nc.cards, c), `${k + 1}`]), focusOn(nc.cards, null),
    'What comes after 3?', { pause: 500 }, focusOn(nc.cards, nc.cards[3]), '4!'],
};

const traceSlide = {
  render(stage) { stage.append(h('div', { class: 'scene' }, h('div', { class: 'giant-num trace-demo' }, '2'))); },
  say: () => ['You can draw numbers too!', 'When you see a grey number, trace it with your finger.', 'Start at the top and follow the line.'],
};

/** Pick a game: [[weight, () => question], ...] */
const mix = (...games) => () => {
  let r = Math.random() * games.reduce((a, g) => a + g[0], 0);
  for (const [w, g] of games) { if ((r -= w) < 0) return g(); }
  return games[0][1]();
};

/** A variety question that doesn't count towards levelling up (keeps adding levels fresh). */
const bonus = make => () => Object.assign(make(), { noScore: true });

export const LEVELS = [
  {
    name: 'Counting 1–3',
    gen: mix([7, () => qCount(1, 3, true)], [3, () => qShapeFind('basic')]),
    lesson: () => [
      { render(s) { s.append(mascot('1 2 3')); }, say: () => ["Hi! I'm Ollie the owl.", "Let's learn to count!"] },
      countSlide(3, T('⭐'), 'When we count, we touch each one and say a number.'),
      numeralsSlide(1, 3, 'Numbers have shapes. Look!', true, 'One, two, three!'),
      shapesSlide,
      tryItSlide(3, T('🍎'), 'Your turn! Touch each apple and count. Then tap the arrow.'),
    ],
  },
  {
    name: 'Counting to 5',
    gen: mix([4, () => qCount(1, 5, true)], [2, () => qMore(5, false)], [2, () => qPattern('easy')], [2, () => qQuickLook(3)], [1, () => qShapeFind('basic')]),
    lesson: () => [
      countSlide(5, T('🐥'), "Let's count to five!"),
      numeralsSlide(1, 5, 'Here are the numbers one to five.', true, 'One, two, three, four, five!'),
      compareSlide(2, 5, T('🍎'), false),
      patternSlide,
      quickLookSlide,
      tryItSlide(4, T('🐸'), 'Your turn! Count the frogs. Touch each one.'),
    ],
  },
  {
    name: 'Number shapes 1–5',
    gen: mix([2, () => qCount(1, 5, false)], [2, () => qFind(1, 5)], [2, () => qMatch(1, 5)], [2, () => qNext(1, 5)], [2, () => qTrace(1, 5)], [2, () => qQuickLook(4)], [1, () => qShapeFind('more')], [1, () => qPattern('easy')]),
    lesson: () => [
      numeralsSlide(1, 5, "Let's learn the shapes of numbers. Look and listen.", false, 'Can you say them with me? One, two, three, four, five!'),
      {
        render(s) { const nc = numberCards(1, 5, false); s.append(mascot(), nc.el); return nc; },
        say: nc => ['I will say a number. You find its shape!', 'Where is three?', { pause: 500 }, focusOn(nc.cards, nc.cards[2]), 'Here it is! Three!',
          'Where is five?', { pause: 500 }, focusOn(nc.cards, nc.cards[4]), 'Here it is! Five!'],
      },
      nextSlide,
      traceSlide,
    ],
  },
  {
    name: 'Counting to 10',
    gen: mix([4, () => qCount(4, 10, false)], [2, () => qMore(10, true)], [2, () => qNext(1, 10)], [2, () => qPattern('medium')], [2, () => qShapeThing()], [1, () => qQuickLook(5)]),
    lesson: () => [
      countSlide(10, T('🍓'), "Let's count all the way to ten!"),
      numeralsSlide(1, 10, 'Here are the numbers one to ten.', false, 'Ten! Great counting!'),
      compareSlide(6, 3, T('🐟'), true),
      shapeThingsSlide,
      tryItSlide(7, T('🦆'), 'Your turn! Count the ducks.'),
    ],
  },
  {
    name: 'Number shapes 1–10',
    gen: mix([2, () => qFind(1, 10)], [2, () => qMatch(4, 10)], [2, () => qCount(6, 10, false)], [2, () => qNext(1, 10)], [2, () => qTrace(1, 10)], [2, () => qQuickLook(6)], [1, () => qPattern('hard')], [1, () => qShapeFind('all')]),
    lesson: () => [
      numeralsSlide(6, 10, 'Here are some bigger numbers.', true, 'Six, seven, eight, nine, ten!'),
      {
        render(s) { const nc = numberCards(1, 10, false); s.append(nc.el); return nc; },
        say: nc => ['Ten has two parts. A one, and a zero.', focusOn(nc.cards, nc.cards[9]), 'Ten!'],
      },
    ],
  },
  {
    name: 'Adding to 5',
    gen: mix([9, () => qAdd(5)], [1, bonus(() => qPattern('hard'))], [1, bonus(() => qQuickLook(6))], [1, bonus(qShapeThing)]),
    lesson: () => [...addLessonSlides(2, 1, T('🍎'), true), ...addLessonSlides(1, 3, T('🦆'), false)],
  },
  {
    name: 'Taking away within 5',
    gen: mix([9, () => qSub(5)], [1, bonus(() => qPattern('hard'))], [1, bonus(() => qQuickLook(6))], [1, bonus(qShapeThing)]),
    lesson: () => [...subLessonSlides(4, 1, A('🐦'), true), ...subLessonSlides(5, 2, A('🎈'), false)],
  },
  {
    name: 'Adding to 10',
    gen: mix([9, () => qAdd(10)], [1, bonus(() => qPattern('hard'))], [1, bonus(() => qQuickLook(6))], [1, bonus(qShapeThing)]),
    lesson: () => [...addLessonSlides(4, 3, T('🐞'), false), ...addLessonSlides(5, 5, T('⭐'), false)],
  },
  {
    name: 'Taking away within 10',
    gen: mix([9, () => qSub(10)], [1, bonus(() => qPattern('hard'))], [1, bonus(() => qQuickLook(6))], [1, bonus(qShapeThing)]),
    lesson: () => [...subLessonSlides(7, 2, A('🐰'), false), ...subLessonSlides(9, 4, A('🍪'), false)],
  },
  {
    name: 'Plus and minus to 10',
    gen: mix([5, () => qAdd(10)], [5, () => qSub(10)], [1, bonus(() => qPattern('hard'))], [1, bonus(() => qQuickLook(6))], [1, bonus(qShapeThing)]),
    lesson: () => [{
      render(s) { s.append(h('div', { class: 'scene' }, h('div', { class: 'op-pair' }, h('span', {}, '+'), h('span', {}, '−')))); },
      say: () => ['Now plus and minus are mixed together!', 'Plus means put together.', 'Minus means take away.', 'Listen carefully!'],
    }],
  },
];
