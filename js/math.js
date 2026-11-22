// Math curriculum for a child who can already count a little:
// counting 10–30 -> teen numbers and ten-frames -> adding/taking away (single digits, at least one 4–9) -> to 20.
// Each level has a teaching lesson (shown once, when the level starts) and a question generator.
import { h, rand, pick, numberChoices, countGroup, Counter, equation, focusOn, glow, traceBoard, fresh, shuffle, drawPad, colorPicker, doneButton } from './ui.js';
import * as speech from './speech.js';
import { qPattern, qShapeFind, qShapeThing, patternSlide, shapesSlide, shapeThingsSlide } from './explore.js';

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
  { e: '🐝', one: 'bee', many: 'bees' },
  { e: '🍩', one: 'donut', many: 'donuts' },
  { e: '🐢', one: 'turtle', many: 'turtles' },
  { e: '🍒', one: 'cherry', many: 'cherries' },
  { e: '🐧', one: 'penguin', many: 'penguins' },
  { e: '🥕', one: 'carrot', many: 'carrots' },
];
const AWAY = [
  { e: '🐦', one: 'bird', many: 'birds', go1: 'flies away', goN: 'fly away' },
  { e: '🐟', one: 'fish', many: 'fish', go1: 'swims away', goN: 'swim away' },
  { e: '🍪', one: 'cookie', many: 'cookies', go1: 'gets eaten', goN: 'get eaten' },
  { e: '🐸', one: 'frog', many: 'frogs', go1: 'hops away', goN: 'hop away' },
  { e: '🎈', one: 'balloon', many: 'balloons', go1: 'pops', goN: 'pop' },
  { e: '🐰', one: 'bunny', many: 'bunnies', go1: 'hops away', goN: 'hop away' },
  { e: '🐞', one: 'ladybug', many: 'ladybugs', go1: 'flies away', goN: 'fly away' },
  { e: '🦋', one: 'butterfly', many: 'butterflies', go1: 'flies away', goN: 'fly away' },
  { e: '🍓', one: 'strawberry', many: 'strawberries', go1: 'gets eaten', goN: 'get eaten' },
  { e: '🐝', one: 'bee', many: 'bees', go1: 'buzzes away', goN: 'buzz away' },
  { e: '🐭', one: 'mouse', many: 'mice', go1: 'runs away', goN: 'run away' },
];
const noun = (t, n) => (n === 1 ? t.one : t.many);
const thing = () => fresh(THINGS, t => t.e);
const awayThing = () => fresh(AWAY, t => t.e);

// ---------- helpers ----------
const numChoices = (answer, lo, hi) => numberChoices(answer, lo, hi).map(v => ({ value: v, html: `<span class="num">${v}</span>` }));

/** Two numbers for a sum/difference where at least one is between 4 and 9 (no "1 + 2" baby sums). */
function addPair(maxSum, minA = 1) {
  const minSum = maxSum > 10 ? 11 : 5; // "adding to 20" means answers past ten
  for (;;) {
    const a = rand(minA, maxSum - 1);
    const b = rand(1, Math.min(9, maxSum - a));
    if (a + b >= minSum && ((a >= 4 && a <= 9) || (b >= 4 && b <= 9))) return [a, b];
  }
}

/** Objects in rows of ten (with a gap after five) for big counts, rows of five for small ones. */
function bigGroup(n, emoji, size) {
  if (n < 10) return countGroup(n, emoji, size || (n <= 5 ? 'lg' : 'md'));
  const g = countGroup(n, emoji, size || (n <= 20 ? 'md' : 'sm'), 10);
  g.el.classList.add('tens');
  return g;
}

// ---------- scenes reused by lessons and questions ----------
function addScene(a, b, t) {
  const big = a + b > 10;
  // Two rows of objects need the smaller size to leave room for the sum underneath.
  const size = big ? 'sm' : a > 5 || b > 5 ? 'md' : 'lg';
  const gA = big && a >= 10 ? bigGroup(a, t.e, 'sm') : countGroup(a, t.e, size);
  const gB = countGroup(b, t.e, size);
  const eq = equation(a, '+', b);
  const el = h('div', { class: 'scene' },
    h('div', { class: 'add-row' }, gA.el, h('div', { class: 'big-op' }, '+'), gB.el), eq.el);
  return { el, gA, gB, eq, counter: new Counter([...gA.objs, ...gB.objs]) };
}

