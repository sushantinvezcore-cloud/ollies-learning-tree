// Extra number-sense games: patterns, shapes and "quick look" (seeing how many without counting).
import { h, rand, pick, pickN, shuffle, numberChoices, focusOn } from './ui.js';

const mascot = text => h('div', { class: 'mascot-wrap' }, h('div', { class: 'mascot bob' }, '🦉'), text ? h('div', { class: 'mascot-text' }, text) : null);

// ======================= PATTERNS =======================
const PATTERN_ITEMS = [
  ['🍎', 'apple'], ['🍌', 'banana'], ['⭐', 'star'], ['🌙', 'moon'], ['🐶', 'dog'], ['🐱', 'cat'],
  ['🔴', 'red'], ['🔵', 'blue'], ['🟡', 'yellow'], ['🌸', 'flower'], ['🍓', 'strawberry'], ['🚗', 'car'],
  ['🐟', 'fish'], ['🎈', 'balloon'], ['🦋', 'butterfly'], ['☀️', 'sun'],
];
// A = first item, B = second, C = third
const UNITS = { easy: ['AB'], medium: ['AB', 'AAB', 'ABB'], hard: ['AAB', 'ABB', 'ABC', 'AABB'] };

export function qPattern(level) {
  const unitStr = pick(UNITS[level]);
  const letters = [...new Set(unitStr)];
  const items = pickN(PATTERN_ITEMS, letters.length + 1);
  const map = Object.fromEntries(letters.map((l, k) => [l, items[k]]));
  const unit = [...unitStr].map(l => map[l]);
  // At least one and a half repeats, but never more than 7 items so it fits on one row.
  const shown = Math.min(7, unit.length * 2 + rand(0, unit.length - 1));
  const seq = Array.from({ length: shown }, (_, k) => unit[k % unit.length]);
  const ans = unit[shown % unit.length];
  const options = shuffle([...letters.map(l => map[l]), items[letters.length]]).slice(0, 3);
  if (!options.includes(ans)) options[0] = ans;
  let cells;
  return {
    key: `pat${unitStr}${ans[1]}`,
    prompt: [...seq.map((it, k) => [() => cells && focusOn(cells, cells[k])(), { text: it[1], rate: 1.05 }]),
      () => cells && focusOn(cells, cells[cells.length - 1])(), 'What comes next?'],
    render(stage) {
      cells = [...seq.map(it => h('div', { class: 'pat-cell' }, it[0])), h('div', { class: 'pat-cell mystery' }, '?')];
      stage.append(h('div', { class: 'pattern', style: { '--n': cells.length } }, cells));
    },
    choices: shuffle(options).map(it => ({ value: it[1], cls: 'pic-choice', html: `<span class="pic">${it[0]}</span>` })),
    answer: ans[1],
    wrong: v => [`Not ${v}.`, "Let's say it together.", ...seq.map((it, k) => [focusOn(cells, cells[k]), { text: it[1], rate: 1.05 }]), focusOn(cells, null), 'What comes next?'],
    right: () => [() => { const m = cells[cells.length - 1]; m.textContent = ans[0]; m.classList.add('glow'); }, ...unit.map(it => it[1]), 'You found the pattern!'],
  };
}

export const patternSlide = {
  render(stage) {
    const unit = [['🍎', 'apple'], ['🍌', 'banana']];
    const cells = Array.from({ length: 6 }, (_, k) => h('div', { class: 'pat-cell' }, unit[k % 2][0]));
    stage.append(h('div', { class: 'pattern' }, cells));
    return cells;
  },
  say: cells => ['A pattern is something that repeats, again and again.',
    ...cells.flatMap((c, k) => [focusOn(cells, c), k % 2 ? 'banana' : 'apple']), focusOn(cells, null),
    'Apple, banana, apple, banana. What comes next?', { pause: 500 }, 'Apple!'],
};

