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
import { toon, contornar, criarCastor, criarGolem, criarDragao, criarFada, criarArvore, criarCatapulta, criarCarroca, criarCirculo } from './personagens3d.js';
import { CARTA_POR_ID, RECURSO_DA_COR, NOME } from './cartas.js';
import { aplicarEfeitos } from './regras.js';

// ---------------- medidas ----------------
const S = 0.5; // largura de um bloco reto
const H = 0.5; // altura de uma camada de blocos
const TOPO_PLATAFORMA = 0.3;
const E = 1.35; // distância do centro do castelo até o centro de cada torre de canto
const R_TORRE = 0.5; // raio das torres redondas
const DIST_MURALHA = 3.05; // muralha de defesa: distância até o centro do castelo
const LARG_MURALHA = 7; // blocos por camada da muralha de defesa
const PONTOS_POR_CAMADA_MURALHA = 5;
const META = 100;
const GRAVIDADE = 9;
const ALTURA_QUEDA = 3.2;

const POS_JOGADOR = [new THREE.Vector3(-3.6, 0, 3.8), new THREE.Vector3(4.2, 0, -6.2)];
const COR_JOGADOR = [0x3f9a3a, 0xc0392b];
const COR_JOGADOR_ESCURA = [0x24612a, 0x7e2018];

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
  // nós da madeira
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
export function criarArena(container, aoSom = () => {}) {
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
  const luzCeu = new THREE.HemisphereLight(0xffffff, 0x6b8f3f, 1.5);
  scene.add(luzCeu);
  const sol = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sol.position.set(9, 18, 9);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 60 });
  sol.shadow.bias = -0.0008;
  scene.add(sol);

  // ---- chão e cenário ----
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), toon(0xffffff, { map: texturaGrama() }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  scene.add(chao);

  const rnd = rngSemente(42);
  const matFolha = toon(0x2f7d3a);
  const matFolha2 = toon(0x3e9443);
  const matTronco = toon(0x7a5230);
  const geoCone = new THREE.ConeGeometry(1, 1, 7);
  const geoTronco = new THREE.CylinderGeometry(0.18, 0.24, 1, 6);
  const arvoresBalanco = []; // árvores que balançam com o vento
  function arvore(x, z, esc) {
    const g = new THREE.Group();
    const tronco = new THREE.Mesh(geoTronco, matTronco);
    tronco.scale.set(esc, esc * 0.9, esc);
    tronco.position.y = esc * 0.45;
    contornar(tronco, 0.12);
    g.add(tronco);
    [[1.2, 1.6, 1.3], [0.95, 1.4, 2.2], [0.65, 1.1, 2.95]].forEach(([r, h, y], i) => {
      const cone = new THREE.Mesh(geoCone, i % 2 ? matFolha2 : matFolha);
      cone.scale.set(r * esc, h * esc, r * esc);
      cone.position.y = y * esc;
      cone.castShadow = true;
      contornar(cone, 0.07);
      g.add(cone);
    });
    g.position.set(x, 0, z);
    g.rotation.y = rnd() * Math.PI;
    g.userData.fase = Math.random() * 6;
    g.userData.forca = 0.6 + Math.random() * 0.8;
    arvoresBalanco.push(g);
    scene.add(g);
  }
  for (let i = 0; i < 70; i++) {
    const a = -Math.PI * 0.95 + rnd() * Math.PI * 1.45;
    const r = 16 + rnd() * 14;
    const x = Math.cos(a) * r + 1;
    const z = Math.sin(a) * r - 2;
    if (z > 9) continue;
    arvore(x, z, 0.9 + rnd() * 0.8);
  }
  const matMorro = toon(0x5f9e3a);
  for (let i = 0; i < 7; i++) {
    const morro = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), matMorro);
    morro.scale.set(8 + rnd() * 8, 4 + rnd() * 5, 6 + rnd() * 4);
    morro.position.set(-30 + i * 11 + rnd() * 4, 0, -40 - rnd() * 8);
    scene.add(morro);
  }
  const matPedraSolta = toon(0x9c968b);
  const geoPedraSolta = new THREE.DodecahedronGeometry(1, 0);
  [[-8.6, 1.2, 0.9], [0.6, 5.2, 0.6], [8.8, -3.6, 1.1], [-0.6, -9.5, 0.7], [7.5, -11, 0.8], [-9.4, -4.2, 1.3], [1.8, 0.4, 0.45]].forEach(([x, z, e]) => {
    const p = new THREE.Mesh(geoPedraSolta, matPedraSolta);
    p.scale.set(e * 1.2, e * 0.8, e);
    p.position.set(x, e * 0.35, z);
    p.rotation.set(rnd(), rnd() * 3, rnd());
    p.castShadow = p.receiveShadow = true;
    contornar(p, 0.08);
    scene.add(p);
  });
  const nuvens = [];
  const matNuvem = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35, flatShading: true });
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const bola = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), matNuvem);
      bola.scale.setScalar(1.2 + rnd() * 1.2);
      bola.position.set(k * 1.6 - 2.4, rnd() * 0.6, rnd() * 0.8);
      g.add(bola);
    }
    g.position.set(-30 + i * 13 + rnd() * 5, 14 + rnd() * 5, -36 - rnd() * 10);
    scene.add(g);
    nuvens.push(g);
  }


  // ---- adereços do cenário: cercas, tocos, arbustos, riacho e flores ----
  const matCerca = toon(0x8a5a2c);
  function cerca(x1, z1, x2, z2) {
    const n = Math.max(3, Math.round(Math.hypot(x2 - x1, z2 - z1) / 0.42));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const alt = 1.1 + rnd() * 0.5;
      const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, alt, 7), matCerca);
      poste.position.set(x1 + (x2 - x1) * t, alt / 2, z1 + (z2 - z1) * t);
      poste.rotation.z = (rnd() - 0.5) * 0.12;
      poste.castShadow = true;
      contornar(poste, 0.12);
      const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.32, 7), matCerca);
      ponta.position.y = alt / 2 + 0.16;
      contornar(ponta, 0.12);
      poste.add(ponta);
      scene.add(poste);
    }
    for (const y of [0.35, 0.8]) {
      const trilho = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(x2 - x1, z2 - z1), 0.1, 0.08), matCerca);
      trilho.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
      trilho.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
      contornar(trilho, 0.15);
      scene.add(trilho);
    }
  }
  cerca(-9.6, 1.8, -8.8, -1.6);
  cerca(8.4, 3.0, 10.9, 0.6);

  const matToco = toon(0x7a4e28);
  const matTopoToco = toon(0xffffff, { map: texturaAneis('#e6bb84', '#6e4421') });
  [[2.4, 4.6, 0.42], [-1.4, -12.5, 0.5], [7.4, 1.6, 0.38], [-9.2, 3.4, 0.5]].forEach(([x, z, r]) => {
    const toco = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, 0.5, 10), [matToco, matTopoToco, matToco]);
    toco.position.set(x, 0.25, z);
    toco.castShadow = true;
    contornar(toco, 0.08);
    scene.add(toco);
  });

  const matArbusto = toon(0x3f8f34);
  const matArbusto2 = toon(0x5fae45);
  [[-8.4, 5.6], [7.8, -0.6], [-3.4, -9.8], [9.6, -8.4], [1.9, 6.3], [-9.6, -3.6], [6.0, 3.6]].forEach(([x, z], i) => {
    const g = new THREE.Group();
    [[0, 0.35, 0, 0.5], [0.45, 0.28, 0.1, 0.38], [-0.4, 0.26, -0.05, 0.36]].forEach(([dx, dy, dz, r], k) => {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), k ? matArbusto2 : matArbusto);
      b.position.set(dx, dy, dz);
      b.castShadow = true;
      contornar(b, 0.07);
      g.add(b);
    });
    g.position.set(x, 0, z);
    g.rotation.y = i;
    scene.add(g);
  });

  // riacho no canto da frente, com margem de areia
  function faixaNoChao(pontos, largura, cor, y) {
    const esq = [];
    const dir = [];
    for (let i = 0; i < pontos.length; i++) {
      const a = pontos[Math.max(0, i - 1)];
      const b = pontos[Math.min(pontos.length - 1, i + 1)];
      const nx = -(b[1] - a[1]);
      const nz = b[0] - a[0];
      const l = Math.hypot(nx, nz) || 1;
      esq.push(new THREE.Vector2(pontos[i][0] + (nx / l) * largura, pontos[i][1] + (nz / l) * largura));
      dir.push(new THREE.Vector2(pontos[i][0] - (nx / l) * largura, pontos[i][1] - (nz / l) * largura));
    }
    const forma = new THREE.Shape([...esq, ...dir.reverse()]);
    const malha = new THREE.Mesh(new THREE.ShapeGeometry(forma), toon(cor, { side: THREE.DoubleSide }));
    malha.rotation.x = Math.PI / 2;
    malha.position.y = y;
    malha.receiveShadow = true;
    scene.add(malha);
    return malha;
  }
  const curso = [[2.6, 11], [4.4, 8.9], [6.4, 7.6], [8.4, 6.6], [10.2, 5.0], [12.2, 3.6], [15.5, 2.6]];
  faixaNoChao(curso, 1.25, 0xd8c08a, 0.015);
  faixaNoChao(curso, 0.85, 0x4fa8e0, 0.03);
  faixaNoChao(curso.map(([x, z]) => [x - 0.15, z - 0.1]), 0.25, 0xbfe6ff, 0.045);

  // ondinhas brancas descendo o riacho
  const curvaRio = new THREE.CatmullRomCurve3(curso.map(([x, z]) => new THREE.Vector3(x, 0.06, z)));
  const geoOnda = new THREE.PlaneGeometry(0.55, 0.09);
  geoOnda.rotateX(-Math.PI / 2);
  const ondas = [];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(geoOnda, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    m.userData = { t: Math.random(), lado: (Math.random() - 0.5) * 1.2, vel: 0.03 + Math.random() * 0.025, esc: 0.6 + Math.random() * 0.8 };
    m.scale.x = m.userData.esc;
    scene.add(m);
    ondas.push(m);
  }
  const tanRio = new THREE.Vector3();
  function passoRio(dt) {
    for (const m of ondas) {
      const u = m.userData;
      u.t = (u.t + dt * u.vel) % 1;
      curvaRio.getPointAt(u.t, m.position);
      curvaRio.getTangentAt(u.t, tanRio);
      m.position.x += -tanRio.z * u.lado * 0.55;
      m.position.z += tanRio.x * u.lado * 0.55;
      m.position.y = 0.055;
      m.rotation.y = -Math.atan2(tanRio.z, tanRio.x);
      m.material.opacity = Math.min(1, u.t * 6, (1 - u.t) * 6) * 0.75;
    }
  }

  // flores espalhadas
  const geoFlor = new THREE.SphereGeometry(0.07, 6, 4);
  const matsFlor = [toon(0xffffff), toon(0xffe066), toon(0xffa6c1)];
  for (let i = 0; i < 90; i++) {
    const x = -14 + rnd() * 28;
    const z = -14 + rnd() * 26;
    if (Math.hypot(x + 3.6, z - 4.4) < 5 || Math.hypot(x - 4.2, z + 5.6) < 5) continue; // fora das plataformas
    const f = new THREE.Mesh(geoFlor, matsFlor[i % 3]);
    f.position.set(x, 0.07, z);
    scene.add(f);
  }

  // mais pinheiros nas laterais, emoldurando a cena
  [[-11.5, 6.5], [-13, 1], [-12, -5], [12.5, 2], [13.5, -3.5], [11.5, -10], [-8.5, -11], [10, 10.5]].forEach(([x, z]) => arvore(x, z, 1.1 + rnd() * 0.5));

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

  // ---- materiais e geometrias dos castelos ----
  // castelos de toras: cada bloco é uma tora deitada (casca nas laterais, anéis nas pontas)
  const geoTora = new THREE.CylinderGeometry(H * 0.5, H * 0.5, S * 1.06, 12);
  geoTora.rotateZ(Math.PI / 2);
  const geoToraTorre = new THREE.CylinderGeometry(H * 0.5, H * 0.5, 0.5, 10);
  geoToraTorre.rotateZ(Math.PI / 2);
  const tora = (casca, escuro, claro) => {
    const lado = toon(0xffffff, { map: texturaCasca(casca, escuro) });
    const ponta = toon(0xffffff, { map: texturaAneis(claro, escuro) });
    return [lado, ponta, ponta];
  };
  const matsCastelo = [
    tora('#b07a45', '#6e4421', '#e6bb84'),
    tora('#a06c3a', '#5e3a1c', '#dcae74'),
    tora('#bb8650', '#7a4e28', '#efc893'),
  ];
  const matsMuralha = [
    tora('#8a5a2c', '#4a2f1a', '#c9965c'),
    tora('#7d5028', '#43291a', '#be8a52'),
  ];
  const matEstaca = toon(0x9a6234);
  const geoEstaca = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
  const geoPontaEstaca = new THREE.ConeGeometry(0.1, 0.24, 8);
  // estaca pontuda (no lugar das ameias de pedra)
  function estaca(x, z, altura = 1) {
    const g = new THREE.Group();
    const corpo = new THREE.Mesh(geoEstaca, matEstaca);
    corpo.position.y = 0.25 * altura;
    corpo.scale.y = altura;
    const ponta = new THREE.Mesh(geoPontaEstaca, matEstaca);
    ponta.position.y = 0.5 * altura + 0.12;
    contornar(corpo, 0.14);
    contornar(ponta, 0.14);
    corpo.castShadow = ponta.castShadow = true;
    g.add(corpo, ponta);
    g.position.set(x, 0, z);
    return g;
  }
  const matMadeiraEscura = toon(0x4a2f1c);
  const matMadeira = toon(0x7a5230);
  const matFerro = toon(0x3b3b3b);
  const geoPlataforma = new THREE.CylinderGeometry(4.1, 4.4, TOPO_PLATAFORMA, 48);
  const matPlataformaLado = toon(0x8a5f34);
  const matPlataformaTopo = toon(0xffffff, { map: texturaPlataforma() });

  // Uma "parte" do castelo: sabe onde fica o bloco k e quantos blocos quer para um valor.
  function parteCortina() {
    return {
      porCamada: 12, camadas: 3, geo: geoTora, mats: matsCastelo,
      pos(k) {
        const camada = Math.floor(k / 12);
        const r = k % 12;
        const lado = Math.floor(r / 3);
        const off = ((r % 3) - 1) * S;
        const y = TOPO_PLATAFORMA + camada * H + H / 2;
        const p = [[off, E], [E, -off], [-off, -E], [-E, off]][lado];
        return { x: p[0], y, z: p[1], rot: lado % 2 ? Math.PI / 2 : 0 };
      },
    };
  }
  function parteTorre(cx, cz) {
    return {
      porCamada: 8, camadas: 10, geo: geoToraTorre, mats: matsCastelo, cx, cz,
      pos(k) {
        const camada = Math.floor(k / 8);
        const a = (k % 8) * (Math.PI / 4) + (camada % 2) * (Math.PI / 8);
        return { x: cx + Math.cos(a) * R_TORRE, y: TOPO_PLATAFORMA + camada * H + H / 2, z: cz + Math.sin(a) * R_TORRE, rot: Math.PI / 2 - a };
      },
    };
  }
  const ANEL_MESTRA = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
  function parteMestra() {
    return {
      porCamada: 8, camadas: 16, extra: 1.1, geo: geoTora, mats: matsCastelo,
      pos(k) {
        const camada = Math.floor(k / 8);
        const [a, b] = ANEL_MESTRA[k % 8];
        // camadas alternam a direção das toras, como numa cabana de troncos
        return { x: a * S, y: TOPO_PLATAFORMA + camada * H + H / 2, z: b * S, rot: (camada % 2) * Math.PI / 2 };
      },
    };
  }
  function parteMuralha() {
    return {
      porCamada: LARG_MURALHA, muralha: true, geo: geoTora, mats: matsMuralha,
      pos(k) {
        const camada = Math.floor(k / LARG_MURALHA);
        const col = k % LARG_MURALHA;
        return { x: (col - (LARG_MURALHA - 1) / 2) * S, y: TOPO_PLATAFORMA + camada * H + H / 2, z: DIST_MURALHA, rot: 0 };
      },
    };
  }
  function alvoDaParte(parte, valores) {
    if (parte.muralha) return Math.round((Math.min(Math.max(valores.muralha, 0), 150) * LARG_MURALHA) / PONTOS_POR_CAMADA_MURALHA);
    const f = Math.min(Math.max(valores.castelo, 0), META * (parte.extra || 1)) / META;
    return Math.round(parte.porCamada * parte.camadas * f);
  }

  // flamulinhas triangulares dos telhados
  const geoHasteFlamula = new THREE.CylinderGeometry(0.018, 0.018, 0.56, 5);
  const geoFlamula = new THREE.BufferGeometry();
  geoFlamula.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.1, 0, 0, -0.1, 0, 0.46, 0, 0], 3));
  geoFlamula.computeVertexNormals();
  const matFlamula = COR_JOGADOR.map((c) => toon(c, { side: THREE.DoubleSide }));
  const flamulas = [];

  // ---- monta os dois jogadores ----
  const tmp = new THREE.Vector3();
  const jogadores = POS_JOGADOR.map((pos, i) => {
    const outro = POS_JOGADOR[1 - i];
    const grupo = new THREE.Group();
    grupo.position.copy(pos);
    grupo.rotation.y = Math.atan2(outro.x - pos.x, outro.z - pos.z); // +z local aponta para o inimigo
    scene.add(grupo);

    const plataforma = new THREE.Mesh(geoPlataforma, [matPlataformaLado, matPlataformaTopo, matPlataformaLado]);
    plataforma.position.set(0, TOPO_PLATAFORMA / 2, 0.75);
    plataforma.receiveShadow = true;
    contornar(plataforma, 0.012);
    grupo.add(plataforma);

    const cortina = parteCortina();
    const torres = [[E, E], [E, -E], [-E, -E], [-E, E]].map(([x, z]) => parteTorre(x, z));
    const mestra = parteMestra();
    const muralha = parteMuralha();
    const partes = [cortina, ...torres, mestra, muralha];
    partes.forEach((p) => { p.lista = []; p.pendentes = 0; p.topo = TOPO_PLATAFORMA; });

    // estacas no alto da cortina
    cortina.tampa = new THREE.Group();
    for (const off of [-0.5, 0, 0.5]) {
      for (const [x, z] of [[off, E], [E, -off], [-off, -E], [-E, off]]) cortina.tampa.add(estaca(x, z, 0.8));
    }
    grupo.add(cortina.tampa);

    // telhados cônicos das torres
    const matTelha = toon(0xffffff, { map: texturaTelha(COR_JOGADOR[i], COR_JOGADOR_ESCURA[i]) });
    const matBeiral = toon(COR_JOGADOR_ESCURA[i]);
    torres.forEach((t) => {
      t.tampa = new THREE.Group();
      t.tampa.position.set(t.cx, 0, t.cz);
      const beiral = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.7, 0.14, 12), matBeiral);
      beiral.position.y = 0.07;
      beiral.castShadow = true;
      contornar(beiral, 0.06);
      t.tampa.add(beiral);
      const telhado = new THREE.Mesh(new THREE.ConeGeometry(0.84, 1.45, 16, 3), matTelha);
      telhado.position.y = 0.14 + 0.675;
      telhado.castShadow = true;
      contornar(telhado, 0.06);
      t.tampa.add(telhado);
      const ponta = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), toon(0xffd43b));
      ponta.position.y = 0.14 + 1.38;
      t.tampa.add(ponta);
      // flamulinha tremulando no alto do telhado
      const haste = new THREE.Mesh(geoHasteFlamula, matMadeiraEscura);
      haste.position.y = 0.14 + 1.38 + 0.28;
      t.tampa.add(haste);
      const suporte = new THREE.Group();
      suporte.position.y = 0.14 + 1.38 + 0.45;
      suporte.add(new THREE.Mesh(geoFlamula, matFlamula[i]));
      suporte.userData = { base: -grupo.rotation.y, fase: Math.random() * 6 };
      t.tampa.add(suporte);
      flamulas.push(suporte);
      grupo.add(t.tampa);
    });

    // topo da torre de menagem: ameias, bandeira e estandartes
    mestra.tampa = new THREE.Group();
    ANEL_MESTRA.forEach(([a, b]) => mestra.tampa.add(estaca(a * S, b * S, 0.9)));
    const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.7, 6), matMadeiraEscura);
    mastro.position.y = 0.85;
    mastro.castShadow = true;
    mestra.tampa.add(mastro);
    const geoPano = new THREE.PlaneGeometry(1.0, 0.62, 10, 4);
    const pano = new THREE.Mesh(geoPano, toon(0xffffff, { map: texturaEmblema(COR_JOGADOR[i], i === 0 ? 'pinheiro' : 'torre'), side: THREE.DoubleSide }));
    const suportePano = new THREE.Group();
    suportePano.position.y = 1.36;
    suportePano.rotation.y = -grupo.rotation.y + Math.PI * 0.06; // de lado para a câmera
    pano.position.x = 0.52;
    pano.castShadow = true;
    suportePano.add(pano);
    mestra.tampa.add(suportePano);
    grupo.add(mestra.tampa);

    // estandarte pendurado na face da torre de menagem que a câmera vê
    const ladoCamera = i === 0 ? -1 : 1;
    const estandarte = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.1), toon(0xffffff, { map: texturaEmblema(COR_JOGADOR[i], i === 0 ? 'pinheiro' : 'torre', 70, 128), side: THREE.DoubleSide }));
    estandarte.position.set(0, 0, ladoCamera * (1.5 * S + 0.03));
    if (ladoCamera < 0) estandarte.rotation.y = Math.PI;
    grupo.add(estandarte);

    // portão de madeira na cortina, do lado que a câmera vê
    const portao = new THREE.Group();
    const folha = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.08), matMadeira);
    folha.position.y = 0.425;
    contornar(folha, 0.06);
    portao.add(folha);
    // meio cilindro deitado: vira o arco de cima do portão
    const arco = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.08, 12, 1, false, Math.PI / 2, Math.PI), matMadeira);
    arco.rotation.x = Math.PI / 2;
    arco.position.y = 0.85;
    portao.add(arco);
    [-0.14, 0.14].forEach((x) => {
      const faixa = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.1), matFerro);
      faixa.position.set(x, 0.45, 0);
      portao.add(faixa);
    });
    portao.position.set(0, TOPO_PLATAFORMA, ladoCamera * (E + S / 2 + 0.03));
    grupo.add(portao);

    // paliçada de estacas pontudas no alto da muralha de defesa
    muralha.tampa = new THREE.Group();
    for (let k = 0; k <= (LARG_MURALHA - 1) * 2; k++) {
      muralha.tampa.add(estaca((k / 2 - (LARG_MURALHA - 1) / 2) * S, DIST_MURALHA, 0.7 + (k % 2) * 0.25));
    }
    grupo.add(muralha.tampa);

    // linha tracejada da meta (100) em volta da torre de menagem
    const lado = 3 * S + 0.4;
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([x, z]) => new THREE.Vector3((x * lado) / 2, 0, (z * lado) / 2));
    const meta = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xffd43b, dashSize: 0.18, gapSize: 0.12 }));
    meta.computeLineDistances();
    meta.position.y = TOPO_PLATAFORMA + mestra.camadas * H;
    grupo.add(meta);

    return {
      grupo, partes, cortina, torres, mestra, muralha, estandarte, portao, pano, geoPano,
      vCastelo: 0, vMuralha: 0,
    };
  });
  const posPanoOriginal = jogadores[0].geoPano.attributes.position.array.slice();

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
    const m = new THREE.Mesh(parte.geo, parte.mats[(k * 7 + Math.floor(k / 3)) % parte.mats.length]);
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
  const matRocha = toon(0x8a8378);
  const matOrbe = new THREE.MeshBasicMaterial({ color: 0x6fc3ff });
  function lancarProjetil(de, para, magia, aoChegar, opcoes = {}) {
    const atacante = jogadores[de];
    const inicio = opcoes.inicio || atacante.grupo.localToWorld(new THREE.Vector3(0, atacante.mestra.topo + 0.6, 0));
    const alvoP = jogadores[para];
    const fim = alvoP.vMuralha > 0 && !opcoes.direto
      ? alvoP.grupo.localToWorld(new THREE.Vector3(0, alvoP.muralha.topo, DIST_MURALHA))
      : alvoP.grupo.localToWorld(new THREE.Vector3(0, Math.max(alvoP.mestra.topo - 0.4, 0.8), 0));
    const m = opcoes.tora
      ? new THREE.Mesh(geoTora, matsCastelo[0])
      : new THREE.Mesh(magia ? new THREE.IcosahedronGeometry(0.36, 1) : geoRocha, magia ? matOrbe : matRocha);
    if (opcoes.tora) m.scale.setScalar(1.8);
    else if (!magia) contornar(m, 0.1);
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
  function espada() {
    const g = new THREE.Group();
    const lamina = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.03), toon(0xdde3e8));
    contornar(lamina, 0.12);
    const guarda = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), toon(0xffd43b));
    guarda.position.y = -0.3;
    contornar(guarda, 0.15);
    g.add(lamina, guarda);
    return g;
  }
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
    poeira(obj.position.clone().add(new THREE.Vector3(0, 0.4, 0)), 8, cor);
    scene.remove(obj);
  }
  // Anda de A até B pulando, virado para o destino.
  function andar(obj, de, para, seg, { pulo = 0.12, passos = 6, agachado = false } = {}) {
    obj.position.copy(de);
    olharPara(obj, para);
    const base = obj.scale.x;
    return durante(seg, (k) => {
      obj.position.lerpVectors(de, para, k);
      obj.position.y = de.y + Math.abs(Math.sin(k * Math.PI * passos)) * pulo;
      if (agachado) obj.scale.set(base * 1.08, base * 0.82, base * 1.08);
    });
  }
  // Mexe o braço (martelar, golpear, conjurar).
  function balancarBraco(obj, seg, vezes, amplitude = 1.6) {
    const braco = obj.userData.braco;
    if (!braco) return durante(seg, () => {});
    return durante(seg, (k) => { braco.rotation.x = -Math.abs(Math.sin(k * Math.PI * vezes)) * amplitude; });
  }
  function nascer(obj, seg = 0.35) {
    const final = obj.scale.x;
    obj.scale.setScalar(0.01);
    return durante(seg, (k) => obj.scale.setScalar(final * (1 - Math.pow(1 - k, 3)) * (1 + Math.sin(k * Math.PI) * 0.15)));
  }

  // ---------------- castores dos geradores, em volta de cada castelo ----------------
  const PAPEL_DO_GERADOR = { construtores: 'construtor', soldados: 'soldado', magos: 'mago' };
  const MAX_VISIVEIS = 4;
  const CAMERA_APROX = new THREE.Vector3(1.5, 0, 18.4);
  jogadores.forEach((p) => {
    // lugares no anel em volta do castelo, do lado que a câmera vê, fora da muralha
    const dirCam = p.grupo.worldToLocal(CAMERA_APROX.clone()).setY(0).normalize();
    const lugares = [];
    for (let a = 0; a < 360; a += 11) {
      const r = a * Math.PI / 180;
      const v = new THREE.Vector3(Math.sin(r) * 3.05, TOPO_PLATAFORMA, Math.cos(r) * 3.05);
      if (Math.abs(v.x) < 2.1 && v.z > 2.2) continue; // muralha
      lugares.push({ v, d: v.clone().setY(0).normalize().dot(dirCam), a: r });
    }
    lugares.sort((x, y) => y.d - x.d);
    const escolhidos = lugares.slice(0, MAX_VISIVEIS * 3).sort((x, y) => x.a - y.a);
    p.lugares = { construtores: escolhidos.slice(0, 4), soldados: escolhidos.slice(4, 8), magos: escolhidos.slice(8, 12) };
    p.trabalhadores = { construtores: [], soldados: [], magos: [] };
    p.dirCam = dirCam;
    p.torcida = [];
  });

  // ---------------- pilhas de recurso ao lado de cada castelo ----------------
  // Toras (madeira), espadas num suporte (armas) e cristais (cristais). A quantidade de itens
  // acompanha o recurso do painel, para dar para ver de relance quem está rico.
  const RECURSO_DO_TIPO = { construtores: 'madeira', soldados: 'armas', magos: 'cristais' };
  const POR_ITEM = 3; // 1 item na pilha a cada 3 de recurso
  const MAX_ITENS = { madeira: 10, armas: 8, cristais: 9 };
  const matCristal = toon(0x6fc3ff, { emissive: 0x2a78c8, emissiveIntensity: 0.55 });
  const geoCristal = new THREE.OctahedronGeometry(0.2, 0);
  const CORES_RECURSO = { madeira: 0xc8955a, armas: 0xdde3e8, cristais: 0x8fd8ff };

  function itemDaPilha(recurso, k) {
    if (recurso === 'madeira') {
      const m = new THREE.Mesh(geoTora, matsCastelo[k % matsCastelo.length]);
      m.scale.set(1.45, 0.55, 0.55);
      m.rotation.y = Math.PI / 2; // pontas (anéis) viradas para a câmera
      // pirâmide: 4, 3, 2, 1
      let fileira = 0;
      let resto = k;
      while (resto >= 4 - fileira) { resto -= 4 - fileira; fileira++; }
      const n = 4 - fileira;
      m.position.set((resto - (n - 1) / 2) * 0.29, 0.14 + fileira * 0.24, 0);
      m.castShadow = true;
      return m;
    }
    if (recurso === 'armas') {
      const m = espada();
      m.scale.setScalar(0.55);
      m.position.set((k - 3.5) * 0.15, 0.32, 0.06);
      m.rotation.z = (k % 2 ? 1 : -1) * 0.1;
      return m;
    }
    const m = new THREE.Mesh(geoCristal, matCristal);
    const a = k * 2.4;
    const r = k === 0 ? 0 : 0.1 + Math.sqrt(k) * 0.08;
    const esc = 1.25 - k * 0.07;
    m.scale.set(esc, esc * 1.9, esc);
    m.position.set(Math.cos(a) * r, 0.14 * esc * 1.9, Math.sin(a) * r * 0.7);
    m.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 3, (Math.random() - 0.5) * 0.4);
    contornar(m, 0.1);
    return m;
  }

  function suporteDeArmas() {
    const g = new THREE.Group();
    [-0.62, 0.62].forEach((x) => {
      const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.62, 6), matMadeiraEscura);
      poste.position.set(x, 0.31, 0);
      contornar(poste, 0.12);
      g.add(poste);
    });
    const barra = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.06, 0.06), matMadeira);
    barra.position.y = 0.56;
    contornar(barra, 0.12);
    g.add(barra);
    return g;
  }

  jogadores.forEach((p) => {
    p.pilhas = {};
    for (const tipo of ['construtores', 'soldados', 'magos']) {
      const lugares = p.lugares[tipo];
      const meio = lugares.reduce((s, l) => s + l.a, 0) / lugares.length;
      const grupo = new THREE.Group();
      grupo.position.set(Math.sin(meio) * 4.35, TOPO_PLATAFORMA, Math.cos(meio) * 4.35);
      grupo.rotation.y = Math.atan2(p.dirCam.x, p.dirCam.z);
      if (tipo === 'soldados') grupo.add(suporteDeArmas());
      p.grupo.add(grupo);
      p.pilhas[tipo] = { grupo, itens: [], recurso: RECURSO_DO_TIPO[tipo] };
    }
  });

  function syncPilhas(idx, valores) {
    const p = jogadores[idx];
    for (const tipo in p.pilhas) {
      const pilha = p.pilhas[tipo];
      const v = valores[pilha.recurso];
      if (v === undefined) continue;
      const alvo = Math.min(MAX_ITENS[pilha.recurso], Math.ceil(Math.max(0, v) / POR_ITEM));
      while (pilha.itens.length < alvo) {
        const m = itemDaPilha(pilha.recurso, pilha.itens.length);
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
          poeira(pos, 2, CORES_RECURSO[pilha.recurso]);
        });
      }
    }
  }

  // Começo do turno: cada castor visível pula e joga 1 recurso na pilha da sua cor.
  function itemVoador(recurso) {
    if (recurso === 'madeira') {
      const m = new THREE.Mesh(geoTora, matsCastelo[0]);
      m.scale.set(1.1, 0.45, 0.45);
      return m;
    }
    if (recurso === 'armas') {
      const m = espada();
      m.scale.setScalar(0.5);
      return m;
    }
    const m = new THREE.Mesh(geoCristal, matCristal);
    m.scale.set(1, 1.7, 1);
    return m;
  }
  function animarProducao(idx, valores) {
    const p = jogadores[idx];
    const esperas = [];
    for (const tipo of ['construtores', 'soldados', 'magos']) {
      const pilha = p.pilhas[tipo];
      const destino = pilha.grupo.localToWorld(new THREE.Vector3(0, 0.55, 0));
      p.trabalhadores[tipo].forEach((c, n) => {
        const atraso = n * 0.14 + (tipo === 'soldados' ? 0.1 : tipo === 'magos' ? 0.2 : 0);
        const u = c.userData;
        const de = c.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.0, 0));
        esperas.push(esperar(atraso).then(() => {
          u.ocupado = true;
          if (u.braco) u.braco.rotation.x = -2.6;
          return durante(0.42, (k) => { c.position.y = TOPO_PLATAFORMA + Math.sin(k * Math.PI) * 0.32; });
        }).then(() => { u.ocupado = false; }));
        const item = itemVoador(pilha.recurso);
        item.visible = false;
        colocar(item, de, item.scale.x);
        esperas.push(esperar(atraso + 0.12).then(() => {
          item.visible = true;
          return durante(0.7, (k) => {
            item.position.lerpVectors(de, destino, k);
            item.position.y += Math.sin(k * Math.PI) * 1.1;
            item.rotation.y += 0.18;
            item.rotation.x += 0.1;
          });
        }).then(() => {
          scene.remove(item);
          poeira(destino, 3, CORES_RECURSO[pilha.recurso]);
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
      // castores da torcida nos dois lados do castelo, do lado que a câmera vê
      const base = Math.atan2(p.dirCam.x, p.dirCam.z);
      [1.75, 2.05, -1.75, -2.05].forEach((desvio, n) => {
        const a = base + desvio;
        const c = criarCastor(['construtor', 'soldado', 'mago', 'construtor'][n]);
        c.scale.setScalar(0.62);
        c.position.set(Math.sin(a) * (4.7 + (n % 2) * 0.5), 0, Math.cos(a) * (4.7 + (n % 2) * 0.5) + 0.75);
        c.rotation.y = base + (desvio > 0 ? -0.5 : 0.5); // de frente para a câmera, meio virados para o castelo
        c.userData.fase = n * 0.7;
        p.grupo.add(c);
        p.torcida.push(c);
        nascer(c, 0.4);
      });
    } else if (!querTorcida && p.torcida.length) {
      p.torcida.forEach((c) => {
        poeira(c.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.4, 0)), 5);
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
      p.torcida.forEach((c) => {
        const k = Math.abs(Math.sin(tempo * 5 + c.userData.fase));
        c.position.y = k * 0.3;
        if (c.userData.braco) c.userData.braco.rotation.x = -2.4 - k * 0.5;
      });
    });
  }

  function syncTrabalhadores(idx, valores) {
    const p = jogadores[idx];
    if (valores.construtores === undefined) return;
    for (const tipo of ['construtores', 'soldados', 'magos']) {
      const lista = p.trabalhadores[tipo];
      const alvo = Math.min(MAX_VISIVEIS, Math.max(0, valores[tipo]));
      while (lista.length < alvo) {
        const lugar = p.lugares[tipo][lista.length];
        const c = criarCastor(PAPEL_DO_GERADOR[tipo]);
        c.scale.setScalar(0.72);
        c.position.copy(lugar.v);
        c.rotation.y = Math.atan2(lugar.v.x, lugar.v.z);
        c.userData.baseRot = c.rotation.y;
        c.userData.fase = Math.random() * 6;
        c.userData.tipo = tipo;
        p.grupo.add(c);
        lista.push(c);
        nascer(c, 0.45);
        const mundoPos = p.grupo.localToWorld(lugar.v.clone());
        for (let i = 0; i < 10; i++) particula(mundoPos.clone().add(new THREE.Vector3(0, 0.5, 0)), { construtores: 0x8fdc6a, soldados: 0xff8a5c, magos: 0x7cc8ff }[tipo], new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 2), 0.8, 0.25);
      }
      while (lista.length > alvo) {
        const c = lista.pop();
        const pos = c.getWorldPosition(new THREE.Vector3());
        p.grupo.remove(c);
        poeira(pos.add(new THREE.Vector3(0, 0.4, 0)), 8, 0x9a8f80);
      }
    }
  }
  // Cada tipo de castor tem seu trabalho enquanto espera:
  //   construtores martelam (e soltam lasquinhas de madeira),
  //   soldados treinam golpes de espada girando o corpo,
  //   magos flutuam de braço erguido soltando faíscas azuis.
  const posMao = new THREE.Vector3();
  function passoTrabalhadores(tempo, dt) {
    jogadores.forEach((p) => {
      for (const tipo in p.trabalhadores) {
        for (const c of p.trabalhadores[tipo]) {
          const u = c.userData;
          if (u.ocupado) continue;
          const f = u.fase;
          u.cabeca.rotation.z = Math.sin(tempo * 1.3 + f) * 0.12;
          if (tipo === 'construtores') {
            const golpe = Math.sin(tempo * 4.2 + f);
            c.position.y = TOPO_PLATAFORMA + Math.max(0, -golpe) * 0.04;
            if (u.braco) u.braco.rotation.x = -Math.max(0, golpe) * 1.5;
            // no fim do golpe, lasquinhas de madeira
            const fimGolpe = golpe < 0.05 && (u.ultimoGolpe ?? 1) >= 0.05;
            u.ultimoGolpe = golpe;
            if (fimGolpe && Math.random() < 0.55) {
              c.getWorldPosition(posMao).add(tmp.set(Math.sin(c.rotation.y + p.grupo.rotation.y) * 0.35, 0.25, Math.cos(c.rotation.y + p.grupo.rotation.y) * 0.35));
              for (let k = 0; k < 2; k++) particula(posMao.clone(), 0xc8955a, new THREE.Vector3((Math.random() - 0.5) * 1.4, 0.8 + Math.random() * 0.8, (Math.random() - 0.5) * 1.4), 0.45, 0.12);
            }
          } else if (tipo === 'soldados') {
            // série de três golpes e uma pausa, girando o corpo
            const ciclo = (tempo * 0.55 + f) % 3;
            const atacando = ciclo < 1.6;
            const k = atacando ? Math.sin((ciclo / 1.6) * Math.PI * 3) : 0;
            if (u.braco) u.braco.rotation.x = atacando ? -0.5 - Math.abs(k) * 1.4 : -0.2;
            c.rotation.y = u.baseRot + (atacando ? k * 0.35 : Math.sin(tempo * 0.8 + f) * 0.15);
            c.position.y = TOPO_PLATAFORMA + (atacando ? Math.abs(k) * 0.05 : 0);
          } else {
            const flutua = (Math.sin(tempo * 1.6 + f) + 1) * 0.09;
            c.position.y = TOPO_PLATAFORMA + 0.04 + flutua;
            if (u.braco) u.braco.rotation.x = -2.1 + Math.sin(tempo * 2.4 + f) * 0.25;
            if (Math.random() < dt * 2.2) {
              c.getWorldPosition(posMao).add(tmp.set(0, 1.05 + flutua, 0));
              particula(posMao.clone(), Math.random() < 0.5 ? 0x7cc8ff : 0xcff0ff, new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.6 + Math.random() * 0.5, (Math.random() - 0.5) * 0.5), 0.9, 0.16);
            }
          }
        }
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
    if (c.id === 'crescimento') return 'arvore';
    if (c.id === 'canalizar') return 'cristais';
    if (c.id === 'armar') return 'espadas';
    if (ops.includes('roubo')) return 'ladrao';
    if (ops.includes('maldicao')) return 'ritual';
    if (ops.includes('ataque')) return 'marcha';
    if (c.efeitos.some((e) => e.quem === 'ele')) return 'feixe';
    if (c.efeitos.some((e) => ['construtores', 'soldados', 'magos'].includes(e.campo))) return 'recruta';
    return 'obra';
  }

  // ponto de chegada de quem ataca: na frente da muralha (ou do castelo, se não houver muralha)
  function pontoDeAtaque(idx, deslocX = 0) {
    const p = jogadores[idx];
    const z = p.vMuralha > 0 ? DIST_MURALHA + 0.95 : E + 0.95;
    return mundo(idx, deslocX, TOPO_PLATAFORMA, z);
  }
  function saida(idx, deslocX = 0) { return mundo(idx, deslocX, TOPO_PLATAFORMA, 3.7); }
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
    if (!['marcha', 'golem', 'ladrao', 'sabotador', 'dragao', 'feixe', 'catapulta'].includes(tipo)) focar(() => centroCastelo(quem), { forca: 0.3, aprox: 0.07 });

    if (tipo === 'marcha') {
      const n = THREE.MathUtils.clamp(Math.ceil(valorAtaque(c) / 7), 1, 4);
      const soldados = [];
      for (let i = 0; i < n; i++) soldados.push(colocar(criarCastor('soldado'), saida(quem, (i - (n - 1) / 2) * 0.8), 0.85));
      focar(() => tmp.copy(soldados[0].position).setY(1), { forca: 0.38, aprox: 0.1 });
      await Promise.all(soldados.map((s, i) => andar(s, s.position.clone(), pontoDeAtaque(ele, (i - (n - 1) / 2) * 0.75), 2.1, { passos: 9 })));
      aoSom('metal');
      const golpes = Promise.all(soldados.map((s) => balancarBraco(s, 0.9, 3)));
      await esperar(0.25);
      focoImpacto(pontoDoAlvo(ele));
      impacto();
      esperas.push(sync(ele, pontoDoAlvo(ele)));
      await golpes;
      await Promise.all(soldados.map((s) => andar(s, s.position.clone(), saida(quem, (Math.random() - 0.5) * 2), 1.6, { passos: 8 }).then(() => sumir(s))));
    } else if (tipo === 'golem') {
      const g = colocar(criarGolem(), saida(quem), 1);
      focar(() => tmp.copy(g.position).setY(1.4), { forca: 0.4, aprox: 0.1 });
      await nascer(g, 0.5);
      await andar(g, g.position.clone(), pontoDeAtaque(ele), 2.8, { pulo: 0.08, passos: 6 });
      await durante(0.45, (k) => { g.userData.braco.rotation.x = -k * 2.4; });
      await durante(0.18, (k) => { g.userData.braco.rotation.x = -2.4 + k * 2.6; });
      tremor = 0.45;
      aoSom('impacto');
      focoImpacto(pontoDoAlvo(ele));
      impacto();
      esperas.push(sync(ele, pontoDoAlvo(ele)));
      await esperar(0.6);
      await durante(0.5, (k) => g.scale.setScalar(1 - k * 0.98));
      sumir(g, 0x9a6234);
    } else if (tipo === 'catapulta') {
      const cat = colocar(criarCatapulta(), mundo(quem, -3.0, TOPO_PLATAFORMA, 1.6), 1);
      olharPara(cat, jogadores[ele].grupo.position);
      await nascer(cat, 0.4);
      aoSom('lancar');
      await durante(0.35, (k) => { cat.userData.braco.rotation.x = -k * 1.8; });
      const inicio = cat.localToWorld(new THREE.Vector3(0, 1.8, 0.4));
      await new Promise((resolve) => lancarProjetil(quem, ele, false, (ponto) => {
        impacto();
        esperas.push(sync(ele, ponto));
        resolve();
      }, { inicio, direto: true }));
      await esperar(0.4);
      await durante(0.4, (k) => cat.scale.setScalar(1 - k * 0.98));
      sumir(cat, 0x8a5a2c);
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
      const car = colocar(criarCarroca(), mundo(quem, -4.6, TOPO_PLATAFORMA, -1.2), 1);
      await andar(car, car.position.clone(), mundo(quem, -2.4, TOPO_PLATAFORMA, 0.2), 1.4, { pulo: 0.03, passos: 10 });
      aoSom('carpintaria');
      esperas.push(sync(quem));
      await esperar(0.6);
      const inicio = mundo(quem, -1.2, 2.2, 0.4);
      await new Promise((resolve) => lancarProjetil(quem, ele, false, (ponto) => {
        impacto();
        esperas.push(sync(ele, ponto));
        resolve();
      }, { inicio, direto: true, tora: true }));
      sumir(car, 0x8a5a2c);
    } else if (tipo === 'ladrao' || tipo === 'sabotador') {
      const papel = tipo === 'ladrao' ? 'guaxinim' : 'sabotador';
      const bicho = colocar(criarCastor(papel), saida(quem), 0.85);
      focar(() => tmp.copy(bicho.position).setY(1), { forca: 0.38, aprox: 0.1 });
      await andar(bicho, bicho.position.clone(), pontoDeAtaque(ele, 0.6), tipo === 'ladrao' ? 1.8 : 2.4, { passos: tipo === 'ladrao' ? 10 : 7, agachado: tipo === 'sabotador' });
      if (tipo === 'ladrao') {
        aoSom('roubo');
        const saco = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), toon(0x8a5a2c));
        contornar(saco, 0.08);
        saco.position.set(0, 0.62, -0.3);
        bicho.add(saco);
      } else {
        aoSom('desmorona');
        poeira(bicho.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 14, 0x4a4038);
        for (let i = 0; i < 12; i++) particula(bicho.position.clone().add(new THREE.Vector3(0, 0.6, 0)), 0xffb347, new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2.5, (Math.random() - 0.5) * 3), 0.6, 0.2);
      }
      impacto();
      esperas.push(sync(ele), sync(quem));
      await esperar(0.3);
      await andar(bicho, bicho.position.clone(), saida(quem), 1.6, { passos: 10 });
      sumir(bicho);
    } else if (tipo === 'feixe') {
      const mago = colocar(criarCastor('mago'), mundo(quem, 0, TOPO_PLATAFORMA, 3.7), 0.85);
      olharPara(mago, jogadores[ele].grupo.position);
      await nascer(mago, 0.35);
      aoSom('feitico');
      const alvo = pontoDoAlvo(ele).add(new THREE.Vector3(0, 0.6, 0));
      const deFeixe = mago.position.clone().add(new THREE.Vector3(0, 1.4, 0));
      focar(alvo.clone().lerp(deFeixe, 0.35), { forca: 0.3, aprox: 0.06, seg: 2.2 });
      const braco = balancarBraco(mago, 1.2, 1, 2.2);
      let malha = null;
      await durante(1.0, () => {
        if (malha) { scene.remove(malha); malha.children.forEach((m) => m.geometry.dispose()); }
        malha = malhaRaio(deFeixe, alvo, 1.0);
        scene.add(malha);
      });
      scene.remove(malha);
      malha.children.forEach((m) => m.geometry.dispose());
      const campo = c.efeitos.find((e) => e.quem === 'ele').campo;
      const cor = { cristais: 0x8fd8ff, madeira: 0xb07a45, armas: 0xdde3e8 }[campo] || 0x8fd8ff;
      for (let i = 0; i < 22; i++) particula(alvo.clone(), cor, new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4), 1, 0.3);
      aoSom('raio');
      impacto();
      esperas.push(sync(ele), sync(quem));
      await braco;
      await durante(0.3, (k) => mago.scale.setScalar(0.85 * (1 - k)));
      sumir(mago, 0x7cc8ff);
    } else if (tipo === 'arvore') {
      const arv = colocar(criarArvore(), mundo(quem, 2.9, TOPO_PLATAFORMA, -1.0), 1);
      arv.scale.setScalar(0.01);
      impacto();
      esperas.push(sync(quem));
      await durante(1.7, (k, dt, t) => {
        arv.scale.setScalar(Math.max(0.01, suave(k)));
        if (Math.random() < 0.7) {
          const a = t * 6;
          particula(arv.position.clone().add(new THREE.Vector3(Math.cos(a) * 0.9, k * 2.4, Math.sin(a) * 0.9)), 0x8fd8ff, new THREE.Vector3(0, 0.6, 0), 0.8, 0.28);
        }
      });
      // três toras saem da árvore e voam para o castelo
      const toras = [0, 1, 2].map(() => colocar(new THREE.Mesh(geoTora, matsCastelo[0]), arv.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 1.6));
      const destino = mundo(quem, 0, 1.2, 0);
      await Promise.all(toras.map((t, i) => {
        const de = t.position.clone();
        return esperar(i * 0.15).then(() => durante(0.8, (k) => {
          t.position.lerpVectors(de, destino, k);
          t.position.y += Math.sin(k * Math.PI) * 1.8;
          t.rotation.z += 0.2;
        })).then(() => scene.remove(t));
      }));
      await esperar(0.6);
      await durante(0.6, (k) => arv.scale.setScalar(1 - k * 0.99));
      sumir(arv, 0x5fb84a);
    } else if (tipo === 'cristais' || tipo === 'espadas') {
      const centro = mundo(quem, 0, 0, 0);
      const itens = [];
      const n = tipo === 'cristais' ? 5 : 4;
      for (let i = 0; i < n; i++) {
        const m = tipo === 'cristais'
          ? new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshBasicMaterial({ color: 0x8fd8ff }))
          : espada();
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
          const r = 2.4 * (1 - k * 0.3);
          m.position.set(centro.x + Math.cos(a) * r, k * topo + 0.5, centro.z + Math.sin(a) * r);
          m.rotation.y += dt * 5;
          if (tipo === 'espadas') m.rotation.z = Math.sin(t * 5 + i) * 0.4;
        });
        if (Math.random() < 0.6) particula(itens[0].position.clone(), 0xbfe8ff, new THREE.Vector3(0, 0.3, 0), 0.6, 0.25);
      });
      const pontos = itens.map((m) => m.position.clone());
      await durante(0.45, (k) => itens.forEach((m, i) => { m.position.lerpVectors(pontos[i], new THREE.Vector3(centro.x, topo - 0.8, centro.z), k); m.scale.setScalar(1 - k * 0.8); }));
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
          f.position.set(centro.x + Math.cos(a) * 2.2, 1.5 + Math.sin(t * 3 + i) * 0.6 + jogadores[quem].mestra.topo * 0.6, centro.z + Math.sin(a) * 2.2);
          f.userData.asas.forEach((asa, j) => { asa.rotation.y = (j ? 1 : -1) * Math.sin(t * 30) * 0.8; });
          if (Math.random() < 0.4) particula(f.position.clone(), 0xcff0ff, new THREE.Vector3(0, -0.2, 0), 0.5, 0.18);
        });
      });
      fadas.forEach((f) => sumir(f, 0xcff0ff));
    } else if (tipo === 'ritual') {
      const meu = colocar(criarCirculo(0x6fd0ff), mundo(quem, 0, TOPO_PLATAFORMA + 0.02, 0.6), 1);
      const dele = colocar(criarCirculo(0x9a3a2c), mundo(ele, 0, TOPO_PLATAFORMA + 0.02, 0.6), 1);
      aoSom('feitico');
      raioNoCastelo(quem);
      await durante(0.8, (k) => { meu.rotation.y += 0.05; dele.rotation.y -= 0.05; meu.scale.setScalar(k); dele.scale.setScalar(k); });
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
      faiscas(quem, c.cor === 'magia' ? 0x7cc8ff : c.cor === 'batalha' ? 0xff8a5c : 0x8fdc6a, 24);
      if (c.cor === 'magia') {
        const circ = colocar(criarCirculo(0x6fd0ff), mundo(quem, 0, TOPO_PLATAFORMA + 0.02, 0.6), 1);
        await durante(1.4, (k) => { circ.rotation.y += 0.05; circ.userData.mat.opacity = 0.85 * (1 - k); });
        scene.remove(circ);
      } else await esperar(1.2);
    } else {
      // obra: castores construtores martelando enquanto os blocos caem
      const naMuralha = c.efeitos.every((e) => e.campo === 'muralha');
      const lugares = naMuralha ? [[-1.9, DIST_MURALHA + 0.6], [1.9, DIST_MURALHA + 0.6]] : [[-2.3, -1.6], [2.3, -1.6]];
      const ajudantes = lugares.map(([x, z]) => {
        const b = colocar(criarCastor('construtor'), mundo(quem, x * 1.25, TOPO_PLATAFORMA, z * 1.25), 0.85);
        olharPara(b, mundo(quem, 0, 0, naMuralha ? DIST_MURALHA : 0));
        return b;
      });
      ajudantes.forEach((b) => nascer(b, 0.3));
      impacto();
      const duracao = sincronizar(quem, estado.jogadores[quem]);
      sincronizados.add(quem);
      await Promise.all(ajudantes.map((b) => balancarBraco(b, Math.max(1.2, duracao - 0.3), Math.max(3, Math.round(duracao * 3)), 1.2)));
      ajudantes.forEach((b) => sumir(b));
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
  const CAMPOS_PREVIA = ['castelo', 'muralha', 'construtores', 'soldados', 'magos', 'madeira', 'armas', 'cristais'];

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
          const m = new THREE.Mesh(parte.geo, matFantasma);
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
      const chaoY = H / 2;
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
        const alvo = TOPO_PLATAFORMA + camadas * H;
        parte.topo += (alvo - parte.topo) * Math.min(1, dt * 3.5);
        if (parte.tampa) {
          parte.tampa.position.y = parte.topo;
          parte.tampa.visible = camadas > 0;
        }
      }
      p.estandarte.position.y = p.mestra.topo - 0.75;
      p.estandarte.visible = p.mestra.topo > TOPO_PLATAFORMA + 5 * H;
      p.portao.visible = p.cortina.topo > TOPO_PLATAFORMA + 1.8 * H;
      const arr = p.geoPano.attributes.position.array;
      for (let v = 0; v < arr.length; v += 3) {
        const x = posPanoOriginal[v] + 0.5;
        arr[v + 2] = Math.sin(tempo * 4 + x * 6) * 0.08 * x;
      }
      p.geoPano.attributes.position.needsUpdate = true;
    });
    nuvens.forEach((n, i) => { n.position.x += dt * (0.25 + i * 0.03); if (n.position.x > 45) n.position.x = -45; });
    passoRaios(dt);
    for (let i = atores.length - 1; i >= 0; i--) if (!atores[i](dt)) atores.splice(i, 1);
    passoTrabalhadores(tempo, dt);
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
      coloca(p.rotMeta, p.grupo.localToWorld(tmp.set(-(3 * S + 0.4) / 2, TOPO_PLATAFORMA + p.mestra.camadas * H, -(3 * S + 0.4) / 2)));
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
          p.trabalhadores[tipo].forEach((c) => p.grupo.remove(c));
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
