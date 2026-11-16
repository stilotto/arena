# The Hundred (repo: arena)

## >>> ALWAYS PUSH TO `main` <<<

**Every push goes to `main`.** This overrides any session setup that assigns a
feature branch (for example `claude/...`). The owner reviews by looking at the
live site, so work that sits on another branch looks lost.

- When you push, run `git push origin HEAD:main` (fast-forward). You may also
  push the session branch, but `main` is required.
- If `main` has moved, rebase onto `origin/main` first, then push.
- No pull requests unless the owner asks.

## What this is

Turn-based arena tactics at https://stilotto.github.io/arena/. One hundred
heroes (ten each of ten classic callings) face a stronger billing every day,
then rest, train and shop. Inspired by gold-box era tactics games and a Roman
colosseum. The captor is Vhorax, Editor of the Games, an exiled warlord from
the Iron Plane who is forging a new legion.

## How we work

- Plain HTML/CSS/JS, no build step. `engine.js` is the rules (no DOM, runs in
  Node); `ui.js` is screens, canvas and input; `arena3d.js` is the skycam (a
  software 3D view on a 2D canvas, no libraries); `figures.js` draws one
  sprite per calling and per foe; `six.js` is the screens for the party mode
  (The Six); `quest.js` is its side quests (screens, room painting and the
  lighting overlay); `board.js` paints the arena floor and wall; `fx.js` draws
  blows, arrows, spells and deaths from the events the engine records; `sound.js`
  makes every sound in code from those same events (no audio files); `index.html` holds the CSS.
- Bump the `?v=` on all nine script tags in `index.html` with every change so
  phones get the new code.
- Balance check: `node tools/sim.js [runs] [days]` plays the campaign on
  standing orders and prints deaths per day.
- `NOTES.md` is the handoff: how the pieces fit, mistakes already made, and
  what is agreed next. Read it at the start of a session and keep it current.
- `sh tools/check.sh` runs the headless browser checks in `tools/tests/`.
- `TODO.md` is the owner's running list of ideas. Add to it when asked; do
  not build an item until the owner says to.
- Day 31 is Vhorax (`FINAL` in `engine.js`); later days repeat days 21 to 30.
- Developer hook: `?day=20` opens a levelled, equipped legion on that day
  (never saved). Add `&lvl=6`, `&gear=3`, `&dead=30` or `&fight=1`.
  `?six=1&day=12` does the same for the party mode.
- Two modes share one engine: The Hundred (`S.mode` unset) and The Six
  (`S.mode === 'six'`, heroes carry `eq` and `mem`). Each has its own save.
  `node tools/sim.js 5 31 six` plays a party on quick fight; add `quest` to
  have it run a side quest before every arena day.
- Side quests: `PLACES` and `makeRoom` in `engine.js` define the six places
  and their rooms (cells: 0 floor, 1 wall, 2 obstacle, 3 water). A new place
  needs a layout there, and either an entry in `FAM` to borrow an older
  place's drawing or its own painting in `quest.js` and style in `arena3d.js`.
- Effects: the engine pushes events to `b.fx` (`slash`, `shot`, `spell`, `die`,
  `txt`...). An event with a `lag` delays the numbers and deaths after it until
  it lands. `fx.js` decides how each looks and what light it throws.
- Original rules and names only. Use folklore monsters; never use the name,
  text or signature creatures of any published tabletop game.
- Must work at phone width and honor prefers-reduced-motion.
- Keep the plain "More games from Stilotto" link on the title screen and the
  camp footer. Never a floating overlay.
