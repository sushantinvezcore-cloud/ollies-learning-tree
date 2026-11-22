// Reading curriculum (phonics-first):
// letter sounds (in the classic s-a-t-p-i-n order) -> sounding out 3-letter words -> sight words -> sentences.
import { h, pick, pickN, shuffle, focusOn, glow, fresh, freshN, isUsed, drawPad, colorPicker, doneButton } from './ui.js';
import * as speech from './speech.js';
import { FILL_WORDS, blankable } from './words.js';

// `sound` is a spelling used only if the recorded clip in audio/sounds/ can't play.
export const LETTERS = {
  s: { name: 'ess', sound: 'sss', word: 'sun', pic: '☀️' },
  a: { name: 'ay', sound: 'aah', word: 'ant', pic: '🐜' },
  t: { name: 'tee', sound: 'tuh', word: 'tiger', pic: '🐯' },
  p: { name: 'pee', sound: 'puh', word: 'pig', pic: '🐷' },
  i: { name: 'eye', sound: 'ih', word: 'insect', pic: '🦗' },
  n: { name: 'en', sound: 'nnn', word: 'nose', pic: '👃' },
  m: { name: 'em', sound: 'mmm', word: 'monkey', pic: '🐒' },
  d: { name: 'dee', sound: 'duh', word: 'dog', pic: '🐶' },
  g: { name: 'jee', sound: 'guh', word: 'goat', pic: '🐐' },
  o: { name: 'oh', sound: 'aw', word: 'octopus', pic: '🐙' },
  c: { name: 'see', sound: 'kuh', word: 'cat', pic: '🐱' },
  k: { name: 'kay', sound: 'kuh', word: 'kite', pic: '🪁' },
  e: { name: 'ee', sound: 'eh', word: 'egg', pic: '🥚' },
  u: { name: 'you', sound: 'uh', word: 'umbrella', pic: '☂️' },
  r: { name: 'ar', sound: 'rrr', word: 'rabbit', pic: '🐰' },
  h: { name: 'aitch', sound: 'huh', word: 'hat', pic: '🎩' },
  b: { name: 'bee', sound: 'buh', word: 'bus', pic: '🚌' },
  f: { name: 'eff', sound: 'fff', word: 'fish', pic: '🐟' },
  l: { name: 'el', sound: 'lll', word: 'lion', pic: '🦁' },
  j: { name: 'jay', sound: 'juh', word: 'juice', pic: '🧃' },
  v: { name: 'vee', sound: 'vvv', word: 'van', pic: '🚐' },
  w: { name: 'double you', sound: 'wuh', word: 'whale', pic: '🐳' },
  y: { name: 'why', sound: 'yuh', word: 'yo-yo', pic: '🪀' },
  z: { name: 'zee', sound: 'zzz', word: 'zebra', pic: '🦓' },
  x: { name: 'ex', sound: 'ks', word: 'fox', pic: '🦊', ends: true },
  q: { name: 'cue', sound: 'kwuh', word: 'queen', pic: '👸' },
};
// c and k make the same sound, so never offer both as competing answers.
const soundOf = l => (l === 'c' || l === 'k' ? 'k' : l);

