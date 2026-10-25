// Testes das regras. Abra testes.html no navegador (servido por http) e veja o resultado na página/console.
import { CARTAS, CARTA_POR_ID, RECURSO_DA_COR } from './cartas.js';
import * as R from './regras.js';
import { escolherJogada } from './ia.js';

const resultados = [];
function teste(nome, fn) {
  try {
    fn();
    resultados.push({ nome, ok: true });
  } catch (e) {
    resultados.push({ nome, ok: false, erro: e.message });
  }
}
function igual(a, b, msg = '') {
  if (a !== b) throw new Error(`${msg} esperado ${b}, veio ${a}`);
}

// Monta um estado onde o jogador da vez tem a carta pedida na posição 0 e recursos de sobra.
function cenario(idCarta, ajustes = {}) {
  const estado = R.novoJogo({ semente: 1 });
  const eu = estado.jogadores[0];
  const ele = estado.jogadores[1];
  eu.mao[0] = idCarta;
  eu.pedra = eu.armas = eu.cristais = 99;
  Object.assign(eu, ajustes.eu || {});
  Object.assign(ele, ajustes.ele || {});
  return estado;
}

teste('toda carta tem custo, nível 1-3 e pelo menos um efeito', () => {
  for (const c of CARTAS) {
    if (!(c.custo > 0)) throw new Error(c.id + ' sem custo');
    if (![1, 2, 3].includes(c.nivel)) throw new Error(c.id + ' nível inválido');
    if (!c.efeitos.length) throw new Error(c.id + ' sem efeitos');
    if (!RECURSO_DA_COR[c.cor]) throw new Error(c.id + ' cor inválida');
  }
  igual(new Set(CARTAS.map((c) => c.id)).size, CARTAS.length, 'ids repetidos:');
});

// valor de um efeito da carta, lido dos dados (assim os testes sobrevivem a mudanças de balanceamento)
const valor = (id, op, campo) => {
  const e = CARTA_POR_ID[id].efeitos.find((x) => x.op === op && (!campo || x.campo === campo));
  return e.valor;
};

teste('jogo novo: 8 cartas, castelo 30, muralha 15, produção do primeiro e bônus do segundo', () => {
  const e = R.novoJogo({ semente: 7 });
  igual(e.jogadores[0].mao.length, 8);
  igual(e.jogadores[1].mao.length, 8);
  igual(e.jogadores[0].castelo, 30);
  igual(e.jogadores[0].muralha, 15);
  igual(e.jogadores[0].pedra, 5 + e.jogadores[0].construtores, 'pedra após produzir:');
  igual(e.jogadores[1].pedra, 5 + R.BONUS_SEGUNDO, 'segundo jogador começa com bônus:');
});

teste('não dá para jogar carta sem recurso', () => {
  const e = R.novoJogo({ semente: 3 });
  e.jogadores[0].mao[0] = 'represa';
  e.jogadores[0].pedra = CARTA_POR_ID.represa.custo - 1;
  igual(R.podeJogar(e, 0), false);
  e.jogadores[0].pedra = CARTA_POR_ID.represa.custo;
  igual(R.podeJogar(e, 0), true);
});

teste('jogar carta cobra o custo e passa a vez (adversário produz)', () => {
  const custo = CARTA_POR_ID.torre_vigia.custo;
  const e = cenario('torre_vigia', { eu: { pedra: custo }, ele: { armas: 5, soldados: 2 } });
  R.jogarCarta(e, 0);
  igual(e.jogadores[0].pedra, 0, 'pedra:');
  igual(e.jogadores[0].castelo, 30 + valor('torre_vigia', 'mod', 'castelo'), 'castelo:');
  igual(e.vez, 1, 'vez:');
  igual(e.jogadores[1].armas, 7, 'adversário produziu:');
  igual(e.jogadores[0].mao.length, 8, 'mão completada:');
});

teste('ataque bate na muralha e o excedente vai no castelo', () => {
  const v = valor('brigada', 'ataque');
  const e = cenario('brigada', { ele: { muralha: 10, castelo: 30 } });
  R.jogarCarta(e, 0);
  igual(e.jogadores[1].muralha, 0, 'muralha:');
  igual(e.jogadores[1].castelo, 30 - (v - 10), 'castelo:');
});

teste('ataque menor que a muralha não toca o castelo', () => {
  const v = valor('batedores', 'ataque');
  const e = cenario('batedores', { ele: { muralha: 10, castelo: 30 } });
  R.jogarCarta(e, 0);
  igual(e.jogadores[1].muralha, 10 - v);
  igual(e.jogadores[1].castelo, 30);
});

teste('Catapulta ignora a muralha', () => {
  const e = cenario('lanca_torres', { ele: { muralha: 50, castelo: 30 } });
  R.jogarCarta(e, 0);
  igual(e.jogadores[1].muralha, 50);
  igual(e.jogadores[1].castelo, 30 - valor('lanca_torres', 'ataqueDireto'));
});

