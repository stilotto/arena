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
  show('battle'); size(); refresh(); SND.ambient(B.room.place); SND.play('door', 200);
  if (S.fly !== false) playFly(7500, false);
}
const partyLine = () => S.heroes.map(x => `<span class="${x.dead ? 'mute' : x.hp < x.max ? 'bad' : ''}">${x.name} ${x.dead ? 'slain' : x.hp + '/' + x.max}</span>`).join(' · ');
function questResult(fled) {
  if (fled) B.over = 'lose';
  const P = PLACES[S.quest.place], name = B.room.name, r = finishRoom(S, B, fled), nm = ids => ids.map(id => ITEMS[id].n).join(', ');
  let h;
  if (!r.win) {
    endQuest(S, 'lost'); S.last = 'questlost'; save(); SND.play('dirge', 200);
    h = `<h2>${fled ? 'The party flees' : 'Carried out'}</h2><p>${fled ? 'They run for the way they came, and drop what they were carrying to do it.' : "Vhorax's handlers come for his property before dawn and drag the Six out by their heels."} Everything found on this quest is lost. The experience is not.</p>`;
    if (r.dead.length) h += `<p><b>Slain:</b> <span class="mute">${r.dead.join(', ')}.</span></p>`;
    return modal(h + `<div class="end"><button class="go" onclick="closeModal();camp()">Back to the cells</button></div>`);
  }
  if (r.last) {
    const out = endQuest(S, 'done'); S.last = 'quest'; save(); SND.play('fanfare', 200);
    h = `<h2>${P.n} is cleared</h2><p>${P.bn} is dead. The party carries out <b class="gold">${out.gold} gp</b>${out.loot.length ? ' and <b class="gold">' + nm(out.loot) + '</b>' : ''}. Each hero standing earns <b>${r.xp}</b> experience for the last fight.</p>`;
    if (r.dead.length) h += `<p><b>Slain:</b> <span class="mute">${r.dead.join(', ')}.</span></p>`;
    return modal(h + `<p class="mute">They are back in the cells before dawn, and sleep.</p><div class="end"><button class="go" onclick="closeModal();camp()">Back to the cells</button></div>`);
  }
  SND.play('heal', 200); save(); between(`<p>Each hero standing earns <b>${r.xp}</b> experience. Found here: ${r.gold} gp${r.loot.length ? ' and <b class="gold">' + nm(r.loot) + '</b>' : ''}.</p>${r.down.length ? `<p>Cut down but back on their feet: ${r.down.join(', ')}.</p>` : ''}${r.dead.length ? `<p><b>Slain:</b> <span class="mute">${r.dead.join(', ')}.</span></p>` : ''}`, name);
}
function between(top, name) {
  const q = S.quest, P = PLACES[q.place], cures = living(S).reduce((n, x) => n + ((x.left && (x.left.cure || 0) + (x.left.loh || 0)) || 0), 0), hurt = living(S).some(x => x.hp < x.max);
  const left = living(S).filter(x => x.left && BOOK[x.cls]).map(x => x.name + ' ' + Object.values(x.left).reduce((a, b) => a + b, 0)).join(', ');
  window._btop = top; window._bname = name;
  modal(`<h2>${name} is cleared</h2>${top}<div class="card"><div>${partyLine()}</div><div class="small mute">Spells left: ${left || 'none'}. Potions: ${S.potions}${packText()}. Carried so far: ${q.gold} gp${q.loot.length ? ', ' + q.loot.length + ' item' + (q.loot.length > 1 ? 's' : '') : ''}.</div></div>
  <div class="row"><button ${cures && hurt ? '' : 'disabled'} onclick="bTend()">Tend wounds (${cures} healing spells)</button><button ${S.potions && hurt ? '' : 'disabled'} onclick="bPotion()">Potion for the worst hurt</button></div>
  <div class="end"><button onclick="bBack()">Turn back with the takings</button><button class="go" onclick="enterRoom()">On to ${makeRoom(q.place, q.room, q.seed).name}</button></div>`);
}
const packText = () => { const o = []; for (const id in S.pots || {}) if (S.pots[id] > 0) o.push(POTS[id].n.replace('Potion of ', '') + ' \u00d7' + S.pots[id]); for (const id in S.bag || {}) if (S.bag[id] > 0) o.push(SCROLLS[id].n + ' \u00d7' + S.bag[id]); for (const id in S.wands || {}) if (S.wands[id] > 0) o.push(WANDS[id].n + ' (' + S.wands[id] + ')'); return o.length ? ', ' + o.join(', ') : ''; };
function bTend() { const n = tend(S); save(); between(`<p>The healers restore ${n} hit points.</p>`, window._bname); }
function bPotion() { const t = living(S).filter(x => x.hp < x.max).sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; if (!t || !S.potions) return; S.potions--; const n = Math.min(t.max - t.hp, dice([2, 4, 2])); t.hp += n; save(); between(`<p>${t.name} drinks and recovers ${n} hit points.</p>`, window._bname); }
function bBack() { const out = endQuest(S, 'back'); save(); modal(`<h2>The party turns back</h2><p>Enough for one night. They carry out <b class="gold">${out.gold} gp</b>${out.loot.length ? ' and <b class="gold">' + out.loot.map(id => ITEMS[id].n).join(', ') + '</b>' : ''}, and are in the cells before dawn.</p><div class="end"><button class="go" onclick="closeModal();camp()">Back to the cells</button></div>`); }

/* ---------- painting a room on the tactical board ----------
   Three layers: the floor (static), one strip per row for walls and props so figures can stand behind them,
   and a live overlay for light, shadow, flame and weather. */
