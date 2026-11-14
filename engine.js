'use strict';
/* The Hundred: rules engine. No DOM in this file, so it also runs headless in Node. */

const rnd = () => Math.random();
const ri = n => 1 + Math.floor(rnd() * n);
const dice = a => { let t = a[2] || 0; for (let i = 0; i < a[0]; i++) t += ri(a[1]); return t; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function roman(n) {
  const t = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = ''; for (const [v, r] of t) while (n >= v) { s += r; n -= v; } return s;
}

/* ---------- classes ---------- */
const ORDER = ['fighter', 'paladin', 'ranger', 'cleric', 'druid', 'mage', 'illusionist', 'thief', 'assassin', 'monk'];
const CL = {
  fighter:     { n: 'Fighter',     pl: 'Fighters',     g: 'F', col: '#aeb9c6', hd: 10, ac: 4,  dmg: [1, 8, 0], thr: 1,   mv: 4, prime: 'str', front: 0, note: 'Sweeps through weak foes: one blow per level against rabble.' },
  paladin:     { n: 'Paladin',     pl: 'Paladins',     g: 'P', col: '#f0dc8a', hd: 10, ac: 4,  dmg: [1, 8, 0], thr: 1,   mv: 4, prime: 'str', front: 1, note: 'Lay on Hands once a day.' },
  ranger:      { n: 'Ranger',      pl: 'Rangers',      g: 'R', col: '#6fae5a', hd: 8, hd1: 2, ac: 6, dmg: [1, 8, 0], rdmg: [1, 6, 0], range: 8, thr: 1, mv: 5, prime: 'str', front: 7, note: 'Longbow. Extra damage against goblin-kind and giants.' },
  cleric:      { n: 'Cleric',      pl: 'Clerics',      g: 'C', col: '#f2f2f7', hd: 8,  ac: 4,  dmg: [1, 6, 1], thr: .67, mv: 4, front: 3, note: 'Cure Wounds and Turn Undead.' },
  druid:       { n: 'Druid',       pl: 'Druids',       g: 'D', col: '#3f9f78', hd: 8,  ac: 7,  dmg: [1, 8, 0], thr: .67, mv: 5, front: 6, note: 'Entangle, later Cure Wounds and Call Lightning.' },
  mage:        { n: 'Magic-User',  pl: 'Magic-Users',  g: 'M', col: '#6c8be0', hd: 4,  ac: 10, dmg: [1, 4, 0], rdmg: [1, 3, 0], range: 4, thr: .34, mv: 5, front: 9, note: 'Sleep, Magic Missile, and Fireball at 5th level.' },
  illusionist: { n: 'Illusionist', pl: 'Illusionists', g: 'I', col: '#c77be0', hd: 4,  ac: 10, dmg: [1, 4, 0], rdmg: [1, 3, 0], range: 4, thr: .34, mv: 5, front: 8, note: 'Blinding Colours and Phantom Legionary decoys.' },
  thief:       { n: 'Thief',       pl: 'Thieves',      g: 'T', col: '#d9a441', hd: 6,  ac: 7,  dmg: [1, 6, 0], thr: .5,  mv: 6, prime: 'dex', front: 5, note: 'Backstab: double damage on a foe an ally also threatens.' },
  assassin:    { n: 'Assassin',    pl: 'Assassins',    g: 'A', col: '#7d8794', hd: 6,  ac: 7,  dmg: [1, 8, 0], thr: .5,  mv: 6, prime: 'dex', front: 4, note: 'One assassination attempt per battle. Backstab.' },
  monk:        { n: 'Monk',        pl: 'Monks',        g: 'K', col: '#e07b3a', hd: 4, hd1: 2, ac: 10, dmg: [1, 6, 0], thr: .67, mv: 7, prime: 'dex', front: 2, note: 'Fast. Open hand stuns. Armour class improves each level.' }
};

const SPELLS = {
  sleep:     { n: 'Sleep',             range: 8,  rad: 1, tg: 'cell' },
  missile:   { n: 'Magic Missile',     range: 10, tg: 'foe' },
  fireball:  { n: 'Fireball',          range: 10, rad: 2, tg: 'cell', ff: true },
  colours:   { n: 'Blinding Colours',  range: 4,  rad: 1, tg: 'cell' },
  phantom:   { n: 'Phantom Legionary', range: 6,  tg: 'empty' },
  cure:      { n: 'Cure Wounds',       range: 6,  tg: 'ally' },
  turn:      { n: 'Turn Undead',       tg: 'self' },
  entangle:  { n: 'Entangle',          range: 8,  rad: 1, tg: 'cell' },
  lightning: { n: 'Call Lightning',    range: 8,  rad: 1, tg: 'cell' },
  loh:       { n: 'Lay on Hands',      range: 1,  tg: 'ally' }
};

function spellsFor(h) {
  const L = h.lvl, s = {};
  switch (h.cls) {
    case 'mage': s.sleep = 1 + (L >= 4 ? 1 : 0); if (L >= 2) s.missile = Math.floor(L / 2); if (L >= 5) s.fireball = 1 + Math.floor((L - 5) / 3); break;
    case 'illusionist': s.colours = 1 + Math.floor(L / 3); if (L >= 2) s.phantom = Math.floor(L / 2); break;
    case 'cleric': s.cure = 1 + Math.floor(L / 2); s.turn = 3; break;
    case 'druid': s.entangle = 1 + (L >= 4 ? 1 : 0); if (L >= 2) s.cure = Math.floor(L / 2); if (L >= 5) s.lightning = 1 + Math.floor((L - 5) / 2); break;
    case 'paladin': s.loh = 1; break;
  }
  return s;
}

/* ---------- foes ---------- */
// f: g = goblin-kind/giant (ranger bonus), u = undead, par = paralysing touch, poi = poison, reg = regenerates,
//    fly = ignores zones of control
const MON = {
  kobold:    { n: 'Kobold',          pl: 'Kobolds',          hd: .5, ac: 7, dmg: [1, 4, 0], mv: 4, cost: 5,   g: 'k', f: 'g' },
  rat:       { n: 'Giant Rat',       pl: 'Giant Rats',       hd: .5, ac: 7, dmg: [1, 3, 0], mv: 6, cost: 4,   g: 'r' },
  goblin:    { n: 'Goblin',          pl: 'Goblins',          hd: 1,  ac: 6, dmg: [1, 6, 0], mv: 4, cost: 9,   g: 'g', f: 'g' },
  gobarcher: { n: 'Goblin Archer',   pl: 'Goblin Archers',   hd: 1,  ac: 7, dmg: [1, 6, 0], mv: 4, cost: 11,  g: 'a', f: 'g', range: 7 },
  skeleton:  { n: 'Skeleton',        pl: 'Skeletons',        hd: 1,  ac: 7, dmg: [1, 6, 0], mv: 4, cost: 11,  g: 's', f: 'u' },
  orc:       { n: 'Orc',             pl: 'Orcs',             hd: 1,  ac: 6, dmg: [1, 8, 0], mv: 4, cost: 12,  g: 'o', f: 'g' },
  wolf:      { n: 'Dire Wolf',       pl: 'Dire Wolves',      hd: 2,  ac: 7, dmg: [1, 4, 1], mv: 7, cost: 20,  g: 'w' },
  zombie:    { n: 'Zombie',          pl: 'Zombies',          hd: 2,  ac: 8, dmg: [1, 8, 0], mv: 3, cost: 20,  g: 'z', f: 'u' },
  hobgoblin: { n: 'Hobgoblin',       pl: 'Hobgoblins',       hd: 1.5, ac: 5, dmg: [1, 8, 0], mv: 4, cost: 18, g: 'h', f: 'g' },
  ghoul:     { n: 'Ghoul',           pl: 'Ghouls',           hd: 2,  ac: 6, dmg: [1, 4, 0], att: 2, mv: 5, cost: 40, g: 'G', f: 'u par' },
  spider:    { n: 'Giant Spider',    pl: 'Giant Spiders',    hd: 3,  ac: 5, dmg: [1, 8, 0], mv: 6, cost: 55,  g: 'S', f: 'poi' },
  legionary: { n: 'Ashen Legionary', pl: 'Ashen Legionaries', hd: 3, ac: 3, dmg: [1, 8, 1], mv: 4, cost: 60,  g: 'L' },
  ogre:      { n: 'Ogre',            pl: 'Ogres',            hd: 4,  ac: 5, dmg: [1, 10, 0], mv: 4, cost: 75, g: 'O', f: 'g' },
  wight:     { n: 'Barrow Wight',    pl: 'Barrow Wights',    hd: 4,  ac: 5, dmg: [1, 6, 0], mv: 4, cost: 90,  g: 'W', f: 'u par' },
  wraith:    { n: 'Wraith',          pl: 'Wraiths',          hd: 5,  ac: 4, dmg: [1, 6, 1], mv: 6, cost: 140, g: 'X', f: 'u par' },
  minotaur:  { n: 'Minotaur',        pl: 'Minotaurs',        hd: 6,  ac: 6, dmg: [1, 8, 2], att: 2, mv: 5, cost: 150, g: 'B' },
  troll:     { n: 'Troll',           pl: 'Trolls',           hd: 6,  ac: 4, dmg: [1, 6, 2], att: 3, mv: 5, cost: 220, g: 'T', f: 'g reg' },
  giant:     { n: 'Hill Giant',      pl: 'Hill Giants',      hd: 8,  ac: 4, dmg: [2, 8, 0], mv: 5, cost: 280, g: 'H', f: 'g' },
  wyvern:    { n: 'Wyvern',          pl: 'Wyverns',          hd: 7,  ac: 3, dmg: [2, 8, 0], mv: 7, cost: 300, g: 'V', f: 'poi fly' },
  chimera:   { n: 'Chimera',         pl: 'Chimeras',         hd: 9,  ac: 4, dmg: [1, 8, 1], att: 3, mv: 6, cost: 450, g: 'Q', breath: [3, 8, 0] },
  firegiant: { n: 'Fire Giant',      pl: 'Fire Giants',      hd: 11, ac: 3, dmg: [2, 8, 4], att: 2, mv: 5, cost: 600, g: 'J', f: 'g' },
  warfiend:  { n: 'Warfiend',        pl: 'Warfiends',        hd: 9,  ac: 0, dmg: [2, 6, 2], att: 2, mv: 6, cost: 650, g: 'Y' },
  dragon:    { n: 'Arena Wyrm',      pl: 'Arena Wyrms',      hd: 10, ac: 1, dmg: [1, 10, 2], att: 3, mv: 7, cost: 900, g: 'Z', f: 'fly', breath: [8, 6, 0] },
  vhorax:    { n: 'Vhorax',          pl: 'Vhorax',           hd: 16, ac: -2, dmg: [2, 10, 4], att: 3, mv: 6, cost: 1500, g: '@', gaze: 1, summon: ['legionary', 4] }
};

// The games Vhorax has billed, day by day. m = [foe, share of the budget]
const SCHED = [
  { t: 'A rabble of kobolds', m: [['kobold', 1]] },
  { t: 'Kobolds and vermin', m: [['kobold', .6], ['rat', .4]] },
  { t: 'A goblin warband', m: [['goblin', .65], ['gobarcher', .35]] },
  { t: 'The restless dead', s: 2, m: [['skeleton', .7], ['zombie', .3]] },
  { t: 'Gruk the Gatebreaker', m: [['orc', 1]], boss: 'ogre', bn: 'Gruk the Gatebreaker' },
  { t: 'Orc raiders and their wolves', s: 2, m: [['orc', .6], ['wolf', .4]] },
  { t: 'A hobgoblin maniple', m: [['hobgoblin', .7], ['gobarcher', .3]] },
  { t: 'The ghoul pack', s: 3, m: [['ghoul', .5], ['zombie', .25], ['skeleton', .25]] },
  { t: 'The spider pits', s: 4, m: [['spider', .7], ['wolf', .3]] },
  { t: 'The Bull of the Lower Gate', m: [['hobgoblin', 1]], boss: 'minotaur', bn: 'The Bull of the Lower Gate' },
  { t: 'Ogres and their thralls', s: 2, m: [['ogre', .6], ['orc', .4]] },
  { t: 'The Ashen Legion', s: 4, m: [['legionary', 1]] },
  { t: 'The barrow lords', s: 3, m: [['wight', .5], ['ghoul', .25], ['skeleton', .25]] },
  { t: 'Trolls from the under-river', s: 2, m: [['troll', .6], ['orc', .4]] },
  { t: 'Old Maul, chieftain of the hills', m: [['ogre', .7], ['wolf', .3]], boss: 'giant', bn: 'Old Maul' },
  { t: 'The labyrinth emptied', s: 4, m: [['minotaur', .7], ['hobgoblin', .3]] },
  { t: 'A flight of wyverns', s: 2, m: [['wyvern', .75], ['hobgoblin', .25]] },
  { t: 'Wraiths at dusk', s: 4, m: [['wraith', .5], ['wight', .3], ['zombie', .2]] },
  { t: 'The hill giants', s: 2, m: [['giant', .7], ['ogre', .3]] },
  { t: 'The Thing with Three Heads', m: [['legionary', 1]], boss: 'chimera', bn: 'The Thing with Three Heads' },
  { t: 'Trolls and ogres', s: 3, m: [['troll', .6], ['ogre', .4]] },
  { t: 'The fire giants', s: 2, m: [['firegiant', .7], ['ogre', .3]] },
  { t: 'Warfiends of the Iron Plane', s: 4, m: [['warfiend', .5], ['legionary', .5]] },
  { t: 'A pride of chimeras', s: 3, m: [['chimera', .7], ['troll', .3]] },
  { t: 'Cindermaw, the Arena Wyrm', m: [['legionary', .6], ['wyvern', .4]], boss: 'dragon', bn: 'Cindermaw' },
  { t: 'The dead of every game so far', s: 4, m: [['wraith', .4], ['wight', .3], ['ghoul', .3]] },
  { t: 'Giants of hill and fire', s: 2, m: [['firegiant', .5], ['giant', .5]] },
  { t: 'Wyverns and warfiends', s: 3, m: [['warfiend', .5], ['wyvern', .5]] },
  { t: 'The Ashen Legion entire', s: 4, m: [['legionary', .6], ['warfiend', .25], ['troll', .15]] },
  { t: "Vhorax's Champion", m: [['legionary', .5], ['warfiend', .5]], boss: 'warfiend', bn: 'Karn, Champion of Vhorax' },
  { t: 'Vhorax, Editor of the Games', s: 4, final: true, m: [['legionary', .6], ['warfiend', .4]], boss: 'vhorax', bn: 'Vhorax' }
];

const TUNE = { budA: 30, budP: 1.6, vetDay: 14, vet: .18, xp: 4, purseA: 30, purseB: 20, bossHp: 2.5 };
function budget(d) { return Math.round(TUNE.budA * Math.pow(d, TUNE.budP)); }
// Past the middle days the foes stop multiplying and start getting tougher instead.
function veteran(d) { return 1 + Math.max(0, d - TUNE.vetDay) * TUNE.vet; }
function gateCap(d) { return Math.min(10, 1 + Math.floor(d / 2)); }
const FINAL = 31;
function billing(d) {
  const s = SCHED[d <= FINAL ? d - 1 : 20 + (d - FINAL - 1) % 10];
  let B = budget(d); const foes = [];
  if (s.boss) B = Math.max(B * .4, B - MON[s.boss].cost * 3);
  for (const [id, w] of s.m) foes.push({ id, count: Math.max(1, Math.round(B * w / MON[id].cost)) });
  return { title: s.t, foes, boss: s.boss, bn: s.bn, purse: TUNE.purseA + TUNE.purseB * d, sides: s.s || 1, final: !!s.final && d === FINAL, vet: veteran(d) };
}
function billingText(bl) {
  const p = bl.foes.map(f => f.count + ' ' + (f.count === 1 ? MON[f.id].n : MON[f.id].pl));
  if (bl.boss) p.unshift(bl.bn === MON[bl.boss].n ? bl.bn : bl.bn + ' (' + MON[bl.boss].n + ')');
  return p.join(', ');
}

/* ---------- heroes and the campaign ---------- */
const N1 = ['Al', 'Bran', 'Cor', 'Dar', 'El', 'Fen', 'Gar', 'Hal', 'Is', 'Jor', 'Kel', 'Lor', 'Mar', 'Ned', 'Or', 'Per', 'Quin', 'Ros', 'Sil', 'Tor', 'Ul', 'Val', 'Wyn', 'Yor', 'Zan', 'Ash', 'Bel', 'Cyr', 'Dra', 'Eth'];
const N2 = ['a', 'en', 'ic', 'or', 'wyn', 'eth', 'is', 'ar', 'in', 'us', 'iel', 'an', 'ok', 'ia', 'eld', 'mir', 'ric', 'on', 'ara', 'ith'];
const XPT = [0, 100, 250, 500, 1000, 2000, 4000, 7000, 11000];
const xpNeed = l => l < XPT.length ? XPT[l] : 11000 + (l - 8) * 5000;
const roll4 = () => { const r = [ri(6), ri(6), ri(6), ri(6)].sort((a, b) => a - b); return r[1] + r[2] + r[3]; };
const strHit = s => s >= 17 ? 1 : 0, strDmg = s => s >= 18 ? 2 : s >= 16 ? 1 : 0;
const dexAC = s => s >= 17 ? 2 : s >= 15 ? 1 : 0, conHP = s => s >= 16 ? 2 : s >= 15 ? 1 : 0;

function newHero(cls, ci, used) {
  const c = CL[cls]; let name;
  do { name = N1[ri(N1.length) - 1] + N2[ri(N2.length) - 1]; } while (used[name]);
  used[name] = 1;
  const h = { name, cls, ci, lvl: 1, xp: 0, str: roll4(), dex: roll4(), con: roll4(), kills: 0 };
  if (c.prime) h[c.prime] = Math.max(h[c.prime], roll4(), 12);
  h.max = (c.hd1 || 1) * c.hd + conHP(h.con); h.hp = h.max;
  return h;
}
function newCampaign() {
  const used = {}, heroes = [], cohorts = [], gear = {};
  ORDER.forEach((cls, ci) => {
    cohorts.push({ order: 'attack', spells: true }); gear[cls] = { arms: 0, armor: 0 };
    for (let i = 0; i < 10; i++) heroes.push(newHero(cls, ci, used));
  });
  return { v: 2, day: 1, gold: 40, potions: 0, heroes, cohorts, gear, pick: [0], fallen: 0, best: 0 };
}
const living = (S, ci) => S.heroes.filter(h => !h.dead && (ci == null || h.ci === ci));
// Older saves kept gear on the cohort. Gear now belongs to the calling, so cohorts can be mixed freely.
function migrate(S) {
  if (!S.gear) { S.gear = {}; ORDER.forEach((c, i) => { const co = S.cohorts[i] || {}; S.gear[c] = { arms: co.arms || 0, armor: co.armor || 0 }; }); }
  S.v = 2; return S;
}
function heroAC(h, gr) { return CL[h.cls].ac - gr.armor - dexAC(h.dex) - (h.cls === 'monk' ? h.lvl - 1 : 0); }
function heroThac0(h, gr) { return 20 - Math.floor((h.lvl - 1) * CL[h.cls].thr) - gr.arms - strHit(h.str); }
const trainCost = h => 10 * (h.lvl + 1);
const canTrain = h => !h.dead && h.xp >= xpNeed(h.lvl);
function levelUp(h) {
  const c = CL[h.cls]; h.lvl++;
  const g = Math.max(Math.ceil(c.hd / 2), ri(c.hd)) + conHP(h.con);
  h.max += g; h.hp += g;
}
const TIER = ['Arena issue', 'Fine', 'Masterwork', 'Enchanted'], TIERCOST = [0, 60, 200, 600];

/* ---------- battle ---------- */
const idx = (b, x, y) => y * b.w + x;
const inb = (b, x, y) => x >= 0 && y >= 0 && x < b.w && y < b.h;
const at = (b, x, y) => inb(b, x, y) ? b.grid[idx(b, x, y)] : null;
const dist = (a, c) => Math.max(Math.abs(a.x - c.x), Math.abs(a.y - c.y));
const foesOf = (b, u) => b.units.filter(x => x.hp > 0 && x.side !== u.side);
const alliesOf = (b, u) => b.units.filter(x => x.hp > 0 && x.side === u.side && !x.illusion);
function fx(b, o) { if (b.nofx) return; o.t = Date.now(); b.fx.push(o); if (b.fx.length > 300) b.fx.splice(0, 150); }
function say(b, s) { b.log.push(s); if (b.log.length > 200) b.log.shift(); }
function place(b, u, x, y) { u.x = x; u.y = y; b.grid[idx(b, x, y)] = u; }
function moveTo(b, u, x, y) {
  if (!u.fly && u.cls !== 'thief' && u.cls !== 'assassin') for (const e of b.units) { // free blows from foes left behind
    if (e.hp <= 0 || e.side === u.side || e.illusion || e.opp || helpless(e) || dist(e, u) !== 1 || Math.max(Math.abs(e.x - x), Math.abs(e.y - y)) <= 1) continue;
    e.opp = true; strike(b, e, u, e.side === 'H' ? CL[e.cls].dmg : e.m.dmg, { bonus: 2 });
    if (u.hp <= 0) return false;
  }
  b.grid[idx(b, u.x, u.y)] = null; fx(b, { k: 'move', a: [u.x, u.y], b: [x, y] }); place(b, u, x, y); u.moved = true; return true;
}

function deploy(b, list, side) {
  const rows = b.h - 2, cols = Math.ceil(list.length / rows);
  let col = side === 'H' ? cols - 1 : b.w - cols;
  for (let i = 0; i < list.length; i += rows) {
    const ch = list.slice(i, i + rows), y0 = 1 + Math.floor((rows - ch.length) / 2);
    ch.forEach((u, k) => place(b, u, col, y0 + k));
    col += side === 'H' ? -1 : 1;
  }
}
function heroUnit(S, h, id) {
  const c = CL[h.cls], gr = S.gear[h.cls];
  return { id, side: 'H', h, cls: h.cls, ci: h.ci, name: h.name, lvl: h.lvl, hp: h.hp, max: h.max, ac: heroAC(h, gr), thac0: heroThac0(h, gr), db: gr.arms + strDmg(h.str), mv: c.mv, range: c.range || 0, st: {}, sp: spellsFor(h), kill: h.cls === 'assassin' ? 1 : 0, col: c.col, g: c.g };
}
function foeUnit(mid, id, boss, bn, vet) {
  const m = MON[mid];
  let hp = m.hd < 1 ? ri(4) : 0; for (let i = 0; i < Math.floor(m.hd); i++) hp += ri(8); if (m.hd % 1 && m.hd > 1) hp += ri(4);
  if (boss) hp = Math.round(Math.max(hp, m.hd * 4.5) * TUNE.bossHp);
  vet = vet || 1; hp = Math.round(hp * vet); const vb = Math.floor((vet - 1) * 2);
  return { id, side: 'E', m, mid, name: boss ? bn : m.n, hd: m.hd, hp, max: hp, ac: m.ac - (boss ? 1 : 0), thac0: 20 - Math.floor(m.hd) - (boss ? 2 : 0) - vb, db: (boss ? 2 : 0) + vb, fly: (m.f || '').includes('fly'), mv: m.mv, range: m.range || 0, st: {}, boss: !!boss, cd: 0, g: m.g, f: m.f || '' };
}
const DIRS = ['E', 'W', 'N', 'S'];
function deployNS(b, list, top) { // ranks along the north or south wall, front rank nearest the centre
  const cols = b.w - 2, rows = Math.ceil(list.length / cols);
  let row = top ? rows - 1 : b.h - rows;
  for (let i = 0; i < list.length; i += cols) {
    const ch = list.slice(i, i + cols), x0 = 1 + Math.floor((cols - ch.length) / 2);
    ch.forEach((u, k) => place(b, u, x0 + k, row));
    row += top ? -1 : 1;
  }
}
// The door a group of foes comes through, as a point just outside the grid.
function doorAt(b, dir) { return dir === 'E' ? [b.w + 1, b.h / 2 - .5] : dir === 'W' ? [-2, b.h / 2 - .5] : dir === 'N' ? [b.w / 2 - .5, -2] : [b.w / 2 - .5, b.h + 1]; }
function startBattle(S, cis) {
  const bl = billing(S.day), b = { day: S.day, bl, units: [], round: 1, log: [], fx: [], over: null, xp: 0, gold: 0, dead: [], cis: cis.slice() };
  let id = 1;
  const hs = S.heroes.filter(h => !h.dead && cis.includes(h.ci)).map(h => heroUnit(S, h, id++));
  hs.sort((a, c) => CL[a.cls].front - CL[c.cls].front);
  const es = [];
  for (const f of bl.foes) for (let i = 0; i < f.count; i++) es.push(foeUnit(f.id, id++, false, null, bl.vet));
  es.sort((a, c) => (a.range ? 1 : 0) - (c.range ? 1 : 0));
  const sides = Math.min(bl.sides, Math.max(1, es.length)), n = hs.length;
  b.doors = DIRS.slice(0, sides); b.nid = 0;
  if (sides === 1) { // one gate: the legion forms line on the west sand
    if (bl.boss) es.splice(Math.floor(es.filter(e => !e.range).length / 2), 0, foeUnit(bl.boss, id++, true, bl.bn, bl.vet));
    b.h = clamp(Math.round(Math.sqrt(n + es.length) * 1.1) + 4, 9, 20);
    const rows = b.h - 2, hc = Math.ceil(n / rows);
    b.w = Math.max(14, hc + Math.ceil(es.length / rows) + 8, Math.round(b.h * 1.5));
    b.grid = new Array(b.w * b.h).fill(null);
    deploy(b, hs, 'H'); deploy(b, es, 'E');
    for (const e of es) e.door = 'E';
    b.zone = { x0: 0, y0: 0, x1: hc + 1, y1: b.h - 1 };
  } else { // besieged: the legion circles the wagons in the centre, tough callings outermost
    const groups = b.doors.map(() => []);
    es.forEach((e, i) => groups[i % sides].push(e));
    if (bl.boss) groups[0].unshift(foeUnit(bl.boss, id++, true, bl.bn, bl.vet));
    const g = groups[0].length, bh = Math.max(2, Math.round(Math.sqrt(n / 1.5))), bw = Math.ceil(n / bh);
    b.h = clamp(bh + 12, 13, 26);
    b.w = Math.max(18, bw + 12 + 2 * Math.ceil(g / (b.h - 2)));
    if (sides > 2) b.h = clamp(bh + 10 + 2 * Math.ceil(g / (b.w - 2)), 13, 28);
    b.grid = new Array(b.w * b.h).fill(null);
    const x0 = Math.floor((b.w - bw) / 2), y0 = Math.floor((b.h - bh) / 2), cells = [];
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) cells.push({ x: x0 + x, y: y0 + y, d: Math.min(x, bw - 1 - x, y, bh - 1 - y) });
    cells.sort((a, c) => a.d - c.d);
    hs.forEach((u, i) => place(b, u, cells[i].x, cells[i].y));
    groups.forEach((gr, i) => {
      const dir = b.doors[i]; for (const e of gr) e.door = dir;
      if (dir === 'E') deploy(b, gr, 'E'); else if (dir === 'W') deploy(b, gr, 'H'); else deployNS(b, gr, dir === 'N');
    });
    b.zone = { x0: x0 - 2, y0: y0 - 2, x1: x0 + bw + 1, y1: y0 + bh + 1 };
    es.length = 0; for (const gr of groups) es.push(...gr);
  }
  b.units = hs.concat(es); b.nid = id;
  say(b, 'Day ' + roman(S.day) + '. ' + (sides > 1 ? ['', '', 'Two', 'Three', 'All four'][sides] + ' gates open: ' : 'The gates open: ') + billingText(bl) + '.');
  return b;
}
// Before the first blow a hero may be placed anywhere in the deployment zone, swapping with whoever stands there.
const inZone = (b, x, y) => inb(b, x, y) && x >= b.zone.x0 && x <= b.zone.x1 && y >= b.zone.y0 && y <= b.zone.y1;
function redeploy(b, u, x, y) {
  if (!inZone(b, x, y)) return false;
  const o = at(b, x, y); if (o && (o.side !== 'H' || o === u)) return false;
  const ux = u.x, uy = u.y; b.grid[idx(b, ux, uy)] = null;
  if (o) place(b, o, ux, uy);
  place(b, u, x, y); return true;
}
function checkOver(b) {
  if (b.over) return b.over;
  if (!b.units.some(u => u.side === 'E' && u.hp > 0)) b.over = 'win';
  else if (!b.units.some(u => u.side === 'H' && u.hp > 0 && !u.illusion)) b.over = 'lose';
  return b.over;
}

