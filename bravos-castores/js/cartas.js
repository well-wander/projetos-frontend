// Dados das cartas do Bravos Castores.
// Nomes vêm do rascunho "Bravos_Castores_Conversao_Cartas.pdf"; os valores seguem o balanceamento
// do Mravenci/Ants. Cartas marcadas com (*) não estavam no rascunho e foram acrescentadas do original.
//
// Cada carta tem uma cor (pilar), um custo no recurso daquela cor, um nível de raridade (1 comum, 3 rara)
// e uma lista de efeitos que o motor de regras (regras.js) sabe aplicar.
//
// Efeitos possíveis:
//   { op: 'mod', quem: 'eu'|'ele', campo: <campo do jogador>, valor: n }   soma n ao campo
//   { op: 'ataque', valor: n }         dano que bate primeiro na muralha, o resto vai no castelo
//   { op: 'ataqueDireto', valor: n }   dano direto no castelo inimigo (ignora a muralha)
//   { op: 'roubo', valor: n }          tira n de cada recurso do inimigo e dá para mim
//   { op: 'maldicao' }                 meus trabalhadores +1 cada, os do inimigo -1 cada (mínimo 1)

export const COR = {
  CONSTRUCAO: 'construcao',
  BATALHA: 'batalha',
  MAGIA: 'magia',
};

export const RECURSO_DA_COR = {
  construcao: 'madeira',
  batalha: 'armas',
  magia: 'cristais',
};

export const TRABALHADOR_DO_RECURSO = {
  madeira: 'construtores',
  armas: 'soldados',
  cristais: 'magos',
};

export const RECURSOS = ['madeira', 'armas', 'cristais'];
export const TRABALHADORES = ['construtores', 'soldados', 'magos'];

export const NOME = {
  madeira: 'Madeira',
  armas: 'Armas',
  cristais: 'Cristais',
  construtores: 'Construtores',
  soldados: 'Soldados',
  magos: 'Magos',
  castelo: 'Castelo',
  muralha: 'Muralha',
  construcao: 'Construção',
  batalha: 'Batalha',
  magia: 'Magia',
};

export const ICONE = {
  madeira: '🪵',
  armas: '⚔️',
  cristais: '💎',
  construtores: '🔨',
  soldados: '🛡️',
  magos: '🪄',
  castelo: '🏰',
  muralha: '🧱',
};

const mod = (quem, campo, valor) => ({ op: 'mod', quem, campo, valor });
const ataque = (valor) => ({ op: 'ataque', valor });

