// Fluxo do jogo: menu, turnos, bot, arrastar cartas, overlays.
import { CARTA_POR_ID, RECURSO_DA_COR } from './cartas.js';
import * as R from './regras.js';
import { escolherJogada } from './ia.js';
import { tocar, somAtivo, destravarAudio, musica } from './audio.js';
import {
  $, esperar, criarElementoCarta, renderizarMao, posicionarMao, montarPainel, definirValores, animarValores,
  animarProducao, atualizarCabecalho, faixaDeTurno, mostrarLog, destacarCarta, ajustarEscala, observarLayout,
} from './ui.js';

const CHAVE_OPCOES = 'bravos.opcoes';
const opcoes = Object.assign({ nome: '', dificuldade: 'normal', som: true, musica: true }, lerOpcoes());

let estado = null;
let modo = 'ia'; // 'ia' | 'hotseat'
let ocupado = false; // enquanto anima ou o bot pensa
let arena = null; // arena 3D (null se o navegador não tiver WebGL ou o Three.js não carregar)

const arenaPronta = import('./arena3d.js')
  .then((m) => { arena = m.criarArena($('#arena'), (nome) => tocar(nome)); if (!arena) semArena(); })
  .catch((e) => { console.warn('Arena 3D indisponível', e); semArena(); });

function semArena() {
  $('#arena-sem-3d').classList.remove('oculta');
  if (estado) mostrarSemArena(estado);
}
function mostrarSemArena(e) {
  const [a, b] = e.jogadores;
  $('#arena-sem-3d').innerHTML = `<div>🏰 ${a.castelo} · 🧱 ${a.muralha}</div><div class="vs">×</div><div>🏰 ${b.castelo} · 🧱 ${b.muralha}</div>`;
}

function lerOpcoes() {
  try { return JSON.parse(localStorage.getItem(CHAVE_OPCOES)) || {}; } catch (e) { return {}; }
}
function salvarOpcoes() {
  try { localStorage.setItem(CHAVE_OPCOES, JSON.stringify(opcoes)); } catch (e) { /* sem storage */ }
}

const ehBot = (i) => modo === 'ia' && i === 1;
const minhaVez = () => estado && estado.vencedor === null && !ehBot(estado.vez) && !ocupado;
// De quem é a mão mostrada: contra o bot é sempre a sua; em 2 jogadores, de quem está na vez.
const donoDaMao = () => (modo === 'ia' ? 0 : estado.vez);

// ---------------- menu e botões ----------------
function iniciarMenu() {
  $('#opt-nome').value = opcoes.nome;
  $('#opt-dificuldade').value = opcoes.dificuldade;
  $('#opt-som').checked = opcoes.som;
  $('#opt-musica').checked = opcoes.musica;
  somAtivo.valor = opcoes.som;

  $('#opt-nome').addEventListener('input', (e) => { opcoes.nome = e.target.value.trim(); salvarOpcoes(); });
  $('#opt-dificuldade').addEventListener('change', (e) => { opcoes.dificuldade = e.target.value; salvarOpcoes(); });
  $('#opt-som').addEventListener('change', (e) => { opcoes.som = e.target.checked; somAtivo.valor = opcoes.som; salvarOpcoes(); atualizarBotoesSom(); });
  $('#opt-musica').addEventListener('change', (e) => { definirMusica(e.target.checked); });

  // o navegador só deixa tocar áudio depois de um clique
  document.addEventListener('pointerdown', () => {
    destravarAudio();
    if (opcoes.musica) musica.tocar();
  }, { once: true });

  document.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => {
    tocar('clique');
    comecarJogo(b.dataset.modo);
  }));
  $('#btn-ajuda-menu').addEventListener('click', abrirAjuda);
  $('#btn-ajuda').addEventListener('click', abrirAjuda);
  $('#btn-fechar-ajuda').addEventListener('click', () => { tocar('clique'); $('#modal-ajuda').classList.add('oculta'); });
  $('#btn-menu').addEventListener('click', () => { tocar('clique'); voltarAoMenu(); });
  $('#btn-fim-menu').addEventListener('click', () => { tocar('clique'); voltarAoMenu(); });
  $('#btn-revanche').addEventListener('click', () => { tocar('clique'); comecarJogo(modo); });
  $('#btn-som').addEventListener('click', () => {
    opcoes.som = !opcoes.som; somAtivo.valor = opcoes.som; $('#opt-som').checked = opcoes.som; salvarOpcoes(); atualizarBotoesSom(); tocar('clique');
  });
  $('#btn-musica').addEventListener('click', () => { definirMusica(!opcoes.musica); tocar('clique'); });
  atualizarBotoesSom();

  $('#btn-dica').addEventListener('click', darDica);
  $('#btn-pronto').addEventListener('click', () => {
    tocar('vez');
    $('#overlay-vez').classList.add('oculta');
    renderizarTudo();
  });

  iniciarArraste();
  window.addEventListener('resize', ajustarEscala);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustarEscala);
  observarLayout();
}