// Pictures by first sound. Plenty per letter so a round never shows the same picture twice.
const PICS = {
  s: [['sun', '☀️'], ['sock', '🧦'], ['snake', '🐍'], ['star', '⭐'], ['seal', '🦭'], ['sandwich', '🥪']],
  a: [['ant', '🐜'], ['apple', '🍎'], ['alligator', '🐊'], ['axe', '🪓'], ['astronaut', '🧑‍🚀'], ['acrobat', '🤸']],
  t: [['tiger', '🐯'], ['tomato', '🍅'], ['tent', '⛺'], ['turtle', '🐢'], ['tooth', '🦷'], ['train', '🚆']],
  p: [['pig', '🐷'], ['pizza', '🍕'], ['penguin', '🐧'], ['pear', '🍐'], ['pumpkin', '🎃'], ['panda', '🐼']],
  i: [['insect', '🦗'], ['infant', '👶'], ['injection', '💉'], ['ill', '🤒']],
  n: [['nose', '👃'], ['nut', '🥜'], ['net', '🥅'], ['nest', '🪺'], ['noodles', '🍜'], ['nine', '9️⃣']],
  m: [['monkey', '🐒'], ['moon', '🌙'], ['mouse', '🐭'], ['milk', '🥛'], ['mushroom', '🍄'], ['map', '🗺️']],
  d: [['dog', '🐶'], ['duck', '🦆'], ['drum', '🥁'], ['door', '🚪'], ['dinosaur', '🦕'], ['dolphin', '🐬']],
  g: [['goat', '🐐'], ['gift', '🎁'], ['grapes', '🍇'], ['guitar', '🎸'], ['gorilla', '🦍'], ['ghost', '👻']],
  o: [['octopus', '🐙'], ['ox', '🐂'], ['otter', '🦦'], ['olive', '🫒']],
  c: [['cat', '🐱'], ['cake', '🎂'], ['car', '🚗'], ['cow', '🐮'], ['carrot', '🥕'], ['camel', '🐫']],
  k: [['kite', '🪁'], ['king', '🤴'], ['key', '🔑'], ['koala', '🐨'], ['kangaroo', '🦘'], ['kiwi', '🥝']],
  e: [['egg', '🥚'], ['elephant', '🐘'], ['elf', '🧝'], ['envelope', '✉️']],
  u: [['umbrella', '☂️'], ['up', '⬆️'], ['upside down', '🙃']],
  r: [['rabbit', '🐰'], ['rainbow', '🌈'], ['robot', '🤖'], ['rocket', '🚀'], ['ring', '💍'], ['rose', '🌹']],
  h: [['hat', '🎩'], ['horse', '🐴'], ['house', '🏠'], ['heart', '❤️'], ['hamburger', '🍔'], ['hedgehog', '🦔']],
  b: [['bus', '🚌'], ['bear', '🐻'], ['banana', '🍌'], ['bee', '🐝'], ['ball', '⚽'], ['bird', '🐦']],
  f: [['fish', '🐟'], ['frog', '🐸'], ['fire', '🔥'], ['foot', '🦶'], ['flower', '🌸'], ['fork', '🍴']],
  l: [['lion', '🦁'], ['leaf', '🍃'], ['lemon', '🍋'], ['lips', '👄'], ['lollipop', '🍭'], ['ladybug', '🐞']],
  j: [['juice', '🧃'], ['jeans', '👖'], ['jellyfish', '🪼'], ['jar', '🫙'], ['jeep', '🚙']],
  v: [['van', '🚐'], ['violin', '🎻'], ['volcano', '🌋'], ['vest', '🦺'], ['vase', '🏺']],
  w: [['whale', '🐳'], ['watermelon', '🍉'], ['wolf', '🐺'], ['watch', '⌚'], ['worm', '🪱'], ['web', '🕸️']],
  y: [['yo-yo', '🪀'], ['yarn', '🧶'], ['yawn', '🥱'], ['yellow', '🟡']],
  z: [['zebra', '🦓'], ['zero', '0️⃣'], ['zipper', '🤐']],
  q: [['queen', '👸'], ['question', '❓'], ['quarter', '🪙'], ['quiet', '🤫']],
};
const picKey = p => p[1];
// x is heard at the end of words
const ENDS_WITH_X = [['fox', '🦊'], ['box', '📦'], ['six', '6️⃣']];

// Words with clear pictures. Each one unlocks for reading as soon as she knows all its letters,
// so reading real words starts right after s a t p i n.
const WORDS = [
  ['pan', '🍳'], ['pin', '📌'], ['tap', '🚰'], ['nap', '😴'], ['ant', '🐜'], ['tin', '🥫'], ['sip', '🥤'], ['sit', '🪑'],
  ['map', '🗺️'], ['pig', '🐷'], ['dig', '⛏️'], ['sad', '😢'], ['tag', '🏷️'], ['man', '👨'], ['sand', '🏖️'],
  ['dog', '🐶'], ['cat', '🐱'], ['cap', '🧢'], ['kid', '🧒'], ['mop', '🧹'], ['cop', '👮'], ['can', '🛢️'],
  ['sun', '☀️'], ['nut', '🥜'], ['mug', '☕'], ['rat', '🐀'], ['red', '🔴'], ['ten', '🔟'], ['pen', '🖊️'],
  ['net', '🥅'], ['run', '🏃'], ['drum', '🥁'], ['tent', '⛺'],
  ['hat', '🎩'], ['hen', '🐔'], ['bus', '🚌'], ['bed', '🛏️'], ['bat', '🦇'], ['bug', '🐛'], ['hug', '🤗'],
  ['tub', '🛁'], ['hand', '✋'], ['frog', '🐸'], ['crab', '🦀'],
  ['leg', '🦵'], ['log', '🪵'], ['jet', '✈️'], ['jam', '🍯'], ['van', '🚐'],
  ['web', '🕸️'], ['fox', '🦊'], ['box', '📦'], ['six', '6️⃣'],
];
const PIC = Object.fromEntries(WORDS);
const SHORT = WORDS.filter(([w]) => w.length === 3);
/** Words made only of letters she knows. Four-letter words wait until she knows every letter. */
const decodable = (known, maxLen = 3) => WORDS.filter(([w]) => w.length <= maxLen && [...w].every(l => known.includes(l)));