// Zone of control: a square next to an active enemy. Entering one ends the move, and
// walking out of an enemy's reach gives that enemy a free blow. Fliers ignore both.
const helpless = u => u.st.sleep || u.st.stun;
function zocMask(b, u) {
  const Z = new Uint8Array(b.w * b.h);
  for (const e of b.units) {
    if (e.hp <= 0 || e.side === u.side || helpless(e)) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inb(b, e.x + dx, e.y + dy)) Z[idx(b, e.x + dx, e.y + dy)] = 1;
  }
  return Z;
}
function flood(b, u) {
  const n = b.w * b.h, d = new Int16Array(n).fill(-1), p = new Int32Array(n).fill(-1), q = [idx(b, u.x, u.y)];
  const Z = u.fly ? null : zocMask(b, u);
  d[q[0]] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i], cx = c % b.w, cy = (c - cx) / b.w;
    if (Z && i && Z[c]) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = cx + dx, y = cy + dy; if (!inb(b, x, y)) continue;
      const k = idx(b, x, y); if (d[k] >= 0) continue;
      const o = b.grid[k]; if (o && o.side !== u.side) continue;
      d[k] = d[c] + 1; p[k] = c; q.push(k);
    }
  }
  return { d, p, q };
}
function nearest(u, list) { let best = null, bd = 1e9; for (const t of list) { const k = dist(u, t); if (k < bd) { bd = k; best = t; } } return best; }
function approach(b, u, reach) {
  const fs = foesOf(b, u); if (!fs.length) return;
  const G = new Uint8Array(b.w * b.h);
  for (const f of fs) for (let y = Math.max(0, f.y - reach); y <= Math.min(b.h - 1, f.y + reach); y++) for (let x = Math.max(0, f.x - reach); x <= Math.min(b.w - 1, f.x + reach); x++) G[idx(b, x, y)] = 1;
  const s = idx(b, u.x, u.y); if (G[s]) return;
  const { d, p, q } = flood(b, u); let tg = -1;
  for (const c of q) if (G[c] && !b.grid[c]) { tg = c; break; }
  if (tg < 0) {
    let bs = dist(u, nearest(u, fs));
    for (const c of q) { if (d[c] > u.mv) break; if (b.grid[c]) continue; const cx = c % b.w, o = { x: cx, y: (c - cx) / b.w }, k = dist(o, nearest(o, fs)); if (k < bs) { bs = k; tg = c; } }
    if (tg < 0) return;
  }
  let c = tg; while (c !== s && (d[c] > u.mv || b.grid[c])) c = p[c];
  if (c !== s && c >= 0) moveTo(b, u, c % b.w, Math.floor(c / b.w));
}
function flee(b, u) {
  const fs = foesOf(b, u); if (!fs.length) return;
  const { d, q } = flood(b, u); let tg = -1, bs = dist(u, nearest(u, fs)) * 10 - u.x;
  for (const c of q) { if (d[c] > u.mv) break; if (b.grid[c]) continue; const cx = c % b.w, o = { x: cx, y: (c - cx) / b.w }, k = dist(o, nearest(o, fs)) * 10 - cx; if (k > bs) { bs = k; tg = c; } }
  if (tg >= 0) moveTo(b, u, tg % b.w, Math.floor(tg / b.w));
}

