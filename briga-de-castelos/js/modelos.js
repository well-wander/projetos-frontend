// Modelos 3D do KayKit (Kay Lousberg, CC0): carrega, guarda em cache e clona.
// Arquivos em modelos/ (preparados por tools/preparar_modelos.py):
//   hex/<nome>.gltf          construções, decoração e hexágonos (textura atlas única)
//   personagens/<Nome>.glb   personagens com esqueleto Rig_Medium
//   itens/<nome>.gltf        armas e objetos de mão
//   animacoes.glb            clipes de animação compartilhados por todos os personagens
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const loader = new GLTFLoader();
const cache = new Map(); // caminho -> gltf
const clipes = new Map(); // nome -> AnimationClip
const animadores = new Set();

export const caminhoHex = (nome) => `modelos/hex/${nome}.gltf`;
export const caminhoPersonagem = (nome) => `modelos/personagens/${nome}.glb`;
export const caminhoItem = (nome) => `modelos/itens/${nome}.gltf`;

function prepararMateriais(raiz) {
  raiz.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (m.map) m.map.anisotropy = 4;
      m.roughness = Math.max(m.roughness ?? 1, 0.85);
      m.metalness = 0;
    });
  });
}

/** Carrega uma lista de caminhos (e as animações). aoProgresso(feitos, total). */
export async function carregar(caminhos, aoProgresso = () => {}) {
  const pendentes = caminhos.filter((c) => !cache.has(c));
  let feitos = 0;
  const total = pendentes.length + (clipes.size ? 0 : 1);
  const uma = async (c) => {
    const g = await loader.loadAsync(c);
    prepararMateriais(g.scene);
    cache.set(c, g);
    aoProgresso(++feitos, total);
  };
  const tarefas = pendentes.map(uma);
  if (!clipes.size) {
    tarefas.push(loader.loadAsync('modelos/animacoes.glb').then((g) => {
      g.animations.forEach((a) => clipes.set(a.name, a));
      aoProgresso(++feitos, total);
    }));
  }
  await Promise.all(tarefas);
}

/** Cópia de um modelo já carregado. Personagens (com ossos) usam SkeletonUtils. */
export function clonar(caminho) {
  const g = cache.get(caminho);
  if (!g) throw new Error(`modelo não carregado: ${caminho}`);
  let temOsso = false;
  g.scene.traverse((o) => { if (o.isSkinnedMesh) temOsso = true; });
  const obj = temOsso ? SkeletonUtils.clone(g.scene) : g.scene.clone(true);
  return obj;
}
export const hex = (nome) => clonar(caminhoHex(nome));

/** Geometria e material de um modelo estático (para fatiar e instanciar).
 *  Alguns modelos KayKit vêm em mais de uma peça (ex.: torre e telhado "_top"): juntamos tudo,
 *  já com a posição de cada peça. Todas usam a mesma textura atlas, então o material é um só. */
const malhas = new Map();
export function malhaDe(caminho) {
  if (malhas.has(caminho)) return malhas.get(caminho);
  const g = cache.get(caminho);
  g.scene.updateMatrixWorld(true);
  const partes = [];
  let material = null;
  g.scene.traverse((o) => {
    if (!o.isMesh) return;
    material = material || o.material;
    const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const nome of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(nome)) geo.deleteAttribute(nome);
    partes.push(geo.index ? geo.toNonIndexed() : geo);
  });
  const resultado = { geometria: partes.length === 1 ? partes[0] : mergeGeometries(partes), material };
  malhas.set(caminho, resultado);
  return resultado;
}

/** Caixa (tamanho e base) de um modelo, em unidades do próprio modelo. */
export function caixaDe(caminho) {
  const g = cache.get(caminho);
  return new THREE.Box3().setFromObject(g.scene);
}

// ---------------------------------------------------------------- fatiar
// Corta uma geometria entre duas alturas (y), recortando os triângulos que cruzam os planos.
// Usado para empilhar "andares" do corpo de uma torre KayKit.
export function fatiar(geometria, yMin, yMax) {
  const g = geometria.index ? geometria.toNonIndexed() : geometria;
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const uv = g.attributes.uv;
  const saidaP = [];
  const saidaN = [];
  const saidaU = [];
  const vert = (i) => ({
    p: new THREE.Vector3().fromBufferAttribute(pos, i),
    n: nor ? new THREE.Vector3().fromBufferAttribute(nor, i) : new THREE.Vector3(0, 1, 0),
    u: uv ? new THREE.Vector2().fromBufferAttribute(uv, i) : new THREE.Vector2(),
  });
  const misturar = (a, b, t) => ({
    p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t).normalize(), u: a.u.clone().lerp(b.u, t),
  });
  const cortar = (poligono, dentro, cruzar) => {
    const saida = [];
    for (let i = 0; i < poligono.length; i++) {
      const a = poligono[i];
      const b = poligono[(i + 1) % poligono.length];
      const da = dentro(a);
      const db = dentro(b);
      if (da) saida.push(a);
      if (da !== db) saida.push(cruzar(a, b));
    }
    return saida;
  };
  const noPlano = (y) => (a, b) => misturar(a, b, (y - a.p.y) / (b.p.y - a.p.y));
  for (let i = 0; i < pos.count; i += 3) {
    let poli = [vert(i), vert(i + 1), vert(i + 2)];
    poli = cortar(poli, (v) => v.p.y >= yMin, noPlano(yMin));
    if (poli.length < 3) continue;
    poli = cortar(poli, (v) => v.p.y <= yMax, noPlano(yMax));
    if (poli.length < 3) continue;
    for (let k = 1; k < poli.length - 1; k++) {
      for (const v of [poli[0], poli[k], poli[k + 1]]) {
        saidaP.push(v.p.x, v.p.y - yMin, v.p.z);
        saidaN.push(v.n.x, v.n.y, v.n.z);
        saidaU.push(v.u.x, v.u.y);
      }
    }
  }
  const nova = new THREE.BufferGeometry();
  nova.setAttribute('position', new THREE.Float32BufferAttribute(saidaP, 3));
  nova.setAttribute('normal', new THREE.Float32BufferAttribute(saidaN, 3));
  nova.setAttribute('uv', new THREE.Float32BufferAttribute(saidaU, 2));
  nova.computeBoundingBox();
  nova.computeBoundingSphere();
  return nova;
}

