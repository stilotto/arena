const URL0 = 'file://' + require('path').resolve(__dirname, '../../index.html');
const E = require('../../engine.js');
let plain = 0, tot = 0; const kinds = {}, sizes = {};
for (const pl of ['crypt', 'tower', 'slum']) for (let seed = 1; seed <= 300; seed++) for (let n = 0; n < 4; n++) { const R = E.makeRoom(pl, n, seed); tot++; if (R.kind === 'plain') plain++; kinds[R.kind] = (kinds[R.kind] || 0) + 1; sizes[pl + R.w + 'x' + R.h] = 1;
  if (R.entry.length < 9 || !R.bossAt || R.spawn.length < 14) console.log('BAD', pl, seed, n); for (const e of R.entry) if (R.cells[e[1] * R.w + e[0]]) console.log('entry blocked'); }
console.log('rooms', tot, 'plain fallbacks', plain, kinds, Object.keys(sizes).join(' '));
const show = (pl, n, seed) => { const R = E.makeRoom(pl, n, seed); console.log(pl, R.kind, R.name, 'lights', R.lights.length); for (let y = 0; y < R.h; y++) { let l = ''; for (let x = 0; x < R.w; x++) { const k = R.cells[y * R.w + x], e = R.entry.some(q => q[0] === x && q[1] === y), b = R.bossAt[0] === x && R.bossAt[1] === y; l += b ? 'B' : e ? 'e' : k === 1 ? '#' : k === 2 ? 'o' : k === 3 ? '~' : '.'; } console.log(l); } };
show('crypt', 1, 7); show('tower', 0, 11); show('slum', 2, 5); show('slum', 3, 9);
