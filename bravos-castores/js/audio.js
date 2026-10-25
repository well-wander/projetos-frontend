// Efeitos sonoros e música de fundo gerados com Web Audio (sem arquivos de áudio).
let ac = null;
let master = null;
let saidaEfeitos = null;
let saidaMusica = null;
let ruido = null;
export const somAtivo = { valor: true };

function ctx() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
    master = ac.createGain();
    master.gain.value = 0.8;
    master.connect(ac.destination);
    saidaEfeitos = ac.createGain();
    saidaEfeitos.gain.value = 0.6;
    saidaEfeitos.connect(master);
    saidaMusica = ac.createGain();
    saidaMusica.gain.value = 0;
    saidaMusica.connect(master);
    ruido = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

// ---------------- instrumentos ----------------
function nota(freq, t, dur, { tipo = 'square', vol = 0.25, saida = saidaEfeitos, ataque = 0.01, filtro = 0, vibrato = 0, deslize = 0 } = {}) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, t);
  if (deslize) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * deslize), t + dur);
  if (vibrato) {
    const lfo = ac.createOscillator();
    const lg = ac.createGain();
    lfo.frequency.value = 5.2;
    lg.gain.value = freq * vibrato;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.1);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let no = o;
  if (filtro) {
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filtro;
    o.connect(f);
    no = f;
  }
  no.connect(g).connect(saida);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function chiado(t, dur, { vol = 0.3, freq = 800, tipo = 'lowpass', saida = saidaEfeitos } = {}) {
  const s = ac.createBufferSource();
  s.buffer = ruido;
  const f = ac.createBiquadFilter();
  f.type = tipo;
  f.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(saida);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------------- efeitos ----------------
const SONS = {
  clique: (t) => nota(660, t, 0.06, { vol: 0.12 }),
  pegar: (t) => { nota(520, t, 0.07, { tipo: 'triangle', vol: 0.18 }); nota(780, t + 0.05, 0.08, { tipo: 'triangle', vol: 0.14 }); },
  mostrar: (t) => { chiado(t, 0.25, { vol: 0.12, freq: 3000, tipo: 'bandpass' }); nota(440, t + 0.05, 0.25, { tipo: 'triangle', vol: 0.16, deslize: 1.5 }); },
  descartar: (t) => { chiado(t, 0.3, { vol: 0.15, freq: 1200 }); nota(300, t, 0.2, { tipo: 'triangle', vol: 0.2, deslize: 0.5 }); },
  erro: (t) => { nota(200, t, 0.12, { vol: 0.15 }); nota(150, t + 0.12, 0.2, { vol: 0.15 }); },
  construir: (t) => { nota(330, t, 0.12, { vol: 0.16 }); nota(440, t + 0.12, 0.12, { vol: 0.16 }); nota(550, t + 0.24, 0.2, { vol: 0.16 }); },
  bloco: (t) => { nota(180 + Math.random() * 60, t, 0.08, { tipo: 'triangle', vol: 0.12, deslize: 0.6 }); chiado(t, 0.05, { vol: 0.05, freq: 900 }); },
  desmorona: (t) => { chiado(t, 0.9, { vol: 0.35, freq: 500 }); nota(90, t, 0.6, { tipo: 'sawtooth', vol: 0.12, deslize: 0.5, filtro: 400 }); },
  lancar: (t) => { chiado(t, 0.35, { vol: 0.15, freq: 1800, tipo: 'bandpass' }); nota(220, t, 0.3, { tipo: 'triangle', vol: 0.12, deslize: 1.8 }); },
  impacto: (t) => { chiado(t, 0.5, { vol: 0.5, freq: 900 }); nota(70, t, 0.4, { tipo: 'sine', vol: 0.45, deslize: 0.5 }); },
  magia: (t) => { [880, 1100, 1320, 1760].forEach((f, i) => nota(f, t + i * 0.07, 0.3, { tipo: 'sine', vol: 0.14 })); },
  roubo: (t) => { nota(500, t, 0.08, { vol: 0.13 }); nota(400, t + 0.1, 0.08, { vol: 0.13 }); nota(600, t + 0.2, 0.12, { vol: 0.13 }); },
  trabalhador: (t) => { nota(392, t, 0.14, { tipo: 'triangle', vol: 0.22 }); nota(523, t + 0.14, 0.14, { tipo: 'triangle', vol: 0.22 }); nota(659, t + 0.28, 0.3, { tipo: 'triangle', vol: 0.22 }); },
  producao: (t) => { [523, 659, 784].forEach((f, i) => nota(f, t + 0.45 + i * 0.09, 0.18, { tipo: 'triangle', vol: 0.14 })); },
  vez: (t) => { nota(587, t, 0.12, { tipo: 'square', vol: 0.1, filtro: 2500 }); nota(784, t + 0.13, 0.12, { vol: 0.1, filtro: 2500 }); nota(880, t + 0.26, 0.3, { vol: 0.1, filtro: 2500 }); },
  vitoria: (t) => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => nota(f, t + i * 0.14, 0.28, { vol: 0.2 })); },
  derrota: (t) => { [440, 415, 392, 311].forEach((f, i) => nota(f, t + i * 0.26, 0.42, { tipo: 'sawtooth', vol: 0.15, filtro: 1500 })); },
  raio: (t) => { chiado(t, 0.5, { vol: 0.5, freq: 3500, tipo: 'highpass' }); chiado(t + 0.05, 0.9, { vol: 0.35, freq: 400 }); nota(60, t, 0.7, { tipo: 'sawtooth', vol: 0.18, deslize: 0.5, filtro: 600 }); },
  // construção: marteladas e serrote
  carpintaria: (t) => {
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.22;
      chiado(tt, 0.06, { vol: 0.5, freq: 2400, tipo: 'bandpass' });
      nota(150 + i * 12, tt, 0.12, { tipo: 'sine', vol: 0.35, deslize: 0.6, ataque: 0.002 });
    }
    // serrote: chiado modulado indo e voltando
    for (let i = 0; i < 4; i++) chiado(t + 0.75 + i * 0.13, 0.11, { vol: 0.22, freq: 3200 - (i % 2) * 900, tipo: 'bandpass' });
  },
  // batalha: espadas batendo e metal vibrando
  metal: (t) => {
    const parciais = [523, 1347, 2210, 3470, 4980];
    [[1, 0], [0.85, 0.28]].forEach(([fator, atraso]) => {
      parciais.forEach((f, i) => nota(f * fator, t + atraso, 0.7 - i * 0.09, { tipo: 'sine', vol: 0.12 / (i + 1), ataque: 0.002 }));
      chiado(t + atraso, 0.08, { vol: 0.35, freq: 5000, tipo: 'highpass' });
    });
    chiado(t + 0.6, 0.35, { vol: 0.12, freq: 1500, tipo: 'bandpass' });
  },
  // magia: estalo elétrico e cintilar
  feitico: (t) => {
    nota(1800, t, 0.45, { tipo: 'sawtooth', vol: 0.08, deslize: 0.15, filtro: 3000 });
    for (let i = 0; i < 7; i++) chiado(t + 0.05 + Math.random() * 0.4, 0.03, { vol: 0.3, freq: 6000, tipo: 'highpass' });
    [1320, 1760, 2093, 2637].forEach((f, i) => nota(f, t + 0.35 + i * 0.06, 0.35, { tipo: 'sine', vol: 0.09 }));
  },
  nada: () => {},
};

