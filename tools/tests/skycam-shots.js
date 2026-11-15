const URL0 = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async () => { const out = process.argv[2] + '/'; const br = await chromium.launch(); const errs = [];
  const p = await br.newPage({ viewport: { width: 1100, height: 640 } }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file:///home/user/arena/index.html?six=1&day=9');
  const shots = JSON.parse(process.argv[3]); let ms = 0;
  for (const [pl, rm, seed, k] of shots) { ms = await p.evaluate(([pl, rm, seed, k]) => { S.fly = false; closeModal(); if (!S.quest || S.quest.place !== pl || S.quest.room !== rm || S.quest.seed !== seed) { beginQuest(S, pl); S.quest.room = rm; S.quest.seed = seed; enterRoom(); } $('fly').classList.remove('hidden', 'out'); A3.buildRoom(B.room); fitCanvas(flyc, fg, innerWidth, innerHeight); const t0 = performance.now(); A3.render(fg, innerWidth, innerHeight, A3.fly(k, innerWidth / innerHeight, 1), 3.3, camUnits(B), { doors: {} }); return performance.now() - t0; }, [pl, rm, seed, k]);
    await p.screenshot({ path: out + 'f_' + pl + rm + '_' + seed + '_' + Math.round(k * 100) + '.png' }); }
  console.log(errs, 'ms', ms.toFixed(1)); await br.close(); })();
