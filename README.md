# Ollie's Learning Tree

A daily learning game for a 4-year-old. Every day there are **10 number questions** and
**10 letter/reading questions**. Everything is spoken aloud, so no reading is needed to play. Progress and
stickers are saved on the iPad.

## How it teaches

- **Each new skill starts with a short lesson.** Ollie the owl demonstrates it (counting along, sounding
  out letters) before any questions.
- **It moves up on its own.** A level is "learned" once 8 of the last 10 answers are right on the first
  try. The next day starts with the next lesson.
- **Wrong answers get help, not punishment.** For counting, Ollie counts the objects together with her.
  For letters, Ollie says the sound she tapped and then repeats the target sound.
- **About 30% of each round is review** from earlier levels.
- **Nothing repeats within a round.** Every picture, object and word shown in a round is remembered, and
  the next question picks something new.

### Numbers

She can already count small numbers, so it starts at 10–30. Small numbers only come back for adding and
taking away, and even then at least one number is between 4 and 9.

| Level | What she does |
|---|---|
| 1. Counting 10–20 | Tap-count 10–20 things (laid out in rows of ten), find numbers, what comes next |
| 2. Teen numbers | Ten-frames ("one full ten and 4 more = 14"), before/after, which is bigger, tracing |
| 3. Counting to 30 | Count up to 30, counting by tens, next/before, bigger/smaller |
| 4. Adding within 10 | With pictures, e.g. 5 + 3, 6 + 2 |
| 5. Taking away within 10 | Starting from 5–10, e.g. 9 − 4 |
| 6. Adding to 20 | e.g. 10 + 4, 8 + 5 ("start at 8 and count on") |
| 7. Taking away within 20 | e.g. 15 − 5, 13 − 4 |
| 8. Plus and minus to 20 | Mixed |

Patterns (🍎🍌🍎🍌?) and shapes (◯ △ ▢, and "what shape is the pizza slice?") come up now and then as
extras. Extras and tracing don't count towards moving up a level.

### Letters and reading

| Level | What she does |
|---|---|
| 1–9. Letter sounds | In the phonics order s a t · p i n · m d g · o c k · e u r · h b f · l j v · w y z · x q |
| from 2 | Sounding out words made only of letters she knows (pan, tap, sit…) |
| from 3 | Rhyming, fill in the missing letter, big/little letters |
| from 4 | Spelling (tap the letters in order), finding a word she hears |
| 10. Longer words | frog, hand, zebra… |
| 11. Finding words | |
| 12–13. Sight words | I, a, the, see, is, my, and, go, can… |
| 14. Sentences | "I see a cat." |

**Letter sounds are real recordings** (`audio/sounds/`), so "s" is a long "sssss", not the letter name
"ess". They were made with the Windows speech engine using phonetic (IPA) input. Each letter has 2–6
different pictures ("s" like sun, sock, snake, star, seal, sandwich), so the same picture isn't repeated.

**Fill in the missing letter** uses about 130 picture words. Each word can have a different letter missing
(`_at`, `c_t`, `ca_`), for about 320 puzzles in all. Only letters that make their plain sound can go
missing, never silent letters or pairs like "sh" or "ee". The difficulty rises step by step:

- letter levels 3–4: only the first letter is missing (`_at`)
- letter levels 5–6: the first or the last letter (`ca_`)
- from letter level 7: any letter, including the vowel in the middle (`c_t`)
- once she knows every letter: 4- and 5-letter words too (`fr_g`, `zeb_a`)

### Writing (2–3 a day in each of numbers and letters)

- **Trace a word:** a picture word in big dotted letters on writing lines (3-letter words first, longer
  ones later).
- **Count and write:** count the objects, write the number freehand, then Ollie shows the number so she
  can compare.
- **Trace a number** (10–30).

Writing is never marked right or wrong, and she taps ✓ when she's done. She picks her pen from 15 dark
colours, and the game remembers her choice. These activities take the place of regular questions, so a
round is still 10. The number per day (2 or 3) is fixed for the day, so stopping and coming back doesn't add more.

## Voice and sounds

- The voice is chosen automatically: natural "Premium" or "Enhanced" female voices first, and the robotic
  novelty voices are never used. It speaks a little slower than normal.
- For the warmest voice, download **Ava (Premium)** on the iPad: Settings → Accessibility → Read & Speak
  (or Spoken Content) → Voices → English. Then pick it in the grown-ups area.
- Letter sounds are recorded clips, not the voice. The grown-ups area has a **▶ Test** button that plays
  s, a, t and says how the iPad played them.

## Grown-ups area

Press and hold ⚙️ on the home screen for 2 seconds. In there you can:

- see her progress and the last 14 days
- change the level by hand (this replays that level's lesson)
- set her name, which Ollie then uses to greet her
- change the number of questions per day
- allow extra rounds after she finishes for the day
- choose the voice and how fast it talks

**Tip:** iPad voices sound much better if you download an enhanced one. Go to Settings → Accessibility →
Spoken Content → Voices → English, download "Samantha (Enhanced)" or "Ava (Premium)", then pick it in
the grown-ups area.

## Putting it on the iPad

The game is a plain website: no build step, no app store. It's published with GitHub Pages at:

**https://sushantinvezcore-cloud.github.io/ollies-learning-tree/**

On the iPad:

1. Open that link in **Safari**.
2. Tap the Share button, then **Add to Home Screen**.
3. Open it from the home screen icon. It runs full screen and keeps working offline.

### Trying it locally first

```powershell
python -m http.server 8080
```

Open http://localhost:8080 on this computer. To try it on the iPad over Wi‑Fi, open
`http://<this-PC's-IP>:8080` in Safari. Over plain http it will play, but it won't work offline.

### Updating

After changing any file, change `VERSION` in `sw.js` (for example `ollies-tree-v5`), then commit and push to
`main`. GitHub Pages republishes within a minute or two, and the iPad picks up the new version the next
time the app is opened while online. Her progress and stickers are kept.

## Files

- `index.html`: screens
- `css/style.css`: look and feel
- `js/app.js`: flow (home → lesson → questions → sticker), grown-ups area
- `js/math.js`: number levels, lessons and question generators
- `js/reading.js`: letter sounds, word lists, sight words, sentences
- `js/speech.js`: text-to-speech; `js/sound.js`: chimes; `js/store.js`: saved progress
- `sw.js`, `manifest.webmanifest`, `icons/`: what makes it installable and work offline
