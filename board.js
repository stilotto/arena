'use strict';
/* The arena floor for the tactical board: sand, the podium wall and crowd around it, the great doors,
   and braziers that feed the same lighting overlay the quest rooms use. The grid sits one square in from each edge. */
function paintArena(g, c, b) {
  const w = b.w, h = b.h, GW = w + 2, GH = h + 2, W = GW * c, H = GH * c;
  let sd = 5 + b.day * 13 + w; const rr = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
  const CROWD = ['#c9b08a', '#8e2a22', '#d2aa52', '#5a4a8c', '#e8dcc0', '#3a2c22', '#7a3a7c', '#b0522e', '#40506a'];
  /* sand */
  const gr = g.createRadialGradient(W / 2, H / 2, H * .15, W / 2, H / 2, W * .72); gr.addColorStop(0, '#e2cb98'); gr.addColorStop(.7, '#cfb27c'); gr.addColorStop(1, '#b3935c'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < GW * GH * 12; i++) { g.fillStyle = rr() < .5 ? 'rgba(90,60,20,.11)' : 'rgba(255,240,200,.15)'; g.fillRect(rr() * W, rr() * H, 1 + rr() * 1.6, 1 + rr() * .6); }
  g.lineCap = 'round';
  for (let i = 0; i < GW * GH / 5; i++) { const x = rr() * W, y = rr() * H, l = c * (1 + rr() * 3); g.strokeStyle = `rgba(120,88,40,${.05 + rr() * .08})`; g.lineWidth = 1 + rr() * 1.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y + (rr() - .5) * c * .5, x + l, y + (rr() - .5) * c * .3); g.stroke(); }
  for (let i = 0, n = 3 + Math.floor(rr() * 4); i < n; i++) { const x = c * 2 + rr() * (W - c * 4), y = c * 2 + rr() * (H - c * 4); for (let j = 0; j < 4; j++) { g.fillStyle = `rgba(96,30,22,${.1 + rr() * .14})`; g.beginPath(); g.ellipse(x + (rr() - .5) * c, y + (rr() - .5) * c * .6, c * (.2 + rr() * .5), c * (.12 + rr() * .3), rr() * 3, 0, 7); g.fill(); } }
  for (let i = 0, n = 5 + Math.floor(rr() * 6); i < n; i++) { // what earlier games left behind
    const x = c * 1.5 + rr() * (W - c * 3), y = c * 1.5 + rr() * (H - c * 3), k = rr(), a = rr() * 6.28; g.save(); g.translate(x, y); g.rotate(a);
    if (k < .35) { g.strokeStyle = '#e6dec8'; g.lineWidth = Math.max(1.5, c * .07); g.beginPath(); g.moveTo(-c * .2, 0); g.lineTo(c * .2, 0); g.moveTo(-c * .05, -c * .14); g.lineTo(c * .12, c * .1); g.stroke(); }
    else if (k < .6) { g.strokeStyle = '#8a8e96'; g.lineWidth = Math.max(1.5, c * .07); g.beginPath(); g.moveTo(-c * .25, 0); g.lineTo(c * .12, 0); g.stroke(); g.strokeStyle = '#6b4a2a'; g.beginPath(); g.moveTo(-c * .25, -c * .08); g.lineTo(-c * .25, c * .08); g.stroke(); }
    else if (k < .8) { g.fillStyle = '#8a8e96'; g.beginPath(); g.arc(0, 0, c * .13, 3.14, 0); g.fill(); g.fillStyle = '#b3312a'; g.fillRect(-c * .03, -c * .2, c * .06, c * .1); }
    else { g.strokeStyle = '#6b4a2a'; g.lineWidth = Math.max(1, c * .04); g.beginPath(); g.moveTo(-c * .22, 0); g.lineTo(c * .2, 0); g.stroke(); g.fillStyle = '#b3312a'; g.fillRect(-c * .24, -c * .04, c * .08, c * .08); }
    g.restore(); }
  const edge = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .4, W / 2, H / 2, Math.max(W, H) * .72); edge.addColorStop(0, 'rgba(60,30,10,0)'); edge.addColorStop(1, 'rgba(60,30,10,.4)'); g.fillStyle = edge; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(90,60,20,.12)'; g.lineWidth = 1; g.beginPath(); for (let x = 1; x < w; x++) { g.moveTo((x + 1) * c + .5, c); g.lineTo((x + 1) * c + .5, (h + 1) * c); } for (let y = 1; y < h; y++) { g.moveTo(c, (y + 1) * c + .5); g.lineTo((w + 1) * c, (y + 1) * c + .5); } g.stroke();
  g.strokeStyle = 'rgba(255,248,225,.5)'; g.lineWidth = 2; g.setLineDash([c * .3, c * .2]); g.strokeRect(c, c, w * c, h * c); g.setLineDash([]);

  /* the wall and the crowd */
  const span = d => Math.min(5, (d === 'N' || d === 'S' ? w : h) - 2), has = d => b.doors.includes(d);
  const inDoor = (d, i) => has(d) && Math.abs(i - (d === 'N' || d === 'S' ? GW : GH) / 2) < span(d) / 2 + .3;
  const heads = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) { g.fillStyle = CROWD[Math.floor(rr() * CROWD.length)]; g.beginPath(); g.arc(x0 + rr() * (x1 - x0), y0 + rr() * (y1 - y0), Math.max(1.5, c * .085), 0, 7); g.fill(); } };
  const stone = (x, y, ww, hh, col, rows) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); g.fillStyle = 'rgba(0,0,0,.28)'; for (let j = 1; j <= rows; j++) g.fillRect(x, y + j * hh / rows - 1, ww, 1.3); for (let j = 0; j < rows; j++) for (let i = (j % 2) * c * .5; i < ww; i += c) g.fillRect(x + i, y + j * hh / rows, 1.3, hh / rows); };
  // north: we see its face, with the crowd looking down over the top
  g.fillStyle = '#231a14'; g.fillRect(0, 0, W, c * .42); heads(0, c * .06, W, c * .36, GW * 9);
  stone(0, c * .4, W, c * .6, '#7a6a56', 2); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, c * .4, W, 2); g.fillStyle = '#8e2a22'; g.fillRect(0, c * .44, W, c * .07);
  const sh = g.createLinearGradient(0, c, 0, c * 1.7); sh.addColorStop(0, 'rgba(40,16,4,.5)'); sh.addColorStop(1, 'rgba(40,16,4,0)'); g.fillStyle = sh; g.fillRect(0, c, W, c * .7);
  for (let i = 1.5; i < GW - 1; i += 3) if (!inDoor('N', i + .5)) { g.fillStyle = '#b3312a'; g.fillRect(i * c + c * .22, c * .5, c * .56, c * .42); g.fillStyle = '#17120f'; g.beginPath(); g.arc(i * c + c * .5, c * .7, c * .12, 0, 7); g.fill(); g.fillStyle = '#f0c56a'; g.beginPath(); g.ellipse(i * c + c * .5, c * .7, c * .03, c * .08, 0, 0, 7); g.fill(); }
  // south, west and east: we see the top of the wall and the first rows behind it
  stone(0, H - c * .62, W, c * .34, '#8c7b66', 1); g.fillStyle = '#231a14'; g.fillRect(0, H - c * .3, W, c * .3); heads(0, H - c * .26, W, H - c * .04, GW * 7);
  for (const x of [0, W - c * .62]) { stone(x === 0 ? c * .3 : x, 0, c * .32, H, '#83735e', Math.round(GH * 1.5)); g.fillStyle = '#231a14'; g.fillRect(x === 0 ? 0 : W - c * .3, 0, c * .3, H); heads(x === 0 ? c * .04 : W - c * .26, 0, x === 0 ? c * .26 : W - c * .04, H, GH * 6); }
  // Vhorax's box above the north wall
  const bx = (has('N') ? GW * .22 : GW / 2) * c; g.fillStyle = '#2a0f24'; g.fillRect(bx - c * 1.3, 0, c * 2.6, c * .5); g.fillStyle = '#8e2a22'; g.beginPath(); g.moveTo(bx - c * 1.5, 0); g.lineTo(bx + c * 1.5, 0); g.lineTo(bx + c * 1.3, c * .16); g.lineTo(bx - c * 1.3, c * .16); g.fill(); g.strokeStyle = '#d2aa52'; g.lineWidth = 1.5; g.strokeRect(bx - c * 1.3, c * .02, c * 2.6, c * .48);
  g.fillStyle = '#120b09'; g.beginPath(); g.arc(bx, c * .32, c * .14, 0, 7); g.fill(); g.fillStyle = '#f0c56a'; g.beginPath(); g.ellipse(bx, c * .32, c * .035, c * .1, 0, 0, 7); g.fill();
  // the great doors
  for (const d of b.doors) {
    const len = span(d) * c, v = d === 'E' || d === 'W', x = d === 'E' ? W - c * .7 : d === 'W' ? 0 : (W - len) / 2, y = d === 'N' ? 0 : d === 'S' ? H - c * .7 : (H - len) / 2, ww = v ? c * .7 : len, hh = v ? len : (d === 'N' ? c : c * .7);
    g.fillStyle = '#4a3a2c'; g.fillRect(x - (v ? 0 : c * .15), y - (v ? c * .15 : 0), ww + (v ? 0 : c * .3), hh + (v ? c * .3 : 0)); g.fillStyle = '#0a0705'; g.fillRect(x, y, ww, hh);
    g.fillStyle = '#8a5a2a'; const lw = len * .16; if (v) { g.fillRect(x, y, ww, lw); g.fillRect(x, y + len - lw, ww, lw); } else { g.fillRect(x, y, lw, hh); g.fillRect(x + len - lw, y, lw, hh); }
    g.strokeStyle = '#d2aa52'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, ww - 2, hh - 2);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#d2aa52'; g.beginPath(); g.arc(v ? x + ww / 2 : x + (i < 2 ? lw / 2 : len - lw / 2), v ? y + (i < 2 ? lw / 2 : len - lw / 2) : y + hh * (i % 2 ? .3 : .7), Math.max(1.5, c * .05), 0, 7); g.fill(); }
  }
  /* braziers along the wall light the sand */
  const lights = [], bowl = (x, y) => { g.fillStyle = '#17120f'; g.fillRect(x - c * .04, y, c * .08, c * .22); g.fillStyle = '#3a302c'; g.beginPath(); g.moveTo(x - c * .2, y - c * .08); g.lineTo(x + c * .2, y - c * .08); g.lineTo(x + c * .12, y + c * .06); g.lineTo(x - c * .12, y + c * .06); g.fill(); g.fillStyle = '#ff8a2a'; g.beginPath(); g.ellipse(x, y - c * .08, c * .17, c * .05, 0, 0, 7); g.fill(); };
  const add = (x, y) => { lights.push({ x, y, cx: Math.floor(x), cy: Math.floor(y), r: 5.6, c: [1, .6, .27], k: 'brazier' }); bowl(x * c, (y + .12) * c); };
  for (let i = 2; i < GW - 1; i += 4) { if (!inDoor('N', i + .5)) add(i + .5, 1.05); if (!inDoor('S', i + .5)) add(i + .5, GH - .95); }
  for (let j = 3; j < GH - 2; j += 4) { if (!inDoor('W', j + .5)) add(.95, j + .5); if (!inDoor('E', j + .5)) add(GW - .95, j + .5); }
  roomRows = [];
  roomFX = lightRig({ w: GW, h: GH, cells: new Uint8Array(GW * GH), decor: [], place: 'arena', lights }, lights.map(l => ({ l, vis: new Uint8Array(GW * GH).fill(1) })), [.36, [26, 8, 16]], rr);
  roomFX.off = 1; roomFX.glow = .1;
}
