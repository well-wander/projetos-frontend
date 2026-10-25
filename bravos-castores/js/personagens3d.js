// Personagens e objetos 3D do campo de batalha, no estilo cartoon do guia:
// sombreamento em faixas (toon), cores chapadas e contorno preto feito com "casca invertida".
import * as THREE from 'three';

// ---------------- materiais ----------------
let gradiente = null;
export function gradienteToon() {
  if (gradiente) return gradiente;
  const dados = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
  gradiente = new THREE.DataTexture(dados, 3, 1, THREE.RGBAFormat);
  gradiente.minFilter = gradiente.magFilter = THREE.NearestFilter;
  gradiente.needsUpdate = true;
  return gradiente;
}
const cacheMat = new Map();
export function toon(cor, extra = {}) {
  const chave = cor + JSON.stringify(Object.keys(extra));
  if (!Object.keys(extra).length && cacheMat.has(chave)) return cacheMat.get(chave);
  const m = new THREE.MeshToonMaterial({ color: cor, gradientMap: gradienteToon(), ...extra });
  if (!Object.keys(extra).length) cacheMat.set(chave, m);
  return m;
}
const matContorno = new THREE.MeshBasicMaterial({ color: 0x1b120b, side: THREE.BackSide });

// Contorno preto: cópia da malha um pouco maior, só com as faces de trás.
export function contornar(malha, espessura = 0.06) {
  const c = new THREE.Mesh(malha.geometry, matContorno);
  c.scale.setScalar(1 + espessura);
  c.raycast = () => {};
  malha.add(c);
  return malha;
}

function peca(geo, mat, x, y, z, contorno = 0.07) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  if (contorno) contornar(m, contorno);
  return m;
}

// ---------------- castor ----------------
const PELO = 0xb46a32;
const PELO_CLARO = 0xedc58e;
const RABO = 0x5e3518;
const geoEsfera = new THREE.SphereGeometry(1, 14, 10);
const geoCaixa = new THREE.BoxGeometry(1, 1, 1);
const geoCilindro = new THREE.CylinderGeometry(1, 1, 1, 12);
const geoCone = new THREE.ConeGeometry(1, 1, 12);

function esfera(cor, r, x, y, z, sx = 1, sy = 1, sz = 1, contorno = 0.08) {
  const m = peca(geoEsfera, toon(cor), x, y, z, contorno);
  m.scale.set(r * sx, r * sy, r * sz);
  return m;
}
function caixa(cor, w, h, d, x, y, z, contorno = 0.12) {
  const m = peca(geoCaixa, toon(cor), x, y, z, contorno);
  m.scale.set(w, h, d);
  return m;
}
function cilindro(cor, r, h, x, y, z, contorno = 0.1) {
  const m = peca(geoCilindro, toon(cor), x, y, z, contorno);
  m.scale.set(r, h, r);
  return m;
}
function cone(cor, r, h, x, y, z, contorno = 0.08) {
  const m = peca(geoCone, toon(cor), x, y, z, contorno);
  m.scale.set(r, h, r);
  return m;
}

const ROUPA = { construtor: 0x3f9a3a, soldado: 0xc0392b, mago: 0x2f6fc0, sabotador: 0x6e1a16 };

