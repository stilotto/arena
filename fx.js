'use strict';
/* Battle effects on the board: blows, arrows, spells, breath, deaths. The engine only records what happened
   (B.fx); this file decides how it looks. Times are in milliseconds since the event. */
const FXD = { slash: 420, shot: 320, spell: 1250, breath: 950, gaze: 620, die: 560, txt: 850, burst: 420, move: 260, line: 0 };
const SPELLCOL = { missile: '150,200,255', sleep: '150,140,255', fireball: '255,150,60', colours: '255,170,255', phantom: '200,130,255', cure: '125,255,150', loh: '255,230,150', turn: '255,250,220', entangle: '110,210,110', web: '230,230,240', lightning: '200,230,255', bless: '255,225,140', hold: '255,235,170' };
const fxh = i => { const v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); };
const ease = k => k * k * (3 - 2 * k), cl01 = k => Math.max(0, Math.min(1, k));

// Before the figures are drawn: who is lunging, who is flashing from a hit, and which of the fallen still stand
// because the blow that kills them has not landed yet.
function fxPre(now) {
  const ghost = new Set(), off = new Map(), flash = new Map();
  for (const f of B.fx) {
    const a = now - f.t;
    if (f.k === 'die' && a < 0) ghost.add(f.u);
    if (RM) continue;
    if (f.k === 'slash' && a >= 0 && a < 220) { const k = Math.sin(a / 220 * Math.PI) * .3; off.set(f.a[0] + ',' + f.a[1], [(f.b[0] - f.a[0]) * k, (f.b[1] - f.a[1]) * k]); }
    if ((f.k === 'slash' || f.k === 'shot') && f.hit) { const h = a - f.lag; if (h >= 0 && h < 180) { flash.set(f.b[0] + ',' + f.b[1], 1 - h / 180); const d = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]) || 1, k = Math.sin(h / 180 * Math.PI) * .1; if (!off.has(f.b[0] + ',' + f.b[1])) off.set(f.b[0] + ',' + f.b[1], [(f.b[0] - f.a[0]) / d * k, (f.b[1] - f.a[1]) / d * k]); } }
    if (f.k === 'spell' && a >= 0 && a < 250) off.set(f.a[0] + ',' + f.a[1], [0, -Math.sin(a / 250 * Math.PI) * .12]);
  }
  return { ghost, off, flash };
}
function hitFlash(g, st, u, x, y, c) { const fl = st.flash.get(u.x + ',' + u.y); if (!fl) return; g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 0, x, y, c * .6); gr.addColorStop(0, `rgba(255,235,215,${fl * .9})`); gr.addColorStop(1, 'rgba(255,90,60,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, c * .6, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over'; }

// Light thrown by effects, for the lighting overlay: a fireball lights the whole arena for a moment.
function fxLights(now) {
  const out = []; if (!B || RM) return out;
  for (const f of B.fx) {
    const a = now - f.t; if (a < 0 || a > 1400) continue;
    if (f.k === 'spell') {
      const tt = a - 250, T = Math.max(1, f.lag - 250);
      if (f.id === 'fireball') { if (tt < T) { const k = cl01(tt / T); out.push({ x: f.a[0] + (f.b[0] - f.a[0]) * k + .5, y: f.a[1] + (f.b[1] - f.a[1]) * k + .5, r: 3, c: [1, .6, .25], f: .9 }); } else if (tt - T < 700) out.push({ x: f.b[0] + .5, y: f.b[1] + .5, r: 7.5, c: [1, .62, .28], f: 1.9 * (1 - (tt - T) / 700) }); }
      else if (f.id === 'lightning' && tt >= 0 && tt < 420) out.push({ x: f.b[0] + .5, y: f.b[1] + .5, r: 9, c: [.8, .9, 1], f: 2 * (1 - tt / 420) });
      else if (f.id === 'missile' && tt >= 0 && tt < T + 300) { const k = cl01(tt / T); out.push({ x: f.a[0] + (f.b[0] - f.a[0]) * k + .5, y: f.a[1] + (f.b[1] - f.a[1]) * k + .5, r: 2.6, c: [.55, .75, 1], f: 1 }); }
      else if (a < 900) { const c = (SPELLCOL[f.id] || '255,255,255').split(',').map(v => v / 255); out.push({ x: (a < 250 ? f.a[0] : f.b[0]) + .5, y: (a < 250 ? f.a[1] : f.b[1]) + .5, r: f.id === 'turn' ? 6 : 2.8 + (f.r || 0), c, f: (f.id === 'turn' ? 1.5 : .9) * (1 - a / 900) }); }
    } else if (f.k === 'breath' && a < 900) out.push({ x: f.b[0] + .5, y: f.b[1] + .5, r: 5.5, c: [1, .55, .2], f: 1.6 * Math.sin(cl01(a / 900) * Math.PI) });
    else if (f.k === 'shot' && f.w === 'bolt' && a < f.lag) { const k = a / f.lag; out.push({ x: f.a[0] + (f.b[0] - f.a[0]) * k + .5, y: f.a[1] + (f.b[1] - f.a[1]) * k + .5, r: 2, c: [.8, .45, 1], f: .9 }); }
    else if (f.k === 'gaze' && a < 600) out.push({ x: f.b[0] + .5, y: f.b[1] + .5, r: 4, c: [1, .85, .45], f: 1.3 * (1 - a / 600) });
  }
  return out;
}

