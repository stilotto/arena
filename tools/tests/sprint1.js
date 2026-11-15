const URL0 = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async () => { const out = process.argv[2] + '/'; const br = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const errs = [];
  const P = async (url, w, h, ctx) => { const c = ctx || await br.newContext({ viewport: { width: w || 1366, height: h || 600 } }); const p = await c.newPage(); p.on('pageerror', e => errs.push(url + ': ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text())); await p.goto(URL0 + url); return p; };
  // 1. layout on a Chromebook-sized window, quest room and arena
  let p = await P('?six=1&day=9'); await p.evaluate(() => { S.fly = false; beginQuest(S, 'slum'); S.quest.seed = 2; enterRoom(); }); await p.waitForTimeout(300); await p.screenshot({ path: out + 'w_slum.png' });
  const sz = await p.evaluate(() => [cell, cv.clientWidth, cv.clientHeight]);
  await p.evaluate(async () => { fast = true; await endTurn(); }); await p.waitForTimeout(200);
  // tooltip and undo
  const r1 = await p.evaluate(() => { const u = sel, f = nearest(u, foesOf(B, u)); const tip = tipText(f.x, f.y); let mv = null; for (let i = 0; i < reach.d.length; i++) if (reach.d[i] === 1 && !B.grid[i]) { mv = [i % B.w, Math.floor(i / B.w)]; break; } const ox = u.x, oy = u.y; tap(mv[0], mv[1]); const moved = u.x !== ox || u.y !== oy, had = !!undo; undoMove(); return [tip.slice(0, 60), moved, had, u.x === ox && u.y === oy, tipText(mv[0], mv[1])]; });
  await p.mouse.move(700, 250); await p.waitForTimeout(100); await p.screenshot({ path: out + 'w_tip.png' });
  // sound: context running and voices produced
  const r2 = await p.evaluate(async () => { document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await sleep(200); const before = SND.label(); SND.play('boom'); SND.play('fanfare'); const u = sel, f = nearest(u, foesOf(B, u)); return [before, SND.on()]; });
  // 2. save mid-battle and resume in a fresh page (real save, not dev)
  const ctx = await br.newContext({ viewport: { width: 1366, height: 600 } });
  let q = await P('', 0, 0, ctx); await q.click('#bNew6'); await q.evaluate(() => { begin6(); S.fly = false; toSands(); }); await q.evaluate(async () => { fast = true; await endTurn(); }); await q.waitForTimeout(400);
  const before = await q.evaluate(() => { const u = sel; const f = nearest(u, foesOf(B, u)); tap(f.x, f.y); return null; }); await q.waitForTimeout(900);
  const st1 = await q.evaluate(() => [B.round, B.turn, B.units.map(u => u.hp).join(','), B.log.length]);
  await q.close(); q = await P('', 0, 0, ctx); await q.click('#bCont6'); await q.waitForTimeout(500);
  const st2 = await q.evaluate(() => [B && B.round, B && B.turn, B && B.units.map(u => u.hp).join(','), B && B.log.length, !$('battle').classList.contains('hidden'), !!sel]);
  const fin = await q.evaluate(async () => { quick = true; fast = true; sixLoop(); let n = 0; while (!B.over && n++ < 400) await sleep(40); await sleep(200); return [B.over, $('mbox').querySelector('h2').textContent, !!$('mbox').querySelector('.vx'), localStorage.getItem('the-six-v1-battle')]; });
  await q.screenshot({ path: out + 'w_result.png' }); await q.evaluate(() => afterResult(1)); await q.screenshot({ path: out + 'w_camp6.png' }); await q.evaluate(() => sheet(0)); await q.screenshot({ path: out + 'w_sheet.png' });
  // 3. legion: siege guard order, layout, resume
  p = await P('?day=12'); const r3 = await p.evaluate(async () => { S.fly = false; toSands(); const o = S.cohorts.map(c => c.order).join(','); fast = true; await endTurn(); await endTurn(); const hs = B.units.filter(u => u.side === 'H' && u.hp > 0); const xs = hs.map(u => u.x), ys = hs.map(u => u.y); return [o, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), B.round, cell]; });
  await p.screenshot({ path: out + 'w_legion.png' });
  const ph = await P('?six=1&day=9', 380, 700); await ph.evaluate(() => { S.fly = false; toSands(); }); await ph.screenshot({ path: out + 'w_phone.png' });
  console.log('size', sz, '\ntip/undo', r1, '\nsound', r2, '\nsave', JSON.stringify(st1) === JSON.stringify(st2.slice(0, 4)), st2.slice(4), fin, '\nsiege', r3, errs); await br.close(); })();
