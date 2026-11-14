'use strict';
/* The Hundred: screens, canvas and input. Rules live in engine.js. */
const $ = id => document.getElementById(id);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = 'the-hundred-v1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let S = null, B = null, sel = null, csel = null, mode = null, reach = null, busy = false, auto = false, fast = false, openCi = -1, note = '';

function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); return s && s.v === 1 ? s : null; } catch (e) { return null; } }
function show(id) { for (const s of ['title', 'camp', 'battle']) $(s).classList.toggle('hidden', s !== id); window.scrollTo(0, 0); }
function modal(html) { $('mbox').innerHTML = html; $('modal').classList.remove('hidden'); }
function closeModal() { $('modal').classList.add('hidden'); }
const badge = cls => `<span class="badge" style="background:${CL[cls].col}">${CL[cls].g}</span>`;
const cname = ci => roman(ci + 1) + ' · ' + CL[S.cohorts[ci].cls].pl;

/* ---------- title ---------- */
function help() {
  modal(`<h2>How to play</h2>
  <p>You command a legion of one hundred: ten cohorts of ten, one for each calling. Each day the gate admits only so many cohorts. Choose who fights; the rest heal faster.</p>
  <p><b>On the sands</b> every cohort follows a standing order: Attack, Hold or Withdraw. Press <b>End turn</b> and they carry it out. To take a hero in hand, tap them, then tap a lit square to move, a foe to strike, or a spell and then its target.</p>
  <p><b>After the games</b> healers spend their unused spells, everyone rests, and spells return. Spend your purse at the quartermaster on arms, armour and potions. Heroes with enough experience must pay to train before they gain a level.</p>
  <p class="mute">The dead do not come back. If a day goes badly you may plead for mercy: the survivors live, half your gold is forfeit, and the same foes wait tomorrow.</p>
  <div class="end"><button onclick="closeModal()">Close</button></div>`);
}
function newGame() {
  if (load() && !confirm('Abandon the current legion and muster a new hundred?')) return;
  S = newCampaign(); save(); camp();
}

