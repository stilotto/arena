// Headless balance check: plays the campaign on standing orders only.
//   node tools/sim.js [runs] [days]
const E = require('../engine.js');
const runs = +process.argv[2] || 5, days = +process.argv[3] || 30;

function spend(S) {
  // train whoever is ready, then buy gear for the cohorts, cheapest first
  for (const h of E.living(S).filter(E.canTrain).sort((a, b) => a.lvl - b.lvl)) { const c = E.trainCost(h); if (S.gold >= c) { S.gold -= c; E.levelUp(h); } }
  let bought = true;
  while (bought) {
    bought = false;
    for (const co of S.cohorts) for (const k of ['armor', 'arms']) { const c = E.TIERCOST[co[k] + 1]; if (c && S.gold >= c) { S.gold -= c; co[k]++; bought = true; } }
  }
}
function pick(S) {
  const cap = E.gateCap(S.day);
  return S.cohorts.map((c, ci) => ci).filter(ci => E.living(S, ci).length)
    .sort((a, b) => { const r = ci => { const l = E.living(S, ci); return l.reduce((s, h) => s + h.hp / h.max, 0) / 10; }; return r(b) - r(a); }).slice(0, cap);
}
const rows = [];
for (let r = 0; r < runs; r++) {
  const S = E.newCampaign(); let losses = 0; const line = [];
  while (S.day <= days && E.living(S).length) {
    spend(S);
    const d = S.day, before = E.living(S).length, b = E.startBattle(S, pick(S)); b.nofx = true;
    while (!E.checkOver(b)) E.autoRound(b, S);
    const res = E.finishBattle(S, b);
    if (!res.win) losses++;
    const L = E.living(S), avg = L.length ? (L.reduce((s, h) => s + h.lvl, 0) / L.length).toFixed(1) : 0;
    line.push(`${d}${res.win ? '' : 'x'}:${before - L.length}d/${L.length}/L${avg}/r${b.round}`);
    if (losses > 12) break;
  }
  rows.push(`run ${r + 1}: reached day ${S.day}, alive ${E.living(S).length}, gold ${S.gold}, lost battles ${losses}\n  ` + line.join(' '));
}
console.log(rows.join('\n'));
