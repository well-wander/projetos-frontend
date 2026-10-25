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
  eu.madeira = eu.armas = eu.cristais = 99;
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

teste('jogo novo: 8 cartas na mão, castelo 30, muralha 10, produção do primeiro turno', () => {
  const e = R.novoJogo({ semente: 7 });
  igual(e.jogadores[0].mao.length, 8);
  igual(e.jogadores[1].mao.length, 8);
  igual(e.jogadores[0].castelo, 30);
  igual(e.jogadores[0].muralha, 10);
  igual(e.jogadores[0].madeira, 7, 'madeira após produzir:');
  igual(e.jogadores[1].madeira, 5, 'adversário ainda não produziu:');
});

teste('não dá para jogar carta sem recurso', () => {
  const e = R.novoJogo({ semente: 3 });
  e.jogadores[0].mao[0] = 'represa';
  igual(R.podeJogar(e, 0), false);
  e.jogadores[0].madeira = 39;
  igual(R.podeJogar(e, 0), true);
});

teste('jogar carta cobra o custo e passa a vez (adversário produz)', () => {
  const e = cenario('torre_vigia', { eu: { madeira: 5 } });
  R.jogarCarta(e, 0);
  igual(e.jogadores[0].madeira, 0, 'madeira:');
  igual(e.jogadores[0].castelo, 35, 'castelo:');
  igual(e.vez, 1, 'vez:');
  igual(e.jogadores[1].armas, 7, 'adversário produziu:');
  igual(e.jogadores[0].mao.length, 8, 'mão completada:');
});

teste('ataque bate na muralha e o excedente vai no castelo', () => {
  const e = cenario('brigada', { ele: { muralha: 10, castelo: 30 } });
  R.jogarCarta(e, 0); // ataque 12
  igual(e.jogadores[1].muralha, 0, 'muralha:');
  igual(e.jogadores[1].castelo, 28, 'castelo:');
});

teste('ataque menor que a muralha não toca o castelo', () => {
  const e = cenario('batedores', { ele: { muralha: 10, castelo: 30 } });
  R.jogarCarta(e, 0); // ataque 2
  igual(e.jogadores[1].muralha, 8);
  igual(e.jogadores[1].castelo, 30);
});

teste('Lança-Torres ignora a muralha', () => {
  const e = cenario('lanca_torres', { ele: { muralha: 50, castelo: 30 } });
  R.jogarCarta(e, 0);
  igual(e.jogadores[1].muralha, 50);
  igual(e.jogadores[1].castelo, 20);
});

teste('vitória ao chegar a 100 de castelo', () => {
  const e = cenario('fortaleza', { eu: { castelo: 85 } });
  R.jogarCarta(e, 0); // +20
  igual(e.vencedor, 0);
  igual(e.motivo, 'castelo');
  igual(e.vez, 0, 'não passa a vez depois de acabar:');
});

teste('vitória ao destruir o castelo inimigo', () => {
  const e = cenario('guardiao', { ele: { muralha: 0, castelo: 10 } });
  R.jogarCarta(e, 0); // ataque 32
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
  const e = cenario('ritual', { ele: { construtores: 1, soldados: 2, magos: 1 } });
  R.jogarCarta(e, 0);
  const ele = e.jogadores[1];
  igual(ele.construtores, 1);
  igual(ele.soldados, 1);
  igual(ele.magos, 1);
  igual(e.jogadores[0].construtores, 3);
});

teste('recursos nunca ficam negativos (sabotador)', () => {
  const e = cenario('sabotador', { ele: { madeira: 2, armas: 10, cristais: 0 } });
  R.jogarCarta(e, 0);
  const ele = e.jogadores[1]; // depois da jogada ele produz +2 de cada
  igual(ele.madeira, 2);
  igual(ele.armas, 8);
  igual(ele.cristais, 2);
});

teste('guaxinim rouba só o que o inimigo tem', () => {
  const e = cenario('ladrao', { eu: { madeira: 20, armas: 20, cristais: 20 }, ele: { madeira: 3, armas: 9, cristais: 0 } });
  R.jogarCarta(e, 0);
  const eu = e.jogadores[0];
  const ele = e.jogadores[1];
  // ele produz +2 de cada depois da jogada
  igual(ele.madeira, 2); igual(eu.madeira, 23);
  igual(ele.armas, 6); igual(eu.armas, 10); // 20 − 15 de custo + 5 roubados
  igual(ele.cristais, 2); igual(eu.cristais, 20);
});

teste('descartar é de graça e passa a vez', () => {
  const e = cenario('represa', { eu: { madeira: 0 } });
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
