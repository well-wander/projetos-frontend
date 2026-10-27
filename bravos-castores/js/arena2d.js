// Arena em pixel art do Bravos Castores (canvas 2D, sem bibliotecas).
// Sprites gerados no ChatGPT no estilo Tiny Swords, fatiados por tools/fatiar_sprites.py em
// img/pixel/<grupo>.webp + img/pixel/sprites.json.
//
// O mundo tem 1600 x 900 unidades: jogador 1 à esquerda, jogador 2 à direita (espelhado), um rio
// com ponte no meio. O mundo é encaixado na área da tela que os painéis e a mão não cobrem; o
// chão continua até as bordas.
//
// API usada pelo jogo (main.js), a mesma da arena 3D antiga:
//   resetar(estado), atualizar(estado, {carta, quem, aoImpacto}), vez(quem, turno),
//   producao(quem, estado), previa(id, quem, estado), limparPrevia(), comemorar(idx), avancar(s)
import { CARTA_POR_ID, NOME, TRABALHADOR_DO_RECURSO } from './cartas.js';
import { aplicarEfeitos } from './regras.js';

const MUNDO_W = 1600;
const MUNDO_H = 900;
const FPS = 10;
const META = 100;
const COR_TIME = ['verde', 'vermelho'];
const COR_FEM = ['verde', 'vermelha']; // nomes de sprites no feminino (forja_vermelha, ruina_vermelha)

// tamanho de desenho (unidades do mundo por pixel do atlas) de cada tipo de sprite
const ESC = { castelo: 1.75, construcao: 0.9, muro: 0.8, natureza: 1.05, castor: 0.95, especial: 1.0, efeito: 1.2, recurso: 0.85 };

// posições do jogador 1 (o 2 é espelhado em x)
const LAYOUT = {
  castelo: [360, 600],
  muro: { x: 615, ys: [590, 630, 550, 670, 510, 710] },
  construcao: { construtores: [70, 345], soldados: [140, 835], magos: [470, 850] },
  pilha: { construtores: [20, 545], soldados: [300, 885], magos: [610, 870] },
  trabalho: {
    construtores: [[95, 455], [150, 480], [55, 500], [135, 530]],
    soldados: [[240, 820], [295, 850], [205, 870], [345, 815]],
    magos: [[560, 780], [625, 800], [530, 830], [660, 760]],
  },
};
const CONSTRUCAO = { construtores: 'serraria', soldados: 'forja', magos: 'torre_magica' };
const TRABALHO = { construtores: 'construtor_trabalhando', soldados: 'soldado_parado', magos: 'mago_invocando' };
const RECURSO_DO_TIPO = Object.fromEntries(Object.entries(TRABALHADOR_DO_RECURSO).map(([r, t]) => [t, r]));
const ICONE_RECURSO = { madeira: 'madeira', armas: 'armas', cristais: 'cristais' };
const TIPOS = ['construtores', 'soldados', 'magos'];

function rngSemente(s) {
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const carregarImagem = (src) => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = src; });
const esperar = (s) => new Promise((r) => setTimeout(r, s * 1000));
const suave = (k) => k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;