let roomRows = [], roomRise = 0, roomFX = null;
function paintRoom(g, c, R) {
  const w = R.w, h = R.h, W = w * c, Ht = h * c, pl = R.place, dpr = window.devicePixelRatio || 1;
  const K = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 1 : R.cells[y * w + x];
  let sd = 17 + R.n * 31 + w; const rr = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
  const hash = (x, y) => { let v = (x * 374761393 + y * 668265263) >>> 0; v = ((v ^ (v >>> 13)) * 1274126177) >>> 0; return (v >>> 8) / 16777216; };
  const propAt = {}; for (const p of R.props) propAt[p.y * w + p.x] = p;
  const isWall = (x, y) => K(x, y) === 1 && !propAt[y * w + x];
  const H = roomRise = Math.round(c * (pl === 'slum' ? .9 : .55));
  const P = (ctx, pts, fill, stroke) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); } };
  const E = (ctx, x, y, rx, ry, fill, stroke) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); } };

  /* ----- floor ----- */
  if (pl === 'tower') { const sky = g.createLinearGradient(0, 0, 0, Ht); sky.addColorStop(0, '#050816'); sky.addColorStop(1, '#141d42'); g.fillStyle = sky; g.fillRect(0, 0, W, Ht);
    for (let i = 0; i < 110; i++) { g.fillStyle = `rgba(225,232,255,${.3 + rr() * .7})`; g.fillRect(rr() * W, rr() * Ht, 1 + rr(), 1 + rr()); }
    for (let i = 0; i < 7; i++) { const x = rr() * W, y = rr() * Ht, gr = g.createRadialGradient(x, y, 0, x, y, c * 3); gr.addColorStop(0, 'rgba(120,135,190,.2)'); gr.addColorStop(1, 'rgba(120,135,190,0)'); g.fillStyle = gr; g.save(); g.scale(1, .45); g.fillRect(x - c * 3, y / .45 - c * 3, c * 6, c * 6); g.restore(); } }
  else { g.fillStyle = pl === 'crypt' ? '#07070b' : '#14110e'; g.fillRect(0, 0, W, Ht); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (isWall(x, y)) continue;
    const X = x * c, Y = y * c, v = hash(x, y), k = R.cells[y * w + x];
    if (k === 3) { const gr = g.createLinearGradient(X, Y, X, Y + c); gr.addColorStop(0, pl === 'slum' ? '#1c2a22' : '#0c1a2a'); gr.addColorStop(1, pl === 'slum' ? '#121c18' : '#081220'); g.fillStyle = gr; g.fillRect(X, Y, c, c); if (K(x, y - 1) !== 3) { g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(X, Y, c, c * .16); } continue; }
    if (pl === 'crypt') {
      g.fillStyle = `rgb(${58 + v * 18 | 0},${60 + v * 18 | 0},${71 + v * 18 | 0})`; g.fillRect(X, Y, c, c);
      g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(X + 1, Y + 1, c - 2, 1.5); g.fillRect(X + 1, Y + 1, 1.5, c - 2);
      g.fillStyle = 'rgba(0,0,0,.42)'; g.fillRect(X, Y + c - 1.5, c, 1.5); g.fillRect(X + c - 1.5, Y, 1.5, c);
      if (v > .6) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(X + (v > .8 ? c * .5 : 0), Y + (v > .8 ? 0 : c * .5), v > .8 ? 1.5 : c, v > .8 ? c : 1.5); }
      for (let i = 0; i < 4; i++) { g.fillStyle = rr() < .5 ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.06)'; g.fillRect(X + rr() * c, Y + rr() * c, 1.5, 1.5); }
    } else if (pl === 'tower') {
      if (R.roof) { g.fillStyle = `rgb(${92 + v * 14 | 0},${94 + v * 14 | 0},${112 + v * 14 | 0})`; g.fillRect(X, Y, c, c); g.strokeStyle = 'rgba(20,20,40,.5)'; g.lineWidth = 1; g.strokeRect(X + .5, Y + .5, c - 1, c - 1); }
      else { for (let i = 0; i < 3; i++) { const pv = hash(x * 3 + i, y * 7 + i); g.fillStyle = `rgb(${128 + pv * 30 | 0},${94 + pv * 22 | 0},${58 + pv * 16 | 0})`; g.fillRect(X, Y + i * c / 3, c, c / 3); g.fillStyle = 'rgba(40,22,8,.55)'; g.fillRect(X, Y + (i + 1) * c / 3 - 1, c, 1.2); const jx = X + ((pv * 97 | 0) % 5 + 1) * c / 6; g.fillRect(jx, Y + i * c / 3, 1.2, c / 3); g.fillStyle = 'rgba(30,16,6,.6)'; g.fillRect(jx + 2.5, Y + i * c / 3 + c / 6 - 1, 1.5, 1.5); g.fillStyle = 'rgba(255,220,170,.07)'; g.fillRect(X, Y + i * c / 3, c, 1.2); } }
    } else {
      g.fillStyle = '#2c2925'; g.fillRect(X, Y, c, c);
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const cv2 = hash(x * 3 + i, y * 3 + j), cx = X + (i + .5) * c / 3 + (j % 2 ? c / 6 : 0) - c / 12, cy = Y + (j + .5) * c / 3; g.fillStyle = `rgb(${84 + cv2 * 34 | 0},${80 + cv2 * 30 | 0},${74 + cv2 * 26 | 0})`; g.beginPath(); g.ellipse(cx, cy, c * .145, c * .125, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.ellipse(cx - c * .03, cy - c * .035, c * .07, c * .045, 0, 0, 7); g.fill(); }
    }
    // the wall behind throws a shadow on the floor
    if (isWall(x, y - 1)) { const gr = g.createLinearGradient(0, Y, 0, Y + c * .7); gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(X, Y, c, c * .7); }
    if (isWall(x - 1, y)) { const gr = g.createLinearGradient(X, 0, X + c * .4, 0); gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(X, Y, c * .4, c); }
  }
  for (const d of R.decor) { // things underfoot
    const X = d.x * c, Y = d.y * c, cx = X + c / 2, cy = Y + c / 2, v = d.v || 0; g.lineWidth = 1;
    switch (d.k) {
      case 'rug': { const pal = [['#5c1826', '#b08a3c', '#7a2434'], ['#1c2c5c', '#b8b0a0', '#2a4a8a'], ['#1e4a34', '#c8a850', '#2c6a4a']][d.v || 0], rad = d.r * c;
        for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283; g.strokeStyle = pal[1]; g.beginPath(); g.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); g.lineTo(cx + Math.cos(a) * (rad + c * .14), cy + Math.sin(a) * (rad + c * .14)); g.stroke(); }
        for (const [f, col] of [[1, pal[0]], [.9, pal[1]], [.84, pal[2]], [.5, pal[1]], [.45, pal[0]]]) E(g, cx, cy, rad * f, rad * f, col);
        g.strokeStyle = pal[1]; g.lineWidth = 1.5; for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * 6.283 * 3 / 8 + k * .39, r2 = rad * .78; i ? g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2) : g.moveTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); } g.stroke(); } break; }
      case 'chart': { g.strokeStyle = 'rgba(210,170,82,.75)'; g.lineWidth = 1.5; for (const f of [1, .72, .44, .2]) E(g, cx, cy, d.r * c * f, d.r * c * f, null, 'rgba(210,170,82,.7)'); for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283, r0 = d.r * c * (i % 2 ? .93 : .86); g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * d.r * c, cy + Math.sin(a) * d.r * c); g.stroke(); } for (let i = 0; i < 12; i++) { const a = rr() * 6.283, r0 = rr() * d.r * c * .95; E(g, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, 1.8, 1.8, '#f0d890'); } break; }
      case 'dais': g.fillStyle = '#7a7e8c'; g.fillRect(X - c * .1, Y - c * .1, d.w * c + c * .2, d.h * c + c * .2); g.fillStyle = '#8e92a0'; g.fillRect(X + c * .08, Y + c * .08, d.w * c - c * .16, d.h * c - c * .16); g.strokeStyle = '#d2aa52'; g.lineWidth = 2; g.strokeRect(X + c * .2, Y + c * .2, d.w * c - c * .4, d.h * c - c * .4); break;
      case 'bridge': g.fillStyle = '#6a4a2a'; g.fillRect(X + c * .08, Y, c * .84, c); g.strokeStyle = '#2a1a0c'; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(X + c * .08, Y + i * c / 4); g.lineTo(X + c * .92, Y + i * c / 4); g.stroke(); } g.fillStyle = '#3a2816'; g.fillRect(X + c * .04, Y, c * .08, c); g.fillRect(X + c * .88, Y, c * .08, c); break;
      case 'moss': for (let i = 0; i < 5; i++) E(g, X + rr() * c, Y + rr() * c, c * (.1 + rr() * .14), c * (.08 + rr() * .1), `rgba(${60 + rr() * 30 | 0},${100 + rr() * 40 | 0},60,.38)`); break;
      case 'crack': g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(X + c * .1, Y + c * (.2 + v * .5)); for (let i = 1; i < 5; i++) g.lineTo(X + c * (.1 + i * .2), Y + c * (.2 + rr() * .6)); g.stroke(); break;
      case 'bones': g.strokeStyle = '#d8d0bc'; g.lineWidth = 2; g.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = rr() * 3.14, x0 = X + c * (.25 + rr() * .5), y0 = Y + c * (.25 + rr() * .5); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + Math.cos(a) * c * .22, y0 + Math.sin(a) * c * .22); g.stroke(); } break;
      case 'skull': E(g, cx, cy, c * .13, c * .12, '#e0d8c4', '#2a2420'); g.fillStyle = '#17120f'; g.fillRect(cx - c * .07, cy - c * .03, c * .05, c * .05); g.fillRect(cx + c * .02, cy - c * .03, c * .05, c * .05); break;
      case 'stain': E(g, cx, cy, c * (.25 + v * .2), c * (.18 + v * .1), 'rgba(80,14,14,.42)'); E(g, cx + c * .2, cy + c * .1, c * .08, c * .06, 'rgba(80,14,14,.42)'); break;
      case 'books': for (let i = 0; i < 3; i++) { g.save(); g.translate(X + c * (.3 + rr() * .4), Y + c * (.3 + rr() * .4)); g.rotate(rr() * 3); g.fillStyle = ['#8e2a22', '#2a5a8e', '#3a7a4a', '#6a3a7a'][i % 4]; g.fillRect(-c * .12, -c * .08, c * .24, c * .16); g.fillStyle = '#e8dcc0'; g.fillRect(-c * .1, -c * .06, c * .03, c * .12); g.restore(); } break;
      case 'paper': for (let i = 0; i < 2; i++) { g.save(); g.translate(X + c * (.3 + rr() * .4), Y + c * (.3 + rr() * .4)); g.rotate(rr() * 3); g.fillStyle = '#e8dcc0'; g.fillRect(-c * .1, -c * .13, c * .2, c * .26); g.fillStyle = 'rgba(40,30,20,.5)'; for (let j = 0; j < 4; j++) g.fillRect(-c * .07, -c * .1 + j * c * .05, c * .14, 1); g.restore(); } break;
      case 'puddle': E(g, cx, cy, c * (.4 + v * .25), c * (.22 + v * .12), 'rgba(14,22,36,.75)'); E(g, cx - c * .1, cy - c * .05, c * .18, c * .06, 'rgba(170,190,220,.22)'); break;
      case 'refuse': for (let i = 0; i < 6; i++) { g.fillStyle = ['#4a3a2a', '#5a5040', '#3a3a30', '#6a4a30'][i % 4]; g.fillRect(X + rr() * c * .8, Y + rr() * c * .8, c * (.08 + rr() * .1), c * (.06 + rr() * .08)); } break;
      case 'door': case 'exit': { const px = d.k === 'door' ? X : X + c * .7; g.fillStyle = '#0a0806'; g.fillRect(d.k === 'door' ? X : X + c * .55, Y - c * .05, c * .45, c * 1.1); g.fillStyle = '#6b4a2a'; g.fillRect(px, Y - c * .3, c * .3, c * .3); g.fillRect(px, Y + c, c * .3, c * .3); g.strokeStyle = '#d2aa52'; g.lineWidth = 1.5; g.strokeRect(px, Y - c * .3, c * .3, c * .3); g.strokeRect(px, Y + c, c * .3, c * .3); break; }
    }
  }

  /* ----- walls and props, one strip per row ----- */
  const litAt = {}; for (const l of R.lights) if (l.wx != null) litAt[l.wy * w + l.wx] = l;
  const pal = { crypt: { cap: [78, 82, 96], face: [58, 61, 73] }, tower: { cap: [122, 116, 132], face: [90, 85, 100] } }[pl];
  const BLD = [{ wall: '#b3a284', roof: [128, 70, 52] }, { wall: '#8c7a62', roof: [84, 72, 70] }, { wall: '#a08a5c', roof: [112, 92, 54] }, { wall: '#9c8c84', roof: [70, 74, 92] }, { wall: '#b08e6a', roof: [136, 96, 56] }];
  const streetSouth = (x, y) => { for (let yy = y + 1; yy < h; yy++) if (K(x, yy) !== 1) return yy - y; return 0; };
  roomRows = [];
  for (let y = 0; y < h; y++) {
    const cv = document.createElement('canvas'); cv.width = Math.ceil(W * dpr); cv.height = Math.ceil((c + H) * dpr);
    const t = cv.getContext('2d'); t.setTransform(dpr, 0, 0, dpr, 0, 0); t.lineJoin = 'round'; let any = false;
    for (let x = 0; x < w; x++) {
      const X = x * c, p = propAt[y * w + x], v = hash(x + 50, y + 9);
      if (isWall(x, y)) {
        // A wall normally rises over the square behind it. If that square is open floor, keep the wall inside its own square so it hides nobody.
        const open = y > 0 && !isWall(x, y - 1), fr0 = !isWall(x, y + 1) && y < h - 1; t.save(); if (open) { t.translate(0, H); if (fr0) t.scale(1, c / (c + H)); }
        const edge = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(d => !isWall(x + d[0], y + d[1]) && (pl !== 'tower' || K(x + d[0], y + d[1]) !== 1 || propAt[(y + d[1]) * w + x + d[0]]));
        const front = !isWall(x, y + 1) && y < h - 1;
        if (pl === 'slum') {
          const blk = Math.floor(x / 3) + (streetSouth(x, y) ? 0 : 11), b = BLD[(blk * 7 + 3) % BLD.length], rf = b.roof; any = true;
          t.fillStyle = `rgb(${rf[0]},${rf[1]},${rf[2]})`; t.fillRect(X, 0, c, c);
          for (let j = 0; j < 4; j++) { t.fillStyle = 'rgba(0,0,0,.22)'; t.fillRect(X, j * c / 4 + c / 4 - 1.5, c, 1.5); for (let i = 0; i < 4; i++) { t.beginPath(); t.arc(X + (i + .5 + (j % 2) * .5) * c / 4, j * c / 4, c / 8, 0, 3.1416); t.strokeStyle = 'rgba(0,0,0,.25)'; t.lineWidth = 1; t.stroke(); } }
          t.fillStyle = 'rgba(255,255,255,.08)'; t.fillRect(X, 0, c, c * .12);
          if (Math.floor((x - 1) / 3) !== Math.floor(x / 3)) { t.fillStyle = 'rgba(0,0,0,.4)'; t.fillRect(X, 0, 2, c); }
          if (v > .86 && !front) { t.fillStyle = '#4a3a34'; t.fillRect(X + c * .3, c * .2, c * .34, c * .4); t.fillStyle = '#17120f'; t.fillRect(X + c * .36, c * .26, c * .22, c * .16); }
          if (front) { // the house front, facing us
            t.fillStyle = b.wall; t.fillRect(X, c, c, H); const sh = t.createLinearGradient(0, c, 0, c + H); sh.addColorStop(0, 'rgba(0,0,0,.45)'); sh.addColorStop(.25, 'rgba(0,0,0,.05)'); sh.addColorStop(1, 'rgba(0,0,0,.3)'); t.fillStyle = sh; t.fillRect(X, c, c, H);
            t.fillStyle = '#3a2618'; t.fillRect(X, c, c, H * .08); t.fillRect(X, c + H * .92, c, H * .08); if (x % 3 === 0) t.fillRect(X, c, c * .08, H); if (x % 3 === 2) t.fillRect(X + c * .92, c, c * .08, H);
            const kind = hash(x + 7, y + 3);
            if (kind < .28) { t.fillStyle = '#2a1a10'; t.fillRect(X + c * .28, c + H * .3, c * .44, H * .7); t.fillStyle = '#4a3020'; t.fillRect(X + c * .32, c + H * .34, c * .36, H * .62); t.fillStyle = '#d2aa52'; t.fillRect(X + c * .58, c + H * .66, c * .05, c * .05); }
            else if (kind < .8) { const lit = kind < .55; t.fillStyle = '#2a1a10'; t.fillRect(X + c * .24, c + H * .22, c * .52, H * .46); t.fillStyle = lit ? '#ffc864' : '#1a1c26'; t.fillRect(X + c * .28, c + H * .26, c * .44, H * .38); t.fillStyle = '#2a1a10'; t.fillRect(X + c * .49, c + H * .26, c * .03, H * .38); t.fillRect(X + c * .28, c + H * .44, c * .44, H * .03); if (lit) R._win = (R._win || []).concat([[x + .5, y + 1.05]]); }
            else { t.strokeStyle = '#3a2618'; t.lineWidth = c * .06; t.beginPath(); t.moveTo(X + c * .1, c + H * .1); t.lineTo(X + c * .9, c + H * .9); t.moveTo(X + c * .9, c + H * .1); t.lineTo(X + c * .1, c + H * .9); t.stroke(); }
            const l = litAt[y * w + x]; if (l) { t.fillStyle = '#17120f'; t.fillRect(X + c * .46, c + H * .08, c * .08, H * .2); t.fillRect(X + c * .36, c + H * .26, c * .28, H * .26); t.fillStyle = '#ffd27a'; t.fillRect(X + c * .41, c + H * .3, c * .18, H * .18); }
          }
        } else if (edge) {
          const cp = pal.cap, fc = pal.face; any = true;
          t.fillStyle = `rgb(${cp[0] + v * 10 | 0},${cp[1] + v * 10 | 0},${cp[2] + v * 10 | 0})`; t.fillRect(X, 0, c, c);
          t.fillStyle = 'rgba(255,255,255,.1)'; t.fillRect(X, 0, c, 2); t.fillStyle = 'rgba(0,0,0,.3)'; t.fillRect(X, c / 2 - .5, c, 1.2); t.fillRect(X + (y % 2 ? c * .5 : c * .25), 0, 1.2, c / 2); t.fillRect(X + (y % 2 ? c * .2 : c * .7), c / 2, 1.2, c / 2);
          if (!isWall(x - 1, y)) { t.fillStyle = 'rgba(255,255,255,.08)'; t.fillRect(X, 0, 2, c); } if (!isWall(x + 1, y)) { t.fillStyle = 'rgba(0,0,0,.35)'; t.fillRect(X + c - 2, 0, 2, c); }
          if (front) {
            t.fillStyle = `rgb(${fc[0]},${fc[1]},${fc[2]})`; t.fillRect(X, c, c, H);
            for (let j = 0; j < 3; j++) { for (let i = 0; i < 2; i++) { const bv = hash(x * 5 + i + j * 3, y * 11 + j); t.fillStyle = `rgba(${bv > .5 ? '255,255,255' : '0,0,0'},${Math.abs(bv - .5) * .22})`; t.fillRect(X + ((i + (j % 2) * .5) % 2) * c / 2, c + j * H / 3, c / 2, H / 3); } t.fillStyle = 'rgba(0,0,0,.4)'; t.fillRect(X, c + (j + 1) * H / 3 - 1, c, 1.2); t.fillRect(X + (j % 2 ? c * .25 : c * .5), c + j * H / 3, 1.2, H / 3); if (j % 2) t.fillRect(X + c * .75, c + j * H / 3, 1.2, H / 3); }
            const sh = t.createLinearGradient(0, c, 0, c + H); sh.addColorStop(0, 'rgba(255,255,255,.1)'); sh.addColorStop(.15, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.45)'); t.fillStyle = sh; t.fillRect(X, c, c, H);
            if (pl === 'tower' && !R.roof && hash(x, y + 40) > .62) { t.fillStyle = '#2a2630'; t.beginPath(); t.moveTo(X + c * .3, c + H * .9); t.lineTo(X + c * .3, c + H * .4); t.arc(X + c * .5, c + H * .4, c * .2, 3.1416, 0); t.lineTo(X + c * .7, c + H * .9); t.fill(); t.fillStyle = '#1a2450'; t.beginPath(); t.moveTo(X + c * .35, c + H * .9); t.lineTo(X + c * .35, c + H * .42); t.arc(X + c * .5, c + H * .42, c * .15, 3.1416, 0); t.lineTo(X + c * .65, c + H * .9); t.fill(); t.fillStyle = '#e0e6ff'; t.fillRect(X + c * .44, c + H * .5, 1.5, 1.5); t.fillRect(X + c * .56, c + H * .7, 1.5, 1.5); }
            const l = litAt[y * w + x]; if (l) { t.fillStyle = '#17120f'; t.fillRect(X + c * .46, c + H * .35, c * .08, H * .4); t.fillStyle = '#4a3020'; t.fillRect(X + c * .4, c + H * .28, c * .2, H * .14); }
          } else { const l = litAt[y * w + x]; if (l) { t.fillStyle = '#17120f'; t.fillRect(X + c * .44, c * .05, c * .12, c * .14); } }
          if (R.roof && (x + y) % 2) { t.fillStyle = 'rgba(0,0,0,.3)'; t.fillRect(X + c * .2, c * .2, c * .6, c * .6); }
        }
        t.restore();
        continue;
      }
      if (!p || p.k === 'water') continue;
      any = true; const by = H + c * .86, cx = X + c / 2; t.lineWidth = 1.2;
      const box = (ix, top, dep, colT, colF) => { t.fillStyle = 'rgba(0,0,0,.35)'; t.beginPath(); t.ellipse(cx + c * .05, by, c * (.5 - ix) * 1.08, c * .13, 0, 0, 7); t.fill(); t.fillStyle = colF; t.fillRect(X + ix * c, by - top, c - 2 * ix * c, top); t.fillStyle = colT; t.fillRect(X + ix * c, by - top - dep, c - 2 * ix * c, dep); t.strokeStyle = '#17120f'; t.strokeRect(X + ix * c, by - top - dep, c - 2 * ix * c, top + dep); t.beginPath(); t.moveTo(X + ix * c, by - top); t.lineTo(X + c - ix * c, by - top); t.stroke(); };
      switch (p.k) {
        case 'pillar': case 'stair': { const wd = p.k === 'stair' ? .36 : .25; E(t, cx + c * .06, by, c * (wd + .14), c * .14, 'rgba(0,0,0,.4)'); t.fillStyle = '#6e7280'; t.fillRect(cx - c * (wd + .08), by - c * .14, c * (2 * wd + .16), c * .14); const gr = t.createLinearGradient(cx - c * wd, 0, cx + c * wd, 0); gr.addColorStop(0, '#a6aab8'); gr.addColorStop(.35, '#8a8e9c'); gr.addColorStop(1, '#4c4f5c'); t.fillStyle = gr; t.fillRect(cx - c * wd, c * .16, c * 2 * wd, by - c * .3); t.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 1; i < 4; i++) t.fillRect(cx - c * wd, c * .16 + i * (by - c * .3) / 4, c * 2 * wd, 1.2); t.fillStyle = '#9ea2b0'; t.fillRect(cx - c * (wd + .1), c * .04, c * (2 * wd + .2), c * .14); t.strokeStyle = '#17120f'; t.strokeRect(cx - c * (wd + .1), c * .04, c * (2 * wd + .2), c * .14); break; }
        case 'statue': box(.2, c * .22, c * .2, '#8a8e9c', '#5c606e'); t.save(); try { t.filter = 'grayscale(1) brightness(.85) contrast(.9)'; } catch (e) { } FIG.draw(t, ['fighter', 'paladin', 'mage', 'cleric', 'ranger', 'monk'][(v * 6) | 0], cx, by - c * .36, c * .8, v > .5 ? 1 : -1); t.restore(); break;
        case 'shelf': { t.fillStyle = 'rgba(0,0,0,.35)'; t.fillRect(X + c * .02, by - c * .04, c, c * .1); t.fillStyle = '#4a2e18'; t.fillRect(X + c * .03, c * .02, c * .94, by - c * .02); t.fillStyle = '#6a4424'; t.fillRect(X + c * .03, c * .02, c * .94, c * .1); for (let j = 0; j < 3; j++) { const yy = c * .16 + j * (by - c * .2) / 3, hh = (by - c * .2) / 3 - c * .07; t.fillStyle = '#20140a'; t.fillRect(X + c * .08, yy, c * .84, hh); for (let i = 0; i < 7; i++) { const bv = hash(x * 9 + i, y * 5 + j); if (bv < .12) continue; t.fillStyle = ['#8e2a22', '#2a5a8e', '#d2aa52', '#3a7a4a', '#6a3a7a', '#c8c0a8', '#7a4a2a'][(bv * 7) | 0]; const bh = hh * (.7 + bv * .3); t.fillRect(X + c * (.1 + i * .115), yy + hh - bh, c * .095, bh); } } t.strokeStyle = '#17120f'; t.strokeRect(X + c * .03, c * .02, c * .94, by - c * .02); break; }
        case 'sarc': case 'sarc2': box(.14, c * .26, c * .5, '#9a9eac', '#666a78'); t.strokeStyle = 'rgba(0,0,0,.45)'; t.beginPath(); t.moveTo(cx, by - c * .7); t.lineTo(cx, by - c * .34); t.moveTo(cx - c * .13, by - c * .58); t.lineTo(cx + c * .13, by - c * .58); t.stroke(); break;
        case 'rubble': for (let i = 0; i < 6; i++) { const rx = X + c * (.15 + hash(x + i, y) * .7), ry = by - c * hash(x, y + i) * .5, rs = c * (.12 + hash(x * 3 + i, y * 2) * .14); P(t, [[rx - rs, ry], [rx - rs * .5, ry - rs], [rx + rs * .6, ry - rs * .8], [rx + rs, ry], [rx + rs * .4, ry + rs * .3]], `rgb(${90 + i * 8},${92 + i * 8},${104 + i * 8})`, '#17120f'); } break;
        case 'brazier': E(t, cx + c * .04, by, c * .3, c * .1, 'rgba(0,0,0,.4)'); t.strokeStyle = '#17120f'; t.lineWidth = 2.5; for (const dx of [-.2, 0, .2]) { t.beginPath(); t.moveTo(cx + dx * c, by); t.lineTo(cx + dx * c * .4, by - c * .4); t.stroke(); } P(t, [[cx - c * .3, by - c * .52], [cx + c * .3, by - c * .52], [cx + c * .2, by - c * .34], [cx - c * .2, by - c * .34]], '#3a302c', '#17120f'); E(t, cx, by - c * .52, c * .28, c * .08, '#ff8a2a'); break;
        case 'table': t.fillStyle = 'rgba(0,0,0,.3)'; t.fillRect(X + c * .1, by - c * .04, c * .86, c * .1); t.fillStyle = '#4a2e18'; t.fillRect(X + c * .12, by - c * .36, c * .07, c * .36); t.fillRect(X + c * .81, by - c * .36, c * .07, c * .36); t.fillStyle = '#6a4424'; t.fillRect(X + c * .06, by - c * .44, c * .88, c * .1); t.fillStyle = '#8a6238'; t.fillRect(X + c * .06, by - c * .78, c * .88, c * .36); t.strokeStyle = '#17120f'; t.strokeRect(X + c * .06, by - c * .78, c * .88, c * .44); t.fillStyle = '#e8dcc0'; t.fillRect(X + c * .16, by - c * .7, c * .26, c * .18); t.fillStyle = v > .5 ? '#7ad0ff' : '#c06ae0'; t.fillRect(X + c * .58, by - c * .86, c * .1, c * .22); t.fillStyle = '#3a7a4a'; t.fillRect(X + c * .74, by - c * .8, c * .08, c * .16); break;
        case 'cauldron': E(t, cx + c * .04, by, c * .36, c * .12, 'rgba(0,0,0,.4)'); E(t, cx, by - c * .28, c * .36, c * .3, '#1c1c22', '#0a0a0c'); E(t, cx, by - c * .5, c * .3, c * .1, '#34c060', '#0a0a0c'); break;
        case 'cage': t.fillStyle = 'rgba(0,0,0,.5)'; t.fillRect(X + c * .1, c * .2, c * .8, by - c * .2); t.fillStyle = '#ff5a3a'; t.fillRect(X + c * .36, by - c * .46, c * .06, c * .05); t.fillRect(X + c * .56, by - c * .46, c * .06, c * .05); t.strokeStyle = '#8a8e96'; t.lineWidth = 1.6; for (let i = 0; i <= 5; i++) { t.beginPath(); t.moveTo(X + c * (.1 + i * .16), c * .2); t.lineTo(X + c * (.1 + i * .16), by); t.stroke(); } t.strokeRect(X + c * .1, c * .2, c * .8, by - c * .2); break;
        case 'orrery': E(t, cx, by, c * .26, c * .09, 'rgba(0,0,0,.4)'); t.fillStyle = '#6a4a1c'; t.fillRect(cx - c * .05, by - c * .5, c * .1, c * .5); t.fillRect(cx - c * .2, by - c * .06, c * .4, c * .06); break;
        case 'rack': t.fillStyle = '#4a2e18'; t.fillRect(X + c * .08, by - c * .7, c * .06, c * .7); t.fillRect(X + c * .86, by - c * .7, c * .06, c * .7); t.fillRect(X + c * .08, by - c * .6, c * .84, c * .06); t.fillRect(X + c * .08, by - c * .2, c * .84, c * .06); for (let i = 0; i < 4; i++) { t.fillStyle = i % 2 ? '#cfd6de' : '#8a6238'; t.fillRect(X + c * (.22 + i * .17), by - c * (.95 - (i % 2) * .1), c * .05, c * .9); } break;
        case 'crate': box(.12, c * .44, c * .3, '#a87c46', '#7a5630'); t.strokeStyle = '#3a2410'; t.beginPath(); t.moveTo(X + c * .12, by - c * .44); t.lineTo(X + c * .88, by); t.moveTo(X + c * .88, by - c * .44); t.lineTo(X + c * .12, by); t.stroke(); break;
        case 'barrel': E(t, cx + c * .04, by, c * .32, c * .1, 'rgba(0,0,0,.4)'); t.fillStyle = '#6a4826'; t.fillRect(cx - c * .3, by - c * .62, c * .6, c * .62); E(t, cx, by, c * .3, c * .09, '#6a4826'); E(t, cx, by - c * .62, c * .3, c * .1, '#8e6638', '#17120f'); t.fillStyle = '#2a2420'; t.fillRect(cx - c * .3, by - c * .46, c * .6, c * .05); t.fillRect(cx - c * .3, by - c * .2, c * .6, c * .05); break;
        case 'cart': t.fillStyle = 'rgba(0,0,0,.35)'; t.fillRect(X + c * .04, by - c * .02, c * .96, c * .1); t.fillStyle = '#7a5430'; t.fillRect(X + c * .04, by - c * .56, c * .92, c * .36); t.fillStyle = '#9a7040'; t.fillRect(X + c * .04, by - c * .7, c * .92, c * .16); t.strokeStyle = '#17120f'; t.strokeRect(X + c * .04, by - c * .7, c * .92, c * .5); E(t, X + c * .24, by - c * .14, c * .15, c * .15, '#2a2018', '#17120f'); E(t, X + c * .76, by - c * .14, c * .15, c * .15, '#2a2018', '#17120f'); break;
        case 'stall': { const col = ['#b3312a', '#2a5a8e', '#3a7a4a', '#b8862a'][(v * 4) | 0]; t.fillStyle = '#4a2e18'; t.fillRect(X + c * .06, by - c * .9, c * .06, c * .9); t.fillRect(X + c * .88, by - c * .9, c * .06, c * .9); t.fillStyle = '#7a5430'; t.fillRect(X + c * .04, by - c * .4, c * .92, c * .4); for (let i = 0; i < 5; i++) { t.fillStyle = ['#d2aa52', '#c0382c', '#6fae5a', '#e8dcc0', '#b0522e'][i]; t.beginPath(); t.arc(X + c * (.18 + i * .16), by - c * .44, c * .06, 0, 7); t.fill(); } for (let i = 0; i < 6; i++) { t.fillStyle = i % 2 ? '#e8dcc0' : col; P(t, [[X - c * .04 + i * c * .18, c * .08], [X - c * .04 + (i + 1) * c * .18, c * .08], [X - c * .04 + (i + 1) * c * .18, c * .42], [X - c * .04 + i * c * .18 + c * .09, c * .5], [X - c * .04 + i * c * .18, c * .42]], t.fillStyle); } break; }
        case 'well': E(t, cx, by - c * .2, c * .42, c * .2, '#6e7280', '#17120f'); E(t, cx, by - c * .26, c * .3, c * .13, '#0a1220', '#17120f'); t.fillStyle = '#4a2e18'; t.fillRect(cx - c * .4, by - c * .9, c * .06, c * .7); t.fillRect(cx + c * .34, by - c * .9, c * .06, c * .7); t.fillRect(cx - c * .44, by - c * .96, c * .88, c * .08); break;
      }
    }
    roomRows.push(any ? cv : null);
  }

  /* ----- light sources, and which cells each one can see ----- */
  const fake = { room: R, w };
  const src = R.lights.map(l => ({ l, vis: new Uint8Array(w * h) })).concat((R._win || []).map(p => ({ l: { x: p[0], y: p[1], cx: Math.floor(p[0]), cy: Math.floor(p[1]), r: 2.2, c: [1, .78, .4], k: 'window' }, vis: new Uint8Array(w * h) })));
  for (const s of src) { const l = s.l, rad = Math.ceil(l.r); for (let y = Math.max(0, l.cy - rad); y <= Math.min(h - 1, l.cy + rad); y++) for (let x = Math.max(0, l.cx - rad); x <= Math.min(w - 1, l.cx + rad); x++) if (los(fake, l.cx, l.cy, x, y)) s.vis[y * w + x] = 1; }
  roomFX = lightRig(R, src, pl === 'crypt' ? [.62, [5, 5, 14]] : pl === 'slum' ? [.6, [8, 8, 24]] : R.roof ? [.4, [8, 10, 34]] : [.5, [12, 8, 22]], rr);
}
// What the lighting overlay needs: the light sources, two small canvases to compose darkness and glow, and some random numbers.
function lightRig(R, src, amb, rr) {
  const mk = () => { const cnv = document.createElement('canvas'); cnv.width = R.w * 2; cnv.height = R.h * 2; return cnv; }, dk = mk(), lt = mk();
  return { R, src, dk, lt, dkc: dk.getContext('2d'), ltc: lt.getContext('2d'), dkd: dk.getContext('2d').createImageData(R.w * 2, R.h * 2), ltd: lt.getContext('2d').createImageData(R.w * 2, R.h * 2), amb, off: 0, seed: [...Array(64)].map(() => rr()) };
}
// Lay one row of walls and props over the board. Called row by row so figures further back are drawn first.
function roomRow(g, c, y) { const cv = roomRows[y]; if (cv) g.drawImage(cv, 0, y * c - roomRise, B.w * c, c + roomRise); }
function roomRowsIn() { return roomRows.length > 0; }