const RHYMES = [
  ['cat', 'hat', 'bat', 'rat'], ['bug', 'mug', 'hug'], ['hen', 'pen', 'ten'], ['pan', 'man', 'van', 'can'],
  ['pig', 'dig'], ['dog', 'log', 'frog'], ['fox', 'box'], ['bed', 'red'], ['net', 'jet'], ['sun', 'run'],
  ['map', 'cap', 'tap', 'nap'], ['sand', 'hand'],
  ['bee', 'tree', 'key', 'three'], ['goat', 'boat', 'coat'], ['car', 'star', 'jar'], ['sock', 'rock', 'clock'],
  ['cake', 'snake', 'lake'], ['ring', 'king', 'swing'], ['house', 'mouse'], ['snail', 'nail', 'mail'],
  ['moon', 'spoon', 'balloon'], ['bear', 'pear', 'chair'],
];
// Pictures for rhyming words that aren't in the reading list.
Object.assign(PIC, {
  bee: '🐝', tree: '🌳', key: '🔑', three: '3️⃣', goat: '🐐', boat: '⛵', coat: '🧥', car: '🚗', star: '⭐', jar: '🫙',
  sock: '🧦', rock: '🪨', clock: '🕐', cake: '🎂', snake: '🐍', lake: '🏞️', ring: '💍', king: '🤴', swing: '🛝',
  house: '🏠', mouse: '🐭', snail: '🐌', nail: '💅', mail: '📬', moon: '🌙', spoon: '🥄', balloon: '🎈',
  bear: '🐻', pear: '🍐', chair: '🪑',
});

const SIGHT1 = ['I', 'a', 'the', 'see', 'is', 'my'];
const SIGHT2 = ['and', 'go', 'can', 'we', 'like', 'to', 'it', 'in'];

const SENTENCES = [
  w => `I see a ${w}.`,
  w => `I like the ${w}.`,
  w => `It is a ${w}.`,
  w => `We can see a ${w}.`,
  w => `My ${w} is big.`,
];

const GROUPS = [['s', 'a', 't'], ['p', 'i', 'n'], ['m', 'd', 'g'], ['o', 'c', 'k'], ['e', 'u', 'r'], ['h', 'b', 'f'], ['l', 'j', 'v'], ['w', 'y', 'z'], ['x', 'q']];
const lettersUpTo = gi => GROUPS.slice(0, gi + 1).flat();

const isVowel = l => 'aeiou'.includes(l);
// Letter sounds are recorded clips (a real "sssss", not the letter name "ess").
export const soundClip = l => `audio/sounds/${l}.wav`;
const sayLetterSound = (l, rate = 1) => [{ clip: soundClip(l), rate }];

// ---------- small renderers ----------
function letterTile(l, cls = '') {
  return h('button', { class: `letter-tile ${cls}`, onclick: () => speech.speak(sayLetterSound(l)) }, l);
}
function wordTiles(word) {
  const tiles = [...word].map(l => letterTile(l, isVowel(l) ? 'vowel' : ''));
  return { el: h('div', { class: 'word-tiles' }, tiles), tiles };
}
function sentenceEl(text) {
  const words = text.split(' ');
  const spans = words.map(w => h('button', {
    class: 'sent-word',
    onclick: () => speech.speak(w.replace(/[.]/g, '')),
  }, w));
  return { el: h('div', { class: 'sentence' }, spans), spans };
}
const picChoice = ([word, pic], label = false) => ({
  value: word,
  cls: 'pic-choice',
  html: `<span class="pic">${pic}</span>${label ? `<span class="pic-label">${word}</span>` : ''}`,
});
const letterChoice = l => ({ value: l, cls: 'letter-choice', html: `<span class="ltr">${l}</span>` });
const wordChoice = w => ({ value: w, cls: 'word-choice', html: `<span class="wrd">${w}</span>` });
const mascot = text => h('div', { class: 'mascot-wrap' }, h('div', { class: 'mascot bob' }, '🦉'), text ? h('div', { class: 'mascot-text' }, text) : null);

