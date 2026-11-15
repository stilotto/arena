'use strict';
/* Figures: one drawn sprite per calling and per foe, cached on small canvases.
   Used by the skycam and by the portraits in the panels. Everything faces right; the caller flips.
   Drawing space: 1 unit = one grid cell, feet at (0, 0), up is negative y. */
const FIG = (() => {
  const INK = '#1a1410', STEEL = '#cfd6de', IRON = '#8f979f', WOOD = '#6b4a2a', GOLD = '#d2aa52', BONE = '#e8e0cc', TAU = Math.PI * 2;
  let g;
  const path = pts => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); };
  const paint = (fill, stroke) => { if (fill) { g.fillStyle = fill; g.fill(); } if (stroke !== 0) { g.strokeStyle = stroke || INK; g.stroke(); } };
  const poly = (pts, fill, stroke) => { path(pts); g.closePath(); paint(fill, stroke); };
  const circ = (x, y, r, fill, stroke) => { g.beginPath(); g.arc(x, y, r, 0, TAU); paint(fill, stroke); };
  const ell = (x, y, rx, ry, fill, stroke, rot) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); paint(fill, stroke); };
  const line = (pts, col, w) => { g.lineCap = 'round'; path(pts); g.strokeStyle = INK; g.lineWidth = w + .04; g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.stroke(); g.lineWidth = .022; };
  const glow = (x, y, r, c) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${c},.95)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
  const eye = (x, y, c) => { if (c) { glow(x, y, .075, c); circ(x, y, .02, `rgb(${c})`, 0); } else circ(x, y, .015, INK, 0); };

  function weapon(k, x, y, o) {
    const blade = m => { poly([[x - .025, y], [x + .1 * m, y - .5 * m], [x + .15 * m, y - .58 * m], [x + .05, y - .02]], o.steel || STEEL); line([[x - .07, y - .03], [x + .1, y - .075]], GOLD, .035); };
    switch (k) {
      case 'sword': blade(1); break;
      case 'gsword': blade(1.45); break;
      case 'dagger': blade(.48); break;
      case 'scimitar': g.beginPath(); g.moveTo(x - .02, y); g.quadraticCurveTo(x + .3, y - .2, x + .2, y - .58); g.quadraticCurveTo(x + .12, y - .25, x + .04, y - .03); g.closePath(); paint(STEEL); line([[x - .06, y - .02], [x + .08, y - .06]], GOLD, .03); break;
      case 'mace': line([[x - .02, y + .07], [x + .1, y - .38]], WOOD, .04); circ(x + .12, y - .45, .08, IRON); for (let a = 0; a < 6; a++) line([[x + .12 + Math.cos(a) * .08, y - .45 + Math.sin(a) * .08], [x + .12 + Math.cos(a) * .12, y - .45 + Math.sin(a) * .12]], IRON, .02); break;
      case 'club': poly([[x - .04, y + .1], [x + .03, y + .1], [x + .26, y - .5], [x + .16, y - .6], [x + .05, y - .56]], WOOD); circ(x + .16, y - .42, .02, INK, 0); circ(x + .1, y - .5, .02, INK, 0); break;
      case 'axe': line([[x - .04, y + .18], [x + .13, y - .62]], WOOD, .04); poly([[x + .07, y - .4], [x + .3, y - .44], [x + .36, y - .62], [x + .3, y - .78], [x + .12, y - .64]], STEEL); break;
      case 'spear': line([[x - .1, y + .5], [x + .12, y - .75]], WOOD, .03); poly([[x + .08, y - .73], [x + .16, y - .76], [x + .155, y - .95]], STEEL); break;
      case 'glaive': line([[x - .1, y + .5], [x + .12, y - .8]], '#2a2226', .035); poly([[x + .08, y - .7], [x + .26, y - .8], [x + .2, y - 1.12], [x + .13, y - .82]], o.steel || STEEL); break;
      case 'staff': line([[x, y + .5], [x + .03, y - .62]], WOOD, .035); if (o.orb) { glow(x + .03, y - .68, .16, o.orb); circ(x + .03, y - .68, .055, `rgb(${o.orb})`); } else { circ(x - .02, y - .66, .05, '#4f9a4a'); circ(x + .07, y - .68, .05, '#6fbf5a'); circ(x + .03, y - .73, .05, '#4f9a4a'); } break;
      case 'bow': g.lineCap = 'round'; g.beginPath(); g.arc(x - .4, y, .42, -1.1, 1.1); g.strokeStyle = INK; g.lineWidth = .075; g.stroke(); g.strokeStyle = WOOD; g.lineWidth = .04; g.stroke(); g.lineWidth = .012; path([[x - .4 + .42 * Math.cos(1.1), y - .42 * Math.sin(1.1)], [x - .4 + .42 * Math.cos(1.1), y + .42 * Math.sin(1.1)]]); g.strokeStyle = '#eee'; g.stroke(); g.lineWidth = .022; break;
      case 'claws': for (const d of [-.05, 0, .05]) line([[x, y + d], [x + .11, y + d * 1.6 - .02]], BONE, .018); break;
      case 'orb': glow(x + .02, y - .15, .2, o.orb); circ(x + .02, y - .15, .06, `rgb(${o.orb})`); break;
    }
  }
  function shield(s) {
    if (s.k === 'scutum') { poly([[-.31, -.72], [-.05, -.74], [-.04, -.24], [-.3, -.22]], s.c); line([[-.18, -.7], [-.17, -.26]], s.e || GOLD, .014); circ(-.175, -.48, .05, s.e || GOLD); }
    else if (s.k === 'round') { circ(-.17, -.52, .18, s.c); circ(-.17, -.52, .12, 0, s.e || GOLD); circ(-.17, -.52, .045, s.e || GOLD); }
    else { poly([[-.31, -.74], [-.05, -.74], [-.05, -.5], [-.18, -.18], [-.31, -.5]], s.c); glow(-.18, -.54, .1, '210,170,82'); circ(-.18, -.54, .045, s.e || GOLD); }
  }
  function wings(c, c2) {
    poly([[.05, -.7], [.5, -1.25], [.7, -.9], [.45, -.62]], c2 || c);
    poly([[-.05, -.7], [-.55, -1.3], [-.82, -.92], [-.62, -.78], [-.72, -.45], [-.46, -.52], [-.3, -.3]], c);
    path([[-.05, -.7], [-.62, -.78]]); g.stroke(); path([[-.05, -.7], [-.46, -.52]]); g.stroke();
  }
  function head(o, skin) {
    const x = .02, y = -.875, r = .115 * (o.headR || 1), hm = o.metal || STEEL;
    if (o.hood) circ(x - .035, y - .005, r + .05, o.hood);
    if (o.hair) circ(x - .03, y - .02, r + .022, o.hair);
    if (o.horns) { line([[x - .07, y - .08], [x - .2, y - .16], [x - .2, y - .32]], o.horns, .04); line([[x + .07, y - .08], [x + .2, y - .16], [x + .22, y - .32]], o.horns, .04); }
    if (o.head === 'ears') poly([[x - .08, y - .04], [x - .27, y - .13], [x - .09, y + .05]], skin);
    circ(x, y, r, skin);
    if (o.head === 'ears') poly([[x + .0, y - .03], [x - .13, y - .17], [x - .05, y + .03]], skin);
    if (o.head === 'snout' || o.head === 'bull') { ell(x + .11, y + .035, .09, .06, skin); circ(x + .16, y + .02, .012, INK, 0); }
    if (o.head === 'nose') poly([[x + .08, y - .03], [x + .24, y + .07], [x + .08, y + .05]], skin);
    if (o.head === 'tusks') { poly([[x + .02, y + .08], [x + .04, y - .0], [x + .06, y + .08]], '#fff'); poly([[x + .07, y + .08], [x + .09, y + .01], [x + .105, y + .07]], '#fff'); line([[x - .02, y - .05], [x + .1, y - .04]], INK, .012); }
    if (o.head === 'skull') { circ(x + .055, y - .01, .032, INK, 0); circ(x - .03, y - .01, .028, INK, 0); for (let i = 0; i < 4; i++) path([[x + i * .03 - .01, y + .06], [x + i * .03 - .01, y + .105]]), g.stroke(); if (o.eyes) eye(x + .055, y - .01, o.eyes); }
    else if (!o.visor) { eye(x + .06, y - .015, o.eyes); if (o.eyes) eye(x - .02, y - .015, o.eyes); }
    if (o.beard) poly([[x - .07, y + .05], [x + .1, y + .045], [x + .07, y + .23], [x - .01, y + .19]], o.beard);
    if (o.mask) poly([[x - .11, y + .005], [x + .115, y + .005], [x + .1, y + .115], [x - .08, y + .115]], o.mask);
    const dome = (rr, c) => { g.beginPath(); g.arc(x, y, rr, Math.PI * .97, Math.PI * 2.03); g.closePath(); paint(c); };
    switch (o.helm) {
      case 'cap': dome(r + .014, hm); break;
      case 'hoodup': dome(r + .035, o.hood); break;
      case 'crest': g.beginPath(); g.arc(x, y, r + .085, Math.PI * 1.08, Math.PI * 1.92); g.arc(x, y, r, Math.PI * 1.92, Math.PI * 1.08, true); g.closePath(); paint(o.crest || '#b3312a'); dome(r + .014, hm); poly([[x - .11, y], [x - .04, y], [x - .05, y + .1], [x - .1, y + .08]], hm); break;
      case 'full': poly([[x - .16, y - .12], [x - .34, y - .2], [x - .3, y + .06], [x - .1, y - .02]], o.plume || '#fff'); circ(x, y, r + .014, hm); path([[x + .01, y - .02], [x + .125, y - .02]]); g.lineWidth = .03; g.stroke(); g.lineWidth = .022; path([[x + .06, y - .02], [x + .06, y + .11]]); g.stroke(); if (o.eyes) eye(x + .07, y - .02, o.eyes); break;
      case 'hat': poly([[x - .13, y - .07], [x + .13, y - .07], [x + .02, y - .3], [x - .13, y - .46]], o.hat); ell(x, y - .07, .2, .045, o.hat); line([[x - .11, y - .11], [x + .11, y - .11]], o.band || GOLD, .02); break;
      case 'crown': poly([[x - .1, y - .07], [x - .11, y - .2], [x - .05, y - .13], [x, y - .22], [x + .05, y - .13], [x + .11, y - .2], [x + .1, y - .07]], GOLD); break;
      case 'flame': for (const [dx, hgt] of [[-.09, .2], [-.03, .32], [.04, .26], [.09, .16]]) poly([[x + dx - .05, y - .06], [x + dx + .05, y - .06], [x + dx - .02, y - .06 - hgt]], '#ff8a2a', 0); glow(x, y - .15, .22, '255,170,60'); break;
    }
  }
  function human(o) {
    const w = o.w || 1, skin = o.skin || '#e2c29a', top = o.top || '#777', sl = o.sleeve || top, legs = o.legs || '#3a2c22', hd = o.hand || [.27, -.5], bt = o.boots || '#2a1f18';
    g.save(); if (o.lean) g.transform(1, 0, -o.lean, 1, 0, 0);
    if (o.wings) wings(o.wings, o.wings2);
    if (o.cloak) poly([[-.13 * w, -.75], [.08, -.75], [-.06, -.3], [-.3 * w, -.08], [-.26 * w, -.5]], o.cloak);
    if (o.tail) line([[-.1, -.4], [-.28, -.2], [-.38, -.3]], o.tail, .05);
    if (o.quiver) { poly([[-.21, -.86], [-.13, -.88], [-.06, -.5], [-.14, -.48]], WOOD); for (const d of [0, .035, .07]) line([[-.2 + d, -.89], [-.215 + d, -.99]], '#eee', .012); }
    if (o.armsOut) line([[-.02, -.68], [.26, -.74]], sl, .085 * w);
    else if (!o.shield) line([[-.11 * w, -.68], [-.2 * w, -.52], [-.17 * w, -.36]], sl, .085 * w);
    if (o.weapon2) weapon(o.weapon2, -.17 * w, -.36, o);
    if (o.float) poly([[-.17, -.75], [.17, -.75], [.24, -.3], [.12, -.02], [.04, -.22], [-.05, .0], [-.13, -.2], [-.26, -.03], [-.22, -.4]], top);
    else if (o.robe) { poly([[-.17 * w, -.75], [.17 * w, -.75], [.25 * w, -.02], [-.25 * w, -.02]], top); if (o.trim) poly([[-.243 * w, -.09], [.243 * w, -.09], [.25 * w, -.02], [-.25 * w, -.02]], o.trim); }
    else {
      const st = o.stride || 0;
      line([[-.07 * w, -.42], [-.09 * w - st, -.05]], legs, .1 * w); line([[.07 * w, -.42], [.09 * w + st, -.05]], legs, .1 * w);
      if (!o.barefoot) { ell(-.07 * w - st, -.035, .085 * w, .04, bt); ell(.11 * w + st, -.035, .085 * w, .04, bt); }
      poly([[-.17 * w, -.75], [.17 * w, -.75], [.15 * w, -.36], [-.15 * w, -.36]], top);
    }
    if (o.armour === 'plate') {
      const m = o.metal || STEEL;
      for (let i = -2; i <= 2; i++) poly([[i * .062 * w - .028, -.46], [i * .062 * w + .028, -.46], [i * .062 * w + .028, -.3], [i * .062 * w - .028, -.3]], o.skirt || '#8e2a22');
      poly([[-.168 * w, -.75], [.168 * w, -.75], [.14 * w, -.45], [-.14 * w, -.45]], m);
      path([[-.1 * w, -.62], [.1 * w, -.62]]); g.stroke(); path([[-.1 * w, -.53], [.1 * w, -.53]]); g.stroke();
      circ(-.165 * w, -.72, .062, m); circ(.165 * w, -.72, .062, m);
    } else if (o.armour === 'chain') { poly([[-.168 * w, -.75], [.168 * w, -.75], [.15 * w, -.36], [-.15 * w, -.36]], '#9aa3ab'); g.strokeStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 5; i++) { path([[-.15 * w, -.7 + i * .075], [.15 * w, -.7 + i * .075]]); g.stroke(); } }
    else if (o.armour === 'leather') poly([[-.155 * w, -.75], [.155 * w, -.75], [.13 * w, -.4], [-.13 * w, -.4]], o.vest || '#7a5632');
    else if (o.armour === 'ribs') { for (let i = 0; i < 4; i++) { path([[-.12, -.69 + i * .075], [.12, -.69 + i * .075]]); g.stroke(); } path([[0, -.74], [0, -.4]]); g.stroke(); }
    if (o.tabard) { poly([[-.09, -.75], [.09, -.75], [.09, -.24], [-.09, -.24]], o.tabard); if (o.emblem) circ(0, -.56, .045, o.emblem, 0); }
    if (o.sash) poly([[-.165 * w, -.45], [.165 * w, -.45], [.16 * w, -.38], [-.16 * w, -.38]], o.sash);
    head(o, skin);
    if (o.weapon) weapon(o.weapon, hd[0], hd[1], o);
    line([[.12 * w, -.68], [(hd[0] + .12 * w) / 2, (hd[1] - .68) / 2 + .05], hd], sl, .085 * w);
    circ(hd[0], hd[1], .042 * w, skin);
    if (o.shield) shield(o.shield);
    g.restore();
  }
  function beast(o) {
    const L = o.len, h = o.h, c = o.col, d = o.dark, lw = o.leg || .07;
    if (o.tail) line([[-L * .45, -h * .65], [-L * .7, -h * (o.tailUp ? .95 : .5)], [-L * .88, -h * (o.tailUp ? 1.1 : .32)]], o.tailCol || c, o.tailW || .04);
    if (o.tuft) circ(-L * .88, -h * (o.tailUp ? 1.1 : .32), .07, o.tuft);
    for (const x of [-L * .32, L * .28]) line([[x + .05, -h * .5], [x + .08, -.03]], d, lw);
    ell(0, -h * .62, L * .5, h * .3, c);
    for (const x of [-L * .32, L * .28]) line([[x - .03, -h * .5], [x - .05, -.03]], c, lw);
    if (o.mane) circ(L * .36, -h * .8, h * .34, o.mane);
    if (o.ear === 'round') circ(L * .5, -h * 1.03, h * .1, c); else poly([[L * .46, -h * .98], [L * .44, -h * 1.22], [L * .57, -h * 1.02]], c);
    ell(L * .53, -h * .85, h * .26, h * .2, c, INK, -.2);
    ell(L * .53 + h * .24, -h * .79, h * .17, h * .1, c, INK, .1);
    eye(L * .57, -h * .9, o.eye);
    if (o.fangs) { poly([[L * .53 + h * .26, -h * .72], [L * .53 + h * .3, -h * .72], [L * .53 + h * .28, -h * .6]], '#fff'); }
  }
  function spider() {
    const c = '#2b2420';
    const hips = [.2, .14, .08, .02], knees = [.42, .2, -.16, -.44], feet = [.64, .32, -.28, -.66];
    for (let i = 0; i < 4; i++) line([[hips[i], -.3], [knees[i] + .04, -.56], [feet[i] + .06, -.03]], '#1a1512', .03);
    ell(-.24, -.34, .32, .25, c); poly([[-.3, -.42], [-.18, -.42], [-.21, -.33], [-.15, -.24], [-.33, -.24], [-.27, -.33]], '#b3312a', 0);
    ell(.16, -.29, .18, .14, c);
    for (let i = 0; i < 4; i++) line([[hips[i], -.3], [knees[i], -.66], [feet[i], -.02]], c, .035);
    for (const [x, y] of [[.27, -.33], [.31, -.29], [.22, -.36]]) eye(x, y, '255,60,40');
    line([[.32, -.24], [.36, -.14]], BONE, .02); line([[.27, -.22], [.3, -.12]], BONE, .02);
  }
  function drake(o) {
    const c = o.col;
    poly([[-.1, -.9], [.3, -1.75], [.75, -1.55], [.5, -1.2], [.7, -1.0], [.2, -.85]], o.wing2);
    line([[-.4, -.6], [-.9, -.5], [-1.2, -.75], [-1.36, -.62]], c, .12);
    if (o.sting) poly([[-1.36, -.7], [-1.3, -.56], [-1.5, -.5]], BONE); else poly([[-1.34, -.72], [-1.3, -.52], [-1.52, -.62]], c);
    if (o.four) line([[.3, -.5], [.42, -.22], [.36, -.03]], o.wing2, .11);
    line([[-.18, -.5], [-.2, -.2], [-.26, -.03]], o.wing2, .12);
    ell(0, -.65, .5, .3, c); ell(.05, -.53, .38, .15, o.belly, 0);
    if (o.four) line([[.2, -.5], [.3, -.22], [.24, -.03]], c, .11);
    line([[-.28, -.5], [-.32, -.2], [-.38, -.03]], c, .13);
    line([[.35, -.8], [.58, -1.15], [.8, -1.3]], c, .17);
    line([[.74, -1.42], [.6, -1.56]], o.horn || BONE, .03); line([[.8, -1.44], [.7, -1.6]], o.horn || BONE, .03);
    poly([[.7, -1.44], [1.12, -1.32], [1.12, -1.24], [.74, -1.16]], c);
    for (let i = 0; i < 4; i++) poly([[.86 + i * .06, -1.22], [.9 + i * .06, -1.22], [.88 + i * .06, -1.15]], '#fff', 0);
    eye(.86, -1.34, o.eye || '255,210,60');
    if (o.fire) { glow(1.2, -1.24, .22, '255,150,40'); poly([[1.12, -1.3], [1.42, -1.2], [1.12, -1.2]], '#ffb040', 0); }
    poly([[-.05, -.9], [-.5, -1.85], [-1.0, -1.5], [-.7, -1.25], [-.95, -.95], [-.45, -.9], [-.3, -.7]], o.wing);
    path([[-.05, -.9], [-.7, -1.25]]); g.stroke(); path([[-.05, -.9], [-.45, -.9]]); g.stroke();
  }
  function chimera() {
    poly([[-.1, -.8], [-.55, -1.4], [-.85, -1.05], [-.5, -.85]], '#7a4a3a');
    line([[-.15, -.75], [-.3, -1.15], [-.12, -1.35]], '#4f7a4a', .12); poly([[-.2, -1.45], [.12, -1.4], [.12, -1.33], [-.16, -1.26]], '#4f7a4a'); eye(-.04, -1.39, '255,210,60');
    line([[.12, -.75], [.2, -1.1]], '#cfc6b0', .11); ell(.26, -1.18, .13, .09, '#cfc6b0', INK, .2); line([[.2, -1.24], [.08, -1.42]], BONE, .03); line([[.26, -1.26], [.18, -1.46]], BONE, .03); eye(.3, -1.2); poly([[.3, -1.1], [.36, -1.1], [.32, -.98]], '#cfc6b0');
    beast({ len: 1.35, h: .9, col: '#c79a4e', dark: '#8f6c34', mane: '#7a4a22', tail: 1, tailUp: 1, tuft: '#7a4a22', ear: 'round', eye: '255,210,60', fangs: 1, leg: .1 });
  }

  const H = (s, o) => ({ o, w: .8 * s * (o.wide || 1), h: (o.tall || 1.34) * s, draw() { g.scale(s, s); human(o); } });
  const B = (s, o) => ({ w: (o.len * .5 + o.h * .55 + .1) * s, h: o.h * 1.32 * s, draw() { g.scale(s, s); beast(o); } });
  const gob = { skin: '#7da04a', head: 'ears', armour: 'leather', top: '#5a4632', legs: '#3a3024', w: .95 };
  const DEF = {
    fighter: H(1, { top: '#8e2a22', armour: 'plate', metal: '#aeb9c6', helm: 'crest', weapon: 'sword', shield: { k: 'scutum', c: '#b3312a' }, legs: '#6a4a36' }),
    paladin: H(1, { top: '#f6f0dc', armour: 'plate', metal: '#f0dc8a', skirt: '#f6f0dc', helm: 'full', plume: '#fff', cloak: '#f6f0dc', weapon: 'sword', shield: { k: 'kite', c: '#f6f0dc' }, legs: '#8a7a56' }),
    ranger: H(1, { top: '#4f8a44', armour: 'leather', cloak: '#3f6f38', hood: '#3f6f38', helm: 'hoodup', quiver: 1, weapon: 'bow', hand: [.3, -.58], legs: '#5a4632' }),
    cleric: H(1, { top: '#9aa3ab', armour: 'chain', tabard: '#f2f2f7', emblem: GOLD, helm: 'cap', weapon: 'mace', shield: { k: 'round', c: '#f2f2f7' }, legs: '#6a6a72' }),
    druid: H(1, { top: '#3f9f78', robe: 1, trim: '#2f6f55', sash: WOOD, hood: '#2f6f55', beard: '#8a6a44', hair: '#8a6a44', weapon: 'staff', sleeve: '#3f9f78' }),
    mage: H(1, { top: '#6c8be0', robe: 1, trim: GOLD, sash: GOLD, helm: 'hat', hat: '#4a66c0', beard: '#e8e8e8', weapon: 'staff', orb: '150,210,255' }),
    illusionist: H(1, { top: '#c77be0', robe: 1, trim: '#7a3a9a', sash: '#7a3a9a', hood: '#7a3a9a', helm: 'hoodup', weapon: 'orb', orb: '255,170,255', hand: [.26, -.62] }),
    thief: H(1, { top: '#d9a441', armour: 'leather', vest: '#8a6030', hood: '#8a6030', helm: 'hoodup', weapon: 'dagger', lean: .12, stride: .05, legs: '#4a3a2a', hand: [.28, -.52] }),
    assassin: H(1, { top: '#4a5058', sleeve: '#4a5058', cloak: '#2a2e34', hood: '#2a2e34', helm: 'hoodup', mask: '#2a2e34', weapon: 'dagger', weapon2: 'dagger', sash: '#8e2a22', lean: .1, stride: .04, legs: '#2a2e34' }),
    monk: H(1, { top: '#e07b3a', robe: 1, sash: '#7a2a1a', trim: '#b85a22', skin: '#d9b08a', hand: [.34, -.66], sleeve: '#e07b3a', tall: 1.1 }),

    kobold: H(.62, { skin: '#b0603a', head: 'snout', horns: '#e8dcc0', tail: '#b0603a', top: '#6a5a3a', weapon: 'spear', legs: '#b0603a', barefoot: 1, lean: .08, headR: 1.15 }),
    goblin: H(.76, Object.assign({ weapon: 'club', headR: 1.15 }, gob)),
    gobarcher: H(.76, Object.assign({ weapon: 'bow', quiver: 1, hand: [.3, -.58], headR: 1.15 }, gob)),
    skeleton: H(.98, { skin: BONE, top: '#d8d0bc', sleeve: BONE, legs: BONE, boots: BONE, head: 'skull', armour: 'ribs', weapon: 'sword', steel: '#9a8a6a', w: .8 }),
    orc: H(1.06, { skin: '#6f8a5a', head: 'tusks', top: '#3a3430', armour: 'leather', vest: '#4a3a30', weapon: 'axe', w: 1.15, legs: '#2a2420', hair: '#1a1410' }),
    zombie: H(1, { skin: '#8a9a7a', top: '#6a5a48', sleeve: '#8a9a7a', legs: '#4a4238', armsOut: 1, hand: [.3, -.64], lean: .1, barefoot: 1, hair: '#3a3428' }),
    hobgoblin: H(1.1, { skin: '#c8663a', head: 'ears', top: '#2a2a30', armour: 'plate', metal: '#4a4a55', skirt: '#2a2a30', helm: 'cap', weapon: 'spear', shield: { k: 'round', c: '#3a3a44', e: '#c8663a' }, legs: '#2a2a30' }),
    ghoul: H(.98, { skin: '#9ab0b8', top: '#9ab0b8', sleeve: '#9ab0b8', legs: '#9ab0b8', boots: '#9ab0b8', barefoot: 1, weapon: 'claws', armsOut: 1, hand: [.3, -.5], lean: .22, eyes: '255,240,120', armour: 'ribs', sash: '#4a4238' }),
    legionary: H(1.12, { top: '#3a3434', armour: 'plate', metal: '#6a6464', skirt: '#4a2018', helm: 'full', plume: '#4a2018', eyes: '255,120,40', weapon: 'sword', steel: '#8a8484', shield: { k: 'scutum', c: '#3a3030', e: '#ff7828' }, legs: '#2a2626' }),
    ogre: H(1.75, { skin: '#c9a06a', top: '#c9a06a', sleeve: '#c9a06a', legs: '#c9a06a', barefoot: 1, sash: '#6a4a2a', weapon: 'club', w: 1.4, headR: .85, head: 'tusks', wide: 1.25, hair: '#3a2a1a' }),
    wight: H(1.1, { skin: '#c8d8e0', top: '#2a3038', armour: 'chain', cloak: '#1f242a', helm: 'crown', eyes: '140,220,255', weapon: 'sword', steel: '#a8c8d8', legs: '#1f242a', hair: '#e8e8e8' }),
    wraith: H(1.2, { skin: '#0c0a10', top: '#1c1826', sleeve: '#1c1826', float: 1, hood: '#1c1826', helm: 'hoodup', eyes: '200,120,255', weapon: 'claws', hand: [.3, -.56], cloak: '#120f18' }),
    minotaur: H(1.65, { skin: '#7a5236', top: '#7a5236', sleeve: '#7a5236', legs: '#5a3a26', barefoot: 1, head: 'bull', horns: BONE, sash: '#8e2a22', weapon: 'axe', w: 1.3, wide: 1.25 }),
    troll: H(2, { skin: '#5f8a5a', top: '#5f8a5a', sleeve: '#5f8a5a', legs: '#4f744a', barefoot: 1, head: 'nose', hair: '#2a3a22', sash: '#4a3a2a', weapon: 'claws', hand: [.3, -.34], lean: .16, w: .95, eyes: '255,230,90' }),
    giant: H(2.5, { skin: '#d0a878', top: '#7a5a3a', sleeve: '#d0a878', legs: '#d0a878', barefoot: 1, beard: '#5a3a22', hair: '#5a3a22', sash: '#3a2a1a', weapon: 'club', w: 1.3, wide: 1.25, headR: .85 }),
    firegiant: H(2.8, { skin: '#2a2224', top: '#2a2224', armour: 'plate', metal: '#4a3a3a', skirt: '#8e2a22', helm: 'flame', beard: '#ff8a2a', eyes: '255,170,60', weapon: 'gsword', steel: '#ffb060', w: 1.3, wide: 1.25, legs: '#2a2224', headR: .9, tall: 1.5 }),
    warfiend: H(1.9, { skin: '#5a1418', top: '#2a1a1e', armour: 'plate', metal: '#3a3038', skirt: '#1a1014', horns: '#1a1014', eyes: '255,200,60', wings: '#3a1014', wings2: '#2a0c10', weapon: 'glaive', steel: '#c8c0d0', tail: '#5a1418', legs: '#2a1a1e', w: 1.1, wide: 1.5, tall: 1.45 }),

    vhorax: H(2.3, { skin: '#1a1416', top: '#1a1416', armour: 'plate', metal: '#2e262a', skirt: '#8e2a22', helm: 'full', plume: '#8e2a22', horns: '#d2aa52', eyes: '240,197,106', cloak: '#8e2a22', weapon: 'gsword', steel: '#f0c56a', legs: '#1a1416', w: 1.25, wide: 1.35, tall: 1.5 }),

    thug: H(1, { top: '#6a5a44', legs: '#3a3228', weapon: 'club', hair: '#3a2a1a', sash: '#3a2a1a' }),
    cutpurse: H(.95, { top: '#4a4a3a', hood: '#33332a', helm: 'hoodup', weapon: 'dagger', lean: .14, stride: .05, legs: '#2a2a22' }),
    slinger: H(1, { top: '#5a4a3a', hood: '#3a3028', helm: 'hoodup', weapon: 'bow', quiver: 1, hand: [.3, -.58], legs: '#2a2420', armour: 'leather' }),
    bruiser: H(1.3, { top: '#7a3a2a', sleeve: '#d0a878', skin: '#d0a878', legs: '#3a3228', weapon: 'club', w: 1.3, wide: 1.2, headR: .9, sash: '#2a1f18', beard: '#3a2a1a' }),
    wererat: H(1.1, { skin: '#7a6a5a', top: '#4a3a30', sleeve: '#7a6a5a', legs: '#7a6a5a', barefoot: 1, head: 'snout', tail: '#c9a08a', weapon: 'claws', hand: [.3, -.5], lean: .16, eyes: '255,80,60', hair: '#5a4c40' }),
    gangboss: H(1.2, { top: '#8e2a22', armour: 'leather', vest: '#3a2a22', cloak: '#3a1a16', legs: '#2a2420', weapon: 'axe', hair: '#b8b0a0', w: 1.15, sash: '#d2aa52' }),
    cultist: H(1, { top: '#5a1a1e', robe: 1, trim: '#2a0c10', hood: '#3a1014', helm: 'hoodup', weapon: 'dagger', sash: '#2a0c10' }),
    cultpriest: H(1.05, { top: '#22161c', robe: 1, trim: '#8e2a22', hood: '#22161c', helm: 'hoodup', mask: '#e8e0cc', weapon: 'staff', orb: '200,120,255', sash: '#8e2a22' }),
    necromancer: H(1.15, { skin: '#c8d0c0', top: '#16181c', robe: 1, trim: '#3a8a4a', hood: '#16181c', helm: 'hoodup', eyes: '120,255,140', weapon: 'staff', orb: '120,255,140', sash: '#3a8a4a', cloak: '#0c0e10' }),
    gargoyle: H(1.25, { skin: '#7a7e88', top: '#7a7e88', sleeve: '#7a7e88', legs: '#62666e', barefoot: 1, horns: '#4a4e56', wings: '#62666e', wings2: '#4a4e56', tail: '#62666e', weapon: 'claws', hand: [.3, -.5], lean: .1, eyes: '255,160,60', wide: 1.4, tall: 1.4 }),
    apprentice: H(.95, { top: '#5a6a8a', robe: 1, trim: '#3a4660', sash: '#3a4660', hair: '#6a4a2a', weapon: 'orb', orb: '150,210,255', hand: [.26, -.62] }),
    imp: H(.55, { skin: '#c0382c', top: '#c0382c', sleeve: '#c0382c', legs: '#a02a20', barefoot: 1, horns: '#2a1010', wings: '#8a1c16', wings2: '#6a1410', tail: '#c0382c', weapon: 'claws', hand: [.3, -.5], eyes: '255,230,90', headR: 1.3, wide: 1.5, tall: 1.5 }),
    armour: H(1.1, { skin: '#2a2e34', top: '#2a2e34', armour: 'plate', metal: '#8a94a0', skirt: '#4a5058', helm: 'full', plume: '#4a5058', eyes: '120,200,255', weapon: 'sword', legs: '#6a727c', boots: '#6a727c', shield: { k: 'kite', c: '#6a727c', e: '#9ad0ff' } }),
    golem: H(2, { skin: '#b08a62', top: '#b08a62', sleeve: '#b08a62', legs: '#9a7650', barefoot: 1, w: 1.5, wide: 1.3, headR: .8, eyes: '255,200,90', sash: '#7a5a3a', hand: [.36, -.4] }),
    sorcerer: H(1.15, { top: '#3a1c5a', robe: 1, trim: '#d2aa52', sash: '#d2aa52', helm: 'hat', hat: '#2a1244', beard: '#2a2030', weapon: 'staff', orb: '255,120,220', cloak: '#1c0c30' }),
    hound: B(.8, { len: 1.1, h: .62, col: '#7a5a3a', dark: '#5a4028', tail: 1, tailW: .05, fangs: 1, eye: '255,90,60', leg: .07 }),
    slime: { w: .7, h: .75, draw() { g.beginPath(); g.moveTo(-.5, -.02); g.quadraticCurveTo(-.56, -.4, -.22, -.52); g.quadraticCurveTo(.05, -.72, .3, -.48); g.quadraticCurveTo(.58, -.36, .5, -.02); g.closePath(); paint('#8a9088'); ell(-.1, -.38, .16, .08, 'rgba(255,255,255,.3)', 0, -.3); eye(-.06, -.26, '200,255,160'); eye(.18, -.24, '200,255,160'); circ(.34, -.12, .04, 'rgba(255,255,255,.25)', 0); } },
    rat: B(1, { len: .7, h: .34, col: '#7a6a5a', dark: '#5a4c40', tail: 1, tailCol: '#c9a08a', tailW: .025, ear: 'round', leg: .045, eye: '255,80,60' }),
    wolf: B(1, { len: 1.15, h: .68, col: '#5a5a64', dark: '#3e3e46', tail: 1, tailW: .09, fangs: 1, eye: '255,220,90', leg: .08 }),
    spider: { w: .8, h: .8, draw: spider },
    wyvern: { w: 1.4, h: 1.75, draw() { g.scale(.88, .88); drake({ col: '#6a7a4a', belly: '#b8b078', wing: '#8a7a4a', wing2: '#5a5234', sting: 1 }); } },
    dragon: { w: 2.1, h: 2.6, draw() { g.scale(1.32, 1.32); drake({ col: '#a3241c', belly: '#e0a050', wing: '#c2402a', wing2: '#6a1810', four: 1, fire: 1, horn: '#2a1a14' }); } },
    chimera: { w: 1.15, h: 1.6, draw: chimera }
  };

  const cache = {};
  function sprite(key) {
    if (cache[key]) return cache[key];
    if (!DEF[key] && key.includes('|')) { // a calling dressed in particular gear: "fighter|{...look}"
      const cut = key.indexOf('|'), base = (DEF[key.slice(0, cut)] || DEF.fighter).o, ov = JSON.parse(key.slice(cut + 1));
      if (ov.cloak) ov.cloak = base.cloak || '#5a4632';
      if (ov.helm === 'hoodup') ov.hood = base.hood || base.top;
      if (ov.helm === 'hat') ov.hat = base.hat || base.top;
      if (ov.weapon === 'staff' && base.orb) ov.orb = base.orb;
      DEF[key] = H(1, Object.assign({}, base, ov));
    }
    const d = DEF[key] || DEF.fighter, uw = d.w * 2, uh = d.h + .12, ppu = Math.min(130, 440 / uh);
    const cv = document.createElement('canvas'); cv.width = Math.ceil(uw * ppu); cv.height = Math.ceil(uh * ppu);
    g = cv.getContext('2d'); g.translate(cv.width / 2, (uh - .06) * ppu); g.scale(ppu, ppu); g.lineWidth = .022; g.lineJoin = 'round';
    d.draw();
    const mips = [cv]; // halved copies so far-away figures stay clean
    while (mips[mips.length - 1].height > 40) { const s = mips[mips.length - 1], m = document.createElement('canvas'); m.width = Math.ceil(s.width / 2); m.height = Math.ceil(s.height / 2); m.getContext('2d').drawImage(s, 0, 0, m.width, m.height); mips.push(m); }
    return cache[key] = { mips, uw, uh, pad: .06 };
  }
  // Draw the figure with its feet at (x, y). k = pixels per world unit, dir = 1 facing right, -1 facing left.
  function draw(ctx, key, x, y, k, dir) {
    const s = sprite(key), dw = s.uw * k, dh = s.uh * k; let i = 0;
    while (i < s.mips.length - 1 && s.mips[i + 1].height >= dh) i++;
    if (dir < 0) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(s.mips[i], -dw / 2, y - dh + s.pad * k, dw, dh); ctx.restore(); }
    else ctx.drawImage(s.mips[i], x - dw / 2, y - dh + s.pad * k, dw, dh);
  }
  const urls = {};
  function url(key) { if (!urls[key]) { const s = sprite(key); urls[key] = s.mips[Math.min(1, s.mips.length - 1)].toDataURL(); } return urls[key]; }
  return { sprite, draw, url, keys: Object.keys(DEF) };
})();
