// Ícones em pixel art 22x22 desenhados em código.
// Cada ícone é pintado só com as cores de dentro; o contorno preto grosso é gerado sozinho em volta
// da silhueta (contorno()). O resultado vira um PNG (data URL) mostrado com image-rendering: pixelated.

const N = 22;
const CONTORNO = '#1b120b';

const C = {
  pedraClara: '#f4ecd8', pedra: '#d6cbb2', pedraMedia: '#ab9f86', pedraEscura: '#7c7260',
  vermelho: '#e04a3a', vermelhoEscuro: '#a52a22',
  madeiraClara: '#e0b27a', madeira: '#b07a45', madeiraEscura: '#7a4e28', madeiraFunda: '#4a2f1a',
  tijoloClaro: '#e88a5e', tijolo: '#c25a35', tijoloEscuro: '#8e3a20',
  metalBrilho: '#f2f6f8', metal: '#b8c2cc', metalEscuro: '#7d8894',
  ouro: '#ffd84a', ouroEscuro: '#c99a1e',
  azulBrilho: '#d4efff', azulClaro: '#7cc8ff', azul: '#3a86d8', azulEscuro: '#1f4f9a',
  branco: '#ffffff',
};

function grade() {
  return Array.from({ length: N }, () => Array(N).fill(null));
}
function px(g, x, y, cor) {
  if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = cor;
}
function ret(g, x, y, w, h, cor) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(g, i, j, cor);
}
function disco(g, cx, cy, r, cor) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px(g, x, y, cor);
  }
}
function anel(g, cx, cy, rMin, rMax, cor) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d >= rMin && d <= rMax) px(g, x, y, cor);
  }
}

// Contorno de 1 pixel (vizinhança de 8) em volta de tudo que foi pintado.
function contorno(g) {
  const saida = g.map((l) => l.slice());
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (g[y][x]) continue;
    let perto = false;
    for (let dy = -1; dy <= 1 && !perto; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = y + dy;
      const xx = x + dx;
      if (yy >= 0 && xx >= 0 && yy < N && xx < N && g[yy][xx]) { perto = true; break; }
    }
    if (perto) saida[y][x] = CONTORNO;
  }
  return saida;
}

function paraURL(g) {
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const ctx = c.getContext('2d');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!g[y][x]) continue;
    ctx.fillStyle = g[y][x];
    ctx.fillRect(x, y, 1, 1);
  }
  return c.toDataURL('image/png');
}

// ---------------- desenhos ----------------
function castelo() {
  const g = grade();
  // bandeira
  ret(g, 11, 1, 1, 6, C.madeiraFunda);
  ret(g, 12, 1, 4, 2, C.vermelho);
  ret(g, 12, 3, 4, 1, C.vermelhoEscuro);
  // torre de menagem
  ret(g, 8, 7, 7, 14, C.pedra);
  ret(g, 8, 8, 1, 13, C.pedraClara);
  ret(g, 14, 7, 1, 14, C.pedraMedia);
  [8, 10, 12, 14].forEach((x) => px(g, x, 6, C.pedra));
  // torres laterais
  ret(g, 2, 10, 5, 11, C.pedra);
  ret(g, 2, 10, 1, 11, C.pedraClara);
  ret(g, 6, 10, 1, 11, C.pedraMedia);
  [2, 4, 6].forEach((x) => px(g, x, 9, C.pedra));
  ret(g, 15, 10, 5, 11, C.pedra);
  ret(g, 15, 10, 1, 11, C.pedraClara);
  ret(g, 19, 10, 1, 11, C.pedraMedia);
  [15, 17, 19].forEach((x) => px(g, x, 9, C.pedra));
  // juntas das pedras
  [[3, 13], [5, 16], [3, 19], [16, 13], [18, 16], [16, 19], [9, 11], [12, 11], [10, 14], [13, 14]].forEach(([x, y]) => ret(g, x, y, 2, 1, C.pedraMedia));
  // separação entre as torres
  ret(g, 7, 10, 1, 11, C.pedraEscura);
  ret(g, 15, 10, 1, 11, C.pedraMedia);
  // portão e janelas
  ret(g, 10, 17, 3, 4, C.madeiraFunda);
  px(g, 11, 16, C.madeiraFunda);
  ret(g, 11, 9, 1, 2, C.madeiraFunda);
  px(g, 4, 12, C.madeiraFunda);
  px(g, 17, 12, C.madeiraFunda);
  return g;
}