export function tocar(nome) {
  if (!somAtivo.valor) return;
  const fn = SONS[nome];
  if (!fn || !ctx()) return;
  fn(ac.currentTime + 0.01);
}

export function destravarAudio() {
  ctx();
}

// ---------------- música de fundo ----------------
// Tema medieval em ré menor: alaúde (arpejo), flauta (melodia), baixo e percussão leve.
// 16 compassos que se repetem (~42 s).
const ACORDES = {
  Dm: [50, 57, 62, 65], C: [48, 55, 60, 64], Bb: [46, 53, 58, 62], Am: [45, 52, 57, 60],
  A: [45, 52, 57, 61], Gm: [43, 50, 55, 58],
};
const PROGRESSAO = ['Dm', 'C', 'Bb', 'C', 'Dm', 'Am', 'Bb', 'C', 'Dm', 'C', 'Bb', 'A', 'Dm', 'Gm', 'C', 'Dm'];
// melodia: [nota midi ou null, duração em colcheias], 8 colcheias por compasso
const MELODIA = [
  [69, 2], [65, 1], [67, 1], [69, 2], [74, 2],
  [67, 2], [64, 1], [65, 1], [67, 2], [72, 2],
  [65, 2], [62, 1], [65, 1], [70, 2], [69, 2],
  [67, 2], [64, 2], [60, 2], [64, 2],
  [74, 2], [72, 1], [69, 1], [65, 2], [69, 2],
  [76, 2], [74, 1], [72, 1], [69, 4],
  [74, 2], [70, 2], [65, 2], [70, 2],
  [72, 2], [76, 2], [74, 4],
  [null, 2], [62, 1], [65, 1], [69, 1], [67, 1], [65, 2],
  [64, 2], [67, 2], [72, 2], [69, 2],
  [70, 3], [69, 1], [67, 2], [65, 2],
  [64, 2], [61, 2], [64, 2], [69, 2],
  [69, 2], [74, 2], [72, 1], [70, 1], [69, 2],
  [67, 2], [70, 2], [74, 2], [72, 2],
  [70, 2], [69, 2], [67, 2], [64, 2],
  [62, 4], [null, 4],
];
// início de cada nota da melodia em colcheias
const INICIO_MELODIA = [];
{
  let pos = 0;
  for (const [m, d] of MELODIA) { INICIO_MELODIA.push([pos, m, d]); pos += d; }
}
const ARPEJO = [0, 2, 1, 3, 2, 1, 3, 1];
const COLCHEIA = 60 / 92 / 2;
const TOTAL_COLCHEIAS = PROGRESSAO.length * 8;

