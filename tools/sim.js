// Headless balance check: plays the campaign on standing orders only.
//   node tools/sim.js [runs] [days]
const E = require('../engine.js');
const runs = +process.argv[2] || 5, days = +process.argv[3] || 31;

function spend(S) {
  // train whoever is ready, then buy gear for the cohorts, cheapest first
  for (const h of E.living(S).filter(E.canTrain).sort((a, b) => a.lvl - b.lvl)) { const c = E.trainCost(h); if (S.gold >= c) { S.gold -= c; E.levelUp(h); } }
  let bought = true;
  while (bought) {
    bought = false;
    for (const cls of E.ORDER) for (const k of ['armor', 'arms']) { const gr = S.gear[cls], c = E.TIERCOST[gr[k] + 1]; if (c && S.gold >= c) { S.gold -= c; gr[k]++; bought = true; } }
  }
}
function pick(S) {
  const cap = E.gateCap(S.day);
  return S.cohorts.map((c, ci) => ci).filter(ci => E.living(S, ci).length)
    .sort((a, b) => { const r = ci => { const l = E.living(S, ci); return l.reduce((s, h) => s + h.hp / h.max, 0) / 10; }; return r(b) - r(a); }).slice(0, cap);
}
if (process.argv[4] === 'six') { // node tools/sim.js 5 31 six : a party on quick fight, buying the best body armour and weapon it can
  const res = [];
  for (let r = 0; r < runs; r++) {
    const used = {}, S = E.newParty(['fighter', 'paladin', 'cleric', 'mage', 'thief', 'ranger'].map(cls => Object.assign({ cls, name: E.randomName(used) }, E.rollStats(cls))));
    const line = []; let wipes = 0;
    while (S.day <= days && wipes < 25) {
      for (const h of S.heroes) if (!h.dead && E.canTrain(h) && S.gold >= E.trainCost(h)) { S.gold -= E.trainCost(h); E.levelUp(h); }
      for (const h of S.heroes) if (h.dead && S.gold >= E.raiseCost(h)) { S.gold -= E.raiseCost(h); E.raise(h); h.hp = h.max; }
      for (const h of S.heroes) if (!h.dead) for (const id of S.inv.slice()) { const i = E.ITEMS[id], cur = E.ITEMS[h.eq[i.slot === 'ring' ? 'ring1' : i.slot]]; if (i.use.includes(h.cls === 'mage' ? 'M' : h.cls[0].toUpperCase()) && i.slot !== 'weapon' && (!cur || (i.ac || 0) > (cur.ac || 0))) E.equip(S, h, id); }
      const st = E.shopStock(S.day);
      for (const h of S.heroes) if (!h.dead) for (const id of st.plain.concat(st.magic)) { const i = E.ITEMS[id], cur = E.ITEMS[h.eq.body]; if (i.slot === 'body' && i.use.includes(h.cls === 'mage' ? 'M' : h.cls[0].toUpperCase()) && S.gold >= i.cost && (i.ac || 0) > ((cur && cur.ac) || 0)) { S.gold -= i.cost; S.inv.push(id); E.equip(S, h, id); } }
      if (!E.living(S).length) { wipes = 9; break; }
      if (process.argv[5] === 'quest') { // one side quest before each arena day
        const pl = ['crypt', 'tower', 'slum', 'sewer', 'market', 'ship'][S.day % 6]; E.beginQuest(S, pl); let how = 'done', rooms = 0;
        while (S.quest.room < 4) { const b = E.startRoom(S); b.nofx = true; while (!E.checkOver(b)) E.autoRound(b, S); const r = E.finishRoom(S, b); if (!r.win) { how = 'lost'; break; } rooms++; E.tend(S); }
        E.endQuest(S, how); line.push(`[${pl.slice(0, 2)}${rooms}${how === 'lost' ? 'x' : ''}]`);
      }
      const d = S.day, before = E.living(S).length, b = E.startBattle(S, [0]); b.nofx = true;
      while (!E.checkOver(b)) E.autoRound(b, S);
      const out = E.finishBattle(S, b); if (!out.win) wipes++;
      line.push(`${d}${out.win ? '' : 'x'}:${before - E.living(S).length}d/f${b.units.filter(u => u.side === 'E').length}/L${Math.max(...S.heroes.map(h => h.lvl))}`);
    }
    res.push(`party ${r + 1}: reached day ${S.day}, alive ${E.living(S).length}, gold ${S.gold}\n  ` + line.join(' '));
  }
  console.log(res.join('\n')); process.exit(0);
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
    line.push(`${d}${res.win ? '' : 'x'}${b.doors.length > 1 ? '*' + b.doors.length : ''}:${before - L.length}d/${L.length}/L${avg}/r${b.round}/f${b.units.filter(u => u.side === 'E').length}`);
    if (losses > 12) break;
  }
  rows.push(`run ${r + 1}: reached day ${S.day}, alive ${E.living(S).length}, gold ${S.gold}, lost battles ${losses}\n  ` + line.join(' '));
}
console.log(rows.join('\n'));