function definirMusica(ligada) {
  opcoes.musica = ligada;
  $('#opt-musica').checked = ligada;
  salvarOpcoes();
  if (ligada) musica.tocar(); else musica.parar();
  atualizarBotoesSom();
}

function atualizarBotoesSom() {
  $('#btn-som').textContent = opcoes.som ? '🔊' : '🔇';
  $('#btn-musica').classList.toggle('desligado', !opcoes.musica);
}

function abrirAjuda() {
  tocar('clique');
  $('#modal-ajuda').classList.remove('oculta');
}

function voltarAoMenu() {
  estado = null;
  $('#overlay-fim').classList.add('oculta');
  $('#overlay-vez').classList.add('oculta');
  $('#tela-jogo').classList.add('oculta');
  $('#tela-menu').classList.remove('oculta');
}

// ---------------- partida ----------------
async function comecarJogo(novoModo) {
  modo = novoModo;
  const nome1 = opcoes.nome || 'Jogador 1';
  const nomes = modo === 'ia' ? [nome1, 'Castor Bot'] : [nome1, 'Jogador 2'];
  estado = R.novoJogo({ nomes });
  const meuEstado = estado;
  ocupado = true;

  $('#overlay-fim').classList.add('oculta');
  $('#tela-menu').classList.add('oculta');
  $('#tela-jogo').classList.remove('oculta');
  $('#log').classList.remove('mostra');
  estado.jogadores.forEach((j, i) => montarPainel(i, j, ehBot(i)));
  definirValores(estado);
  atualizarCabecalho(estado);
  $('#mao').innerHTML = '';
  ajustarEscala();

  await arenaPronta;
  if (arena) await Promise.race([arena.resetar(estado), esperar(3500)]);
  else mostrarSemArena(estado);
  if (estado !== meuEstado) return; // voltou ao menu ou recomeçou no meio
  if (modo === 'ia') renderizarTudo(); // mão aparece travada enquanto a faixa passa
  await faixaDeTurno(`Vez de ${estado.jogadores[estado.vez].nome}`, estado.vez);
  if (estado !== meuEstado) return;
  ocupado = false;
  if (modo === 'hotseat') {
    $('#overlay-vez-nome').textContent = `Vez de ${estado.jogadores[estado.vez].nome}`;
    $('#overlay-vez').classList.remove('oculta');
    return;
  }
  renderizarTudo();
}

function renderizarTudo() {
  if (!estado) return;
  atualizarCabecalho(estado);
  const dono = donoDaMao();
  const vezDoDono = estado.vez === dono && estado.vencedor === null;
  const maoEstado = { ...estado, vez: dono };
  renderizarMao(maoEstado, (idx) => vezDoDono && R.podeJogar(maoEstado, idx), vezDoDono && !ocupado);
  $('#mao').classList.toggle('travada', !minhaVez());
  $('#tela-jogo').classList.toggle('vez-do-bot', ehBot(estado.vez));
  $('#btn-dica').disabled = !minhaVez();
  ajustarEscala();
  if (ehBot(estado.vez) && estado.vencedor === null && !ocupado) setTimeout(jogadaDoBot, 1000);
}

// Estado logo depois do efeito da carta, antes da produção do próximo jogador.
function semProducao(e) {
  const copia = { jogadores: e.jogadores.map((j) => ({ ...j })) };
  if (e.vencedor === null) {
    const j = copia.jogadores[e.vez];
    j.madeira -= j.construtores;
    j.armas -= j.soldados;
    j.cristais -= j.magos;
  }
  return copia;
}

function ehAtaque(carta) {
  return carta.efeitos.some((e) => e.op === 'ataque' || e.op === 'ataqueDireto' || (e.op === 'mod' && e.quem === 'ele' && e.campo === 'castelo'));
}

const COR_FAISCA = { construcao: 0x8fdc6a, batalha: 0xff8a5c, magia: 0x7cc8ff };

// Como a arena 3D mostra a carta: pedra voando nos ataques, faíscas nas demais.
function efeitoVisual(carta, quem) {
  if (ehAtaque(carta)) return { atacante: quem, projetil: true, magia: carta.cor === 'magia' };
  const noInimigo = carta.efeitos.some((e) => e.quem === 'ele' || e.op === 'roubo');
  const soConstrucao = carta.efeitos.every((e) => e.op === 'mod' && e.quem === 'eu' && (e.campo === 'castelo' || e.campo === 'muralha'));
  if (soConstrucao) return {};
  return { faisca: { alvo: noInimigo ? 1 - quem : quem, cor: COR_FAISCA[carta.cor] } };
}