let relogio = null;
let proximoTempo = 0;
let passoAtual = 0;
let tocando = false;

function agendarPasso(passo, t) {
  const compasso = Math.floor(passo / 8);
  const c = passo % 8;
  const acorde = ACORDES[PROGRESSAO[compasso]];
  const sai = saidaMusica;
  // alaúde
  nota(midi(acorde[ARPEJO[c]] + 12), t, COLCHEIA * 1.8, { tipo: 'square', vol: 0.05, filtro: 1600, saida: sai, ataque: 0.005 });
  // baixo
  if (c === 0 || c === 4) nota(midi(acorde[0] - 12), t, COLCHEIA * 3.6, { tipo: 'triangle', vol: 0.22, saida: sai, ataque: 0.02 });
  // percussão
  if (c === 0 || c === 4) nota(110, t, 0.18, { tipo: 'sine', vol: 0.22, deslize: 0.45, saida: sai, ataque: 0.003 });
  if (c % 2 === 1) chiado(t, 0.05, { vol: 0.035, freq: 7000, tipo: 'highpass', saida: sai });
  if (c === 2 || c === 6) chiado(t, 0.14, { vol: 0.06, freq: 4500, tipo: 'bandpass', saida: sai });
  // flauta
  for (const [inicio, m, d] of INICIO_MELODIA) {
    if (inicio === passo && m) nota(midi(m), t, COLCHEIA * d * 0.95, { tipo: 'triangle', vol: 0.12, vibrato: 0.006, saida: sai, ataque: 0.04 });
  }
}

function agendador() {
  while (proximoTempo < ac.currentTime + 0.2) {
    agendarPasso(passoAtual, proximoTempo);
    proximoTempo += COLCHEIA;
    passoAtual = (passoAtual + 1) % TOTAL_COLCHEIAS;
  }
}

export const musica = {
  tocar() {
    if (tocando || !ctx()) return;
    tocando = true;
    proximoTempo = ac.currentTime + 0.1;
    saidaMusica.gain.cancelScheduledValues(ac.currentTime);
    saidaMusica.gain.setValueAtTime(saidaMusica.gain.value, ac.currentTime);
    saidaMusica.gain.linearRampToValueAtTime(0.55, ac.currentTime + 1.5);
    relogio = setInterval(agendador, 30);
  },
  parar() {
    if (!tocando || !ac) return;
    tocando = false;
    clearInterval(relogio);
    saidaMusica.gain.cancelScheduledValues(ac.currentTime);
    saidaMusica.gain.setValueAtTime(saidaMusica.gain.value, ac.currentTime);
    saidaMusica.gain.linearRampToValueAtTime(0, ac.currentTime + 0.4);
  },
  get tocando() { return tocando; },
};
