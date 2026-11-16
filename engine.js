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
  loh:       { n: 'Lay on Hands',      range: 1,  tg: 'ally' },
  web:       { n: 'Web',               range: 8,  rad: 1, tg: 'cell' },
  bless:     { n: 'Bless',             tg: 'self' },
  hold:      { n: 'Hold Person',       range: 6,  tg: 'foe' }
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
//    fly = ignores zones of control, rsh = charges (a run of three squares doubles the first blow),
//    clt = clutches (a hit can hold a hero in place), cry = calls for help (rouses the room; when hurt, brings one more).
//    Flags are matched by substring, so a new one must not contain a g or a u.
const MON = {
  kobold:    { n: 'Kobold',          pl: 'Kobolds',          hd: .5, ac: 7, dmg: [1, 4, 0], mv: 4, cost: 5,   g: 'k', f: 'g' },
  rat:       { n: 'Giant Rat',       pl: 'Giant Rats',       hd: .5, ac: 7, dmg: [1, 3, 0], mv: 6, cost: 4,   g: 'r' },
  goblin:    { n: 'Goblin',          pl: 'Goblins',          hd: 1,  ac: 6, dmg: [1, 6, 0], mv: 4, cost: 9,   g: 'g', f: 'g' },
  gobarcher: { n: 'Goblin Archer',   pl: 'Goblin Archers',   hd: 1,  ac: 7, dmg: [1, 6, 0], mv: 4, cost: 11,  g: 'a', f: 'g', range: 7 },
  skeleton:  { n: 'Skeleton',        pl: 'Skeletons',        hd: 1,  ac: 7, dmg: [1, 6, 0], mv: 4, cost: 11,  g: 's', f: 'u' },
  orc:       { n: 'Orc',             pl: 'Orcs',             hd: 1,  ac: 6, dmg: [1, 8, 0], mv: 4, cost: 12,  g: 'o', f: 'g' },
  wolf:      { n: 'Dire Wolf',       pl: 'Dire Wolves',      hd: 2,  ac: 7, dmg: [1, 4, 1], mv: 7, cost: 20,  g: 'w', f: 'rsh cry' },
  zombie:    { n: 'Zombie',          pl: 'Zombies',          hd: 2,  ac: 8, dmg: [1, 8, 0], mv: 3, cost: 20,  g: 'z', f: 'u clt' },
  hobgoblin: { n: 'Hobgoblin',       pl: 'Hobgoblins',       hd: 1.5, ac: 5, dmg: [1, 8, 0], mv: 4, cost: 18, g: 'h', f: 'g' },
  ghoul:     { n: 'Ghoul',           pl: 'Ghouls',           hd: 2,  ac: 6, dmg: [1, 4, 0], att: 2, mv: 5, cost: 40, g: 'G', f: 'u par' },
  spider:    { n: 'Giant Spider',    pl: 'Giant Spiders',    hd: 3,  ac: 5, dmg: [1, 8, 0], mv: 6, cost: 55,  g: 'S', f: 'poi' },
  legionary: { n: 'Ashen Legionary', pl: 'Ashen Legionaries', hd: 3, ac: 3, dmg: [1, 8, 1], mv: 4, cost: 60,  g: 'L' },
  ogre:      { n: 'Ogre',            pl: 'Ogres',            hd: 4,  ac: 5, dmg: [1, 10, 0], mv: 4, cost: 75, g: 'O', f: 'g' },
  wight:     { n: 'Barrow Wight',    pl: 'Barrow Wights',    hd: 4,  ac: 5, dmg: [1, 6, 0], mv: 4, cost: 90,  g: 'W', f: 'u par' },
  wraith:    { n: 'Wraith',          pl: 'Wraiths',          hd: 5,  ac: 4, dmg: [1, 6, 1], mv: 6, cost: 140, g: 'X', f: 'u par' },
  minotaur:  { n: 'Minotaur',        pl: 'Minotaurs',        hd: 6,  ac: 6, dmg: [1, 8, 2], att: 2, mv: 5, cost: 150, g: 'B', f: 'rsh' },
  troll:     { n: 'Troll',           pl: 'Trolls',           hd: 6,  ac: 4, dmg: [1, 6, 2], att: 3, mv: 5, cost: 220, g: 'T', f: 'g reg' },
  giant:     { n: 'Hill Giant',      pl: 'Hill Giants',      hd: 8,  ac: 4, dmg: [2, 8, 0], mv: 5, cost: 280, g: 'H', f: 'g' },
  wyvern:    { n: 'Wyvern',          pl: 'Wyverns',          hd: 7,  ac: 3, dmg: [2, 8, 0], mv: 7, cost: 300, g: 'V', f: 'poi fly' },
  chimera:   { n: 'Chimera',         pl: 'Chimeras',         hd: 9,  ac: 4, dmg: [1, 8, 1], att: 3, mv: 6, cost: 450, g: 'Q', breath: [3, 8, 0] },
  firegiant: { n: 'Fire Giant',      pl: 'Fire Giants',      hd: 11, ac: 3, dmg: [2, 8, 4], att: 2, mv: 5, cost: 600, g: 'J', f: 'g' },
  warfiend:  { n: 'Warfiend',        pl: 'Warfiends',        hd: 9,  ac: 0, dmg: [2, 6, 2], att: 2, mv: 6, cost: 650, g: 'Y' },
  dragon:    { n: 'Arena Wyrm',      pl: 'Arena Wyrms',      hd: 10, ac: 1, dmg: [1, 10, 2], att: 3, mv: 7, cost: 900, g: 'Z', f: 'fly', breath: [8, 6, 0] },
  // side-quest foes. caster = ranged magic bolt (uses range and dmg)
  thug:      { n: 'Thug',            pl: 'Thugs',            hd: 1,  ac: 7, dmg: [1, 6, 0], mv: 4, cost: 10,  g: 't' },
  cutpurse:  { n: 'Cutpurse',        pl: 'Cutpurses',        hd: 1,  ac: 6, dmg: [1, 4, 1], mv: 7, cost: 11,  g: 'c', f: 'cry' },
  slinger:   { n: 'Rooftop Archer',  pl: 'Rooftop Archers',  hd: 1,  ac: 7, dmg: [1, 6, 0], mv: 4, cost: 12,  g: 'a', range: 6 },
  hound:     { n: 'Gutter Hound',    pl: 'Gutter Hounds',    hd: 1.5, ac: 7, dmg: [1, 6, 0], mv: 7, cost: 16, g: 'd', f: 'rsh cry' },
  bruiser:   { n: 'Bruiser',         pl: 'Bruisers',         hd: 3,  ac: 6, dmg: [1, 8, 1], mv: 4, cost: 45,  g: 'b', f: 'clt' },
  wererat:   { n: 'Wererat',         pl: 'Wererats',         hd: 3,  ac: 6, dmg: [1, 8, 0], mv: 6, cost: 70,  g: 'R', f: 'reg' },
  gangboss:  { n: 'Gang Boss',       pl: 'Gang Bosses',      hd: 5,  ac: 4, dmg: [1, 8, 2], att: 2, mv: 5, cost: 150, g: 'M', summon: ['thug', 2] },
  cultist:   { n: 'Cultist',         pl: 'Cultists',         hd: 1,  ac: 8, dmg: [1, 4, 0], mv: 4, cost: 9,   g: 'c', f: 'cry' },
  cultpriest: { n: 'Cult Priest',    pl: 'Cult Priests',     hd: 3,  ac: 7, dmg: [1, 6, 1], mv: 4, cost: 50,  g: 'p', range: 6 },
  slime:     { n: 'Grey Ooze',       pl: 'Grey Oozes',       hd: 3,  ac: 8, dmg: [2, 4, 0], mv: 2, cost: 40,  g: 'o', f: 'u clt' },
  gargoyle:  { n: 'Gargoyle',        pl: 'Gargoyles',        hd: 4,  ac: 5, dmg: [1, 6, 0], att: 2, mv: 6, cost: 95, g: 'G', f: 'fly' },
  necromancer: { n: 'Necromancer',   pl: 'Necromancers',     hd: 5,  ac: 6, dmg: [1, 8, 0], mv: 4, cost: 170, g: 'N', range: 7, summon: ['skeleton', 2] },
  apprentice: { n: 'Apprentice',     pl: 'Apprentices',      hd: 2,  ac: 8, dmg: [1, 6, 0], mv: 4, cost: 28,  g: 'a', range: 6, f: 'cry' },
  imp:       { n: 'Imp',             pl: 'Imps',             hd: 2,  ac: 4, dmg: [1, 4, 0], mv: 7, cost: 38,  g: 'i', f: 'poi fly' },
  armour:    { n: 'Animated Armour', pl: 'Animated Armours', hd: 3,  ac: 2, dmg: [1, 8, 0], mv: 4, cost: 60,  g: 'A', f: 'u' },
  golem:     { n: 'Clay Guardian',   pl: 'Clay Guardians',   hd: 7,  ac: 5, dmg: [2, 8, 0], mv: 3, cost: 200, g: 'C', f: 'u clt' },
  sorcerer:  { n: 'Sorcerer',        pl: 'Sorcerers',        hd: 6,  ac: 5, dmg: [1, 8, 2], mv: 4, cost: 220, g: 'S', range: 8, summon: ['imp', 2] },
  // the sewer, the market and the ship
  leech:     { n: 'Giant Leech',     pl: 'Giant Leeches',    hd: 2,  ac: 8, dmg: [1, 6, 0], mv: 3, cost: 24,  g: 'l', f: 'clt' },
  drowned:   { n: 'Drowned One',     pl: 'Drowned Ones',     hd: 3,  ac: 6, dmg: [1, 8, 0], mv: 4, cost: 50,  g: 'D', f: 'u' },
  croc:      { n: 'Sewer Crocodile', pl: 'Sewer Crocodiles', hd: 4,  ac: 5, dmg: [2, 6, 0], mv: 4, cost: 85,  g: 'K', f: 'rsh' },
  piper:     { n: 'Piper',           pl: 'Pipers',           hd: 5,  ac: 5, dmg: [1, 6, 2], mv: 5, cost: 160, g: 'P', summon: ['rat', 4] },
  sellsword: { n: 'Sellsword',       pl: 'Sellswords',       hd: 2,  ac: 5, dmg: [1, 8, 0], mv: 4, cost: 26,  g: 's' },
  mountebank: { n: 'Mountebank',     pl: 'Mountebanks',      hd: 2,  ac: 8, dmg: [1, 6, 1], mv: 4, cost: 32,  g: 'm', range: 5 },
  duellist:  { n: 'Duellist',        pl: 'Duellists',        hd: 4,  ac: 3, dmg: [1, 8, 1], att: 2, mv: 6, cost: 100, g: 'd' },
  fence:     { n: 'Fence',           pl: 'Fences',           hd: 5,  ac: 4, dmg: [1, 6, 2], att: 2, mv: 6, cost: 160, g: 'F', summon: ['sellsword', 2] },
  deckhand:  { n: 'Deckhand',        pl: 'Deckhands',        hd: 1,  ac: 8, dmg: [1, 6, 0], mv: 5, cost: 9,   g: 'h', f: 'cry' },
  corsair:   { n: 'Corsair',         pl: 'Corsairs',         hd: 2,  ac: 6, dmg: [1, 8, 0], mv: 5, cost: 24,  g: 'c' },
  harpooner: { n: 'Harpooner',       pl: 'Harpooners',       hd: 2,  ac: 7, dmg: [1, 8, 0], mv: 4, cost: 30,  g: 'j', range: 5 },
  bosun:     { n: 'Bosun',           pl: 'Bosuns',           hd: 4,  ac: 5, dmg: [1, 8, 2], mv: 4, cost: 80,  g: 'B', f: 'clt' },
  captain:   { n: 'Corsair Captain', pl: 'Corsair Captains', hd: 6,  ac: 3, dmg: [1, 8, 2], att: 2, mv: 5, cost: 210, g: 'C', summon: ['corsair', 2] },
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

const TUNE = { budA: 30, budP: 1.6, vetDay: 14, vet: .18, xp: 4, purseA: 30, purseB: 20, bossHp: 2.5, six: .7, bossHp6: 1 };
function budget(d) { return Math.round(TUNE.budA * Math.pow(d, TUNE.budP)); }
// Past the middle days the foes stop multiplying and start getting tougher instead.
function veteran(d) { return 1 + Math.max(0, d - TUNE.vetDay) * TUNE.vet; }
function gateCap(d) { return Math.min(10, 1 + Math.floor(d / 2)); }
const FINAL = 31;
function billing(d, six) {
  const s = SCHED[d <= FINAL ? d - 1 : 20 + (d - FINAL - 1) % 10];
  let B = budget(d); const foes = [];
  if (six) B = B * 6 / (10 * gateCap(d)) * TUNE.six; // the same odds per head as the legion faces
  if (s.boss) B = Math.max(B * .4, B - MON[s.boss].cost * 3);
  for (const [id, w] of s.m) foes.push({ id, count: Math.max(1, Math.round(B * w / MON[id].cost)) });
  return { title: s.t, foes, boss: s.boss, bn: s.bn, purse: Math.round((TUNE.purseA + TUNE.purseB * d) * (six ? .6 : 1)), sides: six ? Math.min(2, s.s || 1) : s.s || 1, six: !!six, final: !!s.final && d === FINAL, vet: six ? 1 + (veteran(d) - 1) * .4 : veteran(d) };
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
const trainCost = h => (h.eq ? 40 : 10) * (h.lvl + 1);
const canTrain = h => !h.dead && h.xp >= xpNeed(h.lvl);
function levelUp(h) {
  const c = CL[h.cls]; h.lvl++;
  const g = Math.max(Math.ceil(c.hd / 2), ri(c.hd)) + conHP(h.con);
  h.max += g; h.hp += g;
  if (h.mem) fillMem(h);
}
const TIER = ['Arena issue', 'Fine', 'Masterwork', 'Enchanted'], TIERCOST = [0, 60, 200, 600];

/* ---------- battle ---------- */
const idx = (b, x, y) => y * b.w + x;
const inb = (b, x, y) => x >= 0 && y >= 0 && x < b.w && y < b.h;
const at = (b, x, y) => inb(b, x, y) ? b.grid[idx(b, x, y)] : null;
const dist = (a, c) => Math.max(Math.abs(a.x - c.x), Math.abs(a.y - c.y));
const foesOf = (b, u) => b.units.filter(x => x.hp > 0 && x.side !== u.side);
const alliesOf = (b, u) => b.units.filter(x => x.hp > 0 && x.side === u.side && !x.illusion);
// Effects for the board to draw. An event with a lag (an arrow in flight, a spell being cast) holds back
// the numbers and deaths that follow it, so they appear when the blow lands.
function fx(b, o) { if (b.nofx) return; const now = Date.now(); if (o.lag != null) { b.lag = o.lag; o.t = now; } else o.t = now + (b.lag || 0); b.fx.push(o); if (b.fx.length > 300) b.fx.splice(0, 150); }
const BOLTERS = { cultpriest: 1, necromancer: 1, apprentice: 1, sorcerer: 1, mountebank: 1 };
function say(b, s) { b.log.push(s); if (b.log.length > 200) b.log.shift(); }
function place(b, u, x, y) { u.x = x; u.y = y; b.grid[idx(b, x, y)] = u; }
function moveTo(b, u, x, y) {
  let trap = null; const run = dist(u, { x, y });
  if (b.traps && u.side === 'H' && !u.illusion && !u.fly) { // walk the path: the first trap on it that the hero does not step over stops them there
    const p = flood(b, u).p, s = idx(b, u.x, u.y), path = []; for (let c = idx(b, x, y); c !== s && c >= 0; c = p[c]) path.unshift(c);
    for (const c of path) { const cx = c % b.w, cy = (c - cx) / b.w; spot(b, u, cx, cy); const t = trapAt(b, cx, cy); if (t && !(t.found && nimble(u)) && !b.grid[c]) { trap = t; x = cx; y = cy; break; } }
  }
  if (!u.fly && u.cls !== 'thief' && u.cls !== 'assassin') for (const e of b.units) { // free blows from foes left behind
    if (e.hp <= 0 || e.side === u.side || e.illusion || e.opp || helpless(e) || dist(e, u) !== 1 || Math.max(Math.abs(e.x - x), Math.abs(e.y - y)) <= 1) continue;
    e.opp = true; strike(b, e, u, e.side === 'H' ? e.wd || CL[e.cls].dmg : e.m.dmg, { bonus: 2 });
    if (u.hp <= 0) return false;
  }
  b.grid[idx(b, u.x, u.y)] = null; fx(b, { k: 'move', a: [u.x, u.y], b: [x, y], lag: 0 }); place(b, u, x, y); u.moved = true;
  for (const e of b.units) { // anyone standing guard strikes the first enemy to close with them
    if (!e.guard || e.hp <= 0 || e.side === u.side || helpless(e) || dist(e, u) !== 1) continue;
    e.guard = false; if (b.six) say(b, e.name + ' was on guard, and strikes as ' + who(u) + ' closes in.');
    strike(b, e, u, e.side === 'H' ? e.wd || CL[e.cls].dmg : e.m.dmg, { bonus: 2, mult: run >= 3 && u.f && u.f.includes('rsh') ? 2 : 1 }); if (u.hp <= 0) return false; // set against a charge
  }
  if (trap) { spring(b, u, trap); if (u.hp <= 0) return false; }
  return true;
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
  if (h.eq) { // The Six: everything comes from what the hero carries
    const k = kit(h), w = k.w, fist = h.cls === 'monk' ? [1, 6, 0] : [1, 2, 0];
    return { id, side: 'H', h, cls: h.cls, ci: 0, name: h.name, lvl: h.lvl, hp: h.hp, max: h.max, ac: sixAC(h, k), thac0: sixThac0(h, k), db: k.dmg + strDmg(h.str), mv: c.mv + k.mv, wd: w ? w.dice : fist, rd: w && w.rdice, range: (w && w.range) || 0, fire: w && w.fire, bane: w && w.bane, regen: k.regen, fly: k.fly, st: {}, sp: Object.assign({}, h.left || Object.assign({}, h.mem, abilities(h))), kill: h.cls === 'assassin' ? 1 : 0, col: c.col, g: c.g, key: figKey(h) };
  }
  return { id, side: 'H', h, cls: h.cls, ci: h.ci, name: h.name, lvl: h.lvl, hp: h.hp, max: h.max, ac: heroAC(h, gr), thac0: heroThac0(h, gr), db: gr.arms + strDmg(h.str), mv: c.mv, range: c.range || 0, st: {}, sp: spellsFor(h), kill: h.cls === 'assassin' ? 1 : 0, col: c.col, g: c.g };
}
function foeUnit(mid, id, boss, bn, vet, bhp) {
  const m = MON[mid];
  let hp = m.hd < 1 ? ri(4) : 0; for (let i = 0; i < Math.floor(m.hd); i++) hp += ri(8); if (m.hd % 1 && m.hd > 1) hp += ri(4);
  if (boss) hp = Math.round(Math.max(hp, m.hd * 4.5) * (bhp || TUNE.bossHp));
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
  const six = S.mode === 'six', bhp = six ? TUNE.bossHp6 : 0;
  const bl = billing(S.day, six), b = { six, day: S.day, bl, units: [], round: 1, log: [], fx: [], over: null, xp: 0, gold: 0, dead: [], cis: cis.slice() };
  let id = 1;
  const hs = S.heroes.filter(h => !h.dead && cis.includes(h.ci)).map(h => heroUnit(S, h, id++));
  hs.sort((a, c) => CL[a.cls].front - CL[c.cls].front);
  const es = [];
  for (const f of bl.foes) for (let i = 0; i < f.count; i++) es.push(foeUnit(f.id, id++, false, null, bl.vet));
  es.sort((a, c) => (a.range ? 1 : 0) - (c.range ? 1 : 0));
  const sides = Math.min(bl.sides, Math.max(1, es.length)), n = hs.length;
  b.doors = DIRS.slice(0, sides); b.nid = 0;
  if (sides === 1) { // one gate: the legion forms line on the west sand
    if (bl.boss) es.splice(Math.floor(es.filter(e => !e.range).length / 2), 0, foeUnit(bl.boss, id++, true, bl.bn, bl.vet, bhp));
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
    if (bl.boss) groups[0].unshift(foeUnit(bl.boss, id++, true, bl.bn, bl.vet, bhp));
    const g = groups[0].length, bh = Math.max(2, Math.round(Math.sqrt(n / 1.5))), bw = Math.ceil(n / bh);
    b.h = clamp(bh + 12, 13, 26);
    b.w = Math.max(18, bw + 12 + 2 * Math.ceil(g / (b.h - 2)));
    if (sides > 2) b.h = clamp(bh + 10 + 2 * Math.ceil(g / (b.w - 2)), 13, 28);
    if (b.six) { b.w = 15; b.h = 11; } // a party needs a small floor so the figures read
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
const helpless = u => u.st.sleep || u.st.stun || u.una;
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
  let T = null; // a trap the party knows of is never walked through, only onto. Thieves step over.
  if (b.traps && u.side === 'H' && !u.fly && !nimble(u)) for (const t of b.traps) if (t.found && !t.gone) (T = T || new Uint8Array(n))[idx(b, t.x, t.y)] = 1;
  d[q[0]] = 0;
  for (let i = 0; i < q.length; i++) {
    const c = q[i], cx = c % b.w, cy = (c - cx) / b.w;
    if (i && ((Z && Z[c]) || (T && T[c]))) continue;
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
  for (const f of fs) for (let y = Math.max(0, f.y - reach); y <= Math.min(b.h - 1, f.y + reach); y++) for (let x = Math.max(0, f.x - reach); x <= Math.min(b.w - 1, f.x + reach); x++) if (reach < 2 || los(b, x, y, f.x, f.y)) G[idx(b, x, y)] = 1;
  const s = idx(b, u.x, u.y); if (G[s]) return;
  const { d, p, q } = flood(b, u); let tg = -1;
  const known = c => { const t = u.side === 'H' && !nimble(u) && trapAt(b, c % b.w, Math.floor(c / b.w)); return t && t.found; }; // a hero on orders keeps off a known trap while there is anywhere else to go
  for (const c of q) if (G[c] && !b.grid[c] && !known(c)) { tg = c; break; }
  if (tg < 0) {
    let bs = dist(u, nearest(u, fs));
    for (const c of q) { if (d[c] > u.mv) break; if (b.grid[c] || known(c)) continue; const cx = c % b.w, o = { x: cx, y: (c - cx) / b.w }, k = dist(o, nearest(o, fs)); if (k < bs) { bs = k; tg = c; } }
    if (tg < 0) for (const c of q) if (c !== s && d[c] <= u.mv && !b.grid[c] && known(c)) { tg = c; break; } // nowhere else: through the trap
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
  const was = t.hp; t.hp = 0; b.grid[idx(b, t.x, t.y)] = null; fx(b, { k: 'die', a: [t.x, t.y], u: t });
  for (const h of b.units) if (h.held === t.id) { delete h.held; delete h.st.root; }
  if (t.illusion) return;
  // The Six: a hero cut down is only out of the fight unless the blow was a terrible one. Win, and they get up again.
  if (t.side === 'H' && b.six && was > -10) { t.down = true; say(b, t.name + ' is down.'); }
  else if (t.side === 'H') { b.dead.push(t); say(b, '† ' + t.name + ' the ' + CL[t.cls].n + ' falls' + (src && src.name ? ' to ' + (src.boss ? src.name : 'a ' + src.name) : '') + '.'); }
  else { b.xp += Math.round(t.m.cost * TUNE.xp * (t.boss ? 3 : 1)); b.gold += Math.ceil(t.m.cost / 4) * (t.boss ? 4 : 1); if (src && src.h) { src.h.kills++; if (t.boss) src.h.trophies = (src.h.trophies || []).concat([t.name]); } if (t.boss) say(b, t.name + ' is slain by ' + (src ? src.name : 'the legion') + '!'); }
}
function hurt(b, t, dm, src, col, crit) {
  dm = Math.max(1, Math.round(dm)); t.hp -= dm; delete t.st.sleep; if (t.una) rouse(b, t, 5);
  fx(b, { k: 'txt', a: [t.x, t.y], s: dm + (crit ? '!' : ''), c: crit ? '#ffd86a' : col || (t.side === 'H' ? '#ff5a4a' : '#fff'), big: crit ? 1 : 0, side: t.side });
  if (t.hp <= 0) kill(b, t, src);
}
function heal(b, t, n) { n = Math.min(n, t.max - t.hp); t.hp += n; fx(b, { k: 'txt', a: [t.x, t.y], s: '+' + n, c: '#7dff8a' }); return n; }
function strike(b, a, t, dmg, o) {
  o = o || {}; const ev = { k: o.ranged ? 'shot' : 'slash', a: [a.x, a.y], b: [t.x, t.y], side: a.side, hit: false, w: !o.ranged ? a.cls || a.mid : BOLTERS[a.mid] ? 'bolt' : a.cls === 'mage' || a.cls === 'illusionist' ? 'dart' : 'arrow', lag: o.ranged ? Math.min(520, 110 + Math.hypot(a.x - t.x, a.y - t.y) * 36) : 120 };
  fx(b, ev);
  if (t.illusion) { if (ri(20) >= 12) { kill(b, t); fx(b, { k: 'txt', a: [t.x, t.y], s: 'poof', c: '#c77be0' }); } return false; }
  const roll = ri(20), need = a.thac0 - t.ac - (t.st.stun ? 4 : 0) - (o.bonus || 0) - (a.st.bless ? 1 : 0) - (t.una ? 4 : 0) - (a.st.might ? 1 : 0) + (t.st.stone ? 4 : 0);
  if (!(t.st.sleep || roll === 20 || (roll !== 1 && roll >= need))) { if (b.six) say(b, who(a) + ' misses ' + who(t) + '.'); if (t.una) rouse(b, t, 5); return false; }
  const nat = roll === 20; // a natural 20 is a critical hit: the damage dice are rolled twice
  let dm = (dice(dmg) + (nat ? dice(dmg) : 0) + (a.db || 0) + (o.plus || 0) + (a.st.might ? 3 : 0)) * (o.mult || 1); if (t.st.sleep) dm *= 2;
  if (b.six || nat && (a.boss || t.boss)) say(b, who(a) + (nat ? ' lands a critical blow on ' : ' hits ') + who(t) + ' for ' + Math.max(1, Math.round(dm)) + '.');
  ev.hit = true; ev.nat = nat; hurt(b, t, dm, a, null, nat); return true;
}
const who = u => u.side === 'H' || u.boss ? u.name : 'the ' + u.name;
// Walls block sight in quest rooms; the open arena has none.
function los(b, x0, y0, x1, y1) {
  if (!b.room) return true;
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy, x = x0, y = y0;
  while (x !== x1 || y !== y1) { const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } if ((x !== x1 || y !== y1) && b.room.cells[y * b.w + x] === 1) return false; }
  return true;
}
const inShot = (b, a, t) => dist(a, t) <= a.range && los(b, a.x, a.y, t.x, t.y);
const flanked = (b, t, a) => b.units.some(x => x.hp > 0 && x.side === a.side && x !== a && dist(x, t) === 1);

/* ---------- the unaware, the watchful, and what brings help ---------- */
const nimble = u => u.cls === 'thief' || u.cls === 'assassin';
// How close a hero can come before an unwary foe with a clear view notices. Thieves, assassins and rangers move quietly.
const sightOf = h => h.st.hide ? 0 : nimble(h) ? 2 : h.cls === 'ranger' ? 3 : 6;
// Whoever is roused loses the round they are roused in, unless they were given fair warning (ready).
function rouse(b, e, r, ready) {
  for (const x of b.units) if (x.una && x.hp > 0 && (x === e || dist(x, e) <= r)) { x.una = false; if (!ready) x.sur = b.round; fx(b, { k: 'txt', a: [x.x, x.y], s: '!', c: '#ffb14a' }); }
}
function stepTo(b, u, tx, ty, n) { // walk up to n squares towards a square
  const { d, p } = flood(b, u), s = idx(b, u.x, u.y); let c = idx(b, tx, ty); if (d[c] < 0) return false;
  while (c !== s && c >= 0 && (d[c] > n || b.grid[c])) c = p[c];
  return c !== s && c >= 0 && moveTo(b, u, c % b.w, Math.floor(c / b.w));
}
// An unwary foe's turn: walk its beat if it has one, and look about. Noticing costs it the turn.
function watch(b, e) {
  const sees = () => b.units.find(h => h.side === 'H' && h.hp > 0 && dist(e, h) <= sightOf(h) && los(b, e.x, e.y, h.x, h.y));
  let h = sees(), out = 'idle';
  if (!h && e.pat) { const t = e.pat[e.pi || 0]; if ((e.x === t[0] && e.y === t[1]) || !stepTo(b, e, t[0], t[1], 2)) e.pi = 1 - (e.pi || 0); else out = 'walk'; if (e.hp <= 0 || !e.una) return; h = sees(); }
  if (!h) return out;
  const cry = e.f.includes('cry');
  say(b, (e.boss ? e.name : 'The ' + e.name) + ' notices ' + h.name + (cry ? ' and raises the alarm.' : '.')); rouse(b, e, cry ? 99 : 5);
}
// A new foe steps in: through its gate in the arena, or at the free square nearest a point.
function arrive(b, mid, dir, near) {
  let spot = null;
  if (dir && dir !== 'Q') for (let j = 0; j < 12 && !spot; j++) { const o = Math.ceil(j / 2) * (j % 2 ? 1 : -1), x = dir === 'E' ? b.w - 1 : dir === 'W' ? 0 : Math.floor(b.w / 2) + o, y = dir === 'N' ? 0 : dir === 'S' ? b.h - 1 : Math.floor(b.h / 2) + o; if (inb(b, x, y) && !at(b, x, y)) spot = [x, y]; }
  else for (let d = 1; d <= 4 && !spot; d++) for (let y = near.y - d; y <= near.y + d && !spot; y++) for (let x = near.x - d; x <= near.x + d; x++) if (inb(b, x, y) && !at(b, x, y)) { spot = [x, y]; break; }
  if (!spot) return null;
  const nu = foeUnit(mid, b.nid++, false, null, b.bl.vet); nu.door = dir; nu.acted = true; b.units.push(nu); place(b, nu, spot[0], spot[1]); burst(b, spot[0], spot[1], 0, '#ff7828'); return nu;
}

function heroAttack(b, u, t, ranged) {
  const c = CL[u.cls], L = u.lvl; let n = 1, o = {};
  if (ranged) { o.ranged = true; if (u.cls === 'ranger' && L >= 5) n = 2; }
  else if (u.cls === 'fighter' && t.hd < 1) n = L;
  else if ((u.cls === 'fighter' || u.cls === 'paladin' || u.cls === 'ranger') && L >= 7) n = 2;
  else if (u.cls === 'monk' && L >= 3) n = 2;
  if (u.st.haste) n++;
  if (u.cls === 'ranger' && t.f && t.f.includes('g')) o.plus = L;
  if (u.cls === 'monk') o.plus = Math.floor(L / 2);
  if (!ranged && nimble(u) && (flanked(b, t, u) || t.una)) o.mult = L < 5 ? 2 : L < 9 ? 3 : 4; // a foe who has not noticed the blade is as good as flanked
  if (u.bane && t.f && t.f.includes(u.bane)) o.mult = (o.mult || 1) * 2;
  for (let i = 0; i < n; i++) {
    if (t.hp <= 0) { // a fighter's sweep carries on to the next weak foe in reach
      t = foesOf(b, u).find(x => dist(u, x) === 1 && (u.cls !== 'fighter' || x.hd < 1 || i === 0)); if (!t) break;
    }
    if (u.fire) o.plus = (o.plus || 0) + dice(u.fire);
    const hit = strike(b, u, t, ranged ? u.rd || c.rdmg : u.wd || c.dmg, o);
    if (hit && u.cls === 'monk' && t.hp > 0 && !t.boss && t.hd <= L + 3 && ri(100) <= 20) { t.st.stun = 1; fx(b, { k: 'txt', a: [t.x, t.y], s: 'stun', c: '#e07b3a' }); }
  }
  u.acted = true;
}
function assassinate(b, u, t) {
  u.kill = 0; u.acted = true;
  const ch = clamp(40 + 5 * u.lvl - 6 * t.hd + (t.una ? 25 : 0), 5, 95);
  fx(b, { k: 'slash', a: [u.x, u.y], b: [t.x, t.y], side: 'H', hit: true, w: 'assassin', crit: 1, lag: 140 });
  if (t.una) rouse(b, t, 5);
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
  if (sp.tg !== 'self' && (!inb(b, x, y) || Math.max(Math.abs(u.x - x), Math.abs(u.y - y)) > sp.range || !los(b, u.x, u.y, x, y))) return false;
  const t = sp.tg === 'self' ? null : at(b, x, y);
  if (sp.tg === 'foe' && !(t && t.side === 'E')) return false;
  if (sp.tg === 'ally' && !(t && t.side === 'H' && !t.illusion && t.hp < t.max)) return false;
  if (sp.tg === 'empty' && t) return false;
  u.sp[id]--; u.acted = true;
  { const far = sp.tg === 'self' ? 0 : Math.hypot(u.x - x, u.y - y); fx(b, { k: 'spell', id, a: [u.x, u.y], b: sp.tg === 'self' ? [u.x, u.y] : [x, y], r: id === 'turn' ? 4 : id === 'bless' ? 2 : sp.rad || 0, n: id === 'missile' ? 1 + Math.floor((L - 1) / 2) : 0, lag: 250 + (id === 'missile' || id === 'fireball' || id === 'hold' || id === 'cure' ? Math.min(420, far * 44) : id === 'lightning' ? 70 : 0) }); }
  switch (id) {
    case 'sleep': {
      let pool = dice([2, 4, 0]) + L, n = 0; burst(b, x, y, 1, '#8fb0ff');
      for (const f of inRad(b, x, y, 1, 'E').filter(sleepOK).sort((a, c) => a.hd - c.hd)) { const k = Math.max(.5, f.hd); if (pool < k) break; pool -= k; f.st.sleep = ri(4) + 2; n++; }
      say(b, u.name + ' casts Sleep: ' + n + ' foe' + (n === 1 ? '' : 's') + ' slumber.'); break;
    }
    case 'missile': { const n = 1 + Math.floor((L - 1) / 2); fx(b, { k: 'line', a: [u.x, u.y], b: [x, y], c: '#9fd0ff' }); hurt(b, t, dice([n, 4, n]), u, '#9fd0ff'); break; }
    case 'fireball': {
      burst(b, x, y, 2, '#ff9a3a'); let n = 0; rouse(b, { x, y }, 7);
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
    case 'web': { burst(b, x, y, 1, '#e8e8f0'); for (const f of inRad(b, x, y, 1, 'E')) f.st.root = f.boss ? 1 : ri(3) + 2; say(b, u.name + ' casts Web.'); break; }
    case 'bless': { burst(b, u.x, u.y, 2, '#fffbe0'); for (const a of inRad(b, u.x, u.y, 2, 'H')) a.st.bless = 1; say(b, u.name + ' blesses the party.'); break; }
    case 'hold': { fx(b, { k: 'line', a: [u.x, u.y], b: [x, y], c: '#fffbe0' }); if (!t.boss && t.hd <= L + 3 && !t.f.includes('u')) { t.st.stun = ri(4) + 1; fx(b, { k: 'txt', a: [x, y], s: 'held', c: '#fffbe0' }); say(b, u.name + ' holds a ' + t.name + ' fast.'); } else say(b, 'The ' + t.name + ' shrugs off the spell.'); break; }
    case 'entangle': { burst(b, x, y, 1, '#5fbf6a'); for (const f of inRad(b, x, y, 1, 'E')) f.st.root = f.boss ? 1 : ri(3) + 2; say(b, u.name + ' casts Entangle.'); break; }
    case 'lightning': { burst(b, x, y, 1, '#e8f6ff'); rouse(b, { x, y }, 7); for (const f of inRad(b, x, y, 1, 'E')) { let dm = dice([3, 8, L]); if (ri(20) + f.hd >= 16) dm /= 2; hurt(b, f, dm, u, '#cfeaff'); } say(b, u.name + ' calls down lightning.'); break; }
  }
  return true;
}
function drink(b, u, S) { if (!(S.potions > 0) || u.acted || u.hp >= u.max) return false; S.potions--; u.acted = true; heal(b, u, dice([2, 4, 2])); return true; }

// Best cell to centre an area spell on: score = eligible foes caught, never any ally if the spell burns friends.
function bestCell(b, u, id, ok) {
  const sp = SPELLS[id]; let best = null, bs = 0;
  for (const f of b.units) {
    if (f.hp <= 0 || f.side !== 'E' || dist(u, f) > sp.range || !los(b, u.x, u.y, f.x, f.y)) continue;
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
      if (sp.web > 0 && (c = bestCell(b, u, 'web', f => !f.st.root && !f.st.sleep)) && c.s >= 2) return cast(b, u, 'web', c.x, c.y);
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
      if (sp.bless > 0 && !u.st.bless && alliesOf(b, u).filter(a => dist(u, a) <= 2).length >= 2 && dist(u, nearest(u, fs)) <= 8) return cast(b, u, 'bless');
      if (sp.hold > 0) { const t = fs.filter(f => dist(u, f) <= 6 && !f.boss && !f.st.stun && !f.st.sleep && f.hd >= 2 && f.hd <= L + 3 && !f.f.includes('u')).sort((a, c2) => c2.hp - a.hp)[0]; if (t) return cast(b, u, 'hold', t.x, t.y); }
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
const castReach = u => { const s = u.sp; return s.fireball > 0 || s.missile > 0 ? 10 : s.sleep > 0 || s.entangle > 0 || s.lightning > 0 || s.web > 0 ? 8 : s.colours > 0 ? 4 : 0; };
function skipTurn(b, u) {
  if (u.st.sleep) { if (!--u.st.sleep) delete u.st.sleep; return true; }
  if (u.st.stun) { if (!--u.st.stun) delete u.st.stun; return true; }
  return false;
}

// One hero acts on the cohort's standing order. Respects a move the player already made by hand.
function heroAct(b, u, S) {
  if (u.hp <= 0 || u.acted || u.illusion) return;
  u.guard = false;
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
  else if (co.order === 'guard') { // hold the line, but take one step to meet a foe who has come close
    if (canMove() && reach === 1) { const d = dist(u, nearest(u, fs)); if (d === 2) { const mv = u.mv; u.mv = 1; approach(b, u, 1); u.mv = mv; } }
  }
  else if (co.order === 'attack' && canMove() && !(reach > 1 ? fs.some(f => inShot(b, u, f)) : dist(u, nearest(u, fs)) <= 1)) approach(b, u, reach);
  if (u.hp <= 0) return;
  fs = foesOf(b, u);
  const adj = fs.filter(f => dist(u, f) === 1);
  if (adj.length) {
    const pick = adj.sort((a, c) => (a.illusion ? 1 : 0) - (c.illusion ? 1 : 0) || a.hp - c.hp)[0];
    if (u.kill && !pick.boss) { const big = adj.filter(f => !f.boss && f.hd >= 2).sort((a, c) => c.hp - a.hp)[0]; if (big && big.hp > 8) { if (!assassinate(b, u, big)) heroAttack(b, u, big, false); return; } }
    heroAttack(b, u, pick, false);
  } else if (u.range) {
    const t = fs.filter(f => inShot(b, u, f)).sort((a, c) => (a.st.sleep ? 1 : 0) - (c.st.sleep ? 1 : 0) || a.hp - c.hp)[0];
    if (t) heroAttack(b, u, t, true);
  } else if (co.order === 'hold' || co.order === 'guard') u.guard = true; // nothing in reach: stand ready for whoever comes
  u.acted = true;
}
function foeAct(b, e) {
  if (e.hp <= 0) return;
  if (skipTurn(b, e)) return;
  if (e.una) return watch(b, e);
  if (e.sur === b.round) return 'idle'; // caught unaware: the party has this round free
  const rooted = e.st.root; if (rooted && !--e.st.root) delete e.st.root;
  let hs = foesOf(b, e); if (!hs.length) return;
  const m = e.m;
  if (e.f.includes('cry') && !e.cried && e.hp <= e.max / 2 && (b.cries || 0) < 2 && ri(100) <= 60) { // hurt, it calls one more of its kind
    e.cried = 1; const nu = arrive(b, e.mid, e.door, e);
    if (nu) { b.cries = (b.cries || 0) + 1; fx(b, { k: 'txt', a: [e.x, e.y], s: 'help!', c: '#ffb14a' }); say(b, (e.mid === 'wolf' || e.mid === 'hound' ? 'The ' + e.name + ' howls' : 'The ' + e.name + ' calls for help') + ', and another ' + e.name + ' comes.'); return; }
  }
  if (m.breath && e.cd <= 0) {
    let best = null, bs = 1;
    for (const h of hs) { if (dist(e, h) > 6) continue; const n = inRad(b, h.x, h.y, 1, 'H').length; if (n > bs) { bs = n; best = h; } }
    if (best) {
      e.cd = 3; fx(b, { k: 'breath', a: [e.x, e.y], b: [best.x, best.y], lag: 430 }); burst(b, best.x, best.y, 1, '#ff7a2a'); say(b, e.name + ' breathes fire!');
      for (const h of inRad(b, best.x, best.y, 1, 'H')) { if (h.illusion) { kill(b, h); continue; } let dm = dice(m.breath) * (b.six ? .6 : 1); if (ri(20) + h.lvl >= 14) dm /= 2; hurt(b, h, dm, e, '#ff9a3a'); }
      return;
    }
  }
  const reach = e.range || 1;
  if (m.gaze && e.cd <= 0) { // the Editor's eye holds a knot of heroes where they stand; it costs him nothing
    let best = null, bs = 1;
    for (const h of hs) { if (dist(e, h) > 8 || h.illusion) continue; const k = inRad(b, h.x, h.y, 1, 'H').filter(x => !x.st.stun).length; if (k > bs) { bs = k; best = h; } }
    if (best) { e.cd = 2; fx(b, { k: 'gaze', a: [e.x, e.y], b: [best.x, best.y], lag: 260 }); burst(b, best.x, best.y, 1, '#f0c56a'); say(b, e.name + ' turns his eye on the legion.'); for (const h of inRad(b, best.x, best.y, 1, 'H')) if (!h.illusion && ri(20) + h.lvl < 16) { h.st.stun = 2; fx(b, { k: 'txt', a: [h.x, h.y], s: 'held', c: '#f0c56a' }); } }
  }
  // A master calls for help every third round, at most twice (Vhorax three times), and not at all with a hero at his throat.
  const cap = e.mid === 'vhorax' ? 3 : 2, pressed = hs.some(h => !h.illusion && dist(e, h) === 1);
  if (m.summon && (e.calls || 0) < cap) {
    if (b.round % 3 === 2 && e.warn !== b.round) { e.warn = b.round; say(b, e.name + ' is about to call for help. A hero in melee with ' + e.name + ' will stop it.'); fx(b, { k: 'txt', a: [e.x, e.y], s: 'calling', c: '#ffb14a' }); }
    if (b.round % 3 === 0 && pressed && e.sum !== b.round) { e.sum = b.round; say(b, e.name + ' is too hard pressed to call for help.'); fx(b, { k: 'txt', a: [e.x, e.y], s: 'pressed', c: '#7dff8a' }); }
  }
  if (m.summon && b.round % 3 === 0 && e.sum !== b.round && (e.calls || 0) < cap && !pressed) { e.calls = (e.calls || 0) + 1; // more of his guard come through the gates
    e.sum = b.round; let k = 0; const sn = b.six && !b.quest ? Math.ceil(m.summon[1] / 2) : m.summon[1];
    for (const dir of b.quest ? ['Q'] : b.doors) for (let j = 0; j < 12 && k < sn; j++) {
      const o = Math.ceil(j / 2) * (j % 2 ? 1 : -1), x = dir === 'Q' ? e.x - 1 + j % 3 : dir === 'E' ? b.w - 1 : dir === 'W' ? 0 : Math.floor(b.w / 2) + o, y = dir === 'Q' ? e.y - 2 + Math.floor(j / 3) : dir === 'N' ? 0 : dir === 'S' ? b.h - 1 : Math.floor(b.h / 2) + o;
      if (!inb(b, x, y) || at(b, x, y)) continue;
      const nu = foeUnit(m.summon[0], b.nid++, false, null, b.bl.vet); nu.door = dir; b.units.push(nu); place(b, nu, x, y); burst(b, x, y, 0, '#ff7828'); k++;
      if (!b.quest && k % Math.ceil(sn / b.doors.length) === 0) break;
    }
    if (k) say(b, b.quest ? e.name + ' calls for help: ' + k + ' more come.' : e.name + ' calls ' + k + ' more of the Ashen Legion through the gates.');
  }
  const ox = e.x, oy = e.y;
  if (!rooted && !(reach > 1 ? hs.some(h => inShot(b, e, h)) : dist(e, nearest(e, hs)) <= 1)) approach(b, e, reach);
  if (e.hp <= 0) return;
  let ran = e.f.includes('rsh') && Math.max(Math.abs(e.x - ox), Math.abs(e.y - oy)) >= 3;
  for (let i = 0; i < (m.att || 1); i++) {
    hs = foesOf(b, e);
    const adj = hs.filter(h => dist(e, h) === 1); let t = adj.find(h => h.illusion) || adj[ri(adj.length) - 1], ranged = false;
    if (!t && e.range) { t = nearest(e, hs.filter(h => inShot(b, e, h) && !h.st.hide)); ranged = true; }
    if (!t) break;
    const o = { ranged, bonus: t.held === e.id && t.st.root ? 4 : 0 };
    if (ran && !ranged) { ran = false; o.bonus += 2; o.mult = 2; fx(b, { k: 'txt', a: [e.x, e.y], s: 'charge', c: '#ffb14a' }); if (b.six) say(b, 'The ' + e.name + ' charges ' + t.name + '.'); }
    if (strike(b, e, t, m.dmg, o) && t.hp > 0 && !t.illusion) {
      if (e.f.includes('clt') && !t.st.root && !t.fly && ri(20) + t.lvl < 14) { t.st.root = 2; t.held = e.id; fx(b, { k: 'txt', a: [t.x, t.y], s: 'grabbed', c: '#ffb14a' }); if (b.six) say(b, 'The ' + e.name + ' has hold of ' + t.name + '.'); }
      if (e.f.includes('par') && ri(20) + t.lvl < 13) { t.st.stun = ri(2) + 1; fx(b, { k: 'txt', a: [t.x, t.y], s: 'held', c: '#b9f' }); }
      if (e.f.includes('poi') && ri(20) + t.lvl < 12) hurt(b, t, ri(6), e, '#9be36a');
    }
  }
}
function endRound(b) {
  b.round++;
  for (const u of b.units) {
    if (u.hp <= 0) continue;
    u.acted = false; u.moved = false; u.opp = false; u.delayed = false;
    if (u.illusion) { u.acted = true; if (--u.fade <= 0) kill(b, u); continue; }
    for (const k of ['might', 'haste', 'stone', 'hide']) if (u.st[k] && !--u.st[k]) { delete u.st[k]; if (k === 'haste') u.mv -= 3; }
    if (u.regen && u.hp < u.max) u.hp = Math.min(u.max, u.hp + u.regen);
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
  const res = { final: b.over === 'win' && b.bl.final, win: b.over === 'win', yielded: !!yielded, draw: b.over === 'draw', dead: b.dead.map(u => u.name + ' the ' + CL[u.cls].n), xp: 0, gold: 0, tended: 0, ready: 0, day: b.day, down: [] };
  const surv = [];
  for (const u of b.units) { if (u.side !== 'H' || u.illusion) continue; u.h.fought = (u.h.fought || 0) + 1; if (u.hp <= 0 && u.down) { u.h.hp = 1; u.h.downs = (u.h.downs || 0) + 1; res.down.push(u.name); } else if (u.hp <= 0) { if (u.down) res.dead.push(u.name + ' the ' + CL[u.cls].n); u.h.dead = true; u.h.hp = 0; u.h.diedDay = b.day; S.fallen++; } else { u.h.hp = u.hp; surv.push(u); } }
  if (res.win) {
    res.gold = b.gold + b.bl.purse; S.gold += res.gold;
    res.xp = surv.length ? Math.floor(b.xp / surv.length) : 0; for (const u of surv) u.h.xp += res.xp;
    S.day++; S.best = Math.max(S.best, S.day - 1); if (res.final) S.ending = 'free';
  } else if (yielded || (b.six && res.down.length)) { res.fine = Math.floor(S.gold / 2); S.gold -= res.fine; res.spared = !yielded; }
  const alive = living(S);
  for (const u of surv) { // unspent healing goes to the worst wounded
    let n = (u.sp.cure || 0) + (u.sp.loh || 0);
    while (n-- > 0) { const t = alive.filter(h => h.hp < h.max).sort((a, c) => a.hp / a.max - c.hp / c.max)[0]; if (!t) break; const k = Math.min(t.max - t.hp, dice([1, 8, u.lvl])); t.hp += k; res.tended += k; }
  }
  for (const h of alive) h.hp = Math.min(h.max, h.hp + Math.max(2, Math.ceil(h.max * (b.six ? 1 : b.cis.includes(h.ci) ? .25 : .5))));
  if (b.six && res.win) { res.loot = rollLoot(S, b); S.inv.push(...res.loot); }
  res.ready = alive.filter(canTrain).length;
  S.pick = S.pick.filter(ci => living(S, ci).length);
  return res;
}

/* ---------- The Six: a party of six, hand-controlled, with real equipment ---------- */
const LET = { fighter: 'F', paladin: 'P', ranger: 'R', cleric: 'C', druid: 'D', mage: 'M', illusionist: 'I', thief: 'T', assassin: 'A', monk: 'K' };
const SLOTS = [['weapon', 'Weapon'], ['off', 'Off hand'], ['head', 'Head'], ['body', 'Body'], ['cloak', 'Cloak'], ['boots', 'Boots'], ['ring1', 'Ring'], ['ring2', 'Ring']];
const ITEMS = {};
// use = the callings that may carry it. tier 0 is ordinary gear; 1 to 3 are magic and can drop as loot.
const it = (id, n, slot, cost, use, o) => { ITEMS[id] = Object.assign({ id, n, slot, cost, use, tier: 0 }, o); };
it('dagger', 'Dagger', 'weapon', 5, 'FPRDMITAK', { dice: [1, 4, 0], look: 'dagger' });
it('darts', 'Throwing Darts', 'weapon', 8, 'FRMITA', { dice: [1, 4, 0], rdice: [1, 3, 0], range: 4, look: 'dagger' });
it('staff', 'Quarterstaff', 'weapon', 4, 'FPRCDMITAK', { dice: [1, 6, 0], two: 1, look: 'staff' });
it('mace', 'Mace', 'weapon', 12, 'FPRCA', { dice: [1, 6, 1], look: 'mace' });
it('short', 'Short Sword', 'weapon', 12, 'FPRTA', { dice: [1, 6, 0], look: 'sword' });
it('scimitar', 'Scimitar', 'weapon', 18, 'FPRDA', { dice: [1, 8, 0], look: 'scimitar' });
it('sword', 'Long Sword', 'weapon', 20, 'FPRTA', { dice: [1, 8, 0], look: 'sword' });
it('axe', 'Battle Axe', 'weapon', 24, 'FPRA', { dice: [1, 8, 1], look: 'axe' });
it('great', 'Great Sword', 'weapon', 50, 'FPR', { dice: [1, 10, 1], two: 1, look: 'gsword' });
it('bow', 'Long Bow', 'weapon', 40, 'FPRTA', { dice: [1, 4, 0], rdice: [1, 6, 0], range: 8, two: 1, look: 'bow' });
for (const b of ['dagger', 'staff', 'mace', 'scimitar', 'sword', 'axe', 'great', 'bow']) for (let n = 1; n <= 3; n++) { const o = ITEMS[b]; it(b + n, o.n + ' +' + n, 'weapon', o.cost + [0, 280, 750, 1900][n], o.use, Object.assign({}, o, { hit: n, dmg: n, tier: n, steel: ['', '#bfe0ff', '#ffe08a', '#ff9ad0'][n] })); }
it('flame', 'Emberbrand', 'weapon', 1100, 'FPRTA', { dice: [1, 8, 0], hit: 1, dmg: 1, fire: [1, 6, 0], tier: 2, look: 'sword', steel: '#ffb060', note: 'Long sword +1. Burns for an extra d6.' });
it('bane', 'Gravebane', 'weapon', 950, 'FPRCA', { dice: [1, 6, 1], hit: 1, dmg: 1, bane: 'u', tier: 2, look: 'mace', note: 'Mace +1. Double damage to the undead.' });
it('robes', 'Robes', 'body', 3, 'FPRCDMITAK', { look: 'robe' });
it('leather', 'Leather Armour', 'body', 15, 'FPRCDTA', { ac: 2, look: 'leather' });
it('studded', 'Studded Leather', 'body', 35, 'FPRCTA', { ac: 3, look: 'leather' });
it('chain', 'Chain Mail', 'body', 90, 'FPRC', { ac: 5, look: 'chain' });
it('plate', 'Plate Armour', 'body', 420, 'FPC', { ac: 7, look: 'plate' });
for (const b of ['leather', 'chain', 'plate']) for (let n = 1; n <= 2; n++) { const o = ITEMS[b]; it(b + n, o.n + ' +' + n, 'body', o.cost + [0, 350, 900][n], o.use, Object.assign({}, o, { ac: o.ac + n, tier: n })); }
it('ward', 'Robe of Warding', 'body', 500, 'MIK', { ac: 3, tier: 1, look: 'robe' });
it('ward2', 'Robe of the Magus', 'body', 1500, 'MI', { ac: 5, slots: 1, tier: 3, look: 'robe', note: 'Armour class 5 and one more spell a day.' });
it('shield', 'Shield', 'off', 12, 'FPRCDA', { ac: 1 });
it('shield1', 'Shield +1', 'off', 320, 'FPRCDA', { ac: 2, tier: 1 });
it('shield2', 'Shield +2', 'off', 800, 'FPRCDA', { ac: 3, tier: 2 });
it('cap', 'Leather Cap', 'head', 3, 'FPRCDTA', { look: 'cap' });
it('helm', 'Helm', 'head', 25, 'FPRC', { ac: 1, look: 'full' });
it('crest', 'Crested Helm', 'head', 30, 'FP', { ac: 1, look: 'crest' });
it('hat', 'Pointed Hat', 'head', 4, 'MI', { look: 'hat' });
it('hood', 'Hood', 'head', 3, 'RDITAMK', { look: 'hoodup' });
it('circlet', 'Circlet of Focus', 'head', 700, 'MICD', { slots: 1, tier: 2, look: 'crown', note: 'One more spell a day.' });
it('sentinel', 'Helm of the Sentinel', 'head', 650, 'FPRC', { ac: 2, tier: 2, look: 'full' });
it('cloak', 'Travelling Cloak', 'cloak', 5, 'FPRCDMITAK', {});
it('cloak1', 'Cloak of Protection +1', 'cloak', 320, 'FPRCDMITAK', { ac: 1, tier: 1 });
it('cloak2', 'Cloak of Protection +2', 'cloak', 1000, 'FPRCDMITAK', { ac: 2, tier: 3 });
it('boots', 'Boots', 'boots', 4, 'FPRCDMITAK', {});
it('stride', 'Boots of Striding', 'boots', 260, 'FPRCDMITAK', { mv: 1, tier: 1, note: 'Move one square further.' });
it('wing', 'Winged Boots', 'boots', 950, 'FPRCDMITAK', { mv: 1, fly: 1, tier: 3, note: 'Move one square further and ignore zones of control.' });
it('rprot', 'Ring of Protection', 'ring', 300, 'FPRCDMITAK', { ac: 1, tier: 1 });
it('rmight', 'Ring of Might', 'ring', 300, 'FPRCDMITAK', { dmg: 1, tier: 1, note: '+1 damage.' });
it('raim', 'Ring of Accuracy', 'ring', 300, 'FPRCDMITAK', { hit: 1, tier: 1, note: '+1 to hit.' });
it('rvit', 'Ring of Vitality', 'ring', 600, 'FPRCDMITAK', { hp: 8, tier: 2, note: '+8 hit points.' });
it('rmagus', 'Ring of the Magus', 'ring', 750, 'MICD', { slots: 1, tier: 2, note: 'One more spell a day.' });
it('rregen', 'Ring of Regeneration', 'ring', 1300, 'FPRCDMITAK', { regen: 1, tier: 3, note: 'Heals 1 hit point each round.' });
const START = {
  fighter: { weapon: 'sword', off: 'shield', body: 'chain', head: 'crest' }, paladin: { weapon: 'sword', off: 'shield', body: 'chain', head: 'helm', cloak: 'cloak' },
  ranger: { weapon: 'bow', body: 'studded', head: 'hood', cloak: 'cloak' }, cleric: { weapon: 'mace', off: 'shield', body: 'chain', head: 'cap' },
  druid: { weapon: 'scimitar', off: 'shield', body: 'leather' }, mage: { weapon: 'staff', body: 'robes', head: 'hat' }, illusionist: { weapon: 'dagger', body: 'robes', head: 'hood' },
  thief: { weapon: 'short', body: 'leather', head: 'hood' }, assassin: { weapon: 'dagger', off: 'shield', body: 'leather', head: 'hood', cloak: 'cloak' }, monk: { body: 'robes' }
};
const slotOf = s => s === 'ring1' || s === 'ring2' ? 'ring' : s;
const canUse = (h, id) => ITEMS[id].use.includes(LET[h.cls]);
function kit(h) {
  const k = { ac: 0, hit: 0, dmg: 0, mv: 0, regen: 0, slots: 0, fly: false, w: ITEMS[h.eq.weapon] || null };
  for (const s in h.eq) { const i = ITEMS[h.eq[s]]; if (!i) continue; k.ac += i.ac || 0; k.hit += i.hit || 0; k.dmg += i.dmg || 0; k.mv += i.mv || 0; k.regen += i.regen || 0; k.slots += i.slots || 0; if (i.fly) k.fly = true; }
  return k;
}
const sixAC = (h, k) => 10 - (k || kit(h)).ac - dexAC(h.dex) - (h.cls === 'monk' ? h.lvl - 1 : 0);
const sixThac0 = (h, k) => 20 - Math.floor((h.lvl - 1) * CL[h.cls].thr) - (k || kit(h)).hit - strHit(h.str);
// Put an item from the stash on a hero. Whatever it replaces goes back to the stash. Returns an error string or ''.
function equip(S, h, id, slot) {
  const i = ITEMS[id], at = S.inv.indexOf(id); if (at < 0) return 'Not in the stash.';
  if (!canUse(h, id)) return CL[h.cls].pl + ' cannot use that.';
  if (i.slot === 'ring') slot = slot && slotOf(slot) === 'ring' ? slot : !h.eq.ring1 ? 'ring1' : !h.eq.ring2 ? 'ring2' : 'ring1'; else slot = i.slot;
  S.inv.splice(at, 1);
  if (i.two) unequip(S, h, 'off');
  if (slot === 'off' && h.eq.weapon && ITEMS[h.eq.weapon].two) unequip(S, h, 'weapon');
  unequip(S, h, slot); h.eq[slot] = id;
  if (i.hp) { h.max += i.hp; h.hp += i.hp; }
  fillMem(h); return '';
}
function unequip(S, h, slot) {
  const id = h.eq[slot]; if (!id) return;
  const i = ITEMS[id]; delete h.eq[slot]; S.inv.push(id);
  if (i.hp) { h.max -= i.hp; h.hp = Math.max(1, Math.min(h.hp, h.max)); }
  fillMem(h);
}
// How the figure should be drawn for what the hero is wearing.
function lookOf(h) {
  const e = h.eq, g = s => ITEMS[e[s]], w = g('weapon'), b = g('body'), hd = g('head');
  const o = { weapon: w ? w.look : null, weapon2: null, quiver: w && w.look === 'bow' ? 1 : null, hand: w && w.look === 'bow' ? [.3, -.58] : null, steel: w && w.steel || null,
    shield: e.off ? { k: h.cls === 'fighter' ? 'scutum' : h.cls === 'paladin' ? 'kite' : 'round', c: h.cls === 'fighter' ? '#b3312a' : h.cls === 'paladin' || h.cls === 'cleric' ? '#f2f2f7' : '#7a5632' } : null,
    armour: b && b.look !== 'robe' ? b.look : null, robe: !b || b.look === 'robe' ? 1 : null, helm: hd ? hd.look : null, cloak: e.cloak ? 1 : null };
  if (h.cls === 'monk' && !w) o.hand = [.34, -.66];
  return o;
}
const figKey = h => h.cls + '|' + JSON.stringify(lookOf(h));

// Spellbooks: [spell, level at which it is learned]. A caster memorises 1 + level spells a day, in any mix.
const BOOK = {
  mage: [['sleep', 1], ['missile', 1], ['web', 3], ['fireball', 5]], illusionist: [['colours', 1], ['phantom', 2]],
  cleric: [['cure', 1], ['bless', 1], ['hold', 3]], druid: [['entangle', 1], ['cure', 2], ['lightning', 5]]
};
const known = h => (BOOK[h.cls] || []).filter(x => h.lvl >= x[1]).map(x => x[0]);
const slotsFor = h => BOOK[h.cls] ? 1 + h.lvl + kit(h).slots : 0;
const memCount = h => Object.values(h.mem || {}).reduce((a, b) => a + b, 0);
const abilities = h => h.cls === 'cleric' ? { turn: 3 } : h.cls === 'paladin' ? { loh: 1 } : {};
function fillMem(h) { // top up unused slots, newest spells first; drop any excess
  if (!BOOK[h.cls]) { h.mem = {}; return; }
  const k = known(h).reverse(), n = slotsFor(h); h.mem = h.mem || {};
  for (const id in h.mem) if (!k.includes(id)) delete h.mem[id];
  for (let i = 0; memCount(h) > n; i++) { const id = k[i % k.length]; if (h.mem[id] > 0) h.mem[id]--; }
  for (let i = 0; memCount(h) < n; i++) { const id = k[i % k.length]; h.mem[id] = (h.mem[id] || 0) + 1; }
}
function newParty(spec) { // spec: six of { cls, name, str, dex, con }
  const heroes = spec.map(p => { const c = CL[p.cls], h = { name: p.name, cls: p.cls, ci: 0, lvl: 1, xp: 0, str: p.str, dex: p.dex, con: p.con, kills: 0, eq: Object.assign({}, START[p.cls]) }; h.max = (c.hd1 || 1) * c.hd + conHP(h.con); h.hp = h.max; fillMem(h); return h; });
  const gear = {}; ORDER.forEach(c => gear[c] = { arms: 0, armor: 0 });
  return { v: 2, mode: 'six', day: 1, gold: 60, potions: 1, heroes, cohorts: [{ order: 'attack', spells: true }], gear, inv: [], pick: [0], fallen: 0, best: 0 };
}
function rollStats(cls) { const c = CL[cls], h = { str: roll4(), dex: roll4(), con: roll4() }; if (c.prime) h[c.prime] = Math.max(h[c.prime], roll4(), 12); return h; }
function randomName(used) { let n; do { n = N1[ri(N1.length) - 1] + N2[ri(N2.length) - 1]; } while (used && used[n]); return n; }
// Loot: a champion always carries something; otherwise now and then. Better things turn up on later days.
function rollLoot(S, b) {
  const out = [], top = clamp(1 + Math.floor(b.day / 8), 1, 3), pool = Object.values(ITEMS).filter(i => i.tier > 0 && i.tier <= top);
  let n = (b.bl.boss ? 1 : 0) + (ri(100) <= 30 ? 1 : 0);
  while (n-- > 0) out.push(pool[ri(pool.length) - 1].id);
  return out;
}
// What the quartermaster has today: all ordinary gear, and a few magic pieces that change daily.
function shopStock(day) {
  let s = day * 7919 + 17; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const top = clamp(1 + Math.floor(day / 8), 1, 3), pool = Object.values(ITEMS).filter(i => i.tier > 0 && i.tier <= top), magic = [];
  while (magic.length < 5 && magic.length < pool.length) { const i = pool[Math.floor(r() * pool.length)].id; if (!magic.includes(i)) magic.push(i); }
  return { plain: Object.values(ITEMS).filter(i => !i.tier).map(i => i.id), magic };
}
const raiseCost = h => 60 + 60 * h.lvl;
const healerCanRaise = S => S.raisedDay !== S.day && S.heroes.some(h => !h.dead && h.cls === 'cleric' && h.lvl >= 9);
function raise(h) { h.dead = false; h.hp = 1; h.raised = (h.raised || 0) + 1; delete h.diedDay; }
// Initiative for the party mode: everyone rolls each round and acts in that order.
function rollInit(b) {
  b.order = b.units.filter(u => u.hp > 0 && !u.illusion).map(u => ({ u, i: ri(10) + (u.h ? Math.floor((u.h.dex - 10) / 2) + (u.cls === 'thief' || u.cls === 'monk' ? 2 : u.cls === 'assassin' ? 1 : 0) : u.mv > 5 ? 1 : 0) + rnd() * .5 })).sort((a, c) => c.i - a.i).map(x => x.u);
  b.turn = 0;
}

/* ---------- side quests for The Six: a short crawl through three or four rooms, no rest between ---------- */
const WALL = { side: 'W', wall: true, hp: 0, st: {}, f: '' };
const PLACES = {
  crypt: { n: 'The Sunken Crypt', short: 'Crypt', blurb: 'Cold stone under the arena, older than the games. The dead do not rest there, and someone keeps them walking.',
    rooms: ['The Guard Room', 'The Crypt', 'The Flooded Cistern', 'The Vault'], boss: 'necromancer', bn: 'The Bone-Speaker',
    foes: [['cultist', 1], ['rat', 1], ['skeleton', 2], ['zombie', 4], ['slime', 5], ['ghoul', 7], ['cultpriest', 8], ['gargoyle', 12], ['wight', 16]] },
  tower: { n: 'The Leaning Tower', short: 'Tower', blurb: 'A sorcerer keeps four floors and a roof on the edge of the pits. He does not take visitors, and his servants are not all alive.',
    rooms: ['The Library', 'The Laboratory', 'The Menagerie', 'The Observatory'], boss: 'sorcerer', bn: 'Master Ilvane',
    foes: [['apprentice', 1], ['imp', 3], ['armour', 5], ['gargoyle', 10], ['golem', 14]] },
  slum: { n: 'Gutter Row', short: 'Gutter Row', blurb: 'The crooked street behind the arena where the handlers drink. A gang runs it from the yard at the far end.',
    rooms: ["Tanner's Row", 'The Narrows', "Ragpicker's Court", "Crake's Yard"], boss: 'gangboss', bn: 'Mother Crake',
    foes: [['thug', 1], ['cutpurse', 1], ['slinger', 2], ['hound', 3], ['bruiser', 6], ['wererat', 10]] },
  sewer: { n: 'The Under-Drains', short: 'Drains', blurb: 'Everything the arena washes away runs down here. Something has been calling the rats together, and they are not the worst of it.',
    rooms: ['The Outfall', 'The Long Drain', 'The Settling Tanks', "The Piper's Den"], boss: 'piper', bn: 'The Rat Piper',
    foes: [['rat', 1], ['leech', 1], ['cutpurse', 2], ['slime', 4], ['drowned', 5], ['wererat', 8], ['croc', 9]] },
  market: { n: 'The Lantern Market', short: 'Market', blurb: 'It opens at dusk and sells what the day market cannot. A fence keeps the peace there with hired swords, and takes a share of everything.',
    rooms: ['The Stalls', 'The Arcade', 'The Beast Pens', 'The Counting Yard'], boss: 'fence', bn: 'Madam Sable',
    foes: [['thug', 1], ['cutpurse', 1], ['sellsword', 2], ['mountebank', 3], ['hound', 4], ['bruiser', 6], ['duellist', 10]] },
  ship: { n: 'The Black Gull', short: 'Black Gull', blurb: 'A corsair galley lies at the river wharf, waiting on the tide with a hold full of other people\'s goods. Her captain does not expect company.',
    rooms: ['The Main Deck', 'The Gun Deck', 'The Hold', 'The Foredeck'], boss: 'captain', bn: 'Captain Marrow',
    foes: [['deckhand', 1], ['corsair', 2], ['harpooner', 3], ['bosun', 7], ['drowned', 9]] }
};
// Each new place is drawn in the manner of an older one: brick drains like the crypt, the market like the street, the ship like the tower.
const FAM = { sewer: 'crypt', market: 'slum', ship: 'tower' };
// A room: cells 0 = floor, 1 = wall (blocks sight), 2 = low obstacle, 3 = water. props are drawn things on blocked cells.
// Rooms are generated from a seed, so a quest's rooms differ every time but a resumed quest gets the same ones back.
const ROOMNAME = { pillars: 'The Pillared Hall', burial: 'The Burial Vault', cistern: 'The Flooded Cistern', catacomb: 'The Catacombs', cross: 'The Crossing', rubble: 'The Collapsed Gallery', partition: 'The Guard Rooms', sanctum: "The Bone-Speaker's Sanctum",
  library: 'The Library', lab: 'The Laboratory', menagerie: 'The Menagerie', study: 'The Inner Study', gallery: 'The Statue Gallery', armoury: 'The Armoury', observatory: 'The Observatory',
  row: "Tanner's Row", dogleg: 'Crooked Lane', market: 'The Night Market', narrows: 'The Narrows', canal: 'The Stink Canal', court: "Ragpicker's Court", yard: "Crake's Yard",
  channel: 'The Long Drain', junction: 'The Meeting of Waters', tanks: 'The Settling Tanks', pipes: 'The Outfall', weir: 'The Weir', den: "The Piper's Den",
  stalls: 'The Stalls', fountain: 'Fountain Square', arcade: 'The Arcade', pens: 'The Beast Pens', cloth: 'The Cloth Hall', counting: 'The Counting Yard',
  deck: 'The Main Deck', gundeck: 'The Gun Deck', hold: 'The Hold', galley: 'The Galley', berths: 'The Berths', foredeck: 'The Foredeck' };
const ROOMKINDS = { crypt: ['pillars', 'burial', 'cistern', 'catacomb', 'cross', 'rubble', 'partition'], tower: ['library', 'lab', 'menagerie', 'study', 'gallery', 'armoury'], slum: ['row', 'dogleg', 'market', 'narrows', 'canal', 'court'],
  sewer: ['channel', 'junction', 'tanks', 'pipes', 'weir'], market: ['stalls', 'fountain', 'arcade', 'pens', 'cloth'], ship: ['deck', 'gundeck', 'hold', 'galley', 'berths'] };
const ROOMLAST = { crypt: 'sanctum', tower: 'observatory', slum: 'yard', sewer: 'den', market: 'counting', ship: 'foredeck' };
function makeRoom(place, n, seed) {
  seed = seed || 1;
  for (let t = 0; t < 60; t++) { const R = genRoom(place, n, (seed * 131 + n * 977 + t * 7919 + 5) >>> 0, seed); if (R) return R; }
  return genRoom(place, n, 1, seed, true);
}
const rhash = (x, y) => { let v = (x * 374761393 + y * 668265263) >>> 0; v = ((v ^ (v >>> 13)) * 1274126177) >>> 0; return (v >>> 8) / 16777216; }; // the same hash the painters use to put doors on house fronts
function genRoom(place, n, sd, qseed, plain) {
  let s = sd; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296, rint = (a, b) => a + Math.floor(r() * (b - a + 1)), pick = a => a[Math.floor(r() * a.length)], TAU = Math.PI * 2;
  let R; const last = n === 3;
  const mk = (w, h, f) => { R = { place, n, w, h, cells: new Uint8Array(w * h).fill(f), props: [], decor: [], lights: [] }; };
  const get = (x, y) => x < 0 || y < 0 || x >= R.w || y >= R.h ? 1 : R.cells[y * R.w + x];
  const set = (x, y, k, p) => { if (x < 0 || y < 0 || x >= R.w || y >= R.h) return; R.props = R.props.filter(q => q.x !== x || q.y !== y); R.cells[y * R.w + x] = k; if (p) R.props.push({ x, y, k: p }); };
  const rect = (x0, y0, x1, y1, k, p) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, k, p); };
  let q = qseed * 7 + 3; const kinds = ROOMKINDS[place].slice(); for (let i = kinds.length - 1; i > 0; i--) { q = (q * 1664525 + 1013904223) >>> 0; const j = (q >>> 9) % (i + 1), t = kinds[i]; kinds[i] = kinds[j]; kinds[j] = t; }
  const kind = last ? ROOMLAST[place] : kinds[n];
  if (place === 'crypt') {
    const w = 13 + 2 * rint(0, 2), h = 9 + 2 * rint(0, 2), my = (h - 1) / 2; mk(w, h, 0);
    rect(0, 0, w - 1, 0, 1); rect(0, h - 1, w - 1, h - 1, 1); rect(0, 0, 0, h - 1, 1); rect(w - 1, 0, w - 1, h - 1, 1);
    R.door = [0, my]; set(0, my, 0); R.decor.push({ k: 'door', x: 0, y: my }, { k: 'exit', x: w - 1, y: my });
    if (!plain) switch (kind) {
      case 'pillars': { const sx = rint(2, 3), sy = rint(2, 3); for (let x = 3; x <= w - 3; x += sx) for (let y = 2; y <= h - 3; y += sy) if (r() > .18 && y !== my) set(x, y, 1, 'pillar'); break; }
      case 'burial': for (let x = 4; x <= w - 3; x += 3) for (const y0 of [2, h - 4]) if (r() > .2) { set(x, y0, 2, 'sarc'); set(x, y0 + 1, 2, 'sarc2'); } break;
      case 'cistern': { const pw = rint(3, 5), ph = rint(2, 3), px = rint(4, Math.max(4, w - 4 - pw)), py = rint(2, Math.max(2, h - 2 - ph)); rect(px, py, px + pw - 1, py + ph - 1, 3, 'water'); const bx = px + rint(0, pw - 1); for (let y = py; y < py + ph; y++) { set(bx, y, 0); R.decor.push({ k: 'bridge', x: bx, y }); }
        for (const [x, y] of [[px - 1, py - 1], [px + pw, py - 1], [px - 1, py + ph], [px + pw, py + ph]]) if (r() > .3 && x > 1 && y > 0 && x < w - 2 && y < h - 1) set(x, y, 1, 'pillar'); break; }
      case 'catacomb': for (let x = 3, i = rint(0, 1); x <= w - 3; x += 2, i++) { const len = rint(1, Math.max(1, my - 2)); if (i % 2) rect(x, 1, x, len, 1); else rect(x, h - 1 - len, x, h - 2, 1); } break;
      case 'cross': { const cx = rint(2, 4), cy = rint(1, Math.max(1, my - 2)); rect(1, 1, cx, cy, 1); rect(1, h - 1 - cy, cx, h - 2, 1); rect(w - 1 - cx, 1, w - 2, cy, 1); rect(w - 1 - cx, h - 1 - cy, w - 2, h - 2, 1);
        for (const [x, y] of [[Math.floor(w / 2) - 2, my - 2], [Math.floor(w / 2) + 2, my - 2], [Math.floor(w / 2) - 2, my + 2], [Math.floor(w / 2) + 2, my + 2]]) if (!get(x, y) && r() > .3) set(x, y, 1, 'pillar'); break; }
      case 'rubble': { const g = new Uint8Array(w * h); for (let y = 1; y < h - 1; y++) for (let x = 4; x < w - 1; x++) g[y * w + x] = r() < .34 ? 1 : 0;
        for (let it = 0; it < 2; it++) { const o = g.slice(); for (let y = 1; y < h - 1; y++) for (let x = 4; x < w - 1; x++) { let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (o[(y + dy) * w + x + dx] || x + dx >= w - 1 || y + dy <= 0 || y + dy >= h - 1) c++; g[y * w + x] = c >= 5 ? 1 : 0; } }
        for (let y = 1; y < h - 1; y++) for (let x = 4; x < w - 1; x++) if (g[y * w + x]) set(x, y, 1, r() < .5 ? 'rubble' : null); break; }
      case 'partition': for (const px of w >= 15 ? [Math.floor(w / 3), Math.floor(2 * w / 3)] : [Math.floor(w / 2)]) { rect(px, 1, px, h - 2, 1); const g1 = rint(1, h - 2); set(px, g1, 0); if (r() > .35) set(px, 1 + (g1 + rint(2, h - 4)) % (h - 2), 0); } break;
      case 'sanctum': { const px = Math.floor(w * .52); rect(px, 1, px, h - 2, 1); set(px, rint(1, my - 1), 0); set(px, rint(my + 1, h - 2), 0); set(w - 3, 2, 2, 'brazier'); set(w - 3, h - 3, 2, 'brazier'); R.decor.push({ k: 'dais', x: w - 4, y: my - 1, w: 3, h: 3 });
        for (const [x, y] of [[3, 2], [3, h - 3], [px - 2, 2], [px - 2, h - 3]]) if (r() > .25) set(x, y, 1, 'pillar'); break; }
    }
    for (let x = 2 + rint(0, 2); x < w - 1; x += rint(3, 4)) for (const y of [0, h - 1]) if (r() > .2) R.lights.push({ x: x + .5, y: y ? h - 1.1 : 1.1, cx: x, cy: y ? h - 2 : 1, r: 4.4, c: [1, .6, .26], k: 'torch', wx: x, wy: y });
    for (let i = rint(6, 10); i > 0; i--) { const x = rint(1, w - 2), y = rint(1, h - 2); if (!get(x, y)) R.decor.push({ k: pick(['bones', 'crack', 'moss', 'skull', 'stain', 'crack', 'moss']), x, y, v: r() }); }
  } else if (place === 'tower') {
    const sz = r() < .5 ? 13 : 15, c = (sz - 1) / 2, rad = c - .35; mk(sz, sz, 1); R.round = 1; R.rad = rad; R.c = c;
    const d2 = (x, y) => (x - c) * (x - c) + (y - c) * (y - c);
    for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) if (d2(x, y) <= rad * rad) set(x, y, 0);
    R.door = [Math.ceil(c - rad), c];
    const ring = (rr, step, fn) => { for (let a = r() * step; a < TAU; a += step) { const x = Math.round(c + Math.cos(a) * rr), y = Math.round(c + Math.sin(a) * rr); if (Math.abs(a - Math.PI) > .55 && !get(x, y)) fn(x, y, a); } };
    const adiff = (a, b) => Math.abs(((a - b) % TAU + TAU + Math.PI) % TAU - Math.PI);
    if (!plain) switch (kind) {
      case 'library': for (const rr of [rad - 1.5, rad - 3.3]) if (rr > 1.6) { const gap = r() * TAU, gap2 = r() * TAU; ring(rr, .8 / rr, (x, y, a) => { if (adiff(a, gap) > .5 && adiff(a, gap2) > .4) set(x, y, 1, 'shelf'); }); } break;
      case 'lab': for (let i = rint(4, 6); i > 0; i--) { const a = r() * TAU, rr = 2 + r() * (rad - 3.5), x = Math.round(c + Math.cos(a) * rr), y = Math.round(c + Math.sin(a) * rr); if (!get(x, y) && x > R.door[0] + 2) set(x, y, 2, i === 1 ? 'cauldron' : 'table'); } break;
      case 'menagerie': ring(rad - 2, TAU / 8, (x, y) => { if (r() > .2) set(x, y, 2, 'cage'); }); break;
      case 'study': { const gaps = [Math.PI, r() * TAU, r() * TAU]; for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) { const d = Math.sqrt(d2(x, y)); if (d >= 2.2 && d < 3.2 && !gaps.some(g => adiff(Math.atan2(y - c, x - c), g) < .42)) set(x, y, 1); } set(c, c, 2, 'table'); break; }
      case 'gallery': ring(rad - 1.8, TAU / 6, (x, y) => set(x, y, 1, 'statue')); break;
      case 'armoury': ring(rad - 1.2, TAU / 10, (x, y) => { if (r() > .3) set(x, y, 2, 'rack'); }); ring(rad - 3.4, TAU / 3, (x, y) => set(x, y, 2, 'crate')); break;
      case 'observatory': R.roof = 1; set(c, c, 2, 'orrery'); ring(rad - 2, TAU / 4, (x, y) => set(x, y, 2, 'brazier')); R.decor.push({ k: 'chart', x: c, y: c, r: rad - 1 }); break;
    }
    if (kind !== 'study' && kind !== 'observatory' && !get(c, c)) set(c, c, 1, 'stair');
    if (kind !== 'observatory') R.decor.push({ k: 'rug', x: c, y: c, v: rint(0, 2), r: kind === 'study' ? 1.6 : rint(2, 3) + .4 });
    for (let a = r(), st = TAU / rint(5, 7); a < TAU; a += st) { const x = c + Math.cos(a) * (rad - .5), y = c + Math.sin(a) * (rad - .5); R.lights.push({ x: x + .5, y: y + .5, cx: Math.round(x), cy: Math.round(y), r: R.roof ? 2.6 : 3.8, c: [1, .84, .52], k: 'candle' }); }
    for (let i = rint(5, 9); i > 0; i--) { const x = rint(1, sz - 2), y = rint(1, sz - 2); if (!get(x, y)) R.decor.push({ k: pick(['books', 'paper', 'paper', 'books', 'stain']), x, y, v: r() }); }
  } else if (place === 'sewer') { // brick drains: a walled room like the crypt's, cut up by channels of water
    const w = 15 + 2 * rint(0, 2), h = r() < .5 ? 9 : 11, my = (h - 1) / 2; mk(w, h, 0);
    rect(0, 0, w - 1, 0, 1); rect(0, h - 1, w - 1, h - 1, 1); rect(0, 0, 0, h - 1, 1); rect(w - 1, 0, w - 1, h - 1, 1);
    R.door = [0, my]; set(0, my, 0); R.decor.push({ k: 'door', x: 0, y: my }, { k: 'exit', x: w - 1, y: my });
    const span = (x, y) => { set(x, y, 0); R.decor.push({ k: 'bridge', x, y }); };
    if (!plain) switch (kind) {
      case 'channel': { rect(3, my + 1, w - 2, my + 2, 3, 'water'); for (const bx of [rint(4, 6), rint(w - 6, w - 4)]) { span(bx, my + 1); span(bx, my + 2); }
        for (let x = 4; x < w - 2; x += rint(3, 4)) if (r() > .3) set(x, 1 + rint(0, Math.max(0, my - 3)), 1, 'pillar'); break; }
      case 'junction': { const x0 = rint(5, w - 7); rect(2, my + 1, w - 2, my + 1, 3, 'water'); rect(x0, 1, x0 + 1, h - 2, 3, 'water'); span(x0, my); span(x0 + 1, my); span(x0, h - 2); span(x0 + 1, h - 2);
        span(rint(2, x0 - 1), my + 1); span(rint(x0 + 2, w - 3), my + 1); break; }
      case 'tanks': for (let x = 3; x < w - 4; x += rint(4, 5)) for (const y0 of [1, my + 1]) if (r() > .2) { const pw = rint(2, 3), ph = Math.min(rint(2, 3), my - 1); rect(x, y0 + (y0 === 1 ? 0 : 1), Math.min(w - 3, x + pw - 1), y0 + (y0 === 1 ? 0 : 1) + ph - 1, 3, 'water'); } break;
      case 'pipes': for (let x = 3; x <= w - 3; x += rint(2, 3)) for (let y = 2; y <= h - 3; y += rint(2, 3)) if (y !== my && r() > .35) { if (r() < .3) set(x, y, 3, 'water'); else set(x, y, 1, 'pillar'); } break;
      case 'weir': for (const px of w >= 17 ? [Math.floor(w / 3), Math.floor(2 * w / 3)] : [Math.floor(w / 2)]) { rect(px, 1, px, h - 2, 1); rect(px + 1, 1, px + 1, h - 2, 3, 'water'); const g1 = rint(1, h - 2), g2 = 1 + (g1 + rint(2, h - 4)) % (h - 2); for (const gy of [g1, g2]) { set(px, gy, 0); span(px + 1, gy); } } break;
      case 'den': { const px = Math.floor(w * .5); rect(px, 1, px + 1, h - 2, 3, 'water'); for (const by of [rint(1, my - 1), rint(my + 1, h - 2)]) { span(px, by); span(px + 1, by); } set(w - 3, 2, 2, 'brazier'); set(w - 3, h - 3, 2, 'brazier'); R.decor.push({ k: 'dais', x: w - 4, y: my - 1, w: 3, h: 3 });
        for (const [x, y] of [[3, 2], [3, h - 3], [px - 2, 2], [px - 2, h - 3]]) if (r() > .25) set(x, y, 1, 'pillar'); for (let i = 0; i < 3; i++) { const x = rint(px + 3, w - 5), y = rint(1, h - 2); if (!get(x, y) && Math.abs(y - my) > 1) set(x, y, 2, r() < .5 ? 'barrel' : 'crate'); } break; }
    }
    for (let x = 2 + rint(0, 2); x < w - 1; x += rint(3, 4)) for (const y of [0, h - 1]) if (r() > .3) R.lights.push({ x: x + .5, y: y ? h - 1.1 : 1.1, cx: x, cy: y ? h - 2 : 1, r: 4, c: [.86, .7, .3], k: 'torch', wx: x, wy: y });
    for (let i = rint(8, 12); i > 0; i--) { const x = rint(1, w - 2), y = rint(1, h - 2); if (!get(x, y)) R.decor.push({ k: pick(['grate', 'moss', 'puddle', 'moss', 'crack', 'bones', 'grate', 'stain']), x, y, v: r() }); }
  } else if (place === 'market') { // a square between house fronts, filled with stalls
    const w = 19 + 2 * rint(0, 2), h = r() < .5 ? 9 : 11, my = (h - 1) / 2; mk(w, h, 1);
    rect(1, 1, w - 2, h - 2, 0); R.door = [0, my]; set(0, my, 0);
    const free = (x, y) => !get(x, y) && Math.abs(y - my) > 0;
    if (!plain) switch (kind) {
      case 'stalls': for (const y of [2, h - 3]) for (let x = 3; x <= w - 3; x++) if (x % 4 !== 1 && r() > .15) set(x, y, 2, 'stall'); if (h > 9) for (let x = 5; x <= w - 5; x += 3) if (r() > .4) set(x, my + pick([-1, 1]), 2, pick(['cart', 'crate', 'barrel'])); break;
      case 'fountain': { const cx = Math.floor(w / 2); set(cx, my, 2, 'well'); for (const [dx, dy] of [[-3, -2], [3, -2], [-3, 2], [3, 2], [-6, -2], [6, 2], [-6, 2], [6, -2]]) if (r() > .2 && free(cx + dx, my + dy)) set(cx + dx, my + dy, 2, 'stall'); for (const x of [3, w - 4]) if (r() > .3) set(x, pick([1, h - 2]), 2, 'cart'); break; }
      case 'arcade': for (let x = 4; x < w - 5; x += rint(5, 6)) for (const y0 of [2, my + 2]) if (y0 + 1 <= h - 3 || y0 === 2) rect(x, y0, x + rint(1, 2), Math.min(h - 3, y0 + (h > 9 ? 1 : 0) + (y0 === 2 ? Math.max(0, my - 4) : 0)), 1); break;
      case 'pens': for (const y of [2, h - 3]) for (let x = 3; x <= w - 4; x++) if (x % 5 !== 0 && r() > .25) set(x, y, 2, 'cage'); for (let i = 0; i < 3; i++) { const x = rint(4, w - 4), y = pick([1, h - 2]); if (!get(x, y)) set(x, y, 2, 'barrel'); } break;
      case 'cloth': for (let x = 4; x <= w - 4; x += 3) { const gap = rint(1, h - 2); for (let y = 1; y <= h - 2; y++) if (y !== my && Math.abs(y - gap) > 0 && r() > .25) set(x, y, 2, r() < .25 ? 'table' : 'rack'); } break;
      case 'counting': { const px = w - 8; for (let y = 1; y <= h - 2; y++) if (Math.abs(y - my) > 1 && r() > .2) set(px, y, 2, pick(['stall', 'crate', 'crate'])); set(w - 3, 2, 2, 'brazier'); set(w - 3, h - 3, 2, 'brazier'); set(w - 5, my - 2, 2, 'table'); set(w - 5, my + 2, 2, 'table'); set(w - 2, 1, 2, 'crate'); set(w - 2, h - 2, 2, 'barrel');
        for (let x = 4; x < px - 1; x += 3) if (r() > .3) set(x, pick([2, h - 3]), 2, 'stall'); break; }
    }
    for (let i = rint(2, 5); i > 0; i--) { const x = rint(3, w - 3), y = rint(1, h - 2); if (free(x, y) && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(d => get(x + d[0], y + d[1]) === 2)) set(x, y, 2, pick(['crate', 'barrel', 'crate'])); }
    for (let x = 2 + rint(0, 2); x < w - 1; x += rint(4, 5)) R.lights.push({ x: x + .5, y: 1.15, cx: x, cy: 1, r: 4.8, c: [1, .74, .36], k: 'lamp', wx: x, wy: 0 });
    for (let x = 4 + rint(0, 3); x < w - 3; x += rint(5, 7)) if (!get(x, 1) && !get(x, h - 2)) R.decor.push({ k: 'wash', x, y0: 1, y1: h - 2, v: r(), lamps: 1 });
    for (let i = rint(5, 8); i > 0; i--) { const x = rint(1, w - 2), y = rint(1, h - 2); if (!get(x, y)) R.decor.push({ k: pick(['refuse', 'crack', 'puddle', 'refuse', 'stain']), x, y, v: r() }); }
  } else if (place === 'ship') { // a hull, blunt at the stern where the party boards and narrowing to the bow
    const w = r() < .5 ? 21 : 23, h = 9, my = 4; mk(w, h, 1); R.hull = 1;
    const half = x => x < 1 || x > w - 2 ? -1 : x === 1 ? 2 : x <= w - 8 ? 3 : 3 - Math.ceil((x - (w - 8)) / 2);
    for (let x = 1; x < w - 1; x++) for (let y = my - half(x); y <= my + half(x); y++) set(x, y, 0);
    R.door = [0, my]; set(0, my, 0); const m1 = 6, m2 = w - 10;
    if (!plain) switch (kind) {
      case 'deck': R.roof = 1; set(m1, my, 2, 'mast'); set(m2, my, 2, 'mast'); for (const x of [rint(3, 4), m1 + rint(3, 4), m2 + rint(2, 3)]) R.decor.push({ k: 'hatch', x, y: my + pick([-1, 1]) }); for (let x = 3; x <= w - 9; x += rint(2, 4)) if (r() > .35) set(x, pick([1, 7]), 2, pick(['barrel', 'crate', 'barrel'])); break;
      case 'gundeck': set(m1, my, 2, 'mast'); set(m2, my, 2, 'mast'); for (let x = 3; x <= w - 9; x += 3) for (const y of [1, 7]) if (r() > .15) set(x, y, 2, 'cannon'); for (let i = 0; i < 3; i++) { const x = rint(4, w - 9), y = pick([3, 5]); if (!get(x, y)) set(x, y, 2, 'barrel'); } break;
      case 'hold': set(m1, my, 2, 'mast'); set(m2, my, 2, 'mast'); for (let x = 3; x <= w - 7; x++) for (let y = 1; y <= 7; y++) if (y !== my && !get(x, y) && r() < (x % 4 < 2 ? .42 : .08)) set(x, y, 2, pick(['crate', 'crate', 'barrel'])); break;
      case 'galley': set(m1, my, 2, 'mast'); set(m2, my, 2, 'mast'); for (let x = 4; x <= w - 9; x += 2) if (r() > .25) set(x, pick([2, 6]), 2, 'table'); set(w - 8, my - 2, 2, 'brazier'); for (const y of [1, 7]) for (let x = 3; x < 9; x += 2) if (r() > .4) set(x, y, 2, 'barrel'); break;
      case 'berths': set(m2, my, 2, 'mast'); for (const px of [Math.floor(w / 3), Math.floor(w * .58)]) { for (let y = 1; y <= 7; y++) set(px, y, 1); const g1 = rint(1, 7); set(px, g1, 0); set(px, 1 + (g1 + rint(2, 5)) % 7, 0); } for (let i = 0; i < 4; i++) { const x = rint(3, w - 9), y = pick([1, 7]); if (!get(x, y)) set(x, y, 2, 'crate'); } break;
      case 'foredeck': R.roof = 1; set(m1, my, 2, 'mast'); set(m2 - 1, my, 2, 'wheel'); set(w - 7, my - 2, 2, 'brazier'); set(w - 7, my + 2, 2, 'brazier'); for (const y of [1, 7]) { set(w - 10, y, 2, 'cannon'); if (r() > .3) set(m1 + 3, y, 2, 'cannon'); } for (let i = 0; i < 3; i++) { const x = rint(3, m2 - 3), y = pick([2, 6]); if (!get(x, y)) set(x, y, 2, pick(['crate', 'barrel'])); } R.decor.push({ k: 'hatch', x: 4, y: my - 1 }); break;
    }
    for (let x = 3 + rint(0, 1); x < w - 3; x += rint(3, 4)) for (const s2 of [-1, 1]) { const y = my + s2 * half(x); if (r() > .25 && !get(x, y)) R.lights.push({ x: x + .5, y: y + .5 + s2 * .3, cx: x, cy: y, r: R.roof ? 3 : 3.8, c: [1, .82, .5], k: 'candle' }); }
    for (let i = rint(5, 8); i > 0; i--) { const x = rint(2, w - 4), y = rint(1, 7); if (!get(x, y)) R.decor.push({ k: pick(['rope', 'stain', 'rope', 'puddle', 'paper']), x, y, v: r() }); }
  } else {
    const w = 19 + 2 * rint(0, 2), h = r() < .5 ? 9 : 11; mk(w, h, 1);
    let yc = Math.floor(h / 2) + rint(-1, 0); const wd = rint(2, 3), ys = new Int8Array(w), jogs = [];
    for (let i = kind === 'dogleg' ? 2 : rint(0, 1); i > 0; i--) jogs.push(rint(5, w - 7));
    const lane = (x, y) => rect(x, y - 1, x, y + wd - 2, 0);
    for (let x = 0; x < w; x++) { if (jogs.includes(x)) { const ny = clamp(yc + pick([-2, -1, 1, 2]), 2, h - 2 - wd + 1); rect(x, Math.min(yc, ny) - 1, x, Math.max(yc, ny) + wd - 2, 0); yc = ny; } lane(x, yc); ys[x] = yc; }
    R.door = [0, ys[0]];
    const x0 = rint(6, w - 12);
    if (!plain) switch (kind) {
      case 'market': rect(x0, Math.max(1, ys[x0] - 2), x0 + 6, Math.min(h - 2, ys[x0] + 2), 0); for (let i = 0; i < 3; i++) for (const yy of [Math.max(1, ys[x0] - 2), Math.min(h - 2, ys[x0] + 2)]) if (r() > .2) set(x0 + 1 + 2 * i, yy, 2, 'stall'); break;
      case 'narrows': for (let x = x0; x < x0 + 4; x++) for (let y = 1; y < h - 1; y++) if (y !== ys[x] && !get(x, y)) set(x, y, 1); break;
      case 'canal': { for (let y = 0; y < h; y++) { set(x0, y, 3, 'water'); set(x0 + 1, y, 3, 'water'); } const by = ys[x0] - rint(0, 1); for (let y = by; y < by + rint(1, 2); y++) for (const x of [x0, x0 + 1]) { set(x, y, 0); R.decor.push({ k: 'bridge', x, y }); } break; }
      case 'court': rect(x0, 2, x0 + 5, h - 3, 0); set(x0 + 2 + rint(0, 1), Math.floor(h / 2), 2, 'well'); break;
      case 'yard': rect(w - 8, 1, w - 2, h - 2, 0); rect(w - 1, 0, w - 1, h - 1, 1); set(w - 3, 2, 2, 'brazier'); set(w - 3, h - 3, 2, 'brazier'); set(w - 6, 2, 2, 'crate'); set(w - 7, h - 3, 2, 'barrel'); break;
    }
    for (let i = rint(2, 4); i > 0; i--) { const x = rint(4, w - 4), dir = pick([-1, 1]); let y = dir < 0 ? ys[x] - 2 : ys[x] + wd - 1; const len = rint(1, 4); for (let k = 0; k < len && y > 0 && y < h - 1; k++, y += dir) if (get(x, y) !== 3) set(x, y, 0); if (r() < .35 && y > 1 && y < h - 2) rect(x, Math.min(y, y - dir), x + 1, Math.max(y, y - dir), 0); }
    for (let i = rint(3, 6); i > 0; i--) { const x = rint(4, w - 2), y = rint(1, h - 2); if (!get(x, y) && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(d => get(x + d[0], y + d[1]) === 2)) set(x, y, 2, pick(['crate', 'barrel', 'cart', 'crate', 'barrel'])); }
    for (let x = 2 + rint(0, 2); x < w - 1; x += rint(4, 6)) { let y = ys[x] - 1; while (y > 0 && get(x, y) !== 1) y--; if (get(x, y) === 1 && !get(x, y + 1)) R.lights.push({ x: x + .5, y: y + 1.15, cx: x, cy: y + 1, r: 4.6, c: [1, .7, .34], k: 'lamp', wx: x, wy: y }); }
    for (let x = 4 + rint(0, 3); x < w - 3; x += rint(5, 8)) { let a = ys[x], b = ys[x]; while (get(x, a - 1) === 0) a--; while (get(x, b + 1) === 0) b++; if (b - a >= 1 && b - a <= 4) R.decor.push({ k: 'wash', x, y0: a, y1: b, v: r() }); }
    for (let i = rint(6, 10); i > 0; i--) { const x = rint(1, w - 2), y = rint(1, h - 2); if (!get(x, y)) R.decor.push({ k: pick(['puddle', 'puddle', 'refuse', 'crack', 'puddle']), x, y, v: r() }); }
  }
  for (const p of R.props) if (p.k === 'brazier' || p.k === 'cauldron' || p.k === 'orrery') R.lights.push({ x: p.x + .5, y: p.y + .5, cx: p.x, cy: p.y, r: p.k === 'cauldron' ? 3.2 : 4.2, c: p.k === 'cauldron' ? [.4, 1, .5] : p.k === 'orrery' ? [1, .86, .5] : [1, .58, .24], k: p.k });
  R.lights = R.lights.filter(l => get(l.cx, l.cy) !== 1);
  // everything the party must reach has to be reachable from the door
  if (get(R.door[0], R.door[1])) return null;
  const dist = new Int16Array(R.w * R.h).fill(-1), queue = [R.door[1] * R.w + R.door[0]]; dist[queue[0]] = 0;
  for (let i = 0; i < queue.length; i++) { const cc = queue[i], cx = cc % R.w, cy = (cc - cx) / R.w; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = cx + dx, y = cy + dy; if ((dx || dy) && !get(x, y) && dist[y * R.w + x] < 0) { dist[y * R.w + x] = dist[cc] + 1; queue.push(y * R.w + x); } } }
  if (queue.length < 40) return null;
  R.entry = queue.slice(0, 9).reverse().map(i => [i % R.w, Math.floor(i / R.w)]);
  const far = queue[queue.length - 1]; R.bossAt = [far % R.w, Math.floor(far / R.w)];
  R.spawn = queue.filter(i => dist[i] >= 5 && i !== far).map(i => [i % R.w, Math.floor(i / R.w)]);
  if (R.spawn.length < 14 || dist[far] < 8) return null;
  R.doors = []; // house doors on the street that a hero can try
  if (place === 'slum' || place === 'market') for (let y = 0; y < R.h - 1; y++) for (let x = 0; x < R.w; x++) if (get(x, y) === 1 && get(x, y + 1) !== 1 && rhash(x + 7, y + 3) < .28) R.doors.push([x, y]);
  R.kind = plain ? 'plain' : kind; R.name = plain ? PLACES[place].rooms[n] : ROOMNAME[kind];
  return R;
}
function startRoom(S) {
  const q = S.quest, P = PLACES[q.place], last = q.room === P.rooms.length - 1, d = S.day + 2 * ((S.q || {})[q.place] || 0);
  const R = makeRoom(q.place, q.room, q.seed), B0 = budget(d) * 6 / (10 * gateCap(d)) * TUNE.six, vet = 1 + (veteran(d) - 1) * .4;
  const b = { six: true, quest: true, room: R, day: S.day, w: R.w, h: R.h, units: [], round: 1, log: [], fx: [], over: null, xp: 0, gold: 0, dead: [], cis: [0], doors: [], last };
  b.grid = new Array(b.w * b.h).fill(null); R.cells.forEach((k, i) => { if (k) b.grid[i] = WALL; });
  let id = 1;
  const hs = S.heroes.filter(h => !h.dead && h.hp > 0).map(h => heroUnit(S, h, id++)).sort((a, c) => CL[a.cls].front - CL[c.cls].front);
  hs.forEach((u, i) => place(b, u, R.entry[i][0], R.entry[i][1]));
  const want = Math.max(B0 * [.45, .55, .65, .45][q.room], 14 + 6 * q.room), av = P.foes.filter(f => f[1] <= d).map(f => f[0]).sort((a, c) => MON[c].cost - MON[a].cost);
  const cnt = {}, es = [];
  for (const mid of [av[ri(Math.min(2, av.length)) - 1], av[ri(av.length) - 1]]) cnt[mid] = (cnt[mid] || 0) + clamp(Math.round(want * .5 / MON[mid].cost), 1, 4);
  for (const mid in cnt) for (let i = 0; i < cnt[mid]; i++) es.push(foeUnit(mid, id++, false, null, vet));
  for (let i = R.spawn.length - 1; i > 0; i--) { const j = ri(i + 1) - 1, t = R.spawn[i]; R.spawn[i] = R.spawn[j]; R.spawn[j] = t; }
  { const far = R.spawn.filter(c => R.entry.every(e => Math.max(Math.abs(e[0] - c[0]), Math.abs(e[1] - c[1])) >= 7)); if (far.length >= es.length + 8) R.spawn = far; } // out of sight of the door, where the room allows
  es.forEach((e, i) => place(b, e, R.spawn[i][0], R.spawn[i][1]));
  // Nobody in the room knows the party is there yet. One or two walk a beat.
  let beats = 0; const rest = R.spawn.slice(es.length);
  for (const e of es) { e.una = true; if (!e.range && beats < 2 && ri(3) === 1) { const to = rest.find(c => { const k = Math.max(Math.abs(c[0] - e.x), Math.abs(c[1] - e.y)); return k >= 4 && k <= 9; }); if (to) { e.pat = [to, [e.x, e.y]]; beats++; } } }
  // Traps in the floor and a chest or two. Both are saved with the battle, so a resumed room keeps them.
  b.traps = []; b.chests = [];
  const open = () => { const seen = new Uint8Array(b.w * b.h), qu = [R.door[1] * b.w + R.door[0]]; seen[qu[0]] = 1; for (let i = 0; i < qu.length; i++) { const cx = qu[i] % b.w, cy = (qu[i] - cx) / b.w; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = cx + dx, y = cy + dy, k = y * b.w + x; if (inb(b, x, y) && !seen[k] && b.grid[k] !== WALL) { seen[k] = 1; qu.push(k); } } } return qu.length; };
  const total = open(), isBossAt = (x, y) => x === R.bossAt[0] && y === R.bossAt[1];
  for (let i = rest.length - 1, n = (last || ri(100) <= 65 ? 1 : 0) + (ri(100) <= 20 ? 1 : 0); i >= 0 && n > 0; i--) { // a chest must not wall anything off
    const [x, y] = rest[i]; if (at(b, x, y) || isBossAt(x, y) || ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(d => R.cells[(y + d[1]) * b.w + x + d[0]] === 1)) continue;
    b.grid[idx(b, x, y)] = WALL; if (open() !== total - 1) { b.grid[idx(b, x, y)] = null; continue; }
    b.chests.push({ x, y, lock: ri(100) <= 70, trap: ri(100) <= 30 }); n--;
  }
  for (let i = 0, n = ri(3) - 1 + (q.room >= 2 ? 1 : 0); i < rest.length && n > 0; i++) { const [x, y] = rest[i]; if (at(b, x, y) || isBossAt(x, y)) continue; b.traps.push({ x, y, k: ['spike', 'spike', 'snare', 'alarm'][ri(4) - 1] }); n--; }
  if (last) { const boss = foeUnit(P.boss, id++, true, P.bn, vet * (d < 6 ? .55 : d < 12 ? .8 : 1), 1.2); place(b, boss, R.bossAt[0], R.bossAt[1]); boss.una = true; es.unshift(boss); }
  b.bl = { title: P.n + ': ' + R.name, foes: Object.keys(cnt).map(k => ({ id: k, count: cnt[k] })), boss: last ? P.boss : null, bn: P.bn, purse: 0, sides: 1, vet, six: true };
  const xs = R.entry.map(e => e[0]), ys = R.entry.map(e => e[1]);
  b.zone = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  b.units = hs.concat(es); b.nid = id;
  say(b, P.n + ', ' + R.name + ': ' + billingText(b.bl) + '. They have not seen you yet.');
  for (const u of hs) spot(b, u, u.x, u.y);
  return b;
}
// Settle one room. Wounds and spent spells carry into the next; the downed get back up at 1 hit point.
function finishRoom(S, b, fled) {
  const q = S.quest, res = { win: b.over === 'win', fled: !!fled, xp: 0, gold: 0, down: [], dead: [], loot: [], last: b.last };
  const up = [];
  for (const u of b.units) {
    if (u.side !== 'H' || u.illusion) continue;
    u.h.left = u.sp; u.h.fought = (u.h.fought || 0) + 1;
    if (u.hp <= 0 && u.down) { u.h.hp = 1; u.h.downs = (u.h.downs || 0) + 1; res.down.push(u.name); } else if (u.hp <= 0) { u.h.dead = true; u.h.hp = 0; u.h.diedDay = b.day; S.fallen++; res.dead.push(u.name + ' the ' + CL[u.cls].n); } else { u.h.hp = u.hp; up.push(u); }
  }
  if (res.win) {
    res.xp = up.length ? Math.floor(b.xp * .6 / up.length) : 0; for (const u of up) u.h.xp += res.xp;
    res.gold = b.gold; q.gold += b.gold;
    if (b.last || ri(100) <= 25) { const top = clamp(1 + Math.floor(b.day / 8), 1, 3), pool = Object.values(ITEMS).filter(i => i.tier > 0 && i.tier <= top); res.loot.push(pool[ri(pool.length) - 1].id); q.loot.push(res.loot[0]); }
    if (b.last) { res.chest = 40 + 15 * (b.day + 2 * ((S.q || {})[q.place] || 0)); q.gold += res.chest; }
    q.room++;
  }
  return res;
}
// Healers spend what cures they have left on the worst hurt. Returns hit points restored.
function tend(S) {
  let n = 0; const alive = living(S);
  for (const c of alive) while (c.left && (c.left.cure > 0 || c.left.loh > 0)) {
    const t = alive.filter(h => h.hp < h.max).sort((a, d) => a.hp / a.max - d.hp / d.max)[0]; if (!t) return n;
    if (c.left.cure > 0) c.left.cure--; else c.left.loh--;
    const k = Math.min(t.max - t.hp, c.left.loh >= 0 && !(c.left.cure >= 0) ? 3 + 2 * c.lvl : dice([1, 8, c.lvl])); t.hp += k; n += k;
  }
  return n;
}
// how: 'done' (cleared), 'back' (turned back, keeps the takings), 'lost' (beaten or fled: the takings are gone)
function endQuest(S, how) {
  const q = S.quest, out = { how, gold: how === 'lost' ? 0 : q.gold, loot: how === 'lost' ? [] : q.loot, place: q.place };
  S.gold += out.gold; S.inv.push(...out.loot);
  S.q = S.q || {}; if (how === 'done') S.q[q.place] = (S.q[q.place] || 0) + 1;
  S.questDay = S.day; delete S.quest;
  for (const h of S.heroes) { delete h.left; if (!h.dead) h.hp = h.max; }
  return out;
}
function beginQuest(S, place) { S.quest = { place, room: 0, gold: 0, loot: [], seed: ri(999999) }; for (const h of S.heroes) delete h.left; }

/* ---------- one-use scrolls, and the doors they are found behind ---------- */
const SCROLLS = { sfire: { n: 'Scroll of Fire', spell: 'fireball' }, ssleep: { n: 'Scroll of Slumber', spell: 'sleep' }, smend: { n: 'Scroll of Mending', spell: 'cure' }, sbolt: { n: 'Scroll of Lightning', spell: 'lightning' } };
// Anyone can read a scroll. It casts as a 5th-level caster would, or better if the reader is.
// A wand holds charges of one spell. Only those who keep a spellbook can use one; it casts as a 6th-level caster would.
const WANDS = { wdart: { n: 'Wand of Missiles', spell: 'missile', ch: 8, cost: 350 }, wweb: { n: 'Wand of Webs', spell: 'web', ch: 5, cost: 400 }, whold: { n: 'Wand of Binding', spell: 'hold', ch: 5, cost: 450 }, wfire: { n: 'Wand of Fire', spell: 'fireball', ch: 3, cost: 700 } };
// Potions beyond healing. Drinking one is the hero's action; t is how many rounds it lasts.
const POTS = { pmight: { n: 'Potion of Giant Strength', st: 'might', t: 5, cost: 70, note: '+1 to hit and +3 damage for five rounds.' }, phaste: { n: 'Potion of Speed', st: 'haste', t: 4, cost: 90, note: 'Three more squares and one more blow, for four rounds.' },
  pstone: { n: 'Potion of Stoneskin', st: 'stone', t: 5, cost: 80, note: 'Four points harder to hit for five rounds.' }, phide: { n: 'Potion of Shadows', st: 'hide', t: 5, cost: 80, note: 'For five rounds the unwary cannot notice the drinker, and archers cannot pick them out.' } };
const USE = id => SCROLLS[id] || WANDS[id];
function quaff(b, u, S, id) {
  const p = POTS[id]; if (!p || !S.pots || !(S.pots[id] > 0) || u.acted || u.st[p.st]) return false;
  S.pots[id]--; u.acted = true; u.st[p.st] = p.t + 1; if (p.st === 'haste') u.mv += 3;
  fx(b, { k: 'txt', a: [u.x, u.y], s: p.st === 'might' ? 'strength' : p.st === 'haste' ? 'speed' : p.st === 'stone' ? 'stoneskin' : 'shadows', c: '#9fd0ff' }); say(b, u.name + ' drinks a ' + p.n + '.'); return true;
}
// Put a scroll, potion or wand in the party's pack. Returns what it is called.
function gain(S, id) {
  if (id === 'potion') { S.potions++; return 'healing potion'; }
  if (POTS[id]) { S.pots = S.pots || {}; S.pots[id] = (S.pots[id] || 0) + 1; return POTS[id].n; }
  if (WANDS[id]) { S.wands = S.wands || {}; S.wands[id] = (S.wands[id] || 0) + WANDS[id].ch; return WANDS[id].n; }
  S.bag = S.bag || {}; S.bag[id] = (S.bag[id] || 0) + 1; return SCROLLS[id].n;
}
const anyOf = o => { const k = Object.keys(o); return k[ri(k.length) - 1]; };
function readScroll(b, u, S, id, x, y) {
  const sc = USE(id), store = SCROLLS[id] ? S.bag : S.wands; if (!sc || !store || !(store[id] > 0) || u.acted || (WANDS[id] && !BOOK[u.cls])) return false;
  const had = u.sp[sc.spell], lv = u.lvl; u.sp[sc.spell] = (had || 0) + 1; u.lvl = Math.max(lv, WANDS[id] ? 6 : 5);
  const ok = cast(b, u, sc.spell, x, y); u.lvl = lv;
  if (!ok) { if (had == null) delete u.sp[sc.spell]; else u.sp[sc.spell] = had; return false; }
  if (had == null && !u.sp[sc.spell]) delete u.sp[sc.spell];
  store[id]--; return true;
}

/* ---------- traps in the floor, and locked chests ---------- */
const trapAt = (b, x, y) => b.traps ? b.traps.find(t => t.x === x && t.y === y && !t.gone) : null;
// A thief or assassin gets one look at each trap that comes within two squares.
function spot(b, u, x, y) {
  if (!b.traps || !nimble(u)) return;
  for (const t of b.traps) {
    if (t.found || t.gone || Math.max(Math.abs(t.x - x), Math.abs(t.y - y)) > 2 || !los(b, x, y, t.x, t.y) || (t.tried || (t.tried = {}))[u.id]) continue;
    t.tried[u.id] = 1;
    if (ri(100) <= clamp((u.cls === 'thief' ? 55 : 40) + 5 * u.lvl, 5, 95)) { t.found = true; fx(b, { k: 'txt', a: [t.x, t.y], s: 'trap', c: '#ffd86a' }); say(b, u.name + ' spots a trap in the floor.'); }
  }
}
function spring(b, u, t) {
  t.gone = true; t.found = true; t.sprung = true; b.sprung = (b.sprung || 0) + 1; const N = u.name; fx(b, { k: 'txt', a: [t.x, t.y], s: 'trap!', c: '#ff5a4a' });
  if (t.k === 'alarm') { say(b, N + ' treads on a loose flagstone. Somewhere a bell rings, and the whole place is awake.'); rouse(b, u, 99, true); }
  else if (t.k === 'snare') { u.st.root = 2; say(b, 'A snare closes on ' + N + "'s ankle."); hurt(b, u, ri(3), null); }
  else { let dm = dice([1 + Math.floor(b.day / 8), 6, 0]); if (ri(20) + u.lvl + 2 * dexAC(u.h.dex) >= 15) dm /= 2; say(b, 'Spikes come up through the floor under ' + N + '.'); hurt(b, u, dm, null); }
}
// A thief or assassin next to a known trap takes it apart, as their action. A bad fumble sets it off.
function disarm(b, u, x, y) {
  const t = trapAt(b, x, y); if (!t || !t.found || !nimble(u) || u.acted || dist(u, t) > 1) return false;
  u.acted = true; const r = ri(100), ch = clamp((u.cls === 'thief' ? 55 : 40) + 6 * u.lvl, 5, 95);
  if (r <= ch) { t.gone = true; b.xp += 10 + 4 * b.day; fx(b, { k: 'txt', a: [t.x, t.y], s: 'disarmed', c: '#7dff8a' }); say(b, u.name + ' disarms the trap.'); }
  else if (r > 90) { say(b, u.name + ' fumbles the trap.'); spring(b, u, t); }
  else say(b, u.name + ' cannot work the trap out yet.');
  return true;
}
// Anyone can try a chest. A thief picks the lock quietly; the rest force it, and the noise carries.
function openChest(b, u, S, x, y) {
  const c = (b.chests || []).find(q => q.x === x && q.y === y), N = u.name, thief = nimble(u);
  if (!c || c.open || u.acted || dist(u, c) > 1) return null;
  u.acted = true; b.lag = 2400; const res = { x, y, who: N, what: 'chest' };
  if (c.lock) {
    const ch = thief ? clamp((u.cls === 'thief' ? 50 : 35) + 6 * u.lvl, 5, 95) : clamp(20 + 12 * strDmg(u.h.str) + (CL[u.cls].hd >= 10 ? 15 : 0), 5, 80);
    if (!thief) rouse(b, c, 6, true);
    if (ri(100) > ch) { res.k = 'locked'; res.cap = thief ? `A good lock. ${N}'s pick slips; another try may do it.` : `${N} heaves at the lid. It holds, and <b class="bad">the noise carries</b>. A thief could pick it quietly.`; say(b, N + (thief ? ' fails to pick the lock on a chest.' : ' fails to force a chest.')); return res; }
    c.lock = false;
  }
  let hit = '';
  if (c.trap) { c.trap = false; if (thief && ri(100) <= 50 + 5 * u.lvl) hit = ` ${N} finds a needle in the lock and snaps it off.`; else { const dm = ri(4) + 1 + Math.floor(b.day / 6); hit = ` A needle in the lock pricks ${N} for <b class="bad">${dm}</b>.`; hurt(b, u, dm, null, '#9be36a'); } }
  c.open = true; b.opened = b.opened || {}; b.opened[x + ',' + y] = 1; res.k = 'treasure';
  const g = 12 + ri(16) + 4 * b.day, r = ri(100); if (S.quest) S.quest.gold += g; else S.gold += g;
  let item = '';
  if (r <= 22) item = 'a ' + gain(S, 'potion'); else if (r <= 50) item = 'a ' + gain(S, anyOf(POTS)); else if (r <= 70) item = 'a ' + gain(S, anyOf(SCROLLS)); else if (r <= 80) item = 'a ' + gain(S, anyOf(WANDS));
  else if (r <= 87 && S.quest) { const top = clamp(1 + Math.floor(b.day / 8), 1, 3), pool = Object.values(ITEMS).filter(i => i.tier > 0 && i.tier <= top), id = pool[ri(pool.length) - 1].id; S.quest.loot.push(id); item = ITEMS[id].n; }
  res.cap = `The lid comes up on <b class="gold">${g} gp</b>${item ? ` and <b class="gold">${item}</b>` : ''}.${hit}`;
  say(b, N + ' opens a chest: ' + g + ' gp' + (item ? ' and ' + item : '') + '.'); return res;
}
const DOORTALK = ['"Please. Take what you want and go."', '"They are in the yard. All of them. That is all I know."', '"Crake pays the watch. Nobody is coming."', '"You are from the arena. I saw you fight. I had money on you."', '"Shut the door. They will see the light."'];
// A hero next to a house door tries it, as their action. Behind it: someone hiding, something worth taking, a trap, or trouble.
function openDoor(b, u, S, x, y) {
  const R = b.room; if (!R || !R.doors || !R.doors.some(d => d[0] === x && d[1] === y) || u.acted || Math.max(Math.abs(u.x - x), Math.abs(u.y - y)) > 1) return null;
  b.opened = b.opened || {}; if (b.opened[x + ',' + y]) return null;
  b.opened[x + ',' + y] = 1; u.acted = true; b.lag = 2400;
  const r = ri(100), res = { x, y, who: u.name };
  if (r <= 35) { res.k = 'citizen'; res.text = R.place === 'slum' ? DOORTALK[ri(DOORTALK.length) - 1] : DOORTALK[[0, 3, 4][ri(3) - 1]]; if (ri(100) <= 35) { res.gold = ri(10) + 4; S.gold += res.gold; } say(b, u.name + ' opens a door on someone hiding.' + (res.gold ? ' They press ' + res.gold + ' gp into ' + u.name + "'s hand." : '')); }
  else if (r <= 65) { res.k = 'treasure'; if (ri(100) <= 30) res.item = 'a ' + gain(S, ri(2) === 1 ? 'potion' : anyOf(POTS)); else { const ids = Object.keys(SCROLLS), id = ids[ri(ids.length) - 1]; S.bag = S.bag || {}; S.bag[id] = (S.bag[id] || 0) + 1; res.item = 'a ' + SCROLLS[id].n; } say(b, u.name + ' finds ' + res.item + ' behind a door.'); }
  else if (r <= 85) { res.k = 'trap'; if (u.cls === 'thief' || u.cls === 'assassin') { res.safe = true; say(b, u.name + ' spots the wire across the doorway and steps over it.'); } else { res.dmg = ri(2); say(b, 'A trap behind the door catches ' + u.name + ' for ' + res.dmg + '.'); hurt(b, u, res.dmg, null); } }
  else { res.k = 'ambush'; let spot = null;
    for (let d = 1; d <= 3 && !spot; d++) for (let yy = y - d; yy <= y + d && !spot; yy++) for (let xx = x - d; xx <= x + d; xx++) if (inb(b, xx, yy) && !at(b, xx, yy)) { spot = [xx, yy]; break; }
    if (spot) { const e = foeUnit(ri(2) === 1 ? 'thug' : 'cutpurse', b.nid++, false, null, b.bl.vet); e.acted = true; b.units.push(e); place(b, e, spot[0], spot[1]); res.foe = e.name; say(b, 'A ' + e.name + ' was waiting behind the door.'); } else { res.k = 'citizen'; res.text = DOORTALK[0]; } }
  return res;
}

// Things in a room that a hero standing beside them can try: house doors, bookshelves, sarcophagi.
function thingAt(b, x, y) {
  const R = b.room; if (!R) return null;
  if (R.doors && R.doors.some(d => d[0] === x && d[1] === y)) return 'door';
  if (b.chests && b.chests.some(c => c.x === x && c.y === y)) return 'chest';
  const p = R.props.find(q => q.x === x && q.y === y); return p && (p.k === 'shelf' || p.k === 'sarc') ? p.k : null;
}
function interact(b, u, S, x, y) {
  const what = thingAt(b, x, y); if (!what) return null; if (what === 'door') { const r = openDoor(b, u, S, x, y); if (r) r.what = 'door'; return r; }
  if (what === 'chest') return openChest(b, u, S, x, y);
  if (u.acted || Math.max(Math.abs(u.x - x), Math.abs(u.y - y)) > 1) return null;
  b.opened = b.opened || {}; if (b.opened[x + ',' + y]) return null;
  b.opened[x + ',' + y] = 1; u.acted = true; b.lag = 2400;
  const r = ri(100), res = { x, y, who: u.name, what }, N = u.name;
  const riser = mid => { for (let d = 1; d <= 3; d++) for (let yy = y - d; yy <= y + d; yy++) for (let xx = x - d; xx <= x + d; xx++) if (inb(b, xx, yy) && !at(b, xx, yy)) { const e = foeUnit(mid, b.nid++, false, null, b.bl.vet); e.acted = true; b.units.push(e); place(b, e, xx, yy); res.k = 'ambush'; res.fig = mid; return e.name; } return null; };
  const scroll = () => { const ids = Object.keys(SCROLLS), id = ids[ri(ids.length) - 1]; S.bag = S.bag || {}; S.bag[id] = (S.bag[id] || 0) + 1; return SCROLLS[id].n; };
  if (what === 'shelf') {
    if (r <= 28) { res.k = 'treasure'; res.cap = `Tucked behind the folios: <b class="gold">a ${scroll()}</b>. ${N} takes it.`; }
    else if (r <= 48) { const ks = BOOK[u.cls] ? Object.keys(u.sp).filter(id => SPELLS[id] && BOOK[u.cls].some(q => q[0] === id)) : []; res.k = 'page';
      if (ks.length) { const id = ks[ri(ks.length) - 1]; u.sp[id]++; res.cap = `A page of the master's own notes. ${N} can cast <b class="gold">${SPELLS[id].n}</b> once more today.`; } else { const g = ri(6) + 2; S.gold += g; res.cap = `Notes ${N} cannot read, and <b class="gold">${g} gp</b> pressed flat between the pages.`; } }
    else if (r <= 70) { res.k = 'nothing'; res.cap = 'Dust, bad poetry, and a treatise on the breeding of imps.'; }
    else if (r <= 86) { res.k = 'curse'; u.st.stun = 1; res.cap = `The book opens itself. ${N} cannot look away, and <b class="bad">loses the next turn</b>.`; }
    else { const nm = riser('imp'); res.cap = nm ? 'Something was nesting behind the books. An <b class="bad">Imp</b> bursts out.' : 'Something scuttles away behind the books.'; if (!nm) res.k = 'nothing'; }
  } else {
    if (r <= 34) { const g = ri(18) + 7; S.gold += g; res.k = 'gold'; res.cap = `Grave goods. ${N} takes <b class="gold">${g} gp</b> from hands that no longer need it.`; }
    else if (r <= 46) { S.potions++; res.k = 'treasure'; res.cap = `Buried with a physician's kit. ${N} takes <b class="gold">a healing potion</b>.`; }
    else if (r <= 74) { res.k = 'nothing'; res.cap = 'Dust and a few teeth. Someone got here first.'; }
    else { const nm = riser(b.day >= 7 && ri(2) === 1 ? 'ghoul' : 'skeleton'); res.cap = nm ? `The lid slides back and a <b class="bad">${nm}</b> sits up.` : 'The lid will not move.'; if (!nm) res.k = 'nothing'; }
  }
  say(b, N + (what === 'shelf' ? ' searches a bookshelf.' : ' opens a sarcophagus.') + (res.k === 'ambush' ? ' Something was inside.' : ''));
  return res;
}

/* ---------- odds, shown before the player commits ---------- */
function preview(b, u, t, ranged) {
  const c = CL[u.cls], L = u.lvl, note = []; let n = 1, plus = u.db || 0, mult = 1;
  if (ranged) { if (u.cls === 'ranger' && L >= 5) n = 2; } else if (u.cls === 'fighter' && t.hd < 1) n = L; else if ((u.cls === 'fighter' || u.cls === 'paladin' || u.cls === 'ranger') && L >= 7) n = 2; else if (u.cls === 'monk' && L >= 3) n = 2;
  if (u.st.haste) n++; if (u.st.might) plus += 3;
  if (u.cls === 'ranger' && t.f && t.f.includes('g')) { plus += L; note.push('favoured foe'); }
  if (u.cls === 'monk') plus += Math.floor(L / 2);
  if (!ranged && nimble(u) && (flanked(b, t, u) || t.una)) { mult = L < 5 ? 2 : L < 9 ? 3 : 4; note.push('backstab'); }
  if (t.una) note.push('unaware');
  if (u.bane && t.f && t.f.includes(u.bane)) { mult *= 2; note.push('bane'); }
  if (t.st.sleep) { mult *= 2; note.push('asleep'); }
  const d = ranged ? u.rd || c.rdmg : u.wd || c.dmg; let lo = d[0] + (d[2] || 0) + plus, hi = d[0] * d[1] + (d[2] || 0) + plus;
  if (u.fire) { lo += u.fire[0]; hi += u.fire[0] * u.fire[1]; }
  const need = u.thac0 - t.ac - (t.st.stun ? 4 : 0) - (u.st.bless ? 1 : 0) - (t.una ? 4 : 0) - (u.st.might ? 1 : 0);
  return { pct: t.st.sleep ? 100 : clamp(Math.round((21 - need) * 5), 5, 95), lo: Math.max(1, lo * mult), hi: Math.max(1, hi * mult), n, note: note.join(', ') };
}
/* ---------- a battle in progress, as plain data so it can be saved and picked up again ---------- */
function packBattle(b) {
  const o = {}; for (const k in b) if (!['units', 'grid', 'fx', 'room', 'order', 'dead'].includes(k)) o[k] = b[k];
  o.units = b.units.map(u => { const c = Object.assign({}, u); if (u.h) { c.hname = u.h.name; delete c.h; } delete c.m; return c; });
  o.order = b.order ? b.order.map(u => u.id) : null; o.dead = b.dead.map(u => u.id); o.hasRoom = !!b.room; return o;
}
function unpackBattle(S, o) {
  const b = Object.assign({}, o, { fx: [], lag: 0 }), byId = {};
  b.units = o.units.map(c => { const u = Object.assign({}, c); if (c.hname != null) u.h = S.heroes.find(h => h.name === c.hname); if (u.mid) u.m = MON[u.mid]; byId[u.id] = u; return u; });
  if (b.units.some(u => u.side === 'H' && !u.illusion && !u.h) || b.units.some(u => u.side === 'E' && !u.m)) return null;
  if (o.hasRoom) { if (!S.quest) return null; b.room = makeRoom(S.quest.place, S.quest.room, S.quest.seed); if (b.room.w !== b.w || b.room.h !== b.h) return null; }
  b.grid = new Array(b.w * b.h).fill(null); if (b.room) b.room.cells.forEach((k, i) => { if (k) b.grid[i] = WALL; });
  for (const c of b.chests || []) b.grid[idx(b, c.x, c.y)] = WALL;
  for (const u of b.units) if (u.hp > 0) b.grid[idx(b, u.x, u.y)] = u;
  b.order = o.order ? o.order.map(id => byId[id]).filter(Boolean) : null; b.dead = o.dead.map(id => byId[id]).filter(Boolean);
  return b;
}

if (typeof module !== 'undefined') module.exports = { CL, ORDER, MON, SCHED, SPELLS, TUNE, TIER, TIERCOST, FINAL, ITEMS, SLOTS, BOOK, migrate, redeploy, inZone, veteran, newParty, rollStats, randomName, equip, unequip, kit, sixAC, fillMem, slotsFor, rollInit, foeAct, heroAct, endRound, shopStock, raise, raiseCost, preview, packBattle, unpackBattle, FAM, SCROLLS, WANDS, POTS, USE, quaff, gain, readScroll, trapAt, spot, disarm, openChest, rouse, moveTo, heroAttack, flood, cast, openDoor, thingAt, interact, PLACES, makeRoom, startRoom, finishRoom, endQuest, beginQuest, tend, los, newCampaign, startBattle, autoRound, finishBattle, billing, billingText, budget, gateCap, living, canTrain, trainCost, levelUp, checkOver, xpNeed, roman };
