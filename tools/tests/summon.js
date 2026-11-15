const URL0 = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async () => { const br = await chromium.launch(); const errs = []; const p = await br.newPage({ viewport: { width: 1366, height: 600 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/user/arena/index.html?six=1&day=9');
  const r = await p.evaluate(async () => { S.fly = false; beginQuest(S, 'slum'); S.quest.room = 3; enterRoom(); const boss = B.units.find(u => u.boss); const n0 = B.units.length; S.heroes.forEach(h => h.hp = h.max = 999); B.units.forEach(u => { if (u.side === 'H') { u.hp = u.max = 999; u.thac0 = 40; } });
    B.phase = null; S.cohorts[0].order = 'hold'; for (let i = 0; i < 14 && !B.over; i++) autoRound(B, S);
    const free = [boss.calls, B.log.some(l => l.includes('about to call'))];
    cycleLight(); const lit = [$('bLit').textContent, lightLv]; cycleLight(); cycleLight(); return [free, lit]; });
  console.log(JSON.stringify(r), errs); await br.close(); })();
