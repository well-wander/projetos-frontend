// Arena 3D do Bravos Castores (Three.js).
// Campo de batalha em perspectiva estilo batalha de Pokémon: o castelo do jogador 1 fica perto,
// embaixo à esquerda; o do jogador 2 fica longe, à direita.
//
// Cada castelo é feito de partes construídas com blocos de pedra:
//   - cortina: muralha baixa em volta do pátio, com ameias e portão
//   - 4 torres redondas nos cantos, com telhado cônico na cor do jogador
//   - torre de menagem no centro, a mais alta, com bandeira e estandarte
// Todas crescem juntas, proporcionais aos pontos de Castelo. A Muralha (defesa) é um paredão
// separado, na frente do castelo, virado para o inimigo.
import * as THREE from 'three';
import * as M from './modelos.js';
import { criarDragao, criarFada, criarCirculo } from './personagens3d.js';
import { CARTA_POR_ID, RECURSO_DA_COR, NOME, TRABALHADOR_DO_RECURSO } from './cartas.js';
import { aplicarEfeitos } from './regras.js';

// ---------------- medidas ----------------
const S = 0.5; // largura de um bloco reto
const H = 0.5; // altura de uma camada de blocos
const TOPO_PLATAFORMA = 0; // os hexágonos KayKit têm o topo em y = 0
const E = 1.75; // distância do centro do castelo até o centro de cada torre de canto
const R_TORRE = 0.5; // raio das torres redondas
const DIST_MURALHA = 3.05; // muralha de defesa: distância até o centro do castelo
const LARG_MURALHA = 7; // blocos por camada da muralha de defesa
const PONTOS_POR_CAMADA_MURALHA = 6;
const META = 100;
const GRAVIDADE = 9;
const ALTURA_QUEDA = 3.2;

const POS_JOGADOR = [new THREE.Vector3(-3.6, 0, 3.8), new THREE.Vector3(4.2, 0, -6.2)];
const COR_JOGADOR = [0x3f9a3a, 0xc0392b];
const COR_JOGADOR_ESCURA = [0x24612a, 0x7e2018];


// Modelos KayKit que a arena usa (carregados antes de montar a cena).
const MODELOS_ARENA = [
  ...['hex_grass', 'hex_water', 'building_dirt', 'building_bridge_A', 'waterlily_A', 'waterplant_A', 'wall_straight',
    'flag_green', 'flag_red', 'cloud_big', 'cloud_small',
    'mountain_A_grass_trees', 'mountain_B_grass_trees', 'mountain_C_grass_trees', 'mountain_A_grass', 'mountain_B_grass',
    'hills_A_trees', 'hills_B_trees', 'hills_C_trees', 'hills_A', 'hills_B',
    'trees_A_large', 'trees_B_large', 'trees_A_medium', 'trees_B_medium', 'trees_A_small', 'trees_B_small',
    'tree_single_A', 'tree_single_B', 'rock_single_A', 'rock_single_B', 'rock_single_C', 'rock_single_D', 'rock_single_E',
  ].map(M.caminhoHex),
  ...['green', 'red'].flatMap((c) => ['tower_base', 'tower_A', 'tower_B', 'mine', 'blacksmith', 'church'].map((n) => M.caminhoHex(`building_${n}_${c}`))),
  ...['resource_stone', 'weaponrack', 'bucket_arrows', 'target', 'projectile_catapult', 'wheelbarrow', 'sack', 'building_scaffolding'].map(M.caminhoHex),
  ...['green', 'red'].map((c) => M.caminhoHex(`building_tower_catapult_${c}`)),
  M.caminhoItem('arrow_bow'),
  ...M.MODELOS_PERSONAGENS,
];

// material liso no estilo KayKit (para os bichinhos e efeitos feitos aqui)
const toon = (cor, extra = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 1, ...extra });

// ---------------- texturas desenhadas em canvas ----------------
function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
function texturaDe(c, repetir) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repetir) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repetir, repetir);
  }
  return t;
}
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

function texturaPedra(base, escuro, claro) {
  const [c, g] = canvas(64);
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 46; i++) {
    g.fillStyle = Math.random() < 0.55 ? escuro : claro;
    g.globalAlpha = 0.35;
    g.fillRect(Math.random() * 64, Math.random() * 64, 2 + Math.random() * 4, 2 + Math.random() * 3);
  }
  g.globalAlpha = 1;
  g.fillStyle = claro;
  g.fillRect(6, 6, 52, 4);
  g.fillRect(6, 6, 4, 52);
  g.fillStyle = escuro;
  g.fillRect(6, 54, 52, 4);
  g.fillRect(54, 6, 4, 52);
  g.strokeStyle = '#2b1a10';
  g.lineWidth = 6;
  g.strokeRect(3, 3, 58, 58);
  return texturaDe(c);
}

function texturaTelha(cor, escura) {
  const [c, g] = canvas(128);
  g.fillStyle = hex(escura);
  g.fillRect(0, 0, 128, 128);
  // telhas escamadas, fileiras desencontradas
  const alt = 16;
  for (let linha = 0; linha < 9; linha++) {
    const y = linha * alt - 4;
    const desloc = (linha % 2) * 8;
    for (let x = -16 + desloc; x < 144; x += 16) {
      g.fillStyle = hex(cor);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 16, y);
      g.lineTo(x + 16, y + alt * 0.6);
      g.arc(x + 8, y + alt * 0.6, 8, 0, Math.PI);
      g.closePath();
      g.fill();
      g.strokeStyle = '#1b120b';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.22)';
      g.fillRect(x + 3, y + 2, 4, alt * 0.5);
    }
  }
  return texturaDe(c);
}

// casca da tora: veios no sentido do comprimento e contorno escuro nas pontas
function texturaCasca(base, escuro) {
  const [c, g] = canvas(128);
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  // veios ao longo da tora
  for (let i = 0; i < 16; i++) {
    const x = 2 + i * 8 + Math.random() * 4;
    g.strokeStyle = escuro;
    g.globalAlpha = 0.55 + Math.random() * 0.4;
    g.lineWidth = 1.5 + Math.random() * 2.5;
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + 5, 40, x - 5, 88, x + 2, 128);
    g.stroke();
  }
  g.globalAlpha = 1;
  // nós da pedra
  for (let i = 0; i < 2; i++) {
    const x = 20 + Math.random() * 88;
    const y = 25 + Math.random() * 78;
    g.fillStyle = escuro;
    g.beginPath(); g.ellipse(x, y, 5, 9, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = base;
    g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(x, y, 2.5, 5, 0, 0, Math.PI * 2); g.stroke();
  }
  // faixa de brilho e sombra (dá volume na tora)
  const luz = g.createLinearGradient(0, 0, 128, 0);
  luz.addColorStop(0, 'rgba(0,0,0,.28)');
  luz.addColorStop(0.35, 'rgba(255,255,255,.12)');
  luz.addColorStop(0.5, 'rgba(255,255,255,.2)');
  luz.addColorStop(1, 'rgba(0,0,0,.3)');
  g.fillStyle = luz;
  g.fillRect(0, 0, 128, 128);
  // contorno nas pontas da tora
  g.fillStyle = '#2b1a10';
  g.fillRect(0, 0, 128, 5);
  g.fillRect(0, 123, 128, 5);
  return texturaDe(c);
}

// ponta da tora: anéis concêntricos com contorno grosso
function texturaAneis(claro, escuro) {
  const [c, g] = canvas(128);
  g.fillStyle = '#2b1a10';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = escuro;
  g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
  g.fillStyle = claro;
  g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.fill();
  g.strokeStyle = escuro;
  for (const r of [10, 18, 26, 34, 42]) {
    g.lineWidth = 1.5 + Math.random() * 1.5;
    g.globalAlpha = 0.7;
    g.beginPath();
    g.arc(64 + Math.random() * 3 - 1.5, 64 + Math.random() * 3 - 1.5, r, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 1;
  // rachadura do centro para fora
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(64, 64);
  g.lineTo(64 + 20, 64 - 30);
  g.lineTo(64 + 26, 64 - 44);
  g.stroke();
  g.fillStyle = escuro;
  g.beginPath(); g.arc(64, 64, 4, 0, Math.PI * 2); g.fill();
  return texturaDe(c);
}

function texturaGrama() {
  const [c, g] = canvas(256);
  g.fillStyle = '#78b847';
  g.fillRect(0, 0, 256, 256);
  // manchas claras e escuras
  for (let i = 0; i < 26; i++) {
    g.fillStyle = Math.random() < 0.5 ? 'rgba(70,130,40,.35)' : 'rgba(160,210,90,.3)';
    g.beginPath();
    g.ellipse(Math.random() * 256, Math.random() * 256, 14 + Math.random() * 30, 8 + Math.random() * 18, Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  // folhinhas
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    g.strokeStyle = Math.random() < 0.65 ? '#4f8f2c' : '#a6dc6c';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (Math.random() * 4 - 2), y - 3 - Math.random() * 5);
    g.stroke();
  }
  // florzinhas
  for (let i = 0; i < 14; i++) {
    g.fillStyle = ['#ffffff', '#ffe066', '#ffb3c8'][i % 3];
    g.beginPath();
    g.arc(Math.random() * 256, Math.random() * 256, 1.8, 0, Math.PI * 2);
    g.fill();
  }
  return texturaDe(c, 45);
}

function texturaPlataforma() {
  const [c, g] = canvas(512);
  g.fillStyle = '#6aa83f';
  g.fillRect(0, 0, 512, 512);
  const grad = g.createRadialGradient(256, 256, 60, 256, 256, 256);
  grad.addColorStop(0, '#e2bd82');
  grad.addColorStop(0.78, '#d1a66a');
  grad.addColorStop(0.87, '#a77a45');
  grad.addColorStop(0.93, '#6b4a2a');
  grad.addColorStop(1, '#6b4a2a');
  g.fillStyle = grad;
  g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.fill();
  // pedrinhas e marcas na terra
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 205;
    g.fillStyle = Math.random() < 0.5 ? 'rgba(120,80,40,.35)' : 'rgba(255,240,200,.35)';
    g.fillRect(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 4, 3);
  }
  // anel de pedras na borda
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2 + Math.random() * 0.05;
    const r = 228 + Math.random() * 10;
    const x = 256 + Math.cos(a) * r;
    const y = 256 + Math.sin(a) * r;
    g.fillStyle = ['#b9b1a3', '#9c968b', '#cfc8ba'][i % 3];
    g.beginPath(); g.ellipse(x, y, 9, 6, a, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2b1a10'; g.lineWidth = 2; g.stroke();
  }
  return texturaDe(c);
}

// Céu em degradê que pode ser repintado (o dia passa durante a partida).
function texturaCeu() {
  const [c, g] = canvas(4, 256);
  const tex = texturaDe(c);
  tex.pintar = (topo, meio, baixo) => {
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, topo);
    grad.addColorStop(0.55, meio);
    grad.addColorStop(1, baixo);
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);
    tex.needsUpdate = true;
  };
  tex.pintar('#4f9fe0', '#9fd3f5', '#dff1fb');
  return tex;
}

function texturaEmblema(cor, simbolo, w = 128, h = 80) {
  const [c, g] = canvas(w, h);
  g.fillStyle = hex(cor);
  g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2b1a10';
  g.lineWidth = 6;
  g.strokeRect(3, 3, w - 6, h - 6);
  g.fillStyle = '#f3e3bf';
  const cx = w / 2;
  const cy = h / 2;
  const k = Math.min(w, h) / 80;
  if (simbolo === 'pinheiro') {
    g.beginPath();
    g.moveTo(cx, cy - 28 * k); g.lineTo(cx + 22 * k, cy + 4 * k); g.lineTo(cx - 22 * k, cy + 4 * k); g.closePath();
    g.moveTo(cx, cy - 14 * k); g.lineTo(cx + 28 * k, cy + 22 * k); g.lineTo(cx - 28 * k, cy + 22 * k); g.closePath();
    g.fill();
    g.fillRect(cx - 5 * k, cy + 20 * k, 10 * k, 10 * k);
  } else {
    g.fillRect(cx - 18 * k, cy - 14 * k, 36 * k, 42 * k);
    for (let i = 0; i < 3; i++) g.fillRect(cx - 18 * k + i * 14 * k, cy - 24 * k, 8 * k, 12 * k);
    g.fillStyle = hex(cor);
    g.fillRect(cx - 6 * k, cy + 8 * k, 12 * k, 20 * k);
  }
  return texturaDe(c);
}

function texturaParticula() {
  const [c, g] = canvas(64);
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return texturaDe(c);
}

