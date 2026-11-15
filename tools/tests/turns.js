const URL0 = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async () => { const br = await chromium.launch(); const p = await br.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/user/arena/index.html?six=1&day=6');
  const r = await p.evaluate(async () => { const o = []; S.fly = false; toSands(); fast = true; await endTurn(); while (!sel) await sleep(40);
    const u = sel; window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); o.push(sel === u);           // Escape keeps the turn
    sel = null; refresh(); o.push(sel === u, $('panel').innerHTML.includes('Delay'));                                   // lost selection recovers
    sel = null; await endTurn(); await sleep(400); o.push(u.acted === true);                                           // End turn works without a selection
    let th = 0, n = 0; for (let i = 0; i < 300; i++) { rollInit(B); const hs = B.order.filter(x => x.side === 'H'); th += hs.findIndex(x => x.cls === 'thief'); n++; } o.push('thief avg place among six: ' + (th / n + 1).toFixed(2));
    return o; });
  console.log(r, errs); await br.close(); })();