function kill(b, t, src) {
  t.hp = 0; b.grid[idx(b, t.x, t.y)] = null;
  if (t.illusion) return;
  if (t.side === 'H') { b.dead.push(t); say(b, '† ' + t.name + ' the ' + CL[t.cls].n + ' falls' + (src && src.name ? ' to ' + (src.boss ? src.name : 'a ' + src.name) : '') + '.'); }
  else { b.xp += Math.round(t.m.cost * TUNE.xp * (t.boss ? 3 : 1)); b.gold += Math.ceil(t.m.cost / 4) * (t.boss ? 4 : 1); if (src && src.h) src.h.kills++; if (t.boss) say(b, t.name + ' is slain by ' + (src ? src.name : 'the legion') + '!'); }
}
function hurt(b, t, dm, src, col) {
  dm = Math.max(1, Math.round(dm)); t.hp -= dm; delete t.st.sleep;
  fx(b, { k: 'txt', a: [t.x, t.y], s: '' + dm, c: col || (t.side === 'H' ? '#ff5a4a' : '#fff') });
  if (t.hp <= 0) kill(b, t, src);
}
function heal(b, t, n) { n = Math.min(n, t.max - t.hp); t.hp += n; fx(b, { k: 'txt', a: [t.x, t.y], s: '+' + n, c: '#7dff8a' }); return n; }
function strike(b, a, t, dmg, o) {
  o = o || {}; fx(b, { k: 'line', a: [a.x, a.y], b: [t.x, t.y], c: o.ranged ? '#f5e9c0' : a.side === 'H' ? '#ffffff' : '#ff8a70' });
  if (t.illusion) { if (ri(20) >= 12) { kill(b, t); fx(b, { k: 'txt', a: [t.x, t.y], s: 'poof', c: '#c77be0' }); } return false; }
  const roll = ri(20), need = a.thac0 - t.ac - (t.st.stun ? 4 : 0) - (o.bonus || 0);
  if (!(t.st.sleep || roll === 20 || (roll !== 1 && roll >= need))) return false;
  let dm = (dice(dmg) + (a.db || 0) + (o.plus || 0)) * (o.mult || 1); if (t.st.sleep) dm *= 2;
  hurt(b, t, dm, a); return true;
}
const flanked = (b, t, a) => b.units.some(x => x.hp > 0 && x.side === a.side && x !== a && dist(x, t) === 1);