/** Castor de corpo inteiro. papel: construtor | soldado | mago | sabotador | guaxinim */
export function criarCastor(papel = 'construtor') {
  const g = new THREE.Group();
  const corpoCor = papel === 'guaxinim' ? 0x8c8f96 : PELO;
  const claro = papel === 'guaxinim' ? 0xd9dce0 : PELO_CLARO;
  g.add(esfera(corpoCor, 0.3, 0, 0.42, 0, 1, 1.25, 0.95));
  g.add(esfera(claro, 0.2, 0, 0.42, 0.13, 1, 1.2, 0.8, 0));
  if (papel !== 'guaxinim') {
    // túnica na cor do papel
    const roupa = cilindro(ROUPA[papel], 0.31, 0.34, 0, 0.36, 0, 0.06);
    g.add(roupa);
  }
  // cabeça
  const cabeca = new THREE.Group();
  cabeca.position.y = 0.86;
  cabeca.add(esfera(corpoCor, 0.24, 0, 0, 0));
  cabeca.add(esfera(claro, 0.12, 0, -0.04, 0.19, 1.2, 0.9, 1, 0.1));
  cabeca.add(esfera(0x1b120b, 0.045, 0, 0.0, 0.3, 1, 1, 1, 0));
  cabeca.add(esfera(0x1b120b, 0.04, -0.09, 0.07, 0.2, 1, 1.2, 1, 0));
  cabeca.add(esfera(0x1b120b, 0.04, 0.09, 0.07, 0.2, 1, 1.2, 1, 0));
  cabeca.add(esfera(corpoCor, 0.07, -0.17, 0.17, 0, 1, 1, 0.6));
  cabeca.add(esfera(corpoCor, 0.07, 0.17, 0.17, 0, 1, 1, 0.6));
  if (papel === 'guaxinim') {
    // máscara preta do guaxinim
    cabeca.add(caixa(0x1b120b, 0.36, 0.08, 0.06, 0, 0.07, 0.19, 0));
  } else {
    cabeca.add(caixa(0xffffff, 0.09, 0.08, 0.03, 0, -0.13, 0.27, 0.15));
  }
  // chapéu de cada papel
  if (papel === 'construtor') cabeca.add(esfera(0x3f9a3a, 0.2, 0, 0.12, -0.02, 1.15, 0.6, 1.15));
  if (papel === 'soldado') {
    cabeca.add(esfera(0xb8c2cc, 0.21, 0, 0.13, -0.02, 1.15, 0.7, 1.15));
    cabeca.add(caixa(0xe04a3a, 0.05, 0.16, 0.2, 0, 0.32, -0.03));
  }
  if (papel === 'mago') cabeca.add(cone(0x2f6fc0, 0.2, 0.55, 0, 0.36, -0.02));
  if (papel === 'sabotador') cabeca.add(esfera(0x6e1a16, 0.25, 0, 0.06, -0.05, 1.05, 0.95, 1.1));
  g.add(cabeca);
  // rabo
  if (papel === 'guaxinim') {
    const rabo = new THREE.Group();
    for (let i = 0; i < 4; i++) rabo.add(esfera(i % 2 ? 0x1b120b : 0x8c8f96, 0.1, 0, 0.1 + i * 0.08, -0.3 - i * 0.1, 1, 1, 1.1, 0.05));
    rabo.position.y = 0.1;
    g.add(rabo);
  } else {
    const rabo = caixa(RABO, 0.3, 0.05, 0.42, 0, 0.18, -0.36);
    rabo.rotation.x = 0.55;
    g.add(rabo);
  }
  // braço direito com o objeto de cada papel (gira para martelar, golpear, conjurar)
  const braco = new THREE.Group();
  braco.position.set(0.3, 0.58, 0.05);
  braco.add(esfera(corpoCor, 0.08, 0.04, -0.06, 0.04));
  if (papel === 'construtor') {
    braco.add(cilindro(0x7a4e28, 0.025, 0.4, 0.05, 0.1, 0.1));
    braco.add(caixa(0x9aa3ad, 0.18, 0.09, 0.09, 0.05, 0.3, 0.1));
  }
  if (papel === 'soldado') {
    braco.add(caixa(0xdde3e8, 0.04, 0.5, 0.02, 0.05, 0.24, 0.12));
    braco.add(caixa(0xffd43b, 0.14, 0.03, 0.04, 0.05, 0.0, 0.12));
    // escudo no outro braço
    const escudo = cilindro(0xc0392b, 0.18, 0.04, -0.33, 0.48, 0.12, 0.12);
    escudo.rotation.x = Math.PI / 2;
    g.add(escudo);
  }
  if (papel === 'mago') {
    braco.add(cilindro(0x7a4e28, 0.025, 0.75, 0.05, 0.2, 0.1));
    const cristal = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), new THREE.MeshBasicMaterial({ color: 0x8fd8ff }));
    cristal.position.set(0.05, 0.6, 0.1);
    braco.add(cristal);
  }
  if (papel === 'sabotador') braco.add(caixa(0x9aa3ad, 0.03, 0.08, 0.3, 0.05, 0.05, 0.2));
  g.add(braco);
  g.userData = { braco, cabeca, papel };
  return g;
}

// Colosso feito de troncos e pedras.
export function criarGolem() {
  const g = new THREE.Group();
  const madeira = 0x9a6234;
  const pedra = 0xa59e92;
  g.add(caixa(madeira, 1.1, 1.3, 0.8, 0, 1.6, 0));
  g.add(caixa(pedra, 0.7, 0.7, 0.7, 0, 2.6, 0.05));
  g.add(esfera(0xff3b2f, 0.07, -0.16, 2.7, 0.41, 1, 1, 1, 0));
  g.add(esfera(0xff3b2f, 0.07, 0.16, 2.7, 0.41, 1, 1, 1, 0));
  g.add(caixa(0xffffff, 0.2, 0.18, 0.06, 0, 2.38, 0.4));
  g.add(cilindro(madeira, 0.22, 1.1, -0.35, 0.55, 0));
  g.add(cilindro(madeira, 0.22, 1.1, 0.35, 0.55, 0));
  const braco = new THREE.Group();
  braco.position.set(0.75, 2.0, 0);
  braco.add(cilindro(madeira, 0.18, 1.1, 0, -0.5, 0));
  braco.add(caixa(pedra, 0.42, 0.42, 0.42, 0, -1.1, 0));
  g.add(braco);
  const outro = cilindro(madeira, 0.18, 1.1, -0.75, 1.5, 0);
  g.add(outro);
  g.userData = { braco, papel: 'golem' };
  return g;
}

