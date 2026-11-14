// Builds the homepage card art for The Hundred as inline SVG, using the game's own figures.
//   node tools/card.js > card.svg
const fs = require('fs'), path = require('path'), TAU = Math.PI * 2;
class Rec {
  constructor() { this.m = [1, 0, 0, 1, 0, 0]; this.st = []; this.out = []; this.d = ''; this.lineWidth = 1; this.fillStyle = '#000'; this.strokeStyle = '#000'; this.last = null; }
  save() { this.st.push(this.m.slice()); } restore() { this.m = this.st.pop(); }
  mul(a, b, c, d, e, f) { const m = this.m; this.m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]]; }
  translate(x, y) { this.mul(1, 0, 0, 1, x, y); } scale(x, y) { this.mul(x, 0, 0, y, 0, 0); } transform(...a) { this.mul(...a); }
  P(x, y) { const m = this.m; return Math.round(m[0] * x + m[2] * y + m[4]) + ' ' + Math.round(m[1] * x + m[3] * y + m[5]); }
  beginPath() { this.d = ''; } closePath() { this.d += 'Z'; }
  moveTo(x, y) { this.d += 'M' + this.P(x, y); } lineTo(x, y) { this.d += 'L' + this.P(x, y); }
  quadraticCurveTo(a, b, x, y) { this.d += 'Q' + this.P(a, b) + ' ' + this.P(x, y); }
  arc(x, y, r, a0, a1, ccw) { this.ellipse(x, y, r, r, 0, a0, a1, ccw); }
  ellipse(x, y, rx, ry, rot, a0, a1, ccw) {
    if (!ccw) { while (a1 < a0) a1 += TAU; if (a1 - a0 > TAU) a1 = a0 + TAU; } else { while (a1 > a0) a1 -= TAU; if (a0 - a1 > TAU) a1 = a0 - TAU; }
    const full = Math.abs(a1 - a0) >= TAU - 1e-6, n = Math.max(4, Math.ceil(Math.abs(a1 - a0) / (TAU / 14))), c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i <= (full ? n - 1 : n); i++) { const a = a0 + (a1 - a0) * i / n, px = Math.cos(a) * rx, py = Math.sin(a) * ry; this.d += (this.d && !(full && i === 0) ? 'L' : 'M') + this.P(x + px * c - py * s, y + px * s + py * c); }
    if (full) this.d += 'Z';
  }
  createRadialGradient() { return { stops: [], addColorStop(o, c) { this.stops.push(c); } }; }
  fill() { let f = this.fillStyle, extra = ''; if (typeof f === 'object') { const mm = /rgba\(([^)]+),[^,]+\)/.exec(f.stops[0]); f = 'rgb(' + mm[1] + ')'; extra = ' opacity=".35"'; } this.last = { d: this.d, i: this.out.length }; this.out.push(`<path d="${this.d}" fill="${f}"${extra}/>`); }
  stroke() {
    const m = this.m, w = +(this.lineWidth * Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]))).toFixed(1), a = ` stroke="${this.strokeStyle}" stroke-width="${w}"`;
    if (this.last && this.last.d === this.d && this.last.i === this.out.length - 1 && !this.out[this.last.i].includes('opacity')) this.out[this.last.i] = this.out[this.last.i].replace('/>', a + '/>');
    else this.out.push(`<path d="${this.d}" fill="none"${a}/>`);
    this.last = null;
  }
  drawImage() { }
}
const recs = [];
global.document = { createElement() { const r = new Rec(); const cv = { width: 0, height: 0, getContext() { return r; }, toDataURL() { return ''; } }; r.cv = cv; recs.push(r); return cv; } };
const FIG = new Function(fs.readFileSync(path.join(__dirname, '..', 'figures.js'), 'utf8') + '\nreturn FIG;')();
const sym = {}, defs = [];
function S(key) { // register a figure as a <symbol>; returns its metrics
  if (sym[key]) return sym[key];
  const n = recs.length, s = FIG.sprite(key), r = recs[n], id = 'hd' + key;
  defs.push(`<symbol id="${id}" overflow="visible"><g stroke-linejoin="round" stroke-linecap="round">${r.out.join('')}</g></symbol>`);
  return sym[key] = { id, cx: r.cv.width / 2, fy: (s.uh - s.pad) * (r.cv.width / s.uw), ppu: r.cv.width / s.uw };
}
const items = [];
function put(key, x, y, px, dir) { // px = on-screen pixels per world unit
  const s = S(key), k = px / s.ppu;
  items.push({ y, t: `<ellipse cx="${x}" cy="${y}" rx="${(px * .36).toFixed(1)}" ry="${(px * .1).toFixed(1)}" fill="#000" opacity=".28"/><use href="#${s.id}" transform="translate(${x} ${y}) scale(${(dir * k).toFixed(3)} ${k.toFixed(3)}) translate(${-s.cx} ${-s.fy.toFixed(0)})"/>` });
}
const row = (keys, x0, dx, y, px, dir) => keys.forEach((k, i) => put(k, x0 + i * dx, y + (i % 2) * 3, px, dir));
row(['illusionist', 'mage', 'druid', 'mage', 'illusionist', 'ranger', 'ranger', 'thief'], 128, 24, 300, 50, 1);
row(['druid', 'ranger', 'assassin', 'cleric', 'monk', 'paladin', 'fighter'], 122, 28, 336, 64, 1);
row(['monk', 'thief', 'cleric', 'paladin', 'fighter', 'fighter'], 124, 36, 390, 84, 1);
put('dragon', 452, 296, 72, -1);
row(Array(7).fill('legionary'), 384, 25, 302, 48, -1);
row(Array(5).fill('legionary'), 392, 33, 338, 62, -1);
put('minotaur', 352, 372, 70, -1);
row(Array(4).fill('legionary'), 408, 42, 392, 80, -1);
items.sort((a, b) => a.y - b.y);