function heroAttack(b, u, t, ranged) {
  const c = CL[u.cls], L = u.lvl; let n = 1, o = {};
  if (ranged) { o.ranged = true; if (u.cls === 'ranger' && L >= 5) n = 2; }
  else if (u.cls === 'fighter' && t.hd < 1) n = L;
  else if ((u.cls === 'fighter' || u.cls === 'paladin' || u.cls === 'ranger') && L >= 7) n = 2;
  else if (u.cls === 'monk' && L >= 3) n = 2;
  if (u.cls === 'ranger' && t.f && t.f.includes('g')) o.plus = L;
  if (u.cls === 'monk') o.plus = Math.floor(L / 2);
  if (!ranged && (u.cls === 'thief' || u.cls === 'assassin') && flanked(b, t, u)) o.mult = L < 5 ? 2 : L < 9 ? 3 : 4;
  for (let i = 0; i < n; i++) {
    if (t.hp <= 0) { // a fighter's sweep carries on to the next weak foe in reach
      t = foesOf(b, u).find(x => dist(u, x) === 1 && (u.cls !== 'fighter' || x.hd < 1 || i === 0)); if (!t) break;
    }
    const hit = strike(b, u, t, ranged ? c.rdmg : c.dmg, o);
    if (hit && u.cls === 'monk' && t.hp > 0 && !t.boss && t.hd <= L + 3 && ri(100) <= 20) { t.st.stun = 1; fx(b, { k: 'txt', a: [t.x, t.y], s: 'stun', c: '#e07b3a' }); }
  }
  u.acted = true;
}
function assassinate(b, u, t) {
  u.kill = 0; u.acted = true;
  const ch = clamp(40 + 5 * u.lvl - 6 * t.hd, 5, 90);
  fx(b, { k: 'line', a: [u.x, u.y], b: [t.x, t.y], c: '#222' });
  if (!t.boss && !t.illusion && ri(100) <= ch) { say(b, u.name + ' assassinates a ' + t.name + '.'); fx(b, { k: 'txt', a: [t.x, t.y], s: 'slain', c: '#fff' }); kill(b, t, u); return true; }
  return false;
}

