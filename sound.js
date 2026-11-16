'use strict';
/* Sound, made in code: no audio files. Short, dry, physical sounds built from oscillators and filtered noise.
   Nothing plays until the player has touched the page (browsers require that), and the volume setting is remembered. */
const SND = (() => {
  let ctx = null, master = null, buf = null, amb = null, ambTimer = 0, level = 2, voices = 0, where = null;
  const VOL = [0, .3, .65], last = {};
  try { const v = +localStorage.getItem('the-hundred-sound'); if (v === 0 || v === 1 || v === 2) level = localStorage.getItem('the-hundred-sound') === null ? 2 : v; } catch (e) { }
  function init() {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = VOL[level]; const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  const unlock = () => { if (init() && ctx.state === 'suspended') ctx.resume(); };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); };
  function tone(type, f0, f1, t, dur, vol, lp, att) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, att || .005, vol, dur); let n = o; if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); n = f; } n.connect(g); g.connect(master); o.start(t); o.stop(t + dur + (att || 0) + .05); voice(dur);
  }
  function noise(t, dur, vol, type, f0, f1, q, att) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = buf; s.loop = true; f.type = type; f.Q.value = q || .8; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, att || .004, vol, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + (att || 0) + .05); voice(dur);
  }
  const voice = d => { voices++; setTimeout(() => voices--, d * 1000 + 80); };
  const chime = (t, notes, gap, vol) => notes.forEach((f, i) => tone('sine', f, f, t + i * (gap || .09), .5, vol || .09));
  const R = {
    swish: t => noise(t, .16, .22, 'bandpass', 1800, 5200, 1.2),
    clang: t => { tone('triangle', 2300, 2180, t, .24, .11); tone('square', 3170, 3080, t, .16, .04); noise(t, .05, .18, 'highpass', 3200, 3200); },
    thump: t => { tone('sine', 150, 58, t, .16, .5); noise(t, .06, .2, 'lowpass', 900, 280); },
    twang: t => { tone('sawtooth', 250, 105, t, .12, .2, 1800); noise(t + .02, .22, .11, 'bandpass', 2600, 900, 2); },
    thunk: t => { tone('sine', 115, 68, t, .1, .45); noise(t, .03, .22, 'highpass', 2200, 2200); },
    bolt: t => tone('sawtooth', 520, 110, t, .36, .13, 1300),
    incant: t => { for (let i = 0; i < 4; i++) tone('sine', 380 * (1 + i * .5), 760 * (1 + i * .5), t + i * .03, .3, .045, 0, .08); },
    missile: t => tone('sine', 1150, 310, t, .22, .13),
    sparkle: t => { tone('sine', 1900, 2600, t, .12, .08); tone('sine', 2900, 3400, t + .04, .1, .05); },
    whoosh: t => noise(t, .4, .28, 'lowpass', 300, 2400, .7, .1),
    boom: t => { tone('sine', 92, 32, t, .85, .9); noise(t, .75, .6, 'lowpass', 1500, 110, .5); },
    crack: t => { noise(t, .12, .8, 'highpass', 1800, 4200); noise(t + .05, 1, .5, 'lowpass', 520, 70); },
    roar: t => { noise(t, .9, .5, 'lowpass', 220, 1600, .8, .15); tone('sawtooth', 72, 48, t, .8, .14, 320); },
    fall: t => { tone('sine', 125, 44, t, .3, .5); noise(t + .02, .15, .2, 'lowpass', 600, 200); },
    toll: t => { tone('sine', 196, 195, t, 1.5, .26); tone('sine', 392.5, 392, t, 1, .08); tone('sine', 588, 587, t, .6, .04); },
    step: t => noise(t, .04, .05, 'lowpass', 700, 400),
    tick: t => tone('square', 900, 700, t, .03, .035),
    coin: t => { tone('sine', 1760, 1760, t, .12, .1); tone('sine', 2637, 2637, t + .07, .22, .1); },
    fanfare: t => [392, 523, 659, 784].forEach((f, i) => { tone('triangle', f, f, t + i * .12, .38, .14); tone('sawtooth', f / 2, f / 2, t + i * .12, .32, .04, 900); }),
    dirge: t => [294, 262, 220, 196].forEach((f, i) => tone('triangle', f, f, t + i * .24, .55, .14)),
    gong: t => { tone('sine', 98, 96, t, 2.4, .5); tone('sine', 147.5, 146, t, 1.9, .2); tone('sine', 233, 231, t, 1.2, .1); noise(t, .3, .14, 'bandpass', 500, 300, 1); },
    door: t => { noise(t, 1.2, .3, 'bandpass', 190, 85, 4, .2); tone('sawtooth', 62, 44, t, 1.1, .12, 220, .15); },
    cheer: t => noise(t, 1.5, .2, 'bandpass', 850, 1500, .6, .45),
    rustle: t => noise(t, .5, .2, 'bandpass', 3000, 1200, 1.5, .05),
    ring: t => { tone('sine', 1320, 1318, t, .6, .08); tone('sine', 1985, 1980, t, .5, .05); },
    // the crowd: it only raises its voice when something earns it
    swell: t => noise(t, .7, .13, 'bandpass', 620, 820, .7, .2),
    hurrah: t => { noise(t, 3.4, .2, 'bandpass', 900, 960, .8, .55); noise(t + .25, 3, .08, 'bandpass', 1700, 1800, 1.2, .8); noise(t + .1, 2.6, .07, 'bandpass', 500, 520, 1, .7); },
    bigroar: t => { noise(t, 4.6, .34, 'bandpass', 850, 950, .6, .7); noise(t, 2.4, .2, 'lowpass', 300, 420, .7, .6); noise(t + .1, 2.2, .12, 'bandpass', 2000, 2600, 1, .6); },
    ooh: t => { noise(t, 1.2, .22, 'bandpass', 330, 420, 5, .3); noise(t, 1.2, .14, 'bandpass', 760, 900, 6, .3); },
    groan: t => { noise(t, 1.1, .2, 'bandpass', 420, 260, 4, .2); noise(t, 1.1, .1, 'bandpass', 900, 620, 5, .2); },
    crit: t => { tone('triangle', 1650, 1600, t, .4, .14); tone('sine', 110, 50, t, .3, .5); noise(t, .08, .3, 'highpass', 2600, 2600); },
    thunder: t => { noise(t, 2.8, .55, 'lowpass', 240, 55, .6, .3); tone('sine', 56, 36, t, 2.4, .4, 0, .25); },
    drip: t => tone('sine', 1500, 880, t, .09, .06),
    sleep: t => chime(t, [660, 554, 440, 370], .1, .08), heal: t => chime(t, [523, 659, 784], .08, .09), bless: t => chime(t, [392, 494, 587, 784], .07, .08),
    turn: t => chime(t, [523, 659, 784, 1047], .04, .1), colours: t => chime(t, [523, 587, 659, 784, 880, 988], .035, .07), level: t => chime(t, [523, 659, 784, 1047], .1, .11)
  };
  // name, delay in ms, and how often the same sound may repeat (so a hundred blows do not become a roar)
  function play(name, delay, gap) {
    if (!level || !init() || ctx.state !== 'running' || !R[name] || voices > 26) return;
    const at = Date.now() + (delay || 0), g = gap == null ? 45 : gap; if (last[name] && Math.abs(at - last[name]) < g) return; last[name] = at;
    R[name](ctx.currentTime + (delay || 0) / 1000 + .005);
  }
  // one battle effect from the engine, turned into sound at the right moments
  function fx(f) {
    const d = Math.max(0, f.t - Date.now());
    switch (f.k) {
      case 'txt': if (where === 'arena' && f.side === 'E' && parseInt(f.s) >= 12 && !f.big) play('swell', d, 700); break;
      case 'slash': if (f.hit && f.nat) { play('crit', d + f.lag, 100); if (where === 'arena') play(f.side === 'H' ? 'hurrah' : 'groan', d + f.lag + 120, 900); }
        play('swish', d); if (f.hit) { play(f.w === 'monk' || f.side === 'E' && !f.crit ? 'thump' : 'clang', d + f.lag); play('thump', d + f.lag + 10, 60); } break;
      case 'shot': if (f.hit && f.nat) { play('crit', d + f.lag, 100); if (where === 'arena') play(f.side === 'H' ? 'hurrah' : 'groan', d + f.lag + 120, 900); }
        play(f.w === 'bolt' ? 'bolt' : 'twang', d); if (f.hit) play(f.w === 'bolt' ? 'thump' : 'thunk', d + f.lag); break;
      case 'spell': { play('incant', d, 120); const a = d + 250, hit = d + f.lag;
        if (f.id === 'missile') { for (let i = 0; i < (f.n || 1); i++) play('missile', a + i * 70, 20); play('sparkle', hit, 20); }
        else if (f.id === 'fireball') { play('whoosh', a); play('boom', hit, 150); if (where === 'arena') play('ooh', hit + 250, 1200); }
        else if (f.id === 'lightning') { play('crack', hit, 150); if (where === 'arena') play('ooh', hit + 300, 1200); }
        else if (f.id === 'cure' || f.id === 'loh') play('heal', hit);
        else if (f.id === 'entangle' || f.id === 'web') play('rustle', a);
        else if (f.id === 'hold') play('ring', hit);
        else if (f.id === 'phantom') play('bolt', a);
        else play(f.id, a);
        break; }
      case 'breath': play('roar', d, 200); break;
      case 'gaze': play('ring', d); play('boom', d + 200, 300); break;
      case 'die': if (f.u && f.u.illusion) break; if (f.u && f.u.side === 'H') { play('toll', d, 300); if (where === 'arena') play('groan', d + 150, 1200); } else { play('fall', d, 70); if (f.u && f.u.boss) { play('boom', d, 300); play(where === 'arena' ? 'bigroar' : 'cheer', d + 200, 800); } else if (where === 'arena') play('hurrah', d + 120, 1100); } break;
      case 'move': play('step', d, 90); break;
    }
  }
  // a quiet bed of sound for wherever the fight is: crowd, crypt, wind, rain
  // Rain comes in three swells, falls away, and returns after a roll of thunder. The timing is never quite the same twice.
  const rain = { lv: 1, flash: 0, on: false, t: 0, n: 0,
    stop() { this.on = false; clearTimeout(this.t); this.lv = 1; },
    start() { this.stop(); this.on = true; this.n = 0; this.step(); },
    set(v, secs) { this.lv = v; if (amb && ctx) { try { amb.g.gain.cancelScheduledValues(ctx.currentTime); amb.g.gain.setTargetAtTime(Math.max(.0001, .05 * v), ctx.currentTime, secs / 3); } catch (e) { } } },
    step() { if (!this.on) return; const r = Math.random;
      if (this.n < 3) { this.n++; this.set(.75 + r() * .45, 2); this.t = setTimeout(() => { this.set(.45 + r() * .2, 2.5); this.t = setTimeout(() => this.step(), 2200 + r() * 2800); }, 3200 + r() * 4500); }
      else { this.n = 0; this.set(.1, 4); this.t = setTimeout(() => { this.flash = Date.now() + 350; play('thunder', 700 + r() * 900, 0); this.t = setTimeout(() => this.step(), 2800 + r() * 3600); }, 4500 + r() * 6500); } } };
  function ambient(place) {
    where = place; rain.stop(); if (place === 'slum') rain.start();
    clearInterval(ambTimer); if (amb) { try { amb.g.gain.linearRampToValueAtTime(.0001, ctx.currentTime + .6); amb.s.stop(ctx.currentTime + .7); } catch (e) { } amb = null; }
    if (!place || !level || !init()) return;
    where = place; place = { sewer: 'crypt', market: 'arena', ship: 'tower' }[place] || place; const P = { arena: ['lowpass', 260, .9, .045, .09], crypt: ['lowpass', 150, .7, .1, .05], tower: ['bandpass', 520, 1.5, .05, .09], slum: ['highpass', 2600, .5, .035, .4] }[place] || null; if (!P) return;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    s.buffer = buf; s.loop = true; f.type = P[0]; f.frequency.value = P[1]; f.Q.value = P[2]; g.gain.value = .0001; g.gain.linearRampToValueAtTime(P[3], ctx.currentTime + 1.5);
    lfo.frequency.value = P[4]; lg.gain.value = place === 'slum' ? P[3] * .12 : P[3] * .5; lfo.connect(lg); lg.connect(g.gain); if (place === 'tower') { const l2 = ctx.createGain(); l2.gain.value = 260; lfo.connect(l2); l2.connect(f.frequency); }
    s.connect(f); f.connect(g); g.connect(master); s.start(); lfo.start(); amb = { s, g };
    if (place === 'crypt') ambTimer = setInterval(() => { if (Math.random() < .5) play('drip', Math.random() * 900, 300); }, 2300);
  }
  function cycle() { level = (level + 1) % 3; try { localStorage.setItem('the-hundred-sound', level); } catch (e) { } if (init()) { master.gain.value = VOL[level]; if (ctx.state === 'suspended') ctx.resume(); } if (!level) ambient(null); return level; }
  return { rain: () => rain.lv, flash: () => rain.flash, play, fx, ambient, cycle, label: () => 'Sound: ' + ['off', 'low', 'full'][level], on: () => level > 0 };
})();
