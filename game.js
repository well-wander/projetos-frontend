(() => {
  'use strict';

  const PX = window.Cobra.pixel;
  const AU = window.Cobra.audio;
  const STORY = window.Cobra.story;
  const sfx = AU.sfx;
  const music = AU.music;

  // =====================================================================
  //  DADOS DO JOGO
  // =====================================================================

  // Cada mapa é desenhado só com o "miolo"; o jogo acrescenta uma margem livre de 3 casas
  // em volta. Assim, ao atravessar uma borda (portal), a cobra nunca aparece colada numa barreira.
  // Legenda:  . livre   # barreira   B barreira que pisca   1 / 2  par de portais
  const MARGIN = 3;
  function pad(inner) {
    const w = inner[0].length + MARGIN * 2;
    const empty = '.'.repeat(w);
    const side = '.'.repeat(MARGIN);
    const rows = [];
    for (let i = 0; i < MARGIN; i++) rows.push(empty);
    inner.forEach((r) => rows.push(side + r + side));
    for (let i = 0; i < MARGIN; i++) rows.push(empty);
    return rows;
  }

  const ALL_POWERS = ['slow', 'double', 'magnet', 'ghost', 'trim'];
  // ---- início das fases ----
  const PHASES = [
    {
      name: 'Colina do Pomar', goal: 5, theme: 0, powers: [], start: [4, 5],
      news: 'As bordas são portais: saia por um lado e apareça do outro. Uma seta mostra onde você vai surgir!',
      inner: ['....', '....', '....', '....'],
    },
    {
      name: 'Lago Espelho', goal: 7, theme: 1, powers: ['slow', 'double'],
      news: 'Novidade: barreiras (encostou, perdeu!) e power-ups. Pegue as caixinhas brilhantes!',
      inner: [
        '##..##',
        '#....#',
        '......',
        '......',
        '#....#',
        '##..##',
      ],
    },
    {
      name: 'Floresta Sussurro', goal: 8, theme: 2, rotten: 1, powers: ['slow', 'double', 'magnet'],
      news: 'Novidade: maçã podre, deixada pelo Corvo. Ela encolhe a cobra e tira pontos. Desvie!',
      inner: [
        '...##...',
        '...##...',
        '........',
        '##....##',
        '##....##',
        '........',
        '...##...',
        '...##...',
      ],
    },
    {
      name: 'Cânion Laranja', goal: 10, theme: 3, rotten: 2, powers: ['slow', 'double', 'magnet'],
      news: 'Uma sala de pedra no meio do cânion. Use as aberturas... e as bordas!',
      inner: [
        '####..####',
        '#........#',
        '#........#',
        '..........',
        '..........',
        '..........',
        '..........',
        '#........#',
        '#........#',
        '####..####',
      ],
    },
    {
      name: 'Vale dos Doces', goal: 10, theme: 4, rotten: 1, golden: true, powers: ['slow', 'double', 'magnet', 'ghost'],
      news: 'Novidade: maçã dourada. Vale o triplo, mas some em 6 segundos!',
      inner: [
        '########....',
        '............',
        '............',
        '....########',
        '............',
        '............',
        '########....',
        '............',
        '............',
        '....########',
        '............',
        '............',
      ],
    },
    {
      name: 'Campos Elétricos', goal: 12, theme: 5, golden: true, powers: ['slow', 'double', 'magnet', 'ghost'],
      news: 'Novidade: barreiras que piscam. Só passe quando estiverem apagadas!',
      inner: [
        '##........##',
        '#..........#',
        '....BBBB....',
        '............',
        '..B......B..',
        '..B......B..',
        '..B......B..',
        '..B......B..',
        '............',
        '....BBBB....',
        '#..........#',
        '##........##',
      ],
    },
    {
      name: 'Deserto Dourado', goal: 12, theme: 6, rotten: 2, runner: true, powers: ALL_POWERS,
      news: 'Novidade: maçã fujona. Ela pula para longe quando você chega perto!',
      inner: [
        '####......####',
        '#............#',
        '#............#',
        '..............',
        '..............',
        '....######....',
        '..............',
        '..............',
        '....######....',
        '..............',
        '..............',
        '#............#',
        '#............#',
        '####......####',
      ],
    },
    {
      name: 'Nebulosa Roxa', goal: 14, theme: 7, rotten: 1, golden: true, powers: ALL_POWERS,
      news: 'Novidade: portais coloridos. Entre em um e saia no outro da mesma cor!',
      inner: [
        '1.....##.....2',
        '......##......',
        '.#....##....#.',
        '.#..........#.',
        '.#..........#.',
        '..............',
        '..............',
        '..............',
        '..............',
        '.#..........#.',
        '.#....##....#.',
        '.#....##....#.',
        '......##......',
        '2.....##.....1',
      ],
    },
    {
      name: 'Vulcão Rubro', goal: 15, theme: 8, rotten: 2, golden: true, runner: true, powers: ALL_POWERS,
      news: 'Tudo junto: podres, fujona e barreiras que piscam.',
      inner: [
        'BBB..######..BBB',
        '................',
        '#..............#',
        '#....B....B....#',
        '#..............#',
        '................',
        '....##....##....',
        '................',
        '................',
        '....##....##....',
        '................',
        '#..............#',
        '#....B....B....#',
        '#..............#',
        '................',
        'BBB..######..BBB',
      ],
    },
    {
      name: 'Torre do Corvo', goal: 18, theme: 9, rotten: 3, golden: true, runner: true, crow: true, powers: ALL_POWERS,
      news: 'O Corvo sobrevoa a torre jogando maçãs podres. Recupere as últimas sementes e zere o jogo!',
      inner: [
        '1................2',
        '..................',
        '.#######..#######.',
        '..................',
        '.#..............#.',
        '.#...BBBBBBBB...#.',
        '.#..............#.',
        '..................',
        '........##........',
        '........##........',
        '..................',
        '.#..............#.',
        '.#...BBBBBBBB...#.',
        '.#..............#.',
        '..................',
        '.#######..#######.',
        '..................',
        '2................1',
      ],
    },
  ];
  // ---- fim das fases ----
  PHASES.forEach((p) => { p.map = pad(p.inner); if (!p.start) p.start = [2, 1]; });

  // Visual de cada terra: chão, detalhes, barreira e brilho da borda
  const THEMES = [
    { floor: ['#4fa046', '#58aa4e'], detail: 'grass', cols: ['#70c85e', '#3a8235', '#ffd84a', '#ff7ab0'], wall: 'hedge', pal: { a: '#1f4a1c', b: '#2f7a2a', c: '#5fbf4f' }, glow: 'rgba(109,255,138,.35)' },
    { floor: ['#2a6fb0', '#3078ba'], detail: 'water', cols: ['#7cc4ff', '#1d5a94'], wall: 'rock', pal: { a: '#2a2f3a', b: '#6b7280', c: '#a8b0c0', d: '#4a505c' }, glow: 'rgba(74,170,255,.4)' },
    { floor: ['#2e5a35', '#33623a'], detail: 'forest', cols: ['#4a8048', '#1e3d22', '#e04a4a'], wall: 'tree', pal: { a: '#123015', b: '#2f6b2a', c: '#56a84a', d: '#6b3b1f' }, glow: 'rgba(86,168,74,.35)' },
    { floor: ['#c8703a', '#d07840'], detail: 'canyon', cols: ['#9a5028', '#eea068'], wall: 'rock', pal: { a: '#5a2a12', b: '#a8542a', c: '#e0874a', d: '#7a3a18' }, glow: 'rgba(255,154,60,.4)' },
    { floor: ['#f7b4d2', '#fbc2dc'], detail: 'candy', cols: ['#ffffff', '#6dd6ff', '#ffe066', '#9b6dff'], wall: 'candy', pal: { b: '#c2307a', c: '#ffffff', d: '#ff5d9e' }, glow: 'rgba(255,138,200,.45)' },
    { floor: ['#18224a', '#1c2854'], detail: 'electric', cols: ['#2a3a7a', '#4af0ff'], wall: 'metal', pal: { a: '#1a2033', b: '#4a5470', c: '#9aa8c8', d: '#4af0ff' }, glow: 'rgba(74,240,255,.45)' },
    { floor: ['#e8c06a', '#eec874'], detail: 'sand', cols: ['#c99a40', '#f8e09a'], wall: 'cactus', pal: { a: '#1f5a2a', b: '#3a8a3a', c: '#6fcf5f' }, glow: 'rgba(255,216,74,.35)' },
    { floor: ['#1c0f3c', '#211244'], detail: 'space', cols: ['#ffffff', '#b07bff', '#4af0ff'], wall: 'asteroid', pal: { a: '#2a2238', b: '#6a5a80', c: '#a898c0' }, glow: 'rgba(176,123,255,.45)' },
    { floor: ['#3a1212', '#421616'], detail: 'lava', cols: ['#6a2020', '#ff6a2a', '#ffb02e'], wall: 'obsidian', pal: { a: '#0a0508', b: '#2a1a24', c: '#4a3040', d: '#ff7a2a' }, glow: 'rgba(255,90,40,.45)' },
    { floor: ['#46405a', '#4c4562'], detail: 'stone', cols: ['#322c42', '#605a78'], wall: 'brick', pal: null, glow: 'rgba(255,216,74,.4)' },
  ];

  const POWERS = {
    slow:   { name: 'Câmera lenta', short: 'Lento',    dur: 7000,  color: '#9cf9ff', desc: 'deixa a cobra mais devagar por 7 segundos' },
    double: { name: 'Pontos x2',    short: 'x2',       dur: 10000, color: '#ffd84a', desc: 'dobra os pontos por 10 segundos' },
    magnet: { name: 'Ímã',          short: 'Ímã',      dur: 8000,  color: '#ff3b5c', desc: 'puxa as maçãs para a frente da cobra' },
    ghost:  { name: 'Fantasma',     short: 'Fantasma', dur: 5000,  color: '#f4f0ff', desc: 'atravessa barreiras e o próprio corpo por 5 segundos' },
    trim:   { name: 'Tesoura',      short: 'Tesoura',  dur: 0,     color: '#b07bff', desc: 'corta metade do rabo, para sobrar espaço quando a cobra está grande' },
  };
  const powerSprite = (k) => PX.big('pw_' + k, PX.PAL['pw_' + k], 'pw_' + k, 2);
  const powerImg = (k) => PX.canvasURL(powerSprite(k), 2);

  const DIFFS = {
    facil:   { name: 'Fácil',   emoji: '🐢', tick: 190, dec: 3, mult: 1,   color: '#6dff8a' },
    medio:   { name: 'Médio',   emoji: '🐍', tick: 145, dec: 4, mult: 1.5, color: '#ffd84a' },
    dificil: { name: 'Difícil', emoji: '🔥', tick: 110, dec: 5, mult: 2,   color: '#ff5d9e' },
  };
  const DIFF_KEYS = Object.keys(DIFFS);

  const T = 16; // pixels por casa no desenho em baixa resolução
  const BASE_POINTS = 10;
  const COMBO_WINDOW = 3000;
  const BLINK_ON = 2600;
  const BLINK_CYCLE = 4200;
  const BLINK_WARN = 700;
  const GOLD_TTL = 6000;
  const ROTTEN_TTL = 9000;
  const POWER_TTL = 9000;
  const GHOST_MS = 1500;
  const GHOST_WARN = 1600;
  const MAP_ANIM = 900;
  const SLOW_FACTOR = 1.6;
  const OUT = PX.OUTLINE;

  const APPLE_COLORS = ['#e8393f', '#f6787c', '#ffd84a', '#ffffff', '#62c84f'];
  const GOLD_COLORS = ['#ffd84a', '#fffbd6', '#ff9a3c', '#ffffff'];
  const ROT_COLORS = ['#9aa84a', '#6b6b2a', '#c7d36b', '#4a4a1a'];
  const RAINBOW = ['#6dff8a', '#ffd84a', '#ff9a3c', '#ff5d9e', '#b07bff', '#4af0ff'];
  const PORTAL_COLORS = ['#4af0ff', '#ff9a3c', '#b07bff'];
  const GHOST_PAL = ['#4a3f70', '#c9c0ec', '#f4f0ff', '#ffffff'];
  const DEAD_PAL = [OUT, '#4a405a', '#7a6a98', '#b9add0'];

  // As 3 cobrinhas. color(i, n, s): cor do gomo i (de n) no tom s
  // (0 contorno, 1 sombra, 2 corpo, 3 brilho)
  const CORAL_BANDS = [
    ['#1a0a10', '#a8182e', '#e8393f', '#ff9a9e'],
    ['#0a0610', '#14101e', '#2e2640', '#6a6084'],
    ['#1a0a10', '#c99a10', '#ffd84a', '#fff3b0'],
    ['#0a0610', '#14101e', '#2e2640', '#6a6084'],
  ];
  const SKINS = {
    arco: {
      name: 'Arco-íris', cost: 0, perk: 'Equilibrada, boa para começar',
      color: (i, n, s) => {
        if (s === 0) return OUT;
        const h = Math.round(((now / 30 + i * 13) % 360) / 30) * 30;
        return `hsl(${h} ${[0, 75, 90, 100][s]}% ${[0, 38, 56, 82][s]}%)`;
      },
    },
    coral: {
      name: 'Coral', cost: 2000, perk: '+25% de pontos em cada maçã', mult: 1.25,
      color: (i, n, s) => CORAL_BANDS[Math.floor(i) % 4][s],
    },
    dragao: {
      name: 'Dragão', cost: 7000, perk: 'Escudo: aguenta 1 batida por fase', shield: true, dragon: true,
      color: (i, n, s) => {
        if (s === 0) return '#0f1a14';
        const h = Math.round((150 - (i / Math.max(n - 1, 1)) * 110) / 15) * 15;
        return `hsl(${h} ${[0, 70, 80, 90][s]}% ${[0, 28, 45, 72][s]}%)`;
      },
    },
  };
  const SKIN_KEYS = Object.keys(SKINS);

  // =====================================================================
  //  SAVE GAME (localStorage)
  // =====================================================================
  const SAVE_KEY = 'cobrinha-save-v2';

  function defaultSave() {
    const per = (v) => DIFF_KEYS.reduce((acc, k) => { acc[k] = v; return acc; }, {});
    return {
      v: 2,
      total: 0,
      skin: 'arco',
      diff: 'medio',
      progress: per(1),
      selected: per(0),
      cleared: per(false),
      best: per(0),
      fresh: [],
      muted: false,
      musicOff: false,
      seenStory: false,
    };
  }

  function sanitize(o) {
    const d = defaultSave();
    if (!o || typeof o !== 'object') return d;
    const num = (v, min, max) => (Number.isFinite(+v) ? Math.min(max, Math.max(min, Math.floor(+v))) : min);
    d.total = num(o.total, 0, 1e9);
    if (SKINS[o.skin]) d.skin = o.skin;
    if (DIFFS[o.diff]) d.diff = o.diff;
    const pick = (obj, k) => (obj && typeof obj === 'object' ? obj[k] : undefined);
    for (const k of DIFF_KEYS) {
      d.progress[k] = num(pick(o.progress, k), 1, PHASES.length);
      d.selected[k] = Math.min(num(pick(o.selected, k), 0, PHASES.length - 1), d.progress[k] - 1);
      d.cleared[k] = !!pick(o.cleared, k);
      d.best[k] = num(pick(o.best, k), 0, 1e9);
    }
    if (Array.isArray(o.fresh)) d.fresh = o.fresh.filter((k) => SKINS[k]);
    d.muted = !!o.muted;
    d.musicOff = !!o.musicOff;
    d.seenStory = !!o.seenStory;
    if (SKINS[d.skin].cost > d.total) d.skin = 'arco';
    return d;
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return sanitize(JSON.parse(raw));
    } catch (e) { /* save corrompido ou sem acesso: começa do zero */ }
    return defaultSave();
  }

  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* sem storage */ }
  }

  const save = loadSave();
  const isUnlocked = (k) => save.total >= SKINS[k].cost;
  AU.settings.sfx = !save.muted;
  AU.settings.music = !save.musicOff;

  function vibrate(p) {
    if (save.muted || !navigator.vibrate || (navigator.userActivation && !navigator.userActivation.hasBeenActive)) return;
    try { navigator.vibrate(p); } catch (e) { /* ignore */ }
  }

  // =====================================================================
  //  DOM
  // =====================================================================
  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const lo = document.createElement('canvas'); // mundo em baixa resolução
  const lctx = lo.getContext('2d');
  const ui = {
    phase: $('phase'), goalText: $('goalText'), goalFill: $('goalFill'), score: $('score'),
    shield: $('shield'), mute: $('mute'), musicBtn: $('musicBtn'), pauseBtn: $('pauseBtn'), readyHint: $('readyHint'),
    intro: $('intro'), pause: $('pause'), dead: $('dead'), clear: $('clear'), victory: $('victory'),
    toast: $('toast'), menu: $('menu'), buffs: $('buffs'),
    introKicker: $('introKicker'), introName: $('introName'), introGoal: $('introGoal'),
    introSize: $('introSize'), introNews: $('introNews'), introPowers: $('introPowers'),
    deadReason: $('deadReason'), deadLeft: $('deadLeft'),
    clearKicker: $('clearKicker'), clearScore: $('clearScore'), clearBonus: $('clearBonus'),
    victoryScore: $('victoryScore'), victoryText: $('victoryText'),
    total: $('total'), nextFill: $('nextFill'), nextText: $('nextText'),
    skins: $('skins'), diffs: $('diffs'), phases: $('phases'), play: $('play'),
    sfxToggle: $('sfxToggle'), musicToggle: $('musicToggle'),
  };
  const fmt = (n) => Math.round(n).toLocaleString('pt-BR');
  const appleURL = PX.canvasURL(PX.apple('red'), 2);
  document.querySelectorAll('[data-apple-icon]').forEach((img) => { img.src = appleURL; });

  // =====================================================================
  //  ESTADO
  // =====================================================================
  // title | story | menu | intro | ready | play | pause | dying | clear | dead | victory
  let state = 'title';
  let pausedFrom = 'play';
  let D = DIFFS[save.diff];
  let SKIN = SKINS[save.skin];
  let phaseIdx = 0;
  let P = PHASES[0];
  let theme = THEMES[0];

  let N = 10;
  let grid = new Uint8Array(100); // 0 livre, 1 barreira, 2 barreira que pisca
  let portalMap = new Map();
  let portalList = [];
  let blinkCells = [];

  let snake = [];
  let prev = [];
  let dir = { x: 1, y: 0 };
  let queue = [];
  let grow = 0;
  let apple = null;
  let golden = null;
  let rotten = [];
  let power = null;
  let buffs = {};
  let buffsKey = '';
  let debris = [];
  let score = 0;
  let phaseStartScore = 0;
  let applesEaten = 0;
  let tick = 130;
  let acc = 0;
  let phaseTime = 0;
  let combo = 1;
  let lastEat = -1e9;
  let rottenTimer = 0;
  let powerTimer = 0;
  let magnetTimer = 0;
  let shieldReady = false;
  let ghostUntil = 0;
  let ghostWarned = false;
  let warnTick = 0;
  let emberTimer = 0;
  let crow = null;
  let deathAt = 0;
  let deathReason = '';
  let burstIdx = 0;
  let clearAt = 0;
  let clearShown = false;
  let mapBorn = 0;
  let colorAmt = 0.3;

  let waves = [];
  let headPop = 0;
  const particles = [];
  const floaters = [];
  const rings = [];
  let shake = 0;
  let flash = { a: 0, color: '#fff' };
  let now = performance.now();

  // =====================================================================
  //  CANVAS
  // =====================================================================
  let C = 32; // tamanho de uma casa no canvas grande
  let bgColor = document.createElement('canvas');
  let bgGrey = document.createElement('canvas');

  function resize() {
    const size = stage.clientWidth;
    if (!size) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const k = Math.max(1, Math.round((size * dpr) / (N * T)));
    canvas.width = canvas.height = N * T * k;
    C = T * k;
  }

  const easeOutBack = (t) => Math.max(0.001, 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2));
  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };

  function wallSprite(x, y) {
    if (theme.pal) return PX.big(theme.wall, theme.pal, 'wall' + P.theme, 2);
    const h = Math.round(((x + y) * 24) % 360 / 30) * 30;
    return PX.big(theme.wall, { a: `hsl(${h} 55% 22%)`, b: `hsl(${h} 75% 48%)`, c: `hsl(${h} 90% 72%)` }, 'rb' + h, 2);
  }

  // detalhes do chão de cada terra (posições sorteadas com semente, sempre iguais)
  function drawDetail(g, x0, y0, r) {
    const c = theme.cols;
    const rx = (n = 14) => x0 + 1 + Math.floor(r() * n);
    const ry = (n = 14) => y0 + 1 + Math.floor(r() * n);
    switch (theme.detail) {
      case 'grass':
        for (let i = 0; i < 3; i++) if (r() < 0.6) { const x = rx(13); const y = ry(11); px(g, x, y + 1, c[1], 1, 3); px(g, x + 1, y, c[0], 1, 3); px(g, x + 2, y + 1, c[1], 1, 2); }
        if (r() < 0.1) { const x = rx(11); const y = ry(11); const f = r() < 0.5 ? c[2] : c[3]; px(g, x + 1, y, f); px(g, x, y + 1, f); px(g, x + 2, y + 1, f); px(g, x + 1, y + 2, f); px(g, x + 1, y + 1, '#ffffff'); }
        break;
      case 'water':
        for (let i = 0; i < 2; i++) if (r() < 0.6) { const x = rx(9); const y = ry(13); px(g, x, y, c[0], 5, 1); px(g, x + 1, y - 1, c[0], 3, 1); }
        if (r() < 0.3) px(g, rx(), ry(), c[1], 3, 1);
        break;
      case 'forest':
        for (let i = 0; i < 4; i++) if (r() < 0.6) px(g, rx(), ry(), c[i % 2], 2, 1);
        if (r() < 0.05) { const x = rx(10); const y = ry(10); px(g, x, y, c[2], 4, 2); px(g, x + 1, y + 2, '#f4ead0', 2, 2); px(g, x + 1, y, '#ffffff'); }
        break;
      case 'canyon':
        if (r() < 0.5) { const x = rx(9); const y = ry(9); for (let k = 0; k < 4; k++) px(g, x + k, y + (k >> 1), c[0]); }
        for (let i = 0; i < 2; i++) if (r() < 0.4) px(g, rx(), ry(), c[1], 2, 1);
        break;
      case 'candy':
        for (let i = 0; i < 3; i++) if (r() < 0.6) { const col = c[Math.floor(r() * c.length)]; if (r() < 0.5) px(g, rx(12), ry(), col, 3, 1); else px(g, rx(), ry(12), col, 1, 3); }
        break;
      case 'electric':
        px(g, x0, y0, c[0], T, 1);
        px(g, x0, y0, c[0], 1, T);
        if (r() < 0.08) px(g, x0, y0, c[1], 2, 2);
        break;
      case 'sand':
        for (let i = 0; i < 3; i++) if (r() < 0.5) px(g, rx(), ry(), c[0]);
        if (r() < 0.35) { const x = rx(9); const y = ry(13); px(g, x, y, c[1], 5, 1); }
        break;
      case 'space':
        if (r() < 0.35) { const x = rx(); const y = ry(); const col = c[Math.floor(r() * c.length)]; px(g, x, y, col); if (r() < 0.25) { px(g, x - 1, y, col); px(g, x + 1, y, col); px(g, x, y - 1, col); px(g, x, y + 1, col); } }
        break;
      case 'lava':
        if (r() < 0.4) { const x = rx(9); const y = ry(9); for (let k = 0; k < 4; k++) px(g, x + k, y + k, k % 2 ? c[2] : c[1]); }
        for (let i = 0; i < 2; i++) if (r() < 0.4) px(g, rx(), ry(), c[0], 2, 2);
        break;
      case 'stone':
        px(g, x0, y0 + T - 1, c[0], T, 1);
        px(g, x0 + (((y0 / T) % 2) ? 7 : T - 1), y0, c[0], 1, T - 1);
        if (r() < 0.3) px(g, rx(), ry(), c[1], 2, 1);
        break;
      default:
    }
  }

  // chão e barreiras fixas (versão colorida e versão cinza)
  function buildBackground() {
    bgColor = document.createElement('canvas');
    bgColor.width = bgColor.height = N * T;
    const g = bgColor.getContext('2d');
    const r = PX.rng(1000 + phaseIdx * 77);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        px(g, x * T, y * T, theme.floor[(x + y) % 2], T, T);
        drawDetail(g, x * T, y * T, r);
      }
    }
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (grid[y * N + x] !== 1) continue;
        px(g, x * T + 2, y * T + 3, 'rgba(0,0,0,0.3)', T - 1, T - 1);
        g.drawImage(wallSprite(x, y), x * T, y * T);
      }
    }
    bgGrey = PX.greyCopy(bgColor, 1, 0.8);
  }

  // =====================================================================
  //  MAPA E FASES
  // =====================================================================
  function loadMap(rows) {
    N = rows.length;
    grid = new Uint8Array(N * N);
    portalMap = new Map();
    portalList = [];
    blinkCells = [];
    const pairs = {};
    rows.forEach((row, y) => {
      for (let x = 0; x < N; x++) {
        const ch = row[x];
        if (ch === '#') grid[y * N + x] = 1;
        else if (ch === 'B') { grid[y * N + x] = 2; blinkCells.push({ x, y }); }
        else if (/[1-9]/.test(ch)) (pairs[ch] = pairs[ch] || []).push({ x, y });
      }
    });
    Object.keys(pairs).sort().forEach((k, i) => {
      const [a, b] = pairs[k];
      const color = PORTAL_COLORS[i % PORTAL_COLORS.length];
      portalMap.set(a.y * N + a.x, { x: b.x, y: b.y, color });
      portalMap.set(b.y * N + b.x, { x: a.x, y: a.y, color });
      portalList.push({ x: a.x, y: a.y, color }, { x: b.x, y: b.y, color });
    });
    lo.width = lo.height = N * T;
    resize();
  }

  const blinkPhase = () => phaseTime % BLINK_CYCLE;
  const blinkOn = () => blinkPhase() < BLINK_ON;
  const blinkWarn = () => blinkPhase() >= BLINK_CYCLE - BLINK_WARN;
  const wallAt = (x, y) => {
    const g = grid[y * N + x];
    return g === 1 || (g === 2 && blinkOn());
  };

  const wd = (a, b) => { const d = Math.abs(a - b); return Math.min(d, N - d); };
  const dist = (p, q) => wd(p.x, q.x) + wd(p.y, q.y);
  const wrapDelta = (from, to) => { let d = to - from; if (d > N / 2) d -= N; else if (d < -N / 2) d += N; return d; };

  const itemAt = (x, y) =>
    (apple && apple.x === x && apple.y === y) ||
    (golden && golden.x === x && golden.y === y) ||
    (power && power.x === x && power.y === y) ||
    rotten.some((r) => r.x === x && r.y === y);

  const isFree = (x, y) =>
    grid[y * N + x] === 0 &&
    !portalMap.has(y * N + x) &&
    !snake.some((s) => s.x === x && s.y === y) &&
    !itemAt(x, y);

  function spawnFree(minDist = 0) {
    const head = snake[0];
    for (let i = 0; i < 500; i++) {
      const x = Math.floor(Math.random() * N);
      const y = Math.floor(Math.random() * N);
      if (isFree(x, y) && (!head || dist(head, { x, y }) >= minDist)) return { x, y, born: now, t0: phaseTime };
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (isFree(x, y)) return { x, y, born: now, t0: phaseTime };
    return null;
  }

  function setupPhase(idx) {
    phaseIdx = idx;
    P = PHASES[idx];
    theme = THEMES[P.theme];
    D = DIFFS[save.diff];
    SKIN = SKINS[save.skin];
    loadMap(P.map);

    const [sx, sy] = P.start;
    snake = [0, 1, 2].map((i) => ({ x: (sx - i + N) % N, y: sy }));
    prev = snake.map((p) => ({ x: p.x, y: p.y }));
    dir = { x: 1, y: 0 };
    queue = [];
    grow = 0;
    applesEaten = 0;
    tick = D.tick - idx * D.dec;
    acc = 0;
    phaseTime = 0;
    combo = 1;
    lastEat = -1e9;
    waves = [];
    headPop = 0;
    burstIdx = 0;
    golden = null;
    rotten = [];
    power = null;
    buffs = {};
    debris = [];
    rottenTimer = 2500;
    powerTimer = 5000;
    magnetTimer = 0;
    shieldReady = !!SKIN.shield;
    ghostUntil = 0;
    ghostWarned = false;
    crow = P.crow ? { active: false, nextAt: 3000 } : null;
    clearShown = false;
    colorAmt = 0.3;
    particles.length = 0;
    floaters.length = 0;
    rings.length = 0;
    apple = spawnFree(3);
    if (apple) apple.nextHop = 0;

    buildBackground();
    mapBorn = now;
    document.documentElement.style.setProperty('--glow', theme.glow);
    if (stage.animate) {
      stage.animate(
        [{ transform: 'scale(.9)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }],
        { duration: 450, easing: 'steps(6, end)' },
      );
    }
    updateHud();
    renderBuffs(true);
  }

  // =====================================================================
  //  FLUXO DO JOGO
  // =====================================================================
  function startRun(idx) {
    sfx.unlock();
    score = 0;
    goPhase(idx);
  }

  function goPhase(idx) {
    phaseStartScore = score;
    setupPhase(idx);
    state = 'intro';
    ui.introKicker.textContent = `Terra ${idx + 1} de ${PHASES.length} · ${D.name}`;
    ui.introName.textContent = P.name;
    ui.introGoal.textContent = `Meta: ${P.goal} maçãs`;
    ui.introSize.textContent = `Mapa ${N}×${N}`;
    ui.introNews.textContent = P.news || '';
    const prevPowers = idx > 0 ? PHASES[idx - 1].powers : [];
    const fresh = P.powers.filter((k) => prevPowers.indexOf(k) < 0);
    const old = P.powers.filter((k) => prevPowers.indexOf(k) >= 0);
    ui.introPowers.innerHTML =
      fresh.map((k) => `<span class="pw-chip new"><img src="${powerImg(k)}" alt=""><span><b>Novo: ${POWERS[k].name}</b> ${POWERS[k].desc}</span></span>`).join('') +
      old.map((k) => `<span class="pw-chip" title="${POWERS[k].desc}"><img src="${powerImg(k)}" alt="">${POWERS[k].name}</span>`).join('');
    showMenu(false);
    showOverlay(ui.intro);
    music.play('p' + (idx + 1));
  }

  function beginReady() {
    state = 'ready';
    showOverlay(null);
  }

  function startMoving() {
    if (state !== 'ready') return;
    state = 'play';
    acc = 0;
    sfx.start();
    music.play('p' + (phaseIdx + 1));
  }

  function retryPhase() {
    score = phaseStartScore;
    setupPhase(phaseIdx);
    state = 'ready';
    showOverlay(null);
    music.play('p' + (phaseIdx + 1));
  }

  function togglePause() {
    if (state === 'play' || state === 'ready') {
      pausedFrom = state;
      state = 'pause';
      showOverlay(ui.pause);
      music.duck(true);
    } else if (state === 'pause') {
      state = pausedFrom;
      showOverlay(null);
      music.duck(false);
    }
  }

  function addPoints(n) {
    score = Math.max(0, score + n);
    if (n <= 0) return;
    const before = save.total;
    save.total += n;
    for (const k of SKIN_KEYS) {
      const c = SKINS[k].cost;
      if (c > before && c <= save.total) {
        if (save.fresh.indexOf(k) < 0) save.fresh.push(k);
        setTimeout(() => {
          showToast(`${SKINS[k].name} liberada!`);
          sfx.unlocked();
        }, 500);
      }
    }
  }

  function recordBest() {
    if (score > save.best[save.diff]) save.best[save.diff] = score;
    persist();
  }

  // =====================================================================
  //  ENTRADA
  // =====================================================================
  function pushDir(dx, dy) {
    if (state === 'ready') {
      if (dx === -dir.x && dy === -dir.y) return;
      dir = { x: dx, y: dy };
      startMoving();
      return;
    }
    if (state !== 'play') return;
    const last = queue.length ? queue[queue.length - 1] : dir;
    if ((dx === last.x && dy === last.y) || (dx === -last.x && dy === -last.y)) return;
    if (queue.length < 3) {
      queue.push({ x: dx, y: dy });
      sfx.turn();
    }
  }

  const KEYS = {
    arrowup: [0, -1], w: [0, -1],
    arrowdown: [0, 1], s: [0, 1],
    arrowleft: [-1, 0], a: [-1, 0],
    arrowright: [1, 0], d: [1, 0],
  };

  function navRoot() {
    if (state === 'menu') return ui.menu;
    return [ui.intro, ui.pause, ui.dead, ui.clear, ui.victory].find((o) => o.classList.contains('show')) || null;
  }

  // anda pelo menu com as setas, escolhendo o botão mais próximo na direção
  function moveFocus(root, dx, dy) {
    const buttons = [...root.querySelectorAll('button:not(:disabled)')].filter((b) => b.offsetParent !== null);
    if (!buttons.length) return;
    const cur = document.activeElement;
    if (!root.contains(cur) || cur.tagName !== 'BUTTON') {
      (root === ui.menu ? ui.play : buttons[0]).focus();
      sfx.hover();
      return;
    }
    const a = cur.getBoundingClientRect();
    const ax = a.left + a.width / 2;
    const ay = a.top + a.height / 2;
    let best = null;
    let bestScore = Infinity;
    for (const b of buttons) {
      if (b === cur) continue;
      const r = b.getBoundingClientRect();
      const bx = r.left + r.width / 2 - ax;
      const by = r.top + r.height / 2 - ay;
      const along = bx * dx + by * dy;
      if (along <= 4) continue;
      const across = Math.abs(dx ? by : bx);
      const s = along + across * 2.5;
      if (s < bestScore) { bestScore = s; best = b; }
    }
    if (best) {
      best.focus();
      best.scrollIntoView({ block: 'nearest' });
      sfx.hover();
    }
  }

  window.addEventListener('keydown', (e) => {
    if (state === 'title' || state === 'story') return;
    const k = e.key.toLowerCase();
    const onButton = e.target && e.target.closest ? e.target.closest('button') : null;
    const root = navRoot();

    if (KEYS[k] && k.indexOf('arrow') === 0 && root) {
      e.preventDefault();
      moveFocus(root, KEYS[k][0], KEYS[k][1]);
      return;
    }
    if (onButton && (k === 'enter' || k === ' ')) return; // o próprio botão responde
    if (KEYS[k] && state !== 'menu') {
      e.preventDefault();
      pushDir(KEYS[k][0], KEYS[k][1]);
      return;
    }

    if (k === ' ' || k === 'enter') {
      e.preventDefault();
      if (state === 'menu') ui.play.click();
      else if (state === 'intro') beginReady();
      else if (state === 'ready') startMoving();
      else if (state === 'play') { if (k === ' ') togglePause(); }
      else if (state === 'pause') togglePause();
      else if (state === 'dead') retryPhase();
      else if (state === 'clear' && clearShown) nextPhase();
      else if (state === 'victory') showMenu(true);
    } else if (k === 'p' || k === 'escape') {
      if (state === 'play' || state === 'ready' || state === 'pause') { e.preventDefault(); togglePause(); }
    } else if (k === 'm') {
      toggleSfx();
    }
  });

  // sons de interface: passar o mouse e clicar em qualquer botão
  let lastHover = null;
  document.addEventListener('pointerover', (e) => {
    const b = e.target.closest ? e.target.closest('button') : null;
    if (!b || b === lastHover || b.disabled) { if (!b) lastHover = null; return; }
    lastHover = b;
    if (e.pointerType === 'mouse') sfx.hover();
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    if (b.classList.contains('locked')) sfx.deny();
    else if (!b.dataset.silent) sfx.click();
  }, true);

  // deslizar no celular (pode encadear sem tirar o dedo)
  let touch = null;
  stage.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touch = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  stage.addEventListener('touchmove', (e) => {
    if (!touch) return;
    if (state === 'play' || state === 'ready') e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - touch.x;
    const dy = t.clientY - touch.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    if (Math.abs(dx) > Math.abs(dy)) pushDir(Math.sign(dx), 0);
    else pushDir(0, Math.sign(dy));
    touch = { x: t.clientX, y: t.clientY };
  }, { passive: false });

  stage.addEventListener('touchend', () => { touch = null; });

  function syncAudioButtons() {
    ui.mute.textContent = save.muted ? '🔇' : '🔊';
    ui.musicBtn.textContent = save.musicOff ? '🎵' : '🎶';
    ui.musicBtn.classList.toggle('off', save.musicOff);
    ui.sfxToggle.textContent = `Sons: ${save.muted ? 'desligados' : 'ligados'}`;
    ui.musicToggle.textContent = `Música: ${save.musicOff ? 'desligada' : 'ligada'}`;
  }

  function toggleSfx() {
    save.muted = !save.muted;
    AU.settings.sfx = !save.muted;
    persist();
    syncAudioButtons();
  }

  function toggleMusic() {
    save.musicOff = !save.musicOff;
    AU.setMusic(!save.musicOff);
    persist();
    syncAudioButtons();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (state === 'play' || state === 'ready')) togglePause();
  });

  // =====================================================================
  //  LÓGICA DE CADA PASSO
  // =====================================================================
  const tickNow = () => tick * (buffs.slow ? SLOW_FACTOR : 1);

  function step() {
    if (queue.length) dir = queue.shift();
    prev = snake.map((p) => ({ x: p.x, y: p.y }));

    const h = snake[0];
    const rawX = h.x + dir.x;
    const rawY = h.y + dir.y;
    let nx = (rawX + N) % N;
    let ny = (rawY + N) % N;
    const wrapped = rawX !== nx || rawY !== ny;

    const portal = portalMap.get(ny * N + nx);
    if (portal) {
      rings.push({ x: nx + 0.5, y: ny + 0.5, life: 0, max: 450, color: portal.color, size: 1.4 });
      burst(nx + 0.5, ny + 0.5, [portal.color, '#ffffff'], 14, 0.7);
      nx = portal.x;
      ny = portal.y;
      rings.push({ x: nx + 0.5, y: ny + 0.5, life: 0, max: 450, color: portal.color, size: 1.4 });
      burst(nx + 0.5, ny + 0.5, [portal.color, '#ffffff'], 14, 0.7);
      sfx.portal();
    } else if (wrapped) {
      rings.push({ x: rawX + 0.5, y: rawY + 0.5, life: 0, max: 350, color: '#4af0ff', size: 0.9 });
      rings.push({ x: nx + 0.5, y: ny + 0.5, life: 0, max: 350, color: '#4af0ff', size: 0.9 });
    }

    const ghost = phaseTime < ghostUntil;
    const solid = grow > 0 ? snake.length : snake.length - 1;
    let hitSelf = false;
    for (let i = 0; i < solid; i++) if (snake[i].x === nx && snake[i].y === ny) { hitSelf = true; break; }
    const hitWall = wallAt(nx, ny);

    if ((hitWall || hitSelf) && !ghost) {
      if (shieldReady) useShield(nx, ny);
      else return die(hitSelf ? 'Mordeu o próprio rabo!' : grid[ny * N + nx] === 2 ? 'A barreira acendeu na hora errada!' : 'Bateu numa barreira!');
    }

    snake.unshift({ x: nx, y: ny });
    if (grow > 0) grow--;
    else snake.pop();

    // o modo fantasma não pode acabar com a cabeça dentro de uma barreira
    if (phaseTime < ghostUntil && grid[ny * N + nx] !== 0) ghostUntil = Math.max(ghostUntil, phaseTime + tickNow() + 1);

    if (apple && nx === apple.x && ny === apple.y) eat(apple, 'red');
    else if (golden && nx === golden.x && ny === golden.y) eat(golden, 'gold');
    else if (power && nx === power.x && ny === power.y) takePower();
    else {
      const r = rotten.findIndex((it) => it.x === nx && it.y === ny);
      if (r >= 0) eatRotten(r);
    }
  }

  function useShield(x, y) {
    shieldReady = false;
    ghostUntil = Math.max(ghostUntil, phaseTime + GHOST_MS);
    ghostWarned = true;
    rings.push({ x: x + 0.5, y: y + 0.5, life: 0, max: 600, color: '#ffd84a', size: 2.5 });
    burst(x + 0.5, y + 0.5, GOLD_COLORS, 30, 1.2);
    floaters.push({ x: x + 0.5, y: y - 0.3, text: 'Escudo!', life: 0, max: 1100, color: '#ffd84a', size: 0.8 });
    shake = 16;
    flash = { a: 0.3, color: '#ffd84a' };
    sfx.shield();
    vibrate([40, 30, 40]);
    updateHud();
  }

  function eat(item, kind) {
    const gold = kind === 'gold';
    const cx = item.x + 0.5;
    const cy = item.y + 0.5;

    combo = now - lastEat < COMBO_WINDOW ? Math.min(combo + 1, 8) : 1;
    lastEat = now;
    const gain = Math.round(BASE_POINTS * combo * (gold ? 3 : 1) * D.mult * (SKIN.mult || 1) * (buffs.double ? 2 : 1));
    addPoints(gain);
    grow += gold ? 3 : 1;
    applesEaten++;
    tick = Math.max(45, tick - 1);

    waves.push(now);
    headPop = 1;
    burst(cx, cy, gold ? GOLD_COLORS : APPLE_COLORS, gold ? 44 : 26, gold ? 1.5 : 1);
    rings.push({ x: cx, y: cy, life: 0, max: 450, color: gold ? '#ffd84a' : '#ff8a9b', size: gold ? 2.6 : 1.8 });
    // onda de cor: a terra volta a colorir a partir da maçã comida
    rings.push({ x: cx, y: cy, life: 0, max: 700, color: RAINBOW[applesEaten % RAINBOW.length], size: N * 0.5 });
    floaters.push({ x: cx, y: cy - 0.2, text: '+' + gain, life: 0, max: 900, color: gold ? '#ffd84a' : '#ffffff', size: gold ? 1.1 : 0.85 });
    if (combo > 1) floaters.push({ x: cx, y: cy - 1.1, text: 'combo x' + combo, life: 0, max: 1000, color: '#4af0ff', size: 0.6 });
    shake = Math.max(shake, gold ? 14 : 6 + combo);
    flash = { a: gold ? 0.35 : 0.12, color: gold ? '#ffd84a' : '#ff8ab0' };
    sfx.eat(combo, gold);
    vibrate(gold ? [25, 30, 25] : 22);

    if (gold) {
      golden = null;
    } else {
      apple = applesEaten < P.goal ? spawnFree(3) : null;
      if (apple) apple.nextHop = phaseTime + 600;
      if (P.golden && !golden && applesEaten < P.goal && Math.random() < 0.25) {
        const g = spawnFree(4);
        if (g) golden = g;
      }
    }

    updateHud(true);
    persist();
    if (applesEaten >= P.goal) phaseClear();
  }

  function eatRotten(idx) {
    const it = rotten.splice(idx, 1)[0];
    const cx = it.x + 0.5;
    const cy = it.y + 0.5;
    const penalty = Math.round(BASE_POINTS * 1.5 * D.mult);
    addPoints(-penalty);
    combo = 1;
    lastEat = -1e9;

    let shrink = 2;
    const g = Math.min(grow, shrink);
    grow -= g;
    shrink -= g;
    while (shrink-- > 0 && snake.length > 2) {
      const s = snake.pop();
      prev.pop();
      burst(s.x + 0.5, s.y + 0.5, ROT_COLORS, 10, 0.8);
    }

    burst(cx, cy, ROT_COLORS, 22, 1);
    rings.push({ x: cx, y: cy, life: 0, max: 450, color: '#9aa84a', size: 1.6 });
    floaters.push({ x: cx, y: cy - 0.2, text: `-${penalty}`, life: 0, max: 1000, color: '#c7d36b', size: 0.8 });
    shake = 12;
    flash = { a: 0.25, color: '#6b8a2a' };
    sfx.rotten();
    vibrate([60, 30, 60]);
    updateHud(true);
  }

  function takePower() {
    const k = power.kind;
    const pw = POWERS[k];
    const cx = power.x + 0.5;
    const cy = power.y + 0.5;
    power = null;

    if (k === 'trim') {
      // corta metade do rabo: os gomos cortados ficam cinza, tremem e estouram um a um
      const cut = Math.max(2, Math.floor((snake.length - 3) / 2));
      const n = snake.length;
      for (let j = 0; j < cut && snake.length > 3; j++) {
        const s = snake.pop();
        prev.pop();
        debris.push({ x: s.x, y: s.y, at: now + 250 + (cut - j) * 70, color: SKIN.color(n - 1 - j, n, 2) });
      }
      grow = 0;
      const tail = snake[snake.length - 1];
      floaters.push({ x: cx, y: cy - 0.2, text: `Rabo cortado! -${cut}`, life: 0, max: 1600, color: pw.color, size: 0.8 });
      rings.push({ x: tail.x + 0.5, y: tail.y + 0.5, life: 0, max: 500, color: pw.color, size: 1.6 });
      sfx.trim();
    } else {
      buffs[k] = phaseTime + pw.dur;
      if (k === 'ghost') { ghostUntil = Math.max(ghostUntil, buffs[k]); ghostWarned = false; }
      floaters.push({ x: cx, y: cy - 0.2, text: pw.name + '!', life: 0, max: 1200, color: pw.color, size: 0.8 });
      sfx.power();
    }

    burst(cx, cy, [pw.color, '#ffffff', '#ffd84a'], 30, 1.2);
    rings.push({ x: cx, y: cy, life: 0, max: 550, color: pw.color, size: 2.4 });
    flash = { a: 0.25, color: pw.color };
    shake = Math.max(shake, 8);
    vibrate([20, 20, 40]);
    renderBuffs(true);
  }

  function phaseClear() {
    state = 'clear';
    clearAt = now;
    buffs = {};
    renderBuffs(true);
    const bonus = Math.round(50 * (phaseIdx + 1) * D.mult);
    addPoints(bonus);
    ui.clearBonus.textContent = `Bônus da terra: +${fmt(bonus)}`;
    const last = phaseIdx === PHASES.length - 1;
    save.progress[save.diff] = Math.max(save.progress[save.diff], Math.min(PHASES.length, phaseIdx + 2));
    if (!last) save.selected[save.diff] = phaseIdx + 1;
    if (last) save.cleared[save.diff] = true;
    recordBest();

    music.stop(0.3);
    showToast(last ? 'ZEROU!' : 'Cores restauradas!');
    confetti(last ? 160 : 80);
    rings.push({ x: snake[0].x + 0.5, y: snake[0].y + 0.5, life: 0, max: 900, color: '#ffd84a', size: N * 0.8 });
    flash = { a: 0.4, color: '#ffffff' };
    shake = 10;
    if (last) sfx.victory(); else sfx.clear();
    vibrate([30, 40, 30, 40, 80]);
    updateHud(true);
  }

  function showClearScreen() {
    clearShown = true;
    if (phaseIdx === PHASES.length - 1) {
      state = 'story';
      STORY.play('ending', () => {
        state = 'victory';
        ui.victoryScore.textContent = fmt(score);
        ui.victoryText.textContent = `Você devolveu as cores às ${PHASES.length} terras no ${D.name}!`;
        showOverlay(ui.victory);
        confetti(120);
      });
      return;
    }
    ui.clearKicker.textContent = `Terra ${phaseIdx + 1} de ${PHASES.length} · ${P.name}`;
    ui.clearScore.textContent = fmt(score);
    showOverlay(ui.clear);
  }

  function nextPhase() {
    if (phaseIdx + 1 < PHASES.length) goPhase(phaseIdx + 1);
  }

  function die(reason) {
    state = 'dying';
    deathAt = now;
    deathReason = reason;
    burstIdx = 0;
    buffs = {};
    renderBuffs(true);
    prev = snake.map((p) => ({ x: p.x, y: p.y }));
    shake = 22;
    flash = { a: 0.5, color: '#ff2d55' };
    const h = snake[0];
    rings.push({ x: h.x + 0.5, y: h.y + 0.5, life: 0, max: 600, color: '#ff2d55', size: 3.5 });
    music.stop(0.15);
    sfx.die();
    vibrate([70, 40, 140]);
  }

  function showDeadScreen() {
    state = 'dead';
    recordBest();
    ui.deadReason.textContent = deathReason;
    const left = P.goal - applesEaten;
    ui.deadLeft.textContent = `Faltavam ${left} ${left === 1 ? 'maçã' : 'maçãs'} para restaurar esta terra.`;
    showOverlay(ui.dead);
  }

  function burst(x, y, colors, n, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (0.05 + Math.random() * 0.14) * power;
      particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.04,
        life: 0, max: 450 + Math.random() * 450,
        color: colors[i % colors.length], r: Math.random() < 0.4 ? 3 : 2, g: 0.005,
      });
    }
  }

  function confetti(n) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * N, y: -0.5 - Math.random() * 3,
        vx: (Math.random() - 0.5) * 0.08, vy: 0.04 + Math.random() * 0.1,
        life: 0, max: 1600 + Math.random() * 1000,
        color: RAINBOW[i % RAINBOW.length], r: 3, g: 0.003,
      });
    }
  }

  function moveItem(item, x, y) {
    item.fromX = item.x;
    item.fromY = item.y;
    item.x = x;
    item.y = y;
    item.hopAt = now;
  }

  // a maçã fujona pula para a casa vizinha mais longe da cabeça
  function runnerHop() {
    if (!apple || phaseTime < apple.nextHop) return;
    const head = snake[0];
    const d = dist(head, apple);
    if (d < 2 || d > 4) { apple.nextHop = phaseTime + 150; return; }
    let best = null;
    let bestD = d;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = (apple.x + dx + N) % N;
      const y = (apple.y + dy + N) % N;
      if (!isFree(x, y)) continue;
      const nd = dist(head, { x, y });
      if (nd > bestD) { bestD = nd; best = { x, y }; }
    }
    apple.nextHop = phaseTime + 800;
    if (!best) return;
    burst(apple.x + 0.5, apple.y + 0.5, ['#ffffff', '#ff8a9b'], 6, 0.4);
    moveItem(apple, best.x, best.y);
    sfx.hop();
  }

  // Ímã: a maçã anda pelo caminho livre até a casa logo à frente da cabeça.
  // A cada passo ela fica sempre mais perto (nunca se afasta).
  function magnetPull(item) {
    if (!item) return;
    const head = snake[0];
    const d0 = queue.length ? queue[0] : dir;
    const fx = (head.x + d0.x + N) % N;
    const fy = (head.y + d0.y + N) % N;
    const body = new Set(snake.map((s) => s.y * N + s.x));
    const ok = (x, y) => grid[y * N + x] === 0 && !portalMap.has(y * N + x) && !body.has(y * N + x);
    if (!ok(fx, fy)) return;
    const distMap = new Int16Array(N * N).fill(-1);
    const q = [fy * N + fx];
    distMap[q[0]] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const c = q[qi];
      const cd = distMap[c];
      if (cd >= 9) continue;
      const cx = c % N;
      const cy = (c - cx) / N;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = (cx + dx + N) % N;
        const ny = (cy + dy + N) % N;
        const ni = ny * N + nx;
        if (distMap[ni] >= 0 || !ok(nx, ny)) continue;
        distMap[ni] = cd + 1;
        q.push(ni);
      }
    }
    const here = distMap[item.y * N + item.x];
    if (here <= 0) return;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = (item.x + dx + N) % N;
      const ny = (item.y + dy + N) % N;
      if (distMap[ny * N + nx] === here - 1 && !itemAt(nx, ny)) {
        particles.push({ x: item.x + 0.5, y: item.y + 0.5, vx: 0, vy: 0, life: 0, max: 300, color: '#ff3b5c', r: 2, g: 0 });
        moveItem(item, nx, ny);
        return;
      }
    }
  }

  function updateCrow(dt) {
    if (!crow.active) {
      if (phaseTime < crow.nextAt) return;
      crow.active = true;
      crow.dir = Math.random() < 0.5 ? 1 : -1;
      crow.row = 1 + Math.floor(Math.random() * (N - 2));
      crow.x = crow.dir > 0 ? -32 : N * T;
      crow.dropCol = MARGIN + Math.floor(Math.random() * (N - MARGIN * 2));
      crow.dropped = false;
      sfx.caw();
      return;
    }
    crow.x += crow.dir * dt * 0.1;
    const col = Math.floor((crow.x + 16) / T);
    if (!crow.dropped && col === crow.dropCol) {
      crow.dropped = true;
      if (rotten.length < P.rotten) {
        for (const oy of [0, 1, -1, 2, -2]) {
          const y = (crow.row + oy + N) % N;
          if (isFree(col, y) && dist(snake[0], { x: col, y }) >= 3) {
            rotten.push({ x: col, y, born: now, t0: phaseTime, drop: now });
            break;
          }
        }
      }
    }
    if (crow.x < -40 || crow.x > N * T + 8) {
      crow.active = false;
      crow.nextAt = phaseTime + 5000 + Math.random() * 5000;
    }
  }

  // =====================================================================
  //  HUD, TELAS E MENU
  // =====================================================================
  function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  let shownScore = 0;
  function updateHud(animate = false) {
    ui.phase.textContent = `${phaseIdx + 1}/${PHASES.length}`;
    ui.goalText.textContent = `${Math.min(applesEaten, P.goal)}/${P.goal}`;
    ui.goalFill.style.width = `${Math.min(100, (applesEaten / P.goal) * 100)}%`;
    ui.score.textContent = fmt(score);
    ui.shield.hidden = !SKIN.shield;
    ui.shield.classList.toggle('used', !shieldReady);
    if (animate) {
      if (score !== shownScore) bump(ui.score);
      bump(ui.goalText);
    }
    shownScore = score;
  }

  function renderBuffs(force = false) {
    const keys = Object.keys(buffs);
    const key = keys.join(',');
    if (force || key !== buffsKey) {
      buffsKey = key;
      ui.buffs.innerHTML = keys.map((k) =>
        `<div class="buff" data-k="${k}"><img src="${powerImg(k)}" alt=""><span>${POWERS[k].short}</span><i><b style="background:${POWERS[k].color}"></b></i></div>`).join('');
    }
    for (const el of ui.buffs.children) {
      const k = el.dataset.k;
      const left = Math.max(0, (buffs[k] - phaseTime) / POWERS[k].dur);
      el.querySelector('b').style.width = `${left * 100}%`;
      el.classList.toggle('ending', buffs[k] - phaseTime < 1500);
    }
  }

  const OVERLAYS = ['intro', 'pause', 'dead', 'clear', 'victory'];
  function showOverlay(el) {
    OVERLAYS.forEach((k) => ui[k].classList.toggle('show', ui[k] === el));
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function showToast(text) {
    ui.toast.textContent = text;
    ui.toast.classList.remove('show');
    void ui.toast.offsetWidth;
    ui.toast.classList.add('show');
  }

  function showMenu(show = true) {
    ui.menu.classList.toggle('show', show);
    if (show) {
      state = 'menu';
      showOverlay(null);
      renderMenu();
      music.play('menu');
    }
  }

  const previews = [];

  function renderMenu() {
    ui.total.textContent = fmt(save.total);
    const next = SKIN_KEYS.map((k) => SKINS[k]).filter((s) => s.cost > save.total).sort((a, b) => a.cost - b.cost)[0];
    if (next) {
      const prevCost = Math.max(0, ...SKIN_KEYS.map((k) => SKINS[k].cost).filter((c) => c <= save.total));
      ui.nextFill.style.width = `${((save.total - prevCost) / (next.cost - prevCost)) * 100}%`;
      ui.nextText.textContent = `Faltam ${fmt(next.cost - save.total)} pontos para liberar a cobrinha ${next.name}.`;
    } else {
      ui.nextFill.style.width = '100%';
      ui.nextText.textContent = 'Todas as cobrinhas liberadas!';
    }

    const ae = document.activeElement;
    const focusedId = ae && ae.dataset ? ae.dataset.id : null;

    ui.skins.innerHTML = '';
    previews.length = 0;
    for (const k of SKIN_KEYS) {
      const s = SKINS[k];
      const open = isUnlocked(k);
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = 'skin-' + k;
      b.className = 'skin' + (save.skin === k ? ' selected' : '') + (open ? '' : ' locked');
      const cv = document.createElement('canvas');
      cv.width = 96;
      cv.height = 32;
      b.append(cv);
      b.insertAdjacentHTML('beforeend',
        `<span class="skin-name">${s.name}</span>
         <span class="skin-perk">${s.perk}</span>
         <span class="skin-status">${!open ? '🔒 ' + fmt(s.cost) + ' pts' : save.skin === k ? 'Selecionada' : 'Escolher'}</span>
         ${save.fresh.indexOf(k) >= 0 ? '<span class="badge-new">NOVO</span>' : ''}`);
      b.addEventListener('click', () => {
        if (!open) {
          b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 240, easing: 'steps(4, end)' });
          return;
        }
        save.skin = k;
        save.fresh = save.fresh.filter((f) => f !== k);
        persist();
        renderMenu();
      });
      ui.skins.append(b);
      previews.push({ cv, key: k, locked: !open });
    }

    ui.diffs.innerHTML = '';
    for (const k of DIFF_KEYS) {
      const d = DIFFS[k];
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = 'diff-' + k;
      b.className = 'diff' + (save.diff === k ? ' selected' : '');
      b.style.setProperty('--c', d.color);
      b.innerHTML = `<span class="emoji">${d.emoji}</span><b>${d.name}${save.cleared[k] ? ' ★' : ''}</b><small>pontos x${String(d.mult).replace('.', ',')}</small>`;
      b.addEventListener('click', () => {
        save.diff = k;
        persist();
        renderMenu();
      });
      ui.diffs.append(b);
    }

    ui.phases.innerHTML = '';
    const unlocked = save.progress[save.diff];
    const sel = Math.min(save.selected[save.diff], unlocked - 1);
    PHASES.forEach((ph, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.id = 'ph-' + i;
      const open = i < unlocked;
      const done = i < unlocked - 1 || (save.cleared[save.diff] && i === PHASES.length - 1);
      b.className = 'ph' + (done ? ' done' : '') + (i === sel ? ' selected' : '');
      b.disabled = !open;
      b.style.setProperty('--land', THEMES[ph.theme].floor[0]);
      b.textContent = open ? i + 1 : '🔒';
      b.title = open ? `Terra ${i + 1}: ${ph.name} (meta ${ph.goal})` : 'Complete a terra anterior para liberar';
      b.addEventListener('click', () => {
        save.selected[save.diff] = i;
        persist();
        renderMenu();
      });
      ui.phases.append(b);
    });

    ui.play.textContent = `▶ Jogar: ${PHASES[sel].name}`;
    syncAudioButtons();
    const refocus = focusedId && ui.menu.querySelector(`[data-id="${focusedId}"]`);
    if (refocus) refocus.focus();
  }

  ui.play.addEventListener('click', () => {
    startRun(Math.min(save.selected[save.diff], save.progress[save.diff] - 1));
  });
  $('introGo').addEventListener('click', beginReady);
  $('resume').addEventListener('click', togglePause);
  $('retry').addEventListener('click', retryPhase);
  $('next').addEventListener('click', nextPhase);
  document.querySelectorAll('[data-menu]').forEach((b) => b.addEventListener('click', () => {
    recordBest();
    showMenu(true);
  }));
  ui.pauseBtn.addEventListener('click', () => { ui.pauseBtn.blur(); togglePause(); });
  ui.mute.addEventListener('click', () => { ui.mute.blur(); toggleSfx(); });
  ui.musicBtn.addEventListener('click', () => { ui.musicBtn.blur(); toggleMusic(); });
  ui.sfxToggle.addEventListener('click', toggleSfx);
  ui.musicToggle.addEventListener('click', toggleMusic);
  $('watchStory').addEventListener('click', () => {
    state = 'story';
    ui.menu.classList.remove('show');
    STORY.play('intro', () => showMenu(true));
  });

  $('exportSave').addEventListener('click', async () => {
    const code = 'COBRA:' + btoa(unescape(encodeURIComponent(JSON.stringify(save))));
    try {
      await navigator.clipboard.writeText(code);
      alert('Código do save copiado! Cole em "Importar save" no outro aparelho.');
    } catch (e) {
      prompt('Copie o código do seu save:', code);
    }
  });

  $('importSave').addEventListener('click', () => {
    const code = (prompt('Cole aqui o código do save:') || '').trim();
    if (!code) return;
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(code.replace(/^COBRA:/, '')))));
      if (!data || data.v !== 2) throw new Error('versão');
      if (!confirm('Isso vai substituir o progresso atual deste navegador. Continuar?')) return;
      Object.assign(save, sanitize(data));
      AU.settings.sfx = !save.muted;
      AU.setMusic(!save.musicOff);
      persist();
      renderMenu();
      bump(ui.total);
    } catch (e) {
      alert('Código inválido. Confira se copiou ele inteiro.');
    }
  });

  // =====================================================================
  //  ATUALIZAÇÃO POR QUADRO
  // =====================================================================
  const WAVE_SPEED = 16;

  function update(dt) {
    const k = dt / 16.667;

    if (state === 'play') {
      phaseTime += dt;
      acc += dt;
      while (acc >= tickNow() && state === 'play') {
        acc -= tickNow();
        step();
      }

      if (state === 'play') {
        if (golden && phaseTime - golden.t0 > GOLD_TTL) {
          burst(golden.x + 0.5, golden.y + 0.5, ['#b9a8d9', '#ffffff'], 14, 0.6);
          golden = null;
          sfx.poof();
        }
        if (power && phaseTime - power.t0 > POWER_TTL) {
          burst(power.x + 0.5, power.y + 0.5, ['#b9a8d9', '#ffffff'], 14, 0.6);
          power = null;
          sfx.poof();
        }
        for (let i = rotten.length - 1; i >= 0; i--) {
          if (phaseTime - rotten[i].t0 > ROTTEN_TTL) {
            burst(rotten[i].x + 0.5, rotten[i].y + 0.5, ROT_COLORS, 8, 0.4);
            rotten.splice(i, 1);
          }
        }
        if (crow) updateCrow(dt);
        else if (P.rotten) {
          rottenTimer -= dt;
          if (rottenTimer <= 0) {
            rottenTimer = 3000 + Math.random() * 2500;
            if (rotten.length < P.rotten) {
              const r = spawnFree(3);
              if (r) rotten.push(r);
            }
          }
        }
        if (P.powers.length) {
          powerTimer -= dt;
          if (powerTimer <= 0) {
            powerTimer = 9000 + Math.random() * 6000;
            if (!power) {
              const options = P.powers.filter((p) => !buffs[p] && (p !== 'trim' || snake.length >= 8));
              const p = options.length ? spawnFree(3) : null;
              if (p) {
                power = { x: p.x, y: p.y, born: p.born, t0: p.t0, kind: options[Math.floor(Math.random() * options.length)] };
                rings.push({ x: p.x + 0.5, y: p.y + 0.5, life: 0, max: 500, color: POWERS[power.kind].color, size: 1.5 });
              }
            }
          }
        }
        for (const b of Object.keys(buffs)) {
          if (phaseTime >= buffs[b]) {
            delete buffs[b];
            sfx.powerEnd();
          }
        }

        // aviso de que o fantasma vai acabar
        const ghostLeft = ghostUntil - phaseTime;
        if (ghostLeft > 0 && ghostLeft < GHOST_WARN) {
          if (!ghostWarned) {
            ghostWarned = true;
            floaters.push({ x: snake[0].x + 0.5, y: snake[0].y - 0.4, text: 'Fantasma acabando!', life: 0, max: 1400, color: '#f4f0ff', size: 0.6 });
          }
          warnTick -= dt;
          if (warnTick <= 0) { warnTick = ghostLeft < 600 ? 120 : 250; sfx.warn(); }
        }

        if (buffs.magnet) {
          magnetTimer -= dt;
          if (magnetTimer <= 0) {
            magnetTimer = 120;
            magnetPull(apple);
            magnetPull(golden);
          }
        } else if (P.runner) runnerHop();
        renderBuffs();

        if (SKIN.dragon) {
          emberTimer -= dt;
          if (emberTimer <= 0) {
            emberTimer = 80;
            const t = snake[snake.length - 1];
            particles.push({
              x: t.x + 0.3 + Math.random() * 0.4, y: t.y + 0.3 + Math.random() * 0.4,
              vx: (Math.random() - 0.5) * 0.02, vy: -0.02 - Math.random() * 0.02,
              life: 0, max: 500 + Math.random() * 300,
              color: Math.random() < 0.5 ? '#ffb02e' : '#ff5a2e', r: 2, g: -0.0005,
            });
          }
        }
      }
    }

    // gomos cortados pela tesoura estouram em sequência
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      if (now >= d.at) {
        burst(d.x + 0.5, d.y + 0.5, [d.color, '#ffffff', '#b07bff'], 10, 0.9);
        sfx.pop(i);
        debris.splice(i, 1);
      }
    }

    if (state === 'dying') {
      const target = Math.min(snake.length, Math.floor((now - deathAt) / 45));
      while (burstIdx < target) {
        const s = snake[burstIdx];
        burst(s.x + 0.5, s.y + 0.5, [SKIN.color(burstIdx, snake.length, 2), SKIN.color(burstIdx, snake.length, 3), '#ffffff'], 8, 0.8);
        sfx.pop(burstIdx);
        shake = Math.max(shake, 5);
        burstIdx++;
      }
      if (burstIdx >= snake.length && now - deathAt > snake.length * 45 + 550) showDeadScreen();
    }

    if (state === 'clear' && !clearShown && now - clearAt > 1700) showClearScreen();

    const colorTarget = state === 'clear' || state === 'victory' ? 1 : 0.3 + 0.7 * (applesEaten / P.goal);
    colorAmt += (colorTarget - colorAmt) * Math.min(1, 0.05 * k);

    ui.readyHint.classList.toggle('show', state === 'ready');

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.max) { particles.splice(i, 1); continue; }
      p.vx *= Math.pow(0.96, k);
      p.vy = p.vy * Math.pow(0.96, k) + p.g * k;
      p.x += p.vx * k;
      p.y += p.vy * k;
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      floaters[i].life += dt;
      if (floaters[i].life >= floaters[i].max) floaters.splice(i, 1);
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].life += dt;
      if (rings[i].life >= rings[i].max) rings.splice(i, 1);
    }
    if (waves.length && (now - waves[0]) / 1000 * WAVE_SPEED > snake.length + 4) waves.shift();

    shake *= Math.pow(0.86, k);
    if (shake < 0.5) shake = 0;
    flash.a *= Math.pow(0.88, k);
    headPop *= Math.pow(0.9, k);

    const step4 = (v) => Math.round(v / 4) * 4;
    const sx = step4((Math.random() - 0.5) * shake);
    const sy = step4((Math.random() - 0.5) * shake);
    stage.style.transform = shake ? `translate(${sx}px, ${sy}px)` : '';
  }

  // =====================================================================
  //  DESENHO (pixel art com contorno)
  // =====================================================================
  function snakePoints(t) {
    return snake.map((s, i) => {
      const p = prev[i] || s;
      let dx = s.x - p.x;
      let dy = s.y - p.y;
      if (dx > 1) dx -= N; else if (dx < -1) dx += N;
      if (dy > 1) dy -= N; else if (dy < -1) dy += N;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return { x: s.x * T, y: s.y * T };
      return { x: Math.round((p.x + dx * t) * T), y: Math.round((p.y + dy * t) * T) };
    });
  }

  function bulge(i) {
    let b = 0;
    for (const w of waves) {
      const pos = (now - w) / 1000 * WAVE_SPEED;
      b += Math.exp(-((i - pos) ** 2) / 1.6);
    }
    return b;
  }

  // a cabeça é desenhada olhando para a direita (coordenadas 0..15) e girada para a direção real
  function headPx(lx, ly, d) {
    if (d.x === 1) return [lx, ly];
    if (d.x === -1) return [15 - lx, ly];
    if (d.y === 1) return [ly, lx];
    return [ly, 15 - lx];
  }

  // desenha uma cobra em qualquer canvas (jogo e prévias do menu)
  // pts: canto superior esquerdo de cada gomo (em pixels), da cabeça para o rabo
  function drawSnakeShape(g, pts, o) {
    const n = pts.length;
    const start = o.start || 0;
    if (start >= n) return;
    const col = o.col;
    const near = (a, b) => Math.abs(a.x - b.x) <= T && Math.abs(a.y - b.y) <= T;

    const blobs = [];
    for (let i = n - 1; i >= start; i--) {
      const p = pts[i];
      const s = o.size(i);
      if (i < n - 1 && near(p, pts[i + 1])) {
        const q = pts[i + 1];
        blobs.push({ x: Math.round((p.x + q.x) / 2), y: Math.round((p.y + q.y) / 2), s: Math.min(s, o.size(i + 1)), i: i + 0.5 });
      }
      blobs.push({ x: p.x, y: p.y, s, i });
    }

    g.globalAlpha = o.alpha || 1;
    for (const b of blobs) { const f = (T - b.s) / 2; PX.blob(g, b.x + f + 1, b.y + f + 2, b.s, 'rgba(0,0,0,0.3)'); }
    for (const b of blobs) { const f = (T - b.s) / 2; PX.blob(g, b.x + f, b.y + f, b.s, col(b.i, 0)); }
    for (const b of blobs) { const f = (T - b.s) / 2; PX.blob(g, b.x + f + 1, b.y + f + 1, b.s - 2, col(b.i, 1)); }
    for (const b of blobs) { const f = (T - b.s) / 2; PX.blob(g, b.x + f + 1, b.y + f + 1, b.s - 4, col(b.i, 2)); }
    for (const b of blobs) {
      if (b.i % 1) continue;
      const f = (T - b.s) / 2;
      px(g, b.x + f + 3, b.y + f + 3, col(b.i, 3), 3, 1);
      px(g, b.x + f + 3, b.y + f + 4, col(b.i, 3), 1, 1);
      if (o.dragon && b.i > 0) px(g, b.x + f + b.s / 2, b.y + f + b.s / 2, col(b.i, 1), 2, 2);
    }

    if (start === 0) {
      const h = pts[0];
      const hf = (T - o.size(0)) / 2;
      const d = o.dir;
      const hp = (lx, ly, w, hh, c) => {
        g.fillStyle = c;
        for (let yy = 0; yy < hh; yy++) {
          for (let xx = 0; xx < w; xx++) {
            const [x, y] = headPx(lx + xx, ly + yy, d);
            g.fillRect(h.x + hf + x, h.y + hf + y, 1, 1);
          }
        }
      };
      const out = col(0, 0);

      if (o.dragon) {
        hp(0, -1, 4, 2, out); hp(1, -2, 2, 1, out); hp(1, -1, 2, 1, '#ffd84a');
        hp(0, 15, 4, 2, out); hp(1, 17, 2, 1, out); hp(1, 16, 2, 1, '#ffd84a');
      }
      if (o.tongue) {
        hp(16, 7, 2, 2, '#ff3b5c'); hp(18, 6, 1, 1, '#ff3b5c'); hp(18, 9, 1, 1, '#ff3b5c');
      }
      // bochechas
      if (!o.dead) { hp(5, 3, 2, 1, '#ff9ab8'); hp(5, 12, 2, 1, '#ff9ab8'); }
      // narinas
      hp(13, 6, 1, 1, out); hp(13, 9, 1, 1, out);
      // olhos: contorno, branco, pupila e brilho
      const look = o.look || d;
      const perp = d.x !== 0 ? { x: 0, y: 1 } : { x: 1, y: 0 };
      const fwd = look.x * d.x + look.y * d.y;
      const side = look.x * perp.x + look.y * perp.y;
      const pupX = fwd > 0.2 ? 1 : 0;
      const pupY = side > 0.2 ? 1 : 0;
      for (const ey of [1, 10]) {
        hp(8, ey, 5, 5, out);
        if (o.blink) { hp(9, ey + 2, 3, 1, col(0, 2)); continue; }
        hp(9, ey + 1, 3, 3, o.dragon && !o.dead ? '#ffe066' : '#ffffff');
        if (o.dead) {
          hp(9, ey + 1, 1, 1, out); hp(10, ey + 2, 1, 1, out); hp(11, ey + 3, 1, 1, out); hp(11, ey + 1, 1, 1, out); hp(9, ey + 3, 1, 1, out);
        } else if (o.dragon) {
          hp(9 + pupX + 0, ey + 1, 1, 3, out);
        } else {
          hp(9 + pupX, ey + 1 + pupY, 2, 2, out);
          hp(9 + pupX, ey + 1 + pupY, 1, 1, '#ffffff');
        }
      }
    }
    g.globalAlpha = 1;
  }

  function drawSnake(t) {
    const pts = snakePoints(t);
    const n = pts.length;
    const dead = state === 'dying' || state === 'dead';
    const ghostLeft = ghostUntil - phaseTime;
    const ghostOn = !dead && ghostLeft > 0 && (state === 'play' || state === 'pause');
    // perto do fim o fantasma pisca entre branco e as cores normais, cada vez mais rápido
    let ghostLook = ghostOn;
    if (ghostOn && ghostLeft < GHOST_WARN) ghostLook = Math.floor(now / (ghostLeft < 600 ? 60 : 130)) % 2 === 0;

    const col = dead ? (i, s) => DEAD_PAL[s] : ghostLook ? (i, s) => GHOST_PAL[s] : (i, s) => SKIN.color(i, n, s);
    const target = golden || apple;
    let look = null;
    if (target && !dead) look = { x: Math.sign(wrapDelta(snake[0].x, target.x)), y: Math.sign(wrapDelta(snake[0].y, target.y)) };

    drawSnakeShape(lctx, pts, {
      start: dead ? burstIdx : 0,
      col,
      dir,
      look,
      dead,
      dragon: SKIN.dragon,
      alpha: ghostLook ? 0.6 : 1,
      blink: !dead && (now % 3200) < 140,
      tongue: !dead && (now % 1600) < 180,
      size: (i) => {
        if (i === 0) return headPop > 0.35 ? 18 : 16;
        if (bulge(i) > 0.45) return 18;
        if (i === n - 1 && n > 3) return 10;
        if (i === n - 2 && n > 4) return 12;
        return 14;
      },
    });
    if (ghostLook && Math.random() < 0.3) {
      const s = snake[Math.floor(Math.random() * n)];
      particles.push({ x: s.x + Math.random(), y: s.y + Math.random(), vx: 0, vy: -0.02, life: 0, max: 400, color: '#f4f0ff', r: 2, g: 0 });
    }
    return pts;
  }

  function itemPos(item) {
    let x = item.x * T;
    let y = item.y * T;
    let lift = 0;
    if (item.hopAt && now - item.hopAt < 160) {
      const t = (now - item.hopAt) / 160;
      if (Math.abs(item.x - item.fromX) <= 1 && Math.abs(item.y - item.fromY) <= 1) {
        x = Math.round((item.fromX + (item.x - item.fromX) * t) * T);
        y = Math.round((item.fromY + (item.y - item.fromY) * t) * T);
      }
      lift = Math.round(Math.sin(t * Math.PI) * 5);
    }
    if (item.drop && now - item.drop < 350) lift = Math.round((1 - (now - item.drop) / 350) * 36);
    return { x, y, lift };
  }

  function drawItemSprite(spr, item) {
    const g = lctx;
    const age = (now - item.born) / 1000;
    const pop = age < 0.4 ? easeOutBack(clamp01(age / 0.4)) : 1;
    const w = Math.max(2, Math.round((T * pop) / 2) * 2);
    const pos = itemPos(item);
    const bob = Math.sin(now / 260) > 0.3 ? 1 : 0;
    px(g, pos.x + 3, pos.y + T - 2, 'rgba(0,0,0,0.3)', T - 6, 2);
    const f = (T - w) / 2;
    g.drawImage(spr, Math.round(pos.x + f), Math.round(pos.y + f - bob - pos.lift), w, w);
    return pos;
  }

  function drawItems() {
    const g = lctx;
    for (const r of rotten) {
      if (ROTTEN_TTL - (phaseTime - r.t0) < 1500 && Math.floor(now / 150) % 2) continue;
      const pos = drawItemSprite(PX.apple('rotten'), r);
      for (let i = 0; i < 2; i++) {
        const a = now / 160 + i * Math.PI;
        px(g, pos.x + 8 + Math.round(Math.cos(a) * 9), pos.y + 2 + Math.round(Math.sin(a * 1.7) * 3), '#1a1a1a', 2, 2);
      }
    }
    if (apple) {
      const pos = drawItemSprite(PX.apple('red'), apple);
      if (P.runner && !buffs.magnet) {
        const k = Math.floor(now / 110) % 2;
        px(g, pos.x + 4 + k * 2, pos.y + T - 1, OUT, 2, 2);
        px(g, pos.x + 10 - k * 2, pos.y + T - 1, OUT, 2, 2);
      }
    }
    if (golden) {
      const left = GOLD_TTL - (phaseTime - golden.t0);
      if (!(left < 2000 && Math.floor(now / 120) % 2)) drawItemSprite(PX.apple('golden'), golden);
      const frac = Math.max(0, left / GOLD_TTL);
      PX.ring(g, golden.x * T + 7.5, golden.y * T + 7.5, 10, '#ffd84a', -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
      if (Math.random() < 0.1) particles.push({ x: golden.x + Math.random(), y: golden.y + Math.random(), vx: 0, vy: -0.02, life: 0, max: 400, color: '#fffbd6', r: 2, g: 0 });
    }
    if (power) {
      const pw = POWERS[power.kind];
      const left = POWER_TTL - (phaseTime - power.t0);
      const x = power.x * T;
      const y = power.y * T;
      if (!(left < 2000 && Math.floor(now / 100) % 2)) {
        const c = Math.floor(now / 120) % 2 ? pw.color : '#ffffff';
        px(g, x - 2, y - 2, OUT, T + 4, 1); px(g, x - 2, y + T + 1, OUT, T + 4, 1);
        px(g, x - 2, y - 2, OUT, 1, T + 4); px(g, x + T + 1, y - 2, OUT, 1, T + 4);
        px(g, x - 1, y - 1, c, T + 2, 1); px(g, x - 1, y + T, c, T + 2, 1);
        px(g, x - 1, y - 1, c, 1, T + 2); px(g, x + T, y - 1, c, 1, T + 2);
        drawItemSprite(powerSprite(power.kind), power);
      }
    }
  }

  function drawPortals() {
    const g = lctx;
    for (const p of portalList) {
      const cx = p.x * T + 7.5;
      const cy = p.y * T + 7.5;
      PX.blob(g, p.x * T, p.y * T, T, OUT);
      PX.blob(g, p.x * T + 1, p.y * T + 1, T - 2, '#140428');
      const f = Math.floor(now / 80);
      for (let r = 2; r <= 6; r += 2) {
        const a = (f * (r % 4 ? 1 : -1) * 0.5) + r;
        PX.ring(g, cx, cy, r, r === 6 ? p.color : r === 4 ? '#ffffff' : p.color, a, a + Math.PI * 1.4);
      }
    }
  }

  function drawBlinks() {
    if (!blinkCells.length) return;
    const g = lctx;
    const on = blinkOn();
    const warn = blinkWarn();
    const bolt = PX.big('bolt', PX.PAL.bolt, 'bolt', 2);
    for (const b of blinkCells) {
      const x = b.x * T;
      const y = b.y * T;
      if (on) {
        PX.blob(g, x, y, T, OUT);
        PX.blob(g, x + 1, y + 1, T - 2, '#a0167a');
        PX.blob(g, x + 1, y + 1, T - 4, '#ff4fd8');
        g.drawImage(bolt, x, y);
      } else {
        const flick = warn && Math.floor(now / 90) % 2;
        const c = flick ? '#ff4fd8' : 'rgba(255,79,216,0.5)';
        for (let i = 0; i < T; i += 3) {
          px(g, x + i, y, c, 2, 1); px(g, x + i, y + T - 1, c, 2, 1);
          px(g, x, y + i, c, 1, 2); px(g, x + T - 1, y + i, c, 1, 2);
        }
      }
    }
  }

  function drawCrow() {
    if (!crow || !crow.active) return;
    const spr = PX.big(Math.floor(now / 140) % 2 ? 'crowB' : 'crowA', PX.PAL.crow, 'crow', 2);
    const x = Math.round(crow.x);
    const y = crow.row * T - 12;
    px(lctx, x + 6, crow.row * T + 14, 'rgba(0,0,0,0.3)', 20, 2);
    if (crow.dir > 0) {
      lctx.save();
      lctx.translate(x + spr.width, y);
      lctx.scale(-1, 1);
      lctx.drawImage(spr, 0, 0);
      lctx.restore();
    } else lctx.drawImage(spr, x, y);
  }

  // seta "você vai aparecer aqui" quando a cobra está chegando numa borda
  function chevron(g, cellX, cellY, d, color) {
    const pts = [];
    for (let j = 0; j < 5; j++) { pts.push([4 + j, 3 + j], [4 + j, 12 - j]); pts.push([8 + j, 3 + j], [8 + j, 12 - j]); }
    g.fillStyle = OUT;
    for (const [lx, ly] of pts) { const [x, y] = headPx(lx, ly, d); g.fillRect(cellX * T + x + 1, cellY * T + y + 1, 2, 2); }
    g.fillStyle = color;
    for (const [lx, ly] of pts) { const [x, y] = headPx(lx, ly, d); g.fillRect(cellX * T + x, cellY * T + y, 2, 2); }
  }

  function drawEdgeHint() {
    if (state !== 'play' && state !== 'ready') return;
    const h = snake[0];
    const d = queue.length ? queue[queue.length - 1] : dir;
    for (let k = 1; k <= 4; k++) {
      const rx = h.x + d.x * k;
      const ry = h.y + d.y * k;
      if (rx >= 0 && ry >= 0 && rx < N && ry < N) continue;
      const ex = (rx + N) % N;
      const ey = (ry + N) % N;
      if (Math.floor(now / 150) % 2 || k <= 2) chevron(lctx, ex, ey, d, k <= 2 ? '#ffffff' : '#4af0ff');
      // marca o caminho logo depois da entrada e avisa se houver barreira
      for (let j = 1; j <= 3; j++) {
        const cx = (ex + d.x * j + N) % N;
        const cy = (ey + d.y * j + N) % N;
        if (wallAt(cx, cy) || grid[cy * N + cx] === 2) {
          if (Math.floor(now / 120) % 2) {
            px(lctx, cx * T + 6, cy * T + 2, OUT, 4, 12);
            px(lctx, cx * T + 7, cy * T + 3, '#ff3b5c', 2, 7);
            px(lctx, cx * T + 7, cy * T + 11, '#ff3b5c', 2, 2);
          }
          break;
        }
        px(lctx, cx * T + 6, cy * T + 6, 'rgba(74,240,255,0.55)', 4, 4);
      }
      break;
    }
  }

  function drawBackground() {
    const g = lctx;
    const mapAge = now - mapBorn;
    if (mapAge < MAP_ANIM) {
      g.fillStyle = '#0a0612';
      g.fillRect(0, 0, lo.width, lo.height);
      const c = (N - 1) / 2;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const dd = Math.hypot(x - c, y - c) / (N * 0.7);
          const s = Math.min(1, easeOutBack(clamp01((mapAge - dd * 450) / 380)));
          const w = Math.round((T * s) / 2) * 2;
          if (w <= 0) continue;
          const f = (T - w) / 2;
          g.drawImage(bgGrey, x * T, y * T, T, T, x * T + f, y * T + f, w, w);
        }
      }
      return;
    }
    g.drawImage(bgGrey, 0, 0);
    if (colorAmt > 0.01) {
      g.globalAlpha = colorAmt;
      g.drawImage(bgColor, 0, 0);
      g.globalAlpha = 1;
    }
  }

  function render() {
    if (!lo.width) return;
    const g = lctx;
    g.imageSmoothingEnabled = false;
    drawBackground();
    if (!snake.length) return;

    const t = state === 'play' || state === 'pause' ? Math.min(acc / tickNow(), 1) : 1;
    drawBlinks();
    drawPortals();
    drawItems();
    for (const d of debris) {
      const shakeX = Math.round((Math.random() - 0.5) * 3);
      PX.blob(g, d.x * T + 1 + shakeX, d.y * T + 1, 14, OUT);
      PX.blob(g, d.x * T + 2 + shakeX, d.y * T + 2, 12, Math.floor(now / 80) % 2 ? '#b07bff' : '#8a7aa8');
    }
    const pts = drawSnake(t);
    const dead = state === 'dying' || state === 'dead';

    if (shieldReady && !dead && pts[0] && Math.floor(now / 250) % 2) PX.ring(g, pts[0].x + 7.5, pts[0].y + 7.5, 12, '#ffd84a');
    if (buffs.magnet && pts[0] && !dead) PX.ring(g, pts[0].x + 7.5, pts[0].y + 7.5, 14 + (Math.floor(now / 100) % 3) * 6, 'rgba(255,59,92,0.7)');

    drawEdgeHint();
    drawCrow();

    for (const r of rings) {
      const p = r.life / r.max;
      if (Math.floor(p * 10) % 2 && p > 0.6) continue;
      PX.ring(g, r.x * T, r.y * T, T * r.size * (1 - Math.pow(1 - p, 3)), r.color);
    }
    for (const p of particles) {
      if (p.life / p.max > 0.7 && Math.floor(p.life / 60) % 2) continue;
      px(g, p.x * T, p.y * T, p.color, p.r, p.r);
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lo, 0, 0, canvas.width, canvas.height);

    // textos flutuantes em fonte de quadrinhos, com contorno grosso
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const fs = Math.max(C * 0.9, canvas.width / 16);
    for (const f of floaters) {
      const p = f.life / f.max;
      if (p > 0.75 && Math.floor(f.life / 80) % 2) continue;
      const size = Math.round(fs * f.size * (p < 0.12 ? 0.6 + p * 3.4 : 1));
      ctx.font = `${size}px Bangers, "Comic Neue", sans-serif`;
      const x = Math.min(canvas.width - size * 2, Math.max(size * 2, f.x * C));
      const y = f.y * C - p * fs * 1.2;
      ctx.lineWidth = Math.max(4, size / 5);
      ctx.strokeStyle = OUT;
      ctx.strokeText(f.text, x, y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, x, y);
    }

    if (flash.a > 0.02) {
      ctx.globalAlpha = Math.round(flash.a * 8) / 8;
      ctx.fillStyle = flash.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
  }

  function renderPreviews() {
    for (const pv of previews) {
      const g = pv.cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, pv.cv.width, pv.cv.height);
      const sk = SKINS[pv.key];
      const n = 6;
      const pts = [];
      for (let i = 0; i < n; i++) pts.push({ x: 76 - i * 14, y: 8 + (pv.locked ? 0 : Math.round(Math.sin(now / 200 - i * 0.8) * 3)) });
      drawSnakeShape(g, pts, {
        col: pv.locked ? (i, s) => ['#0a0612', '#2a2236', '#3a3048', '#5a5070'][s] : (i, s) => sk.color(i, n, s),
        dir: { x: 1, y: 0 },
        dragon: sk.dragon,
        blink: pv.locked || (now % 3000) < 140,
        tongue: !pv.locked && (now % 1400) < 200,
        size: (i) => (i === 0 ? 16 : i === n - 1 ? 10 : 14),
      });
    }
  }

  // =====================================================================
  //  LOOP
  // =====================================================================
  let last = performance.now();
  function frame(ts) {
    const dt = Math.max(0, Math.min(ts - last, 100));
    last = ts;
    now = ts;
    if (state !== 'title' && state !== 'story') {
      update(dt);
      if (state === 'menu') renderPreviews();
      else render();
    }
    requestAnimationFrame(frame);
  }

  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize', resize);
  syncAudioButtons();
  setupPhase(Math.min(save.selected[save.diff], save.progress[save.diff] - 1));

  // tela de título -> história (só na primeira vez) -> menu
  STORY.play('title', () => {
    sfx.unlock();
    sfx.start();
    if (!save.seenStory) {
      save.seenStory = true;
      persist();
      state = 'story';
      STORY.play('intro', () => showMenu(true));
    } else showMenu(true);
  });
  requestAnimationFrame(frame);
})();