const inRad = (b, x, y, r, side) => b.units.filter(u => u.hp > 0 && (!side || u.side === side) && Math.abs(u.x - x) <= r && Math.abs(u.y - y) <= r);
const sleepOK = t => t.hd <= 4 && !t.boss && !t.f.includes('u') && !t.st.sleep;
const dazeOK = (t, L) => t.hd <= L + 2 && !t.boss && !t.f.includes('u') && !t.st.stun && !t.st.sleep;
function burst(b, x, y, r, c) { fx(b, { k: 'burst', a: [x, y], r, c }); }

// Returns true if the spell was cast. Validates range and target.
function cast(b, u, id, x, y) {
  const sp = SPELLS[id], L = u.lvl; if (!sp || !(u.sp[id] > 0) || u.acted) return false;
  if (sp.tg !== 'self' && (!inb(b, x, y) || Math.max(Math.abs(u.x - x), Math.abs(u.y - y)) > sp.range)) return false;
  const t = sp.tg === 'self' ? null : at(b, x, y);
  if (sp.tg === 'foe' && !(t && t.side === 'E')) return false;
  if (sp.tg === 'ally' && !(t && t.side === 'H' && !t.illusion && t.hp < t.max)) return false;
  if (sp.tg === 'empty' && t) return false;
  u.sp[id]--; u.acted = true;
  switch (id) {
    case 'sleep': {
      let pool = dice([2, 4, 0]) + L, n = 0; burst(b, x, y, 1, '#8fb0ff');
      for (const f of inRad(b, x, y, 1, 'E').filter(sleepOK).sort((a, c) => a.hd - c.hd)) { const k = Math.max(.5, f.hd); if (pool < k) break; pool -= k; f.st.sleep = ri(4) + 2; n++; }
      say(b, u.name + ' casts Sleep: ' + n + ' foe' + (n === 1 ? '' : 's') + ' slumber.'); break;
    }
    case 'missile': { const n = 1 + Math.floor((L - 1) / 2); fx(b, { k: 'line', a: [u.x, u.y], b: [x, y], c: '#9fd0ff' }); hurt(b, t, dice([n, 4, n]), u, '#9fd0ff'); break; }
    case 'fireball': {
      burst(b, x, y, 2, '#ff9a3a'); let n = 0;
      for (const f of inRad(b, x, y, 2)) { let dm = dice([L, 6, 0]); if (ri(20) + (f.side === 'E' ? f.hd : f.lvl + 2) >= 16) dm /= 2; hurt(b, f, dm, u, '#ffb060'); n++; }
      say(b, u.name + ' hurls a Fireball: ' + n + ' caught in the blast.'); break;
    }
    case 'colours': { burst(b, x, y, 1, '#e59bff'); let n = 0; for (const f of inRad(b, x, y, 1, 'E')) if (dazeOK(f, L)) { f.st.stun = ri(3) + 1; n++; } say(b, u.name + ' looses Blinding Colours: ' + n + ' stunned.'); break; }
    case 'phantom': { const ph = { id: b.nid++, side: 'H', illusion: true, name: 'Phantom', hp: 1, max: 1, ac: 4, st: {}, fade: 4, acted: true, col: '#c77be0', g: '', ci: u.ci, lvl: 0, sp: {} }; b.units.push(ph); place(b, ph, x, y); burst(b, x, y, 0, '#e59bff'); break; }
    case 'cure': fx(b, { k: 'line', a: [u.x, u.y], b: [x, y], c: '#7dff8a' }); heal(b, t, dice([1, 8, L])); break;
    case 'loh': heal(b, t, 3 + 2 * L); break;
    case 'turn': {
      burst(b, u.x, u.y, 4, '#fffbe0'); let n = 0, dn = 0;
      for (const f of inRad(b, u.x, u.y, 4, 'E')) if (f.f.includes('u')) { const r = ri(20) + 2 * L - 2 * f.hd; if (f.boss ? r >= 22 : r >= 18) { if (f.boss) f.st.stun = 2; else { kill(b, f, u); dn++; } } else if (!f.boss && r >= 10) { f.st.stun = 3; n++; } }
      say(b, u.name + ' presents the holy symbol: ' + dn + ' destroyed, ' + n + ' turned.'); break;
    }
    case 'entangle': { burst(b, x, y, 1, '#5fbf6a'); for (const f of inRad(b, x, y, 1, 'E')) f.st.root = f.boss ? 1 : ri(3) + 2; say(b, u.name + ' casts Entangle.'); break; }
    case 'lightning': { burst(b, x, y, 1, '#e8f6ff'); for (const f of inRad(b, x, y, 1, 'E')) { let dm = dice([3, 8, L]); if (ri(20) + f.hd >= 16) dm /= 2; hurt(b, f, dm, u, '#cfeaff'); } say(b, u.name + ' calls down lightning.'); break; }
  }
  return true;
}
function drink(b, u, S) { if (!(S.potions > 0) || u.acted || u.hp >= u.max) return false; S.potions--; u.acted = true; heal(b, u, dice([2, 4, 2])); return true; }

