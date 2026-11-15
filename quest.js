'use strict';
/* Side quests for The Six: asking leave, the room-by-room flow, and how each place is painted on the board. */
function leave() {
  let h = `<h2>Leave of the Editor</h2><p>Vhorax hears the request with something like pleasure. "Go. Bleed somewhere else for a night and come back worth watching. Be on my sand at dawn."</p>
  <p class="mute small">One quest before each arena day. Four rooms with no rest between: wounds and spent spells carry on. Turn back any time and keep what you found; fall or flee and it is lost. The party rests when it returns.</p>`;
  for (const id in PLACES) { const P = PLACES[id], n = (S.q || {})[id] || 0, d = S.day + 2 * n, foes = P.foes.filter(f => f[1] <= d).slice(-4).map(f => MON[f[0]].pl).join(', ');
    h += `<div class="prow">${fig(P.boss, 62)}<div><span class="nm cz gold">${P.n}</span>${n ? ` <span class="meta">cleared ${n} time${n > 1 ? 's' : ''}; it has grown worse</span>` : ''}<div class="small">${P.blurb}</div><div class="small mute">Expect: ${foes}. At the end: ${P.bn}.</div></div><button class="go" onclick="startQuest('${id}')">Go</button></div>`; }
  modal(h + '<div class="end"><button onclick="closeModal()">Stay in the cells</button></div>'); $('mbox').classList.add('wide');
}
function startQuest(place) { closeModal(); beginQuest(S, place); save(); enterRoom(); }
function enterRoom() {
  closeModal();
  B = startRoom(S); quick = false; sel = null; insp = null; csel = 0; mode = null; reach = null; busy = false; auto = false; note = ''; B.phase = 'deploy';
  show('battle'); size(); refresh();
  if (S.fly !== false) playFly(7500, false);
}
const partyLine = () => S.heroes.map(x => `<span class="${x.dead ? 'mute' : x.hp < x.max * .4 ? 'gold' : ''}">${x.name} ${x.dead ? 'slain' : x.hp + '/' + x.max}</span>`).join(' · ');
function questResult(fled) {
  if (fled) B.over = 'lose';
  const P = PLACES[S.quest.place], name = B.room.name, r = finishRoom(S, B, fled), nm = ids => ids.map(id => ITEMS[id].n).join(', ');
  let h;
  if (!r.win) {
    endQuest(S, 'lost'); save();
    h = `<h2>${fled ? 'The party flees' : 'Carried out'}</h2><p>${fled ? 'They run for the way they came, and drop what they were carrying to do it.' : "Vhorax's handlers come for his property before dawn and drag the Six out by their heels."} Everything found on this quest is lost. The experience is not.</p>`;
    if (r.dead.length) h += `<p><b>Slain:</b> <span class="mute">${r.dead.join(', ')}.</span></p>`;
    return modal(h + `<div class="end"><button class="go" onclick="closeModal();camp()">Back to the cells</button></div>`);
  }
  if (r.last) {
    const out = endQuest(S, 'done'); save();
    h = `<h2>${P.n} is cleared</h2><p>${P.bn} is dead. The party carries out <b class="gold">${out.gold} gp</b>${out.loot.length ? ' and <b class="gold">' + nm(out.loot) + '</b>' : ''}. Each hero standing earns <b>${r.xp}</b> experience for the last fight.</p>`;
    if (r.dead.length) h += `<p><b>Slain:</b> <span class="mute">${r.dead.join(', ')}.</span></p>`;
    return modal(h + `<p class="mute">They are back in the cells before dawn, and sleep.</p><div class="end"><button class="go" onclick="closeModal();camp()">Back to the cells</button></div>`);
  }
  save(); between(`<p>Each hero standing earns <b>${r.xp}</b> experience. Found here: ${r.gold} gp${r.loot.length ? ' and <b class="gold">' + nm(r.loot) + '</b>' : ''}.</p>${r.down.length ? `<p>Cut down but back on their feet: ${r.down.join(', ')}.</p>` : ''}${r.dead.length ? `<p><b>Slain:</b> <span class="mute">${r.dead.join(', ')}.</span></p>` : ''}`, name);
}
function between(top, name) {
  const q = S.quest, P = PLACES[q.place], cures = living(S).reduce((n, x) => n + ((x.left && (x.left.cure || 0) + (x.left.loh || 0)) || 0), 0), hurt = living(S).some(x => x.hp < x.max);
  const left = living(S).filter(x => x.left && BOOK[x.cls]).map(x => x.name + ' ' + Object.values(x.left).reduce((a, b) => a + b, 0)).join(', ');
  window._btop = top; window._bname = name;
  modal(`<h2>${name} is cleared</h2>${top}<div class="card"><div>${partyLine()}</div><div class="small mute">Spells left: ${left || 'none'}. Potions: ${S.potions}. Carried so far: ${q.gold} gp${q.loot.length ? ', ' + q.loot.length + ' item' + (q.loot.length > 1 ? 's' : '') : ''}.</div></div>
  <div class="row"><button ${cures && hurt ? '' : 'disabled'} onclick="bTend()">Tend wounds (${cures} healing spells)</button><button ${S.potions && hurt ? '' : 'disabled'} onclick="bPotion()">Potion for the worst hurt</button></div>
  <div class="end"><button onclick="bBack()">Turn back with the takings</button><button class="go" onclick="enterRoom()">On to ${P.rooms[q.room]}</button></div>`);
}
function bTend() { const n = tend(S); save(); between(`<p>The healers restore ${n} hit points.</p>`, window._bname); }
function bPotion() { const t = living(S).filter(x => x.hp < x.max).sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; if (!t || !S.potions) return; S.potions--; const n = Math.min(t.max - t.hp, dice([2, 4, 2])); t.hp += n; save(); between(`<p>${t.name} drinks and recovers ${n} hit points.</p>`, window._bname); }
function bBack() { const out = endQuest(S, 'back'); save(); modal(`<h2>The party turns back</h2><p>Enough for one night. They carry out <b class="gold">${out.gold} gp</b>${out.loot.length ? ' and <b class="gold">' + out.loot.map(id => ITEMS[id].n).join(', ') + '</b>' : ''}, and are in the cells before dawn.</p><div class="end"><button class="go" onclick="closeModal();camp()">Back to the cells</button></div>`); }

