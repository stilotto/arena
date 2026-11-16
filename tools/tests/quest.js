const URL0 = 'file://' + require('path').resolve(__dirname, '../../index.html');
const { chromium } = require('playwright');
(async () => { const out = process.argv[2] + '/'; const br = await chromium.launch(); const errs = [];
  const P = async (url, w, h) => { const p = await br.newPage({ viewport: { width: w || 1100, height: h || 640 } }); p.on('pageerror', e => errs.push(url + ': ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text())); await p.goto(URL0 + url); return p; };
  const still = (p, k) => p.evaluate(k => { flyEnd && flyEnd(); $('fly').classList.remove('hidden', 'out'); A3.buildRoom(B.room); fitCanvas(flyc, fg, innerWidth, innerHeight); A3.render(fg, innerWidth, innerHeight, A3.fly(k, innerWidth / innerHeight, 1), 1, camUnits(B), { doors: {} }); }, k);
  const p = await P('?six=1&day=9'); await p.evaluate(() => { S.fly = false; leave(); }); await p.screenshot({ path: out + 'q_leave.png' });
  let n = 0;
  for (const [pl, rooms] of [['crypt', [0, 2, 3]], ['tower', [0, 3]], ['slum', [0, 2, 3]], ['sewer', [0, 3]], ['market', [0, 3]], ['ship', [0, 3]]]) for (const rm of rooms) {
    await p.evaluate(([pl, rm]) => { closeModal(); beginQuest(S, pl); S.quest.room = rm; enterRoom(); }, [pl, rm]);
    await p.screenshot({ path: out + 'q_' + pl + rm + '.png' });
    if (rm === 0 || rm === 3) { await still(p, .42); await p.screenshot({ path: out + 'q_' + pl + rm + '_fly.png' }); await p.evaluate(() => $('fly').classList.add('hidden')); }
    await p.evaluate(() => { delete S.quest; });
  }
  // a whole quest on quick fight through the UI
  const r = await p.evaluate(async () => { const o = []; closeModal(); S.heroes.forEach(h => h.hp = h.max); beginQuest(S, 'slum'); enterRoom(); fast = true;
    for (let room = 0; room < 4; room++) { quick = true; await endTurn(); let g = 0; while (!B.over && g++ < 600) await sleep(40); await sleep(80); const t = $('mbox').querySelector('h2'); o.push(t ? t.textContent : 'none'); if (!S.quest) break; if (room === 0) { bTend(); } enterRoom(); }
    o.push(!!S.quest, S.questDay === S.day, S.heroes.every(h => h.dead || h.hp === h.max)); return o; });
  await p.screenshot({ path: out + 'q_end.png' });
  await p.evaluate(() => { closeModal(); camp(); }); await p.screenshot({ path: out + 'q_camp.png' });
  console.log(r, errs); await br.close(); })();