// Dragão de galhos e folhas.
export function criarDragao() {
  const g = new THREE.Group();
  const folha = 0x3f9a3a;
  const galho = 0x7a4e28;
  for (let i = 0; i < 5; i++) {
    const s = esfera(i % 2 ? folha : 0x5fb84a, 0.42 - i * 0.05, 0, 0, -i * 0.55, 1, 0.9, 1.2);
    g.add(s);
  }
  const cabeca = cone(folha, 0.32, 0.9, 0, 0.1, 0.6);
  cabeca.rotation.x = Math.PI / 2;
  g.add(cabeca);
  g.add(esfera(0x8fd8ff, 0.07, -0.16, 0.22, 0.45, 1, 1, 1, 0));
  g.add(esfera(0x8fd8ff, 0.07, 0.16, 0.22, 0.45, 1, 1, 1, 0));
  const asas = [];
  for (const lado of [-1, 1]) {
    const asa = new THREE.Group();
    const plano = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([
      new THREE.Vector2(0, 0), new THREE.Vector2(1.6, 0.5), new THREE.Vector2(1.3, -0.3), new THREE.Vector2(0.9, -0.1), new THREE.Vector2(0.5, -0.5),
    ])), toon(0x5fb84a, { side: THREE.DoubleSide }));
    plano.rotation.x = -Math.PI / 2;
    plano.scale.x = lado;
    contornar(plano, 0.04);
    asa.add(plano);
    const osso = cilindro(galho, 0.04, 1.6, lado * 0.8, 0.02, 0.2, 0.15);
    osso.rotation.z = Math.PI / 2;
    asa.add(osso);
    asa.position.set(lado * 0.25, 0.15, -0.3);
    g.add(asa);
    asas.push({ asa, lado });
  }
  g.userData = { asas };
  return g;
}

// Fadinha brilhante.
export function criarFada() {
  const g = new THREE.Group();
  const corpo = new THREE.Mesh(geoEsfera, new THREE.MeshBasicMaterial({ color: 0xcff0ff }));
  corpo.scale.setScalar(0.12);
  g.add(corpo);
  const asas = [];
  for (const lado of [-1, 1]) {
    const asa = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10), new THREE.MeshBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    asa.position.set(lado * 0.14, 0.05, 0);
    asa.scale.set(1, 0.6, 1);
    g.add(asa);
    asas.push(asa);
  }
  g.userData = { asas };
  return g;
}

// Árvore que cresce com magia.
export function criarArvore() {
  const g = new THREE.Group();
  const tronco = cilindro(0x7a4e28, 0.16, 1.2, 0, 0.6, 0);
  g.add(tronco);
  const copa = new THREE.Group();
  copa.position.y = 1.2;
  [[0.8, 1.0, 0.3], [0.62, 0.9, 0.9], [0.42, 0.7, 1.4]].forEach(([r, h, y], i) => copa.add(cone(i % 2 ? 0x3f9a3a : 0x5fb84a, r, h, 0, y, 0)));
  g.add(copa);
  g.userData = { tronco, copa };
  return g;
}

// Catapulta de madeira (lança-torres).
export function criarCatapulta() {
  const g = new THREE.Group();
  const madeira = 0x8a5a2c;
  g.add(caixa(madeira, 1.2, 0.18, 0.8, 0, 0.35, 0));
  for (const x of [-0.45, 0.45]) for (const z of [-0.35, 0.35]) {
    const roda = cilindro(0x5e3518, 0.22, 0.1, x, 0.22, z);
    roda.rotation.x = Math.PI / 2;
    g.add(roda);
  }
  g.add(caixa(madeira, 0.12, 0.9, 0.12, 0, 0.85, -0.3));
  const braco = new THREE.Group();
  braco.position.set(0, 0.5, 0.15);
  braco.add(caixa(madeira, 0.12, 0.12, 1.5, 0, 0, 0.6));
  braco.add(caixa(0x5e3518, 0.32, 0.12, 0.32, 0, 0.08, 1.3));
  g.add(braco);
  g.userData = { braco };
  return g;
}

// Carroça cheia de toras.
export function criarCarroca() {
  const g = new THREE.Group();
  g.add(caixa(0x8a5a2c, 1.1, 0.3, 0.7, 0, 0.45, 0));
  for (const x of [-0.4, 0.4]) for (const z of [-0.38, 0.38]) {
    const roda = cilindro(0x5e3518, 0.24, 0.08, x, 0.24, z);
    roda.rotation.x = Math.PI / 2;
    g.add(roda);
  }
  for (let i = 0; i < 3; i++) {
    const tora = cilindro(0xb07a45, 0.12, 1.0, 0, 0.72 + (i === 2 ? 0.2 : 0), -0.14 + (i % 2) * 0.28 - (i === 2 ? 0.14 : 0));
    tora.rotation.z = Math.PI / 2;
    g.add(tora);
  }
  return g;
}

// Círculo mágico no chão.
export function criarCirculo(cor = 0x6fd0ff) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
  const anel = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.45, 48), mat);
  const anel2 = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.6, 6), mat);
  anel.rotation.x = anel2.rotation.x = -Math.PI / 2;
  g.add(anel, anel2);
  g.userData = { mat };
  return g;
}

export const geo = { esfera: geoEsfera, caixa: geoCaixa, cilindro: geoCilindro, cone: geoCone };