// Pick target letters weighted towards the newest group.
// Letters take turns, so one letter isn't asked again and again.
function pickTarget(gi) {
  const pool = Math.random() < 0.6 || gi === 0 ? GROUPS[gi] : lettersUpTo(gi - 1);
  return fresh(pool, l => `letter:${l}`);
}

// ---------- question generators ----------
function qLetterSound(gi) {
  const l = pickTarget(gi);
  const known = lettersUpTo(gi);
  const others = pickN(known, 2, x => soundOf(x) === soundOf(l));
  const L = LETTERS[l];
  const [word, pic] = fresh(L.ends ? ENDS_WITH_X : PICS[l], picKey);
  const like = L.ends ? `like the end of ${word}` : `like ${word}`;
  return {
    key: `ls${l}`,
    prompt: [`Which letter says`, sayLetterSound(l), `${like}?`],
    render(stage) { stage.append(h('div', { class: 'scene' }, h('div', { class: 'giant-pic bob' }, pic))); },
    choices: shuffle([l, ...others]).map(letterChoice),
    answer: l,
    wrong: v => [`That is the letter ${LETTERS[v].name}.`, `It says`, sayLetterSound(v), `Find`, sayLetterSound(l), `${like}.`],
    right: () => [`The letter ${L.name} says`, sayLetterSound(l), `${word}!`],
  };
}

function qStartsWith(gi) {
  let l = pickTarget(gi);
  if (l === 'x') l = 'q'; // x is heard at the end of words, not the start
  const target = fresh(PICS[l], picKey);
  const distractLetters = pickN(Object.keys(PICS), 2, x => soundOf(x) === soundOf(l) || x === 'x');
  const options = shuffle([target, ...distractLetters.map(x => fresh(PICS[x], picKey))]);
  return {
    key: `sw${l}`,
    prompt: [`Which picture starts with`, sayLetterSound(l), '?', { pause: 200 }, options.map(o => o[0]).join(', ') + '?'],
    render(stage) { stage.append(h('div', { class: 'scene' }, letterTile(l, 'giant'))); },
    choices: options.map(o => picChoice(o, true)),
    answer: target[0],
    wrong: v => [`${v} starts with`, sayLetterSound(v[0]), `Find`, sayLetterSound(l)],
    right: () => [`${target[0]} starts with`, sayLetterSound(l), '!'],
  };
}

function qCase(gi) {
  const l = pickTarget(gi);
  const others = pickN(lettersUpTo(Math.max(gi, 2)), 2, x => x === l);
  return {
    key: `case${l}`,
    prompt: [`This is a little ${LETTERS[l].name}.`, `Find the big ${LETTERS[l].name}.`],
    render(stage) { stage.append(h('div', { class: 'scene' }, letterTile(l, 'giant'))); },
    choices: shuffle([l, ...others]).map(x => ({ value: x, cls: 'letter-choice', html: `<span class="ltr">${x.toUpperCase()}</span>` })),
    answer: l,
    wrong: v => [`That is a big ${LETTERS[v].name}.`, `Find the big ${LETTERS[l].name}.`],
    right: () => [`Big ${LETTERS[l].name}, little ${LETTERS[l].name}!`],
  };
}

function soundOutParts(word, wt) {
  return [...[...word].flatMap((l, i) => [focusOn(wt.tiles, wt.tiles[i]), sayLetterSound(l)]), focusOn(wt.tiles, null)];
}

function qBlend(pool) {
  const target = fresh(pool, picKey);
  const options = shuffle([target, ...freshN(WORDS, 2, picKey, x => x[0] === target[0] || x[1] === target[1])]);
  let wt;
  return {
    key: `bl${target[0]}`,
    prompt: ["Let's sound it out.", ...[...target[0]].flatMap((l, i) => [() => wt && focusOn(wt.tiles, wt.tiles[i])(), sayLetterSound(l)]), () => wt && focusOn(wt.tiles, null)(), 'What word is it?'],
    render(stage) { wt = wordTiles(target[0]); stage.append(h('div', { class: 'scene' }, wt.el, h('div', { class: 'hint-text' }, 'tap the letters'))); },
    choices: options.map(o => picChoice(o, false)),
    answer: target[0],
    wrong: v => [`That's ${v}.`, 'Listen.', ...soundOutParts(target[0], wt), { text: target[0], rate: 0.9 }, '!'],
    right: () => [...soundOutParts(target[0], wt), `${target[0]}!`],
  };
}