// Best cell to centre an area spell on: score = eligible foes caught, never any ally if the spell burns friends.
function bestCell(b, u, id, ok) {
  const sp = SPELLS[id]; let best = null, bs = 0;
  for (const f of b.units) {
    if (f.hp <= 0 || f.side !== 'E' || dist(u, f) > sp.range) continue;
    const us = inRad(b, f.x, f.y, sp.rad); if (sp.ff && us.some(x => x.side === 'H' && !x.illusion)) continue;
    let s = 0; for (const x of us) if (x.side === 'E' && ok(x)) s += x.boss ? 3 : 1;
    if (s > bs) { bs = s; best = f; }
  }
  return best && { x: best.x, y: best.y, s: bs };
}
function autoCast(b, u, fs) {
  const sp = u.sp, L = u.lvl; let c;
  const hurtAlly = (r, frac) => alliesOf(b, u).filter(a => dist(u, a) <= r && a.hp <= a.max * frac).sort((a, c2) => a.hp / a.max - c2.hp / c2.max)[0];
  switch (u.cls) {
    case 'mage':
      if (sp.fireball > 0 && (c = bestCell(b, u, 'fireball', () => true)) && c.s >= 3) return cast(b, u, 'fireball', c.x, c.y);
      if (sp.sleep > 0 && (c = bestCell(b, u, 'sleep', sleepOK)) && (c.s >= 2 || fs.length <= 3)) return cast(b, u, 'sleep', c.x, c.y);
      if (sp.missile > 0) { const t = fs.filter(f => dist(u, f) <= 10 && !f.st.sleep && !f.illusion).sort((a, c2) => a.hp - c2.hp)[0]; if (t) return cast(b, u, 'missile', t.x, t.y); }
      break;
    case 'illusionist':
      if (sp.colours > 0 && (c = bestCell(b, u, 'colours', f => dazeOK(f, L))) && c.s >= 2) return cast(b, u, 'colours', c.x, c.y);
      if (sp.phantom > 0 && !b.units.some(x => x.illusion && x.hp > 0 && x.own === u.id)) {
        const nf = nearest(u, fs);
        if (dist(u, nf) <= 9) {
          let bc = null, bd = 1e9;
          for (let y = u.y - 6; y <= u.y + 6; y++) for (let x = u.x - 6; x <= u.x + 6; x++) if (inb(b, x, y) && !at(b, x, y)) { const k = Math.max(Math.abs(nf.x - x), Math.abs(nf.y - y)); if (k < bd) { bd = k; bc = [x, y]; } }
          if (bc && cast(b, u, 'phantom', bc[0], bc[1])) { b.units[b.units.length - 1].own = u.id; return true; }
        }
      }
      break;
    case 'cleric':
      if (sp.turn > 0 && fs.some(f => f.f && f.f.includes('u') && !f.st.stun && dist(u, f) <= 4)) return cast(b, u, 'turn');
      if (sp.cure > 0 && (c = hurtAlly(6, .5))) return cast(b, u, 'cure', c.x, c.y);
      break;
    case 'druid':
      if (sp.lightning > 0 && (c = bestCell(b, u, 'lightning', () => true)) && c.s >= 2) return cast(b, u, 'lightning', c.x, c.y);
      if (sp.entangle > 0 && (c = bestCell(b, u, 'entangle', f => !f.st.root && !f.st.sleep)) && c.s >= 3) return cast(b, u, 'entangle', c.x, c.y);
      if (sp.cure > 0 && (c = hurtAlly(6, .5))) return cast(b, u, 'cure', c.x, c.y);
      break;
    case 'paladin':
      if (sp.loh > 0 && (c = hurtAlly(1, .4))) return cast(b, u, 'loh', c.x, c.y);
      break;
  }
  return false;
}
const castReach = u => { const s = u.sp; return s.fireball > 0 || s.missile > 0 ? 10 : s.sleep > 0 || s.entangle > 0 || s.lightning > 0 ? 8 : s.colours > 0 ? 4 : 0; };
function skipTurn(b, u) {
  if (u.st.sleep) { if (!--u.st.sleep) delete u.st.sleep; return true; }
  if (u.st.stun) { if (!--u.st.stun) delete u.st.stun; return true; }
  return false;
}