function drawFx(g, c, now) {
  let live = false; const P = a => [(a[0] + .5) * c, (a[1] + .5) * c], BW = B.w * c, BH = B.h * c;
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineCap = 'round'; g.lineJoin = 'round';
  const glow = (x, y, r, col, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  const rays = (x, y, r0, r1, n, col, a, wd, rot) => { g.strokeStyle = `rgba(${col},${a})`; g.lineWidth = wd; g.beginPath(); for (let i = 0; i < n; i++) { const th = i / n * 6.283 + (rot || 0); g.moveTo(x + Math.cos(th) * r0, y + Math.sin(th) * r0); g.lineTo(x + Math.cos(th) * r1, y + Math.sin(th) * r1); } g.stroke(); };
  const ring = (x, y, r, col, a, wd) => { g.strokeStyle = `rgba(${col},${a})`; g.lineWidth = wd; g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, 7); g.stroke(); };
  const word = (s, x, y, col, a, px) => { g.globalAlpha = a; g.font = `700 ${px}px Georgia,serif`; g.lineWidth = 3; g.strokeStyle = '#1a1410'; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y); g.globalAlpha = 1; };
  for (const f of B.fx) {
    const t = now - f.t, D = (FXD[f.k] || 500) + (f.k === 'shot' || f.k === 'spell' ? f.lag : 0) + (f.n || 0) * 70;
    if (t > D) continue; live = true; if (t < 0) continue;
    const [ax, ay] = f.a ? P(f.a) : [0, 0], [bx, by] = f.b ? P(f.b) : [ax, ay];
    if (f.k === 'txt') { const k = t / FXD.txt, big = +f.s >= 10 ? 1.25 : 1, pop = RM ? 1 : 1 + .7 * Math.max(0, 1 - t / 130); word(f.s, ax, ay - c * .25 - (RM ? 0 : ease(k) * c * .85), f.c, 1 - k * k * k, Math.max(12, Math.floor(c * .62)) * big * pop); continue; }
    if (RM) { if ((f.k === 'slash' || f.k === 'shot' || f.k === 'spell' || f.k === 'breath' || f.k === 'gaze') && t < 260) { g.strokeStyle = f.k === 'spell' ? `rgb(${SPELLCOL[f.id] || '255,255,255'})` : '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); } continue; }
    const th = Math.atan2(by - ay, bx - ax), dist = Math.hypot(bx - ax, by - ay);
    switch (f.k) {
      case 'slash': {
        const k = cl01(t / 240), col = f.crit ? '210,150,255' : f.side === 'H' ? '255,255,255' : '255,190,160';
        g.globalCompositeOperation = 'lighter';
        for (const [rad, wd, al] of [[.46, .2, .9], [.34, .09, .6]]) { g.strokeStyle = `rgba(${col},${al * (1 - k)})`; g.lineWidth = c * wd * (1 - k * .7); g.beginPath(); g.arc(bx - Math.cos(th) * c * .12, by - Math.sin(th) * c * .12, c * rad, th - 1.25, th - 1.25 + 2.5 * ease(cl01(t / 150))); g.stroke(); }
        if (f.hit && t > 100) { const h = cl01((t - 100) / 260); rays(bx, by, c * .15 + c * .3 * h, c * .3 + c * .5 * h, 7, '255,225,160', 1 - h, 2, th); glow(bx, by, c * .5, '255,120,80', .5 * (1 - h)); }
        g.globalCompositeOperation = 'source-over';
        if (!f.hit && t > 140) word('miss', bx, by - c * .3 - (t - 140) / 280 * c * .4, '#c8c0b0', cl01(1 - (t - 140) / 280), Math.max(10, c * .38));
        break; }
      case 'shot': {
        const k = t / f.lag;
        if (k < 1 || !f.hit) {
          const kk = Math.min(k, 1.25), lift = f.w === 'bolt' ? 0 : -Math.sin(Math.min(1, kk) * Math.PI) * dist * .1, x = ax + (bx - ax) * kk, y = ay + (by - ay) * kk + lift, al = k < 1 ? 1 : cl01(1 - (k - 1) / .25);
          const dth = Math.atan2(by - ay + Math.cos(Math.min(1, kk) * Math.PI) * -dist * .1 * Math.PI, bx - ax);
          if (f.w === 'bolt') { g.globalCompositeOperation = 'lighter'; for (let i = 5; i >= 0; i--) { const q = Math.max(0, kk - i * .05); glow(ax + (bx - ax) * q, ay + (by - ay) * q, c * (.3 - i * .035), '200,110,255', .8 * al * (1 - i / 6)); } g.globalCompositeOperation = 'source-over'; g.fillStyle = `rgba(255,235,255,${al})`; g.beginPath(); g.arc(x, y, c * .07, 0, 7); g.fill(); }
          else { const len = c * (f.w === 'dart' ? .3 : .55), tx = x - Math.cos(dth) * len, ty = y - Math.sin(dth) * len;
            g.strokeStyle = `rgba(255,255,255,${.25 * al})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x - Math.cos(dth) * len * 2.6, y - Math.sin(dth) * len * 2.6); g.lineTo(tx, ty); g.stroke();
            g.strokeStyle = `rgba(26,20,16,${al})`; g.lineWidth = 4; g.beginPath(); g.moveTo(tx, ty); g.lineTo(x, y); g.stroke(); g.strokeStyle = `rgba(232,220,192,${al})`; g.lineWidth = 2; g.beginPath(); g.moveTo(tx, ty); g.lineTo(x, y); g.stroke();
            g.fillStyle = `rgba(207,214,222,${al})`; g.beginPath(); g.moveTo(x + Math.cos(dth) * c * .12, y + Math.sin(dth) * c * .12); g.lineTo(x + Math.cos(dth + 2.5) * c * .1, y + Math.sin(dth + 2.5) * c * .1); g.lineTo(x + Math.cos(dth - 2.5) * c * .1, y + Math.sin(dth - 2.5) * c * .1); g.fill();
            if (f.w === 'arrow') { g.strokeStyle = `rgba(179,49,42,${al})`; g.lineWidth = 2; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + Math.cos(dth + 2.6) * c * .1, ty + Math.sin(dth + 2.6) * c * .1); g.moveTo(tx, ty); g.lineTo(tx + Math.cos(dth - 2.6) * c * .1, ty + Math.sin(dth - 2.6) * c * .1); g.stroke(); } }
          if (!f.hit && k > 1) word('miss', bx, by - c * .3, '#c8c0b0', al, Math.max(10, c * .38));
        } else { const h = cl01((t - f.lag) / 300); g.globalCompositeOperation = 'lighter'; rays(bx, by, c * .1 + c * .25 * h, c * .25 + c * .5 * h, 6, f.w === 'bolt' ? '220,140,255' : '255,235,190', 1 - h, 2, th); glow(bx, by, c * .45, f.w === 'bolt' ? '200,110,255' : '255,200,140', .55 * (1 - h)); g.globalCompositeOperation = 'source-over'; }
        break; }
      case 'spell': {
        const col = SPELLCOL[f.id] || '255,255,255', W = 250, tt = t - W, T = Math.max(1, f.lag - W), R = ((f.r || 0) + .55) * c;
        if (t < W + 160) { // the incantation: a turning circle of light under the caster
          const k = cl01(t / W), al = t < W ? k : cl01(1 - (t - W) / 160); g.globalCompositeOperation = 'lighter'; glow(ax, ay, c * .8, col, .35 * al);
          g.strokeStyle = `rgba(${col},${al})`; g.lineWidth = 2; g.setLineDash([c * .14, c * .09]); g.lineDashOffset = -t * .06; g.beginPath(); g.ellipse(ax, ay + c * .25, c * (.35 + .25 * k), c * (.16 + .1 * k), 0, 0, 7); g.stroke(); g.setLineDash([]);
          g.beginPath(); for (let i = 0; i <= 3; i++) { const a2 = i / 3 * 6.283 + t * .008; i ? g.lineTo(ax + Math.cos(a2) * c * .34 * k, ay + c * .25 + Math.sin(a2) * c * .15 * k) : g.moveTo(ax + Math.cos(a2) * c * .34 * k, ay + c * .25 + Math.sin(a2) * c * .15 * k); } g.stroke();
          for (let i = 0; i < 5; i++) { const ph = (t / 380 + i / 5) % 1; g.fillStyle = `rgba(${col},${(1 - ph) * al})`; g.fillRect(ax + Math.cos(i * 2.4) * c * .32, ay + c * .2 - ph * c * .9, 2.5, 2.5); }
          g.globalCompositeOperation = 'source-over';
        }
        if (tt < 0) break;
        g.globalCompositeOperation = 'lighter';
        switch (f.id) {
          case 'missile': for (let i = 0; i < f.n; i++) { const ti = tt - i * 70; if (ti < 0) continue; const side = (i % 2 ? 1 : -1) * (.5 + (i >> 1) * .45), pos = k => { const e = ease(cl01(k)), bow = Math.sin(e * Math.PI) * side * c * 1.1; return [ax + (bx - ax) * e - Math.sin(th) * bow, ay + (by - ay) * e + Math.cos(th) * bow]; };
              if (ti < T) { for (let j = 7; j >= 0; j--) { const [x, y] = pos((ti - j * 16) / T); glow(x, y, c * (.24 - j * .022), col, .85 * (1 - j / 8)); } const [x, y] = pos(ti / T); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, c * .06, 0, 7); g.fill(); }
              else if (ti - T < 240) { const h = (ti - T) / 240; rays(bx, by, c * .1 + c * .3 * h, c * .3 + c * .6 * h, 8, col, 1 - h, 2.5, i); glow(bx, by, c * .6, col, .7 * (1 - h)); } } break;
          case 'fireball': if (tt < T) { const k = ease(tt / T), x = ax + (bx - ax) * k, y = ay + (by - ay) * k - Math.sin(k * Math.PI) * dist * .08; for (let j = 6; j >= 0; j--) { const q = Math.max(0, k - j * .04); glow(ax + (bx - ax) * q, ay + (by - ay) * q - Math.sin(q * Math.PI) * dist * .08, c * (.34 - j * .03), j < 2 ? '255,230,150' : '255,120,40', .8 * (1 - j / 7)); } g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(x, y, c * .1, 0, 7); g.fill(); }
            else { const e = cl01((tt - T) / 650), r = R * (.25 + .75 * ease(cl01(e * 2.2))), al = 1 - e * e; if (e < .3) { g.fillStyle = `rgba(255,170,80,${.2 * (1 - e / .3)})`; g.fillRect(-c, -c, BW + 2 * c, BH + 2 * c); }
              const gr = g.createRadialGradient(bx, by, 0, bx, by, r); gr.addColorStop(0, `rgba(255,246,192,${al})`); gr.addColorStop(.35, `rgba(255,176,64,${al})`); gr.addColorStop(.75, `rgba(255,80,20,${al * .7})`); gr.addColorStop(1, 'rgba(60,20,10,0)'); g.fillStyle = gr; g.beginPath(); g.arc(bx, by, r, 0, 7); g.fill();
              ring(bx, by, R * 1.15 * ease(cl01(e * 1.6)), '255,220,160', .8 * (1 - e), 3);
              for (let i = 0; i < 18; i++) { const a2 = i * 2.399, d = R * (.3 + fxh(i) * .95) * ease(cl01(e * 1.4)); g.fillStyle = `rgba(255,${120 + fxh(i + 9) * 120 | 0},40,${1 - e})`; g.fillRect(bx + Math.cos(a2) * d, by + Math.sin(a2) * d - e * c * .5 * fxh(i + 3), 3, 3); } } break;
          case 'lightning': if (tt < 420) { const sd = Math.floor(tt / 55) * 7 + f.b[0], al = tt < 260 ? 1 : 1 - (tt - 260) / 160; if (tt < 90) { g.fillStyle = `rgba(210,230,255,${.3 * (1 - tt / 90)})`; g.fillRect(-c, -c, BW + 2 * c, BH + 2 * c); }
              const bolt = (x0, y0, x1, y1, n, jit, s0) => { const pts = [[x0, y0]]; for (let i = 1; i < n; i++) pts.push([x0 + (x1 - x0) * i / n + (fxh(s0 + i) - .5) * jit, y0 + (y1 - y0) * i / n + (fxh(s0 + i * 3) - .5) * jit * .4]); pts.push([x1, y1]); for (const [wd, cc, aa] of [[c * .34, col, .25], [c * .12, col, .7], [2.2, '255,255,255', 1]]) { g.strokeStyle = `rgba(${cc},${aa * al})`; g.lineWidth = wd; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); } return pts; };
              const main = bolt(bx + (fxh(f.b[1]) - .5) * c * 3, -c * 1.5, bx, by, 9, c * 1.1, sd); bolt(main[4][0], main[4][1], main[4][0] + (fxh(sd) - .5) * c * 4, main[4][1] + c * 2, 4, c * .7, sd + 20); bolt(main[6][0], main[6][1], main[6][0] + (fxh(sd + 5) - .5) * c * 3, main[6][1] + c * 1.5, 3, c * .6, sd + 40);
              glow(bx, by, R * 1.2, col, .7 * al); ring(bx, by, R * ease(cl01(tt / 250)), '255,255,255', al, 2.5); } break;
          case 'sleep': if (tt < 900) { const k = tt / 900; for (const o of [0, .35]) { const kk = cl01(k * 1.5 - o); ring(bx, by, R * ease(kk), col, .8 * (1 - kk), c * .14 * (1 - kk) + 1); } glow(bx, by, R, col, .3 * (1 - k)); g.globalCompositeOperation = 'source-over'; for (let i = 0; i < 6; i++) { const ph = cl01(k * 1.3 - i * .08); if (ph > 0 && ph < 1) word('z', bx + (fxh(i) - .5) * R * 1.5 + Math.sin(ph * 6 + i) * c * .15, by + (fxh(i + 4) - .5) * R - ph * c * .9, '#c8c0ff', 1 - ph, c * (.3 + fxh(i + 8) * .3)); } } break;
          case 'colours': if (tt < 520) { const k = tt / 520, len = (dist + c * 1.5) * ease(cl01(k * 2)); ['255,80,80', '255,170,60', '255,240,90', '110,230,110', '90,180,255', '150,110,255', '255,120,220'].forEach((cc, i) => { const a2 = th + (i - 3) * .13; g.strokeStyle = `rgba(${cc},${.85 * (1 - k)})`; g.lineWidth = c * .13; g.beginPath(); g.moveTo(ax + Math.cos(a2) * c * .3, ay + Math.sin(a2) * c * .3); g.lineTo(ax + Math.cos(a2) * len, ay + Math.sin(a2) * len); g.stroke(); }); glow(bx, by, R, '255,255,255', .4 * (1 - k)); } break;
          case 'phantom': if (tt < 600) { const k = tt / 600; for (let i = 0; i < 3; i++) { g.strokeStyle = `rgba(${col},${1 - k})`; g.lineWidth = 2.5; g.beginPath(); g.arc(bx, by, c * (.6 - .35 * k), i * 2.09 + tt * .012, i * 2.09 + tt * .012 + 1.3); g.stroke(); } glow(bx, by, c * .7, col, .5 * (1 - k)); } break;
          case 'cure': case 'loh': if (tt < T) { const k = tt / T; glow(ax + (bx - ax) * k, ay + (by - ay) * k, c * .3, col, .9); }
            else if (tt - T < 800) { const k = (tt - T) / 800, gr = g.createLinearGradient(0, by - c * 1.4, 0, by + c * .4); gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(.7, `rgba(${col},${.5 * (1 - k)})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(bx - c * .32, by - c * 1.4, c * .64, c * 1.8); ring(bx, by + c * .3, c * .45 * ease(cl01(k * 2)), col, 1 - k, 2);
              for (let i = 0; i < 6; i++) { const ph = (k * 1.4 + i / 6) % 1, x = bx + (fxh(i) - .5) * c * .7, y = by + c * .3 - ph * c * 1.2, s = c * .07; g.fillStyle = `rgba(${col},${(1 - ph) * (1 - k)})`; g.fillRect(x - s, y - s / 3, s * 2, s / 1.5); g.fillRect(x - s / 3, y - s, s / 1.5, s * 2); } } break;
          case 'turn': if (tt < 650) { const k = tt / 650, e = ease(cl01(k * 1.4)); rays(ax, ay, c * .4, R * e, 20, col, .85 * (1 - k), c * .07, tt * .001); ring(ax, ay, R * e, col, 1 - k, 3); glow(ax, ay, R * e, col, .35 * (1 - k)); glow(ax, ay - c * .2, c * .5, '255,255,255', 1 - k); } break;
          case 'bless': if (tt < 800) { const k = tt / 800; ring(ax, ay, R * ease(cl01(k * 1.5)), col, 1 - k, 3); glow(ax, ay, R * ease(cl01(k * 1.5)), col, .25 * (1 - k)); for (let i = 0; i < 12; i++) { const ph = (k * 1.2 + fxh(i)) % 1; g.fillStyle = `rgba(${col},${(1 - ph) * (1 - k)})`; g.fillRect(ax + Math.cos(i * .52) * R * (.3 + fxh(i + 2) * .6), ay + Math.sin(i * .52) * R * (.3 + fxh(i + 2) * .6) - ph * c * .8, 2.5, 2.5); } } break;
          case 'hold': if (tt < T) { const k = tt / T; glow(ax + (bx - ax) * k, ay + (by - ay) * k, c * .25, col, .9); } else if (tt - T < 700) { const k = (tt - T) / 700; for (let i = 0; i < 3; i++) { const kk = cl01(k * 1.6 - i * .15); g.strokeStyle = `rgba(${col},${kk < 1 ? .9 : .9 * (1 - k)})`; g.lineWidth = 2.5; g.beginPath(); g.ellipse(bx, by + (i - 1) * c * .22, c * (1 - .62 * ease(kk)), c * (.4 - .24 * ease(kk)), 0, 0, 7); g.stroke(); } } break;
          case 'entangle': case 'web': if (tt < 950) { const k = tt / 950, grow = ease(cl01(k * 2.2)), al = k < .7 ? 1 : 1 - (k - .7) / .3; g.globalCompositeOperation = 'source-over'; g.strokeStyle = `rgba(${f.id === 'web' ? '235,235,245' : '70,150,70'},${al})`; g.lineWidth = f.id === 'web' ? 1.5 : 3;
              if (f.id === 'web') { for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(i * .785) * R * grow, by + Math.sin(i * .785) * R * grow); g.stroke(); } for (const q of [.35, .65, .95]) { g.beginPath(); for (let i = 0; i <= 8; i++) { const x = bx + Math.cos(i * .785) * R * q * grow, y = by + Math.sin(i * .785) * R * q * grow; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } }
              else for (let i = 0; i < 10; i++) { const a2 = i * .628 + fxh(i), x0 = bx + Math.cos(a2) * R, y0 = by + Math.sin(a2) * R, x1 = bx + Math.cos(a2 + 2.2) * R * .25, y1 = by + Math.sin(a2 + 2.2) * R * .25; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(bx + Math.cos(a2 + 1) * R * .9, by + Math.sin(a2 + 1) * R * .9, x0 + (x1 - x0) * grow, y0 + (y1 - y0) * grow); g.stroke(); g.fillStyle = `rgba(120,210,110,${al})`; g.beginPath(); g.ellipse(x0 + (x1 - x0) * grow, y0 + (y1 - y0) * grow, c * .09, c * .05, a2, 0, 7); g.fill(); } } break;
        }
        g.globalCompositeOperation = 'source-over';
        break; }
      case 'breath': { g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 40; i++) { const k = (t - i * 9) / 430; if (k < 0 || k > 1) continue; const sp = (fxh(i) - .5) * k * c * 2.2, x = ax + (bx - ax) * k - Math.sin(th) * sp, y = ay + (by - ay) * k + Math.cos(th) * sp; glow(x, y, c * (.15 + k * .45), k < .3 ? '255,240,160' : k < .7 ? '255,150,50' : '255,70,20', .75 * (1 - k * .6)); }
        if (t > 380) { const e = cl01((t - 380) / 520), r = c * 1.7 * ease(cl01(e * 2)); glow(bx, by, r, '255,150,50', .8 * (1 - e)); ring(bx, by, r, '255,220,160', .7 * (1 - e), 2.5); }
        g.globalCompositeOperation = 'source-over'; break; }
      case 'gaze': { const k = t / FXD.gaze; g.globalCompositeOperation = 'lighter'; for (const [wd, al] of [[c * .3, .25], [c * .1, .7], [2, 1]]) { g.strokeStyle = `rgba(240,197,106,${al * (1 - k)})`; g.lineWidth = wd; g.beginPath(); g.moveTo(ax, ay - c * .3); g.lineTo(bx, by); g.stroke(); } ring(bx, by, c * 1.5 * ease(cl01(k * 1.5)), '240,197,106', 1 - k, 3); g.globalCompositeOperation = 'source-over'; break; }
      case 'die': { const k = t / FXD.die, foe = f.u && f.u.side === 'E', col = foe ? '200,60,40' : '255,255,255'; g.globalCompositeOperation = 'lighter'; ring(ax, ay, c * (.2 + .6 * ease(k)), col, 1 - k, 3 * (1 - k) + 1); glow(ax, ay, c * .7, col, .45 * (1 - k));
        for (let i = 0; i < 8; i++) { const a2 = i * .785 + fxh(i), d = c * (.2 + .7 * ease(k)) * (.6 + fxh(i + 5) * .6); g.fillStyle = `rgba(${foe ? '160,40,30' : '230,225,210'},${1 - k})`; g.fillRect(ax + Math.cos(a2) * d, ay + Math.sin(a2) * d + k * k * c * .3, 3, 3); }
        g.globalCompositeOperation = 'source-over'; if (!foe && f.u && !f.u.illusion) word('†', ax, ay - k * c * .8, '#fff', 1 - k, c * .7); break; }
      case 'burst': { const k = t / FXD.burst; g.globalCompositeOperation = 'lighter'; glow(ax, ay, (f.r + .8) * c, f.c && f.c[0] === '#' ? [1, 3, 5].map(i => parseInt(f.c.slice(i, i + 2), 16)).join(',') : '255,255,255', .28 * (1 - k)); g.globalCompositeOperation = 'source-over'; break; }
      case 'move': { const k = t / FXD.move; for (let i = 0; i < 3; i++) { g.fillStyle = `rgba(200,180,140,${.35 * (1 - k)})`; g.beginPath(); g.arc(ax + (fxh(i + f.a[0]) - .5) * c * .4, ay + c * .3 - k * c * .15, c * (.06 + k * .1), 0, 7); g.fill(); } break; }
    }
  }
  g.restore(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  return live;
}