function subScene(a, b, t) {
  const g = a > 10 ? bigGroup(a, t.e, 'sm') : countGroup(a, t.e, a > 6 ? 'md' : 'lg');
  const keep = g.objs.slice(0, a - b);
  const gone = g.objs.slice(a - b);
  const eq = equation(a, '−', b);
  const el = h('div', { class: 'scene' }, g.el, eq.el);
  return {
    el, g, eq, counter: new Counter(keep),
    markGone: () => gone.forEach((o, i) => setTimeout(() => o.classList.add('gone'), i * 120)),
  };
}

function numberCards(nums) {
  const cards = nums.map(n => h('div', { class: 'num-card' }, h('span', { class: 'num' }, n)));
  return { el: h('div', { class: 'num-cards' }, cards), cards };
}

/** Ten-frames: boxes of 10 (2 rows of 5) filled with dots. */
function tenFrames(n) {
  const frames = [];
  const dots = [];
  for (let start = 0; start < Math.max(n, 1); start += 10) {
    const cells = [];
    for (let k = 0; k < 10; k++) {
      const filled = start + k < n;
      const cell = h('span', { class: `tf-cell ${filled ? 'on' : ''}` });
      if (filled) dots.push(cell);
      cells.push(cell);
    }
    frames.push(h('div', { class: 'ten-frame' }, cells));
  }
  return { el: h('div', { class: 'ten-frames' }, frames), frames, dots };
}

const mascot = (text) => h('div', { class: 'mascot-wrap' }, h('div', { class: 'mascot bob' }, '🦉'), text ? h('div', { class: 'mascot-text' }, text) : null);

/** Say the count of a ten-frame display: "10, 20, 21, 22". */
function tensCountParts(tf, n) {
  const parts = [];
  const full = Math.floor(n / 10);
  for (let f = 0; f < full; f++) parts.push(focusOn(tf.frames, tf.frames[f]), `${(f + 1) * 10}`);
  for (let k = full * 10; k < n; k++) parts.push(focusOn(tf.dots, tf.dots[k]), `${k + 1}`);
  parts.push(focusOn([...tf.frames, ...tf.dots], null));
  return parts;
}

// ---------- question generators ----------
function qCount(lo, hi) {
  const n = rand(lo, hi);
  const t = thing();
  let counter;
  return {
    key: `count${n}`,
    prompt: [`How many ${t.many}?`, 'Touch each one to count.'],
    render(stage) {
      const g = bigGroup(n, t.e);
      counter = new Counter(g.objs);
      stage.append(h('div', { class: 'scene' }, g.el));
    },
    choices: numChoices(n, Math.max(1, lo - 2), hi + 2),
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
    // Teen numbers are easy to mix up with their flipped twin (13 / 31), so offer it when it fits.
    choices: (() => {
      const flip = Number(String(n).split('').reverse().join(''));
      const base = numberChoices(n, lo, hi);
      if (n > 10 && flip !== n && flip >= lo && flip <= hi + 20 && !base.includes(flip)) base[base.indexOf(base.find(v => v !== n))] = flip;
      return shuffle(base).map(v => ({ value: v, html: `<span class="num">${v}</span>` }));
    })(),
    answer: n,
    wrong: v => [`That's ${v}.`, `Find ${n}.`],
    right: () => [`That's ${n}!`],
  };
}

// What comes next / before? 17, 18, 19, _   or   _, 15
function qNext(lo, hi, allowBefore) {
  const before = allowBefore && Math.random() < 0.35;
  const shown = before ? 1 : rand(2, 3);
  const start = before ? rand(lo + 1, hi) : rand(lo, hi - shown);
  const seq = Array.from({ length: shown }, (_, k) => start + k);
  const ans = before ? start - 1 : start + shown;
  let nc;
  return {
    key: `next${ans}`,
    prompt: before
      ? [`What comes before ${start}?`]
      : [...seq.map((n, k) => [() => nc && focusOn(nc.cards, nc.cards[k])(), `${n}`]), () => nc && focusOn(nc.cards, null)(), 'What comes next?'],
    render(stage) {
      const q = h('div', { class: 'num-card mystery' }, h('span', { class: 'num' }, '?'));
      const nums = seq.map(n => h('div', { class: 'num-card' }, h('span', { class: 'num' }, n)));
      const cards = before ? [q, ...nums] : [...nums, q];
      nc = { cards, q };
      stage.append(h('div', { class: 'num-cards' }, cards));
    },
    choices: numChoices(ans, Math.max(1, lo - 1), hi),
    answer: ans,
    wrong: v => before
      ? [`That's ${v}.`, "Let's count up.", `${ans - 2}, ${ans - 1}…`, 'What comes before', `${start}?`]
      : [`That's ${v}.`, "Let's count.", ...seq.map(n => `${n}`), 'What comes next?'],
    right: () => [() => { nc.q.firstChild.textContent = ans; nc.q.classList.add('glow'); },
      before ? `${ans}, then ${start}!` : `${[...seq, ans].join(', ')}!`],
  };
}