export const CARTAS = [
  // ---------------- CONSTRUÇÃO (madeira) ----------------
  { id: 'primeiro_tronco', nome: 'Primeiro Tronco', cor: COR.CONSTRUCAO, custo: 1, nivel: 1, icone: '🪵',
    lore: 'Toda fortaleza começa com o tronco certo.', efeitos: [mod('eu', 'castelo', 4)] },
  { id: 'remendo', nome: 'Remendo Urgente', cor: COR.CONSTRUCAO, custo: 1, nivel: 1, icone: '🩹',
    lore: 'Nenhuma obra para, mesmo sob ataque.', efeitos: [mod('eu', 'muralha', 3)] },
  { id: 'palicada', nome: 'Paliçada Reforçada', cor: COR.CONSTRUCAO, custo: 3, nivel: 1, icone: '🧱',
    lore: 'Troncos grossos seguram o inimigo.', efeitos: [mod('eu', 'muralha', 5)] },
  { id: 'estoque', nome: 'Estoque de Toras', cor: COR.CONSTRUCAO, custo: 3, nivel: 2, icone: '📦',
    lore: 'Tira da muralha para erguer o castelo. (*)', efeitos: [mod('eu', 'castelo', 9), mod('eu', 'muralha', -3)] },
  { id: 'torre_vigia', nome: 'Torre de Vigia', cor: COR.CONSTRUCAO, custo: 5, nivel: 1, icone: '🗼',
    lore: 'Ver longe é sobreviver mais tempo.', efeitos: [mod('eu', 'castelo', 9)] },
  { id: 'equipe', nome: 'Equipe de Construtores', cor: COR.CONSTRUCAO, custo: 7, nivel: 2, icone: '🔨',
    lore: 'Mais patas, menos tempo.', efeitos: [mod('eu', 'construtores', 1)] },
  { id: 'carroca', nome: 'Carroça de Troncos', cor: COR.CONSTRUCAO, custo: 9, nivel: 2, icone: '🛒',
    lore: 'O que chega aqui saiu de lá. (*)', efeitos: [mod('eu', 'castelo', 10), mod('ele', 'castelo', -5)] },
  { id: 'barragem', nome: 'Barragem Principal', cor: COR.CONSTRUCAO, custo: 9, nivel: 2, icone: '🏯',
    lore: 'A grande represa define o conflito.', efeitos: [mod('eu', 'muralha', 12)] },
  { id: 'arquitetos', nome: 'Arquitetos do Clã', cor: COR.CONSTRUCAO, custo: 13, nivel: 3, icone: '📐',
    lore: 'Eles enxergam além da madeira.', efeitos: [mod('eu', 'construtores', 2)] },
  { id: 'fortaleza', nome: 'Fortaleza Ancestral', cor: COR.CONSTRUCAO, custo: 14, nivel: 3, icone: '🏰',
    lore: 'Obras antigas resistem melhor.', efeitos: [mod('eu', 'castelo', 22)] },
  { id: 'represa', nome: 'Grande Represa', cor: COR.CONSTRUCAO, custo: 26, nivel: 3, icone: '🌊',
    lore: 'A obra que nenhum rio derruba. (*)', efeitos: [mod('eu', 'castelo', 38)] },

  // ---------------- BATALHA (armas) ----------------
  { id: 'batedores', nome: 'Batedores', cor: COR.BATALHA, custo: 1, nivel: 1, icone: '🏹',
    lore: 'O ataque começa antes do inimigo ver.', efeitos: [ataque(3)] },
  { id: 'guerreiros', nome: 'Guerreiros do Tronco', cor: COR.BATALHA, custo: 2, nivel: 1, icone: '🛡️',
    lore: 'Força e disciplina defendem o clã.', efeitos: [ataque(5)] },
  { id: 'patrulha', nome: 'Patrulha Veloz', cor: COR.BATALHA, custo: 3, nivel: 1, icone: '🐎',
    lore: 'Chega antes do aviso. (*)', efeitos: [ataque(6)] },
  { id: 'linha', nome: 'Linha de Combate', cor: COR.BATALHA, custo: 4, nivel: 1, icone: '⚔️',
    lore: 'Avançar juntos rompe defesas.', efeitos: [ataque(8)] },
  { id: 'recrutar', nome: 'Recrutar', cor: COR.BATALHA, custo: 7, nivel: 2, icone: '📯',
    lore: 'Cada soldado fortalece o clã.', efeitos: [mod('eu', 'soldados', 1)] },
  { id: 'brigada', nome: 'Brigada Contratada', cor: COR.BATALHA, custo: 8, nivel: 2, icone: '💥',
    lore: 'Lealdade dura enquanto paga.', efeitos: [ataque(14)] },
  { id: 'sabotador', nome: 'Sabotador', cor: COR.BATALHA, custo: 9, nivel: 2, icone: '🕵️',
    lore: 'Um castor infiltrado vale um exército. (*)',
    efeitos: [mod('ele', 'madeira', -5), mod('ele', 'armas', -5), mod('ele', 'cristais', -5)] },
  { id: 'ladrao', nome: 'Guaxinim Ladrão', cor: COR.BATALHA, custo: 12, nivel: 2, icone: '🦝',
    lore: 'O que é seu agora é meu. (*)', efeitos: [{ op: 'roubo', valor: 5 }] },
  { id: 'treinamento', nome: 'Treinamento Avançado', cor: COR.BATALHA, custo: 13, nivel: 3, icone: '🎯',
    lore: 'Exércitos treinados vencem cercos.', efeitos: [mod('eu', 'soldados', 2)] },
  { id: 'lanca_torres', nome: 'Lança-Torres', cor: COR.BATALHA, custo: 10, nivel: 3, icone: '🪨',
    lore: 'Nenhuma paliçada resiste ao impacto.', efeitos: [{ op: 'ataqueDireto', valor: 12 }] },
  { id: 'guardiao', nome: 'Guardião do Tronco', cor: COR.BATALHA, custo: 18, nivel: 3, icone: '🗿',
    lore: 'Criado para destruir fortalezas.', efeitos: [ataque(28)] },

  // ---------------- MAGIA (cristais) ----------------
  { id: 'canalizar', nome: 'Canalizar Energia', cor: COR.MAGIA, custo: 4, nivel: 1, icone: '💎',
    lore: 'Cristais acumulam poder rápido.', efeitos: [mod('eu', 'cristais', 9)] },
  { id: 'crescimento', nome: 'Crescimento Acelerado', cor: COR.MAGIA, custo: 4, nivel: 1, icone: '🌱',
    lore: 'A floresta responde ao ritual.', efeitos: [mod('eu', 'madeira', 8)] },
  { id: 'armar', nome: 'Armar o Clã', cor: COR.MAGIA, custo: 4, nivel: 1, icone: '🗡️',
    lore: 'Magia e guerra caminham juntas.', efeitos: [mod('eu', 'armas', 8)] },
  { id: 'drenar', nome: 'Drenar Essência', cor: COR.MAGIA, custo: 4, nivel: 1, icone: '🫧',
    lore: 'Sem energia, não há magia.', efeitos: [mod('ele', 'cristais', -8)] },
  { id: 'sabotar_obras', nome: 'Sabotar Obras', cor: COR.MAGIA, custo: 4, nivel: 1, icone: '🔥',
    lore: 'Um tronco errado derruba tudo.', efeitos: [mod('ele', 'madeira', -8)] },
  { id: 'desarmar', nome: 'Desarmar Tropas', cor: COR.MAGIA, custo: 4, nivel: 1, icone: '🧲',
    lore: 'Soldados sem armas não lutam.', efeitos: [mod('ele', 'armas', -8)] },
  { id: 'circulo', nome: 'Círculo Druídico', cor: COR.MAGIA, custo: 7, nivel: 2, icone: '🧙',
    lore: 'A magia flui com a floresta.', efeitos: [mod('eu', 'magos', 1)] },
  { id: 'ancioes', nome: 'Anciões Cristalinos', cor: COR.MAGIA, custo: 13, nivel: 3, icone: '🔮',
    lore: 'Poucos dominam tal poder.', efeitos: [mod('eu', 'magos', 2)] },
  { id: 'espirito', nome: 'Espírito da Floresta', cor: COR.MAGIA, custo: 14, nivel: 3, icone: '🐉',
    lore: 'A natureza escolhe lados.', efeitos: [ataque(22)] },
  { id: 'fadas', nome: 'Fadas da Represa', cor: COR.MAGIA, custo: 16, nivel: 3, icone: '🧚',
    lore: 'Erguem em uma noite o que leva um ano. (*)', efeitos: [mod('eu', 'castelo', 24)] },
  { id: 'ritual', nome: 'Ritual de Desequilíbrio', cor: COR.MAGIA, custo: 18, nivel: 3, icone: '🌀',
    lore: 'Fortalecer-se enfraquece o outro.', efeitos: [{ op: 'maldicao' }] },
];