function qHearWord(pool) {
  const words = pool.map(c => c[0]);
  const target = fresh(words, w => PIC[w] || w);
  // Distractors that look similar (share a letter in the same place) make kids look at every letter.
  const similar = words.filter(w => w !== target && [...w].some((l, i) => target[i] === l));
  const options = shuffle([target, ...(similar.length >= 2 ? pickN(similar, 2) : pickN(words, 2, w => w === target))]);
  return {
    key: `hw${target}`,
    prompt: [`Find the word`, { text: target, rate: 0.85 }, '.'],
    render(stage) { stage.append(mascot('👂')); },
    choices: options.map(wordChoice),
    answer: target,
    wrong: v => [`That says ${v}.`, ...[...v].map(l => sayLetterSound(l)), `Find`, { text: target, rate: 0.85 }],
    right: () => [`Yes, ${target}!`],
  };
}

function qSight(words) {
  const target = pick(words);
  const options = shuffle([target, ...pickN(words, 2, w => w === target)]);
  return {
    key: `sight${target}`,
    prompt: [`Find the word`, { text: target, rate: 0.85 }, '.'],
    render(stage) { stage.append(mascot('👀')); },
    choices: options.map(wordChoice),
    answer: target,
    wrong: v => [`That says ${v}.`, `Find`, { text: target, rate: 0.85 }],
    right: () => [`Yes! ${target}!`],
  };
}

function qSentence(pool) {
  const target = fresh(pool, picKey);
  const text = pick(SENTENCES)(target[0]);
  const options = shuffle([target, ...freshN(pool, 2, picKey, x => x === target)]);
  let se;
  const readParts = () => [...se.spans.flatMap(s => [focusOn(se.spans, s), s.textContent.replace('.', '')]), focusOn(se.spans, null)];
  return {
    key: `sen${target[0]}`,
    prompt: ['Read the sentence.', 'Tap a word if you need help.', 'Which picture matches?'],
    render(stage) { se = sentenceEl(text); stage.append(h('div', { class: 'scene' }, se.el)); },
    choices: options.map(o => picChoice(o, false)),
    answer: target[0],
    wrong: () => ['Listen.', readParts()],
    right: () => [readParts(), 'Great reading!'],
  };
}

// Rhyming is a listening game, so it works before she knows all the letters.
function qRhyme() {
  // Prefer a family with at least two pictures not seen yet this round.
  const fam = fresh(RHYMES, f => f[0] + '-family', f => f.filter(w => !isUsed(PIC[w])).length < 2);
  const [a, b] = freshN(fam, 2, w => PIC[w]);
  const others = freshN(RHYMES.filter(f => f !== fam).flat(), 2, w => PIC[w]);
  const options = shuffle([b, ...others]);
  return {
    key: `rh${a}`,
    prompt: [{ text: a, rate: 0.85 }, '.', `Which one rhymes with ${a}?`, { pause: 200 }, options.join(', ') + '?'],
    render(stage) {
      stage.append(h('div', { class: 'scene' }, h('div', { class: 'giant-pic bob' }, PIC[a]), h('div', { class: 'pic-caption' }, a)));
    },
    choices: options.map(w => picChoice([w, PIC[w]], true)),
    answer: b,
    wrong: v => [`${v}, ${a}.`, 'They sound different at the end.'],
    right: () => [`${a}, ${b}!`, 'They rhyme!'],
  };
}

// Spell a word: tap the letters in order. Teaches hearing each sound in a word.
function qSpell(pool, known) {
  const [word, pic] = fresh(pool.filter(([w]) => w.length === 3), picKey);
  const letters = [...word];
  const extras = pickN(known, 2, l => letters.includes(l) || l === 'x' || l === 'q');
  let pos = 0;
  return {
    key: `sp${word}`,
    prompt: () => (pos === 0
      ? ["Let's spell", { text: word, rate: 0.85 }, '.', 'What sound do you hear first?']
      : [{ text: word, rate: 0.85 }, '.', 'What sound comes next?']),
    render(stage, api) {
      const slots = letters.map(() => h('div', { class: 'slot' }));
      stage.append(h('div', { class: 'scene' },
        h('button', { class: 'giant-pic spell-pic', onclick: () => speech.speak({ text: word, rate: 0.85 }) }, pic),
        h('div', { class: 'slots' }, slots)));
      api.choicesEl.classList.add('spell');
      for (const l of shuffle([...letters, ...extras])) {
        const b = h('button', { class: 'choice letter-choice', html: `<span class="ltr">${l}</span>` });
        b.addEventListener('click', () => {
          if (pos >= letters.length || b.disabled) return;
          if (l === letters[pos]) {
            slots[pos].textContent = l;
            slots[pos].classList.add('filled');
            b.disabled = true;
            b.classList.add('used');
            pos++;
            if (pos === letters.length) api.success();
            else speech.speak(sayLetterSound(l), { pause: 150 }, 'What comes next?');
          } else {
            api.miss();
            b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle');
            speech.speak('That says', sayLetterSound(l), '.', 'Listen:', { text: word, rate: 0.75 });
          }
        });
        api.choicesEl.append(b);
      }
    },
    right: () => [...letters.map(l => sayLetterSound(l)), { text: word, rate: 0.9 }, '!', 'You spelled it!'],
  };
}

