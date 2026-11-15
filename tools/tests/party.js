const URL0 = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async () => { const out = process.argv[2] + '/'; const br = await chromium.launch(); const errs = [];
  const P = async (url, w, h) => { const p = await br.newPage({ viewport: { width: w || 1100, height: h || 640 } }); p.on('pageerror', e => errs.push(url + ': ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text())); await p.goto(URL0 + url); return p; };
  let p = await P(''); await p.waitForTimeout(300); await p.screenshot({ path: out + 's_title.png' });
  await p.click('#bNew6'); await p.screenshot({ path: out + 's_create.png' });
  await p.evaluate(() => { cSet(2, 'cls', 'druid'); cRoll(0); begin6(); }); await p.screenshot({ path: out + 's_camp.png' });
  await p.evaluate(() => sheet(3)); await p.screenshot({ path: out + 's_sheet1.png' });
  await p.evaluate(() => { closeModal(); S.fly = false; toSands(); }); 
  const r = await p.evaluate(async () => { const o = []; fast = true; await endTurn(); o.push(!!B.order, sel && sel.name);
    // play by hand: each hero attacks or moves toward nearest foe; then ends
    let guard = 0; while (!B.over && guard++ < 200) { if (!sel) { await sleep(50); continue; } const u = sel, f = nearest(u, foesOf(B, u)); tap(f.x, f.y); await sleep(20); if (sel === u && !u.acted && !B.over) { endTurn(); await sleep(20); } }
    o.push(B.over, B.round); return o; });
  await p.screenshot({ path: out + 's_result.png' });
  p = await P('?six=1&day=17'); await p.screenshot({ path: out + 's_camp17.png' });
  await p.evaluate(() => sheet(0)); await p.screenshot({ path: out + 's_sheet.png' });
  const r2 = await p.evaluate(() => { const h = S.heroes[0], ac0 = sixAC(h); don(0, 'rprot'); const ac1 = sixAC(h); doff(0, 'off'); const ac2 = sixAC(h); don(0, 'flame'); const k = figKey(h); mem(3, 'sleep', -1); return [ac0, ac1, ac2, h.eq.weapon, S.inv.length, k.length > 10]; });
  await p.screenshot({ path: out + 's_sheet2.png' });
  await p.evaluate(() => { closeModal(); shop6(); }); await p.screenshot({ path: out + 's_shop.png' });
  await p.evaluate(() => { closeModal(); S.fly = false; toSands(); }); await p.screenshot({ path: out + 's_deploy.png' });
  await p.evaluate(async () => { fast = false; await endTurn(); }); await p.waitForTimeout(1500); await p.screenshot({ path: out + 's_battle.png' });
  const r3 = await p.evaluate(async () => { fast = true; quick = true; sixLoop(); let n = 0; while (!B.over && n++ < 400) await sleep(50); return [B.over, B.round, $('mbox').querySelector('h2') && $('mbox').querySelector('h2').textContent]; });
  await p.screenshot({ path: out + 's_end.png' });
  const p2 = await P('?six=1&day=17&fight=1'); await p2.waitForTimeout(3500); await p2.screenshot({ path: out + 's_fly.png' });
  const ph = await P('?six=1&day=9', 380, 700); await ph.screenshot({ path: out + 's_phone.png' }); await ph.evaluate(() => sheet(1)); await ph.screenshot({ path: out + 's_phone2.png' });
  // legion still fine + assembly swap
  const p3 = await P('?day=6'); const r4 = await p3.evaluate(() => { assembly(); const a = S.heroes[0], b = S.heroes[10]; aTap(0); aTap(10); const sw = a.ci === 1 && b.ci === 0; aTap(1); aMove(-1); return [sw, living(S, -1).length, living(S, 0).length]; });
  await p3.screenshot({ path: out + 's_asm.png' });
  console.log(r, r2, r3, r4, errs); await br.close(); })();
