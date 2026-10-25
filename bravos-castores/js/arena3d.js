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
  const [c, g] = canvas(64);
  g.fillStyle = hex(cor);
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = hex(escura);
  for (let y = 0; y < 64; y += 10) {
    g.fillRect(0, y + 7, 64, 3);
    for (let x = (y / 10) % 2 ? 0 : 8; x < 64; x += 16) g.fillRect(x, y, 2, 8);
  }
  return texturaDe(c);
}

function texturaGrama() {
  const [c, g] = canvas(128);
  const tons = ['#7cbc4b', '#74b345'];
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
    g.fillStyle = tons[(x + y) % 2];
    g.fillRect(x * 64, y * 64, 64, 64);
  }
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    g.strokeStyle = Math.random() < 0.6 ? '#5c9a35' : '#9ad464';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (Math.random() * 4 - 2), y - 3 - Math.random() * 4);
    g.stroke();
  }
  return texturaDe(c, 70);
}

function texturaPlataforma() {
  const [c, g] = canvas(256);
  g.fillStyle = '#6aa83f';
  g.fillRect(0, 0, 256, 256);
  const grad = g.createRadialGradient(128, 128, 30, 128, 128, 128);
  grad.addColorStop(0, '#dcb57a');
  grad.addColorStop(0.8, '#cfa465');
  grad.addColorStop(0.88, '#a77a45');
  grad.addColorStop(0.93, '#6b4a2a');
  grad.addColorStop(1, '#6b4a2a');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(128, 128, 128, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 140; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 100;
    g.fillStyle = Math.random() < 0.5 ? 'rgba(120,80,40,.35)' : 'rgba(255,240,200,.35)';
    g.fillRect(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 3, 2);
  }
  return texturaDe(c);
}

