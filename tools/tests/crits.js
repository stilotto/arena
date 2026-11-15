const URL0 = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async () => { const br = await chromium.launch(); const errs = []; const p = await br.newPage({ viewport: { width: 1366, height: 600 } }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file:///home/user/arena/index.html?six=1&day=9');
  const r = await p.evaluate(async () => { const o = {}; S.fly = false;
    // crits: about 1 strike in 20, and they do more
    const b = { units: [], grid: [], fx: [], log: [], nofx: true, w: 9, h: 9 }; let n = 0, crit = 0, cd = 0, nd = 0, hits = 0; const real = hurt;
    for (let i = 0; i < 6000; i++) { const a = { side: 'H', x: 1, y: 1, thac0: 10, st: {}, db: 0 }, t = { side: 'E', x: 2, y: 1, ac: 5, hp: 9999, st: {}, f: '', m: {} }; b.fx = []; b.nofx = false; strike(b, a, t, [1, 8, 0], {}); const ev = b.fx.find(f => f.k === 'slash'), tx = b.fx.find(f => f.k === 'txt'); n++; if (ev.hit) { hits++; if (ev.nat) { crit++; cd += parseInt(tx.s); } else nd += parseInt(tx.s); } }
    o.crit = [(crit / n * 100).toFixed(1) + '% crit', 'avg crit ' + (cd / crit).toFixed(1), 'avg hit ' + (nd / (hits - crit)).toFixed(1)];
    // searchables in tower and crypt
    const tally = {}; for (const pl of ['tower', 'crypt']) for (let i = 0; i < 80; i++) { const R = makeRoom(pl, i % 3, 300 + i), bb = { room: R, w: R.w, h: R.h, units: [], grid: new Array(R.w * R.h).fill(null), fx: [], log: [], nofx: true, nid: 50, bl: { vet: 1 }, six: true, dead: [], day: 9 };
      R.cells.forEach((k, j) => { if (k) bb.grid[j] = WALL; });
      for (const q of R.props) if (q.k === 'shelf' || q.k === 'sarc') { const hero = { side: 'H', x: q.x, y: q.y + 1, cls: i % 2 ? 'mage' : 'fighter', name: 'T', hp: 20, max: 20, st: {}, sp: { sleep: 1 }, lvl: 3 }; const res = interact(bb, hero, S, q.x, q.y); if (res) tally[pl + ':' + res.k] = (tally[pl + ':' + res.k] || 0) + 1; } }
    o.tally = tally;
    // through the UI: a tower room with shelves, tap one from beside it
    let seed = 1, R; do { R = makeRoom('tower', 0, ++seed); } while (R.kind !== 'library' && seed < 60);
    beginQuest(S, 'tower'); S.quest.seed = seed; enterRoom(); fast = true; await endTurn(); while (!sel) await sleep(30);
    const sh = B.room.props.find(q => q.k === 'shelf'); o.thing = thingAt(B, sh.x, sh.y); const u = sel; tap(sh.x, sh.y); o.far = note.slice(0, 22);
    let spot = null; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!spot && inb(B, sh.x + dx, sh.y + dy) && !at(B, sh.x + dx, sh.y + dy)) spot = [sh.x + dx, sh.y + dy];
    B.grid[idx(B, u.x, u.y)] = null; place(B, u, spot[0], spot[1]); tap(sh.x, sh.y); o.opened = [!!B.opened, u.acted, !$('peek').classList.contains('hidden'), $('peek').textContent.slice(0, 40)];
    return o; });
  await p.waitForTimeout(300); await p.locator('#peek').screenshot({ path: process.argv[2] + '/c_peek.png' });
  console.log(JSON.stringify(r), errs); await br.close(); })();
