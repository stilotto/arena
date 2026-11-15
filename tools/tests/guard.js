const URL0 = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async () => { const br = await chromium.launch(); const errs = []; const p = await br.newPage({ viewport: { width: 1366, height: 600 } }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/user/arena/index.html?six=1&day=6');
  const r = await p.evaluate(async () => { S.fly = false; toSands(); fast = true; await endTurn(); let n = 0, struck = 0, guards = 0;
    while (!B.over && n++ < 300) { if (sel && !busy) { const u = sel; act(() => { u.guard = true; u.acted = true; }); guards++; } await sleep(25); struck = B.log.filter(l => l.includes('was on guard')).length; if (struck >= 2) break; }
    return [guards > 0, struck, $('panel').innerHTML.includes('Guard') || B.over !== null, tipText(0, 0).includes('critical')]; });
  console.log(r, errs); await br.close(); })();