// =====================================================================
export async function criarArena(container, aoSom = () => {}, aoProgresso = () => {}) {
  // ---- sprites ----
  const SPR = await fetch('img/pixel/sprites.json').then((r) => r.json());
  const fontes = [...new Set(Object.values(SPR).map((s) => s.img))];
  const IMGS = {};
  let feitos = 0;
  await Promise.all(fontes.map(async (src) => { IMGS[src] = await carregarImagem(src); aoProgresso(++feitos, fontes.length); }));

  const canvas = document.createElement('canvas');
  canvas.className = 'arena-canvas';
  container.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const fundo = document.createElement('canvas'); // chão em baixa resolução (pixels grandes)
  const fctx = fundo.getContext('2d');

  // ---- cores tiradas dos próprios sprites (para o chão combinar com a arte) ----
  function corMedia(nome, x0, y0, x1, y1) {
    const s = SPR[nome];
    const q = s.quadros[0];
    const c = document.createElement('canvas');
    c.width = q[2]; c.height = q[3];
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(IMGS[s.img], q[0], q[1], q[2], q[3], 0, 0, q[2], q[3]);
    const d = g.getImageData(Math.floor(q[2] * x0), Math.floor(q[3] * y0), Math.max(1, Math.floor(q[2] * (x1 - x0))), Math.max(1, Math.floor(q[3] * (y1 - y0)))).data;
    let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
    return n ? [r / n, gg / n, b / n] : [120, 170, 70];
  }
  const COR = {
    grama: corMedia('grama_verde', 0.25, 0.25, 0.75, 0.6),
    agua: corMedia('agua_bloco', 0.35, 0.35, 0.65, 0.5),
    terra: corMedia('caminho_h', 0.3, 0.42, 0.7, 0.55),
  };
  const rgb = (c, k = 1) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;

  // ---- encaixe do mundo na área livre da tela ----
  let W = 1, H = 1, DPR = 1;
  const vista = { k: 1, ox: 0, oy: 0 };
  const cam = { zoom: 1, fx: MUNDO_W / 2, fy: MUNDO_H / 2, tremor: 0 };
  function areaLivre() {
    const c = container.getBoundingClientRect();
    let l = 0, t = 0, r = c.width, b = c.height;
    const cobre = (el) => {
      if (!el || el.offsetParent === null) return null;
      const e = el.getBoundingClientRect();
      if (e.width === 0 || e.right < c.left || e.left > c.right || e.bottom < c.top || e.top > c.bottom) return null;
      return { l: e.left - c.left, t: e.top - c.top, r: e.right - c.left, b: e.bottom - c.top };
    };
    for (const sel of ['#painel-0', '#painel-1']) {
      const e = cobre(document.querySelector(sel));
      if (!e || e.b - e.t < c.height * 0.3) continue;
      if (e.l < c.width * 0.3) l = Math.max(l, e.r);
      else if (e.r > c.width * 0.7) r = Math.min(r, e.l);
    }
    const mao = cobre(document.querySelector('.mao-area'));
    if (mao && mao.t > c.height * 0.4) b = Math.min(b, mao.t + (mao.b - mao.t) * 0.25);
    const vez = cobre(document.querySelector('#vez'));
    if (vez && vez.b < c.height * 0.3) t = Math.max(t, vez.b);
    if (r - l < c.width * 0.4) { l = 0; r = c.width; }
    return { l, t, r, b };
  }
  function redimensionar() {
    const c = container.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, c.width); H = Math.max(1, c.height);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    const a = areaLivre();
    const k = Math.min((a.r - a.l) / MUNDO_W, (a.b - a.t) / MUNDO_H) * 1.06;
    vista.k = k;
    vista.ox = (a.l + a.r) / 2 - (MUNDO_W / 2) * k;
    vista.oy = (a.t + a.b) / 2 - (MUNDO_H / 2) * k;
    pintarFundo();
  }
  const obs = 'ResizeObserver' in window ? new ResizeObserver(() => redimensionar()) : null;
  if (obs) obs.observe(container); else window.addEventListener('resize', redimensionar);

  // mundo -> tela (com zoom da câmera)
  // o centro do mundo fica no centro da área livre; com zoom, o foco vai para o centro aos poucos
  function tela(x, y) {
    const k = vista.k * cam.zoom;
    const t = Math.min(1, Math.max(0, (cam.zoom - 1) / 0.12));
    const fx = lerp(MUNDO_W / 2, cam.fx, t);
    const fy = lerp(MUNDO_H / 2, cam.fy, t);
    return [vista.ox + (MUNDO_W / 2) * vista.k + (x - fx) * k, vista.oy + (MUNDO_H / 2) * vista.k + (y - fy) * k];
  }

  // ---- chão: pintado numa tela pequena (1 pixel = PX pixels de tela) e ampliado sem suavizar ----
  const PX = 4;
  const rndChao = rngSemente(7);
  const manchas = Array.from({ length: 70 }, () => [rndChao() * 2.4 - 0.7, rndChao() * 2.4 - 0.7, 20 + rndChao() * 70, rndChao() < 0.5 ? 0.93 : 1.06]);
  const tufos = Array.from({ length: 260 }, () => [rndChao() * 2.6 - 0.8, rndChao() * 2.6 - 0.8, rndChao()]);
  const xRio = (y) => MUNDO_W / 2 + Math.sin(y / 140) * 26;
  function pintarFundo() {
    const fw = Math.ceil(W / PX);
    const fh = Math.ceil(H / PX);
    fundo.width = fw; fundo.height = fh;
    fctx.fillStyle = rgb(COR.grama);
    fctx.fillRect(0, 0, fw, fh);
    const k = vista.k / PX;
    const mx = (x) => (vista.ox / PX) + x * k;
    const my = (y) => (vista.oy / PX) + y * k;
    // manchas de grama mais clara/escura (coordenadas relativas ao mundo, passam das bordas)
    for (const [u, v, r, t] of manchas) {
      fctx.fillStyle = rgb(COR.grama, t);
      const cx = mx(u * MUNDO_W), cy = my(v * MUNDO_H), rr = r * k * 3;
      for (let yy = -rr; yy <= rr; yy++) {
        const larg = Math.sqrt(Math.max(0, rr * rr - yy * yy)) * 1.6;
        fctx.fillRect(Math.round(cx - larg), Math.round(cy + yy), Math.round(larg * 2), 1);
      }
    }
    // caminho de terra entre os castelos
    fctx.fillStyle = rgb(COR.terra);
    for (let x = -200; x <= MUNDO_W + 200; x += 4) {
      const y = 650 + Math.sin(x / 180) * 14;
      fctx.fillRect(Math.round(mx(x)), Math.round(my(y - 26)), Math.ceil(4 * k) + 1, Math.max(2, Math.round(52 * k)));
    }
    // rio de cima a baixo, com margem clara e espuma
    for (let y = -400; y <= MUNDO_H + 400; y += 3) {
      const x = xRio(y);
      const yy = Math.round(my(y));
      const meia = 58 * k;
      fctx.fillStyle = rgb(COR.terra, 1.08);
      fctx.fillRect(Math.round(mx(x) - meia - 2), yy, Math.round(meia * 2 + 4), Math.ceil(3 * k) + 1);
      fctx.fillStyle = rgb(COR.agua);
      fctx.fillRect(Math.round(mx(x) - meia), yy, Math.round(meia * 2), Math.ceil(3 * k) + 1);
      fctx.fillStyle = rgb(COR.agua, 0.86);
      fctx.fillRect(Math.round(mx(x) - meia * 0.45), yy, Math.round(meia * 0.9), Math.ceil(3 * k) + 1);
      fctx.fillStyle = 'rgba(255,255,255,.75)';
      fctx.fillRect(Math.round(mx(x) - meia), yy, 1, Math.ceil(3 * k) + 1);
      fctx.fillRect(Math.round(mx(x) + meia - 1), yy, 1, Math.ceil(3 * k) + 1);
    }
    // ponte de toras sobre o rio, no caminho
    {
      const cxp = mx(xRio(650)), cyp = my(650), meia = Math.round(80 * k), alt = Math.round(30 * k);
      for (let x = -meia; x < meia; x++) {
        const tabua = Math.floor((x + meia) / Math.max(2, Math.round(10 * k)));
        fctx.fillStyle = tabua % 2 ? '#9a6234' : '#b07a45';
        fctx.fillRect(Math.round(cxp + x), Math.round(cyp - alt), 1, alt * 2);
      }
      fctx.fillStyle = '#5c3a1c';
      fctx.fillRect(Math.round(cxp - meia), Math.round(cyp - alt), meia * 2, 1);
      fctx.fillRect(Math.round(cxp - meia), Math.round(cyp + alt - 1), meia * 2, 1);
      fctx.fillStyle = '#6e4628';
      fctx.fillRect(Math.round(cxp - meia), Math.round(cyp - alt - 2), meia * 2, 2);
      fctx.fillRect(Math.round(cxp - meia), Math.round(cyp + alt), meia * 2, 2);
    }
    // tufinhos de grama (2 pixels)
    for (const [u, v, t] of tufos) {
      const x = u * MUNDO_W, y = v * MUNDO_H;
      if (Math.abs(x - xRio(y)) < 80) continue;
      fctx.fillStyle = rgb(COR.grama, t < 0.5 ? 0.82 : 1.18);
      fctx.fillRect(Math.round(mx(x)), Math.round(my(y)), 1, 2);
      fctx.fillRect(Math.round(mx(x)) + 1, Math.round(my(y)) + 1, 1, 1);
    }
  }

  // ---- desenho de sprites ----
  function desenhar(nome, quadro, x, y, { esc = 1, flip = false, alfa = 1, sombra = false } = {}) {
    const s = SPR[nome];
    if (!s) return;
    const q = s.quadros[((quadro % s.quadros.length) + s.quadros.length) % s.quadros.length];
    const k = vista.k * cam.zoom * esc;
    const [X, Y] = tela(x, y);
    if (sombra) {
      ctx.fillStyle = 'rgba(30,40,20,.28)';
      ctx.beginPath();
      ctx.ellipse(X, Y - 2 * k, q[2] * k * 0.32, q[2] * k * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.translate(X, Y);
    if (flip) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = k < 1.5;
    ctx.drawImage(IMGS[s.img], q[0], q[1], q[2], q[3], -q[4] * k, -q[5] * k, q[2] * k, q[3] * k);
    ctx.restore();
  }
  const tamanho = (nome, esc) => { const q = SPR[nome].quadros[0]; return [q[2] * esc, q[3] * esc]; };

  // =====================================================================
  //  ENTIDADES: tudo que aparece no mundo é uma entidade, desenhada por ordem de y (base)
  // =====================================================================
  const entidades = new Set();
  function ent(nome, x, y, opcoes = {}) {
    const e = { nome, x, y, quadro: 0, t: Math.random() * 10, fps: FPS, loop: true, esc: 1, flip: false, alfa: 1, sombra: false, dy: 0, ...opcoes };
    entidades.add(e);
    return e;
  }
  const tirar = (e) => entidades.delete(e);
  // efeito que toca uma vez e some (explosão, poeira, raio...)
  function efeito(nome, x, y, { esc = ESC.efeito, fps = 12, flip = false } = {}) {
    const e = ent(nome, x, y, { esc, fps, loop: false, flip, camada: 1 });
    return new Promise((ok) => { e.aoFim = () => { tirar(e); ok(); }; });
  }

  // tarefas por quadro (como os "atores" da arena 3D): fn(dt) devolve false quando acaba
  const tarefas = [];
  function durante(seg, fn) {
    return new Promise((ok) => {
      let t = 0;
      tarefas.push((dt) => { t += dt; const k = Math.min(1, t / seg); fn(k, dt, t); if (k >= 1) { ok(); return false; } return true; });
    });
  }
  // anda em linha reta tocando uma animação; vira para o lado do movimento
  function andar(e, x1, y1, seg, anim) {
    const x0 = e.x, y0 = e.y;
    if (anim) { e.nome = anim; e.loop = true; }
    if (Math.abs(x1 - x0) > 2) e.flip = x1 < x0;
    return durante(seg, (k) => { e.x = lerp(x0, x1, k); e.y = lerp(y0, y1, k); });
  }
  // toca uma animação uma vez (ou n vezes) e volta para a anterior
  function tocarUmaVez(e, anim, vezes = 1, fps = FPS) {
    const antes = { nome: e.nome, fps: e.fps };
    const n = SPR[anim].quadros.length;
    e.nome = anim; e.t = 0; e.fps = fps;
    return esperar((n * vezes) / fps).then(() => { e.nome = antes.nome; e.fps = antes.fps; });
  }
  function surgir(e, seg = 0.3) {
    const alvo = e.esc;
    e.esc = alvo * 0.2;
    return durante(seg, (k) => { e.esc = alvo * (0.2 + 0.8 * (1 - Math.pow(1 - k, 3))) * (1 + Math.sin(k * Math.PI) * 0.12); });
  }
  function sumir(e, seg = 0.3) {
    const a0 = e.alfa;
    return durante(seg, (k) => { e.alfa = a0 * (1 - k); }).then(() => tirar(e));
  }
  // voa em arco (projétil, item); gira se pedido
  function voar(e, x1, y1, seg, altura = 160) {
    const x0 = e.x, y0 = e.y;
    return durante(seg, (k) => { e.x = lerp(x0, x1, k); e.y = lerp(y0, y1, k); e.dy = -Math.sin(k * Math.PI) * altura; });
  }

  // ---- partículas simples (faíscas, brilhos, fumaça), desenhadas como quadradinhos de pixel ----
  const particulas = [];
  function particulas_(x, y, n, cor, { vel = 120, vida = 0.8, sobe = 80, tam = 6 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      particulas.push({ x, y, vx: Math.cos(a) * vel * Math.random(), vy: Math.sin(a) * vel * Math.random() * 0.5 - sobe, vida, total: vida, cor, tam: tam * (0.6 + Math.random() * 0.8) });
    }
  }

  // =====================================================================
  //  CENÁRIO FIXO: natureza em volta, ponte, nuvens
  // =====================================================================
  const rnd = rngSemente(42);
  const NATUREZA = ['pinheiro_1', 'pinheiro_2', 'arvore', 'pinheiro_1', 'arvore_roida', 'pinheiro_2'];
  const decoracao = [];
  // fileira de árvores no fundo e nas laterais
  for (let i = 0; i < 26; i++) {
    const x = -260 + i * 82 + rnd() * 30;
    if (Math.abs(x - xRio(170)) < 90) continue;
    decoracao.push(['nat', NATUREZA[i % NATUREZA.length], x, 175 + rnd() * 40]);
    if (rnd() < 0.6) decoracao.push(['nat', NATUREZA[(i + 3) % NATUREZA.length], x + 40, 120 + rnd() * 30]);
  }
  for (let i = 0; i < 9; i++) {
    for (const lado of [-1, 1]) {
      const x = lado < 0 ? -120 - rnd() * 180 : MUNDO_W + 120 + rnd() * 180;
      decoracao.push(['nat', NATUREZA[(i * 2) % NATUREZA.length], x, 260 + i * 80 + rnd() * 30]);
    }
  }
  // detalhes espalhados (longe dos castelos e do caminho)
  const MIUDOS = ['arbusto_1', 'arbusto_2', 'pedra_m', 'pedra_p', 'flores', 'cogumelos', 'toco_1', 'toco_2', 'tronco_caido', 'pedra_g'];
  const areaJogador = (x, y) => y > 250 && (x > -70 && x < 720 || x > MUNDO_W - 720 && x < MUNDO_W + 70);
  const livre = (x, y) => Math.abs(x - xRio(y)) > 95 && Math.abs(y - 650) > 50 && !areaJogador(x, y);
  for (let i = 0; i < 400 && decoracao.length < 120; i++) {
    const x = -320 + rnd() * (MUNDO_W + 640);
    const y = 260 + rnd() * 680;
    if (livre(x, y)) decoracao.push(['nat', MIUDOS[i % MIUDOS.length], x, y]);
  }
  decoracao.forEach(([, nome, x, y]) => {
    const e = ent(nome, x, y, { esc: ESC.natureza * (nome.startsWith('pin') || nome.startsWith('arv') ? 1 : 0.8), fixo: true, flip: rnd() < 0.5 });
    if (nome.startsWith('pin') || nome.startsWith('arv')) { e.balanca = true; e.fase = rnd() * 6; }
  });
  // ponte sobre o rio, no caminho

  // nuvens passando (desenhadas por cima de tudo, semitransparentes)
  const nuvens = Array.from({ length: 4 }, (_, i) => ({ nome: i % 2 ? 'nuvem_2' : 'nuvem_1', x: -300 + i * 560 + rnd() * 120, y: 40 + rnd() * 120, vel: 6 + rnd() * 6 }));

  // =====================================================================
  //  JOGADORES: castelo, muralha, construções, trabalhadores, pilhas
  // =====================================================================
  const mx = (i, x) => (i === 0 ? x : MUNDO_W - x);
  const jogadores = [0, 1].map((i) => {
    const cor = COR_TIME[i];
    const flip = i === 1;
    const [cx, cy] = LAYOUT.castelo;
    const p = {
      i, cor, flip,
      cx: mx(i, cx), cy,
      castelo: ent(`castelo_${cor}_1`, mx(i, cx), cy, { esc: ESC.castelo, flip, sombra: false }),
      muros: [], trabalhadores: { construtores: [], soldados: [], magos: [] }, pilhas: {}, construcoes: {},
      vCastelo: 0, vMuralha: 0, estagio: -1,
    };
    for (const tipo of TIPOS) {
      const [x, y] = LAYOUT.construcao[tipo];
      p.construcoes[tipo] = ent(`${CONSTRUCAO[tipo]}_${COR_FEM[i]}`, mx(i, x), y, { esc: ESC.construcao, flip });
      p.pilhas[tipo] = null;
    }
    return p;
  });

  // ---- castelo: estágio pelo valor; ruína quando zera ----
  const estagioDe = (v) => (v <= 0 ? 0 : Math.min(5, 1 + Math.floor(v / 20)));
  function trocarCastelo(p, v, origem) {
    const est = estagioDe(v);
    if (est === p.estagio) return 0;
    const subiu = est > p.estagio;
    const inicial = p.estagio < 0;
    p.estagio = est;
    p.castelo.nome = est === 0 ? `ruina_${COR_FEM[p.i]}` : `castelo_${p.cor}_${est}`;
    if (inicial) return 0;
    if (subiu) {
      surgir(p.castelo, 0.4);
      efeito('poeira', p.cx - 80, p.cy + 10, { esc: 1.3 });
      efeito('poeira', p.cx + 80, p.cy + 10, { esc: 1.3, flip: true });
      particulas_(p.cx, p.cy - 120, 18, '#9be36a', { sobe: 120 });
      aoSom('construir');
    } else {
      efeito('explosao', origem ? origem[0] : p.cx, (origem ? origem[1] : p.cy) - 60, { esc: 1.6 });
      cam.tremor = Math.max(cam.tremor, 10);
      aoSom('desmorona');
    }
    return 0.6;
  }
  // ---- muralha: estacas na frente do castelo (pedra a partir de 35) ----
  function trocarMuros(p, v) {
    const n = v <= 0 ? 0 : Math.min(6, Math.ceil(v / 7));
    const nome = v >= 35 ? 'muro_pedra' : 'palicada';
    let mudou = false;
    while (p.muros.length < n) {
      const y = LAYOUT.muro.ys[p.muros.length];
      const e = ent(nome, mx(p.i, LAYOUT.muro.x), y, { esc: ESC.muro, flip: p.flip });
      p.muros.push(e);
      surgir(e, 0.3);
      mudou = true;
    }
    while (p.muros.length > n) {
      const e = p.muros.pop();
      efeito('poeira', e.x, e.y, { esc: 1 });
      particulas_(e.x, e.y - 30, 10, '#8a5a2c', { vel: 200, sobe: 120 });
      sumir(e, 0.25);
      mudou = true;
    }
    p.muros.forEach((e) => { e.nome = nome; });
    return mudou ? 0.4 : 0;
  }
  // ---- trabalhadores: até 4 de cada tipo, trabalhando perto da sua construção ----
  function trocarTrabalhadores(p, valores) {
    if (valores.construtores === undefined) return;
    for (const tipo of TIPOS) {
      const lista = p.trabalhadores[tipo];
      const alvo = Math.min(4, Math.max(0, valores[tipo]));
      while (lista.length < alvo) {
        const [x, y] = LAYOUT.trabalho[tipo][lista.length];
        const e = ent(TRABALHO[tipo], mx(p.i, x), y, { esc: ESC.castor, flip: p.flip, sombra: true, fps: 8 + Math.random() * 3 });
        lista.push(e);
        surgir(e, 0.35);
        efeito('brilho_verde', e.x, e.y, { esc: 0.9 });
      }
      while (lista.length > alvo) {
        const e = lista.pop();
        efeito('poeira', e.x, e.y, { esc: 0.8 });
        sumir(e, 0.25);
      }
    }
  }
  // ---- pilha de recurso: tamanho pelo valor (P, M, G) ----
  function trocarPilhas(p, valores) {
    for (const tipo of TIPOS) {
      const v = valores[RECURSO_DO_TIPO[tipo]];
      if (v === undefined) continue;
      const tam = v <= 0 ? null : v < 8 ? 'p' : v < 20 ? 'm' : 'g';
      const nome = tam && `${ICONE_RECURSO[RECURSO_DO_TIPO[tipo]]}_${tam}`;
      const atual = p.pilhas[tipo];
      if ((atual && atual.nome) === nome) continue;
      const [x, y] = LAYOUT.pilha[tipo];
      if (atual) tirar(atual);
      p.pilhas[tipo] = nome ? ent(nome, mx(p.i, x), y, { esc: ESC.recurso, flip: p.flip }) : null;
      if (nome && atual) surgir(p.pilhas[tipo], 0.25);
    }
  }

  // Leva castelo, muralha, trabalhadores e pilhas do jogador aos valores pedidos.
  function sincronizar(idx, valores, origem) {
    const p = jogadores[idx];
    p.vCastelo = valores.castelo;
    p.vMuralha = valores.muralha;
    const d1 = trocarCastelo(p, valores.castelo, origem);
    const d2 = trocarMuros(p, valores.muralha);
    trocarTrabalhadores(p, valores);
    trocarPilhas(p, valores);
    p.rotCastelo.textContent = valores.castelo;
    p.rotMuralha.textContent = valores.muralha;
    return Math.max(d1, d2, 0.2);
  }

  // ---- rótulos HTML por cima (números do castelo e da muralha) ----
  function rotulo(classe) {
    const el = document.createElement('div');
    el.className = 'rotulo3d ' + classe;
    container.appendChild(el);
    return el;
  }
  jogadores.forEach((p, i) => {
    p.rotCastelo = rotulo(`castelo j${i}`);
    p.rotMuralha = rotulo(`muralha j${i}`);
  });

  // =====================================================================
  //  CÂMERA, DIA, ESTADOS (fogo, glória)
  // =====================================================================
  const foco = { zoomAlvo: 1, x: MUNDO_W / 2, y: MUNDO_H / 2, ate: 0 };
  let relogio = 0;
  function focar(x, y, zoom = 1.12, seg = 0) { foco.x = x; foco.y = y; foco.zoomAlvo = zoom; foco.ate = seg ? relogio + seg : 0; }
  function soltarFoco(depois = 0) { if (depois) foco.ate = relogio + depois; else { foco.zoomAlvo = 1; foco.ate = 0; } }
  let horaAtual = 0;
  let horaAlvo = 0;

  const lado = (i) => (i === 0 ? 1 : -1); // direção "para o inimigo"
  const pontoAtaque = (i, desloc = 0) => {
    const p = jogadores[i];
    return p.muros.length ? [mx(i, LAYOUT.muro.x + 70), 600 + desloc] : [p.cx + lado(i) * 140, p.cy + 30 + desloc];
  };
  const alvoAtaque = (i) => {
    const p = jogadores[i];
    return p.muros.length ? [mx(i, LAYOUT.muro.x), 600] : [p.cx, p.cy - 40];
  };

  // =====================================================================
  //  ANIMAÇÃO DE CADA CARTA
  // =====================================================================
  function tipoDaCarta(c) {
    const ops = c.efeitos.map((e) => e.op);
    if (c.id === 'guardiao') return 'golem';
    if (c.id === 'lanca_torres') return 'catapulta';
    if (c.id === 'espirito') return 'dragao';
    if (c.id === 'carroca') return 'carroca';
    if (c.id === 'sabotador') return 'sabotador';
    if (c.id === 'fadas') return 'fadas';
    if (c.id === 'crescimento') return 'conjurar_madeira';
    if (c.id === 'canalizar') return 'conjurar_cristais';
    if (c.id === 'armar') return 'conjurar_armas';
    if (ops.includes('roubo')) return 'ladrao';
    if (ops.includes('maldicao')) return 'ritual';
    if (ops.includes('ataque')) return 'marcha';
    if (c.efeitos.some((e) => e.quem === 'ele')) return 'feixe';
    if (c.efeitos.some((e) => ['construtores', 'soldados', 'magos'].includes(e.campo))) return 'recruta';
    return 'obra';
  }
  const valorAtaque = (c) => (c.efeitos.find((x) => x.op === 'ataque' || x.op === 'ataqueDireto') || { valor: 0 }).valor;

  async function animarCarta(id, quem, estado, aoImpacto) {
    const c = CARTA_POR_ID[id];
    const ele = 1 - quem;
    const eu = jogadores[quem];
    const dele = jogadores[ele];
    let feito = false;
    const impacto = () => { if (!feito) { feito = true; aoImpacto(); } };
    const sincronizados = new Set();
    const sync = (i, origem) => { sincronizados.add(i); return esperar(sincronizar(i, estado.jogadores[i], origem)); };
    const esperas = [];
    const tipo = tipoDaCarta(c);
    const frente = (i, d = 160) => jogadores[i].cx + lado(i) * d;

    if (tipo === 'marcha') {
      const n = Math.max(2, Math.min(5, Math.ceil(valorAtaque(c) / 4)));
      const tropa = Array.from({ length: n }, (_, k) => ent('soldado_correndo', frente(quem, 120), 560 + k * 38, { esc: ESC.castor, flip: quem === 1, sombra: true }));
      tropa.forEach((s) => surgir(s, 0.2));
      focar((eu.cx + dele.cx) / 2, 620, 1.08);
      aoSom('metal');
      await Promise.all(tropa.map((s, k) => esperar(k * 0.07).then(() => andar(s, ...pontoAtaque(ele, (k - n / 2) * 34), 1.6, 'soldado_correndo'))));
      tropa.forEach((s) => { s.nome = 'soldado_golpe'; s.t = Math.random(); });
      await esperar(0.35);
      const [ax, ay] = alvoAtaque(ele);
      focar(ax, ay, 1.15, 1.4);
      efeito('poeira', ax, ay + 20, { esc: 1.4 });
      particulas_(ax, ay - 40, 16, '#ffe9a8', { vel: 220 });
      aoSom('impacto');
      impacto();
      esperas.push(sync(ele, [ax, ay]));
      await esperar(0.7);
      await Promise.all(tropa.map((s) => andar(s, frente(quem, 120), s.y, 1.2, 'soldado_correndo').then(() => sumir(s, 0.25))));
    } else if (tipo === 'golem') {
      const g = ent('golem', frente(quem, 150), 640, { esc: ESC.especial * 1.25, flip: quem === 1, sombra: true, fps: 6 });
      await surgir(g, 0.4);
      focar(g.x, g.y, 1.1);
      const [px, py] = pontoAtaque(ele);
      const x0 = g.x, y0 = g.y;
      g.loop = true;
      await durante(2.2, (k, dt, t) => { g.x = lerp(x0, px, k); g.y = lerp(y0, py, k); g.quadro = Math.floor(t * 5) % 4; g.fixoQuadro = true; });
      g.fixoQuadro = false;
      g.quadro = 4; g.fixoQuadro = true;
      const [ax, ay] = alvoAtaque(ele);
      efeito('poeira', ax, ay + 20, { esc: 2 });
      efeito('explosao', ax, ay - 30, { esc: 1.5 });
      cam.tremor = 18;
      focar(ax, ay, 1.15, 1.4);
      aoSom('impacto');
      impacto();
      esperas.push(sync(ele, [ax, ay]));
      await esperar(0.8);
      await sumir(g, 0.4);
    } else if (tipo === 'catapulta') {
      const cat = ent('catapulta', frente(quem, 210), 760, { esc: ESC.especial, flip: quem === 1, sombra: true, loop: false, fps: 8 });
      cat.parado = true;
      await surgir(cat, 0.3);
      focar(cat.x, cat.y - 80, 1.1);
      aoSom('lancar');
      cat.parado = false; cat.t = 0;
      await esperar(0.35);
      const pedra = ent('pedra_girando', cat.x + lado(quem) * 40, cat.y - 120, { esc: ESC.efeito, camada: 1 });
      const [ax, ay] = [dele.cx, dele.cy - 60];
      focar((cat.x + ax) / 2, 450, 1.0);
      await voar(pedra, ax, ay, 1.2, 320);
      tirar(pedra);
      efeito('explosao', ax, ay, { esc: 1.8 });
      cam.tremor = 14;
      focar(ax, ay, 1.15, 1.3);
      aoSom('impacto');
      impacto();
      esperas.push(sync(ele, [ax, ay]));
      await esperar(0.6);
      await sumir(cat, 0.3);
    } else if (tipo === 'dragao') {
      const d = ent('dragao', frente(quem, -40), 230, { esc: ESC.especial * 1.15, flip: quem === 1, fps: 7, camada: 2 });
      d.quadrosVoo = 3;
      await surgir(d, 0.4);
      aoSom('feitico');
      focar(MUNDO_W / 2, 400, 1.0);
      const [ax, ay] = alvoAtaque(ele);
      const x0 = d.x;
      const x1 = ax - lado(quem) * 260;
      await durante(2.0, (k, dt, t) => { d.x = lerp(x0, x1, suave(k)); d.y = 230 + Math.sin(k * Math.PI) * -60; d.quadro = Math.floor(t * 7) % 3; d.fixoQuadro = true; });
      d.quadro = 3;
      for (let k = 0; k < 3; k++) {
        efeito('raio', ax + (k - 1) * 50, ay + 20, { esc: 1.3 });
        await esperar(0.15);
      }
      efeito('explosao', ax, ay - 20, { esc: 1.6 });
      particulas_(ax, ay - 60, 24, '#9fe6c0', { vel: 260 });
      cam.tremor = 14;
      focar(ax, ay, 1.15, 1.3);
      aoSom('raio');
      impacto();
      esperas.push(sync(ele, [ax, ay]));
      await esperar(0.5);
      d.fixoQuadro = false;
      await sumir(d, 0.5);
    } else if (tipo === 'carroca') {
      const car = ent('carroca', mx(quem, -120), 700, { esc: ESC.especial, flip: quem === 1, sombra: true });
      focar(eu.cx, eu.cy, 1.1);
      await andar(car, frente(quem, 40), 700, 1.6);
      aoSom('carpintaria');
      efeito('lascas', car.x, car.y - 40, { esc: 0.8 });
      esperas.push(sync(quem));
      await esperar(0.5);
      const tora = ent('pedra_girando', car.x, car.y - 90, { esc: ESC.efeito, camada: 1 });
      const [ax, ay] = [dele.cx, dele.cy - 60];
      await voar(tora, ax, ay, 1.1, 280);
      tirar(tora);
      efeito('explosao', ax, ay, { esc: 1.3 });
      aoSom('impacto');
      impacto();
      esperas.push(sync(ele, [ax, ay]));
      await sumir(car, 0.3);
    } else if (tipo === 'ladrao' || tipo === 'sabotador') {
      const ladrao = tipo === 'ladrao';
      const b = ent(ladrao ? 'guaxinim_correndo' : 'sabotador', frente(quem, 130), 760, { esc: ESC.especial, flip: quem === 1, sombra: true, fps: ladrao ? 12 : 8 });
      await surgir(b, 0.25);
      const alvoTipo = ladrao ? 'construtores' : 'soldados';
      const [tx, ty] = [mx(ele, LAYOUT.pilha[alvoTipo][0]) + lado(ele) * 70, LAYOUT.pilha[alvoTipo][1]];
      focar(tx, ty, 1.1);
      if (ladrao) {
        await andar(b, tx, ty, 1.9);
        aoSom('roubo');
        particulas_(tx, ty - 30, 12, '#ffd43b', { vel: 160 });
      } else {
        const x0 = b.x, y0 = b.y;
        await durante(2.0, (k, dt, t) => { b.x = lerp(x0, tx, k); b.y = lerp(y0, ty, k); b.quadro = Math.floor(t * 6) % 2; b.fixoQuadro = true; });
        b.fixoQuadro = false;
        await tocarUmaVez(b, 'sabotador', 1, 10);
        efeito('explosao', tx - lado(ele) * 40, ty - 20, { esc: 1.4 });
        efeito('fogo', tx - lado(ele) * 70, ty, { esc: 1 });
        cam.tremor = 10;
        aoSom('desmorona');
      }
      impacto();
      esperas.push(sync(ele), sync(quem));
      await andar(b, frente(quem, 130), 760, 1.4);
      await sumir(b, 0.25);
    } else if (tipo === 'feixe') {
      const m = ent('mago_feitico', frente(quem, 230), 640, { esc: ESC.castor, flip: quem === 1, sombra: true, loop: false, fps: 8 });
      await surgir(m, 0.3);
      aoSom('feitico');
      const campo = c.efeitos.find((e) => e.quem === 'ele').campo;
      const alvoTipo = TRABALHADOR_DO_RECURSO[campo] || 'magos';
      const [tx, ty] = [mx(ele, LAYOUT.pilha[alvoTipo][0]), LAYOUT.pilha[alvoTipo][1]];
      focar((m.x + tx) / 2, (m.y + ty) / 2, 1.0, 2);
      await esperar(0.5);
      for (let k = 0; k < 3; k++) { efeito('raio', tx + (k - 1) * 30, ty + 10, { esc: 1.2 }); await esperar(0.12); }
      particulas_(tx, ty - 30, 22, campo === 'cristais' ? '#8fd8ff' : campo === 'armas' ? '#dde3e8' : '#b07a45', { vel: 240 });
      aoSom('raio');
      impacto();
      esperas.push(sync(ele), sync(quem));
      await esperar(0.5);
      await sumir(m, 0.3);
    } else if (tipo.startsWith('conjurar')) {
      const recurso = { conjurar_madeira: 'madeira', conjurar_cristais: 'cristais', conjurar_armas: 'armas' }[tipo];
      const tipoT = TRABALHADOR_DO_RECURSO[recurso];
      const [px, py] = [mx(quem, LAYOUT.pilha[tipoT][0]), LAYOUT.pilha[tipoT][1]];
      const m = ent('mago_invocando', px + lado(quem) * 110, py + 30, { esc: ESC.castor, flip: quem === 1, sombra: true });
      await surgir(m, 0.3);
      focar(px, py, 1.12);
      aoSom(recurso === 'armas' ? 'metal' : 'feitico');
      const itens = [0, 1, 2].map((k) => ent(`${recurso}_m`, m.x + (k - 1) * 70, m.y - 140, { esc: ESC.recurso * 0.8, camada: 1 }));
      itens.forEach((it) => { surgir(it, 0.3); particulas_(it.x, it.y, 8, '#cff0ff', { sobe: 40 }); });
      await esperar(0.7);
      impacto();
      esperas.push(sync(quem));
      await Promise.all(itens.map((it, k) => esperar(k * 0.12).then(() => voar(it, px, py - 10, 0.6, 80)).then(() => { tirar(it); efeito('brilho_verde', px, py, { esc: 0.8 }); })));
      await sumir(m, 0.3);
    } else if (tipo === 'fadas') {
      const fadas = [0, 1, 2].map((k) => ent('fada', mx(quem, -100 - k * 60), 300 + k * 60, { esc: ESC.especial * 0.8, flip: quem === 1, camada: 2 }));
      focar(eu.cx, eu.cy - 60, 1.1);
      aoSom('feitico');
      await Promise.all(fadas.map((f, k) => andar(f, eu.cx + (k - 1) * 80, eu.cy - 220 + k * 30, 1.6)));
      impacto();
      esperas.push(sync(quem));
      particulas_(eu.cx, eu.cy - 160, 30, '#cff0ff', { vel: 200 });
      await esperar(1.0);
      await Promise.all(fadas.map((f) => andar(f, mx(quem, -150), f.y - 80, 1.2).then(() => tirar(f))));
    } else if (tipo === 'ritual') {
      const m1 = ent('mago_invocando', frente(quem, 200), 650, { esc: ESC.castor, flip: quem === 1, sombra: true });
      await surgir(m1, 0.3);
      aoSom('feitico');
      focar(MUNDO_W / 2, 520, 1.0);
      await esperar(0.7);
      efeito('brilho_verde', eu.cx, eu.cy, { esc: 1.6 });
      for (let k = 0; k < 3; k++) { efeito('raio', dele.cx + (k - 1) * 90, dele.cy, { esc: 1.4 }); await esperar(0.15); }
      aoSom('raio');
      impacto();
      esperas.push(sync(quem), sync(ele));
      await esperar(0.6);
      await sumir(m1, 0.3);
    } else if (tipo === 'recruta') {
      focar(eu.cx, eu.cy + 80, 1.08);
      impacto();
      esperas.push(sync(quem));
      particulas_(eu.cx, eu.cy, 20, c.cor === 'magia' ? '#7cc8ff' : c.cor === 'batalha' ? '#ff8a5c' : '#9be36a', { vel: 260 });
      await esperar(1.2);
    } else {
      // obra: dois construtores trabalhando ao lado do castelo (ou da muralha) enquanto cresce
      const naMuralha = c.efeitos.every((e) => e.campo === 'muralha');
      const bx = naMuralha ? mx(quem, LAYOUT.muro.x) : eu.cx;
      focar(bx, 560, 1.12);
      const ajudantes = [-1, 1].map((s) => ent('construtor_trabalhando', bx + s * (naMuralha ? 70 : 150), 650 + (s > 0 ? 25 : 0), { esc: ESC.castor, flip: s > 0, sombra: true }));
      ajudantes.forEach((a) => surgir(a, 0.3));
      aoSom('carpintaria');
      impacto();
      const dur = sincronizar(quem, estado.jogadores[quem]);
      sincronizados.add(quem);
      const lascas = setInterval(() => ajudantes.forEach((a) => particulas_(a.x + (a.flip ? -40 : 40), a.y - 20, 3, '#c8955a', { vel: 120, vida: 0.5 })), 250);
      await esperar(Math.max(1.3, dur + 0.6));
      clearInterval(lascas);
      ajudantes.forEach((a) => sumir(a, 0.3));
    }

    soltarFoco(0.6);
    impacto();
    for (const i of [0, 1]) if (!sincronizados.has(i)) esperas.push(sync(i));
    await Promise.all(esperas);
  }

  // Começo do turno: cada trabalhador joga um recurso na pilha.
  async function animarProducao(idx, valores) {
    const p = jogadores[idx];
    const esperas = [];
    for (const tipo of TIPOS) {
      const recurso = RECURSO_DO_TIPO[tipo];
      const [px, py] = [mx(idx, LAYOUT.pilha[tipo][0]), LAYOUT.pilha[tipo][1]];
      p.trabalhadores[tipo].forEach((w, k) => {
        esperas.push(esperar(k * 0.15 + TIPOS.indexOf(tipo) * 0.1).then(async () => {
          const it = ent(`${recurso}_p`, w.x, w.y - 70, { esc: ESC.recurso * 0.7, camada: 1 });
          await voar(it, px, py - 10, 0.6, 90);
          tirar(it);
          particulas_(px, py - 20, 4, recurso === 'cristais' ? '#cff0ff' : '#ffe9a8', { vel: 80, sobe: 60 });
        }));
      });
    }
    await Promise.all(esperas);
    trocarPilhas(p, valores);
  }

  // =====================================================================
  //  PRÉVIA da carta arrastada: o que muda em cada lado
  // =====================================================================
  const previa = { ativa: false, rotulos: [], alvos: [] };
  const CAMPOS = ['castelo', 'muralha', 'construtores', 'soldados', 'magos', 'madeira', 'armas', 'cristais'];
  function mostrarPrevia(id, quem, estado) {
    apagarPrevia();
    const c = CARTA_POR_ID[id];
    if (!c) return;
    const antes = estado.jogadores.map((j) => ({ ...j }));
    const depois = estado.jogadores.map((j) => ({ ...j }));
    aplicarEfeitos(c, depois[quem], depois[1 - quem]);
    previa.ativa = true;
    [0, 1].forEach((i) => {
      const linhas = CAMPOS.map((campo) => ({ campo, d: depois[i][campo] - antes[i][campo] })).filter((x) => x.d)
        .map(({ campo, d }) => `<span class="${d > 0 ? 'mais' : 'menos'}">${NOME[campo]} ${d > 0 ? '+' : '−'}${Math.abs(d)}</span>`);
      if (!previa.rotulos[i]) previa.rotulos[i] = rotulo(`previa j${i}`);
      previa.rotulos[i].innerHTML = linhas.join('');
      previa.rotulos[i].style.display = linhas.length ? '' : 'none';
      if (depois[i].castelo < antes[i].castelo || depois[i].muralha < antes[i].muralha) previa.alvos.push(i);
    });
  }
  function apagarPrevia() {
    previa.rotulos.forEach((el) => { if (el) el.style.display = 'none'; });
    previa.alvos.length = 0;
    previa.ativa = false;
  }

  // =====================================================================
  //  LAÇO
  // =====================================================================
  function passo(dt) {
    relogio += dt;
    for (let i = tarefas.length - 1; i >= 0; i--) if (!tarefas[i](dt)) tarefas.splice(i, 1);
    for (const e of entidades) {
      if (e.parado || e.fixoQuadro) continue;
      e.t += dt;
      const n = SPR[e.nome] ? SPR[e.nome].quadros.length : 1;
      const q = Math.floor(e.t * e.fps);
      if (!e.loop && q >= n) { e.quadro = n - 1; if (e.aoFim) { const f = e.aoFim; e.aoFim = null; f(); } } else e.quadro = q % n;
    }
    for (let i = particulas.length - 1; i >= 0; i--) {
      const p = particulas[i];
      p.vida -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 140 * dt;
      if (p.vida <= 0) particulas.splice(i, 1);
    }
    for (const n of nuvens) { n.x += n.vel * dt; if (n.x > MUNDO_W + 400) n.x = -500; }
    // estados: fogo no castelo em perigo, brilho perto da vitória
    jogadores.forEach((p) => {
      if (p.vCastelo > 0 && p.vCastelo < 15 && Math.random() < dt * 3) {
        efeito('fogo', p.cx + (Math.random() - 0.5) * 160, p.cy - 40 - Math.random() * 80, { esc: 0.9 });
        particulas_(p.cx, p.cy - 160, 2, '#4a4540', { vel: 30, sobe: 60, vida: 1.6, tam: 12 });
      }
      if (p.vCastelo >= 85 && Math.random() < dt * 6) particulas_(p.cx + (Math.random() - 0.5) * 260, p.cy - Math.random() * 200, 1, '#ffd43b', { vel: 20, sobe: 70, vida: 1.2 });
    });
    // câmera
    if (foco.ate && relogio >= foco.ate) { foco.zoomAlvo = 1; foco.ate = 0; }
    cam.zoom += (foco.zoomAlvo - cam.zoom) * Math.min(1, dt * 2.5);
    cam.fx += (foco.x - cam.fx) * Math.min(1, dt * 3);
    cam.fy += (foco.y - cam.fy) * Math.min(1, dt * 3);
    cam.tremor = Math.max(0, cam.tremor - dt * 30);
    horaAtual += (horaAlvo - horaAtual) * Math.min(1, dt * 0.6);
  }

  function desenharTudo() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const sx = cam.tremor ? (Math.random() - 0.5) * cam.tremor : 0;
    const sy = cam.tremor ? (Math.random() - 0.5) * cam.tremor : 0;
    ctx.translate(sx, sy);
    // chão (com o zoom da câmera aplicado à imagem do fundo)
    ctx.imageSmoothingEnabled = false;
    // a origem do fundo (0,0 da tela sem zoom) é o ponto do mundo (-ox/k, -oy/k)
    const [x0, y0] = tela(-vista.ox / vista.k, -vista.oy / vista.k);
    ctx.drawImage(fundo, x0, y0, fundo.width * PX * cam.zoom, fundo.height * PX * cam.zoom);
    // alvo da prévia (anel vermelho pulsando sob o que vai levar dano)
    if (previa.ativa) {
      previa.alvos.forEach((i) => {
        const [ax, ay] = alvoAtaque(i);
        const [X, Y] = tela(ax, ay + 40);
        const r = 70 * vista.k * cam.zoom * (1 + Math.sin(relogio * 6) * 0.08);
        ctx.strokeStyle = 'rgba(255,74,58,.9)';
        ctx.lineWidth = Math.max(2, 5 * vista.k);
        ctx.beginPath(); ctx.ellipse(X, Y, r, r * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
      });
    }
    // entidades por camada e por y
    const lista = [...entidades].sort((a, b) => (a.camada || 0) - (b.camada || 0) || (a.chao ? -1 : 0) - (b.chao ? -1 : 0) || a.y - b.y);
    for (const e of lista) {
      let rot = 0;
      if (e.balanca) rot = Math.sin(relogio * 1.2 + e.fase) * 0.02;
      if (rot) {
        const [X, Y] = tela(e.x, e.y);
        ctx.save(); ctx.translate(X, Y); ctx.rotate(rot); ctx.translate(-X, -Y);
        desenhar(e.nome, e.quadro, e.x, e.y + e.dy, e);
        ctx.restore();
      } else desenhar(e.nome, e.quadro, e.x, e.y + e.dy, e);
    }
    // partículas como quadradinhos
    for (const p of particulas) {
      const [X, Y] = tela(p.x, p.y);
      const s = Math.max(2, p.tam * vista.k * cam.zoom);
      ctx.globalAlpha = Math.max(0, p.vida / p.total);
      ctx.fillStyle = p.cor;
      ctx.fillRect(Math.round(X - s / 2), Math.round(Y - s / 2), Math.round(s), Math.round(s));
    }
    ctx.globalAlpha = 1;
    // nuvens e suas sombras
    for (const n of nuvens) desenhar(n.nome, 0, n.x, n.y, { esc: 0.9, alfa: 0.85 });
    // luz do fim do dia
    if (horaAtual > 0.02) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(255,${Math.round(lerp(255, 190, horaAtual))},${Math.round(lerp(255, 140, horaAtual))},1)`;
      ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.globalCompositeOperation = 'source-over';
    }
    posicionarRotulos();
  }

  function posicionarRotulos() {
    const coloca = (el, x, y) => {
      const [X, Y] = tela(x, y);
      el.style.transform = `translate(-50%, -100%) translate(${X}px, ${Y}px)`;
    };
    jogadores.forEach((p, i) => {
      const [, h] = tamanho(p.castelo.nome, ESC.castelo);
      coloca(p.rotCastelo, p.cx, p.cy - h - 6);
      p.rotMuralha.style.display = p.muros.length ? '' : 'none';
      coloca(p.rotMuralha, mx(i, LAYOUT.muro.x), 470);
      if (previa.ativa && previa.rotulos[i]) coloca(previa.rotulos[i], p.cx, p.cy - h - 50);
    });
  }

  let rodando = true;
  let ultimo = performance.now();
  function quadro(agora) {
    if (!rodando) return;
    const dt = Math.min(0.05, (agora - ultimo) / 1000);
    ultimo = agora;
    passo(dt);
    desenharTudo();
    requestAnimationFrame(quadro);
  }
  redimensionar();
  requestAnimationFrame(quadro);

  // =====================================================================
  //  API
  // =====================================================================
  return {
    resetar(estado) {
      apagarPrevia();
      soltarFoco();
      horaAtual = horaAlvo = 0;
      jogadores.forEach((p) => {
        p.estagio = -1;
        p.muros.forEach(tirar); p.muros.length = 0;
        TIPOS.forEach((t) => { p.trabalhadores[t].forEach(tirar); p.trabalhadores[t].length = 0; if (p.pilhas[t]) tirar(p.pilhas[t]); p.pilhas[t] = null; });
      });
      for (const e of [...entidades]) if (e.aoFim) tirar(e);
      particulas.length = 0;
      redimensionar();
      estado.jogadores.forEach((j, i) => sincronizar(i, j));
      return esperar(0.6);
    },
    vez(quem, turno = 1) {
      horaAlvo = Math.min(1, Math.max(0, (turno - 1) / 22));
      foco.x = jogadores[quem].cx * 0.15 + (MUNDO_W / 2) * 0.85;
    },
    producao(quem, estado) { return animarProducao(quem, estado.jogadores[quem]); },
    previa(id, quem, estado) { mostrarPrevia(id, quem, estado); },
    limparPrevia() { apagarPrevia(); },
    atualizar(estado, opcoes = {}) {
      const { aoImpacto = () => {} } = opcoes;
      if (opcoes.carta) return animarCarta(opcoes.carta, opcoes.quem, estado, aoImpacto);
      setTimeout(aoImpacto, 0);
      return Promise.all(estado.jogadores.map((j, i) => esperar(sincronizar(i, j))));
    },
    comemorar(idx) {
      const p = jogadores[idx];
      for (let k = 0; k < 6; k++) setTimeout(() => particulas_(p.cx + (Math.random() - 0.5) * 300, p.cy - 200 - Math.random() * 100, 30, ['#ffd43b', '#4caf50', '#e74c3c', '#4c9fe0', '#ffffff'][k % 5], { vel: 320, sobe: 200, vida: 1.6 }), k * 250);
      TIPOS.forEach((t) => p.trabalhadores[t].forEach((w) => { w.y -= 0; w.nome = t === 'construtores' ? 'construtor_andando' : t === 'soldados' ? 'soldado_golpe' : 'mago_feitico'; }));
    },
    // depuração: avança a simulação N segundos (a aba do preview fica em segundo plano)
    avancar(segundos = 1) {
      for (let i = 0; i < segundos * 60; i++) passo(1 / 60);
      desenharTudo();
    },
    parar() { rodando = false; },
  };
}