async function executar(acao, idx, deRetangulo = null) {
  ocupado = true;
  const meuEstado = estado;
  $('#btn-dica').disabled = true;
  $('#mao').classList.add('travada');
  const quem = estado.vez;
  const id = estado.jogadores[quem].mao[idx];
  const carta = CARTA_POR_ID[id];
  const antes = { jogadores: estado.jogadores.map((j) => ({ ...j })) };

  const jogada = acao === 'jogar' ? R.jogarCarta(estado, idx) : R.descartar(estado, idx);
  const depoisDoEfeito = semProducao(estado);

  // tira a carta da mão na hora
  const elMao = $(`#mao .carta[data-idx="${idx}"]`);
  if (elMao && !ehBot(quem)) { elMao.remove(); posicionarMao(); }

  tocar(acao === 'jogar' ? 'mostrar' : 'descartar');
  const destaque = destacarCarta(id, { de: deRetangulo, descarte: acao === 'descartar', segurar: acao === 'jogar' ? 1100 : 700 });
  mostrarLog(estado, jogada);

  if (acao === 'jogar') {
    await destaque.noCentro;
    // paga o custo
    const custo = { jogadores: antes.jogadores.map((j) => ({ ...j })) };
    custo.jogadores[quem][RECURSO_DA_COR[carta.cor]] -= carta.custo;
    animarValores(custo, { duracao: 700 });
    await destaque.saindo;
    tocar(somDaCarta(carta));
    let numeros = null;
    const aoImpacto = () => { if (!numeros) numeros = animarValores(depoisDoEfeito, { duracao: 1400 }); };
    if (arena) await arena.atualizar(depoisDoEfeito, { ...efeitoVisual(carta, quem), aoImpacto });
    else mostrarSemArena(depoisDoEfeito);
    aoImpacto();
    await numeros;
  } else {
    await destaque.fim;
  }
  await esperar(350);
  if (estado !== meuEstado) return;

  if (estado.vencedor !== null) return fimDeJogo();

  // troca de turno: faixa com o nome e produção dos geradores
  atualizarCabecalho(estado);
  if (modo === 'ia' && !ehBot(estado.vez)) renderizarTudo(); // sua mão aparece travada durante a faixa
  else if (modo === 'hotseat') $('#mao').innerHTML = '';
  $('#mao').classList.add('travada');
  tocar('vez');
  await faixaDeTurno(`Vez de ${estado.jogadores[estado.vez].nome}`, estado.vez);
  tocar('producao');
  await animarProducao(estado);
  if (estado !== meuEstado) return;
  ocupado = false;

  if (modo === 'hotseat') {
    $('#overlay-vez-nome').textContent = `Vez de ${estado.jogadores[estado.vez].nome}`;
    $('#overlay-vez').classList.remove('oculta');
    return;
  }
  renderizarTudo();
}

function somDaCarta(carta) {
  const ops = carta.efeitos.map((e) => e.op);
  if (ops.includes('maldicao')) return 'magia';
  if (ops.includes('roubo')) return 'roubo';
  if (ehAtaque(carta)) return 'nada';
  if (carta.efeitos.some((e) => e.op === 'mod' && e.quem === 'ele')) return carta.cor === 'magia' ? 'magia' : 'roubo';
  if (carta.efeitos.some((e) => ['construtores', 'soldados', 'magos'].includes(e.campo))) return 'trabalhador';
  if (carta.cor === 'magia') return 'magia';
  return 'construir';
}

function jogadaDoBot() {
  if (!estado || estado.vencedor !== null || !ehBot(estado.vez) || ocupado) return;
  const j = escolherJogada(estado, opcoes.dificuldade);
  executar(j.acao === 'jogar' ? 'jogar' : 'descartar', j.idx);
}

function darDica() {
  if (!minhaVez()) return;
  tocar('clique');
  const j = escolherJogada(estado, 'normal');
  const el = $(`#mao .carta[data-idx="${j.idx}"]`);
  if (!el) return;
  el.classList.remove('dica');
  void el.offsetWidth;
  el.classList.add('dica');
  const log = $('#log');
  log.innerHTML = `💡 Dica: ${j.acao === 'jogar' ? 'arraste para a arena' : 'arraste para baixo e descarte'} <b>${CARTA_POR_ID[estado.jogadores[estado.vez].mao[j.idx]].nome}</b>`;
  log.classList.add('mostra');
}

// ---------------- arrastar cartas ----------------
// Arrastar para cima (até a arena) joga a carta; arrastar para baixo descarta.
let arraste = null;

function zonaDoPonteiro(y) {
  const topoMao = $('.mao-area').getBoundingClientRect().top;
  if (y < topoMao - 10) return 'jogar';
  if (arraste && y > arraste.y0 + 55) return 'descartar';
  return null;
}