const top = x => { const t = x / 640; return 118 * (1 - t) * (1 - t) + 2 * 172 * t * (1 - t) + 118 * t * t; };
let flags = '';
for (const x of [70, 150, 385, 475, 570]) { const y = top(x) - 6; flags += `<path d="M${x} ${y.toFixed(0)}v-30" stroke="#2a1f18" stroke-width="2"/><path class="hdflag" d="M${x} ${(y - 30).toFixed(0)}l20 5l-20 6z" fill="#c0362c"/>`; }
const crowd = ['#c9b08a', '#8e2a22', '#d2aa52', '#5a4a8c', '#e8dcc0', '#3a2c22', '#7a3a7c', '#b0522e', '#40506a', '#c9b08a', '#8e2a22', '#e8dcc0'];
let seed = 3; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const dots = crowd.map(c => `<rect x="${(rnd() * 44).toFixed(0)}" y="${(rnd() * 18).toFixed(0)}" width="3" height="4" fill="${c}"/>`).join('');
const svg = `<svg viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="hdSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d0a0a"/><stop offset=".55" stop-color="#8e2a22"/><stop offset="1" stop-color="#e08a3e"/></linearGradient>
<linearGradient id="hdSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3935c"/><stop offset="1" stop-color="#e3cb93"/></linearGradient>
<linearGradient id="hdStone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a8468"/><stop offset="1" stop-color="#5e4f3e"/></linearGradient>
<radialGradient id="hdHalo"><stop offset="0" stop-color="#f0c56a" stop-opacity=".55"/><stop offset="1" stop-color="#f0c56a" stop-opacity="0"/></radialGradient>
<radialGradient id="hdFire"><stop offset="0" stop-color="#fff2b0"/><stop offset=".35" stop-color="#ff9a30" stop-opacity=".8"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/></radialGradient>
<radialGradient id="hdVig" cx=".5" cy=".55" r=".75"><stop offset=".55" stop-color="#140806" stop-opacity="0"/><stop offset="1" stop-color="#140806" stop-opacity=".7"/></radialGradient>
<pattern id="hdCrowd" width="46" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(-3)">${dots}</pattern>
${defs.join('\n')}
</defs>
<rect width="640" height="400" fill="url(#hdSky)"/>
<circle class="glow" cx="262" cy="74" r="100" fill="url(#hdHalo)"/>
<circle cx="262" cy="74" r="50" fill="#120b09" stroke="#f0c56a" stroke-width="2.5"/>
<ellipse cx="262" cy="74" rx="9" ry="27" fill="#f0c56a"/>
${flags}
<path d="M0 118Q320 172 640 118V290H0z" fill="url(#hdStone)"/>
<path d="M0 124Q320 178 640 124V280H0z" fill="url(#hdCrowd)"/>
<path d="M0 118Q320 172 640 118" fill="none" stroke="#6e5c48" stroke-width="12"/>
<path d="M0 118Q320 172 640 118" fill="none" stroke="#1c1512" stroke-width="6" stroke-dasharray="9 8"/>
<g fill="none" stroke="#000" stroke-opacity=".22"><path d="M0 150Q320 198 640 150"/><path d="M0 180Q320 222 640 180"/><path d="M0 210Q320 244 640 210"/></g>
<path d="M214 196l10 -34h76l10 34z" fill="#2a0f24"/><path d="M206 162l18 -14h76l18 14z" fill="#8e2a22" stroke="#d2aa52" stroke-width="2"/>
<circle cx="262" cy="182" r="6" fill="#120b09"/><ellipse class="glow" cx="262" cy="182" rx="1.6" ry="4" fill="#f0c56a"/>
<path d="M0 262Q320 236 640 262V292H0z" fill="#4e4032"/><path d="M0 262Q320 236 640 262" fill="none" stroke="#8e2a22" stroke-width="3"/>
<path d="M0 286Q320 256 640 286V400H0z" fill="url(#hdSand)"/>
<path d="M170 276h300l150 124h-600z" fill="#f0dca8" opacity=".28"/>
<g stroke="#5a3c14" stroke-opacity=".16" fill="none"><path d="M245 276l-125 124M320 276v124M395 276l125 124M130 306h380M76 348h488"/></g>
<circle class="glow" cx="358" cy="184" r="40" fill="url(#hdFire)"/>
${items.map(i => i.t).join('\n')}
<rect width="640" height="400" fill="url(#hdVig)"/>
<g transform="translate(104 20)"><rect width="70" height="18" fill="#140e0a" fill-opacity=".7" stroke="#d2aa52"/><text x="35" y="13" text-anchor="middle" font-family="Georgia,serif" font-size="10" letter-spacing="3" fill="#d2aa52">SKYCAM</text></g>
</svg>`;
process.stdout.write(svg);