/* ---------- camp ---------- */
function camp() {
  B = null; show('camp');
  const cap = gateCap(S.day), bl = billing(S.day), alive = living(S);
  S.pick = S.pick.filter(ci => living(S, ci).length).slice(0, cap);
  save();
  const ready = alive.filter(canTrain).length;
  let h = `<div class="bar"><h2>Day ${roman(S.day)}</h2><span>Legion <b>${alive.length}</b>/100</span><span class="gold">${S.gold} gp</span><span>Potions ${S.potions}</span><span class="sp"></span><button class="sm" onclick="help()">?</button></div>
  <div class="card"><h3>Today's games: ${bl.title}</h3>${billingText(bl)}.<br><span class="mute">The gate admits <b>${cap}</b> cohort${cap > 1 ? 's' : ''}. Purse: ${bl.purse} gp. Chosen: ${S.pick.length}/${cap}.</span></div>`;
  S.cohorts.forEach((co, ci) => {
    const c = CL[co.cls], l = living(S, ci), hp = l.reduce((s, x) => s + x.hp, 0), mx = l.reduce((s, x) => s + x.max, 0);
    const lv = l.length ? (l.reduce((s, x) => s + x.lvl, 0) / l.length).toFixed(1) : '-', rd = l.filter(canTrain).length;
    h += `<div class="co ${S.pick.includes(ci) ? 'pick' : ''} ${l.length ? '' : 'gone'}" onclick="togglePick(${ci})">${badge(co.cls)}
      <div><span class="nm">${cname(ci)}</span> <span class="meta">${l.length}/10 · level ${lv}${rd ? ` · <span class="gold">${rd} ready to train</span>` : ''}</span>
      <div class="hpb"><i style="width:${mx ? 100 * hp / mx : 0}%"></i></div></div>
      <button class="sm" onclick="event.stopPropagation();openCi=openCi===${ci}?-1:${ci};camp()">${openCi === ci ? 'Hide' : 'Roster'}</button></div>`;
    if (openCi === ci) {
      h += `<div class="roster"><div class="mute">${c.note} Arms: ${TIER[co.arms]}. Armour: ${TIER[co.armor]}.</div><table><tr><th>Name</th><th>Lv</th><th>HP</th><th>AC</th><th>XP</th><th>Str</th><th>Dex</th><th>Con</th><th>Kills</th></tr>`;
      for (const x of S.heroes.filter(x => x.ci === ci)) h += `<tr class="${x.dead ? 'dead' : ''}"><td>${x.name}</td><td>${x.lvl}</td><td>${x.dead ? 'fell day ' + roman(x.diedDay) : x.hp + '/' + x.max}</td><td>${heroAC(x, co)}</td><td>${x.xp}/${xpNeed(x.lvl)}</td><td>${x.str}</td><td>${x.dex}</td><td>${x.con}</td><td>${x.kills}</td></tr>`;
      h += '</table></div>';
    }
  });
  h += `<div class="foot"><button onclick="shop()">Quartermaster</button><button onclick="train()" class="${ready ? 'on' : ''}">Training${ready ? ' (' + ready + ')' : ''}</button>
    <button class="go" ${S.pick.length ? '' : 'disabled'} onclick="toSands()">To the sands</button></div>
    <p class="more mute">Tap a cohort to send it through the gate. <a href="https://stilotto.github.io/">More games from Stilotto</a></p>`;
  $('camp').innerHTML = h;
}
function togglePick(ci) {
  if (!living(S, ci).length) return;
  const i = S.pick.indexOf(ci), cap = gateCap(S.day);
  if (i >= 0) S.pick.splice(i, 1); else { if (S.pick.length >= cap) S.pick.shift(); S.pick.push(ci); }
  camp();
}
function shop() {
  let h = `<h2>Quartermaster</h2><p class="mute" style="margin:0 0 6px">"Vhorax takes his cut. So do I." You have <b class="gold">${S.gold} gp</b>.</p>
  <div class="line"><span>Healing potion (${S.potions} held). Drunk in battle when a hero is badly hurt.</span><span class="sp"></span><button ${S.gold >= 30 ? '' : 'disabled'} onclick="buy('potion')">Buy, 30 gp</button></div>`;
  S.cohorts.forEach((co, ci) => {
    const l = living(S, ci); if (!l.length) return;
    const miss = l.reduce((s, x) => s + x.max - x.hp, 0);
    const b = (k, lab) => { const c = TIERCOST[co[k] + 1]; return c ? `<button class="sm" ${S.gold >= c ? '' : 'disabled'} onclick="buy('${k}',${ci})">${lab}: ${TIER[co[k] + 1]}, ${c} gp</button>` : `<span class="mute small">${lab}: ${TIER[3]}</span>`; };
    h += `<div class="line">${badge(co.cls)}<span>${CL[co.cls].pl}</span><span class="sp"></span>${b('arms', 'Arms')}${b('armor', 'Armour')}${miss ? `<button class="sm" ${S.gold >= miss ? '' : 'disabled'} onclick="buy('heal',${ci})">Temple, ${miss} gp</button>` : ''}</div>`;
  });
  modal(h + `<p class="mute small">Each tier of arms adds +1 to hit and damage; each tier of armour improves armour class by 1. The temple heals a whole cohort.</p><div class="end"><button onclick="closeModal();camp()">Done</button></div>`);
}
function buy(k, ci) {
  if (k === 'potion') { if (S.gold < 30) return; S.gold -= 30; S.potions++; }
  else if (k === 'heal') { const l = living(S, ci), c = l.reduce((s, x) => s + x.max - x.hp, 0); if (S.gold < c) return; S.gold -= c; l.forEach(x => x.hp = x.max); }
  else { const co = S.cohorts[ci], c = TIERCOST[co[k] + 1]; if (!c || S.gold < c) return; S.gold -= c; co[k]++; }
  save(); shop();
}
function train() {
  let h = `<h2>Training ground</h2><p class="mute" style="margin:0 0 6px">A hero with enough experience gains a level only after paid training. You have <b class="gold">${S.gold} gp</b>.</p>`, any = 0, total = 0;
  S.cohorts.forEach((co, ci) => {
    const r = living(S, ci).filter(canTrain); if (!r.length) return; any++;
    const c = r.reduce((s, x) => s + trainCost(x), 0); total += c;
    h += `<div class="line">${badge(co.cls)}<span>${CL[co.cls].pl}: ${r.length} ready</span><span class="sp"></span><button class="sm" onclick="doTrain(${ci})">Train, ${c} gp</button></div>`;
  });
  if (!any) h += '<p>No one is ready yet. Experience comes from the games.</p>';
  modal(h + `<div class="end">${any > 1 ? `<button onclick="doTrain(-1)">Train everyone, ${total} gp</button>` : ''}<button onclick="closeModal();camp()">Done</button></div>`);
}
function doTrain(ci) {
  for (const x of living(S, ci < 0 ? null : ci).filter(canTrain).sort((a, b) => a.lvl - b.lvl)) { const c = trainCost(x); if (S.gold < c) break; S.gold -= c; levelUp(x); }
  save(); train();
}