// Which number is bigger (or smaller)?
function qBigger(lo, hi, allowSmaller) {
  const smaller = allowSmaller && Math.random() < 0.35;
  let a, b;
  do { a = rand(lo, hi); b = rand(lo, hi); } while (a === b);
  const ans = smaller ? Math.min(a, b) : Math.max(a, b);
  const word = smaller ? 'smaller' : 'bigger';
  return {
    key: `big${a}${b}`,
    prompt: [`Which number is ${word}?`, `${a}, or ${b}?`],
    render(stage) { stage.append(mascot(smaller ? '🐭' : '🐘')); },
    choices: [a, b].map(v => ({ value: v, cls: 'big-num-choice', html: `<span class="num">${v}</span>` })),
    answer: ans,
    wrong: v => [`${v} is ${smaller ? 'bigger' : 'smaller'}.`, `When we count, ${Math.min(a, b)} comes first, then ${Math.max(a, b)}.`],
    right: () => [`Yes! ${ans} is ${word} than ${ans === a ? b : a}.`],
  };
}

// Ten-frames: one full frame is ten, so 1 full frame + 4 = 14.
function qTenFrame(lo, hi) {
  const n = rand(lo, hi);
  let tf;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return {
    key: `tf${n}`,
    prompt: ['How many dots?', tens === 1 ? 'A full frame is ten.' : 'Each full frame is ten.'],
    render(stage) { tf = tenFrames(n); stage.append(h('div', { class: 'scene' }, tf.el)); },
    choices: numChoices(n, Math.max(1, lo - 2), hi + 2),
    answer: n,
    wrong: v => [`That's ${v}.`, "Let's count the full frames first.", tensCountParts(tf, n), `${n}!`],
    right: () => [ones ? `${tens * 10} and ${ones} more makes ${n}!` : `${tens} full frames make ${n}!`],
  };
}

function qAdd(maxSum, minA = 1) {
  const [a, b] = addPair(maxSum, minA);
  const t = thing();
  let s;
  return {
    key: `add${a}+${b}`,
    prompt: [
      () => s && focusOn([s.gA.el, s.gB.el], s.gA.el)(), `${a} ${noun(t, a)}.`,
      () => s && focusOn([s.gA.el, s.gB.el], s.gB.el)(), `And ${b} more.`,
      () => s && focusOn([s.gA.el, s.gB.el], null)(), `How many ${t.many} altogether?`,
    ],
    render(stage) { s = addScene(a, b, t); stage.append(s.el); },
    choices: numChoices(a + b, 2, maxSum + 2),
    answer: a + b,
    wrong: v => [`That's ${v}.`, `Start at ${a}, and count on ${b} more.`,
      ...s.gB.objs.flatMap((o, k) => [() => { s.counter.mark(o, a + k + 1); }, `${a + k + 1}`]), { pause: 200 }, `${a} plus ${b} is ${a + b}.`],
    right: () => [() => s.eq.reveal(a + b), `${a} plus ${b} equals ${a + b}!`],
  };
}

function qSub(minA, maxA, maxB = 9) {
  let a, b;
  // At least one number between 4 and 9; with teen numbers, take away at least 2.
  do { a = rand(minA, maxA); b = rand(1, Math.min(a - 1, maxB)); }
  while (maxA <= 10 ? !((a >= 4 && a <= 9) || (b >= 4 && b <= 9)) : b < 2);
  const t = awayThing();
  let s;
  return {
    key: `sub${a}-${b}`,
    prompt: [`There are ${a} ${noun(t, a)}.`, () => s && s.markGone(), `${b} ${b === 1 ? t.go1 : t.goN}.`, 'How many are left?'],
    render(stage) { s = subScene(a, b, t); stage.append(s.el); },
    choices: numChoices(a - b, 1, maxA),
    answer: a - b,
    wrong: v => [`That's ${v}.`, "Let's count the ones that are left!", s.counter.autoParts(), { pause: 200 }, `${a} take away ${b} is ${a - b}.`],
    right: () => [() => s.eq.reveal(a - b), `${a} minus ${b} equals ${a - b}!`],
  };
}