// Fill in the missing letter: _at, c_t, ca_.
// mode 'first' -> only the first letter is missing; 'ends' -> first or last; 'any' -> any clear letter.
function qFill(known, mode, maxLen) {
  const puzzles = FILL_WORDS
    .filter(([w]) => w.length <= maxLen && [...w].every(l => known.includes(l)))
    .flatMap(([w, pic]) => blankable(w)
      .filter(i => mode === 'any' || i === 0 || (mode === 'ends' && i === w.length - 1))
      .map(i => ({ w, pic, i })));
  const { w, pic, i } = fresh(puzzles, z => z.pic);
  const missing = w[i];
  const sameKind = l => isVowel(l) === isVowel(missing);
  let others = pickN(known, 2, l => soundOf(l) === soundOf(missing) || l === 'x' || l === 'q' || !sameKind(l));
  if (others.length < 2) others = pickN(known, 2, l => soundOf(l) === soundOf(missing) || l === 'x' || l === 'q');
  const where = i === 0 ? 'What sound does it start with?' : i === w.length - 1 ? 'What sound does it end with?' : 'What sound is missing in the middle?';
  let slot;
  return {
    key: `fill${w}${i}`,
    prompt: [{ text: w, rate: 0.85 }, '.', where],
    render(stage) {
      slot = h('span', { class: 'blank' }, '_');
      const letters = [...w].map((l, k) => (k === i ? slot : h('span', { class: isVowel(l) ? 'vowel' : '' }, l)));
      stage.append(h('div', { class: 'scene' },
        h('button', { class: 'giant-pic fill-pic', onclick: () => speech.speak({ text: w, rate: 0.85 }) }, pic),
        h('div', { class: 'fill-word' }, letters)));
    },
    choices: shuffle([missing, ...others]).map(letterChoice),
    answer: missing,
    wrong: v => ['That says', sayLetterSound(v), '.', 'Listen:', { text: w, rate: 0.7 }],
    right: () => [() => { slot.textContent = missing; slot.classList.add('filled'); }, sayLetterSound(missing), { text: w, rate: 0.9 }, '!'],
  };
}

// ---------- lessons ----------
function letterSlide(l) {
  const L = LETTERS[l];
  return {
    render(stage) {
      const tile = letterTile(l, 'giant');
      const pic = h('div', { class: 'giant-pic hidden-pic' }, L.pic);
      const big = h('div', { class: 'case-pair' }, h('span', {}, l.toUpperCase()), h('span', {}, l));
      // One row (landscape): little letter, big + little pair, then the picture.
      stage.append(h('div', { class: 'scene letter-intro' }, h('div', { class: 'row' }, tile, big, pic)));
      return { tile, pic, big };
    },
    say: ({ tile, pic, big }) => [
      glow(tile), `This is the letter ${L.name}.`,
      glow(big), `Big ${L.name}. Little ${L.name}.`,
      'It says', sayLetterSound(l), sayLetterSound(l),
      () => pic.classList.remove('hidden-pic'), L.ends ? `You can hear it at the end of ${L.word}.` : `like ${L.word}!`,
      L.ends ? null : [sayLetterSound(l), { text: L.word, rate: 0.9 }],
    ],
  };
}

function letterLesson(gi) {
  const slides = [];
  if (gi === 0) {
    slides.push({
      render(s) { s.append(mascot('a b c')); },
      say: () => ["Hi! I'm Ollie the owl.", 'Letters make sounds.', 'And sounds make words!', "Let's learn some letters."],
    });
  }
  for (const l of GROUPS[gi]) slides.push(letterSlide(l));
  slides.push({
    render(s) {
      const tiles = GROUPS[gi].map(l => letterTile(l));
      s.append(mascot(), h('div', { class: 'word-tiles' }, tiles));
      return tiles;
    },
    say: tiles => ["Let's say them again!", ...GROUPS[gi].flatMap((l, i) => [focusOn(tiles, tiles[i]), sayLetterSound(l)]), focusOn(tiles, null), 'Tap a letter to hear it. Then tap the arrow to play!'],
  });
  return slides;
}

