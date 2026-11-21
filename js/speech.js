// Text-to-speech wrapper. Everything a pre-reader needs is spoken aloud.
// iPad Safari only allows speech after a user tap, so unlock() is called from the Start button.

const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voice = null;
let baseRate = 0.85;
let preferredName = null;
let token = 0;

const PREFERRED = [
  'Samantha (Enhanced)', 'Samantha (Premium)', 'Ava (Premium)', 'Ava (Enhanced)', 'Zoe (Premium)',
  'Zoe (Enhanced)', 'Samantha', 'Karen', 'Moira', 'Tessa', 'Google US English',
  'Microsoft Aria Online (Natural) - English (United States)', 'Microsoft Jenny Online (Natural) - English (United States)',
  'Microsoft Zira - English (United States)',
];

export function englishVoices() {
  if (!synth) return [];
  return synth.getVoices().filter(v => /^en[-_]/i.test(v.lang) || v.lang === 'en');
}

function pickVoice() {
  const voices = englishVoices();
  if (!voices.length) return;
  if (preferredName) {
    const v = voices.find(x => x.name === preferredName);
    if (v) { voice = v; return; }
  }
  for (const name of PREFERRED) {
    const v = voices.find(x => x.name === name);
    if (v) { voice = v; return; }
  }
  voice = voices.find(v => /en[-_]US/i.test(v.lang)) || voices[0];
}

export function configure({ rate, voiceName } = {}) {
  if (rate) baseRate = rate;
  if (voiceName !== undefined) preferredName = voiceName;
  pickVoice();
}

export function currentVoiceName() { return voice ? voice.name : ''; }

if (synth) {
  pickVoice();
  synth.addEventListener?.('voiceschanged', pickVoice);
}

export function unlock() {
  if (!synth) return;
  // A silent utterance inside the tap handler unlocks speech on iOS.
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  synth.speak(u);
}

export function stop() {
  token++;
  if (synth && (synth.speaking || synth.pending)) synth.cancel();
}

const wait = ms => new Promise(r => setTimeout(r, ms));

function sayOne(text, opts = {}) {
  return new Promise(resolve => {
    if (!synth || !text) { setTimeout(resolve, 250); return; }
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : 'en-US';
    u.rate = Math.max(0.4, Math.min(1.4, baseRate * (opts.rate || 1)));
    u.pitch = opts.pitch ?? 1.1;
    let done = false;
    // Safari sometimes never fires onend; never let the game hang on it.
    const t = setTimeout(() => finish(), 2000 + (text.length * 110) / u.rate);
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(t);
      resolve();
    }
    u.onend = finish;
    u.onerror = finish;
    synth.speak(u);
  });
}

/**
 * Speak a sequence. Parts can be:
 *   'text'                      – spoken
 *   { text, rate, pitch }       – spoken with options
 *   { pause: ms }               – silence
 *   () => {}                    – callback run at that moment (used to highlight things in sync)
 * Starting a new speak() cancels the previous one. Resolves true if it ran to the end.
 */
export async function speak(...parts) {
  stop();
  const my = token;
  if (synth) await wait(60); // let cancel() settle on iOS
  for (const p of parts.flat(Infinity)) {
    if (my !== token) return false;
    if (p == null || p === false) continue;
    if (typeof p === 'function') p();
    else if (typeof p === 'string') await sayOne(p);
    else if (p.pause) await wait(p.pause);
    else if (p.text) await sayOne(p.text, p);
  }
  return my === token;
}