function iniciarArraste() {
  const mao = $('#mao');
  mao.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.carta');
    if (!el || !minhaVez() || e.button > 0) return;
    e.preventDefault();
    arraste = { el, idx: +el.dataset.idx, x0: e.clientX, y0: e.clientY, moveu: false, fantasma: null, tipo: e.pointerType };
  });
  window.addEventListener('pointermove', (e) => {
    if (!arraste) return;
    const dx = e.clientX - arraste.x0;
    const dy = e.clientY - arraste.y0;
    if (!arraste.moveu) {
      if (Math.hypot(dx, dy) < 8) return;
      arraste.moveu = true;
      const f = criarElementoCarta(arraste.el.dataset.id, -1);
      f.classList.add('carta-arrastada', arraste.el.classList.contains('jogavel') ? 'jogavel' : 'bloqueada');
      document.body.appendChild(f);
      arraste.fantasma = f;
      arraste.w = f.offsetWidth;
      arraste.h = f.offsetHeight;
      arraste.el.classList.add('sendo-arrastada');
      document.body.classList.add('arrastando');
      tocar('pegar');
    }
    const inclina = Math.max(-12, Math.min(12, (e.movementX || 0) * 0.8));
    arraste.fantasma.style.transform = `translate(${e.clientX - arraste.w / 2}px, ${e.clientY - arraste.h * 0.4}px) rotate(${inclina}deg)`;
    const zona = zonaDoPonteiro(e.clientY);
    const pode = R.podeJogar(estado, arraste.idx);
    document.body.dataset.zona = zona === 'jogar' ? (pode ? 'jogar' : 'negado') : (zona || '');
  });
  const soltar = () => {
    if (!arraste) return;
    const a = arraste;
    arraste = null;
    document.body.classList.remove('arrastando');
    const zona = document.body.dataset.zona;
    document.body.dataset.zona = '';
    if (!a.moveu) {
      // toque sem arrastar: no celular amplia a carta para ler
      if (a.tipo !== 'mouse') {
        document.querySelectorAll('#mao .carta.ampliada').forEach((c) => c !== a.el && c.classList.remove('ampliada'));
        a.el.classList.toggle('ampliada');
      }
      return;
    }
    const ret = a.fantasma.getBoundingClientRect();
    if (zona === 'jogar' || zona === 'descartar') {
      a.fantasma.remove();
      executar(zona, a.idx, ret);
      return;
    }
    if (zona === 'negado') {
      tocar('erro');
      const log = $('#log');
      log.innerHTML = 'Faltam recursos para essa carta. Arraste para baixo se quiser descartar.';
      log.classList.add('mostra');
    }
    // volta para a mão
    const destino = a.el.getBoundingClientRect();
    a.fantasma.animate(
      [{ transform: a.fantasma.style.transform }, { transform: `translate(${destino.left}px, ${destino.top}px)` }],
      { duration: 240, easing: 'ease-out', fill: 'forwards' },
    );
    setTimeout(() => { a.fantasma.remove(); a.el.classList.remove('sendo-arrastada'); }, 230);
  };
  window.addEventListener('pointerup', soltar);
  window.addEventListener('pointercancel', soltar);
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#mao')) document.querySelectorAll('#mao .carta.ampliada').forEach((c) => c.classList.remove('ampliada'));
  });
}

// ---------------- fim ----------------
function fimDeJogo() {
  const v = estado.jogadores[estado.vencedor];
  const p = estado.jogadores[1 - estado.vencedor];
  const humanoGanhou = !ehBot(estado.vencedor);
  atualizarCabecalho(estado);
  $('#fim-titulo').textContent = modo === 'ia' ? (humanoGanhou ? 'Vitória!' : 'Derrota…') : `${v.nome} venceu!`;
  $('#fim-texto').textContent = estado.motivo === 'castelo'
    ? `${v.nome} ergueu o castelo até ${R.META_CASTELO} em ${estado.turno} turnos.`
    : `${v.nome} derrubou o castelo de ${p.nome} em ${estado.turno} turnos.`;
  $('.fim-castor').textContent = modo === 'ia' && !humanoGanhou ? '😿' : '🦫';
  tocar(modo === 'ia' && !humanoGanhou ? 'derrota' : 'vitoria');
  if (arena) arena.comemorar(estado.vencedor);
  setTimeout(() => $('#overlay-fim').classList.remove('oculta'), 1600);
}

iniciarMenu();

// Para depurar no console: __bravos.estado(), __bravos.render(), __bravos.arena(), __bravos.executar(acao, idx)
window.__bravos = { estado: () => estado, render: renderizarTudo, R, arena: () => arena, executar };