/* ---------- painting a room on the tactical board ---------- */
function paintRoom(g, c, R) {
  const w = R.w, h = R.h, W = w * c, H = h * c, pl = R.place, K = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 1 : R.cells[y * w + x];
  let sd = 3 + R.n; const rr = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
  const propAt = {}; for (const p of R.props) propAt[p.y * w + p.x] = p;
  const floor = (x, y) => {
    const X = x * c, Y = y * c, v = rr();
    if (pl === 'crypt') { g.fillStyle = `rgb(${52 + v * 14 | 0},${55 + v * 14 | 0},${64 + v * 14 | 0})`; g.fillRect(X, Y, c, c); g.strokeStyle = '#25272e'; g.lineWidth = 1.5; g.strokeRect(X + .5, Y + .5, c - 1, c - 1); if (v > .8) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.moveTo(X + c * .2, Y + c * .3); g.lineTo(X + c * .5, Y + c * .55); g.lineTo(X + c * .45, Y + c * .85); g.stroke(); } }
    else if (pl === 'tower') { g.fillStyle = `rgb(${132 + v * 16 | 0},${100 + v * 12 | 0},${66 + v * 10 | 0})`; g.fillRect(X, Y, c, c); g.strokeStyle = 'rgba(50,30,10,.45)'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(X, Y + i * c / 3 + .5); g.lineTo(X + c, Y + i * c / 3 + .5); g.stroke(); } g.beginPath(); g.moveTo(X + (y % 2 ? c * .3 : c * .7), Y); g.lineTo(X + (y % 2 ? c * .3 : c * .7), Y + c / 3); g.stroke(); }
    else { g.fillStyle = '#4f4b45'; g.fillRect(X, Y, c, c); for (let i = 0; i < 9; i++) { const s = c * (.2 + rr() * .12); g.fillStyle = `rgb(${96 + rr() * 30 | 0},${90 + rr() * 26 | 0},${82 + rr() * 22 | 0})`; g.beginPath(); g.ellipse(X + (i % 3 + .5) * c / 3 + (rr() - .5) * 3, Y + (Math.floor(i / 3) + .5) * c / 3 + (rr() - .5) * 3, s * .62, s * .5, 0, 0, 7); g.fill(); } }
  };
  g.fillStyle = pl === 'tower' ? '#0a0e22' : pl === 'crypt' ? '#0c0c11' : '#2a2622'; g.fillRect(0, 0, W, H);
  if (pl === 'tower') { g.fillStyle = '#dfe6ff'; for (let i = 0; i < 70; i++) g.fillRect(rr() * W, rr() * H, 1.4, 1.4); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = R.cells[y * w + x]; if (k !== 1 || propAt[y * w + x]) floor(x, y); }
  for (const d of R.decor) { // things underfoot
    const X = d.x * c, Y = d.y * c;
    if (d.k === 'rug') { for (const [r, col] of [[3.1, '#6a1f2e'], [2.7, '#a8823a'], [2.5, '#7a2a3a'], [1.2, '#a8823a'], [1, '#5a1826']]) { g.fillStyle = col; g.beginPath(); g.arc(X + c / 2, Y + c / 2, r * c, 0, 7); g.fill(); } }
    if (d.k === 'puddle') { g.fillStyle = 'rgba(20,30,50,.7)'; g.beginPath(); g.ellipse(X + c * .5, Y + c * .5, c * .6, c * .32, .3, 0, 7); g.fill(); g.strokeStyle = 'rgba(180,200,230,.35)'; g.beginPath(); g.ellipse(X + c * .42, Y + c * .45, c * .25, c * .1, .3, 0, 7); g.stroke(); }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { // walls
    if (R.cells[y * w + x] !== 1 || propAt[y * w + x]) continue;
    const X = x * c, Y = y * c, edge = [K(x, y + 1), K(x, y - 1), K(x - 1, y), K(x + 1, y), K(x - 1, y - 1), K(x + 1, y - 1), K(x - 1, y + 1), K(x + 1, y + 1)].some(v => v !== 1);
    if (pl === 'crypt') { if (!edge) continue; g.fillStyle = '#565a66'; g.fillRect(X, Y, c, c); g.fillStyle = '#6c707c'; g.fillRect(X, Y, c, c * .16); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(X, Y + c * .84, c, c * .16); g.strokeStyle = '#30323a'; g.lineWidth = 1; g.strokeRect(X + .5, Y + .5, c - 1, c - 1); g.beginPath(); g.moveTo(X, Y + c / 2); g.lineTo(X + c, Y + c / 2); g.moveTo(X + c / 2, Y); g.lineTo(X + c / 2, Y + c / 2); g.stroke(); }
    else if (pl === 'tower') { if (!edge) continue; g.fillStyle = '#6c6674'; g.fillRect(X, Y, c, c); g.fillStyle = '#857e8e'; g.fillRect(X + 2, Y + 2, c - 4, c * .3); g.strokeStyle = '#3a3640'; g.lineWidth = 1.5; g.strokeRect(X + .5, Y + .5, c - 1, c - 1); }
    else { const blk = Math.floor(x / 3) + (y < h / 2 ? 0 : 7), col = ['#7a4a3a', '#5a4a44', '#6a5a3a', '#4a4a56', '#80603c'][blk % 5]; g.fillStyle = col; g.fillRect(X, Y, c, c); g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(X, Y + i * c / 4); g.lineTo(X + c, Y + i * c / 4); g.stroke(); } g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(X, Y, c, c / 4);
      const toSt = K(x, y + 1) !== 1 ? 1 : K(x, y - 1) !== 1 ? -1 : 0; if (toSt) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(X, toSt > 0 ? Y + c * .86 : Y, c, c * .14); if ((x * 7 + y) % 3) { g.fillStyle = (x + y) % 2 ? '#ffd27a' : '#2a2018'; g.fillRect(X + c * .36, toSt > 0 ? Y + c * .6 : Y + c * .16, c * .28, c * .24); } } }
  }
  for (const p of R.props) { // things that stand on the floor
    const X = p.x * c, Y = p.y * c, cx = X + c / 2, cy = Y + c / 2; g.lineWidth = 1.5; g.strokeStyle = '#17120f';
    const shadow = () => { g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(cx + c * .06, cy + c * .1, c * .42, c * .36, 0, 0, 7); g.fill(); };
    const rect = (ix, iy, col) => { g.fillStyle = col; g.fillRect(X + ix * c, Y + iy * c, c - 2 * ix * c, c - 2 * iy * c); g.strokeRect(X + ix * c, Y + iy * c, c - 2 * ix * c, c - 2 * iy * c); };
    const disc = (r, col) => { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r * c, 0, 7); g.fill(); g.stroke(); };
    switch (p.k) {
      case 'pillar': shadow(); disc(.36, '#8a8e9a'); disc(.24, '#a4a8b4'); break;
      case 'stair': disc(.46, '#7a7482'); for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(i * .785) * c * .46, cy + Math.sin(i * .785) * c * .46); g.stroke(); } disc(.12, '#2a2630'); break;
      case 'water': g.fillStyle = '#12202e'; g.fillRect(X, Y, c, c); g.strokeStyle = 'rgba(120,160,200,.3)'; g.beginPath(); g.ellipse(cx + (rr() - .5) * c * .3, cy, c * .3, c * .12, 0, 0, 7); g.stroke(); break;
      case 'sarc': case 'sarc2': shadow(); rect(.14, .04, '#8a8e9a'); g.fillStyle = '#a4a8b4'; g.fillRect(X + c * .24, Y + c * .12, c * .52, c * .76); g.beginPath(); g.moveTo(cx, Y + c * .2); g.lineTo(cx, Y + c * .7); g.moveTo(X + c * .36, Y + c * .36); g.lineTo(X + c * .64, Y + c * .36); g.stroke(); break;
      case 'brazier': shadow(); disc(.3, '#3a302c'); disc(.18, '#ff9a3a'); disc(.09, '#ffe08a'); break;
      case 'shelf': rect(.03, .12, '#603e24'); for (let i = 0; i < 6; i++) { g.fillStyle = ['#8e2a22', '#2a5a8e', '#d2aa52', '#3a7a4a', '#6a3a7a', '#c8c0a8'][i]; g.fillRect(X + c * (.08 + i * .14), Y + c * .2, c * .11, c * .6); } break;
      case 'table': shadow(); rect(.1, .14, '#8a6238'); g.fillStyle = '#e8dcc0'; g.fillRect(X + c * .22, Y + c * .28, c * .26, c * .2); disc(.07, '#7ad0ff'); break;
      case 'cauldron': shadow(); disc(.36, '#26262c'); disc(.26, '#3ac06a'); disc(.1, '#a8ffb8'); break;
      case 'cage': rect(.1, .1, 'rgba(40,40,46,.6)'); for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(X + c * (.1 + i * .16), Y + c * .1); g.lineTo(X + c * (.1 + i * .16), Y + c * .9); g.stroke(); } break;
      case 'orrery': shadow(); g.strokeStyle = '#d2aa52'; g.lineWidth = 2; for (const r of [.42, .3, .18]) { g.beginPath(); g.arc(cx, cy, r * c, 0, 7); g.stroke(); } g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(cx, cy, c * .09, 0, 7); g.fill(); g.fillStyle = '#7ad0ff'; g.beginPath(); g.arc(cx + c * .3, cy, c * .05, 0, 7); g.fill(); break;
      case 'crate': shadow(); rect(.12, .12, '#8c6438'); g.beginPath(); g.moveTo(X + c * .12, Y + c * .12); g.lineTo(X + c * .88, Y + c * .88); g.moveTo(X + c * .88, Y + c * .12); g.lineTo(X + c * .12, Y + c * .88); g.stroke(); break;
      case 'barrel': shadow(); disc(.36, '#704c2c'); disc(.26, '#8a6238'); break;
      case 'cart': shadow(); rect(.06, .2, '#7a5430'); g.fillStyle = '#2a2018'; g.fillRect(X + c * .14, Y + c * .08, c * .2, c * .12); g.fillRect(X + c * .66, Y + c * .08, c * .2, c * .12); g.fillRect(X + c * .14, Y + c * .8, c * .2, c * .12); g.fillRect(X + c * .66, Y + c * .8, c * .2, c * .12); break;
    }
  }
  for (const d of R.decor) { // doors and washing lines
    const X = d.x * c, Y = d.y * c;
    if (d.k === 'door' || d.k === 'exit') { g.fillStyle = d.k === 'door' ? '#6b4a2a' : '#17120f'; g.fillRect(X + (d.x ? c * .5 : 0), Y, c * .5, c); g.strokeStyle = '#d2aa52'; g.lineWidth = 1.5; g.strokeRect(X + (d.x ? c * .5 : 0) + .5, Y + .5, c * .5 - 1, c - 1); }
    if (d.k === 'wash') { g.strokeStyle = '#d8d0c0'; g.lineWidth = 1; g.beginPath(); g.moveTo(X + c * .5, Y); g.lineTo(X + c * .5, Y + 3 * c); g.stroke(); for (let i = 0; i < 4; i++) { g.fillStyle = ['#c8c0b0', '#8e2a22', '#5a6a8c', '#d2aa52'][i]; g.fillRect(X + c * .38, Y + c * (.3 + i * .65), c * .3, c * .4); } }
  }
  // light: darkness everywhere, warm pools where something burns
  g.fillStyle = pl === 'crypt' ? 'rgba(4,4,12,.5)' : pl === 'slum' ? 'rgba(10,8,24,.38)' : 'rgba(10,8,20,.18)'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  const lights = R.decor.filter(d => d.k === 'torch' || d.k === 'candle' || d.k === 'lamp').map(d => [d.x, d.y, d.k === 'candle' ? 2.6 : 3.4, d.k === 'candle' ? '255,220,150' : '255,160,70']).concat(R.props.filter(p => p.k === 'brazier' || p.k === 'cauldron' || p.k === 'orrery').map(p => [p.x, p.y, 3, p.k === 'cauldron' ? '90,255,130' : '255,170,70']));
  for (const [x, y, r, col] of lights) { const gr = g.createRadialGradient((x + .5) * c, (y + .5) * c, 0, (x + .5) * c, (y + .5) * c, r * c); gr.addColorStop(0, `rgba(${col},.4)`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect((x + .5 - r) * c, (y + .5 - r) * c, 2 * r * c, 2 * r * c); }
  g.globalCompositeOperation = 'source-over';
  for (const d of R.decor) if (d.k === 'torch' || d.k === 'lamp' || d.k === 'candle') { g.fillStyle = '#ffe08a'; g.beginPath(); g.arc((d.x + .5) * c, (d.y + .5) * c, c * .1, 0, 7); g.fill(); }
}