export const CARTA_POR_ID = Object.fromEntries(CARTAS.map((c) => [c.id, c]));

// Texto curto do efeito, para mostrar na carta.
export function descreverCarta(carta) {
  const partes = [];
  for (const e of carta.efeitos) {
    if (e.op === 'mod') {
      const sinal = e.valor > 0 ? '+' : '−';
      const n = Math.abs(e.valor);
      if (e.quem === 'ele') {
        const fem = e.campo !== 'castelo';
        const plural = e.campo === 'armas' || e.campo === 'cristais';
        const adj = plural ? (fem ? 'inimigas' : 'inimigos') : (fem ? 'inimiga' : 'inimigo');
        partes.push(`${NOME[e.campo]} ${adj} ${sinal}${n}`);
      } else {
        partes.push(`${NOME[e.campo]} ${sinal}${n}`);
      }
    } else if (e.op === 'ataque') {
      partes.push(`Ataque ${e.valor}`);
    } else if (e.op === 'ataqueDireto') {
      partes.push(`Castelo inimigo −${e.valor}, ignora a muralha`);
    } else if (e.op === 'roubo') {
      partes.push(`Rouba ${e.valor} de cada recurso do inimigo`);
    } else if (e.op === 'maldicao') {
      partes.push('Seus trabalhadores +1, os do inimigo −1');
    }
  }
  return partes.join(', ');
}