teste('vitória ao chegar a 100 de castelo', () => {
  const e = cenario('fortaleza', { eu: { castelo: 100 - valor('fortaleza', 'mod', 'castelo') } });
  R.jogarCarta(e, 0);
  igual(e.vencedor, 0);
  igual(e.motivo, 'castelo');
  igual(e.vez, 0, 'não passa a vez depois de acabar:');
});

teste('vitória ao destruir o castelo inimigo', () => {
  const e = cenario('guardiao', { ele: { muralha: 0, castelo: 10 } });
  R.jogarCarta(e, 0);
  igual(e.jogadores[1].castelo, 0);
  igual(e.vencedor, 0);
  igual(e.motivo, 'destruiu');
});

teste('Carroça: ganha quem jogou se completar 100 e derrubar ao mesmo tempo', () => {
  const e = cenario('carroca', { eu: { castelo: 95 }, ele: { castelo: 4 } });
  R.jogarCarta(e, 0);
  igual(e.vencedor, 0);
});

teste('ritual (maldição) não deixa trabalhador abaixo de 1', () => {
  const e = cenario('ritual', { eu: { construtores: 2 }, ele: { construtores: 1, soldados: 2, magos: 1 } });
  R.jogarCarta(e, 0);
  const ele = e.jogadores[1];
  igual(ele.construtores, 1);
  igual(ele.soldados, 1);
  igual(ele.magos, 1);
  igual(e.jogadores[0].construtores, 3);
});

teste('recursos nunca ficam negativos (sabotador)', () => {
  const tira = -valor('sabotador', 'mod', 'armas');
  const e = cenario('sabotador', { ele: { pedra: 2, armas: 10, cristais: 0, construtores: 2, soldados: 2, magos: 2 } });
  R.jogarCarta(e, 0);
  const ele = e.jogadores[1]; // depois da jogada ele produz +2 de cada
  igual(ele.pedra, 2);
  igual(ele.armas, 10 - tira + 2);
  igual(ele.cristais, 2);
});

teste('ladrão rouba só o que o inimigo tem', () => {
  const custo = CARTA_POR_ID.ladrao.custo;
  const e = cenario('ladrao', {
    eu: { pedra: 20, armas: 20, cristais: 20 },
    ele: { pedra: 3, armas: 9, cristais: 0, construtores: 2, soldados: 2, magos: 2 },
  });
  R.jogarCarta(e, 0);
  const eu = e.jogadores[0];
  const ele = e.jogadores[1];
  // ele produz +2 de cada depois da jogada
  igual(ele.pedra, 2); igual(eu.pedra, 23);
  igual(ele.armas, 6); igual(eu.armas, 20 - custo + 5);
  igual(ele.cristais, 2); igual(eu.cristais, 20);
});

teste('descartar é de graça e passa a vez', () => {
  const e = cenario('represa', { eu: { pedra: 0 } });
  R.descartar(e, 0);
  igual(e.jogadores[0].mao.length, 8);
  igual(e.vez, 1);
});

teste('sorteio pondera por nível (raras aparecem menos)', () => {
  const rng = R.criarRng(42);
  const cont = { 1: 0, 2: 0, 3: 0 };
  for (let i = 0; i < 3000; i++) cont[CARTA_POR_ID[R.sortearCarta(rng)].nivel]++;
  if (!(cont[1] > cont[2] && cont[2] > cont[3])) throw new Error(JSON.stringify(cont));
});

teste('IA sempre devolve uma jogada válida e partidas terminam', () => {
  for (let s = 1; s <= 20; s++) {
    const e = R.novoJogo({ semente: s });
    let voltas = 0;
    while (e.vencedor === null && voltas++ < 2000) {
      const j = escolherJogada(e, 'normal');
      if (j.acao === 'jogar') {
        if (!R.podeJogar(e, j.idx)) throw new Error('IA tentou jogar carta inválida');
        R.jogarCarta(e, j.idx);
      } else R.descartar(e, j.idx);
    }
    if (e.vencedor === null) throw new Error('partida ' + s + ' não terminou');
  }
});

// ---- saída ----
const ul = document.getElementById('resultados');
let falhas = 0;
for (const r of resultados) {
  const li = document.createElement('li');
  li.className = r.ok ? 'ok' : 'falha';
  li.textContent = (r.ok ? 'OK  ' : 'FALHA  ') + r.nome + (r.erro ? ' — ' + r.erro : '');
  ul.appendChild(li);
  if (!r.ok) falhas++;
  console[r.ok ? 'log' : 'error']((r.ok ? 'OK' : 'FALHA') + ' – ' + r.nome, r.erro || '');
}
document.getElementById('resumo').textContent =
  falhas ? `${falhas} de ${resultados.length} testes falharam` : `Todos os ${resultados.length} testes passaram`;
window.__testes = { resultados, falhas };
