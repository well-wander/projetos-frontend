// O bot. Também é usado pelo botão "Dica".
// Estratégia: simula cada carta jogável numa cópia do estado, dá uma nota para o resultado
// e escolhe a melhor. Se nada for jogável (ou tudo for ruim), descarta a carta mais inalcançável.
import { CARTAS, RECURSO_DA_COR, RECURSOS, TRABALHADORES, CARTA_POR_ID } from './cartas.js';
import { aplicarEfeitos, podeJogar, META_CASTELO } from './regras.js';

function copiar(j) {
  return { ...j, mao: [...j.mao] };
}

// Nota da posição do ponto de vista de "eu". Quanto maior, melhor.
export function avaliar(eu, ele) {
  if (ele.castelo <= 0 || eu.castelo >= META_CASTELO) return 10000;
  if (eu.castelo <= 0 || ele.castelo >= META_CASTELO) return -10000;
  let nota = (eu.castelo - ele.castelo) * 3;
  nota += (eu.muralha - ele.muralha) * 1;
  for (const t of TRABALHADORES) nota += (eu[t] - ele[t]) * 12;
  for (const r of RECURSOS) nota += (eu[r] - ele[r]) * 0.5;
  // perto da meta, cada ponto de castelo vale mais
  if (eu.castelo >= 80) nota += (eu.castelo - 80) * 2;
  // perigo: castelo baixo e muralha baixa
  if (eu.castelo + eu.muralha < 25) nota -= 20;
  return nota;
}

function rendaPorTurno(j, recurso) {
  return j[TRABALHADORES[RECURSOS.indexOf(recurso)]];
}

// Penalidade por gastar um recurso que uma carta rara da mão precisa e está quase alcançando.
function penalidadeDeEconomia(eu, cartaJogada) {
  const recurso = RECURSO_DA_COR[cartaJogada.cor];
  let pior = 0;
  for (const id of eu.mao) {
    const c = CARTA_POR_ID[id];
    if (c === cartaJogada || RECURSO_DA_COR[c.cor] !== recurso || c.nivel < 3) continue;
    const falta = c.custo - eu[recurso];
    const renda = rendaPorTurno(eu, recurso);
    if (falta > 0 && falta <= renda * 3) pior = Math.max(pior, cartaJogada.custo * 1.5);
    if (falta <= 0) pior = Math.max(pior, cartaJogada.custo * 2.5); // já dá para jogar a rara: não gaste
  }
  return pior;
}

export function escolherJogada(estado, dificuldade = 'normal', rng = Math.random) {
  const vez = estado.vez;
  const eu = estado.jogadores[vez];
  const ele = estado.jogadores[1 - vez];
  const jogaveis = eu.mao.map((_, i) => i).filter((i) => podeJogar(estado, i));

  if (jogaveis.length && dificuldade === 'facil') {
    return { acao: 'jogar', idx: jogaveis[Math.floor(rng() * jogaveis.length)] };
  }

  let melhor = null;
  const base = avaliar(eu, ele);
  for (const idx of jogaveis) {
    const carta = CARTA_POR_ID[eu.mao[idx]];
    const eu2 = copiar(eu);
    const ele2 = copiar(ele);
    eu2[RECURSO_DA_COR[carta.cor]] -= carta.custo;
    aplicarEfeitos(carta, eu2, ele2);
    let nota = avaliar(eu2, ele2) - base;
    if (nota < 5000) nota -= penalidadeDeEconomia(eu, carta);
    nota += rng() * 2; // um pouco de imprevisibilidade
    if (!melhor || nota > melhor.nota) melhor = { idx, nota };
  }

  if (melhor && melhor.nota > 0) return { acao: 'jogar', idx: melhor.idx };

  // Descarta a carta mais longe de ser jogável (custo − recurso disponível), desempate pela menos útil.
  let descartar = 0;
  let piorFalta = -Infinity;
  eu.mao.forEach((id, idx) => {
    const c = CARTA_POR_ID[id];
    const falta = c.custo - eu[RECURSO_DA_COR[c.cor]] - c.nivel; // raras valem a pena guardar
    if (falta > piorFalta) {
      piorFalta = falta;
      descartar = idx;
    }
  });
  return { acao: 'descartar', idx: descartar };
}

export { CARTAS };
