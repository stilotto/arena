# Handoff notes

Written at the end of a very long first session so a fresh one can pick up.
Read this, `CLAUDE.md` and `TODO.md` before changing anything.

## Where things stand

Two modes share one engine: **The Hundred** (a legion of 100 in ten cohorts,
standing orders) and **The Six** (a hand-controlled party with gear,
spellbooks and side quests). Everything in `TODO.md` under a "built" heading
works and is on `main`. Nothing has had a proper human balance pass.

## How the owner likes to work

- Short replies; they read on a small Chromebook (about 1366 by 600).
- If they mention a screenshot or file that is not attached, ask whether they
  forgot it before doing anything.
- They review on the live site, so every push goes to `main`.
- They talk a change through first, then say "go". `TODO.md` is theirs: add
  to it when asked, build only on a go.
- They watch their usage. Prefer few, well-aimed tool calls; test with the
  scripts below rather than many screenshots; say how big a turn will be.
- They enjoy the old gold-box feel: THAC0, descending armour class, memorised
  spells, Delay and Guard.

## Checking work

- `sh tools/check.sh` runs the headless checks in `tools/tests/` (Playwright
  with Chromium) and the balance sim. Each test prints arrays of booleans and
  an error list; all should be true with `[]` errors.
- `tools/tests/board-shots.js`, `skycam-shots.js` and `effects.js` take
  screenshots for looking at, not asserting. They take an output folder and,
  for the first two, a JSON list of `[place, room, seed]` (plus a 0 to 1
  flyover position for the skycam).
- Tests use `?six=1&day=N` and `?day=N`, which never save.
- To photograph an effect mid-flight, stub `Date.now` around `draw()`; see
  `effects.js`.

## How the pieces fit

- **Board drawing** (`ui.js draw`): floor layer (prerendered) → highlights →
  figures, with wall and prop strips laid row by row between them in quest
  rooms → lighting overlay (`quest.js roomOverlay`) → effects (`fx.js`).
  The arena draws one square of wall all round, so grid squares are offset by
  one (`M`); quest rooms are not.
- **Lighting**: `roomFX` (built by `lightRig`) holds the light sources and
  which cells each can see. The overlay samples light at two points per
  square, darkens what is unlit, and adds colour. Heroes carry light in quest
  rooms; effects add light everywhere (`fxLights`).
- **Effects**: the engine only records events in `b.fx`. An event with `lag`
  delays the numbers and deaths that follow. The fallen stay drawn as
  "ghosts" until the blow lands. `sound.js` plays from the same events.
- **Skycam**: `arena3d.js` is a painter's-algorithm renderer. The arena sorts
  by depth; quest rooms sort by distance to each cell, which is what stops
  figures showing through walls. Floors need an opaque underlay or the sky
  shows between tiles.
- **Rooms**: `genRoom` builds from a seed and rejects any room where the
  door, nine entry squares, enough spawn squares and the far corner are not
  all reachable. `rhash` must match the painters' hash, because house doors
  are placed by it in three files.
- **The Six's turn order**: the turn belongs to `B.order[B.turn]`, never to
  the selection. `refresh()` re-selects that hero if the selection is lost.
- **Saves**: the campaign saves at camp; a battle saves at every `refresh()`
  when nothing is animating (`packBattle`). Quest rooms are rebuilt from the
  seed on resume. Dev URLs never save.

## Mistakes already made once

- A helper that searched "the last five faces" matched a neighbour's face and
  stretched it through the tower floor. Search only what you just added.
- Raised walls and roofs hid figures in the square behind. A wall now stays
  inside its own square when the square behind it is open floor.
- CSS `order` on the sidebar put it on the left. In the wide layout the stage
  and sidebar have explicit grid columns.
- `requestAnimationFrame` timestamps can be earlier than `performance.now()`;
  clamp animation progress at zero.
- Losing the selection in The Six stranded the turn (Escape did it).
- A canvas gradient made before `translate` is in the wrong place afterwards.
- The first street roofs covered the lower street row; see above.
- Bump `?v=` on every script tag or phones keep old code.

## Sprint 2, as agreed

**2a, mechanics**

- Floor traps and locked chests in quest rooms; thieves find and disarm.
  Doors, bookshelves and sarcophagi already exist (`thingAt`, `interact`).
- Unaware foes and patrols: a room's foes start unaware until a hero comes
  into their line of sight or makes noise. The party gets a free first round
  against anyone caught unaware. Thieves and rangers are harder to notice.
- Wands and more kinds of potion. Scrolls exist (`SCROLLS`, `readScroll`,
  `S.bag`).
- More monster abilities: grab, charge, call for help.

**2b, places**: the sewer, the market and the ship, all three. Each needs a
layout in `genRoom`, foes and a master in `PLACES` and `MON`, figures,
painting in `quest.js` and a style in `arena3d.js`.

**Then** a balance pass after the owner has played. Known soft spots: quest
experience is generous; crits made The Hundred deadlier; the automated party
still dies to Vhorax; summoning was just capped and can be stopped by melee,
unproven in play.

## Small things the owner has asked about and not yet decided

- Whether the cheer still sounds like surf (it was slowed; pitched "voices"
  under it would be the next step).
- Whether the "ooh" and groan read as a crowd.
- Tooltips have no touch-screen equivalent.
- Foes do not guard; only heroes do.
