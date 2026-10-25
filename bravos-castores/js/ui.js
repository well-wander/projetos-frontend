// Renderização: transforma o estado do jogo em HTML e anima as mudanças. Não decide regras.
import { CARTA_POR_ID, RECURSO_DA_COR, NOME, descreverCarta } from './cartas.js';
import { ICONE_PX } from './icones.js';

export const $ = (sel) => document.querySelector(sel);
export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Imagens que ainda não existem (placeholders): depois do primeiro 404 não pedimos de novo.
const semArte = new Set();
window.__semArte = (src) => semArte.add(src);
function imgOuNada(src) {
  return semArte.has(src) ? '' : `<img src="${src}" alt="" onerror="this.remove();window.__semArte('${src}')">`;
}

const NOME_RARIDADE = { 1: 'comum', 2: 'rara', 3: 'épica' };

// =====================================================================
//  CARTAS
// =====================================================================
export function criarElementoCarta(id, idx) {
  const c = CARTA_POR_ID[id];
  const el = document.createElement('div');
  el.className = `carta cor-${c.cor} raridade-${c.nivel}`;
  el.dataset.idx = idx;
  el.dataset.id = id;
  el.innerHTML = `
    <div class="carta-moldura">
      <div class="carta-interior">
        <div class="carta-arte">${imgOuNada(`img/cartas/${c.id}.png`)}<span class="emoji">${c.icone}</span></div>
        <div class="carta-faixa"><span>${c.nome}</span></div>
        <div class="carta-gema" title="${NOME_RARIDADE[c.nivel]}"></div>
        <div class="carta-texto"><span>${descreverCarta(c)}</span></div>
        <div class="carta-pe">${NOME[c.cor]}</div>
      </div>
    </div>
    <div class="custo" title="Custo: ${c.custo} de ${NOME[RECURSO_DA_COR[c.cor]]}"><span>${c.custo}</span></div>
    <div class="cadeado" title="Recursos insuficientes">🔒</div>`;
  return el;
}

export function renderizarMao(estado, podeJogarFn, minhaVez) {
  const mao = $('#mao');
  mao.innerHTML = '';
  const jogador = estado.jogadores[estado.vez];
  jogador.mao.forEach((id, idx) => {
    const el = criarElementoCarta(id, idx);
    el.classList.add(podeJogarFn(idx) ? 'jogavel' : 'bloqueada');
    if (!minhaVez) el.classList.add('espera');
    mao.appendChild(el);
  });
  posicionarMao();
}

// Leque estilo Hearthstone: cartas sobrepostas numa curva, mais baixas e inclinadas nas pontas.
export function posicionarMao() {
  const mao = $('#mao');
  if (!mao) return;
  const cartas = [...mao.querySelectorAll('.carta')];
  const n = cartas.length;
  if (!n) return;
  const largura = mao.clientWidth;
  const cw = cartas[0].offsetWidth || 160;
  const espacoMax = cw * 0.64;
  const espaco = n > 1 ? Math.min(espacoMax, (Math.min(largura * 0.56, largura - cw - 20)) / (n - 1)) : 0;
  const passoAngulo = n > 1 ? Math.min(5, 34 / (n - 1)) : 0;
  cartas.forEach((el, i) => {
    const off = i - (n - 1) / 2;
    const x = largura / 2 + off * espaco - cw / 2;
    const y = off * off * cw * 0.022;
    el.style.setProperty('--x', `${x}px`);
    el.style.setProperty('--y', `${y}px`);
    el.style.setProperty('--rot', `${off * passoAngulo}deg`);
    el.style.zIndex = 10 + i;
  });
}

// =====================================================================
//  PAINÉIS
// =====================================================================
const GRUPOS = [
  { cor: 'construcao', gerador: 'construtores', recurso: 'madeira' },
  { cor: 'batalha', gerador: 'soldados', recurso: 'armas' },
  { cor: 'magia', gerador: 'magos', recurso: 'cristais' },
];

const icone = (campo) => `<span class="ico"><img src="${ICONE_PX[campo]}" alt="" draggable="false"></span>`;