/* ---------- battle ---------- */
const cv = $('cv'), g = cv.getContext('2d');
let cell = 20, raf = 0;
function toSands() {
  B = startBattle(S, S.pick); sel = null; csel = S.pick[0]; mode = null; reach = null; busy = false; auto = false; note = '';
  show('battle'); size(); refresh();
}
function size() {
  if (!B) return;
  const W = Math.min(window.innerWidth, 1100) - 24, H = Math.max(170, window.innerHeight - 270);
  cell = Math.max(9, Math.floor(Math.min(W / B.w, H / B.h)));
  const dpr = window.devicePixelRatio || 1;
  cv.style.width = B.w * cell + 'px'; cv.style.height = B.h * cell + 'px';
  cv.width = B.w * cell * dpr; cv.height = B.h * cell * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
function draw() {
  if (!B) return;
  const c = cell, now = Date.now();
  g.fillStyle = '#d8c08c'; g.fillRect(0, 0, B.w * c, B.h * c);
  g.fillStyle = 'rgba(120,90,40,.09)';
  for (let y = 0; y < B.h; y++) for (let x = (y & 1); x < B.w; x += 2) g.fillRect(x * c, y * c, c, c);
  if (sel && reach && !mode) { g.fillStyle = 'rgba(60,110,200,.28)'; for (let i = 0; i < reach.d.length; i++) if (reach.d[i] > 0 && reach.d[i] <= sel.mv && !B.grid[i]) g.fillRect((i % B.w) * c + 1, Math.floor(i / B.w) * c + 1, c - 2, c - 2); }
  if (sel && mode && SPELLS[mode] && SPELLS[mode].range) { const r = SPELLS[mode].range; g.fillStyle = 'rgba(160,80,200,.16)'; g.fillRect(Math.max(0, sel.x - r) * c, Math.max(0, sel.y - r) * c, (Math.min(B.w - 1, sel.x + r) - Math.max(0, sel.x - r) + 1) * c, (Math.min(B.h - 1, sel.y + r) - Math.max(0, sel.y - r) + 1) * c); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const u of B.units) {
    if (u.hp <= 0) continue;
    const x = u.x * c + c / 2, y = u.y * c + c / 2;
    if (u.side === 'H') {
      g.globalAlpha = u.illusion ? .5 : (u.acted && !busy ? .55 : 1);
      g.beginPath(); g.arc(x, y, c * .42, 0, 7); g.fillStyle = u.col; g.fill();
      g.lineWidth = csel === u.ci ? 2 : 1; g.strokeStyle = csel === u.ci ? '#fff' : '#1a1410'; g.stroke();
      if (c >= 15 && u.g) { g.fillStyle = '#1a1410'; g.font = `700 ${Math.floor(c * .5)}px Cinzel,Georgia,serif`; g.fillText(u.g, x, y + 1); }
    } else {
      const s = c * (u.boss ? .47 : .4); g.globalAlpha = 1;
      g.fillStyle = u.f.includes('u') ? '#45503f' : '#7a1f1a'; g.fillRect(x - s, y - s, s * 2, s * 2);
      g.lineWidth = u.boss ? 2.5 : 1; g.strokeStyle = u.boss ? '#f0c56a' : '#1a1410'; g.strokeRect(x - s, y - s, s * 2, s * 2);
      if (c >= 15) { g.fillStyle = '#f3e6c8'; g.font = `700 ${Math.floor(c * .5)}px Georgia,serif`; g.fillText(u.g, x, y + 1); }
    }
    g.globalAlpha = 1;
    if (u.hp < u.max) { g.fillStyle = '#2a1a14'; g.fillRect(u.x * c + 2, u.y * c + c - 4, c - 4, 3); g.fillStyle = u.side === 'H' ? '#6fd06a' : '#ffb14a'; g.fillRect(u.x * c + 2, u.y * c + c - 4, (c - 4) * u.hp / u.max, 3); }
    if (u.st.sleep || u.st.stun || u.st.root) { g.fillStyle = u.st.root && !u.st.sleep && !u.st.stun ? '#2f8f3a' : '#fff'; g.font = `700 ${Math.floor(c * .45)}px Georgia,serif`; g.fillText(u.st.sleep ? 'z' : u.st.stun ? '✶' : '#', x + c * .3, y - c * .3); }
  }
  if (sel && sel.hp > 0) { g.strokeStyle = '#ffe9a0'; g.lineWidth = 2.5; g.beginPath(); g.arc(sel.x * c + c / 2, sel.y * c + c / 2, c * .47, 0, 7); g.stroke(); }
  let live = false;
  for (const f of B.fx) {
    const a = now - f.t; if (a > 520) continue; live = true;
    const k = RM ? 0 : a / 520; g.globalAlpha = 1 - k * .8;
    if (f.k === 'line') { if (a > 200) continue; g.strokeStyle = f.c; g.lineWidth = 2; g.beginPath(); g.moveTo(f.a[0] * c + c / 2, f.a[1] * c + c / 2); g.lineTo(f.b[0] * c + c / 2, f.b[1] * c + c / 2); g.stroke(); }
    else if (f.k === 'burst') { g.fillStyle = f.c; g.globalAlpha = .45 * (1 - k); g.fillRect((f.a[0] - f.r) * c, (f.a[1] - f.r) * c, (2 * f.r + 1) * c, (2 * f.r + 1) * c); }
    else if (f.k === 'txt') { g.font = `700 ${Math.max(11, Math.floor(c * .6))}px Georgia,serif`; g.lineWidth = 3; g.strokeStyle = '#1a1410'; const y = f.a[1] * c + c * .3 - k * c * .7; g.strokeText(f.s, f.a[0] * c + c / 2, y); g.fillStyle = f.c; g.fillText(f.s, f.a[0] * c + c / 2, y); }
  }
  g.globalAlpha = 1;
  cancelAnimationFrame(raf); if (live) raf = requestAnimationFrame(draw);
}
const stuck = u => u.st.sleep || u.st.stun;
function pickUnit(u) {
  sel = u; csel = u.ci; mode = null; note = '';
  reach = (!u.acted && !u.moved && !u.st.root && !stuck(u)) ? flood(B, u) : null;
}
function refresh() {
  if (!B) return;
  const hs = B.units.filter(u => u.side === 'H' && u.hp > 0 && !u.illusion), es = B.units.filter(u => u.side === 'E' && u.hp > 0);
  $('bbar').innerHTML = `<b class="cz gold">Day ${roman(B.day)}</b><span>Round ${B.round}</span><span>Legion <b>${hs.length}</b></span><span>Foes <b>${es.length}</b></span><span class="sp"></span><span class="mute small">${B.bl.title}</span>`;
  $('chips').innerHTML = B.cis.map(ci => { const n = hs.filter(u => u.ci === ci).length, co = S.cohorts[ci]; return `<button class="chip ${csel === ci ? 'on' : ''}" onclick="pickCohort(${ci})">${badge(co.cls)}${n} · ${co.order}</button>`; }).join('');
  let h = '';
  if (sel && sel.hp > 0) {
    const u = sel, st = [u.st.sleep && 'asleep', u.st.stun && 'held', u.st.root && 'rooted', u.acted && 'has acted'].filter(Boolean).join(', ');
    h += `<div><b>${u.name}</b> · ${CL[u.cls].n} ${u.lvl} · HP ${u.hp}/${u.max} · AC ${u.ac} · THAC0 ${u.thac0}${st ? ' · <span class="mute">' + st + '</span>' : ''}</div>`;
    if (!u.acted && !stuck(u) && !busy) {
      h += '<div class="row">';
      for (const k in u.sp) if (u.sp[k] > 0) h += `<button class="sm ${mode === k ? 'on' : ''}" onclick="setMode('${k}')">${SPELLS[k].n} ×${u.sp[k]}</button>`;
      if (u.kill) h += `<button class="sm ${mode === 'kill' ? 'on' : ''}" onclick="setMode('kill')">Assassinate</button>`;
      if (S.potions > 0 && u.hp < u.max) h += `<button class="sm" onclick="act(()=>drink(B,sel,S))">Potion (${S.potions})</button>`;
      h += `<button class="sm" onclick="act(()=>{sel.acted=true})">Wait</button></div>`;
    }
  }
  if (csel != null && B.cis.includes(csel)) {
    const co = S.cohorts[csel];
    h += `<div class="row"><span class="mute">${cname(csel)}:</span>` + ['attack', 'hold', 'withdraw'].map(o => `<button class="sm ${co.order === o ? 'on' : ''}" onclick="setOrder('${o}')">${o[0].toUpperCase() + o.slice(1)}</button>`).join('') +
      `<button class="sm ${co.spells ? 'on' : ''}" onclick="S.cohorts[csel].spells=!S.cohorts[csel].spells;refresh()">Spells: ${co.spells ? 'on' : 'off'}</button></div>`;
  }
  if (note) h += `<div class="gold small">${note}</div>`;
  $('panel').innerHTML = h || '<span class="mute">Tap a hero to command them by hand, or a cohort to change its orders. End turn carries out all standing orders.</span>';
  $('bEnd').disabled = busy; $('bAuto').textContent = 'Auto: ' + (auto ? 'on' : 'off'); $('bAuto').classList.toggle('on', auto);
  $('bSpeed').textContent = 'Speed: ' + (fast ? 'fast' : 'normal'); $('bYield').disabled = busy;
  $('log').innerHTML = B.log.slice(-3).map(s => `<div>${s}</div>`).join('');
  draw();
}
function pickCohort(ci) { csel = ci; if (sel && sel.ci !== ci) { sel = null; reach = null; mode = null; } refresh(); }
function setOrder(o) { S.cohorts[csel].order = o; refresh(); }
function setMode(k) {
  if (busy || !sel) return;
  if (k === 'turn') return act(() => cast(B, sel, 'turn'));
  mode = mode === k ? null : k; note = mode ? 'Choose a target for ' + (k === 'kill' ? 'the blade' : SPELLS[k].n) + '.' : ''; refresh();
}
function act(fn) {
  if (busy || !sel) return;
  fn(); mode = null; note = '';
  if (checkOver(B)) return result();
  if (sel.hp <= 0) sel = null; else pickUnit(sel);
  refresh();
}
function tap(x, y) {
  if (busy || !B || B.over || !inb(B, x, y)) return;
  const t = at(B, x, y), u = sel;
  if (mode && u) {
    if (mode === 'kill') { if (t && t.side === 'E' && dist(u, t) === 1) return act(() => { if (!assassinate(B, u, t)) heroAttack(B, u, t, false); }); note = 'The blade needs an adjacent foe.'; mode = null; return refresh(); }
    const m = mode; let ok = false; act(() => { ok = cast(B, u, m, x, y); }); if (!ok) { note = 'Not a valid target.'; refresh(); } return;
  }
  if (t && t.side === 'H' && !t.illusion) { pickUnit(t); return refresh(); }
  if (!u || u.acted || u.hp <= 0 || stuck(u)) return;
  if (t && t.side === 'E') {
    const d = dist(u, t);
    if (d === 1) return act(() => heroAttack(B, u, t, false));
    if (u.range && d <= u.range) return act(() => heroAttack(B, u, t, true));
    if (reach) {
      let best = -1;
      for (let i = 0; i < reach.d.length; i++) if (reach.d[i] > 0 && reach.d[i] <= u.mv && !B.grid[i] && Math.max(Math.abs(i % B.w - t.x), Math.abs(Math.floor(i / B.w) - t.y)) === 1 && (best < 0 || reach.d[i] < reach.d[best])) best = i;
      if (best >= 0) return act(() => { moveTo(B, u, best % B.w, Math.floor(best / B.w)); heroAttack(B, u, t, false); });
    }
    note = 'Out of reach.'; return refresh();
  }
  if (!t && reach) { const i = idx(B, x, y); if (reach.d[i] > 0 && reach.d[i] <= u.mv) return act(() => moveTo(B, u, x, y)); }
}
cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(); tap(Math.floor((e.clientX - r.left - cv.clientLeft) / cell), Math.floor((e.clientY - r.top - cv.clientTop) / cell)); });