function blendSlide(word, pic, first) {
  return {
    render(stage) {
      const wt = wordTiles(word);
      const p = h('div', { class: 'giant-pic hidden-pic' }, pic);
      stage.append(h('div', { class: 'scene' }, wt.el, p));
      return { wt, p };
    },
    say: ({ wt, p }) => [
      first ? 'You know enough letters to read a word! We say each sound, then push the sounds together.' : "Let's read another one.",
      ...soundOutParts(word, wt),
      'Faster!',
      ...[...word].flatMap((l, i) => [focusOn(wt.tiles, wt.tiles[i]), sayLetterSound(l, 1.35)]),
      () => { focusOn(wt.tiles, null)(); wt.tiles.forEach(t => t.classList.add('glow')); p.classList.remove('hidden-pic'); },
      { text: word, rate: 0.9 }, `${word}!`,
    ],
  };
}

function sightLesson(words) {
  return [
    {
      render(s) { s.append(mascot('👀')); },
      say: () => ['Some words we see all the time.', "We learn them by looking. Let's learn some!"],
    },
    ...words.map(w => ({
      render(stage) { const el = h('div', { class: 'giant-word' }, w); stage.append(h('div', { class: 'scene' }, el)); return el; },
      say: el => [glow(el), `This word is`, { text: w, rate: 0.85 }, '.', { pause: 300 }, { text: w, rate: 0.85 }],
    })),
  ];
}

function rhymeSlide() {
  return {
    render(stage) {
      const items = ['cat', 'hat', 'bat'].map(w => h('div', { class: 'num-card' }, h('span', { class: 'pic' }, PIC[w]), h('span', { class: 'pic-label' }, w)));
      stage.append(h('div', { class: 'num-cards' }, items));
      return items;
    },
    say: items => ['Here is a listening game!', 'Some words rhyme. They sound the same at the end.',
      ...items.flatMap((el, k) => [focusOn(items, el), ['cat', 'hat', 'bat'][k]]), focusOn(items, null),
      'Cat, hat, bat. They all end with', { text: 'at', rate: 0.8 }, '. They rhyme!'],
  };
}

function fillSlide() {
  return {
    render(stage) {
      const slot = h('span', { class: 'blank' }, '_');
      stage.append(h('div', { class: 'scene' }, h('div', { class: 'giant-pic' }, '🐷'),
        h('div', { class: 'fill-word' }, slot, h('span', {}, 'i'), h('span', {}, 'g'))));
      return slot;
    },
    say: slot => ['Uh oh! A letter fell out of this word.', 'pig.', 'What sound does pig start with?', { pause: 400 },
      sayLetterSound('p'), () => { slot.textContent = 'p'; slot.classList.add('filled'); },
      sayLetterSound('p'), sayLetterSound('i'), sayLetterSound('g'), 'pig!', 'You can fix words like this!'],
  };
}

function spellSlide() {
  return {
    render(stage) {
      const slots = [0, 1, 2].map(() => h('div', { class: 'slot' }));
      stage.append(h('div', { class: 'scene' }, h('div', { class: 'giant-pic' }, '🐶'), h('div', { class: 'slots' }, slots)));
      return slots;
    },
    say: slots => ['We can spell words too!', 'dog.', 'What sounds do we hear in dog?',
      ...['d', 'o', 'g'].flatMap((l, k) => [() => { slots[k].textContent = l; slots[k].classList.add('filled'); }, sayLetterSound(l)]),
      'dog!', 'Your turn! Tap the letters in order.'],
  };
}

const FILL_MODE = gi => (gi < 4 ? 'first' : gi < 6 ? 'ends' : 'any');

/** Weighted mix of games for a letter level. Word games unlock once she knows the letters they need. */
function letterLevelGen(gi) {
  const known = lettersUpTo(gi);
  const words = decodable(known);
  const games = [qLetterSound, qLetterSound, qStartsWith];
  if (gi >= 1) games.push(() => qBlend(words), () => qBlend(words));
  if (gi >= 2) games.push(qCase, qRhyme, () => qFill(known, FILL_MODE(gi), 3), () => qFill(known, FILL_MODE(gi), 3));
  if (gi >= 3) games.push(() => qHearWord(words), () => qSpell(words, known));
  return () => {
    const g = pick(games);
    return g.length ? g(gi) : g();
  };
}

