// Efeitos sonoros e músicas chiptune, tudo gerado pelo Web Audio (sem arquivos de áudio).
(() => {
  'use strict';

  const settings = { sfx: true, music: true };
  let ac = null;
  let master = null;
  let pulse25 = null;
  let pulse12 = null;
  let noise = null;

  function audio() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      master = ac.createGain();
      master.gain.value = 0.9;
      master.connect(ac.destination);
      pulse25 = pulseWave(0.25);
      pulse12 = pulseWave(0.125);
      noise = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  // onda "pulse" típica de videogame antigo
  function pulseWave(duty) {
    const n = 40;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let i = 1; i < n; i++) real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    return ac.createPeriodicWave(real, imag);
  }

  function osc(type, freq, t0) {
    const o = ac.createOscillator();
    if (type === 'pulse') o.setPeriodicWave(pulse25);
    else if (type === 'thin') o.setPeriodicWave(pulse12);
    else o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    return o;
  }

  function note(dest, type, freq, t0, dur, vol, slideTo) {
    const o = osc(type, freq, t0);
    const g = ac.createGain();
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.setValueAtTime(vol, t0 + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(dest);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function hit(dest, t0, dur, vol, filterType, freq) {
    const s = ac.createBufferSource();
    s.buffer = noise;
    const f = ac.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t0);
    s.stop(t0 + dur + 0.02);
  }

  // ---------------------------------------------------------------
  //  EFEITOS SONOROS
  // ---------------------------------------------------------------
  function tone(freq, dur, type = 'pulse', vol = 0.1, slideTo = null, delay = 0) {
    if (!settings.sfx || !audio()) return;
    note(master, type, freq, ac.currentTime + delay, dur, vol, slideTo);
  }
  const arp = (notes, step = 0.08, type = 'pulse', vol = 0.08, dur = 0.14) =>
    notes.forEach((f, i) => tone(f, dur, type, vol, null, i * step));

  const sfx = {
    unlock: audio,
    eat(combo, gold) {
      const base = 523 * Math.pow(2, (Math.min(combo, 8) - 1) * 2 / 12);
      tone(base, 0.07, 'pulse', 0.08);
      tone(base * 1.5, 0.1, 'pulse', 0.08, null, 0.06);
      if (gold) arp([1047, 1319, 1568, 2093], 0.05, 'thin', 0.07);
    },
    rotten() { tone(220, 0.3, 'sawtooth', 0.06, 70); tone(110, 0.35, 'pulse', 0.06, 50, 0.05); },
    portal() { tone(200, 0.3, 'triangle', 0.14, 1600); tone(1600, 0.2, 'thin', 0.04, 400, 0.15); },
    hop() { tone(880, 0.06, 'thin', 0.05, 1400); },
    shield() { tone(1400, 0.35, 'triangle', 0.1, 500); arp([1568, 2093], 0.06, 'thin', 0.05); },
    power() { arp([523, 784, 1047, 1568, 2093], 0.045, 'pulse', 0.07, 0.1); },
    powerEnd() { arp([784, 523], 0.08, 'triangle', 0.08); },
    trim() { tone(1200, 0.05, 'thin', 0.06); tone(900, 0.05, 'thin', 0.06, null, 0.06); tone(600, 0.08, 'thin', 0.06, null, 0.12); },
    clear() { arp([523, 659, 784, 1047, 784, 1047, 1319], 0.09, 'pulse', 0.08, 0.16); },
    victory() { arp([523, 659, 784, 1047, 784, 1047, 1319, 1568, 2093], 0.12, 'pulse', 0.08, 0.2); },
    unlocked() { arp([784, 988, 1175, 1568, 1976], 0.07, 'thin', 0.08); },
    turn() { tone(160, 0.025, 'triangle', 0.06); },
    die() { tone(440, 0.6, 'pulse', 0.09, 55); hit2(0.4, 0.12); },
    pop(i) { tone(300 + (i % 6) * 60, 0.04, 'pulse', 0.03); },
    poof() { tone(700, 0.18, 'triangle', 0.06, 200); },
    start() { arp([392, 523, 784], 0.07, 'pulse', 0.08); },
    caw() { tone(700, 0.12, 'sawtooth', 0.05, 380); tone(650, 0.16, 'sawtooth', 0.05, 330, 0.18); },
    // menu
    hover() { tone(1200, 0.025, 'thin', 0.035); },
    click() { tone(660, 0.04, 'pulse', 0.07); tone(990, 0.06, 'pulse', 0.06, null, 0.04); },
    deny() { tone(180, 0.12, 'pulse', 0.07, 120); },
    blip() { tone(1500 + Math.random() * 300, 0.018, 'thin', 0.025); },
    warn() { tone(1760, 0.04, 'thin', 0.045); },
  };

  function hit2(dur, vol) {
    if (!settings.sfx || !audio()) return;
    hit(master, ac.currentTime, dur, vol, 'lowpass', 900);
  }

  // ---------------------------------------------------------------
  //  MÚSICA
  // ---------------------------------------------------------------
  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    mixo: [0, 2, 4, 5, 7, 9, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    harmonic: [0, 2, 3, 5, 7, 8, 11],
    phrygdom: [0, 1, 4, 5, 7, 8, 10],
  };

  // baixo: [passo, nota do acorde (0 fundamental, 1 terça, 2 quinta), oitava]
  const BASS = {
    calm: [[0, 0, 0], [8, 2, 0], [12, 1, 0]],
    bounce: [[0, 0, 0], [2, 0, 1], [4, 2, 0], [6, 0, 1], [8, 0, 0], [10, 0, 1], [12, 2, 0], [14, 0, 1]],
    drive: [[0, 0, 0], [2, 0, 0], [4, 0, 1], [6, 0, 0], [8, 0, 0], [10, 0, 0], [12, 0, 1], [14, 2, 0]],
    march: [[0, 0, 0], [4, 1, 0], [8, 2, 0], [12, 1, 0]],
    gallop: [[0, 0, 0], [3, 0, 0], [4, 0, 1], [8, 0, 0], [11, 0, 0], [12, 2, 0]],
  };

  const DRUMS = {
    none: { k: [], s: [], h: [] },
    soft: { k: [0], s: [], h: [8] },
    light: { k: [0, 8], s: [], h: [4, 12] },
    pop: { k: [0, 8, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14] },
    drive: { k: [0, 4, 8, 12], s: [4, 12], h: [2, 6, 10, 14] },
    gallop: { k: [0, 3, 8, 11], s: [4, 12], h: [2, 6, 10, 14] },
  };

  // graus do acorde de cada compasso (0 = primeiro grau da escala)
  const SONGS = {
    menu:   { bpm: 100, root: 60, scale: 'major',    prog: [0, 5, 3, 4, 0, 5, 3, 4], bass: 'calm',   drums: 'light',  lead: 'pulse', seed: 11, busy: 0.55 },
    story:  { bpm: 76,  root: 57, scale: 'minor',    prog: [0, 5, 2, 6, 0, 3, 4, 4], bass: 'calm',   drums: 'none',   lead: 'triangle', seed: 7, busy: 0.4 },
    ending: { bpm: 112, root: 60, scale: 'major',    prog: [0, 4, 5, 3, 0, 4, 3, 4], bass: 'bounce', drums: 'pop',    lead: 'pulse', seed: 99, busy: 0.7 },
    p1:  { bpm: 112, root: 55, scale: 'major',    prog: [0, 3, 4, 0, 5, 3, 4, 4], bass: 'bounce', drums: 'light',  lead: 'pulse', seed: 101, busy: 0.6 },
    p2:  { bpm: 104, root: 62, scale: 'dorian',   prog: [0, 3, 0, 3, 6, 5, 3, 4], bass: 'calm',   drums: 'soft',   lead: 'triangle', seed: 202, busy: 0.5 },
    p3:  { bpm: 116, root: 57, scale: 'minor',    prog: [0, 5, 6, 0, 3, 5, 4, 4], bass: 'march',  drums: 'light',  lead: 'pulse', seed: 303, busy: 0.55 },
    p4:  { bpm: 120, root: 52, scale: 'mixo',     prog: [0, 6, 3, 0, 0, 6, 4, 6], bass: 'gallop', drums: 'gallop', lead: 'thin', seed: 404, busy: 0.6 },
    p5:  { bpm: 128, root: 60, scale: 'major',    prog: [0, 5, 1, 4, 0, 5, 3, 4], bass: 'bounce', drums: 'pop',    lead: 'thin', seed: 505, busy: 0.75 },
    p6:  { bpm: 132, root: 54, scale: 'minor',    prog: [0, 0, 5, 5, 3, 3, 4, 4], bass: 'drive',  drums: 'drive',  lead: 'pulse', seed: 606, busy: 0.7 },
    p7:  { bpm: 120, root: 50, scale: 'phrygdom', prog: [0, 1, 0, 6, 0, 1, 5, 4], bass: 'march',  drums: 'pop',    lead: 'thin', seed: 707, busy: 0.6 },
    p8:  { bpm: 112, root: 59, scale: 'lydian',   prog: [0, 1, 0, 1, 4, 3, 1, 4], bass: 'calm',   drums: 'soft',   lead: 'triangle', seed: 808, busy: 0.5 },
    p9:  { bpm: 140, root: 48, scale: 'minor',    prog: [0, 5, 3, 4, 0, 5, 6, 4], bass: 'drive',  drums: 'drive',  lead: 'pulse', seed: 909, busy: 0.75 },
    p10: { bpm: 146, root: 50, scale: 'harmonic', prog: [0, 5, 3, 4, 0, 5, 1, 4], bass: 'gallop', drums: 'gallop', lead: 'pulse', seed: 1010, busy: 0.8 },
  };

  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // monta a partitura do loop inteiro a partir da semente da música
  function compose(s) {
    const r = window.Cobra.pixel.rng(s.seed);
    const sc = SCALES[s.scale];
    const deg = (d, oct = 0) => {
      const n = sc.length;
      const o = Math.floor(d / n);
      const i = ((d % n) + n) % n;
      return s.root + sc[i] + 12 * (o + oct);
    };
    const bars = s.prog.length;
    const ev = Array.from({ length: bars * 16 }, () => []);

    const makeRhythm = () => {
      const out = [0];
      for (let st = 2; st < 16; st += 2) {
        if (r() < s.busy) out.push(st);
        else if (r() < 0.25) out.push(st + 1);
      }
      return out;
    };
    const makeContour = (len) => {
      const c = [];
      let v = Math.floor(r() * 3);
      for (let i = 0; i < len; i++) {
        v = Math.max(0, Math.min(5, v + Math.floor(r() * 3) - 1));
        c.push(v);
      }
      return c;
    };
    const rA = makeRhythm();
    const rB = makeRhythm();
    const cA = makeContour(rA.length);
    const cB = makeContour(rB.length);
    const bass = BASS[s.bass];
    const drums = DRUMS[s.drums];

    for (let b = 0; b < bars; b++) {
      const d = s.prog[b];
      const chord = [d, d + 2, d + 4, d + 7, d + 9, d + 11]; // notas do acorde subindo
      const useB = b % 4 === 2;
      const rhythm = useB ? rB : rA;
      const contour = useB ? cB : cA;
      const last = b === bars - 1;
      const base = b * 16;

      rhythm.forEach((st, k) => {
        if (last && st > 8) return;
        const next = k + 1 < rhythm.length ? rhythm[k + 1] : 16;
        const len = last && st === 8 ? 8 : Math.min(next - st, 4);
        ev[base + st].push({ i: 'lead', m: deg(chord[contour[k]], 1), len, v: 0.055 });
      });
      for (const [st, ci, oc] of bass) ev[base + st].push({ i: 'bass', m: deg(chord[ci], -1 + oc), len: 2, v: 0.1 });
      for (let st = 0; st < 16; st += 2) ev[base + st].push({ i: 'arp', m: deg(chord[(st / 2) % 3], 0), len: 1, v: 0.022 });
      for (const st of drums.k) ev[base + st].push({ i: 'kick' });
      for (const st of drums.s) ev[base + st].push({ i: 'snare' });
      for (const st of drums.h) ev[base + st].push({ i: 'hat' });
    }
    return ev;
  }

  let cur = null;     // música tocando agora
  let wanted = null;  // última música pedida (para religar quando a música for ativada)
  let timer = null;

  function playEvent(e, t, stepDur, bus, lead) {
    if (e.i === 'lead') note(bus, lead, freq(e.m), t, stepDur * e.len * 0.95, e.v);
    else if (e.i === 'bass') note(bus, 'triangle', freq(e.m), t, stepDur * e.len * 0.9, e.v);
    else if (e.i === 'arp') note(bus, 'thin', freq(e.m), t, stepDur * 0.8, e.v);
    else if (e.i === 'kick') note(bus, 'sine', 150, t, 0.12, 0.25, 40);
    else if (e.i === 'snare') hit(bus, t, 0.12, 0.12, 'bandpass', 1800);
    else if (e.i === 'hat') hit(bus, t, 0.04, 0.05, 'highpass', 7000);
  }

  function schedule() {
    if (!cur) return;
    const stepDur = 60 / cur.spec.bpm / 4;
    while (cur.next < ac.currentTime + 0.15) {
      for (const e of cur.ev[cur.step]) playEvent(e, cur.next, stepDur, cur.bus, cur.spec.lead);
      cur.step = (cur.step + 1) % cur.ev.length;
      cur.next += stepDur;
    }
  }

  function stopCurrent(fade = 0.4) {
    if (!cur) return;
    const old = cur;
    cur = null;
    const t = ac.currentTime;
    old.bus.gain.cancelScheduledValues(t);
    old.bus.gain.setValueAtTime(old.bus.gain.value, t);
    old.bus.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => old.bus.disconnect(), (fade + 0.3) * 1000);
  }

  const music = {
    play(name) {
      wanted = name;
      if (!settings.music || !audio()) return;
      if (cur && cur.name === name) { music.duck(false); return; }
      stopCurrent(0.3);
      const spec = SONGS[name];
      if (!spec) return;
      const bus = ac.createGain();
      bus.gain.value = 0;
      bus.gain.linearRampToValueAtTime(0.55, ac.currentTime + 0.4);
      bus.connect(master);
      cur = { name, spec, ev: compose(spec), step: 0, next: ac.currentTime + 0.05, bus };
      if (!timer) timer = setInterval(schedule, 25);
      schedule();
    },
    stop(fade = 0.4) {
      wanted = null;
      if (ac) stopCurrent(fade);
    },
    duck(on) {
      if (!cur) return;
      const t = ac.currentTime;
      cur.bus.gain.cancelScheduledValues(t);
      cur.bus.gain.setValueAtTime(cur.bus.gain.value, t);
      cur.bus.gain.linearRampToValueAtTime(on ? 0.15 : 0.55, t + 0.25);
    },
    get playing() { return cur ? cur.name : null; },
  };

  function setMusic(on) {
    settings.music = on;
    if (!on) { const w = wanted; music.stop(0.2); wanted = w; }
    else if (wanted) music.play(wanted);
  }

  window.Cobra = window.Cobra || {};
  window.Cobra.audio = { sfx, music, settings, setMusic, SONGS };
})();