// One hero acts on the cohort's standing order. Respects a move the player already made by hand.
function heroAct(b, u, S) {
  if (u.hp <= 0 || u.acted || u.illusion) return;
  if (skipTurn(b, u)) { u.acted = true; return; }
  const co = S.cohorts[u.ci], rooted = u.st.root; if (rooted && !--u.st.root) delete u.st.root;
  let fs = foesOf(b, u); if (!fs.length) return;
  if (u.hp <= u.max * .35 && drink(b, u, S)) return;
  const canMove = () => !u.moved && !rooted;
  if (co.spells) {
    const cr = castReach(u);
    if (cr && co.order === 'attack' && canMove() && dist(u, nearest(u, fs)) > cr) approach(b, u, cr);
    if (u.hp <= 0) return;
    if (autoCast(b, u, fs)) return;
  }
  const reach = u.range || 1;
  if (co.order === 'withdraw') { if (canMove()) flee(b, u); }
  else if (co.order === 'attack' && canMove() && dist(u, nearest(u, fs)) > reach) approach(b, u, reach);
  if (u.hp <= 0) return;
  fs = foesOf(b, u);
  const adj = fs.filter(f => dist(u, f) === 1);
  if (adj.length) {
    const pick = adj.sort((a, c) => (a.illusion ? 1 : 0) - (c.illusion ? 1 : 0) || a.hp - c.hp)[0];
    if (u.kill && !pick.boss) { const big = adj.filter(f => !f.boss && f.hd >= 2).sort((a, c) => c.hp - a.hp)[0]; if (big && big.hp > 8) { if (!assassinate(b, u, big)) heroAttack(b, u, big, false); return; } }
    heroAttack(b, u, pick, false);
  } else if (u.range) {
    const t = fs.filter(f => dist(u, f) <= u.range).sort((a, c) => (a.st.sleep ? 1 : 0) - (c.st.sleep ? 1 : 0) || a.hp - c.hp)[0];
    if (t) heroAttack(b, u, t, true);
  }
  u.acted = true;
}
function foeAct(b, e) {
  if (e.hp <= 0) return;
  if (skipTurn(b, e)) return;
  const rooted = e.st.root; if (rooted && !--e.st.root) delete e.st.root;
  let hs = foesOf(b, e); if (!hs.length) return;
  const m = e.m;
  if (m.breath && e.cd <= 0) {
    let best = null, bs = 1;
    for (const h of hs) { if (dist(e, h) > 6) continue; const n = inRad(b, h.x, h.y, 1, 'H').length; if (n > bs) { bs = n; best = h; } }
    if (best) {
      e.cd = 3; burst(b, best.x, best.y, 1, '#ff7a2a'); say(b, e.name + ' breathes fire!');
      for (const h of inRad(b, best.x, best.y, 1, 'H')) { if (h.illusion) { kill(b, h); continue; } let dm = dice(m.breath); if (ri(20) + h.lvl >= 14) dm /= 2; hurt(b, h, dm, e, '#ff9a3a'); }
      return;
    }
  }
  const reach = e.range || 1;
  if (m.gaze && e.cd <= 0) { // the Editor's eye holds a knot of heroes where they stand; it costs him nothing
    let best = null, bs = 1;
    for (const h of hs) { if (dist(e, h) > 8 || h.illusion) continue; const k = inRad(b, h.x, h.y, 1, 'H').filter(x => !x.st.stun).length; if (k > bs) { bs = k; best = h; } }
    if (best) { e.cd = 2; burst(b, best.x, best.y, 1, '#f0c56a'); say(b, e.name + ' turns his eye on the legion.'); for (const h of inRad(b, best.x, best.y, 1, 'H')) if (!h.illusion && ri(20) + h.lvl < 16) { h.st.stun = 2; fx(b, { k: 'txt', a: [h.x, h.y], s: 'held', c: '#f0c56a' }); } }
  }
  if (m.summon && b.round % 3 === 0 && e.sum !== b.round) { // more of his guard come through the gates
    e.sum = b.round; let k = 0;
    for (const dir of b.doors) for (let j = 0; j < 12 && k < m.summon[1]; j++) {
      const o = Math.ceil(j / 2) * (j % 2 ? 1 : -1), x = dir === 'E' ? b.w - 1 : dir === 'W' ? 0 : Math.floor(b.w / 2) + o, y = dir === 'N' ? 0 : dir === 'S' ? b.h - 1 : Math.floor(b.h / 2) + o;
      if (!inb(b, x, y) || at(b, x, y)) continue;
      const nu = foeUnit(m.summon[0], b.nid++, false, null, b.bl.vet); nu.door = dir; b.units.push(nu); place(b, nu, x, y); burst(b, x, y, 0, '#ff7828'); k++;
      if (k % Math.ceil(m.summon[1] / b.doors.length) === 0) break;
    }
    if (k) say(b, e.name + ' calls ' + k + ' more of the Ashen Legion through the gates.');
  }
  if (!rooted && dist(e, nearest(e, hs)) > reach) approach(b, e, reach);
  if (e.hp <= 0) return;
  for (let i = 0; i < (m.att || 1); i++) {
    hs = foesOf(b, e);
    const adj = hs.filter(h => dist(e, h) === 1); let t = adj.find(h => h.illusion) || adj[ri(adj.length) - 1], ranged = false;
    if (!t && e.range) { t = nearest(e, hs.filter(h => dist(e, h) <= e.range)); ranged = true; }
    if (!t) break;
    if (strike(b, e, t, m.dmg, { ranged }) && t.hp > 0 && !t.illusion) {
      if (e.f.includes('par') && ri(20) + t.lvl < 13) { t.st.stun = ri(2) + 1; fx(b, { k: 'txt', a: [t.x, t.y], s: 'held', c: '#b9f' }); }
      if (e.f.includes('poi') && ri(20) + t.lvl < 12) hurt(b, t, ri(6), e, '#9be36a');
    }
  }
}
function endRound(b) {
  b.round++;
  for (const u of b.units) {
    if (u.hp <= 0) continue;
    u.acted = false; u.moved = false; u.opp = false;
    if (u.illusion) { u.acted = true; if (--u.fade <= 0) kill(b, u); continue; }
    if (u.side === 'E') { if (u.cd > 0) u.cd--; if (u.f.includes('reg') && u.hp < u.max) u.hp = Math.min(u.max, u.hp + 3); }
  }
  if (b.round > 80 && !b.over) { b.over = 'draw'; say(b, 'The heralds call the day a draw.'); }
}
function autoRound(b, S) {
  for (const u of b.units.slice()) { if (u.side === 'H') heroAct(b, u, S); if (checkOver(b)) return; }
  for (const u of b.units.slice()) { if (u.side === 'E') foeAct(b, u); if (checkOver(b)) return; }
  endRound(b);
}

