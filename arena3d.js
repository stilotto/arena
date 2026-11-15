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
  const DTH = { E: 0, S: TAU / 4, W: TAU / 2, N: TAU * .75 };
  let sc = null;

  function build(w, h) {
    if (sc && !sc.room && sc.w === w && sc.h === h) return sc;
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

  // units: [{x, y, side, key, boss, illusion}] in grid coordinates. time in seconds (0 for a still).
  function render(g, W, H, cam, time, units, opt) {
    const s = sc, doors = (opt && opt.doors) || {}, f = norm(sub(cam.tgt, cam.pos)), r = norm(cross(f, cam.up || [0, 1, 0])), u = cross(r, f);
    const F = .5 * Math.min(H, W * .8) / Math.tan((cam.fov || 55) * Math.PI / 360);
    const V = p => { const d = sub(p, cam.pos); return [dot(d, r), dot(d, u), dot(d, f)]; };
    const D = d => [dot(d, r), dot(d, u), dot(d, f)];
    const X = v => W / 2 + v[0] / v[2] * F, Y = v => H / 2 - v[1] / v[2] * F;
    const trace = vs => { vs = clip(vs); if (vs.length < 3) return false; g.beginPath(); g.moveTo(X(vs[0]), Y(vs[0])); for (let i = 1; i < vs.length; i++) g.lineTo(X(vs[i]), Y(vs[i])); g.closePath(); return true; };

    if (s.room) return renderRoom(g, W, H, cam, time, units, { V, D, X, Y, trace, F, f, r });
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
    for (const dir in doors) { // the great bronze doors, swinging open
      const th = DTH[dir], rad = dir === 'E' || dir === 'W' ? s.a : s.b, dl = 1.9 / rad, op = doors[dir], DH = 3.7;
      const P = (t, d, y) => V([Math.cos(t) * (s.a + d), y, Math.sin(t) * (s.b + d)]);
      const quad = (t0, t1, d, y1, f, edge, bias) => { const vs = [P(t0, d, 0), P(t1, d, 0), P(t1, d, y1), P(t0, d, y1)]; let z = 0, fr = 0; for (const v of vs) { z += v[2]; if (v[2] >= NEAR) fr++; } if (fr) items.push({ d: z / 4 - bias, p: { f, edge }, vs, all: false }); };
      quad(th - dl * 1.3, th + dl * 1.3, -.1, DH + .6, '#4a3a2c', '#2a1f18', 1.2);
      quad(th - dl, th + dl, -.16, DH, '#0c0806', null, 1.6);
      if (op < .98) { quad(th - dl, th - dl * op, -.22, DH, '#8a5a2a', '#d2aa52', 2); quad(th + dl * op, th + dl, -.22, DH, '#8a5a2a', '#d2aa52', 2); }
    }
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
        if (un.boss) { g.strokeStyle = '#f0c56a'; g.lineWidth = Math.max(1, k * .05); g.beginPath(); g.ellipse(x, y, k * .6, k * .2, 0, 0, TAU); g.stroke(); }
        if (un.illusion) g.globalAlpha = .5;
        FIG.draw(g, un.key, x, y, k * (un.boss ? 1.35 : 1), (un.side === 'H' ? 1 : -1) * (r[0] < 0 ? -1 : 1));
        g.globalAlpha = 1;
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
  // where a door stands, in grid coordinates (it is outside the grid, in the podium wall)
  function door(dir) { const s = sc, t = DTH[dir]; return [s.w / 2 - .5 + Math.cos(t) * (s.a - .6), s.h / 2 - .5 + Math.sin(t) * (s.b - .6)]; }
  function fly(k, aspect, sides) {
    if (sc.room) { // through a quest room: in over the wall, along its length (down the lane, in a street), then up
      const s = sc, a = s.a, b = s.b, tn = Math.tan(55 * Math.PI / 360), top = Math.max(s.h / 2 / .8, s.w / 2 / .8 / Math.max(.5, aspect)) / tn, hy = s.flyH;
      const zl = x => s.lane[Math.max(0, Math.min(s.w - 1, Math.round(x + s.w / 2)))];
      const pos = [[-a * 1.9, top * .55, b * 1.7], [-a * 1.25, hy + 3, zl(-a) + b * .7], [-a * .6, hy + .4, zl(-a * .6) + .2], [0, hy, zl(0) + .2], [a * .5, hy + .5, zl(a * .5) + .2], [0, top * .6, b * .4], [0, top, .05]];
      const tgt = [[0, 1, 0], [-a * .3, 1, zl(-a * .3)], [a * .2, 1, zl(a * .2)], [a * .8, .9, zl(a * .8)], [a, .7, zl(a)], [0, 0, 0], [0, 0, 0]];
      const e = k * k * (3 - 2 * k), t = (k * .55 + e * .45) * 6, q = Math.max(0, Math.min(1, (k - .8) / .2)), qq = q * q * (3 - 2 * q);
      return { pos: spline(pos, t), tgt: spline(tgt, t), up: norm([0, 1 - qq, -qq]), fov: 55 };
    }
    const s = sc, a = s.a, b = s.b, ax = a + s.out, bz = b + s.out, fov = 55;
    const tn = Math.tan(fov * Math.PI / 360), top = Math.max(s.h / 2 / .8, s.w / 2 / .8 / Math.max(.5, aspect) * (aspect < 1.25 ? 1.25 / 1 : 1)) / tn;
    const pos = [[-ax * 1.45, 15, bz * 1.7], [-ax * .8, 11.5, bz * .95], [-a * .6, 4.6, b * .8], [a * .05, 3, b * .62], [a * .3, 4.2, b * .42], [0, top * .55, b * .55], [0, top, .05]];
    const tgt = [[0, 4, 0], [0, 2.5, -b * .5], [-s.w * .1, 1, -b * .25], [s.w * .4, 1, 0], [s.w * .46, .8, 0], [0, 0, 0], [0, 0, 0]];
    if (sides > 1) { // a siege: swing round the ring of heroes instead of running at one gate
      pos.splice(2, 3, [-a * .72, 5, b * .82], [0, 3.6, b * .88], [a * .72, 5, b * .78]);
      tgt.splice(1, 4, [a * .6, 2, 0], [a * .85, 1.6, 0], [0, 1, -b * .35], [-a * .5, 1, 0]);
    }
    const e = k * k * (3 - 2 * k), t = (k * .55 + e * .45) * (pos.length - 1);
    const q = Math.max(0, Math.min(1, (k - .8) / .2)), qq = q * q * (3 - 2 * q);
    return { pos: spline(pos, t), tgt: spline(tgt, t), up: norm([0, 1 - qq, -qq]), fov };
  }
  function orbit(time) {
    const s = sc, ph = time * .08 + 1.9;
    return { pos: [Math.cos(ph) * (s.a + s.out) * 1.2, 12.5 + Math.sin(time * .11) * 2, Math.sin(ph) * (s.b + s.out) * 1.35], tgt: [0, 2.5, 0], fov: 50 };
  }
  /* ---------- quest rooms in 3D ----------
     Built from the same cells as the board: lit floor tiles, walls and props as boxes, pitched roofs in the street.
     Light is baked per cell from the room's torches (walls throw shadows). Everything is drawn cell by cell,
     far to near, so a figure is always hidden by whatever stands in front of it. */
  const hash2 = (x, y) => { let v = (x * 374761393 + y * 668265263) >>> 0; v = ((v ^ (v >>> 13)) * 1274126177) >>> 0; return (v >>> 8) / 16777216; };
  const BLD3 = [{ wall: [179, 162, 132], roof: [128, 70, 52] }, { wall: [140, 122, 98], roof: [84, 72, 70] }, { wall: [160, 138, 92], roof: [112, 92, 54] }, { wall: [156, 140, 132], roof: [70, 74, 92] }, { wall: [176, 142, 106], roof: [136, 96, 56] }];
  const canFilter = (() => { try { return 'filter' in document.createElement('canvas').getContext('2d'); } catch (e) { return false; } })();
  function buildRoom(R) {
    const w = R.w, h = R.h, pl = R.place, hw = w / 2, hh = h / 2, faces = [], flats = [], extras = [], emit = [];
    const K = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 1 : R.cells[y * w + x];
    const propAt = {}; for (const p of R.props) propAt[p.y * w + p.x] = p;
    const isWall = (x, y) => K(x, y) === 1 && !(x >= 0 && y >= 0 && x < w && y < h && propAt[y * w + x]);
    const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
    const edge = (x, y) => isWall(x, y) && [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(d => inside(x + d[0], y + d[1]) && !isWall(x + d[0], y + d[1]));
    // light per cell
    const amb = pl === 'crypt' ? [.27, .27, .37] : pl === 'slum' ? [.24, .23, .34] : R.roof ? [.34, .38, .56] : [.3, .26, .27], L = new Float32Array(w * h * 3), fake = { room: R, w };
    for (let i = 0; i < w * h; i++) { L[i * 3] = amb[0]; L[i * 3 + 1] = amb[1]; L[i * 3 + 2] = amb[2]; }
    for (const l of R.lights) { const rad = Math.ceil(l.r); for (let y = Math.max(0, l.cy - rad); y <= Math.min(h - 1, l.cy + rad); y++) for (let x = Math.max(0, l.cx - rad); x <= Math.min(w - 1, l.cx + rad); x++) { const d = Math.hypot(x + .5 - l.x, y + .5 - l.y); if (d < l.r && los(fake, l.cx, l.cy, x, y)) { const k = (1 - d / l.r) * (1 - d / l.r) * 1.25, i = (y * w + x) * 3; L[i] += l.c[0] * k; L[i + 1] += l.c[1] * k; L[i + 2] += l.c[2] * k; } } }
    const lit = (col, x, y, k) => { const i = (Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))) * 3; k = k || 1; return [col[0] * Math.min(1.5, L[i]) * k, col[1] * Math.min(1.5, L[i + 1]) * k, col[2] * Math.min(1.5, L[i + 2]) * k]; };
    const lum = (x, y) => { const i = (y * w + x) * 3; return Math.max(L[i], L[i + 1], L[i + 2]); };
    const quad = (pts, c, x, y, o) => { const f = Object.assign({ p: pts, c, cx: x + .5 - hw, cz: y + .5 - hh }, o); const a = pts[0], b = pts[1], d = pts[pts.length - 1], u = sub(b, a), v = sub(d, a); f.n = norm(cross(u, v)); f.m = [(pts[0][0] + pts[2][0]) / 2, (pts[0][1] + pts[2][1]) / 2, (pts[0][2] + pts[2][2]) / 2]; faces.push(f); return f; };
    // A box standing in cell (x, y). ins = [west, north, east, south] insets; sides = which faces to make [N, S, W, E].
    const box = (x, y, ins, y0, y1, cT, cS, sides, o) => {
      const X0 = x + ins[0] - hw, X1 = x + 1 - ins[2] - hw, Z0 = y + ins[1] - hh, Z1 = y + 1 - ins[3] - hh; sides = sides || [1, 1, 1, 1]; o = o || {};
      const hs = o.hs || [y1, y1]; // [height at north edge, height at south edge]
      quad([[X0, hs[0], Z0], [X0, hs[1], Z1], [X1, hs[1], Z1], [X1, hs[0], Z0]], lit(cT, x, y, o.kt || 1), x, y, { tex: o.texT });
      if (sides[0]) quad([[X1, y0, Z0], [X0, y0, Z0], [X0, hs[0], Z0], [X1, hs[0], Z0]], lit(cS, x, y - (o.self ? 0 : 1), .62), x, y, { tex: o.tex });
      if (sides[1]) quad([[X0, y0, Z1], [X1, y0, Z1], [X1, hs[1], Z1], [X0, hs[1], Z1]], lit(cS, x, y + (o.self ? 0 : 1), 1), x, y, { tex: o.tex });
      if (sides[2]) quad([[X0, y0, Z0], [X0, y0, Z1], [X0, hs[1], Z1], [X0, hs[0], Z0]], lit(cS, x - (o.self ? 0 : 1), y, .74), x, y, { tex: o.tex });
      if (sides[3]) quad([[X1, y0, Z1], [X1, y0, Z0], [X1, hs[0], Z0], [X1, hs[1], Z1]], lit(cS, x + (o.self ? 0 : 1), y, .86), x, y, { tex: o.tex });
    };
    const flat = (pts, c, o) => flats.push(Object.assign({ p: pts, c }, o));
    const street = (x, y, dy) => { for (let yy = y + dy, n = 1; yy >= 0 && yy < h; yy += dy, n++) if (K(x, yy) !== 1) return n; return 0; };
    let maxH = 2.6;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = R.cells[y * w + x], p = propAt[y * w + x], v = hash2(x, y), X = x - hw, Z = y - hh;
      if (!isWall(x, y)) { // floor
        const base = k === 3 ? (pl === 'slum' ? [34, 52, 44] : [26, 44, 70]) : pl === 'crypt' ? [150 + v * 40, 154 + v * 40, 176 + v * 40] : pl === 'slum' ? [150 + v * 30, 142 + v * 28, 130 + v * 24] : R.roof ? [150 + v * 20, 154 + v * 20, 184 + v * 20] : [200 + v * 30, 150 + v * 22, 96 + v * 16];
        flat([[X, 0, Z], [X + 1, 0, Z], [X + 1, 0, Z + 1], [X, 0, Z + 1]], lit(base, x, y, k === 3 ? 1 : .62), { line: k === 3 ? null : pl === 'tower' && !R.roof ? 'plank' : 'tile', lum: lum(x, y) });
      }
      if (isWall(x, y)) {
        if (pl === 'slum') {
          const dS = street(x, y, 1), dN = street(x, y, -1), south = dS && (!dN || dS <= dN), di = (south ? dS : dN || 1) - 1, blk = Math.floor(x / 3) + (south ? 0 : 11), b = BLD3[(blk * 7 + 3) % BLD3.length], hb = 3 + hash2(blk, 5) * 1.5, he = hb + di * .55;
          const hs = !dS && !dN ? [hb + 1, hb + 1] : south ? [he + .55, he] : [he, he + .55]; maxH = Math.max(maxH, he + .55);
          const diff = (nx, ny) => !isWall(nx, ny) || Math.floor(nx / 3) !== Math.floor(x / 3) || ny !== y;
          box(x, y, [0, 0, 0, 0], 0, 0, b.roof, b.wall, [!isWall(x, y - 1), !isWall(x, y + 1), diff(x - 1, y), diff(x + 1, y)], { hs, tex: 'beam', texT: 'roof', kt: .8 });
          for (const [dy, on] of [[1, !isWall(x, y + 1) && inside(x, y + 1)], [-1, !isWall(x, y - 1) && inside(x, y - 1)]]) if (on) { // doors and windows on the street side
            const z = y + (dy > 0 ? 1.012 : -.012) - hh, kind = hash2(x + 7, y + 3), wq = (x0, x1, y0, y1, c) => quad(dy > 0 ? [[X + x0, y0, z], [X + x1, y0, z], [X + x1, y1, z], [X + x0, y1, z]] : [[X + x1, y0, z], [X + x0, y0, z], [X + x0, y1, z], [X + x1, y1, z]], c, x, y, { glowq: c[0] > 200, over: 1 });
            if (kind < .28) wq(.3, .7, 0, 1.5, [56, 36, 22]); else if (kind < .8) { const on2 = kind < .55; wq(.25, .75, .9, 1.6, on2 ? [255, 205, 110] : [30, 32, 44]); if (on2) emit.push({ k: 'glow', p: [X + .5, 1.25, z], r: 1.1, c: '255,200,110', a: .35 }); }
            if (hash2(x, y + 77) > .45) wq(.3, .7, 2, 2.6, hash2(x + 3, y) > .5 ? [255, 195, 100] : [30, 32, 44]);
          }
          if (v > .86 && di > 0) { const cy0 = (hs[0] + hs[1]) / 2; box(x, y, [.3, .3, .4, .4], cy0 - .3, cy0 + .9, [70, 56, 50], [90, 70, 62], null, { self: 1 }); emit.push({ k: 'smoke', p: [X + .45, cy0 + .9, Z + .45] }); }
        } else if (edge(x, y)) {
          const WH = R.roof ? ((x + y) % 2 ? 1.25 : .85) : pl === 'crypt' ? 2.3 : 2.6, cS = pl === 'crypt' ? [150, 156, 178] : [176, 166, 190], cT = pl === 'crypt' ? [120, 124, 142] : [150, 142, 162];
          const out = (nx, ny) => pl === 'tower' && (!inside(nx, ny) || (K(nx, ny) === 1 && !edge(nx, ny) && !propAt[ny * w + nx]));
          const s = [[x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]].map(q => !edge(q[0], q[1]) && (pl === 'tower' || inside(q[0], q[1])));
          const f0 = faces.length; box(x, y, [0, 0, 0, 0], 0, WH, cT, cS, s, { tex: 'brick', kt: .75 });
          if (pl === 'tower') [[x, y - 1, 0], [x, y + 1, 1], [x - 1, y, 2], [x + 1, y, 3]].forEach(([nx, ny, i]) => { if (!out(nx, ny)) return; const f = faces.slice(f0).find(f2 => f2.n && Math.abs(f2.n[1]) < .1 && Math.round(f2.n[0]) === (i === 2 ? -1 : i === 3 ? 1 : 0) && Math.round(f2.n[2]) === (i === 0 ? -1 : i === 1 ? 1 : 0)); if (f) { f.p[0][1] = f.p[1][1] = -26; f.c = [58, 56, 78]; f.tex = 'tall'; f.far = 1; } });
          if (pl === 'tower' && !R.roof && hash2(x, y + 40) > .6) for (const [nx, ny, i] of [[x, y + 1, 1], [x, y - 1, 0], [x + 1, y, 3], [x - 1, y, 2]]) if (inside(nx, ny) && !isWall(nx, ny)) { const e = .013, pts = i === 1 ? [[X + .32, .7, Z + 1 + e], [X + .68, .7, Z + 1 + e], [X + .68, 2, Z + 1 + e], [X + .32, 2, Z + 1 + e]] : i === 0 ? [[X + .68, .7, Z - e], [X + .32, .7, Z - e], [X + .32, 2, Z - e], [X + .68, 2, Z - e]] : i === 3 ? [[X + 1 + e, .7, Z + .68], [X + 1 + e, .7, Z + .32], [X + 1 + e, 2, Z + .32], [X + 1 + e, 2, Z + .68]] : [[X - e, .7, Z + .32], [X - e, .7, Z + .68], [X - e, 2, Z + .68], [X - e, 2, Z + .32]]; quad(pts, [34, 46, 104], x, y, { over: 1, glowq: 1 }); break; }
        }
        continue;
      }
      if (!p || p.k === 'water') continue;
      const stone = [176, 180, 198], wood = [150, 104, 60], dwood = [104, 68, 38];
      switch (p.k) {
        case 'pillar': box(x, y, [.2, .2, .2, .2], 0, .25, stone, stone, null, { self: 1 }); box(x, y, [.3, .3, .3, .3], .25, 2.3, stone, stone, null, { self: 1 }); box(x, y, [.18, .18, .18, .18], 2.3, 2.6, stone, stone, null, { self: 1 }); break;
        case 'stair': box(x, y, [.12, .12, .12, .12], 0, 3.1, [150, 142, 162], [176, 166, 190], null, { self: 1, tex: 'brick' }); break;
        case 'statue': box(x, y, [.22, .22, .22, .22], 0, .5, stone, stone, null, { self: 1 }); extras.push({ k: 'statue', p: [X + .5, .5, Z + .5], key: ['fighter', 'paladin', 'mage', 'cleric', 'ranger', 'monk'][(hash2(x + 50, y + 9) * 6) | 0], lum: lum(x, y) }); break;
        case 'shelf': box(x, y, [.04, .04, .04, .04], 0, 2, dwood, wood, null, { self: 1, tex: 'books' }); break;
        case 'sarc': case 'sarc2': box(x, y, [.14, .02, .14, .02], 0, .55, stone, stone, null, { self: 1 }); box(x, y, [.2, .06, .2, .06], .55, .7, [210, 214, 230], stone, null, { self: 1 }); break;
        case 'rubble': for (let i = 0; i < 3; i++) { const a = hash2(x + i, y) * .5, b2 = hash2(x, y + i) * .5, s2 = .2 + hash2(x * 3 + i, y) * .2; box(x, y, [a, b2, 1 - a - s2 - .1, 1 - b2 - s2 - .1], 0, .25 + hash2(i, x + y) * .5, stone, stone, null, { self: 1 }); } break;
        case 'brazier': box(x, y, [.34, .34, .34, .34], 0, .7, [70, 60, 56], [90, 76, 70], null, { self: 1 }); emit.push({ k: 'flame', p: [X + .5, .72, Z + .5], s: .34 }, { k: 'glow', p: [X + .5, 1, Z + .5], r: 1.5, c: '255,150,60', a: .7 }); break;
        case 'table': box(x, y, [.38, .38, .38, .38], 0, .62, dwood, dwood, null, { self: 1 }); box(x, y, [.06, .12, .06, .12], .62, .76, wood, dwood, null, { self: 1 }); break;
        case 'cauldron': box(x, y, [.2, .2, .2, .2], 0, .7, [70, 200, 110], [40, 40, 48], null, { self: 1, kt: 2 }); emit.push({ k: 'glow', p: [X + .5, 1, Z + .5], r: 1.3, c: '110,255,140', a: .6 }); break;
        case 'cage': { const pts = []; for (const [a, b2] of [[.1, .1], [.9, .1], [.9, .9], [.1, .9]]) pts.push([[X + a, 0, Z + b2], [X + a, 1.6, Z + b2]]); for (let i = 0; i < 4; i++) { const a = [[.1, .1], [.9, .1], [.9, .9], [.1, .9]][i], b2 = [[.9, .1], [.9, .9], [.1, .9], [.1, .1]][i]; pts.push([[X + a[0], 1.6, Z + a[1]], [X + b2[0], 1.6, Z + b2[1]]]); for (const f of [.33, .66]) pts.push([[X + a[0] + (b2[0] - a[0]) * f, 0, Z + a[1] + (b2[1] - a[1]) * f], [X + a[0] + (b2[0] - a[0]) * f, 1.6, Z + a[1] + (b2[1] - a[1]) * f]]); } extras.push({ k: 'lines', pts, c: '#9a9ea8', p: [X + .5, 0, Z + .5], eyes: [X + .5, .5, Z + .5] }); break; }
        case 'orrery': box(x, y, [.42, .42, .42, .42], 0, 1, [200, 164, 80], [150, 120, 60], null, { self: 1 }); extras.push({ k: 'orrery', p: [X + .5, 1.5, Z + .5] }); emit.push({ k: 'glow', p: [X + .5, 1.5, Z + .5], r: 1.6, c: '255,220,130', a: .55 }); break;
        case 'rack': box(x, y, [.06, .4, .06, .4], 0, 1.3, dwood, wood, null, { self: 1 }); break;
        case 'crate': box(x, y, [.12, .12, .12, .12], 0, .8, [190, 140, 80], [150, 106, 60], null, { self: 1, tex: 'beam' }); break;
        case 'barrel': box(x, y, [.2, .2, .2, .2], 0, .95, [160, 116, 66], [124, 84, 46], null, { self: 1 }); break;
        case 'cart': box(x, y, [.04, .2, .04, .2], .35, .95, [170, 122, 70], [136, 94, 54], null, { self: 1 }); box(x, y, [.12, .14, .12, .14], 0, .35, [40, 32, 26], [40, 32, 26], null, { self: 1 }); break;
        case 'stall': { const c2 = [[179, 49, 42], [42, 90, 142], [58, 122, 74], [184, 134, 42]][(hash2(x + 50, y + 9) * 4) | 0]; box(x, y, [.04, .25, .04, .25], 0, .8, [170, 122, 70], [136, 94, 54], null, { self: 1 }); for (let i = 0; i < 4; i++) quad([[X + i / 4, 2.1, Z + .1], [X + i / 4, 1.6, Z + 1.05], [X + (i + 1) / 4, 1.6, Z + 1.05], [X + (i + 1) / 4, 2.1, Z + .1]], lit(i % 2 ? [232, 220, 192] : c2, x, y), x, y, { two: 1 }); extras.push({ k: 'lines', pts: [[[X + .05, 0, Z + .1], [X + .05, 2.1, Z + .1]], [[X + .95, 0, Z + .1], [X + .95, 2.1, Z + .1]], [[X + .05, 0, Z + 1], [X + .05, 1.6, Z + 1]], [[X + .95, 0, Z + 1], [X + .95, 1.6, Z + 1]]], c: '#4a2e18', p: [X + .5, 0, Z + .5] }); break; }
        case 'well': box(x, y, [.1, .1, .1, .1], 0, .6, [20, 34, 56], stone, null, { self: 1 }); extras.push({ k: 'lines', pts: [[[X + .12, 0, Z + .5], [X + .12, 1.7, Z + .5]], [[X + .88, 0, Z + .5], [X + .88, 1.7, Z + .5]], [[X + .05, 1.7, Z + .5], [X + .95, 1.7, Z + .5]]], c: '#4a2e18', p: [X + .5, 0, Z + .5] }); break;
      }
    }
    for (const d of R.decor) { // rugs, charts and the like lie flat on the floor
      const X = d.x - hw, Z = d.y - hh, ring = (r, n) => Array.from({ length: n || 28 }, (_, i) => [X + .5 + Math.cos(i / (n || 28) * TAU) * r, .015, Z + .5 + Math.sin(i / (n || 28) * TAU) * r]);
      if (d.k === 'rug') { const pal = [[[92, 24, 38], [176, 138, 60], [122, 36, 52]], [[28, 44, 92], [184, 176, 160], [42, 74, 138]], [[30, 74, 52], [200, 168, 80], [44, 106, 74]]][d.v || 0]; [[1, 0], [.9, 1], [.84, 2], [.5, 1], [.45, 0]].forEach(([f, ci]) => flat(ring(d.r * f), lit(pal[ci], d.x, d.y, .85))); }
      if (d.k === 'chart') for (const f of [1, .72, .44, .2]) flat(ring(d.r * f, 40), [210, 170, 82], { stroke: 1 });
      if (d.k === 'dais') flat([[X, .02, Z], [X + d.w, .02, Z], [X + d.w, .02, Z + d.h], [X, .02, Z + d.h]], lit([210, 214, 230], d.x + 1, d.y + 1, .7), { gold: 1 });
      if (d.k === 'bridge') flat([[X + .08, .05, Z], [X + .92, .05, Z], [X + .92, .05, Z + 1], [X + .08, .05, Z + 1]], lit([150, 104, 60], d.x, d.y, .8), { line: 'plank' });
      if (d.k === 'puddle') flat(ring(.42, 12).map(q => [q[0], .012, Z + .5 + (q[2] - Z - .5) * .55]), [16, 24, 40]);
      if (d.k === 'wash') extras.push({ k: 'wash', p: [X + .5, 2.5, (d.y0 + d.y1 + 1) / 2 - hh], z0: d.y0 - hh, z1: d.y1 + 1 - hh, x: X + .5, v: d.v });
      if (d.k === 'door' || d.k === 'exit') { const xx = d.k === 'door' ? X + 1.02 - (pl === 'crypt' ? 1 : 0) : X - .02 + (pl === 'crypt' ? 1 : 0); if (pl === 'crypt') quad(d.k === 'door' ? [[xx, 0, Z + 1.3], [xx, 0, Z - .3], [xx, 2, Z - .3], [xx, 2, Z + 1.3]] : [[xx, 0, Z - .3], [xx, 0, Z + 1.3], [xx, 2, Z + 1.3], [xx, 2, Z - .3]], [10, 8, 6], d.x, d.y, { over: 1 }); }
    }
    for (const l of R.lights) { // flames and their glow
      const X = l.x - hw, Z = l.y - hh;
      if (l.k === 'torch') { const z = l.wy === 0 ? l.wy + 1.06 - hh : l.wy - .06 - hh; emit.push({ k: 'flame', p: [X, 1.7, z], s: .2 }, { k: 'glow', p: [X, 1.85, z], r: 1.4, c: '255,160,70', a: .75 }); }
      if (l.k === 'lamp') { const z = l.wy + 1.3 - hh; extras.push({ k: 'lines', pts: [[[X, 2.9, l.wy + 1 - hh], [X, 2.9, z]], [[X, 2.9, z], [X, 2.6, z]]], c: '#17120f', p: [X, 2.6, z] }); emit.push({ k: 'flame', p: [X, 2.35, z], s: .16 }, { k: 'glow', p: [X, 2.45, z], r: 1.7, c: '255,180,90', a: .8 }); }
      if (l.k === 'candle') emit.push({ k: 'flame', p: [X, R.roof ? .95 : 1.5, Z], s: .1 }, { k: 'glow', p: [X, R.roof ? 1 : 1.55, Z], r: .9, c: '255,220,150', a: .6 });
    }
    flats.unshift({ p: R.round ? Array.from({ length: 36 }, (_, i) => [Math.cos(i / 36 * TAU) * (R.rad + 1.3) + R.c + .5 - hw, -.03, Math.sin(i / 36 * TAU) * (R.rad + 1.3) + R.c + .5 - hh]) : [[-hw, -.03, -hh], [hw, -.03, -hh], [hw, -.03, hh], [-hw, -.03, hh]], c: pl === 'crypt' ? [16, 16, 22] : pl === 'slum' ? [26, 24, 22] : [34, 24, 16] }); // nothing shows between the tiles
    const lane = new Float32Array(w); let ly = R.door ? R.door[1] : hh;
    for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let y = Math.max(0, Math.floor(ly) - 3); y <= Math.min(h - 1, Math.ceil(ly) + 3); y++) if (!R.cells[y * w + x]) { s += y + .5; n++; } if (n) ly = s / n; lane[x] = pl === 'slum' ? ly - hh : 0; }
    sc = { room: R, w, h, a: hw + 1, b: hh + 1, out: 3, faces, flats, extras, emit, L, lane, flyH: pl === 'slum' ? 5.4 : pl === 'crypt' ? 4.6 : R.roof ? 3.6 : 4.8, fog: pl === 'crypt' ? [6, 6, 10] : pl === 'slum' ? [38, 28, 44] : [16, 20, 44] };
    return sc;
  }
  function renderRoom(g, W, H, cam, time, units, t) {
    const s = sc, R = s.room, pl = R.place, { V, D, X, Y, trace, F, f } = t, hw = s.w / 2, hh = s.h / 2, fog = s.fog, cx0 = cam.pos[0], cz0 = cam.pos[2];
    const hl = Math.hypot(f[0], f[2]); let hy = f[1] < 0 ? -H : 2 * H;
    if (hl > .02) { const v = D([f[0] / hl, 0, f[2] / hl]); if (v[2] > .02) hy = Math.max(-H, Math.min(2 * H, Y(v))); }
    let sd = 9; const rr = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
    /* sky */
    if (pl === 'crypt') { const gr = g.createRadialGradient(W / 2, H * .45, 0, W / 2, H * .45, Math.max(W, H) * .7); gr.addColorStop(0, '#12121c'); gr.addColorStop(1, '#030305'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    else if (pl === 'tower') {
      const gr = g.createLinearGradient(0, hy - H * 1.1, 0, hy); gr.addColorStop(0, '#03050d'); gr.addColorStop(.7, '#16204a'); gr.addColorStop(1, '#3a4884'); g.fillStyle = gr; g.fillRect(0, 0, W, Math.max(0, hy));
      const lo = g.createLinearGradient(0, hy, 0, hy + H * .9); lo.addColorStop(0, '#46548e'); lo.addColorStop(.25, '#232c58'); lo.addColorStop(1, '#0a0e22'); g.fillStyle = lo; g.fillRect(0, Math.max(0, hy), W, H);
      for (let i = 0; i < 140; i++) { const d = D(norm([rr() * 2 - 1, rr() * .95 + .03, rr() * 2 - 1])), tw = .5 + rr() * .5; if (d[2] > .05) { g.fillStyle = `rgba(225,232,255,${tw * (time ? .75 + Math.sin(time * 2 + i) * .25 : 1)})`; g.fillRect(X(d), Y(d), 1 + rr() * 1.2, 1 + rr() * 1.2); } }
      const m = D(norm([.35, .3, -1])); if (m[2] > .05) { const x = X(m), y = Y(m), r0 = F * .075, hg = g.createRadialGradient(x, y, r0 * .8, x, y, r0 * 5); hg.addColorStop(0, 'rgba(190,205,255,.35)'); hg.addColorStop(1, 'rgba(190,205,255,0)'); g.fillStyle = hg; g.fillRect(x - r0 * 5, y - r0 * 5, r0 * 10, r0 * 10); g.fillStyle = '#f2f4ff'; g.beginPath(); g.arc(x, y, r0, 0, TAU); g.fill(); g.fillStyle = 'rgba(170,180,215,.5)'; for (const [a, b, c] of [[-.3, -.2, .22], [.25, .3, .16], [.1, -.4, .1]]) { g.beginPath(); g.arc(x + a * r0, y + b * r0, c * r0, 0, TAU); g.fill(); } }
      for (let i = 0; i < 26; i++) { const az = rr() * TAU + (time || 0) * .004, el = -.03 - rr() * .5, d = D(norm([Math.cos(az), el, Math.sin(az)])), sz = F * (.25 + rr() * .5); if (d[2] > .05) { const cg = g.createRadialGradient(0, 0, 0, 0, 0, sz); cg.addColorStop(0, 'rgba(150,165,220,.3)'); cg.addColorStop(1, 'rgba(150,165,220,0)'); g.save(); g.translate(X(d), Y(d)); g.scale(1, .3); g.fillStyle = cg; g.beginPath(); g.arc(0, 0, sz, 0, TAU); g.fill(); g.restore(); } }
    } else {
      const gr = g.createLinearGradient(0, hy - H * .9, 0, hy); gr.addColorStop(0, '#0e0a16'); gr.addColorStop(.55, '#3c2a44'); gr.addColorStop(.85, '#8a5048'); gr.addColorStop(1, '#d08a4a'); g.fillStyle = gr; g.fillRect(0, 0, W, Math.max(0, hy)); g.fillStyle = '#17131a'; g.fillRect(0, Math.max(0, hy), W, H);
      for (let i = 0; i < 60; i++) { const az = i / 60 * TAU + rr() * .05, hgt = 3 + rr() * 9, wd = .035 + rr() * .03, a = D([Math.cos(az) * 70, 0, Math.sin(az) * 70]), b = D([Math.cos(az) * 70, hgt, Math.sin(az) * 70]), c = D([Math.cos(az + wd) * 70, 0, Math.sin(az + wd) * 70]); const lw = rr();
        if (a[2] > 1 && c[2] > 1) { g.fillStyle = '#1c1420'; g.fillRect(Math.min(X(a), X(c)), Y(b), Math.abs(X(c) - X(a)) + 1, Y(a) - Y(b) + 2); if (lw > .5) { g.fillStyle = 'rgba(255,200,110,.8)'; g.fillRect((X(a) + X(c)) / 2, Y(b) + (Y(a) - Y(b)) * (.3 + lw * .3), 2, 2); } } }
    }
    /* floor */
    const fogged = (c, z, k) => { const q = Math.max(0, Math.min(.92, (z - 9) / 34)) * (k || 1); return `rgb(${Math.min(255, c[0] + (fog[0] - c[0]) * q) | 0},${Math.min(255, c[1] + (fog[1] - c[1]) * q) | 0},${Math.min(255, c[2] + (fog[2] - c[2]) * q) | 0})`; };
    for (const fl of s.flats) {
      const vs = fl.p.map(V); let z = 0; for (const v of vs) z += v[2]; z /= vs.length; if (!trace(vs)) continue;
      if (fl.stroke) { g.strokeStyle = 'rgba(210,170,82,.8)'; g.lineWidth = Math.max(1, F / z * .03); g.stroke(); continue; }
      g.fillStyle = fogged(fl.c, z); g.fill();
      if (fl.gold) { g.strokeStyle = '#d2aa52'; g.lineWidth = 2; g.stroke(); } else if (fl.line && F / z > 9) { g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; g.stroke(); if (fl.line === 'plank' && vs.every(v => v[2] > NEAR)) { g.beginPath(); for (const q of [1 / 3, 2 / 3]) { g.moveTo(X(vs[0]) + (X(vs[3]) - X(vs[0])) * q, Y(vs[0]) + (Y(vs[3]) - Y(vs[0])) * q); g.lineTo(X(vs[1]) + (X(vs[2]) - X(vs[1])) * q, Y(vs[1]) + (Y(vs[2]) - Y(vs[1])) * q); } g.stroke(); } }
    }
    /* everything standing on it, far to near by cell */
    const items = [], key = (x, z) => (x - cx0) * (x - cx0) + (z - cz0) * (z - cz0);
    for (const fc of s.faces) { if (!fc.two && dot(fc.n, sub(cam.pos, fc.m)) <= 0) continue; const vs = fc.p.map(V); if (!vs.some(v => v[2] >= NEAR)) continue; items.push({ d: key(fc.cx, fc.cz) - (fc.over ? .02 : 0) + (fc.far ? 4 : 0), fc, vs }); }
    if (units) for (const un of units) { const p = [un.x - hw + .5, 0, un.y - hh + .5], v = V(p); if (v[2] > NEAR + .2) items.push({ d: key(p[0], p[2]) - .03, un, v, lum: s.L ? Math.max(s.L[(Math.round(un.y) * s.w + Math.round(un.x)) * 3] || .5, s.L[(Math.round(un.y) * s.w + Math.round(un.x)) * 3 + 1] || .5) : 1 }); }
    for (const e of s.extras) { const v = V(e.p); if (v[2] > NEAR) items.push({ d: key(e.p[0], e.p[2]) - .025, ex: e, v }); }
    for (const e of s.emit) { const v = V(e.p); if (v[2] > NEAR) items.push({ d: key(e.p[0], e.p[2]) - .04, em: e, v }); }
    items.sort((p, q) => q.d - p.d);
    const fig = (key2, x, y, k, dir, lum, grey) => { if (canFilter) g.filter = (grey ? 'grayscale(1) ' : '') + `brightness(${Math.max(.42, Math.min(1.15, lum * (grey ? .8 : 1.05))).toFixed(2)})`; FIG.draw(g, key2, x, y, k, dir); if (canFilter) g.filter = 'none'; };
    for (const it of items) {
      if (it.fc) {
        const fc = it.fc, vs = it.vs; let z = 0; for (const v of vs) z += v[2]; z /= vs.length; if (!trace(vs)) continue;
        g.fillStyle = fogged(fc.c, z, fc.far ? 2.2 : 1); g.fill(); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1; g.stroke();
        if (fc.glowq) { g.globalCompositeOperation = 'lighter'; g.fillStyle = pl === 'tower' ? 'rgba(60,80,160,.25)' : 'rgba(255,190,90,.25)'; g.fill(); g.globalCompositeOperation = 'source-over'; }
        if (fc.tex && vs.length === 4 && vs.every(v => v[2] > NEAR) && F / z > 7) { // a few lines of brick, beam, tile or book
          const a = vs[0], b = vs[1], c = vs[2], d = vs[3], mix = (p, q, k) => [X(p) + (X(q) - X(p)) * k, Y(p) + (Y(q) - Y(p)) * k], ln = (p, q) => { g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); };
          g.strokeStyle = fc.tex === 'beam' ? 'rgba(50,30,16,.75)' : 'rgba(0,0,0,.26)'; g.lineWidth = fc.tex === 'beam' ? Math.max(1, F / z * .05) : 1; g.beginPath();
          if (fc.tex === 'brick' || fc.tex === 'tall') { const n = fc.tex === 'tall' ? 14 : 3; for (let i = 1; i < n; i++) ln(mix(a, d, i / n), mix(b, c, i / n)); if (fc.tex === 'brick') { ln(mix(mix3(a, d, 0), mix3(b, c, 0), .5), mix(mix3(a, d, 1 / 3), mix3(b, c, 1 / 3), .5)); ln(mix(mix3(a, d, 2 / 3), mix3(b, c, 2 / 3), .5), mix(d, c, .5)); } }
          else if (fc.tex === 'roof') for (let i = 1; i < 4; i++) ln(mix(a, d, i / 4), mix(b, c, i / 4));
          else if (fc.tex === 'beam') { ln(mix(a, d, .96), mix(b, c, .96)); ln(mix(a, d, .5), mix(b, c, .5)); ln(mix(a, b, .5), mix(d, c, .5)); }
          g.stroke();
          if (fc.tex === 'books' && Math.abs(fc.n[1]) < .1) for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) { const p0 = mix3(mix3(a, d, .12 + j * .29), mix3(b, c, .12 + j * .29), .08 + i * .145), p1 = mix3(mix3(a, d, .34 + j * .29), mix3(b, c, .34 + j * .29), .08 + i * .145), p2 = mix3(mix3(a, d, .34 + j * .29), mix3(b, c, .34 + j * .29), .2 + i * .145), p3 = mix3(mix3(a, d, .12 + j * .29), mix3(b, c, .12 + j * .29), .2 + i * .145); g.fillStyle = ['#8e2a22', '#2a5a8e', '#d2aa52', '#3a7a4a', '#6a3a7a', '#c8c0a8'][(i * 5 + j * 3) % 6]; g.beginPath(); g.moveTo(X(p0), Y(p0)); g.lineTo(X(p1), Y(p1)); g.lineTo(X(p2), Y(p2)); g.lineTo(X(p3), Y(p3)); g.fill(); }
        }
      } else if (it.un) {
        const un = it.un, x = X(it.v), y = Y(it.v), k = F / it.v[2]; g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(x, y, k * .36, k * .12, 0, 0, TAU); g.fill();
        if (un.boss) { g.strokeStyle = '#f0c56a'; g.lineWidth = Math.max(1, k * .05); g.beginPath(); g.ellipse(x, y, k * .6, k * .2, 0, 0, TAU); g.stroke(); }
        fig(un.key, x, y, k * (un.boss ? 1.3 : 1), (un.side === 'H' ? 1 : -1) * (t.r[0] < 0 ? -1 : 1), it.lum + (un.side === 'H' ? .3 : .12));
      } else if (it.ex) {
        const e = it.ex, x = X(it.v), y = Y(it.v), k = F / it.v[2];
        if (e.k === 'statue') fig(e.key, x, y, k * .95, t.r[0] < 0 ? -1 : 1, e.lum + .15, true);
        else if (e.k === 'lines') { g.strokeStyle = e.c; g.lineWidth = Math.max(1, k * .04); g.beginPath(); for (const [p, q] of e.pts) { const a = V(p), b = V(q); if (a[2] > NEAR && b[2] > NEAR) { g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b)); } } g.stroke(); if (e.eyes) { const ev = V(e.eyes); if (ev[2] > NEAR) { g.fillStyle = '#ff5a3a'; g.fillRect(X(ev) - k * .1, Y(ev), k * .06, k * .05); g.fillRect(X(ev) + k * .05, Y(ev), k * .06, k * .05); } } }
        else if (e.k === 'orrery') { g.lineWidth = Math.max(1, k * .03); for (let i = 0; i < 3; i++) { const r0 = k * (.3 + i * .2), a = (time || 0) * (1.1 - i * .3) + i * 2; g.strokeStyle = 'rgba(240,200,110,.9)'; g.beginPath(); g.ellipse(x, y, r0, r0 * .4, .3 * i, 0, TAU); g.stroke(); g.fillStyle = ['#7ad0ff', '#ff9a6a', '#e8e8f0'][i]; g.beginPath(); g.arc(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * .4, k * .07, 0, TAU); g.fill(); } g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(x, y, k * .11, 0, TAU); g.fill(); }
        else if (e.k === 'wash') { const a = V([e.x, 2.7, e.z0]), b = V([e.x, 2.7, e.z1]); if (a[2] > NEAR && b[2] > NEAR) { g.strokeStyle = '#d8d0c0'; g.lineWidth = 1; g.beginPath(); g.moveTo(X(a), Y(a)); g.lineTo(X(b), Y(b)); g.stroke(); const n = Math.max(2, Math.round((e.z1 - e.z0) * 1.6)); for (let i = 0; i < n; i++) { const z = e.z0 + (i + .5) * (e.z1 - e.z0) / n, sw = time ? Math.sin(time * 1.6 + i + e.x) * .07 : 0, q = [[e.x, 2.68, z - .18], [e.x, 2.68, z + .18], [e.x + sw, 2.0, z + .16], [e.x + sw, 2.0, z - .16]].map(V); if (q.every(v => v[2] > NEAR)) { g.fillStyle = ['#c8c0b0', '#8e2a22', '#5a6a8c', '#d2aa52', '#e8dcc0'][(i + (e.v * 5 | 0)) % 5]; g.beginPath(); g.moveTo(X(q[0]), Y(q[0])); for (let j = 1; j < 4; j++) g.lineTo(X(q[j]), Y(q[j])); g.fill(); } } } }
      } else {
        const e = it.em, x = X(it.v), y = Y(it.v), k = F / it.v[2], fl = time ? Math.sin(time * 13 + e.p[0] * 9) * .5 + .5 : .5;
        if (e.k === 'glow') { const r0 = k * e.r * (1 + fl * .08), gr = g.createRadialGradient(x, y, 0, x, y, r0); gr.addColorStop(0, `rgba(${e.c},${e.a})`); gr.addColorStop(.25, `rgba(${e.c},${e.a * .35})`); gr.addColorStop(1, `rgba(${e.c},0)`); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r0, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over'; }
        else if (e.k === 'flame') { const s2 = k * e.s; g.fillStyle = '#ffa030'; g.beginPath(); g.moveTo(x - s2, y); g.quadraticCurveTo(x - s2 * 1.1, y - s2 * 1.3, x + (fl - .5) * s2, y - s2 * (2.6 + fl * .8)); g.quadraticCurveTo(x + s2 * 1.1, y - s2 * 1.3, x + s2, y); g.fill(); g.fillStyle = '#fff2b0'; g.beginPath(); g.ellipse(x, y - s2 * .6, s2 * .45, s2 * .9, 0, 0, TAU); g.fill();
          if (time) for (let i = 0; i < 4; i++) { const ph = (time * .45 + i / 4 + e.p[0] * .37) % 1; g.fillStyle = `rgba(255,${150 + ph * 70 | 0},60,${(1 - ph) * .9})`; g.fillRect(x + Math.sin(ph * 9 + i * 2) * k * .15, y - k * (.2 + ph * 1.5), Math.max(1.5, k * .03), Math.max(1.5, k * .03)); } }
        else if (e.k === 'smoke' && time) for (let i = 0; i < 5; i++) { const ph = (time * .12 + i / 5) % 1, r0 = k * (.2 + ph * .7); g.fillStyle = `rgba(150,140,150,${(1 - ph) * .22})`; g.beginPath(); g.arc(x + ph * k * .9 + Math.sin(ph * 6 + i) * k * .1, y - ph * k * 2.6, r0, 0, TAU); g.fill(); }
      }
    }
    /* air */
    if (time && pl !== 'slum') for (let i = 0; i < 50; i++) { const p = V([(rr() - .5) * s.w + Math.sin(time * .3 + i) * .5, .3 + rr() * 2.4 + Math.sin(time * .2 + i * 2) * .3, (rr() - .5) * s.h]); if (p[2] > NEAR) { g.fillStyle = `rgba(255,235,200,${.12 + rr() * .2})`; g.fillRect(X(p), Y(p), Math.max(1, F / p[2] * .02), Math.max(1, F / p[2] * .02)); } }
    if (time && pl === 'slum') { g.strokeStyle = 'rgba(190,205,235,.28)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 90; i++) { const x = rr() * W, y = (rr() * H + time * (700 + rr() * 300)) % H, l = 10 + rr() * 14; g.moveTo(x, y); g.lineTo(x - l * .2, y + l); } g.stroke(); }
    if (pl === 'crypt' && time) for (let i = 0; i < 5; i++) { const p = V([(rr() - .5) * s.w + Math.sin(time * .1 + i) * 2, .4, (rr() - .5) * s.h]); if (p[2] > NEAR) { const r0 = F / p[2] * 3, gr = g.createRadialGradient(X(p), Y(p), 0, X(p), Y(p), r0); gr.addColorStop(0, 'rgba(150,160,200,.07)'); gr.addColorStop(1, 'rgba(150,160,200,0)'); g.fillStyle = gr; g.fillRect(X(p) - r0, Y(p) - r0 * .4, r0 * 2, r0 * .8); } }
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .32, W / 2, H / 2, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, pl === 'crypt' ? 'rgba(0,0,0,.82)' : 'rgba(6,4,12,.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  const mix3 = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k];
  return { build, buildRoom, render, fly, orbit, door };
})();
if (typeof module !== 'undefined') module.exports = A3;
