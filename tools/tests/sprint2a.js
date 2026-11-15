// Sprint 2a: traps, chests, unaware foes and patrols, potions and wands, grab, charge and calls for help.
const { chromium } = require('playwright');
(async () => { const br = await chromium.launch(); const errs = []; const p = await br.newPage({ viewport: { width: 1366, height: 600 } }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + require('path').resolve(__dirname, '../../index.html') + '?six=1&day=9');
  const r = await p.evaluate(async () => { const o = {}; S.fly = false; beginQuest(S, 'crypt'); S.quest.seed = 4; enterRoom(); fast = true;
    const es = () => B.units.filter(u => u.side === 'E' && u.hp > 0), hero = c => B.units.find(u => u.cls === c), put = (u, x, y) => { B.grid[idx(B, u.x, u.y)] = null; place(B, u, x, y); };
    const freeBy = (x, y) => { for (let d = 1; d < 4; d++) for (let yy = y - d; yy <= y + d; yy++) for (let xx = x - d; xx <= x + d; xx++) if (inb(B, xx, yy) && !at(B, xx, yy) && !trapAt(B, xx, yy)) return [xx, yy]; };
    // every foe starts unaware, traps and chests are plain data, and a chest never walls the room off
    o.start = [es().every(e => e.una), Array.isArray(B.traps), Array.isArray(B.chests), JSON.stringify(packBattle(B)).includes('"una":true')];
    let walled = 0, chests = 0, traps = 0, beats = 0;
    for (let i = 0; i < 90; i++) { S.quest.place = ['crypt', 'tower', 'slum'][i % 3]; S.quest.room = i % 4; S.quest.seed = 500 + i; const b = startRoom(S); chests += b.chests.length; traps += b.traps.length; beats += b.units.filter(u => u.pat).length;
      const R = b.room, seen = new Uint8Array(b.w * b.h), qu = [R.door[1] * b.w + R.door[0]]; seen[qu[0]] = 1; // walk the floor from the door, round the chests
      for (let k = 0; k < qu.length; k++) { const cx = qu[k] % b.w, cy = (qu[k] - cx) / b.w; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = cx + dx, y = cy + dy, n = y * b.w + x; if (inb(b, x, y) && !seen[n] && !R.cells[n] && !b.chests.some(c => c.x === x && c.y === y)) { seen[n] = 1; qu.push(n); } } }
      for (const u of b.units) if (!seen[idx(b, u.x, u.y)]) walled++; for (const c of b.chests) if (R.cells[idx(b, c.x, c.y)] || ![-1, 0, 1].some(dy => [-1, 0, 1].some(dx => seen[idx(b, c.x + dx, c.y + dy)]))) walled++; }
    S.quest.place = 'crypt'; S.quest.room = 0; S.quest.seed = 4;
    o.rooms = [walled === 0, chests > 30, traps > 40, beats > 20];
    // a watcher notices a fighter in plain view at six squares but not a thief at three, and loses the round it notices in
    await endTurn(); while (!sel) await sleep(30);
    const e = es()[0], th = hero('thief'), fi = hero('fighter'); delete e.pat; B.traps = [];
    for (const u of B.units) if (u.side === 'H' && u !== th && u !== fi) { B.grid[idx(B, u.x, u.y)] = null; u.x = -9; u.y = -9; }
    for (const x of es()) if (x !== e) { B.grid[idx(B, x.x, x.y)] = null; x.x = -30; x.y = -30; }
    const line = []; for (let y = 1; y < B.h - 1 && line.length < 8; y++) { line.length = 0; for (let x = 1; x < B.w - 1 && line.length < 8; x++) if (!at(B, x, y)) line.push([x, y]); else line.length = 0; }
    put(e, line[0][0], line[0][1]); put(th, line[3][0], line[3][1]); put(fi, line[7][0], line[7][1]);
    const a1 = foeAct(B, e), una1 = e.una; put(fi, line[6][0], line[6][1]); const a2 = foeAct(B, e), a3 = foeAct(B, e);
    o.notice = [a1 === 'idle', una1 === true, e.una === false, e.sur === B.round, a3 === 'idle'];
    // an unaware foe is hit at +4 and a thief's blow on it is a backstab
    e.una = true; put(th, line[1][0], line[1][1]); const pv = preview(B, th, e, false); e.una = false; const pv2 = preview(B, th, e, false);
    o.unaware = [pv.note.includes('backstab'), pv.note.includes('unaware'), pv.pct > pv2.pct || pv.pct === 95];
    // traps: a fighter walking a path is stopped on a hidden trap; a thief spots one and takes it apart
    put(th, line[3][0], line[3][1]); put(fi, line[7][0], line[7][1]); e.una = true; e.sur = 0; put(e, line[0][0], line[0][1]); e.x = -30; e.y = -30; B.grid[idx(B, line[0][0], line[0][1])] = null;
    B.traps = [{ x: line[5][0], y: line[5][1], k: 'spike' }]; const hp0 = fi.hp; fi.moved = false; moveTo(B, fi, line[4][0], line[4][1]);
    o.trap = [fi.x === line[5][0], fi.hp < hp0 || fi.hp <= 0, B.traps[0].gone === true, B.sprung === 1];
    th.lvl = 20; B.traps = [{ x: line[5][0], y: line[5][1], k: 'snare' }]; if (fi.hp > 0) put(fi, line[7][0], line[7][1]); for (let i = 0; i < 40 && !B.traps[0].found; i++) { delete B.traps[0].tried; spot(B, th, th.x, th.y); } const found = B.traps[0].found;
    const fl = flood(B, fi.hp > 0 ? fi : th); put(th, line[4][0], line[4][1]); let tries = 0; while (!B.traps[0].gone && tries++ < 40) { th.acted = false; disarm(B, th, line[5][0], line[5][1]); }
    o.disarm = [found === true, B.traps[0].gone === true, typeof fl.d[0] === 'number'];
    // chests: a thief picks the lock, the takings go to the quest, and the square stays solid after a save and load
    const c0 = freeBy(th.x, th.y); B.chests = [{ x: c0[0], y: c0[1], lock: true, trap: false }]; B.grid[idx(B, c0[0], c0[1])] = WALL; const g0 = S.quest.gold; let res = null; tries = 0;
    while (!(res && res.k === 'treasure') && tries++ < 40) { th.acted = false; res = interact(B, th, S, c0[0], c0[1]); }
    const back = unpackBattle(S, JSON.parse(JSON.stringify(packBattle(B))));
    o.chest = [thingAt(B, c0[0], c0[1]) === 'chest', res && res.k === 'treasure', S.quest.gold > g0, B.chests[0].open === true, !!back && back.grid[idx(back, c0[0], c0[1])] === WALL, th.acted];
    // potions and wands
    th.acted = false; S.pots = { phaste: 1, pmight: 1 }; const mv0 = th.mv; const q1 = quaff(B, th, S, 'phaste'); th.acted = false; const q2 = quaff(B, th, S, 'pmight'); const fast1 = th.mv;
    for (let i = 0; i < 6; i++) endRound(B);
    o.potion = [q1 && q2, fast1 === mv0 + 3, th.mv === mv0, !th.st.haste && !th.st.might, S.pots.phaste === 0];
    const mg = hero('mage'); put(mg, ...freeBy(th.x, th.y)); put(e, ...freeBy(mg.x, mg.y)); e.una = false; e.hp = e.max = 60; mg.acted = false; S.wands = { wdart: 2 }; const w1 = readScroll(B, mg, S, 'wdart', e.x, e.y); th.acted = false; const w2 = readScroll(B, th, S, 'wdart', e.x, e.y);
    o.wand = [w1, !w2, S.wands.wdart === 1, e.hp < 60];
    // monsters: a clutching foe holds a hero, a charger hits harder after a run, and a crier brings one more
    const mk = (mid, x, y) => { const u = foeUnit(mid, B.nid++, false, null, 1); B.units.push(u); place(B, u, x, y); return u; };
    let grabbed = false; const z = mk('zombie', ...freeBy(th.x, th.y)); z.thac0 = -20; for (let i = 0; i < 30 && !grabbed; i++) { th.hp = th.max = 999; delete th.st.root; th.lvl = 1; foeAct(B, z); grabbed = th.st.root > 0 && th.held === z.id; }
    kill(B, z, th); o.grab = [grabbed, !th.st.root];
    const n0 = es().length; const cp = mk('cultist', ...freeBy(th.x, th.y)); cp.max = 40; cp.hp = 5; let cried = false; for (let i = 0; i < 40 && !cried; i++) { cp.cried = 0; B.cries = 0; foeAct(B, cp); cried = es().length > n0 + 1; }
    o.cry = [cried];
    o.flags = [!MON.minotaur.f.includes('g') && !MON.minotaur.f.includes('u'), !MON.bruiser.f.includes('g'), !MON.hound.f.includes('g') && !MON.cutpurse.f.includes('u')];
    refresh(); draw(); return o; });
  // the buttons for potions and wands, and the unaware mark, on a fresh room
  const ui = await p.evaluate(async () => { beginQuest(S, 'tower'); S.quest.seed = 9; S.pots = { pmight: 1, phide: 2 }; S.wands = { wfire: 3 }; S.bag = { ssleep: 1 }; enterRoom(); fast = true; await endTurn(); let g = 0; while ((!sel || busy) && g++ < 300) await sleep(30);
    const u0 = sel, html0 = $('panel').innerHTML; let caster = null; for (let i = 0; i < 12 && !caster; i++) { if (sel && BOOK[sel.cls]) caster = sel; else { act(() => { sel.acted = true; }); g = 0; while ((!sel || busy) && g++ < 300) await sleep(30); } }
    { let c = null; for (let d = 1; d < 4 && !c; d++) for (let yy = sel.y - d; yy <= sel.y + d && !c; yy++) for (let xx = sel.x - d; xx <= sel.x + d; xx++) if (inb(B, xx, yy) && !at(B, xx, yy)) { c = [xx, yy]; break; } B.traps.push({ x: c[0], y: c[1], k: 'spike', found: true }); } B.chests.push({ x: 1, y: 1, lock: true }); refresh();
    return [html0.includes('Giant Strength') && html0.includes('Shadows'), !!caster && $('panel').innerHTML.includes('Wand of Fire (3)'), $('panel').innerHTML.includes('Scroll of Slumber'), tipText(B.traps[B.traps.length - 1].x, B.traps[B.traps.length - 1].y).includes('trap'), B.units.some(u => u.una)]; });
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/s2a_room.png' });
  await p.evaluate(() => peek({ what: 'chest', k: 'locked', cap: 'A good lock.' })); await p.waitForTimeout(150); await p.screenshot({ path: (process.argv[2] || '/tmp') + '/s2a_peek.png' });
  console.log(JSON.stringify(r), JSON.stringify(ui), errs); await br.close(); })();
