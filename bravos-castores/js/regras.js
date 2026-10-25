// Regras puras do jogo. Nada aqui mexe no DOM, então dá para testar sozinho (ver testes.html).
import { CARTAS, RECURSO_DA_COR, RECURSOS, TRABALHADORES } from './cartas.js';

export const META_CASTELO = 100;
export const TAMANHO_MAO = 8;
export const PESO_POR_NIVEL = { 1: 6, 2: 3, 3: 1 };

// Gerador de números aleatórios com semente (mulberry32), para os testes serem repetíveis.
export function criarRng(semente = Date.now()) {
  let a = semente >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sortearCarta(rng) {
  const total = CARTAS.reduce((s, c) => s + PESO_POR_NIVEL[c.nivel], 0);
  let r = rng() * total;
  for (const c of CARTAS) {
    r -= PESO_POR_NIVEL[c.nivel];
    if (r < 0) return c.id;
  }
  return CARTAS[CARTAS.length - 1].id;
}

export function novoJogador(nome) {
  return {
    nome,
    castelo: 30,
    muralha: 10,
    construtores: 2,
    soldados: 2,
    magos: 2,
    madeira: 5,
    armas: 5,
    cristais: 5,
    mao: [],
  };
}

export function novoJogo({ nomes = ['Jogador 1', 'Jogador 2'], semente } = {}) {
  const rng = criarRng(semente);
  const estado = {
    jogadores: [novoJogador(nomes[0]), novoJogador(nomes[1])],
    vez: 0,
    turno: 1,
    vencedor: null, // índice do jogador que ganhou, ou null
    motivo: null, // 'castelo' (chegou a 100) ou 'destruiu'
    ultimaJogada: null,
    rng,
  };
  for (const j of estado.jogadores) completarMao(estado, j);
  produzir(estado.jogadores[0]);
  return estado;
}

export function completarMao(estado, jogador) {
  while (jogador.mao.length < TAMANHO_MAO) jogador.mao.push(sortearCarta(estado.rng));
}

export function produzir(jogador) {
  for (const r of RECURSOS) jogador[r] += jogador[TRABALHADORES[RECURSOS.indexOf(r)]];
}

export function cartaDaMao(estado, idx, quem = estado.vez) {
  const id = estado.jogadores[quem].mao[idx];
  return CARTAS.find((c) => c.id === id);
}

export function podeJogar(estado, idx) {
  if (estado.vencedor !== null) return false;
  const carta = cartaDaMao(estado, idx);
  if (!carta) return false;
  const jogador = estado.jogadores[estado.vez];
  return jogador[RECURSO_DA_COR[carta.cor]] >= carta.custo;
}

const limitar0 = (n) => Math.max(0, n);

// Aplica os efeitos de uma carta e devolve a lista do que aconteceu (para a UI animar).
export function aplicarEfeitos(carta, eu, ele) {
  const eventos = [];
  const mudar = (alvo, quem, campo, valor) => {
    const antes = alvo[campo];
    let depois = antes + valor;
    if (TRABALHADORES.includes(campo)) depois = Math.max(1, depois);
    else depois = limitar0(depois);
    alvo[campo] = depois;
    if (depois !== antes) eventos.push({ quem, campo, valor: depois - antes });
  };

  for (const e of carta.efeitos) {
    if (e.op === 'mod') {
      mudar(e.quem === 'eu' ? eu : ele, e.quem, e.campo, e.valor);
    } else if (e.op === 'ataque') {
      const naMuralha = Math.min(ele.muralha, e.valor);
      const noCastelo = e.valor - naMuralha;
      if (naMuralha) mudar(ele, 'ele', 'muralha', -naMuralha);
      if (noCastelo) mudar(ele, 'ele', 'castelo', -noCastelo);
    } else if (e.op === 'ataqueDireto') {
      mudar(ele, 'ele', 'castelo', -e.valor);
    } else if (e.op === 'roubo') {
      for (const r of RECURSOS) {
        const qtd = Math.min(ele[r], e.valor);
        if (qtd) {
          mudar(ele, 'ele', r, -qtd);
          mudar(eu, 'eu', r, qtd);
        }
      }
    } else if (e.op === 'maldicao') {
      for (const t of TRABALHADORES) {
        mudar(eu, 'eu', t, 1);
        mudar(ele, 'ele', t, -1);
      }
    }
  }
  return eventos;
}

export function checarVitoria(estado) {
  const eu = estado.jogadores[estado.vez];
  const ele = estado.jogadores[1 - estado.vez];
  if (ele.castelo <= 0) {
    estado.vencedor = estado.vez;
    estado.motivo = 'destruiu';
  } else if (eu.castelo >= META_CASTELO) {
    estado.vencedor = estado.vez;
    estado.motivo = 'castelo';
  } else if (eu.castelo <= 0) {
    estado.vencedor = 1 - estado.vez;
    estado.motivo = 'destruiu';
  } else if (ele.castelo >= META_CASTELO) {
    estado.vencedor = 1 - estado.vez;
    estado.motivo = 'castelo';
  }
  return estado.vencedor;
}

export function jogarCarta(estado, idx) {
  if (!podeJogar(estado, idx)) throw new Error('Carta não pode ser jogada');
  const carta = cartaDaMao(estado, idx);
  const eu = estado.jogadores[estado.vez];
  const ele = estado.jogadores[1 - estado.vez];
  eu[RECURSO_DA_COR[carta.cor]] -= carta.custo;
  const eventos = aplicarEfeitos(carta, eu, ele);
  eu.mao.splice(idx, 1);
  completarMao(estado, eu);
  estado.ultimaJogada = { quem: estado.vez, carta: carta.id, acao: 'jogou', eventos };
  checarVitoria(estado);
  if (estado.vencedor === null) passarVez(estado);
  return estado.ultimaJogada;
}

export function descartar(estado, idx) {
  if (estado.vencedor !== null) throw new Error('Jogo acabou');
  const carta = cartaDaMao(estado, idx);
  if (!carta) throw new Error('Carta inválida');
  const eu = estado.jogadores[estado.vez];
  eu.mao.splice(idx, 1);
  completarMao(estado, eu);
  estado.ultimaJogada = { quem: estado.vez, carta: carta.id, acao: 'descartou', eventos: [] };
  passarVez(estado);
  return estado.ultimaJogada;
}

export function passarVez(estado) {
  estado.vez = 1 - estado.vez;
  if (estado.vez === 0) estado.turno += 1;
  produzir(estado.jogadores[estado.vez]);
}

// Cópia do estado sem o rng (para a IA simular jogadas).
export function clonar(estado) {
  const { rng, ...resto } = estado;
  return JSON.parse(JSON.stringify(resto));
}