function rngSemente(s) {
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// =====================================================================
export async function criarArena(container, aoSom = () => {}, aoProgresso = () => {}) {
  await M.carregar(MODELOS_ARENA, aoProgresso);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch (e) {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'arena-canvas';
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = texturaCeu();
  scene.fog = new THREE.Fog(0xcfe9f7, 36, 85);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);

  // ---- luz ----
  const luzCeu = new THREE.HemisphereLight(0xffffff, 0x8a9a6a, 1.6);
  scene.add(luzCeu);
  const sol = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sol.position.set(9, 18, 9);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 });
  sol.shadow.bias = -0.0008;
  scene.add(sol);

  // ---- tabuleiro de hexágonos KayKit ----
  // Hexágono "de pé" (pontas em z): 2 de largura; fileiras a cada √3, deslocadas meio hexágono.
  const HX = 2;
  const HZ = Math.sqrt(3);
  const hexParaMundo = (q, r) => new THREE.Vector3(HX * (q + r / 2), 0, HZ * r);
  const rnd = rngSemente(42);

  // rio atravessando o campo entre os dois castelos, perpendicular à linha que os liga
  const meioCampo = POS_JOGADOR[0].clone().lerp(POS_JOGADOR[1], 0.5);
  const eixoCastelos = POS_JOGADOR[1].clone().sub(POS_JOGADOR[0]).setY(0).normalize();
  const distRio = (v) => Math.abs(v.clone().sub(meioCampo).dot(eixoCastelos));
  const perto = (v, raio) => POS_JOGADOR.some((p) => Math.hypot(v.x - p.x, v.z - p.z) < raio);

  const tiposHex = { grama: [], agua: [], terra: [] };
  for (let r = -16; r <= 9; r++) {
    for (let q = -18; q <= 20; q++) {
      const c = hexParaMundo(q, r);
      if (Math.abs(c.x) > 34 || c.z < -30 || c.z > 15) continue;
      const tipo = distRio(c) < 1.6 && !perto(c, 4) ? 'agua' : 'grama';
      tiposHex[tipo].push(c);
    }
  }
  function instanciar(caminho, posicoes, dy = 0) {
    const { geometria, material } = M.malhaDe(caminho);
    const inst = new THREE.InstancedMesh(geometria, material, posicoes.length);
    const mat = new THREE.Matrix4();
    posicoes.forEach((p, i) => inst.setMatrixAt(i, mat.makeTranslation(p.x, p.y + dy, p.z)));
    inst.receiveShadow = true;
    scene.add(inst);
    return inst;
  }
  instanciar(M.caminhoHex('hex_grass'), tiposHex.grama);
  instanciar(M.caminhoHex('hex_water'), tiposHex.agua, -0.12);
  // fundo do mar de grama além do tabuleiro (para o horizonte não ficar vazio)
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x9ab64a, roughness: 1 }));
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = -0.25;
  chao.receiveShadow = true;
  scene.add(chao);

  // terreiro de terra embaixo de cada castelo
  POS_JOGADOR.forEach((p) => {
    const terra = M.hex('building_dirt');
    terra.position.set(p.x, 0.01, p.z);
    terra.scale.setScalar(2.3);
    scene.add(terra);
  });

  // ponte sobre o rio, no caminho entre os castelos
  const ponte = M.hex('building_bridge_A');
  ponte.position.copy(meioCampo).setY(-0.05);
  ponte.rotation.y = Math.atan2(eixoCastelos.x, eixoCastelos.z);
  scene.add(ponte);

  // plantinhas na água
  tiposHex.agua.forEach((c) => {
    if (rnd() < 0.35) {
      const p = M.hex(rnd() < 0.5 ? 'waterlily_A' : 'waterplant_A');
      p.position.set(c.x + (rnd() - 0.5) * 1.2, -0.1, c.z + (rnd() - 0.5) * 1.2);
      p.rotation.y = rnd() * 6;
      scene.add(p);
    }
  });

  // decoração: montanhas e morros longe, bosques no meio, campo livre perto dos castelos
  const arvoresBalanco = []; // grupos que balançam com o vento
  function colocarDeco(nome, c, { esc = 1, balanca = false } = {}) {
    const obj = M.hex(nome);
    obj.position.set(c.x, 0, c.z);
    obj.rotation.y = Math.floor(rnd() * 6) * (Math.PI / 3);
    obj.scale.setScalar(esc);
    scene.add(obj);
    if (balanca) {
      obj.userData.fase = Math.random() * 6;
      obj.userData.forca = 0.5 + Math.random() * 0.7;
      arvoresBalanco.push(obj);
    }
    return obj;
  }
  const MONTANHAS = ['mountain_A_grass_trees', 'mountain_B_grass_trees', 'mountain_C_grass_trees', 'mountain_A_grass', 'mountain_B_grass'];
  const MORROS = ['hills_A_trees', 'hills_B_trees', 'hills_C_trees', 'hills_A', 'hills_B'];
  const BOSQUES = ['trees_A_large', 'trees_B_large', 'trees_A_medium', 'trees_B_medium', 'trees_A_small', 'trees_B_small'];
  const PEDRAS = ['rock_single_A', 'rock_single_B', 'rock_single_C', 'rock_single_D', 'rock_single_E'];
  const sortear = (lista) => lista[Math.floor(rnd() * lista.length)];
  for (const c of tiposHex.grama) {
    const longe = c.z < -17 || Math.abs(c.x) > 22;
    if (perto(c, 6.5) || distRio(c) < 2.6) continue; // campo de batalha e margens livres
    const sorte = rnd();
    if (longe) {
      if (sorte < 0.45) colocarDeco(sortear(MONTANHAS), c, { esc: 1 + rnd() * 0.25 });
      else if (sorte < 0.8) colocarDeco(sortear(BOSQUES), c, { balanca: true });
      else colocarDeco(sortear(MORROS), c);
    } else if (c.z < -9 || Math.abs(c.x) > 13) {
      if (sorte < 0.42) colocarDeco(sortear(BOSQUES), c, { balanca: true });
      else if (sorte < 0.55) colocarDeco(sortear(MORROS), c);
      else if (sorte < 0.62) colocarDeco(sortear(PEDRAS), c, { esc: 1.6 });
    } else if (sorte < 0.12) {
      colocarDeco(rnd() < 0.5 ? 'tree_single_A' : 'tree_single_B', c, { balanca: true });
    } else if (sorte < 0.18) {
      colocarDeco(sortear(PEDRAS), c, { esc: 1.4 });
    }
  }

  // nuvens KayKit passando no céu (material próprio, para o entardecer tingir)
  const nuvens = [];
  let matNuvem = null;
  for (let i = 0; i < 7; i++) {
    const n = M.hex(i % 2 ? 'cloud_small' : 'cloud_big');
    n.traverse((o) => {
      if (!o.isMesh) return;
      if (!matNuvem) { matNuvem = o.material.clone(); matNuvem.emissive = new THREE.Color(0xffffff); matNuvem.emissiveIntensity = 0.55; }
      o.material = matNuvem;
      o.castShadow = false;
    });
    n.scale.setScalar(1.6 + rnd());
    n.position.set(-40 + i * 13 + rnd() * 5, 13 + rnd() * 5, -30 - rnd() * 12);
    scene.add(n);
    nuvens.push(n);
  }
  function passoRio() {}

  // ---- bichinhos voando: pássaros no céu e borboletas perto das flores ----
  // Corpo virado para +z; cada asa gira num pivô em volta do eixo z (bater de asas).
  function criarVoador({ corCorpo, corAsa, envergadura, corda, corpo = 0.1 }) {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.SphereGeometry(corpo, 8, 6), toon(corCorpo));
    c.scale.set(0.8, 0.7, 1.7);
    g.add(c);
    const geoAsa = new THREE.PlaneGeometry(envergadura, corda);
    geoAsa.rotateX(-Math.PI / 2);
    geoAsa.translate(envergadura / 2, 0, 0);
    const matAsa = toon(corAsa, { side: THREE.DoubleSide });
    const asas = [1, -1].map((lado) => {
      const pivo = new THREE.Group();
      const asa = new THREE.Mesh(geoAsa, matAsa);
      asa.scale.x = lado;
      pivo.add(asa);
      g.add(pivo);
      return { pivo, lado };
    });
    g.userData.asas = asas;
    return g;
  }
  const voadores = [];
  for (let i = 0; i < 5; i++) {
    const p = criarVoador({ corCorpo: 0x3b2a20, corAsa: 0x4a3426, envergadura: 0.42, corda: 0.16, corpo: 0.1 });
    const bando = i < 3 ? 0 : 1;
    p.userData.voo = {
      tipo: 'passaro', centro: bando ? new THREE.Vector3(-4, 10.5, -16) : new THREE.Vector3(4, 9, -12),
      raio: bando ? 16 : 13, vel: (bando ? -0.07 : 0.09), fase: (i % 3) * 0.06 + bando * 2, alt: (i % 3) * 0.35,
      bater: 9 + Math.random() * 3,
    };
    scene.add(p);
    voadores.push(p);
  }
  [[0xffd43b, -1.2, 8.4], [0xffffff, 6.4, 5.2], [0xff9ec4, -7.2, 7.4], [0x7cc8ff, 1.6, 1.2]].forEach(([cor, x, z], i) => {
    const b = criarVoador({ corCorpo: 0x2b1a10, corAsa: cor, envergadura: 0.2, corda: 0.22, corpo: 0.03 });
    b.userData.voo = { tipo: 'borboleta', centro: new THREE.Vector3(x, 0, z), fase: i * 1.7, bater: 22 };
    scene.add(b);
    voadores.push(b);
  });
  const posVoo = new THREE.Vector3();
  function passoVoadores(tempo) {
    for (const v of voadores) {
      const u = v.userData.voo;
      if (u.tipo === 'passaro') {
        const a = tempo * u.vel + u.fase;
        posVoo.set(u.centro.x + Math.cos(a) * u.raio, u.centro.y + u.alt + Math.sin(tempo * 0.8 + u.fase * 9) * 0.4, u.centro.z + Math.sin(a) * u.raio * 0.35);
      } else {
        const t = tempo * 0.6 + u.fase;
        posVoo.set(u.centro.x + Math.sin(t) * 1.4 + Math.sin(t * 2.3) * 0.4, 0.55 + Math.abs(Math.sin(t * 3.1)) * 0.6, u.centro.z + Math.sin(t * 0.7) * 1.1);
      }
      if (posVoo.distanceToSquared(v.position) > 1e-6) v.lookAt(posVoo.x * 2 - v.position.x, posVoo.y * 2 - v.position.y, posVoo.z * 2 - v.position.z);
      v.position.copy(posVoo);
      // planar de vez em quando (pássaros) ou bater sem parar (borboletas)
      const planando = u.tipo === 'passaro' && Math.sin(tempo * 0.5 + u.fase * 7) > 0.55;
      const bate = planando ? 0.15 : Math.sin(tempo * u.bater + u.fase * 5) * (u.tipo === 'passaro' ? 0.7 : 1.1);
      v.userData.asas.forEach(({ pivo, lado }) => { pivo.rotation.z = lado * bate; });
    }
  }

  // ---- castelos de pedra KayKit, que crescem por andares ----
  // As torres do KayKit têm base (y 0–0.3), corpo com janelas (0.3–1.2) e topo (ameias ou telhado).
  // Fatiamos: 1º andar = base + corpo; andares seguintes = só o corpo; a tampa = o topo original.
  const CORTE_CORPO = [0.3, 1.2];
  const COR_KAYKIT = ['green', 'red'];
  function pecasDeTorre(nomeBase, nomeTopo, cor, esc = 1) {
    const base = M.malhaDe(M.caminhoHex(`building_${nomeBase}_${cor}`));
    const topo = M.malhaDe(M.caminhoHex(`building_${nomeTopo}_${cor}`));
    const escalar = (g) => { g.scale(esc, esc, esc); return g; };
    return {
      primeiro: escalar(M.fatiar(base.geometria, 0, CORTE_CORPO[1])),
      andar: escalar(M.fatiar(base.geometria, CORTE_CORPO[0], CORTE_CORPO[1])),
      teto: escalar(M.fatiar(topo.geometria, CORTE_CORPO[1], 99)),
      material: base.material,
      alt0: CORTE_CORPO[1] * esc,
      alt: (CORTE_CORPO[1] - CORTE_CORPO[0]) * esc,
    };
  }
  // muralha: faixa do meio da parede repetida; ameias do topo original por cima
  const CORTE_MURO = [0.12, 0.62];
  const muroBase = M.malhaDe(M.caminhoHex('wall_straight'));
  const ESC_MURO = [0.72, 0.9, 0.9];
  const encolher = (g) => g.scale(...ESC_MURO);
  const pecasMuro = {
    primeiro: encolher(M.fatiar(muroBase.geometria, 0, CORTE_MURO[1])),
    andar: encolher(M.fatiar(muroBase.geometria, CORTE_MURO[0], CORTE_MURO[1])),
    teto: encolher(M.fatiar(muroBase.geometria, CORTE_MURO[1], 99)),
    material: muroBase.material,
    alt0: CORTE_MURO[1] * ESC_MURO[1],
    alt: (CORTE_MURO[1] - CORTE_MURO[0]) * ESC_MURO[1],
  };
  const LARG_MURO = 2 * ESC_MURO[0]; // um segmento wall_straight tem 2 de largura
  const MUROS_POR_CAMADA = 3;

  // Uma "parte" do castelo: onde fica o bloco k, que geometria usa e até que altura chega.
  function parteEmAndares(pecas, cx, cz, andares, rot = 0) {
    return {
      pecas, cx, cz, porCamada: 1, camadas: andares, mats: [pecas.material],
      geoDe: (k) => (k === 0 ? pecas.primeiro : pecas.andar),
      alturaAte: (n) => (n <= 0 ? TOPO_PLATAFORMA : TOPO_PLATAFORMA + pecas.alt0 + (n - 1) * pecas.alt),
      pos(k) { return { x: cx, y: this.alturaAte(k), z: cz, rot }; },
    };
  }
  function parteCortina() {
    // quatro trechos de muro entre as torres; o da frente (virado para o inimigo) primeiro
    const lados = [[0, E, 0], [E, 0, Math.PI / 2], [-E, 0, Math.PI / 2], [0, -E, 0]];
    return {
      porCamada: 4, camadas: 1, mats: [muroBase.material], escala: [(2 * E - 1.0) / 2, 0.85, 0.85],
      geoDe: () => muroBase.geometria,
      alturaAte: (n) => (n <= 0 ? TOPO_PLATAFORMA : TOPO_PLATAFORMA + 1.1 * 0.85),
      pos(k) { const [x, z, rot] = lados[k]; return { x, y: TOPO_PLATAFORMA, z, rot }; },
    };
  }
  function parteMuralha() {
    return {
      porCamada: MUROS_POR_CAMADA, muralha: true, mats: [pecasMuro.material],
      geoDe: (k) => (k < MUROS_POR_CAMADA ? pecasMuro.primeiro : pecasMuro.andar),
      alturaAte: (n) => {
        const camadas = Math.ceil(n / MUROS_POR_CAMADA);
        return camadas <= 0 ? TOPO_PLATAFORMA : TOPO_PLATAFORMA + pecasMuro.alt0 + (camadas - 1) * pecasMuro.alt;
      },
      pos(k) {
        const camada = Math.floor(k / MUROS_POR_CAMADA);
        const col = k % MUROS_POR_CAMADA;
        const y = camada === 0 ? TOPO_PLATAFORMA : TOPO_PLATAFORMA + pecasMuro.alt0 + (camada - 1) * pecasMuro.alt;
        return { x: (col - (MUROS_POR_CAMADA - 1) / 2) * LARG_MURO, y, z: DIST_MURALHA, rot: 0 };
      },
    };
  }
  const ANDARES_TORRE = 3;
  const ANDARES_MESTRA = 5;
  function alvoDaParte(parte, valores) {
    if (parte.muralha) return Math.round((Math.min(Math.max(valores.muralha, 0), 150) * MUROS_POR_CAMADA) / PONTOS_POR_CAMADA_MURALHA);
    const f = Math.min(Math.max(valores.castelo, 0), META) / META;
    // a torre de menagem tem pelo menos um andar enquanto o castelo existir
    if (parte.principal) return valores.castelo > 0 ? Math.max(1, Math.round(parte.camadas * f)) : 0;
    return Math.round(parte.porCamada * parte.camadas * f);
  }

  // tampa (telhado/ameias) de uma parte: o topo original da peça KayKit
  function tampaDe(geo, material, x, z, rot = 0, esc = null) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, material);
    m.castShadow = m.receiveShadow = true;
    m.position.set(x, 0, z);
    m.rotation.y = rot;
    if (esc) m.scale.set(...esc);
    g.add(m);
    return g;
  }

  const flamulas = [];

  // ---- monta os dois jogadores ----
  const tmp = new THREE.Vector3();
  const jogadores = POS_JOGADOR.map((pos, i) => {
    const outro = POS_JOGADOR[1 - i];
    const grupo = new THREE.Group();
    grupo.position.copy(pos);
    grupo.rotation.y = Math.atan2(outro.x - pos.x, outro.z - pos.z); // +z local aponta para o inimigo
    scene.add(grupo);

    const cor = COR_KAYKIT[i];
    const pecasTorre = pecasDeTorre('tower_base', 'tower_A', cor, 1.2);
    const pecasMestra = pecasDeTorre('tower_base', 'tower_B', cor, 1.7);
    const torres = [[E, E], [E, -E], [-E, -E], [-E, E]].map(([x, z]) => parteEmAndares(pecasTorre, x, z, ANDARES_TORRE, Math.atan2(x, z)));
    const mestra = parteEmAndares(pecasMestra, 0, 0, ANDARES_MESTRA, Math.PI);
    mestra.principal = true;
    const cortina = parteCortina();
    const muralha = parteMuralha();
    const partes = [cortina, ...torres, mestra, muralha];
    partes.forEach((p) => { p.lista = []; p.pendentes = 0; p.topo = TOPO_PLATAFORMA; });

    torres.forEach((t) => {
      t.tampa = tampaDe(t.pecas.teto, t.pecas.material, t.cx, t.cz, Math.atan2(t.cx, t.cz));
      grupo.add(t.tampa);
    });
    mestra.tampa = tampaDe(mestra.pecas.teto, mestra.pecas.material, 0, 0, Math.PI);
    grupo.add(mestra.tampa);
    muralha.tampa = new THREE.Group();
    for (let col = 0; col < MUROS_POR_CAMADA; col++) {
      const m = new THREE.Mesh(pecasMuro.teto, pecasMuro.material);
      m.castShadow = m.receiveShadow = true;
      m.position.set((col - (MUROS_POR_CAMADA - 1) / 2) * LARG_MURO, 0, DIST_MURALHA);
      muralha.tampa.add(m);
    }
    grupo.add(muralha.tampa);

    // bandeira do time ao lado do castelo
    const bandeira = M.hex(`flag_${cor}`);
    bandeira.position.set(-E - 0.9, TOPO_PLATAFORMA, E + 0.9);
    bandeira.scale.setScalar(2.2);
    grupo.add(bandeira);

    // linha tracejada da meta (100) em volta da torre de menagem
    const lado = 2.4;
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([x, z]) => new THREE.Vector3((x * lado) / 2, 0, (z * lado) / 2));
    const meta = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xffd43b, dashSize: 0.18, gapSize: 0.12 }));
    meta.computeLineDistances();
    meta.position.y = mestra.alturaAte(ANDARES_MESTRA);
    grupo.add(meta);

    return { grupo, partes, cortina, torres, mestra, muralha, bandeira, vCastelo: 0, vMuralha: 0 };
  });

  // ---- rótulos em HTML por cima do canvas ----
  function rotulo(classe) {
    const el = document.createElement('div');
    el.className = 'rotulo3d ' + classe;
    container.appendChild(el);
    return el;
  }
  jogadores.forEach((p, i) => {
    p.rotCastelo = rotulo(`castelo j${i}`);
    p.rotMuralha = rotulo(`muralha j${i}`);
    p.rotMeta = rotulo('meta');
    p.rotMeta.textContent = '100';
  });

  // ---- blocos: construção, demolição, destroços ----
  const animando = []; // blocos caindo para o lugar
  const demolicoes = []; // blocos esperando a vez de voar
  const destrocos = []; // blocos voando
  const particulas = [];
  const projeteis = [];
  const mapaParticula = texturaParticula();
  let tremor = 0;
  let ultimoSomBloco = 0;

  function novoBloco(p, parte, k) {
    const alvo = parte.pos(k);
    const m = new THREE.Mesh(parte.geoDe(k), parte.mats[(k * 7 + Math.floor(k / 3)) % parte.mats.length]);
    if (parte.escala) m.scale.set(...parte.escala);
    m.castShadow = true;
    m.receiveShadow = true;
    m.rotation.y = alvo.rot + (Math.random() - 0.5) * 0.06;
    m.position.set(alvo.x + (Math.random() - 0.5) * 0.03, alvo.y + ALTURA_QUEDA + Math.random() * 0.8, alvo.z + (Math.random() - 0.5) * 0.03);
    m.visible = false;
    m.userData = { alvoY: alvo.y, vy: 0, atraso: 0 };
    p.grupo.add(m);
    parte.lista.push(m);
    return m;
  }

  function soltarBloco(m, p, origemImpacto) {
    const i = animando.indexOf(m);
    if (i >= 0) animando.splice(i, 1);
    scene.attach(m);
    m.visible = true;
    const centro = p.grupo.position;
    const dir = new THREE.Vector3(m.position.x - centro.x, 0, m.position.z - centro.z);
    if (origemImpacto) dir.add(new THREE.Vector3(m.position.x - origemImpacto.x, 0, m.position.z - origemImpacto.z).multiplyScalar(0.6));
    dir.normalize().multiplyScalar(1.4 + Math.random() * 2.2);
    m.userData = {
      vel: new THREE.Vector3(dir.x + (Math.random() - 0.5) * 1.2, 2.2 + Math.random() * 2.6, dir.z + (Math.random() - 0.5) * 1.2),
      giro: new THREE.Vector3(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3),
      vida: 3 + Math.random(),
    };
    destrocos.push(m);
    if (Math.random() < 0.5) poeira(m.position, 2, 0xd8cdb5);
  }

  // Leva o castelo e a muralha do jogador até os valores pedidos. Devolve quanto tempo vai durar.
  function sincronizar(idx, valores, origemImpacto) {
    const p = jogadores[idx];
    p.vCastelo = valores.castelo;
    p.vMuralha = valores.muralha;
    const novos = [];
    const sair = [];
    for (const parte of p.partes) {
      const alvo = alvoDaParte(parte, valores);
      while (parte.lista.length < alvo) novos.push(novoBloco(p, parte, parte.lista.length));
      while (parte.lista.length > alvo) {
        const m = parte.lista.pop();
        parte.pendentes++;
        sair.push({ m, parte });
      }
    }
    let duracao = 0;
    if (novos.length) {
      novos.sort((a, b) => a.userData.alvoY - b.userData.alvoY);
      const total = THREE.MathUtils.clamp(0.9 + novos.length * 0.035, 1.1, 2.8);
      const passo = total / novos.length;
      novos.forEach((m, n) => { m.userData.atraso = n * passo; animando.push(m); });
      duracao = Math.max(duracao, total + 0.9);
    }
    if (sair.length) {
      sair.sort((a, b) => b.m.position.y - a.m.position.y);
      const total = THREE.MathUtils.clamp(0.5 + sair.length * 0.03, 0.7, 2.2);
      const passo = total / sair.length;
      sair.forEach((s, n) => demolicoes.push({ ...s, p, atraso: n * passo, origem: origemImpacto }));
      tremor = Math.max(tremor, Math.min(0.32, 0.08 + sair.length * 0.004));
      aoSom('desmorona');
      duracao = Math.max(duracao, total + 0.8);
    }
    p.rotCastelo.textContent = valores.castelo;
    p.rotMuralha.textContent = valores.muralha;
    syncTrabalhadores(idx, valores);
    syncPilhas(idx, valores);
    return duracao;
  }

  // ---- partículas ----
  function particula(pos, cor, vel, vida, escala) {
    const mat = new THREE.SpriteMaterial({ map: mapaParticula, color: cor, transparent: true, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.position.copy(pos);
    s.scale.setScalar(escala);
    s.userData = { vel, vida, vidaTotal: vida, escala };
    scene.add(s);
    particulas.push(s);
  }
  function poeira(pos, quantas = 6, cor = 0xe8dcc0) {
    for (let i = 0; i < quantas; i++) {
      particula(pos.clone(), cor, new THREE.Vector3(Math.random() * 1.6 - 0.8, Math.random() * 1, Math.random() * 1.6 - 0.8), 1 + Math.random() * 0.6, 0.5 + Math.random() * 0.4);
    }
  }
  function faiscas(idx, cor, quantas = 34) {
    const p = jogadores[idx];
    const base = p.grupo.position;
    const topo = Math.max(p.mestra.topo, 1.2);
    for (let i = 0; i < quantas; i++) {
      const a = Math.random() * Math.PI * 2;
      const pos = base.clone().add(new THREE.Vector3(Math.cos(a) * 1.8, Math.random() * topo, Math.sin(a) * 1.8));
      particula(pos, cor, new THREE.Vector3(Math.cos(a) * 0.35, 0.9 + Math.random() * 1.2, Math.sin(a) * 0.35), 1.4 + Math.random() * 0.8, 0.3 + Math.random() * 0.22);
    }
  }

  // ---- projétil de ataque ----
  const geoRocha = new THREE.DodecahedronGeometry(0.34, 0);
  const matRocha = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 1, flatShading: true });
  const matOrbe = new THREE.MeshBasicMaterial({ color: 0x6fc3ff });
  function lancarProjetil(de, para, magia, aoChegar, opcoes = {}) {
    const atacante = jogadores[de];
    const inicio = opcoes.inicio || atacante.grupo.localToWorld(new THREE.Vector3(0, atacante.mestra.topo + 0.6, 0));
    const alvoP = jogadores[para];
    const fim = alvoP.vMuralha > 0 && !opcoes.direto
      ? alvoP.grupo.localToWorld(new THREE.Vector3(0, alvoP.muralha.topo, DIST_MURALHA))
      : alvoP.grupo.localToWorld(new THREE.Vector3(0, Math.max(alvoP.mestra.topo - 0.4, 0.8), 0));
    const m = opcoes.modelo || new THREE.Mesh(magia ? new THREE.IcosahedronGeometry(0.36, 1) : geoRocha, magia ? matOrbe : matRocha);
    m.castShadow = true;
    m.position.copy(inicio);
    scene.add(m);
    projeteis.push({ m, inicio, fim, t: 0, dur: 1.25, altura: 4 + inicio.distanceTo(fim) * 0.14, magia, aoChegar });
    focar(() => m.position, { forca: 0.3, aprox: 0.06 });
    aoSom('lancar');
  }

  // ---- raios de magia caindo do céu ----
  const raiosAtivos = [];
  const matRaioNucleo = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
  const matRaioBrilho = new THREE.MeshBasicMaterial({ color: 0x5cc8ff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
  const luzRaio = new THREE.PointLight(0x8fd8ff, 0, 18);
  scene.add(luzRaio);
  function zigue(a, b, desvio, nivel, saida) {
    if (nivel === 0) { saida.push(b.clone()); return; }
    const m = a.clone().lerp(b, 0.5).add(new THREE.Vector3((Math.random() - 0.5) * desvio, (Math.random() - 0.5) * desvio * 0.3, (Math.random() - 0.5) * desvio));
    zigue(a, m, desvio / 2, nivel - 1, saida);
    zigue(m, b, desvio / 2, nivel - 1, saida);
  }
  function malhaRaio(de, para, desvio = 3.2) {
    const pts = [de.clone()];
    zigue(de, para, desvio, 5, pts);
    const curva = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 64, 0.05, 5, false), matRaioNucleo));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 64, 0.2, 6, false), matRaioBrilho));
    return g;
  }
  function raioNoCastelo(idx) {
    const p = jogadores[idx];
    const alvo = p.grupo.localToWorld(new THREE.Vector3(0, p.mestra.topo + 0.3, 0));
    for (let k = 0; k < 3; k++) {
      const de = alvo.clone().add(new THREE.Vector3((Math.random() - 0.5) * 5, 13 + Math.random() * 3, (Math.random() - 0.5) * 4));
      raiosAtivos.push({ de, para: alvo.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, -Math.random() * 1.2, (Math.random() - 0.5) * 1.6)), malha: null, vida: 0.55 + k * 0.18, troca: 0, atraso: k * 0.12 });
    }
    luzRaio.position.copy(alvo).add(new THREE.Vector3(0, 2, 0));
    aoSom('raio');
  }
  function passoRaios(dt) {
    let algum = false;
    for (let i = raiosAtivos.length - 1; i >= 0; i--) {
      const r = raiosAtivos[i];
      if (r.atraso > 0) { r.atraso -= dt; continue; }
      algum = true;
      r.vida -= dt;
      r.troca -= dt;
      if (r.troca <= 0 || !r.malha) {
        if (r.malha) { scene.remove(r.malha); r.malha.children.forEach((m) => m.geometry.dispose()); }
        r.malha = malhaRaio(r.de, r.para);
        scene.add(r.malha);
        r.troca = 0.07;
        if (Math.random() < 0.5) particula(r.para.clone(), 0xbfe8ff, new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2), 0.6, 0.35);
      }
      r.malha.visible = Math.random() > 0.2;
      if (r.vida <= 0) {
        scene.remove(r.malha);
        r.malha.children.forEach((m) => m.geometry.dispose());
        raiosAtivos.splice(i, 1);
      }
    }
    luzRaio.intensity = algum ? 30 + Math.random() * 40 : Math.max(0, luzRaio.intensity - dt * 200);
  }

  // =====================================================================
  //  ATORES: tudo que se mexe por um tempo e depois some (personagens, efeitos)
  // =====================================================================
  const atores = [];
  function ator(fn) { atores.push(fn); }
  // Roda fn(k, dt) com k indo de 0 a 1 durante "seg" segundos. Resolve no fim.
  function durante(seg, fn) {
    return new Promise((resolve) => {
      let t = 0;
      ator((dt) => {
        t += dt;
        const k = Math.min(1, t / seg);
        fn(k, dt, t);
        if (k >= 1) { resolve(); return false; }
        return true;
      });
    });
  }
  const suave = (k) => k * k * (3 - 2 * k);
  const mundo = (idx, x, y, z) => jogadores[idx].grupo.localToWorld(new THREE.Vector3(x, y, z));

  function colocar(obj, pos, escala = 1) {
    obj.position.copy(pos);
    obj.scale.setScalar(escala);
    scene.add(obj);
    return obj;
  }
  function olharPara(obj, alvo) {
    obj.rotation.y = Math.atan2(alvo.x - obj.position.x, alvo.z - obj.position.z);
  }
  function sumir(obj, cor = 0xe8dcc0) {
    M.esquecerAnimacao(obj);
    poeira(obj.position.clone().add(new THREE.Vector3(0, 0.4, 0)), 8, cor);
    scene.remove(obj);
  }
  // Anda de A até B pulando, virado para o destino.
  function andar(obj, de, para, seg, { pulo = 0.12, passos = 6, agachado = false, anim = null } = {}) {
    obj.position.copy(de);
    olharPara(obj, para);
    const base = obj.scale.x;
    const ctl = obj.userData.anim;
    if (ctl) {
      // personagem KayKit: a animação faz o passo
      ctl.tocar(anim || (agachado ? 'Sneaking' : de.distanceTo(para) / seg > 2 ? 'Running_A' : 'Walking_A'));
      return durante(seg, (k) => { obj.position.lerpVectors(de, para, k); }).then(() => ctl.tocar(obj.userData.def?.parado || 'Idle_A'));
    }
    return durante(seg, (k) => {
      obj.position.lerpVectors(de, para, k);
      obj.position.y = de.y + Math.abs(Math.sin(k * Math.PI * passos)) * pulo;
      if (agachado) obj.scale.set(base * 1.08, base * 0.82, base * 1.08);
    });
  }
  // Mexe o braço (martelar, golpear, conjurar).
  function balancarBraco(obj, seg, vezes, amplitude = 1.6) {
    const ctl = obj.userData.anim;
    if (ctl) {
      ctl.tocar(obj.userData.def?.trabalho || 'Melee_1H_Attack_Chop');
      return esperar(seg).then(() => ctl.tocar(obj.userData.def?.parado || 'Idle_A'));
    }
    const braco = obj.userData.braco;
    if (!braco) return durante(seg, () => {});
    return durante(seg, (k) => { braco.rotation.x = -Math.abs(Math.sin(k * Math.PI * vezes)) * amplitude; });
  }
  function nascer(obj, seg = 0.35) {
    const final = obj.scale.x;
    obj.scale.setScalar(0.01);
    return durante(seg, (k) => obj.scale.setScalar(final * (1 - Math.pow(1 - k, 3)) * (1 + Math.sin(k * Math.PI) * 0.15)));
  }

  // ---------------- geradores: construção de produção, trabalhadores e pilha de recurso ----------------
  // Cada tipo de trabalhador tem a sua construção KayKit ao lado do castelo (do lado que a câmera vê):
  //   construtores -> mina (pedra), soldados -> ferreiro (armas), magos -> igreja (cristais).
  const TIPOS = ['construtores', 'soldados', 'magos'];
  const PAPEL_DO_GERADOR = { construtores: 'construtor', soldados: 'soldado', magos: 'mago' };
  const RECURSO_DO_TIPO = Object.fromEntries(Object.entries(TRABALHADOR_DO_RECURSO).map(([r, t]) => [t, r]));
  const CONSTRUCAO_DO_TIPO = { construtores: 'mine', soldados: 'blacksmith', magos: 'church' };
  // ângulo em relação à direção da câmera: tudo do lado de dentro do campo (o de fora fica sob os painéis)
  const ANGULOS = [{ construtores: -1.05, soldados: 0.9, magos: 1.95 }, { construtores: -1.05, soldados: 0.9, magos: 1.95 }];
  const MAX_VISIVEIS = 4;
  const ESC_PERSONAGEM = 0.42;
  const RAIO_CONSTRUCAO = 5.1;
  const RAIO_TRABALHO = 3.85;
  const CAMERA_APROX = new THREE.Vector3(1.5, 0, 18.4);
  const noAngulo = (a, r, y = TOPO_PLATAFORMA) => new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);

  jogadores.forEach((p, i) => {
    const dirCam = p.grupo.worldToLocal(CAMERA_APROX.clone()).setY(0).normalize();
    const aCam = Math.atan2(dirCam.x, dirCam.z);
    p.dirCam = dirCam;
    p.torcida = [];
    p.trabalhadores = { construtores: [], soldados: [], magos: [] };
    p.lugares = {};
    p.construcoes = {};
    for (const tipo of TIPOS) {
      const a = aCam + ANGULOS[i][tipo];
      // a construção, virada para o castelo
      const c = M.hex(`building_${CONSTRUCAO_DO_TIPO[tipo]}_${COR_KAYKIT[i]}`);
      c.position.copy(noAngulo(a, RAIO_CONSTRUCAO));
      c.rotation.y = a + Math.PI;
      c.scale.setScalar(1.15);
      p.grupo.add(c);
      p.construcoes[tipo] = c;
      // quatro lugares de trabalho num arco entre o castelo e a construção, olhando para ela
      const tangente = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
      const centro = noAngulo(a, RAIO_TRABALHO);
      p.lugares[tipo] = [-1.05, -0.35, 0.35, 1.05].map((d) => {
        const v = centro.clone().addScaledVector(tangente, d);
        return { v, rot: a + (tipo === 'soldados' ? Math.PI * 0.5 : 0) };
      });
    }
    // alvo de treino para os soldados
    const alvo = M.hex('target');
    const aSold = aCam + ANGULOS[i].soldados;
    alvo.position.copy(noAngulo(aSold + Math.sign(aSold - aCam) * 0.42, RAIO_TRABALHO + 0.2));
    alvo.rotation.y = aSold - Math.PI * 0.5;
    alvo.scale.setScalar(2.2);
    p.grupo.add(alvo);
  });

  // ---- pilhas: blocos de pedra, armas e cristais, ao lado de cada construção ----
  const POR_ITEM = 3; // 1 item na pilha a cada 3 de recurso
  const MAX_ITENS = { construtores: 10, soldados: 8, magos: 9 };
  const matCristal = new THREE.MeshStandardMaterial({ color: 0x6fc3ff, emissive: 0x2a78c8, emissiveIntensity: 0.6, roughness: 0.35, flatShading: true });
  const geoCristal = new THREE.OctahedronGeometry(0.2, 0);
  const CORES_RECURSO = { construtores: 0xb8b0a2, soldados: 0xdde3e8, magos: 0x8fd8ff };

  function itemDaPilha(tipo, k) {
    if (tipo === 'construtores') {
      // pirâmide de blocos de pedra: 4, 3, 2, 1
      const m = M.hex('resource_stone');
      m.scale.setScalar(1.15);
      let fileira = 0;
      let resto = k;
      while (resto >= 4 - fileira) { resto -= 4 - fileira; fileira++; }
      const n = 4 - fileira;
      m.position.set((resto - (n - 1) / 2) * 0.5, fileira * 0.3, 0);
      return m;
    }
    if (tipo === 'soldados') {
      // suportes de armas e baldes de flechas lado a lado
      const m = M.hex(k % 3 === 2 ? 'bucket_arrows' : 'weaponrack');
      m.scale.setScalar(2.4);
      m.position.set((k % 4 - 1.5) * 0.42, 0, Math.floor(k / 4) * -0.42);
      return m;
    }
    const m = new THREE.Mesh(geoCristal, matCristal);
    const a = k * 2.4;
    const r = k === 0 ? 0 : 0.12 + Math.sqrt(k) * 0.1;
    const esc = 1.35 - k * 0.07;
    m.scale.set(esc, esc * 1.9, esc);
    m.position.set(Math.cos(a) * r, 0.17 * esc * 1.9, Math.sin(a) * r * 0.7);
    m.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 3, (Math.random() - 0.5) * 0.4);
    m.castShadow = true;
    return m;
  }

  jogadores.forEach((p, i) => {
    p.pilhas = {};
    const aCam = Math.atan2(p.dirCam.x, p.dirCam.z);
    for (const tipo of TIPOS) {
      // do lado da construção que fica mais perto da câmera
      const lado = ANGULOS[i][tipo] > 0 ? -1 : 1;
      const a = aCam + ANGULOS[i][tipo] + lado * 0.42;
      const grupo = new THREE.Group();
      grupo.position.copy(noAngulo(a, RAIO_CONSTRUCAO - 0.3));
      grupo.rotation.y = aCam;
      p.grupo.add(grupo);
      p.pilhas[tipo] = { grupo, itens: [], tipo };
    }
  });

  function syncPilhas(idx, valores) {
    const p = jogadores[idx];
    for (const tipo of TIPOS) {
      const pilha = p.pilhas[tipo];
      const v = valores[RECURSO_DO_TIPO[tipo]];
      if (v === undefined) continue;
      const alvo = Math.min(MAX_ITENS[tipo], Math.ceil(Math.max(0, v) / POR_ITEM));
      while (pilha.itens.length < alvo) {
        const m = itemDaPilha(tipo, pilha.itens.length);
        pilha.grupo.add(m);
        pilha.itens.push(m);
        nascer(m, 0.3);
      }
      while (pilha.itens.length > alvo) {
        const m = pilha.itens.pop();
        const pos = m.getWorldPosition(new THREE.Vector3());
        const final = m.scale.clone();
        durante(0.25, (k) => m.scale.copy(final).multiplyScalar(1 - k * 0.98)).then(() => {
          pilha.grupo.remove(m);
          poeira(pos, 2, CORES_RECURSO[tipo]);
        });
      }
    }
  }

  // Começo do turno: cada trabalhador visível joga 1 do recurso que produziu na pilha.
  function itemVoador(tipo) {
    if (tipo === 'construtores') { const m = M.hex('resource_stone'); m.scale.setScalar(0.9); return m; }
    if (tipo === 'soldados') { const m = M.clonar(M.caminhoItem('sword_1handed')); m.scale.setScalar(0.6); return m; }
    const m = new THREE.Mesh(geoCristal, matCristal);
    m.scale.set(1, 1.7, 1);
    return m;
  }
  function animarProducao(idx, valores) {
    const p = jogadores[idx];
    const esperas = [];
    for (const tipo of TIPOS) {
      const pilha = p.pilhas[tipo];
      const destino = pilha.grupo.localToWorld(new THREE.Vector3(0, 0.6, 0));
      p.trabalhadores[tipo].forEach((c, n) => {
        const atraso = n * 0.14 + TIPOS.indexOf(tipo) * 0.1;
        const de = c.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.6, 0));
        esperas.push(esperar(atraso).then(async () => {
          c.userData.ocupado = true;
          await c.userData.anim.tocar('Throw', { loop: false, vel: 1.4 });
          c.userData.anim.tocar(c.userData.def.trabalho);
          c.userData.ocupado = false;
        }));
        const item = itemVoador(tipo);
        item.visible = false;
        colocar(item, de, item.scale.x);
        esperas.push(esperar(atraso + 0.35).then(() => {
          item.visible = true;
          return durante(0.7, (k) => {
            item.position.lerpVectors(de, destino, k);
            item.position.y += Math.sin(k * Math.PI) * 1.1;
            item.rotation.y += 0.18;
            item.rotation.x += 0.1;
          });
        }).then(() => {
          scene.remove(item);
          poeira(destino, 3, CORES_RECURSO[tipo]);
          if (tipo === 'magos') for (let k = 0; k < 4; k++) particula(destino.clone(), 0xcff0ff, new THREE.Vector3((Math.random() - 0.5) * 1.5, 1 + Math.random(), (Math.random() - 0.5) * 1.5), 0.6, 0.18);
        }));
      });
    }
    return Promise.all(esperas).then(() => syncPilhas(idx, valores));
  }

  // ---------------- estados do castelo: em perigo (fogo e fumaça) ou quase vencendo (brilho e torcida) ----------------
  const LIMITE_PERIGO = 15;
  const LIMITE_GLORIA = 85;
  const luzesFogo = jogadores.map(() => { const l = new THREE.PointLight(0xff7a2a, 0, 8, 1.6); scene.add(l); return l; });
  const luzesGloria = jogadores.map(() => { const l = new THREE.PointLight(0xffd43b, 0, 10, 1.4); scene.add(l); return l; });
  const posEstado = new THREE.Vector3();
  // chamas: cones brilhantes que tremulam no alto do castelo em perigo
  const geoChama = new THREE.ConeGeometry(0.22, 0.75, 7);
  geoChama.translate(0, 0.375, 0);
  const matChamaFora = new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.9, depthWrite: false });
  const matChamaDentro = new THREE.MeshBasicMaterial({ color: 0xffd43b, transparent: true, opacity: 0.95, depthWrite: false });
  jogadores.forEach((p) => {
    p.chamas = [[0.6, 0.5], [-0.7, 0.2], [0.1, -0.6], [-0.2, 0.9]].map(([x, z], n) => {
      const g = new THREE.Group();
      const fora = new THREE.Mesh(geoChama, matChamaFora);
      const dentro = new THREE.Mesh(geoChama, matChamaDentro);
      dentro.scale.setScalar(0.55);
      dentro.position.y = 0.02;
      g.add(fora, dentro);
      g.position.set(x, 0, z);
      g.userData.fase = n * 1.9;
      g.visible = false;
      p.grupo.add(g);
      return g;
    });
  });

  function syncTorcida(p, querTorcida) {
    if (querTorcida && !p.torcida.length) {
      // torcida dos dois lados do castelo, de frente para a câmera
      const base = Math.atan2(p.dirCam.x, p.dirCam.z);
      ['soldado', 'construtor', 'mago', 'arqueiro', 'soldado'].forEach((papel, n) => {
        const a = base + [1.55, 1.85, -1.55, -1.85, 2.2][n];
        const c = M.personagem(papel, ESC_PERSONAGEM);
        c.position.set(Math.sin(a) * (4.3 + (n % 2) * 0.7), TOPO_PLATAFORMA, Math.cos(a) * (4.3 + (n % 2) * 0.7));
        c.rotation.y = base;
        c.userData.anim.tocar(n % 2 ? 'Waving' : 'Cheering', { vel: 0.9 + Math.random() * 0.3 });
        p.grupo.add(c);
        p.torcida.push(c);
        nascer(c, 0.4);
      });
    } else if (!querTorcida && p.torcida.length) {
      p.torcida.forEach((c) => {
        poeira(c.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.4, 0)), 5);
        M.esquecerAnimacao(c);
        p.grupo.remove(c);
      });
      p.torcida.length = 0;
    }
  }

  function passoEstados(dt, tempo) {
    jogadores.forEach((p, i) => {
      const v = p.vCastelo;
      const centro = p.grupo.position;
      const topo = Math.max(p.mestra.topo, p.cortina.topo, 0.9);
      // em perigo: fumaça escura e fogo, mais forte quanto menor o castelo
      const perigo = v > 0 && v < LIMITE_PERIGO ? (LIMITE_PERIGO - v) / LIMITE_PERIGO : 0;
      if (perigo > 0) {
        // coluna de fumaça escura
        if (Math.random() < dt * (5 + perigo * 8)) {
          posEstado.set(centro.x + (Math.random() - 0.5) * 1.6, topo + 0.6, centro.z + (Math.random() - 0.5) * 1.6);
          particula(posEstado.clone(), Math.random() < 0.5 ? 0x3d3934 : 0x5e5850, new THREE.Vector3(0.3, 0.9 + Math.random() * 0.5, 0), 3, 1 + Math.random() * 0.6);
        }
        // faíscas subindo
        if (Math.random() < dt * (6 + perigo * 10)) {
          posEstado.set(centro.x + (Math.random() - 0.5) * 1.6, topo + 0.4, centro.z + (Math.random() - 0.5) * 1.6);
          particula(posEstado.clone(), Math.random() < 0.6 ? 0xff7a2a : 0xffd43b, new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.4 + Math.random() * 0.8, (Math.random() - 0.5) * 0.6), 0.8, 0.22);
        }
        luzesFogo[i].position.set(centro.x, topo + 1, centro.z);
        luzesFogo[i].intensity = (30 + Math.random() * 20) * (0.5 + perigo);
      } else luzesFogo[i].intensity = 0;
      p.chamas.forEach((g) => {
        g.visible = perigo > 0;
        if (!g.visible) return;
        const u = g.userData;
        g.position.y = topo - 0.1;
        const esc = (0.8 + perigo * 0.9) * (1 + Math.sin(tempo * 13 + u.fase) * 0.12);
        g.scale.set(esc * (1 + Math.sin(tempo * 9 + u.fase) * 0.1), esc * (1 + Math.sin(tempo * 11 + u.fase * 2) * 0.22), esc);
        g.rotation.y = tempo * 2 + u.fase;
      });

      // quase vencendo: brilho dourado subindo e a torcida comemorando
      const gloria = v >= LIMITE_GLORIA;
      if (gloria) {
        if (Math.random() < dt * 7) {
          const a = Math.random() * Math.PI * 2;
          posEstado.set(centro.x + Math.cos(a) * 1.9, TOPO_PLATAFORMA + Math.random() * topo, centro.z + Math.sin(a) * 1.9);
          particula(posEstado.clone(), Math.random() < 0.7 ? 0xffd43b : 0xffffff, new THREE.Vector3(Math.cos(a) * 0.15, 0.8 + Math.random() * 0.5, Math.sin(a) * 0.15), 1.4, 0.2);
        }
        luzesGloria[i].position.set(centro.x, topo + 1, centro.z);
        luzesGloria[i].intensity = 40 + Math.sin(tempo * 3) * 20;
      } else luzesGloria[i].intensity = 0;
      syncTorcida(p, gloria);
    });
  }

  function syncTrabalhadores(idx, valores) {
    const p = jogadores[idx];
    if (valores.construtores === undefined) return;
    for (const tipo of TIPOS) {
      const lista = p.trabalhadores[tipo];
      const alvo = Math.min(MAX_VISIVEIS, Math.max(0, valores[tipo]));
      while (lista.length < alvo) {
        const lugar = p.lugares[tipo][lista.length];
        const c = M.personagem(PAPEL_DO_GERADOR[tipo], ESC_PERSONAGEM);
        c.position.copy(lugar.v);
        c.rotation.y = lugar.rot;
        c.userData.tipo = tipo;
        p.grupo.add(c);
        lista.push(c);
        // surge do chão e começa a trabalhar, cada um num ritmo
        c.userData.anim.tocar('Spawn_Ground', { loop: false }).then(() => {
          if (c.parent) c.userData.anim.tocar(c.userData.def.trabalho, { vel: 0.8 + Math.random() * 0.35 });
        });
        const mundoPos = p.grupo.localToWorld(lugar.v.clone());
        for (let i = 0; i < 10; i++) particula(mundoPos.clone().add(new THREE.Vector3(0, 0.5, 0)), { construtores: 0xb8b0a2, soldados: 0xff8a5c, magos: 0x7cc8ff }[tipo], new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 2), 0.8, 0.25);
      }
      while (lista.length > alvo) {
        const c = lista.pop();
        const pos = c.getWorldPosition(new THREE.Vector3());
        M.esquecerAnimacao(c);
        p.grupo.remove(c);
        poeira(pos.add(new THREE.Vector3(0, 0.4, 0)), 8, 0x9a8f80);
      }
    }
  }
  // As animações de trabalho vêm do KayKit; aqui só os efeitos: lasquinhas de pedra da picareta
  // e faíscas azuis dos magos.
  const posMao = new THREE.Vector3();
  function passoTrabalhadores(tempo, dt) {
    jogadores.forEach((p) => {
      for (const c of p.trabalhadores.construtores) {
        if (c.userData.ocupado || Math.random() > dt * 1.4) continue;
        c.getWorldPosition(posMao).add(tmp.set(Math.sin(c.rotation.y + p.grupo.rotation.y) * 0.45, 0.1, Math.cos(c.rotation.y + p.grupo.rotation.y) * 0.45));
        for (let k = 0; k < 3; k++) particula(posMao.clone(), 0xb8b0a2, new THREE.Vector3((Math.random() - 0.5) * 1.4, 0.8 + Math.random() * 0.8, (Math.random() - 0.5) * 1.4), 0.45, 0.12);
      }
      for (const c of p.trabalhadores.magos) {
        if (Math.random() > dt * 2.4) continue;
        c.getWorldPosition(posMao).add(tmp.set(Math.sin(c.rotation.y + p.grupo.rotation.y) * 0.35, 0.9, Math.cos(c.rotation.y + p.grupo.rotation.y) * 0.35));
        particula(posMao.clone(), Math.random() < 0.5 ? 0x7cc8ff : 0xcff0ff, new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.6 + Math.random() * 0.5, (Math.random() - 0.5) * 0.5), 0.9, 0.16);
      }
    });
  }

  // ---------------- tipos de animação de cada carta ----------------
  function tipoDaCarta(c) {
    const ops = c.efeitos.map((e) => e.op);
    if (c.id === 'guardiao') return 'golem';
    if (c.id === 'lanca_torres') return 'catapulta';
    if (c.id === 'espirito') return 'dragao';
    if (c.id === 'carroca') return 'carroca';
    if (c.id === 'sabotador') return 'sabotador';
    if (c.id === 'fadas') return 'fadas';
    if (c.id === 'crescimento') return 'pedras';
    if (c.id === 'canalizar') return 'cristais';
    if (c.id === 'armar') return 'espadas';
    if (c.id === 'batedores') return 'flechas';
    if (ops.includes('roubo')) return 'ladrao';
    if (ops.includes('maldicao')) return 'ritual';
    if (ops.includes('ataque')) return 'marcha';
    if (c.efeitos.some((e) => e.quem === 'ele')) return 'feixe';
    if (c.efeitos.some((e) => ['construtores', 'soldados', 'magos'].includes(e.campo))) return 'recruta';
    return 'obra';
  }
  // quem vai à luta em cada carta de ataque corpo a corpo
  const TROPA_DA_CARTA = { brigada: 'barbaro', linha: 'soldado', patrulha: 'cavaleiro', guerreiros: 'cavaleiro' };

  // ponto de chegada de quem ataca: na frente da muralha (ou do castelo, se não houver muralha)
  function pontoDeAtaque(idx, deslocX = 0) {
    const p = jogadores[idx];
    const z = p.vMuralha > 0 ? DIST_MURALHA + 0.95 : E + 1.1;
    return mundo(idx, deslocX, TOPO_PLATAFORMA, z);
  }
  function saida(idx, deslocX = 0) { return mundo(idx, deslocX, TOPO_PLATAFORMA, 3.9); }
  function pontoDoAlvo(idx) {
    const p = jogadores[idx];
    return p.vMuralha > 0
      ? mundo(idx, 0, p.muralha.topo, DIST_MURALHA)
      : mundo(idx, 0, Math.max(p.mestra.topo - 0.4, 0.8), 0);
  }
  function valorAtaque(c) {
    const e = c.efeitos.find((x) => x.op === 'ataque' || x.op === 'ataqueDireto');
    return e ? e.valor : 0;
  }
  // personagem KayKit que entra em cena para a carta
  function ator3d(papel, pos, esc = ESC_PERSONAGEM * 1.15) {
    const o = M.personagem(papel, esc);
    return colocar(o, pos, esc);
  }
  // objeto KayKit que voa em arco de A até B
  function voar(obj, de, para, seg, altura = 1.5, giro = 0.15) {
    obj.position.copy(de);
    return durante(seg, (k) => {
      obj.position.lerpVectors(de, para, k);
      obj.position.y += Math.sin(k * Math.PI) * altura;
      obj.rotation.x += giro;
      obj.rotation.z += giro * 0.6;
    });
  }

  async function animarCarta(id, quem, estado, aoImpacto) {
    const c = CARTA_POR_ID[id];
    const ele = 1 - quem;
    let feito = false;
    const impacto = () => { if (!feito) { feito = true; aoImpacto(); } };
    const sincronizados = new Set();
    const sync = (i, ponto) => { sincronizados.add(i); return esperar(sincronizar(i, estado.jogadores[i], ponto)); };
    const esperas = [];
    const tipo = tipoDaCarta(c);
    // câmera: olha o próprio castelo nas cartas de construção e magia em si mesmo
    if (!['marcha', 'flechas', 'golem', 'ladrao', 'sabotador', 'dragao', 'feixe', 'catapulta'].includes(tipo)) focar(() => centroCastelo(quem), { forca: 0.3, aprox: 0.07 });

    if (tipo === 'marcha') {
      const papel = TROPA_DA_CARTA[c.id] || 'soldado';
      const n = THREE.MathUtils.clamp(Math.ceil(valorAtaque(c) / 4), 2, 5);
      const tropa = [];
      for (let i = 0; i < n; i++) tropa.push(ator3d(papel, saida(quem, (i - (n - 1) / 2) * 0.7)));
      focar(() => tmp.copy(tropa[0].position).setY(1), { forca: 0.38, aprox: 0.1 });
      await Promise.all(tropa.map((s, i) => esperar(i * 0.08).then(() => andar(s, s.position.clone(), pontoDeAtaque(ele, (i - (n - 1) / 2) * 0.65), 1.9, { anim: 'Running_A' }))));
      aoSom('metal');
      const golpes = Promise.all(tropa.map((s) => balancarBraco(s, 1.1, 3)));
      await esperar(0.35);
      focoImpacto(pontoDoAlvo(ele));
      impacto();
      esperas.push(sync(ele, pontoDoAlvo(ele)));
      await golpes;
      await Promise.all(tropa.map((s) => andar(s, s.position.clone(), saida(quem, (Math.random() - 0.5) * 2), 1.5, { anim: 'Running_A' }).then(() => sumir(s))));
    } else if (tipo === 'flechas') {
      // arqueiros na frente do próprio castelo disparam uma chuva de flechas
      const arqueiros = [-0.8, 0, 0.8].map((d) => ator3d('arqueiro', saida(quem, d)));
      arqueiros.forEach((a) => { olharPara(a, jogadores[ele].grupo.position); nascer(a, 0.3); });
      focar(() => tmp.copy(arqueiros[1].position).setY(1), { forca: 0.3, aprox: 0.06 });
      await Promise.all(arqueiros.map((a) => a.userData.anim.tocar('Ranged_Bow_Draw', { loop: false })));
      arqueiros.forEach((a) => a.userData.anim.tocar('Ranged_Bow_Release', { loop: false, segurar: true }));
      aoSom('lancar');
      const alvo = pontoDoAlvo(ele);
      await Promise.all(arqueiros.flatMap((a, i) => [0, 1].map((k) => {
        const flecha = M.clonar(M.caminhoItem('arrow_bow'));
        flecha.scale.setScalar(0.9);
        scene.add(flecha);
        const de = a.position.clone().add(new THREE.Vector3(0, 0.6, 0));
        const para = alvo.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, Math.random() * 0.6, (Math.random() - 0.5) * 1.2));
        return esperar(i * 0.1 + k * 0.25).then(() => durante(1.0, (t) => {
          const anterior = flecha.position.clone();
          flecha.position.lerpVectors(de, para, t);
          flecha.position.y += Math.sin(t * Math.PI) * 3;
          if (t > 0.02) flecha.lookAt(flecha.position.clone().multiplyScalar(2).sub(anterior));
        })).then(() => { scene.remove(flecha); poeira(para, 3); });
      })));
      focoImpacto(alvo);
      aoSom('impacto');
      impacto();
      esperas.push(sync(ele, alvo));
      await esperar(0.5);
      arqueiros.forEach((a) => sumir(a));
    } else if (tipo === 'golem') {
      // Colosso: um bárbaro gigante atravessa o campo e acerta a muralha com o machado
      const g = ator3d('barbaro', saida(quem), ESC_PERSONAGEM * 2.6);
      focar(() => tmp.copy(g.position).setY(1.6), { forca: 0.4, aprox: 0.1 });
      await nascer(g, 0.5);
      await andar(g, g.position.clone(), pontoDeAtaque(ele), 2.8, { anim: 'Walking_A' });
      await g.userData.anim.tocar('Melee_2H_Attack_Chop', { loop: false, vel: 0.8, segurar: true });
      tremor = 0.45;
      aoSom('impacto');
      focoImpacto(pontoDoAlvo(ele));
      impacto();
      esperas.push(sync(ele, pontoDoAlvo(ele)));
      await esperar(0.6);
      await durante(0.5, (k) => g.scale.setScalar(ESC_PERSONAGEM * 2.6 * (1 - k * 0.98)));
      sumir(g, 0x9a8f80);
    } else if (tipo === 'catapulta') {
      // a torre-catapulta KayKit sobe do chão ao lado do castelo e dispara
      const cat = colocar(M.hex(`building_tower_catapult_${COR_KAYKIT[quem]}`), mundo(quem, -3.4, TOPO_PLATAFORMA, 1.4), 1.15);
      olharPara(cat, jogadores[ele].grupo.position);
      focar(() => tmp.copy(cat.position).setY(1.5), { forca: 0.3, aprox: 0.08 });
      await durante(0.6, (k) => { cat.position.y = TOPO_PLATAFORMA - 2.4 * (1 - suave(k)); });
      poeira(cat.position.clone().add(new THREE.Vector3(0, 0.3, 0)), 12, 0xb8b0a2);
      aoSom('lancar');
      await esperar(0.3);
      const bola = M.hex('projectile_catapult');
      bola.scale.setScalar(1.6);
      const inicio = cat.localToWorld(new THREE.Vector3(0, 2.0, 0));
      await new Promise((resolve) => lancarProjetil(quem, ele, false, (ponto) => {
        impacto();
        esperas.push(sync(ele, ponto));
        resolve();
      }, { inicio, direto: true, modelo: bola }));
      await esperar(0.5);
      await durante(0.5, (k) => { cat.position.y = TOPO_PLATAFORMA - 2.4 * suave(k); });
      sumir(cat, 0xb8b0a2);
    } else if (tipo === 'dragao') {
      const d = colocar(criarDragao(), mundo(quem, 0, 6, 0), 1.1);
      const de = d.position.clone();
      const para = pontoDoAlvo(ele).add(new THREE.Vector3(0, 1.2, 0));
      focar(() => d.position, { forca: 0.4, aprox: 0.08 });
      aoSom('feitico');
      await durante(2.2, (k, dt, t) => {
        d.position.lerpVectors(de, para, suave(k));
        d.position.y += Math.sin(k * Math.PI) * 3;
        olharPara(d, para);
        d.userData.asas.forEach(({ asa, lado }) => { asa.rotation.z = lado * Math.sin(t * 12) * 0.5; });
        if (Math.random() < 0.5) particula(d.position.clone(), 0x8fdc6a, new THREE.Vector3(0, -0.3, 0), 0.7, 0.3);
      });
      raioNoCastelo(ele);
      focoImpacto(para);
      impacto();
      esperas.push(sync(ele, para));
      await durante(0.6, (k) => { d.position.y += 0.15; d.scale.setScalar(1.1 * (1 - k)); });
      scene.remove(d);
    } else if (tipo === 'carroca') {
      // um bárbaro empurra o carrinho de pedras até o castelo e arremessa uma no inimigo
      const b = ator3d('construtor', mundo(quem, -4.4, TOPO_PLATAFORMA, -1.4));
      const carrinho = M.hex('wheelbarrow');
      carrinho.scale.setScalar(2.4);
      carrinho.position.set(0, 0, 1.0);
      b.add(carrinho);
      const pedra = M.hex('resource_stone');
      pedra.position.set(0, 0.35, 0.05);
      carrinho.add(pedra);
      focar(() => tmp.copy(b.position).setY(1), { forca: 0.3, aprox: 0.08 });
      await andar(b, b.position.clone(), mundo(quem, -2.6, TOPO_PLATAFORMA, 0.1), 1.5, { anim: 'Walking_A' });
      aoSom('carpintaria');
      esperas.push(sync(quem));
      await b.userData.anim.tocar('Throw', { loop: false });
      carrinho.remove(pedra);
      const voadora = M.hex('resource_stone');
      voadora.scale.setScalar(1.8);
      const inicio = b.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      await new Promise((resolve) => lancarProjetil(quem, ele, false, (ponto) => {
        impacto();
        esperas.push(sync(ele, ponto));
        resolve();
      }, { inicio, direto: true, modelo: voadora }));
      sumir(b);
    } else if (tipo === 'ladrao' || tipo === 'sabotador') {
      const bicho = ator3d(tipo === 'ladrao' ? 'ladrao' : 'sabotador', saida(quem));
      focar(() => tmp.copy(bicho.position).setY(1), { forca: 0.38, aprox: 0.1 });
      await andar(bicho, bicho.position.clone(), pontoDeAtaque(ele, 0.6), tipo === 'ladrao' ? 2.0 : 2.4, { anim: 'Sneaking' });
      if (tipo === 'ladrao') {
        aoSom('roubo');
        await bicho.userData.anim.tocar('PickUp', { loop: false });
        const saco = M.hex('sack');
        saco.scale.setScalar(3.2);
        saco.position.set(0, 1.0, -0.35);
        bicho.add(saco);
      } else {
        await bicho.userData.anim.tocar('Throw', { loop: false });
        aoSom('desmorona');
        const onde = pontoDeAtaque(ele, 0.6).add(new THREE.Vector3(0, 0.5, 0));
        poeira(onde, 18, 0x4a4038);
        for (let i = 0; i < 14; i++) particula(onde.clone(), 0xffb347, new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2.5, (Math.random() - 0.5) * 3), 0.6, 0.2);
      }
      impacto();
      esperas.push(sync(ele), sync(quem));
      await andar(bicho, bicho.position.clone(), saida(quem), 1.4, { anim: 'Running_A' });
      sumir(bicho);
    } else if (tipo === 'feixe') {
      const mago = ator3d('mago', saida(quem));
      olharPara(mago, jogadores[ele].grupo.position);
      await nascer(mago, 0.35);
      aoSom('feitico');
      const alvo = pontoDoAlvo(ele).add(new THREE.Vector3(0, 0.6, 0));
      const deFeixe = mago.position.clone().add(new THREE.Vector3(0, 0.9, 0));
      focar(alvo.clone().lerp(deFeixe, 0.35), { forca: 0.3, aprox: 0.06, seg: 2.2 });
      mago.userData.anim.tocar('Ranged_Magic_Shoot');
      let malha = null;
      await durante(1.1, () => {
        if (malha) { scene.remove(malha); malha.children.forEach((m) => m.geometry.dispose()); }
        malha = malhaRaio(deFeixe, alvo, 1.0);
        scene.add(malha);
      });
      scene.remove(malha);
      malha.children.forEach((m) => m.geometry.dispose());
      const campo = c.efeitos.find((e) => e.quem === 'ele').campo;
      const cor = { cristais: 0x8fd8ff, armas: 0xdde3e8 }[campo] || 0xb8b0a2;
      for (let i = 0; i < 22; i++) particula(alvo.clone(), cor, new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4), 1, 0.3);
      aoSom('raio');
      impacto();
      esperas.push(sync(ele), sync(quem));
      await esperar(0.4);
      sumir(mago, 0x7cc8ff);
    } else if (tipo === 'pedras') {
      // pedras brotam do chão com magia e voam para o castelo
      const centro = mundo(quem, 2.8, TOPO_PLATAFORMA, -1.2);
      const pedras = [0, 1, 2].map((i) => {
        const p = M.hex('resource_stone');
        p.scale.setScalar(1.5);
        p.position.copy(centro).add(new THREE.Vector3((i - 1) * 0.7, -0.6, (i % 2) * 0.4));
        scene.add(p);
        return p;
      });
      impacto();
      esperas.push(sync(quem));
      aoSom('feitico');
      await durante(1.3, (k, dt, t) => {
        pedras.forEach((p, i) => { p.position.y = TOPO_PLATAFORMA - 0.6 + suave(k) * (0.6 + i * 0.15); p.rotation.y += dt * 2; });
        if (Math.random() < 0.7) {
          const a = t * 6;
          particula(centro.clone().add(new THREE.Vector3(Math.cos(a) * 1.1, k * 1.8, Math.sin(a) * 1.1)), 0x8fd8ff, new THREE.Vector3(0, 0.6, 0), 0.8, 0.28);
        }
      });
      const destino = mundo(quem, 0, 1.4, 0);
      await Promise.all(pedras.map((p, i) => esperar(i * 0.15).then(() => voar(p, p.position.clone(), destino, 0.8, 1.8)).then(() => { scene.remove(p); poeira(destino, 3, 0xb8b0a2); })));
    } else if (tipo === 'cristais' || tipo === 'espadas') {
      const centro = mundo(quem, 0, 0, 0);
      const itens = [];
      const n = tipo === 'cristais' ? 5 : 4;
      for (let i = 0; i < n; i++) {
        const m = tipo === 'cristais'
          ? new THREE.Mesh(geoCristal, matCristal)
          : M.clonar(M.caminhoItem('sword_1handed'));
        m.scale.setScalar(tipo === 'cristais' ? 1.4 : 1.1);
        scene.add(m);
        itens.push(m);
      }
      impacto();
      esperas.push(sync(quem));
      aoSom(tipo === 'cristais' ? 'feitico' : 'metal');
      const topo = Math.max(jogadores[quem].mestra.topo, 2) + 1.2;
      await durante(1.5, (k, dt, t) => {
        itens.forEach((m, i) => {
          const a = t * 2.4 + (i / n) * Math.PI * 2;
          const r = 2.6 * (1 - k * 0.3);
          m.position.set(centro.x + Math.cos(a) * r, k * topo + 0.5, centro.z + Math.sin(a) * r);
          m.rotation.y += dt * 5;
          if (tipo === 'espadas') m.rotation.z = Math.sin(t * 5 + i) * 0.4;
        });
        if (Math.random() < 0.6) particula(itens[0].position.clone(), 0xbfe8ff, new THREE.Vector3(0, 0.3, 0), 0.6, 0.25);
      });
      const pontos = itens.map((m) => m.position.clone());
      const escala0 = itens[0].scale.x;
      await durante(0.45, (k) => itens.forEach((m, i) => { m.position.lerpVectors(pontos[i], new THREE.Vector3(centro.x, topo - 0.8, centro.z), k); m.scale.setScalar(escala0 * (1 - k * 0.8)); }));
      itens.forEach((m) => scene.remove(m));
      faiscas(quem, 0x7cc8ff, 20);
    } else if (tipo === 'fadas') {
      const fadas = [0, 1, 2].map(() => colocar(criarFada(), mundo(quem, 0, 3, 0), 1));
      impacto();
      esperas.push(sync(quem));
      aoSom('feitico');
      const centro = mundo(quem, 0, 0, 0);
      await durante(2.4, (k, dt, t) => {
        fadas.forEach((f, i) => {
          const a = t * 1.8 + (i / 3) * Math.PI * 2;
          f.position.set(centro.x + Math.cos(a) * 2.4, 1.5 + Math.sin(t * 3 + i) * 0.6 + jogadores[quem].mestra.topo * 0.6, centro.z + Math.sin(a) * 2.4);
          f.userData.asas.forEach((asa, j) => { asa.rotation.y = (j ? 1 : -1) * Math.sin(t * 30) * 0.8; });
          if (Math.random() < 0.4) particula(f.position.clone(), 0xcff0ff, new THREE.Vector3(0, -0.2, 0), 0.5, 0.18);
        });
      });
      fadas.forEach((f) => sumir(f, 0xcff0ff));
    } else if (tipo === 'ritual') {
      const meu = colocar(criarCirculo(0x6fd0ff), mundo(quem, 0, TOPO_PLATAFORMA + 0.02, 0.6), 1.2);
      const dele = colocar(criarCirculo(0x9a3a2c), mundo(ele, 0, TOPO_PLATAFORMA + 0.02, 0.6), 1.2);
      aoSom('feitico');
      raioNoCastelo(quem);
      await durante(0.8, (k) => { meu.rotation.y += 0.05; dele.rotation.y -= 0.05; meu.scale.setScalar(1.2 * k); dele.scale.setScalar(1.2 * k); });
      impacto();
      esperas.push(sync(quem), sync(ele));
      await durante(1.2, (k) => {
        meu.rotation.y += 0.05; dele.rotation.y -= 0.05;
        meu.userData.mat.opacity = dele.userData.mat.opacity = 0.85 * (1 - k);
      });
      scene.remove(meu, dele);
    } else if (tipo === 'recruta') {
      impacto();
      esperas.push(sync(quem));
      faiscas(quem, c.cor === 'magia' ? 0x7cc8ff : c.cor === 'batalha' ? 0xff8a5c : 0xb8b0a2, 24);
      if (c.cor === 'magia') {
        const circ = colocar(criarCirculo(0x6fd0ff), mundo(quem, 0, TOPO_PLATAFORMA + 0.02, 0.6), 1.2);
        await durante(1.4, (k) => { circ.rotation.y += 0.05; circ.userData.mat.opacity = 0.85 * (1 - k); });
        scene.remove(circ);
      } else await esperar(1.2);
    } else {
      // obra: construtores martelando ao lado de um andaime enquanto as peças sobem
      const naMuralha = c.efeitos.every((e) => e.campo === 'muralha');
      const lugares = naMuralha ? [[-2.6, DIST_MURALHA + 0.8], [2.6, DIST_MURALHA + 0.8]] : [[-2.9, -1.9], [2.9, -1.9]];
      const andaime = M.hex('building_scaffolding');
      colocar(andaime, mundo(quem, naMuralha ? 0 : -2.6, TOPO_PLATAFORMA, naMuralha ? DIST_MURALHA + 1.4 : 0.6), 0.9);
      olharPara(andaime, mundo(quem, 0, 0, 0));
      nascer(andaime, 0.3);
      const ajudantes = lugares.map(([x, z]) => {
        const b = ator3d('construtor', mundo(quem, x, TOPO_PLATAFORMA, z));
        olharPara(b, mundo(quem, 0, 0, naMuralha ? DIST_MURALHA : 0));
        b.userData.anim.tocar('Hammering');
        nascer(b, 0.3);
        return b;
      });
      impacto();
      const duracao = sincronizar(quem, estado.jogadores[quem]);
      sincronizados.add(quem);
      await esperar(Math.max(1.4, duracao));
      ajudantes.forEach((b) => sumir(b));
      sumir(andaime, 0xb8b0a2);
    }

    // garante que os dois lados terminem no estado certo
    soltarFoco(0.7);
    impacto();
    for (const i of [0, 1]) if (!sincronizados.has(i)) esperas.push(sync(i));
    await Promise.all(esperas);
  }

  // =====================================================================
  //  PRÉVIA: enquanto a carta é arrastada sobre a arena, mostra o efeito dela
  //  (toras-fantasma onde vai crescer, toras em vermelho onde vai cair, alvo no inimigo)
  // =====================================================================
  const matFantasma = new THREE.MeshBasicMaterial({ color: 0xc4ffae, transparent: true, opacity: 0.4, depthWrite: false });
  const matPerigo = new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0.8 });
  const geoAlvo = new THREE.RingGeometry(0.55, 0.78, 36);
  geoAlvo.rotateX(-Math.PI / 2);
  const geoAlvoMira = new THREE.RingGeometry(0.18, 0.28, 24);
  geoAlvoMira.rotateX(-Math.PI / 2);
  const matAlvo = new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
  const previa = { ativa: false, fantasmas: [], tingidos: [], alvos: [], rotulos: [] };
  const CAMPOS_PREVIA = ['castelo', 'muralha', 'construtores', 'soldados', 'magos', 'pedra', 'armas', 'cristais'];

  function mostrarPrevia(id, quem, estado) {
    apagarPrevia();
    const c = CARTA_POR_ID[id];
    if (!c) return;
    const antes = estado.jogadores.map((j) => ({ ...j }));
    const depois = estado.jogadores.map((j) => ({ ...j }));
    aplicarEfeitos(c, depois[quem], depois[1 - quem]); // só o efeito; o custo o painel já mostra
    previa.ativa = true;
    [0, 1].forEach((i) => {
      const p = jogadores[i];
      for (const parte of p.partes) {
        const atual = parte.lista.length;
        const alvo = alvoDaParte(parte, depois[i]);
        for (let k = atual; k < alvo; k++) {
          const pos = parte.pos(k);
          const m = new THREE.Mesh(parte.geoDe(k), matFantasma);
          if (parte.escala) m.scale.set(...parte.escala);
          m.position.set(pos.x, pos.y, pos.z);
          m.rotation.y = pos.rot;
          p.grupo.add(m);
          previa.fantasmas.push(m);
        }
        for (let k = alvo; k < atual; k++) {
          const m = parte.lista[k];
          previa.tingidos.push({ m, mat: m.material });
          m.material = matPerigo;
        }
      }
      // alvos no chão onde o golpe vai bater
      const naMuralha = depois[i].muralha < antes[i].muralha;
      const noCastelo = depois[i].castelo < antes[i].castelo;
      if (naMuralha) previa.alvos.push(alvoNoChao(i, DIST_MURALHA + 0.6, 1));
      if (noCastelo) previa.alvos.push(alvoNoChao(i, 0.4, 1.9));
      // texto com cada mudança
      const linhas = CAMPOS_PREVIA
        .map((campo) => ({ campo, d: depois[i][campo] - antes[i][campo] }))
        .filter((x) => x.d)
        .map(({ campo, d }) => `<span class="${d > 0 ? 'mais' : 'menos'}">${NOME[campo]} ${d > 0 ? '+' : '−'}${Math.abs(d)}</span>`);
      if (!previa.rotulos[i]) previa.rotulos[i] = rotulo(`previa j${i}`);
      previa.rotulos[i].innerHTML = linhas.join('');
      previa.rotulos[i].style.display = linhas.length ? '' : 'none';
    });
  }
  function alvoNoChao(idx, z, esc) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geoAlvo, matAlvo), new THREE.Mesh(geoAlvoMira, matAlvo));
    g.position.copy(mundo(idx, 0, TOPO_PLATAFORMA + 0.04, z));
    g.scale.setScalar(esc);
    g.userData.esc = esc;
    scene.add(g);
    return g;
  }
  function apagarPrevia() {
    previa.fantasmas.forEach((m) => m.parent && m.parent.remove(m));
    previa.tingidos.forEach(({ m, mat }) => { m.material = mat; });
    previa.alvos.forEach((g) => scene.remove(g));
    previa.fantasmas.length = previa.tingidos.length = previa.alvos.length = 0;
    previa.rotulos.forEach((el) => { if (el) el.style.display = 'none'; });
    previa.ativa = false;
  }
  function passoPrevia(tempo) {
    if (!previa.ativa) return;
    matFantasma.opacity = 0.34 + Math.sin(tempo * 5) * 0.14;
    matPerigo.opacity = 0.6 + Math.sin(tempo * 7) * 0.3;
    previa.alvos.forEach((g) => {
      g.rotation.y = tempo * 1.5;
      g.scale.setScalar(g.userData.esc * (1 + Math.sin(tempo * 6) * 0.08));
    });
  }

  // ---- câmera estilo batalha de Pokémon ----
  const camPerto = { pos: new THREE.Vector3(1.5, 5.1, 18.4), alvo: new THREE.Vector3(1.0, 1.9, -2.6) };
  const camLonge = { pos: new THREE.Vector3(1.4, 9.5, 25), alvo: new THREE.Vector3(1.0, 4.4, -2.6) };
  let zoomAtual = 0;
  const camBase = new THREE.Vector3();
  const alvoBase = new THREE.Vector3();
  function zoomDesejado() {
    const alto = Math.max(jogadores[0].vCastelo, jogadores[0].vMuralha * 0.8, jogadores[1].vCastelo * 0.75);
    return THREE.MathUtils.clamp((alto - 40) / 60, 0, 1);
  }

  // Câmera de cinema: segue o que está acontecendo (projétil, tropa, castelo atingido) e,
  // na troca de vez, desliza um pouco para o lado de quem joga. Tudo suave e discreto.
  const cine = {
    seguir: null, // Vector3 ou função que devolve Vector3
    ate: 0, // tempo (s) em que o foco solta sozinho; 0 = só quando soltarFoco()
    foco: new THREE.Vector3(1, 1.5, -1),
    forca: 0, forcaAlvo: 0, // quanto o olhar vai para o foco
    aprox: 0, aproxAlvo: 0, // quanto a câmera anda em direção ao foco
    lado: new THREE.Vector3(), ladoAlvo: new THREE.Vector3(),
    relogio: 0,
  };
  function focar(alvo, { forca = 0.4, aprox = 0.12, seg = 0 } = {}) {
    cine.seguir = alvo;
    cine.forcaAlvo = forca;
    cine.aproxAlvo = aprox;
    cine.ate = seg ? cine.relogio + seg : 0;
    const p = typeof alvo === 'function' ? alvo() : alvo;
    if (cine.forca < 0.05 && p) cine.foco.copy(p);
  }
  function soltarFoco(depois = 0) {
    if (depois) { cine.ate = cine.relogio + depois; return; }
    cine.seguir = null;
    cine.forcaAlvo = cine.aproxAlvo = 0;
  }
  const centroCastelo = (idx, fracAltura = 0.6) => mundo(idx, 0, Math.max(1, jogadores[idx].mestra.topo * fracAltura), 0.4);
  const focoImpacto = (ponto) => focar(ponto.clone(), { forca: 0.45, aprox: 0.14, seg: 1.4 });
  const posFoco = new THREE.Vector3();
  function passoCine(dt) {
    cine.relogio += dt;
    if (cine.ate && cine.relogio >= cine.ate) soltarFoco();
    if (cine.seguir) {
      const p = typeof cine.seguir === 'function' ? cine.seguir() : cine.seguir;
      if (p) posFoco.copy(p);
      cine.foco.lerp(posFoco, Math.min(1, dt * 5));
    }
    cine.forca += (cine.forcaAlvo - cine.forca) * Math.min(1, dt * 2.6);
    cine.aprox += (cine.aproxAlvo - cine.aprox) * Math.min(1, dt * 2.2);
    cine.lado.lerp(cine.ladoAlvo, Math.min(1, dt * 1.4));
  }

  // ---- o dia passa: manhã no turno 1, entardecer perto do turno 23 ----
  const HORAS = [
    { f: 0, ceu: ['#4f9fe0', '#9fd3f5', '#dff1fb'], sol: '#fff1d6', solI: 2.2, solPos: [9, 18, 9], luz: '#ffffff', chao: '#6b8f3f', luzI: 1.5, nevoa: '#cfe9f7', nuvem: '#ffffff' },
    { f: 0.55, ceu: ['#3f8fd8', '#a8d2ee', '#f6ead0'], sol: '#ffe2b0', solI: 2.1, solPos: [12, 14, 6], luz: '#fff4e0', chao: '#6b8f3f', luzI: 1.45, nevoa: '#e6e4d4', nuvem: '#fff6ea' },
    { f: 1, ceu: ['#4a66a0', '#f0a067', '#ffd796'], sol: '#ffb47a', solI: 1.95, solPos: [15, 9, 3], luz: '#ffdcb8', chao: '#76783c', luzI: 1.32, nevoa: '#f0c8a0', nuvem: '#ffdcc8' },
  ];
  const corA = new THREE.Color();
  const corB = new THREE.Color();
  const misturar = (a, b, k) => corA.set(a).lerp(corB.set(b), k);
  let horaAtual = 0;
  let horaAlvo = 0;
  let horaPintada = -1;
  function aplicarHora(f) {
    let i = 0;
    while (i < HORAS.length - 2 && f > HORAS[i + 1].f) i++;
    const a = HORAS[i];
    const b = HORAS[i + 1];
    const k = THREE.MathUtils.clamp((f - a.f) / (b.f - a.f), 0, 1);
    scene.background.pintar(...a.ceu.map((c, n) => misturar(c, b.ceu[n], k).getStyle()));
    sol.color.copy(misturar(a.sol, b.sol, k));
    sol.intensity = THREE.MathUtils.lerp(a.solI, b.solI, k);
    sol.position.set(...a.solPos.map((v, n) => THREE.MathUtils.lerp(v, b.solPos[n], k)));
    luzCeu.color.copy(misturar(a.luz, b.luz, k));
    luzCeu.groundColor.copy(misturar(a.chao, b.chao, k));
    luzCeu.intensity = THREE.MathUtils.lerp(a.luzI, b.luzI, k);
    scene.fog.color.copy(misturar(a.nevoa, b.nevoa, k));
    matNuvem.color.copy(misturar(a.nuvem, b.nuvem, k));
    matNuvem.emissive.copy(matNuvem.color);
    horaPintada = f;
  }
  function passoHora(dt) {
    horaAtual += (horaAlvo - horaAtual) * Math.min(1, dt * 0.6);
    if (Math.abs(horaAtual - horaPintada) > 0.004) aplicarHora(horaAtual);
  }

  // ---- animação ----
  let ultimo = performance.now();
  let rodando = true;
  function passo(dt, tempo) {
    // blocos caindo
    for (let i = animando.length - 1; i >= 0; i--) {
      const m = animando[i];
      const u = m.userData;
      if (u.atraso > 0) {
        u.atraso -= dt;
        if (u.atraso <= 0) m.visible = true;
        continue;
      }
      m.visible = true;
      u.vy -= GRAVIDADE * dt;
      m.position.y += u.vy * dt;
      if (m.position.y <= u.alvoY) {
        m.position.y = u.alvoY;
        animando.splice(i, 1);
        if (tempo - ultimoSomBloco > 0.07) { aoSom('bloco'); ultimoSomBloco = tempo; }
        if (Math.random() < 0.25) poeira(m.getWorldPosition(tmp).clone(), 2);
      }
    }
    // demolição, um bloco de cada vez
    for (let i = demolicoes.length - 1; i >= 0; i--) {
      const d = demolicoes[i];
      d.atraso -= dt;
      if (d.atraso <= 0) {
        d.parte.pendentes--;
        soltarBloco(d.m, d.p, d.origem);
        demolicoes.splice(i, 1);
      }
    }
    // destroços
    for (let i = destrocos.length - 1; i >= 0; i--) {
      const m = destrocos[i];
      const u = m.userData;
      u.vel.y -= GRAVIDADE * 1.4 * dt;
      m.position.addScaledVector(u.vel, dt);
      m.rotation.x += u.giro.x * dt;
      m.rotation.y += u.giro.y * dt;
      m.rotation.z += u.giro.z * dt;
      const chaoY = 0.05;
      if (m.position.y < chaoY) {
        m.position.y = chaoY;
        u.vel.y *= -0.3;
        u.vel.x *= 0.55;
        u.vel.z *= 0.55;
        u.giro.multiplyScalar(0.5);
      }
      u.vida -= dt;
      if (u.vida < 0.6) m.scale.setScalar(Math.max(0.01, u.vida / 0.6));
      if (u.vida <= 0) {
        scene.remove(m);
        destrocos.splice(i, 1);
      }
    }
    // partículas
    for (let i = particulas.length - 1; i >= 0; i--) {
      const s = particulas[i];
      const u = s.userData;
      u.vida -= dt;
      s.position.addScaledVector(u.vel, dt);
      u.vel.multiplyScalar(0.97);
      const f = Math.max(0, u.vida / u.vidaTotal);
      s.material.opacity = f;
      s.scale.setScalar(u.escala * (1.6 - f * 0.6));
      if (u.vida <= 0) {
        scene.remove(s);
        s.material.dispose();
        particulas.splice(i, 1);
      }
    }
    // projéteis
    for (let i = projeteis.length - 1; i >= 0; i--) {
      const pr = projeteis[i];
      pr.t += dt / pr.dur;
      const t = Math.min(pr.t, 1);
      pr.m.position.lerpVectors(pr.inicio, pr.fim, t);
      pr.m.position.y += Math.sin(Math.PI * t) * pr.altura;
      pr.m.rotation.x += dt * 7;
      pr.m.rotation.z += dt * 5;
      if (Math.random() < (pr.magia ? 0.8 : 0.35)) particula(pr.m.position.clone(), pr.magia ? 0x8fd3ff : 0xd8cdb5, new THREE.Vector3(0, 0.2, 0), 0.6, pr.magia ? 0.4 : 0.25);
      if (t >= 1) {
        scene.remove(pr.m);
        projeteis.splice(i, 1);
        poeira(pr.fim, 16, pr.magia ? 0x9fdcff : 0xe8dcc0);
        focoImpacto(pr.fim);
        aoSom('impacto');
        pr.aoChegar(pr.fim);
      }
    }
    // tampas (ameias, telhados, bandeira) acompanham o topo de cada parte
    jogadores.forEach((p) => {
      for (const parte of p.partes) {
        const n = parte.lista.length + parte.pendentes;
        const camadas = Math.ceil(n / parte.porCamada);
        const alvo = parte.alturaAte(n);
        parte.topo += (alvo - parte.topo) * Math.min(1, dt * 3.5);
        if (parte.tampa) {
          parte.tampa.position.y = parte.topo;
          parte.tampa.visible = camadas > 0;
        }
      }
    });
    nuvens.forEach((n, i) => { n.position.x += dt * (0.25 + i * 0.03); if (n.position.x > 45) n.position.x = -45; });
    passoRaios(dt);
    for (let i = atores.length - 1; i >= 0; i--) if (!atores[i](dt)) atores.splice(i, 1);
    passoTrabalhadores(tempo, dt);
    M.atualizarAnimacoes(dt);
    passoEstados(dt, tempo);
    passoVoadores(tempo);
    passoRio(dt);
    passoHora(dt);
    passoPrevia(tempo);
    // vento: árvores e flamulinhas
    for (const a of arvoresBalanco) {
      const u = a.userData;
      a.rotation.z = Math.sin(tempo * 0.9 + u.fase) * 0.022 * u.forca;
      a.rotation.x = Math.cos(tempo * 0.7 + u.fase) * 0.014 * u.forca;
    }
    for (const f of flamulas) {
      const u = f.userData;
      f.rotation.y = u.base + Math.sin(tempo * 3.2 + u.fase) * 0.45;
      f.scale.y = 1 + Math.sin(tempo * 7 + u.fase) * 0.12;
    }

    // câmera
    zoomAtual += (zoomDesejado() - zoomAtual) * Math.min(1, dt * 1.2);
    camBase.lerpVectors(camPerto.pos, camLonge.pos, zoomAtual);
    alvoBase.lerpVectors(camPerto.alvo, camLonge.alvo, zoomAtual);
    passoCine(dt);
    camBase.add(cine.lado);
    alvoBase.add(cine.lado);
    alvoBase.lerp(cine.foco, cine.forca);
    camBase.lerp(cine.foco, cine.aprox);
    camera.position.copy(camBase);
    camera.position.y += Math.sin(tempo * 0.5) * 0.06;
    if (tremor > 0) {
      camera.position.x += (Math.random() - 0.5) * tremor;
      camera.position.y += (Math.random() - 0.5) * tremor;
      tremor = Math.max(0, tremor - dt * 0.7);
    }
    camera.lookAt(alvoBase);
  }

  function posicionarRotulos() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const coloca = (el, ponto) => {
      ponto.project(camera);
      el.style.transform = `translate(-50%, -100%) translate(${((ponto.x + 1) / 2) * w}px, ${((1 - ponto.y) / 2) * h}px)`;
      el.style.opacity = ponto.z < 1 ? 1 : 0;
    };
    jogadores.forEach((p) => {
      const temCastelo = p.mestra.lista.length > 0;
      coloca(p.rotCastelo, p.grupo.localToWorld(tmp.set(0, p.mestra.topo + (temCastelo ? 2.0 : 0.5), 0)));
      coloca(p.rotMuralha, p.grupo.localToWorld(tmp.set(0, p.muralha.topo + 0.65, DIST_MURALHA)));
      coloca(p.rotMeta, p.grupo.localToWorld(tmp.set(-1.2, p.mestra.alturaAte(ANDARES_MESTRA), -1.2)));
    });
    if (previa.ativa) {
      previa.rotulos.forEach((el, i) => {
        if (!el) return;
        const p = jogadores[i];
        const temCastelo = p.mestra.lista.length > 0;
        coloca(el, p.grupo.localToWorld(tmp.set(0, p.mestra.topo + (temCastelo ? 2.0 : 0.5), 0)));
      });
    }
  }

  function redimensionar() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // o layout pode pedir outro campo de visão e subir a cena (--fov-3d, --desloc-3d no CSS),
    // por exemplo na tela cheia, onde a mão fica por cima da parte de baixo
    const css = getComputedStyle(container);
    const fov = parseFloat(css.getPropertyValue('--fov-3d'));
    const desloc = parseFloat(css.getPropertyValue('--desloc-3d')) || 0;
    camera.fov = fov || (w / h < 1.3 ? 52 : 40);
    // com painéis por cima das laterais, telas mais estreitas precisam de uma câmera mais aberta
    const hfovMin = parseFloat(css.getPropertyValue('--hfov-min-3d'));
    if (hfovMin) {
      const vfov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hfovMin) / 2) / (w / h)));
      camera.fov = Math.max(camera.fov, vfov);
    }
    if (desloc) camera.setViewOffset(w, h, 0, desloc * h, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  const obs = 'ResizeObserver' in window ? new ResizeObserver(redimensionar) : null;
  if (obs) obs.observe(container);
  else window.addEventListener('resize', redimensionar);
  redimensionar();

  function quadro(agora) {
    if (!rodando) return;
    const dt = Math.min(0.05, (agora - ultimo) / 1000);
    ultimo = agora;
    passo(dt, agora / 1000);
    renderer.render(scene, camera);
    posicionarRotulos();
    requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);

  const esperar = (s) => new Promise((r) => setTimeout(r, s * 1000));

  // ---------------- API usada pelo jogo ----------------
  return {
    resetar(estado) {
      for (const p of jogadores) {
        for (const parte of p.partes) {
          parte.lista.forEach((m) => p.grupo.remove(m));
          parte.lista.length = 0;
          parte.pendentes = 0;
          parte.topo = TOPO_PLATAFORMA;
        }
      }
      for (const p of jogadores) {
        for (const tipo in p.trabalhadores) {
          p.trabalhadores[tipo].forEach((c) => { M.esquecerAnimacao(c); p.grupo.remove(c); });
          p.trabalhadores[tipo].length = 0;
        }
      }
      animando.length = 0;
      demolicoes.forEach((d) => p0Remove(d));
      demolicoes.length = 0;
      destrocos.forEach((m) => scene.remove(m));
      destrocos.length = 0;
      zoomAtual = 0;
      apagarPrevia();
      soltarFoco();
      cine.ladoAlvo.set(0, 0, 0);
      horaAtual = horaAlvo = 0;
      aplicarHora(0);
      let maior = 0;
      estado.jogadores.forEach((j, i) => { maior = Math.max(maior, sincronizar(i, j)); });
      return esperar(maior);
    },

    // Troca de vez: a câmera desliza para o lado de quem joga e o dia avança com o turno.
    vez(quem, turno = 1) {
      cine.ladoAlvo.copy(jogadores[quem].grupo.position).sub(camPerto.alvo).setY(0).multiplyScalar(0.08);
      horaAlvo = THREE.MathUtils.clamp((turno - 1) / 22, 0, 1);
    },

    // Começo do turno: os castores jogam o que produziram nas pilhas.
    producao(quem, estado) {
      return animarProducao(quem, estado.jogadores[quem]);
    },

    // Prévia do efeito da carta arrastada sobre a arena.
    previa(id, quem, estado) { mostrarPrevia(id, quem, estado); },
    limparPrevia() { apagarPrevia(); },

    // Mostra o estado novo. Em ataques, uma pedra (ou orbe mágico) voa antes do dano.
    // Devolve uma Promise que termina quando toda a animação acabou.
    atualizar(estado, opcoes = {}) {
      const { atacante = null, projetil = false, magia = false, faisca = null, raio = null, aoImpacto = () => {} } = opcoes;
      if (opcoes.carta) return animarCarta(opcoes.carta, opcoes.quem, estado, aoImpacto);
      const esperas = [];
      let comProjetil = false;
      estado.jogadores.forEach((j, i) => {
        const p = jogadores[i];
        const levaDano = j.castelo < p.vCastelo || j.muralha < p.vMuralha;
        if (projetil && atacante !== null && i !== atacante && levaDano) {
          comProjetil = true;
          esperas.push(new Promise((resolve) => {
            lancarProjetil(atacante, i, magia, (pontoImpacto) => {
              aoImpacto();
              if (raio !== null) raioNoCastelo(raio);
              esperar(sincronizar(i, j, pontoImpacto)).then(resolve);
            });
          }));
        } else {
          esperas.push(esperar(sincronizar(i, j)));
        }
      });
      if (!comProjetil) setTimeout(aoImpacto, 0);
      if (!comProjetil && raio !== null) raioNoCastelo(raio);
      if (faisca) {
        faiscas(faisca.alvo, faisca.cor);
        esperas.push(esperar(1.4));
      }
      return Promise.all(esperas);
    },

    comemorar(idx) {
      const cores = [0xffd43b, 0x4caf50, 0xe74c3c, 0x4c9fe0, 0xffffff];
      const topo = jogadores[idx].grupo.localToWorld(new THREE.Vector3(0, jogadores[idx].mestra.topo + 1.5, 0));
      for (let i = 0; i < 110; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 1.5 + Math.random() * 3.5;
        particula(topo.clone(), cores[i % cores.length], new THREE.Vector3(Math.cos(a) * v, 2.5 + Math.random() * 4, Math.sin(a) * v), 1.8 + Math.random(), 0.25);
      }
    },

    // depuração: avança a simulação N segundos de uma vez (a aba do preview fica em segundo plano)
    avancar(segundos = 3) {
      let t = performance.now() / 1000;
      for (let i = 0; i < segundos * 60; i++) { t += 1 / 60; passo(1 / 60, t); }
      renderer.render(scene, camera);
      posicionarRotulos();
    },

    camera(perto, longe) {
      if (perto) { camPerto.pos.set(...perto.pos); camPerto.alvo.set(...perto.alvo); }
      if (longe) { camLonge.pos.set(...longe.pos); camLonge.alvo.set(...longe.alvo); }
      return { perto: camPerto, longe: camLonge };
    },

    parar() {
      rodando = false;
    },
  };

  function p0Remove(d) {
    d.p.grupo.remove(d.m);
  }
}
