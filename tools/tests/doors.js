const URL0 = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async () => { const br = await chromium.launch(); const errs = []; const p = await br.newPage({ viewport: { width: 1366, height: 600 } }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file:///home/user/arena/index.html?six=1&day=9');
  const r = await p.evaluate(async () => { const o = {}; S.fly = false; beginQuest(S, 'slum'); S.quest.seed = 2; enterRoom(); fast = true; await endTurn(); while (!sel) await sleep(30);
    // delay: the hero goes to the back, once
    const u = sel, n0 = B.order.length; delayTurn(); await sleep(60); let g = 0; while ((!sel || busy) && g++ < 200) await sleep(30);
    o.delay = [B.order[B.order.length - 1] === u || u.acted, u.delayed, B.order.length === n0, sel !== u];
    // keys
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '-' })); const c1 = cur; window.dispatchEvent(new KeyboardEvent('keydown', { key: '-' })); o.keys = [c1 && c1.side, cur && cur.side, cur !== c1 || foesOf(B, sel).length === 1]; window.dispatchEvent(new KeyboardEvent('keydown', { key: '=' })); o.keys.push(cur && cur.side);
    // doors: open every door with a hero placed beside it, tally what was behind them
    o.doors = B.room.doors.length; const tally = {};
    for (let i = 0; i < 60; i++) { const R = makeRoom('slum', i % 4, 100 + i); const b = { room: R, w: R.w, h: R.h, units: [], grid: new Array(R.w * R.h).fill(null), fx: [], log: [], nofx: true, nid: 50, bl: { vet: 1 }, six: true, dead: [] };
      for (const d of R.doors) { const hero = { side: 'H', x: d[0], y: d[1] + 1, cls: i % 3 ? 'fighter' : 'thief', name: 'T', hp: 20, max: 20, st: {}, sp: {} }; const res = openDoor(b, hero, S, d[0], d[1]); if (res) tally[res.k] = (tally[res.k] || 0) + 1; } }
    o.tally = tally; o.bag = JSON.stringify(S.bag);
    // read a scroll of fire as a non-caster
    S.bag = { sfire: 1 }; const h = sel, f = nearest(h, foesOf(B, h)), hp0 = f.hp; const ok = readScroll(B, h, S, 'sfire', f.x, f.y); o.scroll = [ok, S.bag.sfire, f.hp < hp0 || f.hp <= 0, h.acted];
    o.rain = [SND.rain(), typeof SND.flash()];
    return o; });
  await p.evaluate(() => peek({ k: 'citizen', who: 'Almir', text: '"Crake pays the watch. Nobody is coming."', gold: 9 })); await p.waitForTimeout(200); await p.screenshot({ path: process.argv[2] + '/d_peek.png' });
  console.log(JSON.stringify(r), errs); await br.close(); })();
