'use strict';
/* The Six: screens for the party mode. Rules are in engine.js; shared battle code is in ui.js. */
let draft = null, quick = false, sheetAt = 0;
const figH = (h, px) => fig(figKey(h), px);
const diceText = d => d[0] + 'd' + d[1] + (d[2] ? '+' + d[2] : '');
function itemText(i) {
  const p = [];
  if (i.dice) p.push(diceText(i.rdice || i.dice) + (i.range ? ', range ' + i.range : '') + (i.two ? ', two-handed' : ''));
  if (i.ac) p.push('armour ' + i.ac);
  if (i.hit && !i.note) p.push('+' + i.hit + ' to hit and damage');
  if (i.note) p.push(i.note);
  return p.join('. ');
}
const users = i => ORDER.filter(c => i.use.includes(LET[c])).map(c => `<span class="mb" style="background:${CL[c].col}">${CL[c].g}</span>`).join('');

/* ---------- gathering the party ---------- */
function create6() {
  if (!draft) { const used = {}; draft = ['fighter', 'paladin', 'cleric', 'mage', 'thief', 'ranger'].map(cls => { const n = randomName(used); used[n] = 1; return Object.assign({ cls, name: n }, rollStats(cls)); }); }
  B = null; S = null; show('camp');
  let h = `<div class="bar"><h2>Gather the Six</h2><span class="sp"></span><button class="sm" onclick="help()">?</button></div>
  <div class="card">Choose six from the ten callings. You will lead each of them by hand, so pick a party you want to play: someone to hold the front, someone to heal, someone to cast.</div>`;
  draft.forEach((p, i) => {
    h += `<div class="prow">${fig(p.cls, 58)}<div><div class="row"><select onchange="cSet(${i},'cls',this.value)">${ORDER.map(c => `<option value="${c}" ${c === p.cls ? 'selected' : ''}>${CL[c].n}</option>`).join('')}</select>
      <input type="text" value="${p.name}" maxlength="14" size="12" onchange="cSet(${i},'name',this.value)"></div>
      <div class="small mute">Str ${p.str} · Dex ${p.dex} · Con ${p.con} · ${CL[p.cls].note}</div></div><button class="sm" onclick="cRoll(${i})">Reroll</button></div>`;
  });
  h += `<div class="foot"><button onclick="draft=null;show('title')">Back</button><button class="go" onclick="begin6()">Enter the arena</button></div>`;
  $('camp').innerHTML = h;
}
function cSet(i, k, v) { if (k === 'cls') { draft[i].cls = v; Object.assign(draft[i], rollStats(v)); } else draft[i].name = (v || '').replace(/[<>&"]/g, '').trim() || draft[i].name; create6(); }
function cRoll(i) { Object.assign(draft[i], rollStats(draft[i].cls)); create6(); }
function begin6() { S = newParty(draft); draft = null; save(); camp(); }

/* ---------- camp ---------- */
function camp6() {
  B = null; show('camp'); save();
  const bl = billing(S.day, true), alive = living(S), fin = bl.final && !S.ending, heal = healerCanRaise(S);
  let h = `<div class="bar"><h2>Day ${roman(S.day)}</h2><span>The Six</span><span class="gold">${S.gold} gp</span><span>Potions ${S.potions}</span>${S.dev ? '<span class="gold small">DEV, not saved</span>' : ''}<span class="sp"></span><button class="sm ${S.fly === false ? '' : 'on'}" onclick="S.fly=S.fly===false;camp()">Skycam: ${S.fly === false ? 'off' : 'on'}</button><button class="sm" onclick="help()">?</button></div>
  ${S.ending ? `<div class="card"><span class="gold">${S.ending === 'served' ? 'The Six march under Vhorax now. The games go on while he gathers his strength.' : 'Vhorax is dead and the gates stand open. Those who stay fight for the purse alone.'}</span></div>` : ''}
  <div class="card"><h3>Today's games: ${bl.title}</h3>${fin ? '<p style="margin:2px 0 6px">The Editor of the Games comes down from his box. "Six. I took a hundred and it is six who are worth the keeping. Kneel, and march with me. Or refuse, and I will start again."</p>' : ''}${billingText(bl)}.<br>
  <span class="mute">${bl.sides > 1 ? '<b class="gold">Ambush:</b> they come through two gates. ' : ''}Purse: ${bl.purse} gp.</span>
  ${fin ? '<div class="row" style="margin-top:6px"><button onclick="kneel()">Kneel to Vhorax</button><span class="mute small">or go to the sands to defy him.</span></div>' : ''}</div>`;
  S.heroes.forEach((x, i) => {
    const k = kit(x), w = k.w;
    h += `<div class="prow ${x.dead ? 'dead' : ''}">${figH(x, 58)}<div><span class="nm cz">${x.name}</span> <span class="meta">${CL[x.cls].n} ${x.lvl}${x.dead ? ' · <b>fallen</b>' : ` · HP ${x.hp}/${x.max} · AC ${sixAC(x, k)} · ${w ? w.n : 'unarmed'}`}</span>
      <div class="hpb"><i style="width:${x.dead ? 0 : 100 * x.hp / x.max}%"></i></div><div class="small mute">XP ${x.xp}/${xpNeed(x.lvl)}${canTrain(x) ? ' · <span class="gold">ready to train</span>' : ''}</div></div>
      <div class="row">${x.dead ? (heal ? `<button class="sm on" onclick="raise6(${i},1)">Healer raises</button>` : '') + `<button class="sm" ${S.gold >= raiseCost(x) ? '' : 'disabled'} onclick="raise6(${i})">Temple raises, ${raiseCost(x)} gp</button>`
        : (canTrain(x) ? `<button class="sm on" ${S.gold >= trainCost(x) ? '' : 'disabled'} onclick="train6(${i})">Train, ${trainCost(x)} gp</button>` : '') + `<button class="sm" onclick="sheet(${i})">Sheet</button>`}</div></div>`;
  });
  h += `<div class="foot"><button onclick="shop6()">Quartermaster</button><button onclick="sheet(sheetAt)">Stash (${S.inv.length})</button>${S.quest ? `<button class="on" onclick="enterRoom()">Resume quest (room ${S.quest.room + 1})</button>` : `<button ${S.questDay === S.day || !alive.length ? 'disabled' : ''} onclick="leave()">${S.questDay === S.day ? 'Leave used today' : 'Ask leave: side quest'}</button>`}
    <button class="go" ${alive.length ? '' : 'disabled'} onclick="toSands()">To the sands</button></div>
    <p class="more mute">The party rests fully each night and spells return. <a href="https://stilotto.github.io/">More games from Stilotto</a></p>`;
  $('camp').innerHTML = h;
}
function train6(i) { const x = S.heroes[i], c = trainCost(x); if (!canTrain(x) || S.gold < c) return; S.gold -= c; levelUp(x); camp(); }
function raise6(i, byHealer) {
  const x = S.heroes[i];
  if (byHealer) { if (!healerCanRaise(S)) return; S.raisedDay = S.day; } else { if (S.gold < raiseCost(x)) return; S.gold -= raiseCost(x); }
  raise(x); S.fallen = Math.max(0, S.fallen - 1); camp();
}

/* ---------- character sheet and paper doll ---------- */
function sheet(i) {
  sheetAt = i = (i + 6) % 6; const x = S.heroes[i], k = kit(x), w = k.w, n = slotsFor(x), used = memCount(x);
  let h = `<h2>${x.name} <span class="small mute">${CL[x.cls].n} ${x.lvl}${x.dead ? ' · fallen' : ''}</span></h2><div class="sheet"><div><canvas id="doll" width="440" height="560"></canvas>
    <div class="small" style="margin-top:6px">HP <b>${x.hp}/${x.max}</b> · AC <b>${sixAC(x, k)}</b> · THAC0 <b>${sixThac0(x, k)}</b><br>Damage <b>${w ? diceText(w.rdice || w.dice) : x.cls === 'monk' ? '1d6' : '1d2'}${k.dmg + strDmg(x.str) ? '+' + (k.dmg + strDmg(x.str)) : ''}</b> · Move <b>${CL[x.cls].mv + k.mv}</b><br>Str ${x.str} · Dex ${x.dex} · Con ${x.con} · Kills ${x.kills}<br><span class="mute">${CL[x.cls].note}</span></div></div><div>`;
  for (const [s, lab] of SLOTS) { const it = ITEMS[x.eq[s]]; h += `<button class="slotb ${it && it.tier ? 'on' : ''}" ${it ? `onclick="doff(${i},'${s}')"` : 'disabled'} title="${it ? itemText(it) : ''}"><span>${lab}</span><span>${it ? it.n + ' ✕' : (s === 'off' && w && w.two ? 'two-handed weapon' : 'empty')}</span></button>`; }
  if (n) {
    h += `<div class="line"><b>Spells for the day</b><span class="mute small">${used}/${n} memorised</span></div>`;
    for (const id of known(x)) h += `<div class="row" style="margin:2px 0"><button class="sm" ${x.mem[id] ? '' : 'disabled'} onclick="mem(${i},'${id}',-1)">−</button><b>${x.mem[id] || 0}</b><button class="sm" ${used < n ? '' : 'disabled'} onclick="mem(${i},'${id}',1)">+</button><span>${SPELLS[id].n}</span></div>`;
    const later = (BOOK[x.cls] || []).filter(b => b[1] > x.lvl); if (later.length) h += `<div class="small mute">Still to learn: ${later.map(b => SPELLS[b[0]].n + ' at level ' + b[1]).join(', ')}.</div>`;
  }
  h += `<div class="line"><b>Stash</b><span class="mute small">tap Wear to equip; what it replaces comes back here</span></div><div class="items">`;
  const cnt = {}; for (const id of S.inv) cnt[id] = (cnt[id] || 0) + 1;
  const ids = Object.keys(cnt).sort((a, b) => (canUse(x, b) ? 1 : 0) - (canUse(x, a) ? 1 : 0) || ITEMS[b].cost - ITEMS[a].cost);
  for (const id of ids) { const it = ITEMS[id], ok = canUse(x, id) && !x.dead; h += `<div class="line" style="border:0;padding:2px 0"><span class="${it.tier ? 'gold' : ''}">${it.n}${cnt[id] > 1 ? ' ×' + cnt[id] : ''}</span><span class="small mute">${itemText(it)}</span><span class="sp"></span><button class="sm" ${ok ? '' : 'disabled'} onclick="don(${i},'${id}')">${ok ? 'Wear' : 'Cannot use'}</button><button class="sm" onclick="sell(${i},'${id}')">Sell ${Math.floor(it.cost / 2)}</button></div>`; }
  if (!ids.length) h += '<div class="small mute">Nothing in the stash. The quartermaster sells gear, and champions carry loot.</div>';
  h += `</div></div></div><div class="end"><button onclick="sheet(${i - 1})">◀ ${S.heroes[(i + 5) % 6].name}</button><button onclick="sheet(${i + 1})">${S.heroes[(i + 1) % 6].name} ▶</button><button onclick="closeModal();shop6()">Quartermaster</button><button class="go" onclick="closeModal();camp()">Done</button></div>`;
  modal(h); $('mbox').classList.add('wide');
  const c = $('doll').getContext('2d'); c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(220, 500, 120, 26, 0, 0, 7); c.fill();
  if (x.dead) c.globalAlpha = .35;
  FIG.draw(c, figKey(x), 220, 500, 330, 1);
}
function don(i, id) { const e = equip(S, S.heroes[i], id); save(); sheet(i); if (e) alert(e); }
function doff(i, s) { unequip(S, S.heroes[i], s); save(); sheet(i); }
function sell(i, id) { const at = S.inv.indexOf(id); if (at < 0) return; S.inv.splice(at, 1); S.gold += Math.floor(ITEMS[id].cost / 2); save(); sheet(i); }
function mem(i, id, d) { const x = S.heroes[i]; if (d > 0 && memCount(x) >= slotsFor(x)) return; x.mem[id] = Math.max(0, (x.mem[id] || 0) + d); if (!x.mem[id]) delete x.mem[id]; save(); sheet(i); }

/* ---------- quartermaster ---------- */
function shop6() {
  const st = shopStock(S.day);
  const line = id => { const it = ITEMS[id]; return `<div class="line"><span class="${it.tier ? 'gold' : ''}">${it.n}</span><span class="small mute">${itemText(it)}</span><span class="sp"></span>${users(it)}<button class="sm" ${S.gold >= it.cost ? '' : 'disabled'} onclick="buy6('${id}')">${it.cost} gp</button></div>`; };
  let h = `<h2>Quartermaster</h2><p class="mute" style="margin:0 0 6px">"Six of you. Fewer mouths, better steel." You have <b class="gold">${S.gold} gp</b>. Purchases go to the stash; wear them from a hero's sheet.</p>
  <div class="line"><span>Healing potion (${S.potions} held)</span><span class="sp"></span><button class="sm" ${S.gold >= 30 ? '' : 'disabled'} onclick="buy6('potion')">30 gp</button></div>
  <div class="line"><b>Rare pieces today</b></div>${st.magic.map(line).join('')}`;
  for (const [s, lab] of [['weapon', 'Weapons'], ['body', 'Armour'], ['off', 'Shields'], ['head', 'Headgear'], ['cloak', 'Cloaks and boots']]) h += `<div class="line"><b>${lab}</b></div>` + st.plain.filter(id => ITEMS[id].slot === s || (s === 'cloak' && ITEMS[id].slot === 'boots')).map(line).join('');
  modal(h + `<div class="end"><button onclick="closeModal();sheet(sheetAt)">Sheets</button><button class="go" onclick="closeModal();camp()">Done</button></div>`); $('mbox').classList.add('wide');
}
function buy6(id) {
  if (id === 'potion') { if (S.gold < 30) return; S.gold -= 30; S.potions++; }
  else { const it = ITEMS[id]; if (S.gold < it.cost) return; S.gold -= it.cost; S.inv.push(id); }
  save(); const y = $('mbox').scrollTop; shop6(); $('mbox').scrollTop = y;
}

/* ---------- battle: initiative, one actor at a time ---------- */
function initStrip() {
  if (!B.order) return '<span class="mute small">Initiative is rolled when the battle begins.</span>';
  const up = B.order.slice(B.turn).filter(u => u.hp > 0 && !u.acted).slice(0, 14);
  return `<div class="strip"><span class="mute small">Round ${B.round}, next:</span>${up.map((u, i) => `<img class="fig ${i ? '' : 'now'}" src="${FIG.url(u.side === 'H' ? u.key : u.mid)}" style="height:${i ? 30 : 40}px" alt="" title="${u.name}">`).join('')}</div>`;
}
function sixNext() { const u = B.order[B.turn]; if (u && u.st.root && !--u.st.root) delete u.st.root; if (u) u.acted = true; B.turn++; drop(); sixLoop(); }
async function sixLoop() {
  if (busy || !B) return;
  busy = true; const b = B, wait = () => sleep(fast || RM ? 30 : 330);
  while (B === b && !checkOver(b)) {
    if (b.turn >= b.order.length) { endRound(b); if (checkOver(b)) break; rollInit(b); continue; }
    const u = b.order[b.turn];
    if (u.hp <= 0 || u.acted) { b.turn++; continue; }
    if (u.side === 'E') { foeAct(b, u); u.acted = true; b.turn++; refresh(); await wait(); continue; }
    if (u.st.sleep || u.st.stun) { skipTurn(b, u); u.acted = true; b.turn++; continue; }
    if (quick) { S.cohorts[0].order = 'attack'; S.cohorts[0].spells = true; heroAct(b, u, S); u.acted = true; b.turn++; refresh(); await wait(); continue; }
    busy = false; pickUnit(u); refresh(); return; // this hero is yours to command
  }
  busy = false; if (B === b && b.over) result();
}
function result6(r, left, yielded) {
  if (r.final) return modal(freeEnding() + `<div class="end"><button class="go" onclick="afterResult(${left})">Onward</button></div>`);
  let h = `<h2>${r.win ? 'Victory' : yielded ? 'Mercy is granted' : r.draw ? 'A draw' : left ? 'Dragged from the sand' : 'The Six are no more'}</h2>`;
  if (r.win) h += `<p>The crowd of the planes roars. Purse and plunder: <b class="gold">${r.gold} gp</b>. Each hero still standing earns <b>${r.xp}</b> experience.</p>`;
  else if (r.draw) h += '<p>The light fails before the matter is settled. The same foes wait tomorrow.</p>';
  else if (left) h += `<p>${yielded ? 'Vhorax turns his thumb.' : 'The handlers haul the fallen out by their heels. Vhorax is not done with them.'} The forfeit is <b class="gold">${r.fine || 0} gp</b>, and the same foes wait tomorrow.</p>`;
  else h += '<p>None of them will get up again. You held for ' + (S.day - 1) + ' days.</p>';
  if (r.down.length) h += `<p>Cut down but breathing: ${r.down.join(', ')}.</p>`;
  if (r.dead.length) h += `<p><b>Slain:</b> <span class="mute">${r.dead.join(', ')}. The temple can raise them for a price.</span></p>`;
  if (r.loot && r.loot.length) h += `<p class="gold">Found on the sand: ${r.loot.map(id => ITEMS[id].n).join(', ')}.</p>`;
  if (r.win && r.day === FINAL - 1 && !S.ending) h += '<p class="gold">His champion lies dead. In the box above the north gate, Vhorax rises from his seat.</p>';
  if (r.ready) h += `<p class="gold">${r.ready} of the party ${r.ready > 1 ? 'are' : 'is'} ready to train.</p>`;
  modal(h + `<div class="end"><button class="go" onclick="afterResult(${S.heroes.some(x => !x.dead) ? 1 : 0})">${S.heroes.some(x => !x.dead) ? 'Back to the cells' : 'Gather a new six'}</button></div>`);
}

/* ---------- developer hook: ?six=1&day=12 ---------- */
function devParty(q) {
  const d = clamp(+q.get('day') || 1, 1, 99), used = {}, s = newParty(['fighter', 'paladin', 'cleric', 'mage', 'thief', 'ranger'].map(cls => { const n = randomName(used); used[n] = 1; return Object.assign({ cls, name: n }, rollStats(cls)); }));
  const lvl = clamp(+q.get('lvl') || 1 + Math.round(d / 3.4), 1, 14), t = clamp(Math.floor(d / 8), 0, 3);
  s.dev = true; s.day = d; s.gold = 300 + 60 * d; s.potions = 4;
  for (const h of s.heroes) {
    while (h.lvl < lvl) levelUp(h); h.xp = xpNeed(h.lvl - 1) || 0;
    if (t) for (const sl of ['weapon', 'body', 'off']) { const up = h.eq[sl] + Math.min(t, sl === 'weapon' ? 3 : 2); if (h.eq[sl] && ITEMS[up]) { s.inv.push(up); equip(s, h, up); } }
    h.hp = h.max;
  }
  s.inv = t ? ['rprot', 'rmight', 'stride', 'cloak1', 'flame'] : ['dagger'];
  return s;
}