function muralha() {
  const g = grade();
  [[1, 4], [7, 4], [13, 4], [18, 3]].forEach(([x, w]) => {
    ret(g, x, 4, w, 3, C.tijolo);
    ret(g, x, 4, w, 1, C.tijoloClaro);
  });
  ret(g, 1, 7, 20, 13, C.tijolo);
  ret(g, 1, 7, 20, 1, C.tijoloClaro);
  ret(g, 1, 19, 20, 1, C.tijoloEscuro);
  [10, 13, 16].forEach((y) => ret(g, 1, y, 20, 1, C.tijoloEscuro));
  const juntas = [[8, [5, 11, 17]], [11, [2, 8, 14, 20]], [14, [5, 11, 17]], [17, [2, 8, 14, 20]]];
  juntas.forEach(([y, xs]) => xs.forEach((x) => ret(g, x, y, 1, 2, C.tijoloEscuro)));
  // brilho em alguns tijolos
  [[2, 8], [12, 11], [6, 14], [15, 17], [9, 17]].forEach(([x, y]) => ret(g, x, y, 2, 1, C.tijoloClaro));
  return g;
}

function construtores() {
  const g = grade();
  // cabeça do martelo
  ret(g, 3, 3, 15, 6, C.metal);
  ret(g, 4, 3, 13, 1, C.metalBrilho);
  ret(g, 3, 8, 15, 1, C.metalEscuro);
  ret(g, 3, 3, 2, 6, C.metalEscuro);
  ret(g, 5, 4, 1, 3, C.metalBrilho);
  // unha do martelo
  ret(g, 15, 9, 3, 1, C.metalEscuro);
  ret(g, 16, 10, 2, 1, C.metalEscuro);
  // cabo
  ret(g, 9, 9, 4, 12, C.madeira);
  ret(g, 9, 9, 1, 12, C.madeiraClara);
  ret(g, 12, 9, 1, 12, C.madeiraEscura);
  [15, 17, 19].forEach((y) => ret(g, 9, y, 4, 1, C.madeiraFunda));
  // faísca de trabalho
  px(g, 19, 1, C.ouro); px(g, 20, 2, C.ouro); px(g, 19, 2, C.ouroEscuro); px(g, 18, 2, C.ouro); px(g, 19, 3, C.ouro);
  return g;
}

function madeira() {
  const g = grade();
  const tora = (cx, cy, r) => {
    disco(g, cx, cy, r, C.madeiraEscura);
    disco(g, cx, cy, r - 1.2, C.madeiraClara);
    anel(g, cx, cy, r - 3.1, r - 2.3, C.madeira);
    disco(g, cx, cy, 0.8, C.madeira);
    px(g, Math.round(cx - r + 1), Math.round(cy - 1), C.madeiraFunda);
  };
  tora(6.5, 15, 5);
  tora(15.5, 15, 5);
  tora(11, 6.8, 5);
  return g;
}

function soldados() {
  const g = grade();
  // penacho
  ret(g, 9, 1, 4, 4, C.vermelho);
  ret(g, 12, 1, 1, 4, C.vermelhoEscuro);
  ret(g, 9, 1, 1, 2, '#ff8a7a');
  // cúpula do elmo
  for (let y = 5; y <= 12; y++) for (let x = 3; x <= 18; x++) {
    if ((x - 10.5) ** 2 + ((y - 12) * 1.15) ** 2 <= 7.6 ** 2) px(g, x, y, C.metal);
  }
  ret(g, 5, 7, 1, 4, C.metalBrilho);
  ret(g, 6, 6, 1, 2, C.metalBrilho);
  ret(g, 10, 5, 2, 7, C.metalEscuro);
  // parte de baixo do elmo
  ret(g, 4, 12, 14, 7, C.metal);
  ret(g, 16, 12, 2, 7, C.metalEscuro);
  ret(g, 4, 12, 1, 7, C.metalBrilho);
  // fenda da viseira e furos
  ret(g, 5, 12, 12, 2, CONTORNO);
  [[7, 16], [9, 16], [12, 16], [14, 16], [8, 17], [13, 17]].forEach(([x, y]) => px(g, x, y, CONTORNO));
  // aro dourado
  ret(g, 4, 19, 14, 2, C.ouro);
  ret(g, 4, 20, 14, 1, C.ouroEscuro);
  return g;
}