// Settle the day: the dead stay dead, survivors share experience, healers tend the wounded, everyone rests.
function finishBattle(S, b, yielded) {
  const res = { final: b.over === 'win' && b.bl.final, win: b.over === 'win', yielded: !!yielded, draw: b.over === 'draw', dead: b.dead.map(u => u.name + ' the ' + CL[u.cls].n), xp: 0, gold: 0, tended: 0, ready: 0, day: b.day };
  const surv = [];
  for (const u of b.units) { if (u.side !== 'H' || u.illusion) continue; if (u.hp <= 0) { u.h.dead = true; u.h.hp = 0; u.h.diedDay = b.day; S.fallen++; } else { u.h.hp = u.hp; surv.push(u); } }
  if (res.win) {
    res.gold = b.gold + b.bl.purse; S.gold += res.gold;
    res.xp = surv.length ? Math.floor(b.xp / surv.length) : 0; for (const u of surv) u.h.xp += res.xp;
    S.day++; S.best = Math.max(S.best, S.day - 1); if (res.final) S.ending = 'free';
  } else if (yielded) { res.fine = Math.floor(S.gold / 2); S.gold -= res.fine; }
  const alive = living(S);
  for (const u of surv) { // unspent healing goes to the worst wounded
    let n = (u.sp.cure || 0) + (u.sp.loh || 0);
    while (n-- > 0) { const t = alive.filter(h => h.hp < h.max).sort((a, c) => a.hp / a.max - c.hp / c.max)[0]; if (!t) break; const k = Math.min(t.max - t.hp, dice([1, 8, u.lvl])); t.hp += k; res.tended += k; }
  }
  for (const h of alive) h.hp = Math.min(h.max, h.hp + Math.max(2, Math.ceil(h.max * (b.cis.includes(h.ci) ? .25 : .5))));
  res.ready = alive.filter(canTrain).length;
  S.pick = S.pick.filter(ci => living(S, ci).length);
  return res;
}

if (typeof module !== 'undefined') module.exports = { CL, ORDER, MON, SCHED, SPELLS, TUNE, TIER, TIERCOST, FINAL, migrate, redeploy, inZone, veteran, newCampaign, startBattle, autoRound, finishBattle, billing, billingText, budget, gateCap, living, canTrain, trainCost, levelUp, checkOver, xpNeed, roman };
