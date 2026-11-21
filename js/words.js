// Picture words for the "fill in the missing letter" game (c_t, _at, ca_).
// Each word is used many times with a different letter missing.

export const FILL_WORDS = [
  // 3 letters
  ['cat', '🐱'], ['dog', '🐶'], ['pig', '🐷'], ['hen', '🐔'], ['fox', '🦊'], ['bat', '🦇'], ['rat', '🐀'],
  ['cow', '🐮'], ['ant', '🐜'], ['bee', '🐝'], ['owl', '🦉'], ['bus', '🚌'], ['car', '🚗'], ['van', '🚐'],
  ['jet', '✈️'], ['box', '📦'], ['bed', '🛏️'], ['hat', '🎩'], ['cap', '🧢'], ['mug', '☕'], ['pan', '🍳'],
  ['pen', '🖊️'], ['pin', '📌'], ['net', '🥅'], ['web', '🕸️'], ['sun', '☀️'], ['egg', '🥚'], ['leg', '🦵'],
  ['bug', '🐛'], ['nut', '🥜'], ['map', '🗺️'], ['key', '🔑'], ['log', '🪵'], ['tub', '🛁'], ['mop', '🧹'],
  ['ten', '🔟'], ['six', '6️⃣'], ['pie', '🥧'], ['sad', '😢'], ['tag', '🏷️'], ['dig', '⛏️'], ['nap', '😴'],
  ['tap', '🚰'], ['man', '👨'], ['kid', '🧒'], ['can', '🥫'], ['red', '🔴'], ['run', '🏃'], ['hug', '🤗'],
  ['jam', '🍯'], ['cop', '👮'],
  // 4 letters
  ['frog', '🐸'], ['crab', '🦀'], ['duck', '🦆'], ['fish', '🐟'], ['bear', '🐻'], ['lion', '🦁'], ['goat', '🐐'],
  ['deer', '🦌'], ['wolf', '🐺'], ['seal', '🦭'], ['swan', '🦢'], ['worm', '🪱'], ['bird', '🐦'], ['tree', '🌳'],
  ['ship', '🚢'], ['boat', '⛵'], ['kite', '🪁'], ['cake', '🎂'], ['ball', '⚽'], ['bell', '🔔'], ['drum', '🥁'],
  ['hand', '✋'], ['foot', '🦶'], ['nose', '👃'], ['milk', '🥛'], ['corn', '🌽'], ['rose', '🌹'], ['star', '⭐'],
  ['moon', '🌙'], ['sock', '🧦'], ['tent', '⛺'], ['gift', '🎁'], ['ring', '💍'], ['door', '🚪'], ['book', '📖'],
  ['sled', '🛷'], ['flag', '🚩'], ['pear', '🍐'], ['rock', '🪨'], ['bone', '🦴'], ['sand', '🏖️'], ['nest', '🪺'],
  ['lamp', '💡'], ['desk', '🗄️'],
  // 5 letters
  ['horse', '🐴'], ['sheep', '🐑'], ['tiger', '🐯'], ['zebra', '🦓'], ['camel', '🐫'], ['panda', '🐼'],
  ['snake', '🐍'], ['shark', '🦈'], ['whale', '🐳'], ['snail', '🐌'], ['mouse', '🐭'], ['llama', '🦙'],
  ['sloth', '🦥'], ['skunk', '🦨'], ['robot', '🤖'], ['train', '🚆'], ['truck', '🚚'], ['apple', '🍎'],
  ['lemon', '🍋'], ['melon', '🍈'], ['grape', '🍇'], ['pizza', '🍕'], ['bread', '🍞'], ['clock', '🕐'],
  ['crown', '👑'], ['plant', '🪴'], ['heart', '❤️'], ['house', '🏠'], ['chair', '🪑'], ['candy', '🍬'],
  ['juice', '🧃'], ['spoon', '🥄'], ['tooth', '🦷'], ['cloud', '☁️'], ['stamp', '📮'],
  ['drink', '🥤'], ['brick', '🧱'], ['skirt', '👗'],
].filter(([w]) => w !== 'lamp' && w !== 'desk'); // no clear picture for these

// Letter pairs that make one sound (or a different sound), so neither letter can be "missing" on its own.
const TEAMS = ['sh', 'ch', 'th', 'wh', 'ck', 'ng', 'nk', 'qu', 'kn', 'wr', 'mb', 'gh',
  'ee', 'ea', 'oo', 'ai', 'ay', 'oa', 'ow', 'ou', 'oy', 'oi', 'ie', 'ue', 'ui', 'ey',
  'ar', 'er', 'ir', 'or', 'ur', 'al', 'aw', 'wa', 'wo',
  'll', 'ss', 'zz', 'ff', 'tt', 'pp', 'nn', 'gg', 'dd', 'bb', 'mm', 'rr'];
const VOWELS = 'aeiou';

/**
 * Positions that can be blanked out: letters that make their plain, single sound in this word.
 * Skips silent letters, letter teams (sh, ee, ar…), long vowels and soft c/g.
 */
export function blankable(word) {
  const n = word.length;
  const vowelCount = [...word].filter(l => VOWELS.includes(l)).length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const l = word[i];
    const prev = word[i - 1] || '';
    const next = word[i + 1] || '';
    if (l === 'x' || l === 'q') continue;
    if (TEAMS.includes(prev + l) || TEAMS.includes(l + next)) continue;
    if (l === 'e' && i === n - 1) continue; // silent e
    if (l === 'y' && i === n - 1) continue; // candy
    if ((l === 'c' || l === 'g') && 'eiy'.includes(next)) continue; // soft c / g
    if (l === 's' && word[n - 1] === 'e' && i === n - 2 && VOWELS.includes(prev)) continue; // rose, nose: s sounds like z
    if (VOWELS.includes(l)) {
      if (i === n - 1) continue; // pizza, panda: unclear ending vowel
      if (word[n - 1] === 'e' && i === n - 3) continue; // long vowel: cake, kite, nose
      if (n >= 4 && vowelCount > 1) continue; // tiger, lemon: vowel sound isn't the short one
    }
    out.push(i);
  }
  return out;
}
