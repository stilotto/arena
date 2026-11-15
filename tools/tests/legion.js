const URL0 = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async () => { const out = process.argv[2] + '/'; const br = await chromium.launch(); const errs = [];
  const P = async (url, w, h) => { const p = await br.newPage({ viewport: { width: w || 1100, height: h || 640 } }); p.on('pageerror', e => errs.push(url + ': ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text())); await p.goto(URL0 + url); return p; };
  const still = (p, k, intro) => p.evaluate(([k, intro]) => { flyEnd && flyEnd(); $('fly').classList.remove('hidden', 'out'); const sc = A3.build(B.w, B.h); fitCanvas(flyc, fg, innerWidth, innerHeight); const us = camUnits(B), doors = {};
    const ease = t => t * t * (3 - 2 * t), cl = t => Math.max(0, Math.min(1, t)); const cnt = {}; let list = us;
    for (const d of B.doors) doors[d] = intro ? ease(cl((k - .08) / .12)) : 1;
    if (intro) { for (const u of us) if (u.side === 'E') { const dp = A3.door(u.door); u.lag = (cnt[u.door] = (cnt[u.door] || 0) + 1); u.dp = dp; } list = us.filter(u => { if (u.side !== 'E') return true; const p = ease(cl((k - .16 - u.lag / cnt[u.door] * .16) / .34)); u.x = u.dp[0] + (u.x - u.dp[0]) * p; u.y = u.dp[1] + (u.y - u.dp[1]) * p; return p > 0; }); }
    A3.render(fg, innerWidth, innerHeight, A3.fly(k, innerWidth / innerHeight, B.doors.length), 1, list, { doors }); }, [k, intro]);
  let p = await P('?day=12&fight=1');
  for (const k of [.14, .28, .42, .6]) { await still(p, k, true); await p.screenshot({ path: out + 'h_siege' + k * 100 + '.png' }); }
  await p.evaluate(() => { $('fly').classList.add('hidden'); }); await p.screenshot({ path: out + 'h_deploy.png' });
  // deployment swap, begin, play a few rounds with ZoC
  const r = await p.evaluate(async () => { const o = []; const hs = B.units.filter(u => u.side === 'H'); const a = hs[0], c = hs[50]; const ax = a.x, ay = a.y; tap(a.x, a.y); tap(c.x, c.y); o.push(a.x !== ax || a.y !== ay); o.push(B.phase);
    fast = true; await endTurn(); o.push(B.phase); for (let i = 0; i < 3; i++) await endTurn(); o.push(B.round); return o; });
  await p.screenshot({ path: out + 'h_fight.png' });
  p = await P('?day=31'); await p.screenshot({ path: out + 'h_final.png' });
  await p.evaluate(() => assembly()); await p.evaluate(() => { aClass('cleric'); aTap(0); aTap(1); }); await p.screenshot({ path: out + 'h_asm.png' });
  const r2 = await p.evaluate(() => { asel.clear(); aTap(0); aTap(1); aMove(3); const full = living(S, 3).length; asel.clear(); aClass('mage'); aMove(0); const o = [full, living(S, 0).length, living(S, 5).length]; aPreset(1); o.push(living(S, 0).length); aPreset(0); closeModal(); camp(); shop(); return o; });
  await p.screenshot({ path: out + 'h_shop.png' });
  await p.evaluate(() => { closeModal(); toSands(); }); await still(p, .45, true); await p.screenshot({ path: out + 'h_vhorax.png' });
  const r3 = await p.evaluate(async () => { $('fly').classList.add('hidden'); fast = true; auto = false; await endTurn(); let n = 0; while (!B.over && n++ < 60) await endTurn(); return [B.over, B.round, $('modal').classList.contains('hidden') ? '' : $('mbox').querySelector('h2').textContent]; });
  await p.screenshot({ path: out + 'h_end.png' });
  const ph = await P('?day=9', 380, 700); await ph.evaluate(() => assembly()); await ph.screenshot({ path: out + 'h_asm_phone.png' });
  console.log(r, r2, r3, errs); await br.close(); })();