export function montarPainel(i, jogador, ehBot) {
  const painel = $(`#painel-${i}`);
  const cor = i === 0 ? 'verde' : 'vermelho';
  let html = `
    <div class="painel-cabeca">
      <div class="avatar">${imgOuNada(`img/castor-${cor}.png`)}🦫</div>
      <div class="nome">${jogador.nome}<small>${ehBot ? 'bot' : 'humano'}</small></div>
    </div>
    <div class="defesa">
      <div class="stat destaque" data-linha="castelo">${icone('castelo')}<span class="rot">Castelo</span><span class="val" data-campo="castelo">${jogador.castelo}</span></div>
      <div class="stat destaque" data-linha="muralha">${icone('muralha')}<span class="rot">Muralha</span><span class="val" data-campo="muralha">${jogador.muralha}</span></div>
    </div>`;
  for (const g of GRUPOS) {
    html += `
    <div class="grupo grupo-${g.cor}">
      <div class="stat gerador" data-linha="${g.gerador}" title="${NOME[g.gerador]} produzem ${NOME[g.recurso]} no começo de cada turno seu">
        ${icone(g.gerador)}
        <span class="rot">${NOME[g.gerador]}<small>+<b data-por-turno="${g.gerador}">${jogador[g.gerador]}</b> ${NOME[g.recurso]} por turno</small></span>
        <span class="val" data-campo="${g.gerador}">${jogador[g.gerador]}</span>
      </div>
      <div class="stat recurso" data-linha="${g.recurso}" title="${NOME[g.recurso]}: paga as cartas de ${NOME[g.cor]}">
        ${icone(g.recurso)}
        <span class="rot">${NOME[g.recurso]}</span>
        <span class="val" data-campo="${g.recurso}">${jogador[g.recurso]}</span>
      </div>
    </div>`;
  }
  painel.innerHTML = html;
  exibidos[i] = { ...extrair(jogador) };
}

const CAMPOS = ['castelo', 'muralha', 'construtores', 'madeira', 'soldados', 'armas', 'magos', 'cristais'];
const extrair = (j) => Object.fromEntries(CAMPOS.map((c) => [c, j[c]]));
const exibidos = [{}, {}]; // o que cada painel está mostrando agora (pode estar atrás do estado real)
const tweens = new Map();

function escreverValor(i, campo, v) {
  const el = $(`#painel-${i} .val[data-campo="${campo}"]`);
  if (el) el.textContent = Math.round(v);
  if (['construtores', 'soldados', 'magos'].includes(campo)) {
    const pt = $(`#painel-${i} [data-por-turno="${campo}"]`);
    if (pt) pt.textContent = Math.round(v);
  }
}

function popup(i, campo, delta) {
  const linha = $(`#painel-${i} [data-linha="${campo}"]`);
  if (!linha || !delta) return;
  const el = document.createElement('span');
  el.className = 'popup ' + (delta > 0 ? 'mais' : 'menos');
  el.textContent = (delta > 0 ? '+' : '−') + Math.abs(delta);
  linha.appendChild(el);
  linha.classList.remove('pisca-mais', 'pisca-menos');
  void linha.offsetWidth;
  linha.classList.add(delta > 0 ? 'pisca-mais' : 'pisca-menos');
  setTimeout(() => el.remove(), 1900);
}

// Conta devagar do valor mostrado até o valor novo, com "+3" / "−2" flutuando ao lado.
export function animarValores(estadoAlvo, { duracao = 1200, popups = true } = {}) {
  estadoAlvo.jogadores.forEach((j, i) => {
    for (const campo of CAMPOS) {
      const de = exibidos[i][campo];
      const para = j[campo];
      if (de === undefined || de === para) continue;
      if (popups) popup(i, campo, para - de);
      exibidos[i][campo] = para;
      const chave = `${i}.${campo}`;
      const inicio = performance.now();
      const id = Symbol('tween');
      tweens.set(chave, id);
      const quadro = (agora) => {
        if (tweens.get(chave) !== id) return;
        const t = Math.min(1, (agora - inicio) / duracao);
        const e = 1 - Math.pow(1 - t, 3);
        escreverValor(i, campo, de + (para - de) * e);
        if (t < 1) requestAnimationFrame(quadro);
      };
      requestAnimationFrame(quadro);
      setTimeout(() => { if (tweens.get(chave) === id) escreverValor(i, campo, para); }, duracao + 60);
    }
  });
  return esperar(duracao);
}

// Valores mostrados sem animação (início de partida).
export function definirValores(estado) {
  estado.jogadores.forEach((j, i) => {
    exibidos[i] = { ...extrair(j) };
    CAMPOS.forEach((c) => escreverValor(i, c, j[c]));
  });
}

// Começo do turno: os geradores brilham e os recursos contam para cima.
export async function animarProducao(estado) {
  const i = estado.vez;
  const painel = $(`#painel-${i}`);
  painel.querySelectorAll('.gerador').forEach((g) => g.classList.add('produzindo'));
  await esperar(450);
  await animarValores(estado, { duracao: 1000 });
  painel.querySelectorAll('.gerador').forEach((g) => g.classList.remove('produzindo'));
}

