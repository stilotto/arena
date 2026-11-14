'use strict';
/* Skycam: a small software 3D view of the arena drawn on a 2D canvas.
   Painter's algorithm, no libraries. World units are grid cells; grid (x, y) maps to world (x, 0, z). */
const A3 = (() => {
  const SEG = 60, TIERS = 6, TD = 1.6, TR = 1.1, POD = 1.4, NEAR = .3, TAU = Math.PI * 2;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const CROWD = ['#c9b08a', '#8e2a22', '#d2aa52', '#5a4a8c', '#e8dcc0', '#3a2c22', '#7a3a7c', '#b0522e', '#40506a'];
  const rgb = (c, k) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
  let sc = null;

  function build(w, h) {
    if (sc && sc.w === w && sc.h === h) return sc;
    const a = w / 2 * 1.45 + 1.5, b = h / 2 * 1.45 + 1.5, polys = [], flags = [];
    let seed = 11; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const P = (th, d, y) => [Math.cos(th) * (a + d), y, Math.sin(th) * (b + d)];
    const top = POD + TIERS * TR, out = TIERS * TD + .4, boxTh = TAU * .75;
    for (let i = 0; i < SEG; i++) {
      const t0 = i / SEG * TAU, t1 = (i + 1) / SEG * TAU, tm = (t0 + t1) / 2;
      const nl = .5 * Math.cos(tm) - .6 * Math.sin(tm), lin = .76 + .24 * nl, lout = .76 - .24 * nl;
      const gate = i === 0 || i === SEG - 1 || i === SEG / 2 - 1 || i === SEG / 2;
      const box = Math.abs(tm - boxTh) < .17;
      polys.push({ p: [P(t0, 0, 0), P(t1, 0, 0), P(t1, 0, POD), P(t0, 0, POD)], f: gate ? '#17110e' : rgb([112, 94, 74], lin) });
      for (let j = 0; j < TIERS; j++) {
        const q = { p: [P(t0, j * TD, POD + j * TR), P(t1, j * TD, POD + j * TR), P(t1, (j + 1) * TD, POD + (j + 1) * TR), P(t0, (j + 1) * TD, POD + (j + 1) * TR)] };
        if (box && j >= 1 && j <= 2) q.f = rgb([52, 20, 46], lin);
        else { q.f = rgb(j & 1 ? [150, 130, 104] : [136, 117, 93], lin); q.dots = []; for (let k = 0; k < 9; k++) q.dots.push({ u: .06 + rnd() * .88, v: .1 + rnd() * .8, c: CROWD[Math.floor(rnd() * CROWD.length)], s: rnd() * TAU }); }
        polys.push(q);
      }
      polys.push({ p: [P(t0, TIERS * TD, top), P(t1, TIERS * TD, top), P(t1, out, top + .8), P(t0, out, top + .8)], f: rgb([120, 102, 82], lin) });
      polys.push({ p: [P(t0, out, 0), P(t1, out, 0), P(t1, out, top + .8), P(t0, out, top + .8)], f: rgb([140, 118, 92], lout) });
      const ta = t0 + (t1 - t0) * .22, tb = t0 + (t1 - t0) * .78;
      for (const [y0, y1] of [[.4, 3.3], [4.2, 7.0]]) polys.push({ p: [P(ta, out + .03, y0), P(tb, out + .03, y0), P(tb, out + .03, y1), P(ta, out + .03, y1)], f: '#1c1512', bias: .4 });
      if (i % 5 === 0) flags.push({ a: P(t0, out, top + .8), b: P(t0, out, top + 3.6), c: P(t0 + .035, out, top + 3.1) });
    }
    const y = POD + 3 * TR + 2.1, tA = boxTh - .17, tB = boxTh + .17;
    polys.push({ p: [P(tA, TD * .8, y), P(tB, TD * .8, y), P(tB, 3 * TD, y + .9), P(tA, 3 * TD, y + .9)], f: '#8e2a22', edge: '#d2aa52', bias: .6 });
    const floor = []; for (let i = 0; i < SEG; i++) floor.push(P(i / SEG * TAU, 0, 0));
    sc = { w, h, a, b, polys, flags, floor, out, top, eye: P(boxTh, 2 * TD, POD + 2 * TR + 1.3) };
    return sc;
  }

  function clip(vs) { // keep the part of a view-space polygon in front of the camera
    const o = [];
    for (let i = 0; i < vs.length; i++) {
      const p = vs[i], q = vs[(i + 1) % vs.length], pi = p[2] >= NEAR, qi = q[2] >= NEAR;
      if (pi) o.push(p);
      if (pi !== qi) { const t = (NEAR - p[2]) / (q[2] - p[2]); o.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, NEAR]); }
    }
    return o;
  }

  // units: [{x, y, side, col, hd, boss, und, illusion}] in grid coordinates. time in seconds (0 for a still).
  function render(g, W, H, cam, time, units) {
    const s = sc, f = norm(sub(cam.tgt, cam.pos)), r = norm(cross(f, cam.up || [0, 1, 0])), u = cross(r, f);
    const F = .5 * Math.min(H, W * .8) / Math.tan((cam.fov || 55) * Math.PI / 360);
    const V = p => { const d = sub(p, cam.pos); return [dot(d, r), dot(d, u), dot(d, f)]; };
    const D = d => [dot(d, r), dot(d, u), dot(d, f)];
    const X = v => W / 2 + v[0] / v[2] * F, Y = v => H / 2 - v[1] / v[2] * F;
    const trace = vs => { vs = clip(vs); if (vs.length < 3) return false; g.beginPath(); g.moveTo(X(vs[0]), Y(vs[0])); for (let i = 1; i < vs.length; i++) g.lineTo(X(vs[i]), Y(vs[i])); g.closePath(); return true; };

    // sky, horizon and the dark sun
    const hl = Math.hypot(f[0], f[2]); let hy = f[1] < 0 ? -H : 2 * H;
    if (hl > .02) { const v = D([f[0] / hl, 0, f[2] / hl]); if (v[2] > .02) hy = Math.max(-H, Math.min(2 * H, Y(v))); }
    g.fillStyle = '#2b1d15'; g.fillRect(0, 0, W, H);
    if (hy > 0) { const gr = g.createLinearGradient(0, hy - H * .9, 0, hy); gr.addColorStop(0, '#1d0a0a'); gr.addColorStop(.65, '#8e2a22'); gr.addColorStop(1, '#d2793a'); g.fillStyle = gr; g.fillRect(0, 0, W, hy); }
    const sv = D(norm([.22, .2, -1]));
    if (sv[2] > .05) { const x = X(sv), y = Y(sv), R = F * .075; g.fillStyle = '#120b09'; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill(); g.strokeStyle = '#f0c56a'; g.lineWidth = Math.max(1, R * .05); g.stroke(); g.fillStyle = '#f0c56a'; g.beginPath(); g.ellipse(x, y, R * .2, R * .55, 0, 0, TAU); g.fill(); }

    // sand, then the marked fighting ground
    if (trace(s.floor.map(V))) { g.fillStyle = '#c4a872'; g.fill(); }
    const hw = s.w / 2, hh = s.h / 2;
    if (trace([[-hw, 0, -hh], [hw, 0, -hh], [hw, 0, hh], [-hw, 0, hh]].map(V))) { g.fillStyle = '#d8c08c'; g.fill(); g.strokeStyle = 'rgba(90,60,20,.5)'; g.lineWidth = 1; g.stroke(); }
    g.strokeStyle = 'rgba(90,60,20,.16)'; g.beginPath();
    const seg = (p, q) => { let a = V(p), b = V(q); if (a[2] < NEAR && b[2] < NEAR) return; if (a[2] < NEAR) { const t = a; a = b; b = t; } if (b[2] < NEAR) { const t = (NEAR - a[2]) / (b[2] - a[2]); b = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]; } g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b)); };
    for (let x = 1; x < s.w; x++) seg([x - hw, 0, -hh], [x - hw, 0, hh]);
    for (let y = 1; y < s.h; y++) seg([-hw, 0, y - hh], [hw, 0, y - hh]);
    g.stroke();

    // everything else, far to near
    const items = [];
    for (const p of s.polys) { const vs = p.p.map(V); let d = 0, front = 0; for (const v of vs) { d += v[2]; if (v[2] >= NEAR) front++; } if (front) items.push({ d: d / vs.length - (p.bias || 0), p, vs, all: front === vs.length }); }
    for (const fl of s.flags) { const va = V(fl.a), vb = V(fl.b), vc = V(fl.c); if (va[2] > NEAR && vb[2] > NEAR && vc[2] > NEAR) items.push({ d: va[2] - .5, fl: [va, vb, vc] }); }
    if (units) for (const un of units) { const v = V([un.x - hw + .5, 0, un.y - hh + .5]); if (v[2] > NEAR + .2) items.push({ d: v[2], un, v }); }
    const ev = V(s.eye); if (ev[2] > NEAR) items.push({ d: ev[2] - 1, eye: ev });
    items.sort((p, q) => q.d - p.d);
    for (const it of items) {
      if (it.p) {
        if (!trace(it.vs)) continue;
        g.fillStyle = it.p.f; g.fill(); g.strokeStyle = it.p.edge || it.p.f; g.lineWidth = it.p.edge ? 2 : 1; g.stroke();
        if (it.p.dots && it.all) {
          const q = it.vs, x0 = X(q[0]), y0 = Y(q[0]), x1 = X(q[1]), y1 = Y(q[1]), x2 = X(q[2]), y2 = Y(q[2]), x3 = X(q[3]), y3 = Y(q[3]);
          if (Math.max(x0, x1, x2, x3) < 0 || Math.min(x0, x1, x2, x3) > W) continue;
          const sz = Math.max(1, Math.min(6, F / it.d * .3));
          for (const d of it.p.dots) {
            const ax = x0 + (x1 - x0) * d.u, ay = y0 + (y1 - y0) * d.u, bx = x3 + (x2 - x3) * d.u, by = y3 + (y2 - y3) * d.u;
            const bob = time ? Math.max(0, Math.sin(time * 5 + d.s)) * sz * .5 : 0;
            g.fillStyle = d.c; g.fillRect(ax + (bx - ax) * d.v - sz / 2, ay + (by - ay) * d.v - sz * 1.2 - bob, sz, sz * 1.4);
          }
        }
      } else if (it.fl) {
        const [a, b, c] = it.fl; g.strokeStyle = '#3a2c22'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b)); g.stroke();
        const wv = time ? Math.sin(time * 3 + a[0]) * F / a[2] * .12 : 0;
        g.fillStyle = '#b3312a'; g.beginPath(); g.moveTo(X(b), Y(b)); g.lineTo(X(c) + F / c[2] * .9, Y(c) + wv); g.lineTo(X(b), Y(b) + F / b[2] * 1.1); g.fill();
      } else if (it.eye) {
        const x = X(it.eye), y = Y(it.eye), R = Math.max(1.5, F / it.eye[2] * .45);
        g.fillStyle = '#120b09'; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
        g.fillStyle = '#f0c56a'; g.beginPath(); g.ellipse(x, y, R * .25, R * .65, 0, 0, TAU); g.fill();
      } else {
        const un = it.un, x = X(it.v), y = Y(it.v), k = F / it.v[2];
        g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y, k * .36, k * .12, 0, 0, TAU); g.fill();
        if (un.side === 'H') {
          g.globalAlpha = un.illusion ? .5 : 1;
          g.fillStyle = un.col; g.beginPath(); g.moveTo(x - k * .24, y); g.lineTo(x + k * .24, y); g.lineTo(x + k * .17, y - k * .64); g.lineTo(x - k * .17, y - k * .64); g.closePath(); g.fill();
          if (k > 7) { g.strokeStyle = '#1a1410'; g.lineWidth = 1; g.stroke(); }
          g.fillStyle = '#e2c29a'; g.beginPath(); g.arc(x, y - k * .8, k * .15, 0, TAU); g.fill();
          g.globalAlpha = 1;
        } else {
          const hgt = Math.max(.7, Math.min(2.4, .75 + un.hd * .14)) * (un.boss ? 1.35 : 1) * k, wd = hgt * .34 + k * .08;
          g.fillStyle = un.und ? '#56634e' : '#7a1f1a'; g.beginPath(); g.moveTo(x - wd, y); g.lineTo(x + wd, y); g.lineTo(x + wd * .8, y - hgt * .78); g.lineTo(x, y - hgt); g.lineTo(x - wd * .8, y - hgt * .78); g.closePath(); g.fill();
          g.strokeStyle = un.boss ? '#f0c56a' : '#1a1410'; g.lineWidth = un.boss ? 2 : 1; if (k > 7 || un.boss) g.stroke();
          if (k > 9) { g.fillStyle = '#ffd86a'; const e = Math.max(1, hgt * .06); g.fillRect(x - wd * .4 - e / 2, y - hgt * .7, e, e); g.fillRect(x + wd * .4 - e / 2, y - hgt * .7, e, e); }
        }
      }
    }
  }

  function spline(P, t) { // Catmull-Rom through P, t in 0..P.length-1
    t = Math.max(0, Math.min(P.length - 1, t)); const n = P.length - 1, i = Math.min(n - 1, Math.floor(t)), k = t - i;
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n, i + 2)], o = [];
    for (let c = 0; c < 3; c++) o.push(.5 * (2 * p1[c] + (p2[c] - p0[c]) * k + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * k * k + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * k * k * k));
    return o;
  }
  // The flyover: in over the rim, down across the legion, along the sand to the foes, then up to the overhead view.
  function fly(k, aspect) {
    const s = sc, a = s.a, b = s.b, ax = a + s.out, bz = b + s.out, fov = 55;
    const tn = Math.tan(fov * Math.PI / 360), top = Math.max(s.h / 2 / .8, s.w / 2 / .8 / Math.max(.5, aspect) * (aspect < 1.25 ? 1.25 / 1 : 1)) / tn;
    const pos = [[-ax * 1.45, 15, bz * 1.7], [-ax * .8, 11.5, bz * .95], [-a * .6, 4.6, b * .8], [a * .05, 3, b * .62], [a * .3, 4.2, b * .42], [0, top * .55, b * .55], [0, top, .05]];
    const tgt = [[0, 4, 0], [0, 2.5, -b * .5], [-s.w * .1, 1, -b * .25], [s.w * .4, 1, 0], [s.w * .46, .8, 0], [0, 0, 0], [0, 0, 0]];
    const e = k * k * (3 - 2 * k), t = (k * .55 + e * .45) * (pos.length - 1);
    const q = Math.max(0, Math.min(1, (k - .8) / .2)), qq = q * q * (3 - 2 * q);
    return { pos: spline(pos, t), tgt: spline(tgt, t), up: norm([0, 1 - qq, -qq]), fov };
  }
  function orbit(time) {
    const s = sc, ph = time * .08 + 1.9;
    return { pos: [Math.cos(ph) * (s.a + s.out) * 1.2, 12.5 + Math.sin(time * .11) * 2, Math.sin(ph) * (s.b + s.out) * 1.35], tgt: [0, 2.5, 0], fov: 50 };
  }
  return { build, render, fly, orbit };
})();
if (typeof module !== 'undefined') module.exports = A3;
