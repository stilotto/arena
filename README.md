# The Hundred

One hundred heroes, ten of every calling, fight for their lives in an arena
between the planes. Turn-based tactics in the browser.

Play: https://stilotto.github.io/arena/

- `index.html`: page and styles
- `engine.js`: rules, foes, the daily billing, battle AI (no DOM)
- `ui.js`: camp, quartermaster, training, battle canvas and input
- `arena3d.js`: skycam flyover and title orbit (software 3D on a 2D canvas)
- `figures.js`: drawn figures for every calling and foe
- `six.js`: screens for The Six, the party mode
- `quest.js`: side quests for The Six (crypt, tower, street)
- `tools/sim.js`: headless balance run (`node tools/sim.js 5 30`)

Developer hook: add `?day=20` to the URL to jump to a later day with a levelled,
equipped legion. Optional: `&lvl=6`, `&gear=3`, `&dead=30`, `&fight=1`. Nothing is saved.