function texturaCeu() {
  const [c, g] = canvas(4, 256);
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#4f9fe0');
  grad.addColorStop(0.55, '#9fd3f5');
  grad.addColorStop(1, '#dff1fb');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  return texturaDe(c);
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
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b8f3f, 1.5));
  const sol = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sol.position.set(9, 18, 9);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 60 });
  sol.shadow.bias = -0.0008;
  scene.add(sol);

  // ---- chão e cenário ----
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshLambertMaterial({ map: texturaGrama() }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  scene.add(chao);

  const rnd = rngSemente(42);
  const matFolha = new THREE.MeshLambertMaterial({ color: 0x2f7d3a, flatShading: true });
  const matFolha2 = new THREE.MeshLambertMaterial({ color: 0x3e9443, flatShading: true });
  const matTronco = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const geoCone = new THREE.ConeGeometry(1, 1, 7);
  const geoTronco = new THREE.CylinderGeometry(0.18, 0.24, 1, 6);
  function arvore(x, z, esc) {
    const g = new THREE.Group();
    const tronco = new THREE.Mesh(geoTronco, matTronco);
    tronco.scale.set(esc, esc * 0.9, esc);
    tronco.position.y = esc * 0.45;
    g.add(tronco);
    [[1.2, 1.6, 1.3], [0.95, 1.4, 2.2], [0.65, 1.1, 2.95]].forEach(([r, h, y], i) => {
      const cone = new THREE.Mesh(geoCone, i % 2 ? matFolha2 : matFolha);
      cone.scale.set(r * esc, h * esc, r * esc);
      cone.position.y = y * esc;
      cone.castShadow = true;
      g.add(cone);
    });
    g.position.set(x, 0, z);
    g.rotation.y = rnd() * Math.PI;
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
  const matMorro = new THREE.MeshLambertMaterial({ color: 0x5f9e3a, flatShading: true });
  for (let i = 0; i < 7; i++) {
    const morro = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), matMorro);
    morro.scale.set(8 + rnd() * 8, 4 + rnd() * 5, 6 + rnd() * 4);
    morro.position.set(-30 + i * 11 + rnd() * 4, 0, -40 - rnd() * 8);
    scene.add(morro);
  }
  const matPedraSolta = new THREE.MeshLambertMaterial({ color: 0x9c968b, flatShading: true });
  const geoPedraSolta = new THREE.DodecahedronGeometry(1, 0);
  [[-8.6, 1.2, 0.9], [0.6, 5.2, 0.6], [8.8, -3.6, 1.1], [-0.6, -9.5, 0.7], [7.5, -11, 0.8], [-9.4, -4.2, 1.3], [1.8, 0.4, 0.45]].forEach(([x, z, e]) => {
    const p = new THREE.Mesh(geoPedraSolta, matPedraSolta);
    p.scale.set(e * 1.2, e * 0.8, e);
    p.position.set(x, e * 0.35, z);
    p.rotation.set(rnd(), rnd() * 3, rnd());
    p.castShadow = p.receiveShadow = true;
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

  // ---- materiais e geometrias dos castelos ----
  const geoBlocoReto = new THREE.BoxGeometry(S * 0.97, H * 0.97, S * 0.97);
  const geoBlocoTorre = new THREE.BoxGeometry(0.44, H * 0.97, 0.3);
  const geoAmeia = new THREE.BoxGeometry(S * 0.8, H * 0.7, S * 0.8);
  const geoAmeiaTorre = new THREE.BoxGeometry(0.3, H * 0.6, 0.26);
  const matsCastelo = [
    texturaPedra('#d9cfb8', '#9c8f76', '#f4ecd8'),
    texturaPedra('#cfc4aa', '#958870', '#efe6cf'),
    texturaPedra('#e2d9c4', '#a69a82', '#fbf5e6'),
  ].map((map) => new THREE.MeshLambertMaterial({ map }));
  const matsMuralha = [
    texturaPedra('#c7a978', '#8a6c44', '#e8cf9f'),
    texturaPedra('#bb9d6c', '#80623c', '#dcc292'),
  ].map((map) => new THREE.MeshLambertMaterial({ map }));
  const matMadeiraEscura = new THREE.MeshLambertMaterial({ color: 0x4a2f1c });
  const matMadeira = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const matFerro = new THREE.MeshLambertMaterial({ color: 0x3b3b3b });
  const geoPlataforma = new THREE.CylinderGeometry(4.1, 4.4, TOPO_PLATAFORMA, 48);
  const matPlataformaLado = new THREE.MeshLambertMaterial({ color: 0x8a5f34 });
  const matPlataformaTopo = new THREE.MeshLambertMaterial({ map: texturaPlataforma() });

  // Uma "parte" do castelo: sabe onde fica o bloco k e quantos blocos quer para um valor.
  function parteCortina() {
    return {
      porCamada: 12, camadas: 3, geo: geoBlocoReto, mats: matsCastelo,
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
      porCamada: 8, camadas: 10, geo: geoBlocoTorre, mats: matsCastelo, cx, cz,
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
      porCamada: 8, camadas: 16, extra: 1.1, geo: geoBlocoReto, mats: matsCastelo,
      pos(k) {
        const camada = Math.floor(k / 8);
        const [a, b] = ANEL_MESTRA[k % 8];
        return { x: a * S, y: TOPO_PLATAFORMA + camada * H + H / 2, z: b * S, rot: 0 };
      },
    };
  }
  function parteMuralha() {
    return {
      porCamada: LARG_MURALHA, muralha: true, geo: geoBlocoReto, mats: matsMuralha,
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
    grupo.add(plataforma);

    const cortina = parteCortina();
    const torres = [[E, E], [E, -E], [-E, -E], [-E, E]].map(([x, z]) => parteTorre(x, z));
    const mestra = parteMestra();
    const muralha = parteMuralha();
    const partes = [cortina, ...torres, mestra, muralha];
    partes.forEach((p) => { p.lista = []; p.pendentes = 0; p.topo = TOPO_PLATAFORMA; });

    // ameias da cortina
    cortina.tampa = new THREE.Group();
    [[-0.5, E], [0.5, E], [E, -0.5], [E, 0.5], [-0.5, -E], [0.5, -E], [-E, -0.5], [-E, 0.5]].forEach(([x, z]) => {
      const m = new THREE.Mesh(geoAmeia, matsCastelo[0]);
      m.position.set(x, H * 0.35, z);
      m.castShadow = true;
      cortina.tampa.add(m);
    });
    grupo.add(cortina.tampa);

    // telhados cônicos das torres
    const matTelha = new THREE.MeshLambertMaterial({ map: texturaTelha(COR_JOGADOR[i], COR_JOGADOR_ESCURA[i]), flatShading: true });
    const matBeiral = new THREE.MeshLambertMaterial({ color: COR_JOGADOR_ESCURA[i] });
    torres.forEach((t) => {
      t.tampa = new THREE.Group();
      t.tampa.position.set(t.cx, 0, t.cz);
      const beiral = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.7, 0.14, 12), matBeiral);
      beiral.position.y = 0.07;
      beiral.castShadow = true;
      t.tampa.add(beiral);
      const telhado = new THREE.Mesh(new THREE.ConeGeometry(0.82, 1.35, 12), matTelha);
      telhado.position.y = 0.14 + 0.675;
      telhado.castShadow = true;
      t.tampa.add(telhado);
      const ponta = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffd43b }));
      ponta.position.y = 0.14 + 1.38;
      t.tampa.add(ponta);
      grupo.add(t.tampa);
    });

    // topo da torre de menagem: ameias, bandeira e estandartes
    mestra.tampa = new THREE.Group();
    ANEL_MESTRA.forEach(([a, b], k) => {
      if (k % 2) return;
      const m = new THREE.Mesh(geoAmeia, matsCastelo[0]);
      m.position.set(a * S, H * 0.35, b * S);
      m.castShadow = true;
      mestra.tampa.add(m);
    });
    const mastro = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.7, 6), matMadeiraEscura);
    mastro.position.y = 0.85;
    mastro.castShadow = true;
    mestra.tampa.add(mastro);
    const geoPano = new THREE.PlaneGeometry(1.0, 0.62, 10, 4);
    const pano = new THREE.Mesh(geoPano, new THREE.MeshLambertMaterial({ map: texturaEmblema(COR_JOGADOR[i], i === 0 ? 'pinheiro' : 'torre'), side: THREE.DoubleSide }));
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
    const estandarte = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.1), new THREE.MeshLambertMaterial({ map: texturaEmblema(COR_JOGADOR[i], i === 0 ? 'pinheiro' : 'torre', 70, 128), side: THREE.DoubleSide }));
    estandarte.position.set(0, 0, ladoCamera * (1.5 * S + 0.03));
    if (ladoCamera < 0) estandarte.rotation.y = Math.PI;
    grupo.add(estandarte);

    // portão de madeira na cortina, do lado que a câmera vê
    const portao = new THREE.Group();
    const folha = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.85, 0.08), matMadeira);
    folha.position.y = 0.425;
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

    // ameias da muralha de defesa
    muralha.tampa = new THREE.Group();
    for (let col = 0; col < LARG_MURALHA; col += 2) {
      const m = new THREE.Mesh(geoAmeia, matsMuralha[0]);
      m.position.set((col - (LARG_MURALHA - 1) / 2) * S, H * 0.35, DIST_MURALHA);
      m.castShadow = true;
      muralha.tampa.add(m);
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
  const matRocha = new THREE.MeshLambertMaterial({ color: 0x8a8378, flatShading: true });
  const matOrbe = new THREE.MeshBasicMaterial({ color: 0x6fc3ff });
  function lancarProjetil(de, para, magia, aoChegar) {
    const atacante = jogadores[de];
    const inicio = atacante.grupo.localToWorld(new THREE.Vector3(0, atacante.mestra.topo + 0.6, 0));
    const alvoP = jogadores[para];
    const fim = alvoP.vMuralha > 0
      ? alvoP.grupo.localToWorld(new THREE.Vector3(0, alvoP.muralha.topo, DIST_MURALHA))
      : alvoP.grupo.localToWorld(new THREE.Vector3(0, Math.max(alvoP.mestra.topo - 0.4, 0.8), 0));
    const m = new THREE.Mesh(magia ? new THREE.IcosahedronGeometry(0.36, 1) : geoRocha, magia ? matOrbe : matRocha);
    m.castShadow = true;
    m.position.copy(inicio);
    scene.add(m);
    projeteis.push({ m, inicio, fim, t: 0, dur: 1.25, altura: 4 + inicio.distanceTo(fim) * 0.14, magia, aoChegar });
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
  function malhaRaio(de, para) {
    const pts = [de.clone()];
    zigue(de, para, 3.2, 5, pts);
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

    // câmera
    zoomAtual += (zoomDesejado() - zoomAtual) * Math.min(1, dt * 1.2);
    camBase.lerpVectors(camPerto.pos, camLonge.pos, zoomAtual);
    alvoBase.lerpVectors(camPerto.alvo, camLonge.alvo, zoomAtual);
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
  }

  function redimensionar() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1.3 ? 52 : 40;
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
      animando.length = 0;
      demolicoes.forEach((d) => p0Remove(d));
      demolicoes.length = 0;
      destrocos.forEach((m) => scene.remove(m));
      destrocos.length = 0;
      zoomAtual = 0;
      let maior = 0;
      estado.jogadores.forEach((j, i) => { maior = Math.max(maior, sincronizar(i, j)); });
      return esperar(maior);
    },

    // Mostra o estado novo. Em ataques, uma pedra (ou orbe mágico) voa antes do dano.
    // Devolve uma Promise que termina quando toda a animação acabou.
    atualizar(estado, opcoes = {}) {
      const { atacante = null, projetil = false, magia = false, faisca = null, raio = null, aoImpacto = () => {} } = opcoes;
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
