# Ambient sounds

Drop MP3 files in this folder to enable the file-based ambient tracks in
the player widget (sidebar, bottom-left). Expected filenames:

| Filename       | Used by track    |
|----------------|------------------|
| `rain.mp3`     | Rain             |
| `cafe.mp3`     | Café             |
| `fireplace.mp3` | Fireplace       |

If a file is missing, the player shows "file missing" next to the track and
nothing plays. The three procedural tracks (White / Pink / Brown noise) work
out of the box — they're generated in the browser via Web Audio, no files
needed.

## Recommended free (CC0 / public domain) sources

Any of these will do. Look for ~1–5 minute loops — the player loops them
seamlessly. Save each as `rain.mp3` / `cafe.mp3` / `fireplace.mp3`.

- **Pixabay Sound Effects** — https://pixabay.com/sound-effects/search/rain/
  - Free under the Pixabay Content License. Direct MP3 downloads.
- **Mixkit** — https://mixkit.co/free-sound-effects/rain/
  - Free for commercial + personal use.
- **Freesound** — https://freesound.org/
  - Mix of licenses; filter by "Creative Commons 0" to avoid attribution.
- **BBC Sound Effects** — https://sound-effects.bbcrewind.co.uk/
  - Free under their Personal Use License.

## Tips

- ~1–3 MB per file is a sweet spot; longer than ~5 min and you bloat the
  bundle without much benefit since the player loops anyway.
- Browsers handle MP3 universally. OGG/Opus also work but MP3 is the
  safest default.
- Files in `public/` are served as-is by Vite — no import needed.