// Trace a number with a finger (handwriting practice; doesn't count towards levelling up).
function qTrace(lo, hi) {
  const n = rand(lo, hi);
  return {
    key: `trace${n}`,
    noScore: true,
    prompt: [`This is ${n}.`, `Trace ${n} with your finger.`, 'Follow the grey line.'],
    writing: true,
    render(stage, api) {
      const board = traceBoard(String(n), {
        onDone: () => api.success(),
        onMessy: () => speech.speak('Try to stay on the grey line. You can do it!'),
      });
      stage.append(h('div', { class: 'write-scene' }, colorPicker(c => board.setColor(c)), board.el));
    },
    right: () => [`You wrote ${n}!`],
  };
}

// ---------- lessons ----------
const countSlide = (n, t, intro) => ({
  render(stage) {
    const g = bigGroup(n, t.e);
    const c = new Counter(g.objs);
    stage.append(h('div', { class: 'scene' }, g.el));
    return c;
  },
  say: c => [intro, c.autoParts(), { pause: 250 }, `${n} ${noun(t, n)}!`],
});

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);

const numeralsSlide = (nums, intro, outro) => ({
  render(stage) { const nc = numberCards(nums); stage.append(nc.el); return nc; },
  say: nc => [intro, ...nc.cards.flatMap((c, i) => [focusOn(nc.cards, c), `${nums[i]}`]), focusOn(nc.cards, null), outro],
});

const tryItSlide = (n, t, text) => ({
  render(stage) {
    const g = bigGroup(n, t.e);
    new Counter(g.objs);
    stage.append(h('div', { class: 'scene' }, g.el));
  },
  say: () => [text],
});

const tenFrameSlide = (n, intro) => ({
  render(stage) { const tf = tenFrames(n); stage.append(h('div', { class: 'scene' }, tf.el)); return tf; },
  say: tf => [intro, tensCountParts(tf, n), `${n}!`],
});