export function atualizarCabecalho(estado) {
  estado.jogadores.forEach((j, i) => {
    $(`#painel-${i}`).classList.toggle('ativo', estado.vez === i && estado.vencedor === null);
  });
  $('#turno').textContent = `Turno ${estado.turno}`;
  $('#vez').textContent = estado.vencedor === null ? `Vez de ${estado.jogadores[estado.vez].nome}` : 'Fim de jogo';
}

// Faixa grande "Vez de Fulano" atravessando a arena.
export function faixaDeTurno(texto, cor) {
  const f = $('#faixa-turno');
  f.querySelector('span').textContent = texto;
  f.dataset.cor = cor;
  f.classList.remove('mostra');
  void f.offsetWidth;
  f.classList.add('mostra');
  return esperar(1500);
}

export function mostrarLog(estado, jogada) {
  const log = $('#log');
  const quem = estado.jogadores[jogada.quem].nome;
  const c = CARTA_POR_ID[jogada.carta];
  log.innerHTML = jogada.acao === 'descartou'
    ? `<b>${quem}</b> descartou <b>${c.nome}</b>`
    : `<b>${quem}</b> jogou <b>${c.nome}</b>: ${descreverCarta(c)}`;
  log.classList.add('mostra');
}

// =====================================================================
//  CARTA EM DESTAQUE (jogada ou descartada)
// =====================================================================
// Mostra a carta grande no centro e depois a manda para a arena (jogada) ou para baixo (descarte).
// "de" é o retângulo de onde ela parte (a carta arrastada); sem ele, vem do lado do adversário.
export function destacarCarta(id, { de = null, descarte = false, segurar = 1100 } = {}) {
  const el = criarElementoCarta(id, -1);
  el.classList.add('carta-destaque');
  if (descarte) el.classList.add('descartada');
  document.body.appendChild(el);
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const arena = $('#arena').getBoundingClientRect();
  const cx = arena.left + arena.width / 2 - w / 2;
  const cy = arena.top + arena.height / 2 - h / 2;
  const ini = de
    ? { x: de.left + de.width / 2 - w / 2, y: de.top + de.height / 2 - h / 2, s: de.width / w }
    : { x: cx, y: -h, s: 0.7 };
  const meio = { x: cx, y: cy, s: 1.15 };
  const fimJogada = { x: cx, y: cy + h * 0.1, s: 0.25 };
  const fimDescarte = { x: cx, y: window.innerHeight + 40, s: 0.8 };
  const fim = descarte ? fimDescarte : fimJogada;
  const tr = (p, r = 0) => `translate(${p.x}px, ${p.y}px) scale(${p.s}) rotate(${r}deg)`;
  el.style.transform = tr(ini);
  const total = 500 + segurar + 550;
  el.animate(
    [
      { transform: tr(ini), opacity: 1, offset: 0 },
      { transform: tr(meio), opacity: 1, offset: 500 / total },
      { transform: tr(meio), opacity: 1, offset: (500 + segurar) / total },
      { transform: tr(fim, descarte ? 25 : 0), opacity: 0, offset: 1 },
    ],
    { duration: total, easing: 'ease-in-out', fill: 'forwards' },
  );
  const noCentro = esperar(500);
  const saindo = esperar(500 + segurar);
  const fimP = esperar(total).then(() => el.remove());
  return { noCentro, saindo, fim: fimP };
}

// =====================================================================
//  AJUSTE DE TAMANHO DOS PAINÉIS
// =====================================================================
export function ajustarPaineis() {
  const mesa = $('.mesa');
  const painel = $('#painel-0');
  if (!mesa || !painel || !painel.querySelector('.stat')) return;
  mesa.style.removeProperty('--stat-fs');
  let fs = parseFloat(getComputedStyle(painel.querySelector('.stat')).fontSize);
  for (let i = 0; i < 6 && fs > 10 && painel.scrollHeight > painel.clientHeight + 1; i++) {
    fs = Math.max(10, fs * (painel.clientHeight / painel.scrollHeight) - 0.25);
    mesa.style.setProperty('--stat-fs', fs.toFixed(2) + 'px');
  }
}

let observador = null;
export function observarLayout() {
  if (observador || !('ResizeObserver' in window)) return;
  let agendado = false;
  observador = new ResizeObserver(() => {
    if (agendado) return;
    agendado = true;
    setTimeout(() => { agendado = false; ajustarEscala(); }, 0);
    setTimeout(ajustarEscala, 250);
  });
  ['#painel-0', '#mao'].forEach((sel) => { const el = $(sel); if (el) observador.observe(el); });
}

export function ajustarEscala() {
  ajustarPaineis();
  posicionarMao();
}