async function endTurn() {
  if (busy || !B || B.over) return;
  busy = true; sel = null; mode = null; reach = null; note = ''; refresh();
  const b = B, n = b.units.length, delay = fast || RM ? 0 : clamp(1400 / n, 5, 55);
  const phase = async (side, fn) => {
    for (const u of b.units.slice()) {
      if (u.side !== side || u.hp <= 0 || (side === 'H' && u.acted)) continue;
      fn(u); if (delay) { draw(); await sleep(delay); }
      if (checkOver(b)) return;
    }
    if (!delay) { draw(); await sleep(RM ? 0 : 120); }
  };
  await phase('H', u => heroAct(b, u, S));
  if (!b.over) await phase('E', u => foeAct(b, u));
  if (!b.over) { endRound(b); checkOver(b); }
  busy = false;
  if (B !== b) return;
  if (b.over) return result();
  refresh();
  if (auto) setTimeout(endTurn, fast ? 60 : 250);
}
function yieldDay() {
  if (busy || !B || !confirm('Plead for mercy? The survivors live, half your gold is forfeit, and these foes return tomorrow.')) return;
  B.over = 'lose'; result(true);
}
function result(yielded) {
  auto = false; busy = false; sel = null; refresh();
  const r = finishBattle(S, B, yielded); save();
  const left = living(S).length;
  let h = `<h2>${r.win ? 'Victory' : yielded ? 'Mercy is granted' : r.draw ? 'A draw' : 'The cohort is lost'}</h2>`;
  if (r.win) h += `<p>The crowd of the planes roars. Purse and plunder: <b class="gold">${r.gold} gp</b>. Each survivor earns <b>${r.xp}</b> experience.</p>`;
  else if (yielded) h += `<p>Vhorax turns his thumb. The forfeit is <b class="gold">${r.fine} gp</b>, and the same foes wait tomorrow.</p>`;
  else if (r.draw) h += '<p>The light fails before the matter is settled. The same foes wait tomorrow.</p>';
  else h += '<p>No one who went through the gate came back. The same foes wait tomorrow.</p>';
  if (r.tended) h += `<p>The healers spend what spells they have left: ${r.tended} hit points restored. Then the legion rests.</p>`;
  h += r.dead.length ? `<p><b>The fallen (${r.dead.length}):</b> <span class="mute">${r.dead.join(', ')}.</span></p>` : '<p class="mute">No one fell today.</p>';
  if (r.ready) h += `<p class="gold">${r.ready} of the legion are ready to train.</p>`;
  if (!left) h += '<p><b>The Hundred are no more.</b> Vhorax will have to steal another legion. You held for ' + (S.day - 1) + ' days.</p>';
  h += `<div class="end"><button class="go" onclick="afterResult(${left})">${left ? 'Back to the cells' : 'Muster a new hundred'}</button></div>`;
  modal(h);
}
function afterResult(left) { closeModal(); if (!left) { S = newCampaign(); save(); } camp(); }

$('bEnd').onclick = endTurn;
$('bAuto').onclick = () => { auto = !auto; refresh(); if (auto) endTurn(); };
$('bSpeed').onclick = () => { fast = !fast; refresh(); };
$('bYield').onclick = yieldDay;
$('bNew').onclick = newGame;
$('bHelp').onclick = help;
$('bCont').onclick = () => { S = load(); camp(); };
if (load()) { $('bCont').classList.remove('hidden'); $('bNew').classList.remove('go'); }
window.addEventListener('resize', size);
