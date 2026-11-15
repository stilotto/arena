const URL0 = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async () => { const out = process.argv[2] + '/'; const br = await chromium.launch(); const errs = [];
  const p = await br.newPage({ viewport: { width: 1100, height: 760 } }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file:///home/user/arena/index.html?six=1&day=9');
  const shots = JSON.parse(process.argv[3]);
  for (const [pl, rm, seed] of shots) { await p.evaluate(([pl, rm, seed]) => { S.fly = false; closeModal(); beginQuest(S, pl); S.quest.room = rm; S.quest.seed = seed; enterRoom(); }, [pl, rm, seed]); await p.waitForTimeout(350);
    await p.locator('#cv').screenshot({ path: out + 'b_' + pl + rm + '_' + seed + '.png' }); await p.evaluate(() => { delete S.quest; }); }
  console.log(errs); await br.close(); })();