const addLessonSlides = (a, b, t, first) => [{
  render(stage) { const s = addScene(a, b, t); stage.append(s.el); return s; },
  say: s => [
    first ? "Let's put things together!" : "Let's add!",
    focusOn([s.gA.el, s.gB.el], s.gA.el), `${a} ${noun(t, a)}.`,
    focusOn([s.gA.el, s.gB.el], s.gB.el), `And ${b} more.`,
    focusOn([s.gA.el, s.gB.el], null),
    first ? 'Put them together and count them all.' : `Start at ${a}, and count on.`,
    first ? s.counter.autoParts() : s.gB.objs.flatMap((o, k) => [() => s.counter.mark(o, a + k + 1), `${a + k + 1}`]),
    { pause: 200 },
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

const biggerSlide = {
  render(stage) { const nc = numberCards([14, 19]); stage.append(nc.el); return nc; },
  say: nc => ['Which number is bigger? 14, or 19?', 'When we count, 14 comes first. 19 comes later.',
    focusOn(nc.cards, nc.cards[1]), 'So 19 is bigger!'],
};

const beforeAfterSlide = {
  render(stage) { const nc = numberCards([15, 16, 17]); stage.append(nc.el); return nc; },
  say: nc => [focusOn(nc.cards, nc.cards[1]), 'This is 16.', focusOn(nc.cards, nc.cards[0]), '15 comes before 16.',
    focusOn(nc.cards, nc.cards[2]), '17 comes after 16.', focusOn(nc.cards, null)],
};

const traceSlide = {
  render(stage) { stage.append(h('div', { class: 'scene' }, h('div', { class: 'giant-num trace-demo' }, '12'))); },
  say: () => ['You can write numbers too!', 'When you see a grey number, trace it with your finger.', 'Start at the top and follow the line.'],
};

/** Pick a game: [[weight, () => question], ...] */
const mix = (...games) => () => {
  let r = Math.random() * games.reduce((a, g) => a + g[0], 0);
  for (const [w, g] of games) { if ((r -= w) < 0) return g(); }
  return games[0][1]();
};

/** A variety question that doesn't count towards levelling up. */
const bonus = make => () => Object.assign(make(), { noScore: true });
const EXTRAS = [[1, bonus(() => qPattern('hard'))], [1, bonus(qShapeThing)]];

export const LEVELS = [
  {
    name: 'Counting 10–20',
    gen: mix([5, () => qCount(10, 20)], [2, () => qFind(10, 20)], [2, () => qNext(10, 20, false)], [1, bonus(() => qPattern('easy'))], [1, bonus(() => qShapeFind('basic'))]),
    lesson: () => [
      { render(s) { s.append(mascot('10 20 30')); }, say: () => ["Hi! I'm Ollie the owl.", 'You can already count!', "Let's count big numbers."] },
      countSlide(12, T('⭐'), 'Touch each one and say a number. Ten in a row, then more.'),
      numeralsSlide(range(10, 20), 'Here are the numbers from ten to twenty.', 'Twenty!'),
      patternSlide,
      shapesSlide,
      tryItSlide(13, T('🍎'), 'Your turn! Touch each apple and count. Then tap the arrow.'),
    ],
  },
  {
    name: 'Teen numbers and ten-frames',
    gen: mix([3, () => qTenFrame(11, 19)], [2, () => qNext(10, 20, true)], [2, () => qBigger(10, 20, false)], [2, () => qFind(10, 20)], [1, () => qCount(10, 20)], [1, bonus(() => qPattern('medium'))]),
    lesson: () => [
      tenFrameSlide(10, 'This is a ten-frame. When it is full, it holds ten.'),
      tenFrameSlide(14, 'One full frame is ten. Then we count on.'),
      beforeAfterSlide,
      biggerSlide,
      traceSlide,
    ],
  },
  {
    name: 'Counting to 30',
    gen: mix([3, () => qCount(15, 30)], [2, () => qTenFrame(11, 30)], [2, () => qNext(10, 30, true)], [2, () => qBigger(10, 30, true)], [2, () => qFind(10, 30)], [1, bonus(qShapeThing)]),
    lesson: () => [
      tenFrameSlide(30, "Let's count by tens! Each full frame is ten."),
      numeralsSlide(range(20, 30), 'Here are the numbers from twenty to thirty.', 'Thirty!'),
      shapeThingsSlide,
      tryItSlide(22, T('🐝'), 'Your turn! Count the bees.'),
    ],
  },
  {
    name: 'Adding within 10',
    gen: mix([9, () => qAdd(10)], ...EXTRAS),
    lesson: () => [...addLessonSlides(5, 3, T('🍎'), true), ...addLessonSlides(6, 2, T('🦆'), false)],
  },
  {
    name: 'Taking away within 10',
    gen: mix([9, () => qSub(5, 10)], ...EXTRAS),
    lesson: () => [...subLessonSlides(7, 2, A('🐦'), true), ...subLessonSlides(9, 4, A('🎈'), false)],
  },
  {
    name: 'Adding to 20',
    gen: mix([9, () => qAdd(20, 4)], ...EXTRAS),
    lesson: () => [...addLessonSlides(10, 4, T('⭐'), false), ...addLessonSlides(8, 5, T('🐞'), false)],
  },
  {
    name: 'Taking away within 20',
    gen: mix([9, () => qSub(11, 20, 9)], ...EXTRAS),
    lesson: () => [...subLessonSlides(15, 5, A('🐰'), false), ...subLessonSlides(13, 4, A('🍪'), false)],
  },
  {
    name: 'Plus and minus to 20',
    gen: mix([5, () => qAdd(20, 4)], [5, () => qSub(11, 20, 9)], ...EXTRAS),
    lesson: () => [{
      render(s) { s.append(h('div', { class: 'scene' }, h('div', { class: 'op-pair' }, h('span', {}, '+'), h('span', {}, '−')))); },
      say: () => ['Now plus and minus are mixed together!', 'Plus means put together.', 'Minus means take away.', 'Listen carefully!'],
    }],
  },
];

// ---------- writing: count and write (2–3 a day, never marked right or wrong) ----------
/** Count the objects, then write the number freehand. Ollie then shows the number so she can compare. */
function qCountWrite(lo, hi) {
  const n = rand(lo, hi);
  const t = thing();
  let answerEl, counter;
  return {
    key: `cw${n}`,
    writing: true,
    noScore: true,
    prompt: [`How many ${t.many}?`, 'Count them, then write the number.'],
    render(stage, api) {
      const g = bigGroup(n, t.e, n > 10 ? 'sm' : 'md');
      counter = new Counter(g.objs);
      const done = doneButton(() => api.success());
      const pad = drawPad({ onInk: done.ready, cls: 'number-pad' });
      answerEl = h('div', { class: 'write-answer' }, n);
      pad.el.append(answerEl); // shown in the pad's corner once she taps ✓
      stage.append(h('div', { class: 'write-scene count-write' },
        h('div', { class: 'cw-left' }, g.el),
        h('div', { class: 'cw-right' }, colorPicker(c => pad.setColor(c)), pad.el)));
      api.choicesEl.append(done.el);
    },
    right: () => [() => answerEl.classList.add('shown'), `There are ${n} ${noun(t, n)}!`, `${n} looks like this. Does yours look the same?`],
  };
}

/** One of the day's writing activities, matched to her level. */
export function writingQuestion(level) {
  const [lo, hi] = level >= 2 ? [12, 30] : [10, 20];
  return Math.random() < 0.65 ? qCountWrite(lo, hi) : qTrace(lo, hi);
}