function armas() {
  const g = grade();
  // lâmina
  px(g, 11, 1, C.metalBrilho);
  ret(g, 10, 2, 1, 12, C.metalBrilho);
  ret(g, 11, 2, 1, 12, C.metal);
  ret(g, 12, 2, 1, 12, C.metalEscuro);
  ret(g, 11, 4, 1, 8, C.metalEscuro);
  // guarda
  ret(g, 5, 14, 13, 2, C.ouro);
  ret(g, 5, 15, 13, 1, C.ouroEscuro);
  px(g, 5, 13, C.ouro);
  px(g, 17, 13, C.ouro);
  px(g, 11, 14, C.vermelho);
  // empunhadura
  ret(g, 10, 16, 3, 3, C.madeiraEscura);
  ret(g, 10, 17, 3, 1, C.madeiraFunda);
  ret(g, 10, 16, 1, 3, C.madeira);
  // pomo
  ret(g, 9, 19, 5, 2, C.ouro);
  ret(g, 9, 20, 5, 1, C.ouroEscuro);
  return g;
}

function magos() {
  const g = grade();
  // ponta dobrada
  px(g, 15, 1, C.azul);
  ret(g, 13, 2, 3, 1, C.azul);
  ret(g, 12, 3, 3, 1, C.azul);
  // cone
  for (let y = 4; y <= 14; y++) {
    const meia = 1.5 + (y - 4) * 0.55;
    for (let x = Math.round(10.5 - meia); x <= Math.round(10.5 + meia); x++) px(g, x, y, C.azul);
    px(g, Math.round(10.5 - meia), y, C.azulClaro);
    px(g, Math.round(10.5 + meia), y, C.azulEscuro);
  }
  // faixa dourada
  ret(g, 5, 12, 12, 2, C.ouro);
  ret(g, 5, 13, 12, 1, C.ouroEscuro);
  // aba
  ret(g, 4, 15, 14, 1, C.azul);
  ret(g, 2, 16, 18, 1, C.azul);
  ret(g, 1, 17, 20, 1, C.azulEscuro);
  ret(g, 3, 18, 16, 1, C.azulEscuro);
  // estrelas
  [[8, 8], [12, 6], [11, 10]].forEach(([x, y]) => px(g, x, y, C.ouro));
  px(g, 13, 9, C.azulBrilho);
  return g;
}

function cristais() {
  const g = grade();
  const cristal = (x0, larg, topo, base) => {
    const meio = x0 + larg / 2;
    for (let y = topo; y <= base; y++) {
      const ponta = Math.min(1, (y - topo + 1) / (larg / 2 + 1));
      const meia = Math.max(0.5, (larg / 2) * ponta);
      for (let x = Math.round(meio - meia); x < Math.round(meio + meia); x++) {
        const lado = x < meio ? (x < meio - meia + 1 ? C.azulBrilho : C.azulClaro) : (x >= meio + meia - 1 ? C.azulEscuro : C.azul);
        px(g, x, y, lado);
      }
    }
  };
  cristal(3, 4, 8, 20);
  cristal(15, 4, 7, 20);
  cristal(8, 6, 1, 20);
  // brilhos
  px(g, 9, 5, C.branco); px(g, 9, 6, C.branco); px(g, 9, 9, C.branco);
  px(g, 4, 12, C.branco);
  px(g, 19, 3, C.branco); px(g, 18, 3, C.azulBrilho); px(g, 20, 3, C.azulBrilho); px(g, 19, 2, C.azulBrilho); px(g, 19, 4, C.azulBrilho);
  return g;
}

const DESENHOS = { castelo, muralha, construtores, madeira, soldados, armas, magos, cristais };

// Versão em pixel art (reserva, caso as imagens não carreguem).
export const ICONE_PIXEL = Object.fromEntries(Object.entries(DESENHOS).map(([k, fn]) => [k, paraURL(contorno(fn()))]));

// Ícones da interface: ilustrações geradas no estilo do guia (img/icones, recortadas por tools/recortar_icones.py).
export const ICONE_PX = Object.fromEntries(Object.keys(DESENHOS).map((k) => [k, `img/icones/${k}.png`]));
