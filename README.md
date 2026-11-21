# Ollie's Learning Tree

A daily learning game for a 4-year-old who isn't reading or counting yet. Every day there are
**10 number questions** and **10 letter/reading questions**. Everything is spoken aloud, so no reading is
needed to play. Progress and stickers are saved on the iPad.

## How it teaches

- **Each new skill starts with a short lesson.** Ollie the owl demonstrates it (counting along, sounding
  out letters) before any questions.
- **It moves up on its own.** A level is "learned" once 8 of the last 10 answers are right on the first
  try. The next day starts with the next lesson.
- **Wrong answers get help, not punishment.** For counting, Ollie counts the objects together with her.
  For letters, Ollie says the sound she tapped and then repeats the target sound.
- **About 30% of each round is review** from earlier levels.

| Numbers | Letters & reading |
|---|---|
| 1. Counting 1–3 (tap each thing to count), shapes ◯ △ ▢ | 1–9. Letter sounds in the phonics order s a t · p i n · m d g · o c k · e u r · h b f · l j v · w y z · x q |
| 2. Counting to 5, which side has more, patterns (🍎🍌🍎🍌?), quick look | Sounding out words starts at level 2 (after s a t p i n), using only letters she knows |
| 3. Number shapes 1–5, what comes next, tracing numbers, more shapes | Rhyming and fill-in-the-missing-letter start at level 3 |
| 4. Counting to 10, more/fewer, harder patterns, shapes in real things (🍕 = triangle) | Spelling (tap the letters in order) and finding a word she hears start at level 4 |
| 5. Number shapes 1–10, tracing, quick look up to 6 | 10. Longer words (frog, hand, zebra…) |
| 6. Adding to 5 (with pictures) | 11. Finding words |
| 7. Taking away within 5 | 12–13. Sight words (I, a, the, see, is, my, and, go, can…) |
| 8. Adding to 10 | 14. Reading short sentences ("I see a cat.") |
| 9. Taking away within 10 | |
| 10. Plus and minus mixed | |

**Fill in the missing letter** uses about 130 picture words (cat, frog, zebra…). Each word can have a different
letter missing (`_at`, `c_t`, `ca_`), for about 320 puzzles in all. Only letters that make their plain sound
can go missing, never silent letters or pairs like "sh" or "ee". The difficulty rises step by step:

- letter levels 3–4: only the first letter is missing (`_at`)
- letter levels 5–6: the first or the last letter (`ca_`)
- from letter level 7: any letter, including the vowel in the middle (`c_t`)
- once she knows every letter: 4- and 5-letter words too (`fr_g`, `zeb_a`)

Tracing numbers is handwriting practice, so it doesn't count towards moving up a level.

**Quick look** shows dots in dice patterns for about a second, then hides them. It teaches her to recognise
small amounts instantly instead of counting one by one. **Patterns** go from AB (🍎🍌🍎🍌) to AAB, ABB, ABC and AABB.
In the adding and taking-away levels, about 1 question in 4 is a bonus pattern, shape or quick-look
question to keep things varied. Bonus questions don't count towards moving up.

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