const ALL = Object.keys(LETTERS);

export const LEVELS = [
  ...GROUPS.map((g, gi) => ({
    name: `Letters ${g.join(' ')}`,
    gen: letterLevelGen(gi),
    lesson: () => [
      ...letterLesson(gi),
      ...(gi === 1 ? [blendSlide('pan', '🍳', true), blendSlide('tap', '🚰', false)] : []),
      ...(gi === 2 ? [rhymeSlide(), fillSlide()] : []),
      ...(gi === 3 ? [spellSlide()] : []),
    ],
  })),
  {
    name: 'Reading longer words',
    gen: () => pick([() => qBlend(WORDS), () => qBlend(WORDS), () => qFill(ALL, 'any', 5), () => qFill(ALL, 'any', 5), () => qSpell(SHORT, ALL), qRhyme])(),
    lesson: () => [
      { render(s) { s.append(mascot('a–z')); }, say: () => ['Wow! You know all your letters!', "Now let's read some longer words."] },
      blendSlide('frog', '🐸', false), blendSlide('hand', '✋', false),
    ],
  },
  {
    name: 'Finding words',
    gen: () => pick([() => qBlend(WORDS), () => qHearWord(SHORT), () => qHearWord(SHORT), () => qFill(ALL, 'any', 5), () => qSpell(SHORT, ALL)])(),
    lesson: () => [{
      render(stage) { const el = h('div', { class: 'giant-word' }, 'dog'); stage.append(h('div', { class: 'scene' }, h('div', { class: 'row' }, mascot('👂'), el))); return el; },
      say: el => ['Now I will say a word, and you find it!', 'Look at the first letter. Then the others.', glow(el), 'This says', sayLetterSound('d'), sayLetterSound('o'), sayLetterSound('g'), 'dog!'],
    }],
  },
  { name: 'Sight words 1', gen: () => qSight(SIGHT1), lesson: () => sightLesson(SIGHT1) },
  { name: 'Sight words 2', gen: () => pick([() => qSight(SIGHT2), () => qSight(SIGHT2), () => qSight(SIGHT1)])(), lesson: () => sightLesson(SIGHT2) },
  {
    name: 'Reading sentences',
    gen: () => pick([() => qSentence(SHORT), () => qSentence(SHORT), () => qHearWord(SHORT), () => qFill(ALL, 'any', 5)])(),
    lesson: () => [{
      render(stage) { const se = sentenceEl('I see a cat.'); const p = h('div', { class: 'giant-pic hidden-pic' }, '🐱'); stage.append(h('div', { class: 'scene' }, se.el, p)); return { se, p }; },
      say: ({ se, p }) => ['Words make sentences!', 'We read them one word at a time.',
        ...se.spans.flatMap(s => [focusOn(se.spans, s), s.textContent.replace('.', '')]), focusOn(se.spans, null),
        () => p.classList.remove('hidden-pic'), 'I see a cat!', 'If you get stuck, tap a word to hear it.'],
    }],
  },
];

// ---------- writing: trace a word (2–3 a day, never marked right or wrong) ----------
/** Trace a picture word in big dotted letters, in her choice of colour. Longer words as she progresses. */
export function writingQuestion(level) {
  const maxLen = level < 3 ? 3 : level < 9 ? 4 : 5;
  const [w, pic] = fresh(FILL_WORDS.filter(([x]) => x.length >= 3 && x.length <= maxLen), p => p[1]);
  return {
    key: `write${w}`,
    writing: true,
    noScore: true,
    prompt: ['This word says', { text: w, rate: 0.85 }, '.', `Trace ${w} with your finger.`, 'You can pick any colour you like!'],
    render(stage, api) {
      const done = doneButton(() => api.success());
      const pad = drawPad({ guide: w, onInk: done.ready, cls: 'word-pad' });
      const picker = colorPicker(c => pad.setColor(c));
      stage.append(h('div', { class: 'write-scene' },
        h('div', { class: 'write-top' },
          h('button', { class: 'write-pic', onclick: () => speech.speak({ text: w, rate: 0.85 }) }, pic), picker),
        pad.el));
      api.choicesEl.append(done.el);
    },
    right: () => ['Beautiful writing!', { text: w, rate: 0.85 }, '!'],
  };
}