// ---------------------------------------------------------------- animação
/** Dá a um personagem um controlador de animação: tocar('Walking_A'), uma vez ou em loop. */
export function animar(obj) {
  const mixer = new THREE.AnimationMixer(obj);
  const acoes = new Map();
  let atual = null;
  const ctl = {
    mixer,
    // loop: repete; uma vez: devolve Promise que resolve no fim (e para na última pose se segurar)
    tocar(nome, { loop = true, fade = 0.2, vel = 1, segurar = false } = {}) {
      const clipe = clipes.get(nome);
      if (!clipe) return Promise.resolve();
      let acao = acoes.get(nome);
      if (!acao) { acao = mixer.clipAction(clipe); acoes.set(nome, acao); }
      acao.reset();
      acao.timeScale = vel;
      acao.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
      acao.clampWhenFinished = segurar || !loop;
      if (atual && atual !== acao) atual.crossFadeTo(acao, fade, false);
      acao.play();
      atual = acao;
      if (loop) return Promise.resolve();
      return new Promise((resolve) => {
        const fim = (e) => { if (e.action === acao) { mixer.removeEventListener('finished', fim); resolve(); } };
        mixer.addEventListener('finished', fim);
      });
    },
    duracao(nome) { return clipes.get(nome)?.duration ?? 0; },
    parar() { animadores.delete(ctl); },
  };
  animadores.add(ctl);
  obj.userData.anim = ctl;
  return ctl;
}
/** Congela o personagem num instante de uma animação (t de 0 a 1). Para ilustrações. */
export function posar(obj, nome, t = 0.5) {
  const ctl = obj.userData.anim || animar(obj);
  const clipe = clipes.get(nome);
  if (!clipe) return;
  ctl.mixer.stopAllAction();
  ctl.mixer.clipAction(clipe).play();
  ctl.mixer.setTime(clipe.duration * t);
}
export function atualizarAnimacoes(dt) {
  animadores.forEach((a) => a.mixer.update(dt));
}
export function esquecerAnimacao(obj) {
  const a = obj.userData.anim;
  if (a) { a.mixer.stopAllAction(); animadores.delete(a); }
}

// ---------------------------------------------------------------- personagens
// Papel no jogo -> modelo do KayKit Adventurers, itens nas mãos e animação de trabalho.
export const PAPEIS = {
  construtor: { modelo: 'Barbarian', itens: [['axe_1handed', 'r']], trabalho: 'Pickaxing', parado: 'Idle_A' },
  soldado: { modelo: 'Knight', itens: [['sword_1handed', 'r'], ['shield_round_color', 'l']], trabalho: 'Melee_1H_Attack_Chop', parado: 'Melee_2H_Idle' },
  mago: { modelo: 'Mage', itens: [['staff', 'r']], trabalho: 'Ranged_Magic_Spellcasting', parado: 'Idle_B' },
  arqueiro: { modelo: 'Ranger', itens: [['bow_withString', 'l']], trabalho: 'Ranged_Bow_Draw', parado: 'Ranged_Bow_Idle' },
  ladrao: { modelo: 'Rogue_Hooded', itens: [['dagger', 'r']], trabalho: 'Sneaking', parado: 'Idle_B' },
  sabotador: { modelo: 'Rogue', itens: [['smokebomb', 'r']], trabalho: 'Sneaking', parado: 'Idle_A' },
  cavaleiro: { modelo: 'Knight', itens: [['sword_2handed', 'r']], trabalho: 'Melee_2H_Attack_Chop', parado: 'Melee_2H_Idle' },
  barbaro: { modelo: 'Barbarian', itens: [['axe_2handed', 'r']], trabalho: 'Melee_2H_Attack_Chop', parado: 'Melee_2H_Idle' },
};
export const MODELOS_PERSONAGENS = [
  ...new Set(Object.values(PAPEIS).map((p) => caminhoPersonagem(p.modelo))),
  ...new Set(Object.values(PAPEIS).flatMap((p) => p.itens.map(([i]) => caminhoItem(i)))),
];

/** Cria um personagem pronto para animar. A frente dele é +z. */
export function personagem(papel, escala = 0.5) {
  const def = PAPEIS[papel];
  const obj = clonar(caminhoPersonagem(def.modelo));
  obj.scale.setScalar(escala);
  def.itens.forEach(([item, mao]) => segurar(obj, item, mao));
  const anim = animar(obj);
  anim.tocar(def.parado);
  obj.userData.papel = papel;
  obj.userData.def = def;
  return obj;
}

/** Põe um item (espada, cajado...) na mão do personagem. mao: 'r' ou 'l'. */
export function segurar(personagem, item, mao = 'r') {
  const osso = personagem.getObjectByName(`handslot${mao === 'r' ? 'r' : 'l'}`) || personagem.getObjectByName(`handslot.${mao}`);
  const obj = clonar(caminhoItem(item));
  if (osso) osso.add(obj);
  return obj;
}