// What was behind the door: a small picture of the entry, shown over the board for a few seconds.
let peekT = 0;
function peek(r) {
  const el = $('peek'); el.innerHTML = '<canvas width="640" height="340"></canvas><div class="cap"></div>'; const g = el.firstChild.getContext('2d'); g.scale(2, 2);
  const wall = g.createLinearGradient(0, 0, 0, 120); wall.addColorStop(0, '#2a2018'); wall.addColorStop(1, '#4a3828'); g.fillStyle = wall; g.fillRect(0, 0, 320, 120);
  for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#5a4028' : '#644830'; g.beginPath(); g.moveTo(160 + (i - 3.5) * 40, 120); g.lineTo(160 + (i - 2.5) * 40, 120); g.lineTo(160 + (i - 2.5) * 110, 170); g.lineTo(160 + (i - 3.5) * 110, 170); g.fill(); }
  g.fillStyle = '#17120f'; g.fillRect(232, 40, 44, 50); g.fillStyle = '#1a2450'; g.fillRect(236, 44, 36, 42); g.fillStyle = '#17120f'; g.fillRect(253, 44, 2, 42); // a shuttered window
  const gl = g.createRadialGradient(70, 60, 0, 70, 60, 130); gl.addColorStop(0, 'rgba(255,190,100,.55)'); gl.addColorStop(1, 'rgba(255,190,100,0)'); g.fillStyle = gl; g.fillRect(0, 0, 320, 170);
  g.fillStyle = '#6a4a2a'; g.fillRect(52, 96, 36, 6); g.fillRect(56, 102, 4, 30); g.fillRect(80, 102, 4, 30); g.fillStyle = '#e8dcc0'; g.fillRect(67, 80, 5, 16); g.fillStyle = '#ffd27a'; g.beginPath(); g.ellipse(69.5, 75, 3, 6, 0, 0, 7); g.fill(); // table and candle
  if (r.what === 'sarc') { g.fillStyle = 'rgba(20,30,70,.5)'; g.fillRect(0, 0, 320, 170); g.fillStyle = '#7a7e8c'; g.fillRect(96, 112, 150, 40); g.fillStyle = '#9a9eac'; g.save(); g.translate(100, 104); g.rotate(-.12); g.fillRect(0, 0, 150, 12); g.restore(); g.strokeStyle = '#17120f'; g.lineWidth = 2; g.strokeRect(96, 112, 150, 40); }
  if (r.what === 'shelf') { g.fillStyle = '#3a2414'; g.fillRect(226, 14, 78, 140); for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { g.fillStyle = ['#8e2a22', '#2a5a8e', '#d2aa52', '#3a7a4a', '#6a3a7a', '#c8c0a8'][(i * 5 + j * 3) % 6]; g.fillRect(232 + i * 11, 20 + j * 34, 9, 26); } }
  if (r.k === 'gold') { for (let i = 0; i < 9; i++) { g.fillStyle = '#d2aa52'; g.beginPath(); g.ellipse(130 + (i % 5) * 20 + (i > 4 ? 10 : 0), 104 - (i > 4 ? 8 : 0), 9, 4, 0, 0, 7); g.fill(); g.strokeStyle = '#7a5a1c'; g.lineWidth = 1; g.stroke(); } }
  if (r.k === 'page' || r.k === 'curse') { const col = r.k === 'curse' ? '170,90,255' : '255,220,140', gg = g.createRadialGradient(160, 110, 0, 160, 110, 90); gg.addColorStop(0, `rgba(${col},.7)`); gg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gg; g.fillRect(60, 20, 200, 150); g.fillStyle = '#e8dcc0'; g.beginPath(); g.moveTo(160, 100); g.lineTo(110, 92); g.lineTo(110, 132); g.lineTo(160, 140); g.lineTo(210, 132); g.lineTo(210, 92); g.fill(); g.strokeStyle = '#4a3020'; g.lineWidth = 2; g.stroke(); g.beginPath(); g.moveTo(160, 100); g.lineTo(160, 140); g.stroke(); g.fillStyle = 'rgba(40,30,20,.5)'; for (let j = 0; j < 5; j++) { g.fillRect(118, 102 + j * 6, 34, 1.5); g.fillRect(168, 102 + j * 6, 34, 1.5); } }
  if (r.k === 'nothing') { g.strokeStyle = 'rgba(230,230,240,.5)'; g.lineWidth = 1; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(14, 10); g.lineTo(14 + Math.cos(i * .26) * 90, 10 + Math.sin(i * .26) * 90); g.stroke(); } for (const q of [30, 55, 80]) { g.beginPath(); g.arc(14, 10, q, 0, 1.57); g.stroke(); } }
  if (r.fig) FIG.draw(g, r.fig, 190, 158, r.fig === 'imp' ? 120 : 100, -1);
  if (r.k === 'citizen') FIG.draw(g, 'citizen', 190, 156, 92, -1);
  if (r.k === 'ambush' && !r.fig) { FIG.draw(g, r.foe === 'Thug' ? 'thug' : 'cutpurse', 180, 160, 104, -1); g.fillStyle = 'rgba(255,60,40,.25)'; g.fillRect(0, 0, 320, 170); }
  if (r.k === 'locked') { g.fillStyle = '#5a3a1c'; g.fillRect(128, 112, 80, 40); g.fillStyle = '#7a5228'; g.fillRect(124, 96, 88, 20); g.strokeStyle = '#d2aa52'; g.lineWidth = 3; g.strokeRect(128, 112, 80, 40); g.strokeRect(124, 96, 88, 20); g.fillStyle = '#8a8e96'; g.fillRect(160, 108, 16, 16); g.strokeStyle = '#8a8e96'; g.beginPath(); g.arc(168, 108, 6, Math.PI, 0); g.stroke(); g.fillStyle = '#17120f'; g.fillRect(166, 113, 4, 6); }
  if (r.k === 'treasure') { g.fillStyle = '#5a3a1c'; g.fillRect(160, 118, 64, 34); g.fillStyle = '#7a5228'; g.fillRect(156, 106, 72, 16); g.strokeStyle = '#d2aa52'; g.lineWidth = 3; g.strokeRect(160, 118, 64, 34); g.strokeRect(156, 106, 72, 16); g.fillStyle = '#d2aa52'; g.fillRect(187, 116, 10, 12); g.fillStyle = '#e8dcc0'; g.save(); g.translate(250, 140); g.rotate(-.3); g.fillRect(-22, -6, 44, 12); g.restore(); g.fillStyle = '#b3312a'; g.fillRect(246, 134, 6, 12); }
  if (r.k === 'trap') { g.strokeStyle = '#d8d0c0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(20, 150); g.lineTo(300, 150); g.stroke(); g.fillStyle = '#4a3020'; g.fillRect(150, 92, 60, 10); g.fillRect(176, 102, 8, 40); g.strokeStyle = '#8a8e96'; g.lineWidth = 3; g.beginPath(); g.arc(180, 97, 34, 3.5, 5.9); g.stroke(); g.fillStyle = '#cfd6de'; g.beginPath(); g.moveTo(180, 97); g.lineTo(120, 120); g.lineTo(124, 112); g.fill(); }
  g.fillStyle = '#2a1a10'; g.fillRect(0, 0, 14, 170); g.fillRect(306, 0, 14, 170); g.fillRect(0, 0, 320, 10); g.strokeStyle = '#d2aa52'; g.lineWidth = 1.5; g.strokeRect(14, 10, 292, 160); // the doorway we are looking through
  el.lastChild.innerHTML = r.cap ? r.cap : r.k === 'citizen' ? `Someone is hiding inside. ${r.text}${r.gold ? ` They press <b class="gold">${r.gold} gp</b> on ${r.who}.` : ''}` : r.k === 'treasure' ? `Nobody home. ${r.who} takes <b class="gold">${r.item}</b>.` : r.k === 'trap' ? (r.safe ? `A wire across the threshold. ${r.who} spots it and steps over.` : `A wire across the threshold. The bolt catches ${r.who} for <b class="bad">${r.dmg}</b>.`) : `A ${r.foe} was waiting behind the door.`;
  el.classList.remove('hidden'); clearTimeout(peekT); peekT = setTimeout(() => el.classList.add('hidden'), 4600); el.onclick = () => el.classList.add('hidden');
  SND.play('door'); SND.play(r.k === 'treasure' || r.k === 'gold' ? 'coin' : r.k === 'page' ? 'heal' : r.k === 'curse' ? 'bolt' : r.k === 'trap' && !r.safe ? 'thunk' : r.k === 'ambush' ? 'thump' : 'tick', 700);
}
// How dark the unlit parts are: moody (as designed), soft, or bright for anyone who wants to see every foe.
let lightLv = 0; try { lightLv = +localStorage.getItem('the-hundred-light') || 0; } catch (e) { }
function cycleLight() { lightLv = (lightLv + 1) % 3; try { localStorage.setItem('the-hundred-light', lightLv); } catch (e) { } refresh(); }
// Light and shadow, flame, dust, rain. Drawn over everything, several times a second.
function roomOverlay(g, c, now) {
  const fx = roomFX; if (!fx || !B || fx.owner !== B) return;
  const R = fx.R, w = R.w, h = R.h, W = w * c, Ht = h * c, t = RM ? 0 : now / 1000, pl = R.place, sdv = fx.seed;
  for (const d of R.decor) if (d.k === 'wash') { // washing hung across the street
    const x = (d.x + .5) * c, y0 = d.y0 * c - c * .2, y1 = (d.y1 + 1) * c - c * .5; g.strokeStyle = '#d8d0c0'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + c * .12, (y0 + y1) / 2, x, y1); g.stroke();
    for (let i = 0, n = Math.max(2, Math.round((y1 - y0) / (c * .5))); i < n; i++) { const yy = y0 + (i + .5) * (y1 - y0) / n, sw = Math.sin(t * 1.6 + i + d.x) * c * .05; g.fillStyle = ['#c8c0b0', '#8e2a22', '#5a6a8c', '#d2aa52', '#e8dcc0'][(i + (d.v * 5 | 0)) % 5]; g.beginPath(); g.moveTo(x + c * .06, yy - c * .16); g.lineTo(x + c * .06, yy + c * .16); g.lineTo(x + c * .34 + sw, yy + c * .13); g.lineTo(x + c * .36 + sw, yy - c * .13); g.fill(); }
  }
  // gather lights: the room's own, and a lantern's worth around each hero
  const lights = fx.src.map(s => { const l = s.l, f = l.k === 'window' ? .55 : l.k === 'candle' ? .92 + Math.sin(t * 7 + l.x * 5) * .05 : 1 + Math.sin(t * 11 + l.x * 7) * .07 + Math.sin(t * 23 + l.y * 3) * .05; return { x: l.x, y: l.y, r: l.r, c: l.c, f, vis: s.vis }; });
  const fake = B;
  if (pl !== 'arena') for (const u of B.units) if (u.side === 'H' && u.hp > 0) lights.push({ x: u.x + .5, y: u.y + .5, r: u === sel ? 3.8 : 3.2, c: [.95, .86, .7], f: .72, u });
  for (const l of fxLights(now)) lights.push({ x: l.x + fx.off, y: l.y + fx.off, r: l.r, c: l.c, f: l.f, u: { x: Math.floor(l.x), y: Math.floor(l.y) } }); // spells and fire light the place up
  const SW = w * 2, SH = h * 2, dk = fx.dkd.data, lt = fx.ltd.data, D = fx.amb[0] * [1, .62, .3][lightLv], dc = fx.amb[1], acc = new Float32Array(SW * SH * 3);
  for (const l of lights) {
    const x0 = Math.max(0, Math.floor((l.x - l.r) * 2)), x1 = Math.min(SW - 1, Math.ceil((l.x + l.r) * 2)), y0 = Math.max(0, Math.floor((l.y - l.r) * 2)), y1 = Math.min(SH - 1, Math.ceil((l.y + l.r) * 2));
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) {
      const px = (i + .5) / 2, py = (j + .5) / 2, d = Math.hypot(px - l.x, py - l.y); if (d >= l.r) continue;
      const cx = i >> 1, cy = j >> 1; if (l.vis ? !l.vis[cy * w + cx] : !los(fake, l.u.x, l.u.y, cx - fx.off, cy - fx.off)) continue;
      const k = (1 - d / l.r) * (1 - d / l.r) * l.f, o = (j * SW + i) * 3; acc[o] += l.c[0] * k; acc[o + 1] += l.c[1] * k; acc[o + 2] += l.c[2] * k;
    }
  }
  for (let i = 0, n = SW * SH; i < n; i++) {
    const r = acc[i * 3], gg = acc[i * 3 + 1], b = acc[i * 3 + 2], lum = Math.min(1, Math.max(r, gg, b) * 1.25), m = Math.max(r, gg, b, .001);
    dk[i * 4] = dc[0]; dk[i * 4 + 1] = dc[1]; dk[i * 4 + 2] = dc[2]; dk[i * 4 + 3] = 255 * D * (1 - lum);
    lt[i * 4] = 255 * r / m; lt[i * 4 + 1] = 255 * gg / m; lt[i * 4 + 2] = 255 * b / m; lt[i * 4 + 3] = 255 * Math.min(1, m) * (fx.glow || .2);
  }
  fx.dkc.putImageData(fx.dkd, 0, 0); fx.ltc.putImageData(fx.ltd, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(fx.dk, 0, 0, W, Ht); g.globalCompositeOperation = 'lighter'; g.drawImage(fx.lt, 0, 0, W, Ht);
  // things that give off their own light
  for (const s of fx.src) {
    const l = s.l; if (l.k === 'window') continue; const x = l.x * c, y = (l.wy === 0 || l.k === 'lamp' ? l.y - .55 : l.k === 'brazier' ? l.y - .2 : l.k === 'cauldron' || l.k === 'orrery' ? l.y - .15 : l.y) * c, fl = Math.sin(t * 13 + l.x * 9) * .5 + .5;
    const col = l.k === 'cauldron' ? '110,255,140' : l.k === 'orrery' ? '255,225,140' : '255,170,70', gr = g.createRadialGradient(x, y, 0, x, y, c * (.5 + fl * .08)); gr.addColorStop(0, `rgba(${col},.85)`); gr.addColorStop(.3, `rgba(${col},.3)`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x - c * .6, y - c * .6, c * 1.2, c * 1.2);
    if (l.k === 'torch' || l.k === 'brazier' || l.k === 'lamp' || l.k === 'candle') { const s2 = c * (l.k === 'brazier' ? .2 : l.k === 'candle' ? .07 : .11); g.fillStyle = '#ffb040'; g.beginPath(); g.moveTo(x - s2, y); g.quadraticCurveTo(x - s2 * 1.1, y - s2 * 1.2, x + (fl - .5) * s2, y - s2 * (2.4 + fl * .8)); g.quadraticCurveTo(x + s2 * 1.1, y - s2 * 1.2, x + s2, y); g.fill(); g.fillStyle = '#fff2b0'; g.beginPath(); g.ellipse(x, y - s2 * .5, s2 * .45, s2 * .8, 0, 0, 7); g.fill();
      if (l.k !== 'candle' && l.k !== 'lamp' && !RM) for (let i = 0; i < 3; i++) { const ph = (t * .5 + i / 3 + l.x * .37) % 1; g.fillStyle = `rgba(255,${150 + ph * 60 | 0},60,${(1 - ph) * .9})`; g.fillRect(x + Math.sin(ph * 9 + i * 2 + l.x) * c * .16, y - c * (.2 + ph * 1.1), 2, 2); } }
    if (l.k === 'cauldron' && !RM) for (let i = 0; i < 3; i++) { const ph = (t * .7 + i / 3) % 1; g.strokeStyle = `rgba(160,255,180,${1 - ph})`; g.lineWidth = 1; g.beginPath(); g.arc(x + (i - 1) * c * .12, y - c * .1 - ph * c * .3, c * (.03 + ph * .05), 0, 7); g.stroke(); }
    if (l.k === 'orrery') { g.strokeStyle = 'rgba(240,200,110,.9)'; g.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const rr2 = c * (.22 + i * .14); g.beginPath(); g.ellipse(x, y - c * .35, rr2, rr2 * .38, .3 * i, 0, 7); g.stroke(); const a = t * (1.1 - i * .3) + i * 2; g.fillStyle = ['#7ad0ff', '#ff9a6a', '#e8e8f0'][i]; g.beginPath(); g.arc(x + Math.cos(a) * rr2, y - c * .35 + Math.sin(a) * rr2 * .38, c * .05, 0, 7); g.fill(); } g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(x, y - c * .35, c * .08, 0, 7); g.fill(); }
  }
  g.globalCompositeOperation = 'source-over';
  if (B.opened) for (const k in B.opened) { const [dx, dy] = k.split(',').map(Number); if (thingAt(B, dx, dy) !== 'door') { g.fillStyle = 'rgba(10,7,5,.75)'; g.beginPath(); g.arc((dx + .5) * c, (dy + .5) * c, c * .2, 0, 7); g.fill(); g.strokeStyle = '#d2aa52'; g.lineWidth = 2; g.beginPath(); g.moveTo((dx + .4) * c, (dy + .5) * c); g.lineTo((dx + .48) * c, (dy + .58) * c); g.lineTo((dx + .62) * c, (dy + .4) * c); g.stroke(); continue; }
    g.fillStyle = '#0a0705'; g.fillRect((dx + .3) * c, (dy + .5) * c, c * .4, c * .5); g.strokeStyle = '#d2aa52'; g.lineWidth = 1; g.strokeRect((dx + .3) * c, (dy + .5) * c, c * .4, c * .5); } // doors that have been tried stand open
  if (!RM) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (R.cells[y * w + x] === 3) { const ph = t * .8 + x * 1.7 + y * 2.3; g.strokeStyle = `rgba(150,190,230,${.12 + Math.sin(ph) * .08})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x * c + c * .15, y * c + c * (.35 + Math.sin(ph) * .1)); g.quadraticCurveTo(x * c + c * .5, y * c + c * (.25 + Math.cos(ph) * .1), x * c + c * .85, y * c + c * (.4 + Math.sin(ph + 1) * .1)); g.stroke(); }
    if (pl === 'slum') { const lv = fx.rain = (fx.rain == null ? 1 : fx.rain) + (SND.rain() - (fx.rain == null ? 1 : fx.rain)) * .08, fl = Date.now() - SND.flash(); if (fl > 0 && fl < 220) { g.fillStyle = `rgba(215,225,255,${.16 * (1 - fl / 220)})`; g.fillRect(0, 0, W, Ht); }
      g.strokeStyle = `rgba(190,205,235,${.12 + .2 * Math.min(1.2, lv)})`; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < Math.round(75 * Math.min(1.2, lv)); i++) { const x = (sdv[i % 64] * W * 1.3 + t * 40) % (W + 40) - 20, y = (sdv[(i * 7 + 3) % 64] * Ht + t * (520 + sdv[(i * 3) % 64] * 240) + i * 31) % Ht; g.moveTo(x, y); g.lineTo(x - c * .06, y + c * .32); } g.stroke();
      for (const d of R.decor) if (d.k === 'puddle') { const ph = (t * .9 + d.v * 3) % 1; g.strokeStyle = `rgba(190,205,235,${(1 - ph) * .5})`; g.beginPath(); g.ellipse((d.x + .5 + (d.v - .5) * .4) * c, (d.y + .5) * c, c * ph * .3, c * ph * .14, 0, 0, 7); g.stroke(); } }
    else { for (let i = 0; i < 26; i++) { const x = (sdv[i] * W + Math.sin(t * .3 + i) * c * 1.5 + t * 6) % W, y = (sdv[i + 30] * Ht + Math.cos(t * .23 + i * 2) * c - t * 4 + Ht * 9) % Ht; g.fillStyle = `rgba(255,235,200,${.1 + sdv[(i + 9) % 64] * .22})`; g.fillRect(x, y, 1.6, 1.6); } }
    if (pl === 'crypt') for (let i = 0; i < 4; i++) { const x = (sdv[i + 40] * W + t * (5 + i * 2)) % (W + c * 8) - c * 4, y = sdv[i + 50] * Ht, gr = g.createRadialGradient(x, y, 0, x, y, c * 4); gr.addColorStop(0, 'rgba(150,160,190,.09)'); gr.addColorStop(1, 'rgba(150,160,190,0)'); g.fillStyle = gr; g.fillRect(x - c * 4, y - c * 2, c * 8, c * 4); }
  }
  const vg = g.createRadialGradient(W / 2, Ht / 2, Math.min(W, Ht) * .35, W / 2, Ht / 2, Math.max(W, Ht) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, Ht);
}