// ======================= SHAPES =======================
const SHAPES = {
  circle: '<circle cx="50" cy="50" r="42"/>',
  square: '<rect x="10" y="10" width="80" height="80" rx="4"/>',
  triangle: '<polygon points="50,8 93,88 7,88" stroke-linejoin="round"/>',
  rectangle: '<rect x="4" y="24" width="92" height="52" rx="4"/>',
  star: '<polygon points="50,5 61,38 96,38 68,59 79,93 50,72 21,93 32,59 4,38 39,38"/>',
  heart: '<path d="M50 88 C 20 65, 4 48, 4 30 C 4 14, 18 5, 30 5 C 40 5, 47 11, 50 18 C 53 11, 60 5, 70 5 C 82 5, 96 14, 96 30 C 96 48, 80 65, 50 88 Z"/>',
  oval: '<ellipse cx="50" cy="50" rx="46" ry="30"/>',
  diamond: '<polygon points="50,4 92,50 50,96 8,50"/>',
};
const SHAPE_SETS = { basic: ['circle', 'square', 'triangle'], more: ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart'], all: Object.keys(SHAPES) };
const COLORS = ['#ff6b6b', '#4dabf7', '#ffd43b', '#51cf66', '#cc5de8', '#ff922b'];

export function shapeSVG(name, color = pick(COLORS), cls = '') {
  return `<svg class="shape ${cls}" viewBox="0 0 100 100" aria-label="${name}" style="fill:${color}">${SHAPES[name]}</svg>`;
}

// Things around us and the shape they look like.
const SHAPE_THINGS = [
  ['🍕', 'pizza slice', 'triangle'], ['🧀', 'cheese', 'triangle'], ['⛺', 'tent', 'triangle'],
  ['🍪', 'cookie', 'circle'], ['🕐', 'clock', 'circle'], ['⚽', 'ball', 'circle'], ['🍩', 'donut', 'circle'],
  ['🎲', 'dice', 'square'], ['🎁', 'present', 'square'], ['🖼️', 'picture', 'square'],
  ['🚪', 'door', 'rectangle'], ['📱', 'phone', 'rectangle'], ['📺', 'TV', 'rectangle'],
  ['🥚', 'egg', 'oval'], ['🪁', 'kite', 'diamond'],
];

/** "Find the triangle" — choices are coloured shapes. */
export function qShapeFind(set) {
  const names = SHAPE_SETS[set];
  const target = pick(names);
  const options = shuffle([target, ...pickN(names, 2, n => n === target)]);
  return {
    key: `shf${target}`,
    prompt: [`Find the ${target}.`],
    render(stage) { stage.append(mascot('◯ △ ▢')); },
    choices: options.map(n => ({ value: n, cls: 'shape-choice', html: shapeSVG(n) })),
    answer: target,
    wrong: v => [`That's a ${v}.`, `Find the ${target}.`],
    right: () => [`That's a ${target}!`],
  };
}

/** "What shape is the pizza slice?" — spotting shapes in real things. */
export function qShapeThing() {
  const [emoji, thing, shape] = pick(SHAPE_THINGS);
  const others = pickN(Object.keys(SHAPES), 2, n => n === shape || (shape === 'square' && n === 'rectangle') || (shape === 'rectangle' && n === 'square') || (shape === 'circle' && n === 'oval') || (shape === 'oval' && n === 'circle'));
  const options = shuffle([shape, ...others]);
  return {
    key: `sht${thing}`,
    prompt: [`What shape is the ${thing}?`, { pause: 150 }, options.join(', ') + '?'],
    render(stage) { stage.append(h('div', { class: 'scene' }, h('div', { class: 'giant-pic bob' }, emoji))); },
    choices: options.map(n => ({ value: n, cls: 'shape-choice', html: shapeSVG(n) })),
    answer: shape,
    wrong: v => [`That's a ${v}.`, `Look at the ${thing} again.`],
    right: () => [`The ${thing} is a ${shape}!`],
  };
}

export const shapesSlide = {
  render(stage) {
    const cards = SHAPE_SETS.basic.map((n, k) => h('div', { class: 'num-card shape-card', html: shapeSVG(n, COLORS[k]) }));
    stage.append(h('div', { class: 'num-cards' }, cards));
    return cards;
  },
  say: cards => ["Let's learn some shapes!",
    focusOn(cards, cards[0]), 'This is a circle. It is round, like a ball.',
    focusOn(cards, cards[1]), 'This is a square. It has four sides, all the same.',
    focusOn(cards, cards[2]), 'This is a triangle. It has three sides, like a slice of pizza.',
    focusOn(cards, null), 'Circle, square, triangle!'],
};

export const shapeThingsSlide = {
  render(stage) {
    const rows = [['🍕', 'triangle'], ['🕐', 'circle'], ['🚪', 'rectangle']].map(([e, n], k) =>
      h('div', { class: 'num-card shape-card' }, h('span', { class: 'pic' }, e), h('span', { html: shapeSVG(n, COLORS[k], 'small') })));
    stage.append(h('div', { class: 'num-cards' }, rows));
    return rows;
  },
  say: rows => ['Shapes are all around us!',
    focusOn(rows, rows[0]), 'A pizza slice is a triangle.',
    focusOn(rows, rows[1]), 'A clock is a circle.',
    focusOn(rows, rows[2]), 'A door is a rectangle. A rectangle is a long square.',
    focusOn(rows, null), 'Can you find shapes in your room?'],
};

// ======================= QUICK LOOK =======================
// Dice-style layouts on a 3x3 grid, so she learns to "see" small numbers instantly.
const LAYOUTS = {
  1: [[4]],
  2: [[0, 8], [2, 6], [3, 5]],
  3: [[0, 4, 8], [2, 4, 6]],
  4: [[0, 2, 6, 8]],
  5: [[0, 2, 4, 6, 8]],
  6: [[0, 2, 3, 5, 6, 8], [0, 1, 2, 6, 7, 8]],
};
const DOT_COLORS = ['#ff6b6b', '#4dabf7', '#cc5de8', '#ff922b', '#20c997'];

function diceCard(n) {
  const layout = pick(LAYOUTS[n]);
  const color = pick(DOT_COLORS);
  const cells = Array.from({ length: 9 }, (_, k) => h('span', { class: layout.includes(k) ? 'pip' : 'nopip', style: { background: layout.includes(k) ? color : 'transparent' } }));
  return { el: h('div', { class: 'dice' }, cells), pips: cells.filter((_, k) => layout.includes(k)) };
}

export function qQuickLook(max) {
  const n = rand(1, max);
  let card, cover;
  const showFor = ms => [() => { cover.classList.add('hide'); }, { pause: ms }, () => { cover.classList.remove('hide'); }];
  return {
    key: `ql${n}`,
    prompt: ['Quick look! How many dots?', ...showFor(max <= 4 ? 1500 : 1200)],
    render(stage) {
      card = diceCard(n);
      cover = h('div', { class: 'dice-cover' }, '👀');
      stage.append(h('div', { class: 'scene' }, h('div', { class: 'dice-wrap' }, card.el, cover)));
    },
    choices: numberChoices(n, 1, Math.max(max, 3)).map(v => ({ value: v, html: `<span class="num">${v}</span>` })),
    answer: n,
    wrong: v => [`That's ${v}.`, "Let's look again.", () => cover.classList.add('hide'),
      ...card.pips.flatMap((p, k) => [focusOn(card.pips, p), `${k + 1}`]), focusOn(card.pips, null), `${n} dots.`],
    right: () => [() => cover.classList.add('hide'), `${n}!`, n > 1 ? 'You saw it so fast!' : 'Just one!'],
  };
}

export const quickLookSlide = {
  render(stage) {
    const card = diceCard(4);
    stage.append(h('div', { class: 'scene' }, h('div', { class: 'dice-wrap' }, card.el)));
    return card;
  },
  say: card => ["Here's a fast game!", 'Some numbers we can see without counting.',
    'Like this. Four dots, one in each corner.', ...card.pips.flatMap((p, k) => [focusOn(card.pips, p), `${k + 1}`]), focusOn(card.pips, null),
    'The dots will hide quickly, so look carefully!'],
};
