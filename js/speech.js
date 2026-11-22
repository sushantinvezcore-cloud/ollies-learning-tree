// Text-to-speech wrapper. Everything a pre-reader needs is spoken aloud.
// iPad Safari only allows speech after a user tap, so unlock() is called from the Start button.

import * as sound from './sound.js';

const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voice = null;
let baseRate = 0.8;
const PITCH = 1.12; // a little brighter: friendly, not squeaky
let preferredName = null;
let token = 0;

// Novelty and robotic voices that ship with iPadOS/macOS. Never pick these automatically.
const ROBOTIC = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|princess|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|novelty|eloquence/i;
// Warm female voices, best first. Premium/Enhanced versions sound far more natural than the default ones.
const WARM = ['ava', 'zoe', 'samantha', 'allison', 'susan', 'nicky', 'joelle', 'serena', 'kate', 'karen', 'moira', 'tessa',
  'martha', 'catherine', 'stephanie', 'aria', 'jenny', 'emma', 'libby', 'sonia', 'natasha', 'google us english', 'zira'];
const MALE = /daniel|aaron|arthur|gordon|oliver|\btom\b|alex|rishi|nathan|evan|lee|david|mark|guy|ryan|thomas|eric/i;

export function englishVoices() {
  if (!synth) return [];
  return synth.getVoices().filter(v => /^en[-_]/i.test(v.lang) || v.lang === 'en');
}

/** Higher is better: natural-sounding, female, US/UK/AU English. */
export function voiceScore(v) {
  const id = `${v.name} ${v.voiceURI || ''}`.toLowerCase();
  if (ROBOTIC.test(id)) return -1000;
  let s = 0;
  if (/premium/.test(id)) s += 120;
  else if (/enhanced|natural|neural|online/.test(id)) s += 80;
  const w = WARM.findIndex(n => id.includes(n));
  if (w >= 0) s += 60 - w;
  if (MALE.test(v.name)) s -= 50;
  if (/en[-_]us/i.test(v.lang)) s += 10;
  else if (/en[-_](gb|au|ie|nz|ca)/i.test(v.lang)) s += 6;
  if (v.localService) s += 2; // works offline
  return s;
}

function pickVoice() {
  const voices = englishVoices();
  if (!voices.length) return;
  if (preferredName) {
    const v = voices.find(x => x.name === preferredName);
    if (v) { voice = v; return; }
  }
  voice = voices.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}

export function configure({ rate, voiceName } = {}) {
  if (rate) baseRate = rate;
  if (voiceName !== undefined) preferredName = voiceName;
  pickVoice();
}

export function currentVoiceName() { return voice ? voice.name : ''; }
export function currentVoiceIsBasic() { return !!voice && voiceScore(voice) < 80; }

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
  sound.stopClip();
  if (synth && (synth.speaking || synth.pending)) synth.cancel();
}

const wait = ms => new Promise(r => setTimeout(r, ms));

/**
 * Tidy text so the voice never reads out symbols: "?", "!" or "." on their own are dropped
 * (otherwise iPad says "exclamation mark"), and maths signs become words.
 */
export function clean(text) {
  let t = String(text)
    .replace(/…/g, ',')
    .replace(/\s*\+\s*/g, ' plus ')
    .replace(/\s+[−-]\s+/g, ' minus ')
    .replace(/\s*=\s*/g, ' equals ')
    .replace(/[“”"]/g, '')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
  if (!/[a-z0-9]/i.test(t)) return ''; // nothing but punctuation
  return t;
}

function sayOne(raw, opts = {}) {
  const text = clean(raw);
  return new Promise(resolve => {
    if (!synth || !text) { resolve(); return; }
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : 'en-US';
    u.rate = Math.max(0.4, Math.min(1.3, baseRate * (opts.rate || 1)));
    u.pitch = opts.pitch ?? PITCH;
    let done = false;
    // Safari sometimes never fires onend; never let the game hang on it.
    const t = setTimeout(() => finish(), 2500 + (text.length * 120) / u.rate);
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
 *   { clip: url }               – a recorded sound (letter sounds)
 *   { pause: ms }               – silence
 *   () => {}                    – callback run at that moment (used to highlight things in sync)
 * Starting a new speak() cancels the previous one. Resolves true if it ran to the end.
 */
export async function speak(...parts) {
  stop();
  const my = token;
  if (synth) await wait(60); // let cancel() settle on iOS
  let spokeBefore = false;
  for (const p of parts.flat(Infinity)) {
    if (my !== token) return false;
    if (p == null || p === false) continue;
    if (typeof p === 'function') { p(); continue; }
    if (p.pause) { await wait(p.pause); continue; }
    const text = typeof p === 'string' ? p : p.text;
    if (p.clip) {
      if (spokeBefore) await wait(120);
      await sound.playClip(p.clip, p.rate || 1);
      spokeBefore = true;
      continue;
    }
    if (!clean(text || '')) continue;
    if (spokeBefore) await wait(140); // small breath between sentences, like a teacher
    await sayOne(text, typeof p === 'string' ? {} : p);
    spokeBefore = true;
  }
  return my === token;
}
