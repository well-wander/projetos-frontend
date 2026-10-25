// Raios azuis de magia desenhados em SVG por cima de um elemento.
// Cada descarga dura alguns décimos de segundo, redesenhando o zigue-zague para parecer eletricidade.

const NS = 'http://www.w3.org/2000/svg';

// Caminho em zigue-zague entre dois pontos (deslocamento do ponto médio, recursivo).
function zigueZague(x1, y1, x2, y2, desvio, nivel) {
  if (nivel === 0) return [[x2, y2]];
  const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * desvio;
  const my = (y1 + y2) / 2 + (Math.random() - 0.5) * desvio;
  return [...zigueZague(x1, y1, mx, my, desvio / 2, nivel - 1), ...zigueZague(mx, my, x2, y2, desvio / 2, nivel - 1)];
}

function caminho(x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const pts = zigueZague(x1, y1, x2, y2, dist * 0.45, 5);
  let d = `M${x1.toFixed(1)},${y1.toFixed(1)}`;
  for (const [x, y] of pts) d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
  // um galho saindo do meio
  const meio = pts[Math.floor(pts.length / 2)];
  const ang = Math.atan2(y2 - y1, x2 - x1) + (Math.random() < 0.5 ? 0.7 : -0.7);
  const gx = meio[0] + Math.cos(ang) * dist * 0.35;
  const gy = meio[1] + Math.sin(ang) * dist * 0.35;
  d += ` M${meio[0].toFixed(1)},${meio[1].toFixed(1)}`;
  for (const [x, y] of zigueZague(meio[0], meio[1], gx, gy, dist * 0.18, 3)) d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
  return d;
}

function pontoNaBorda(w, h) {
  const lado = Math.floor(Math.random() * 4);
  const t = Math.random();
  return [[t * w, 0], [w, t * h], [t * w, h], [0, t * h]][lado];
}

/**
 * Coloca raios num elemento (que precisa ter position relative/absolute).
 * opcoes: { intervalo: [min, max] ms entre descargas, de: [x, y] em 0..1 para sair sempre de um ponto,
 *           espessura, sempre (true = descarga contínua enquanto o elemento existir) }
 * Devolve uma função que para os raios.
 */
export function raiosEm(el, opcoes = {}) {
  const { intervalo = [2200, 5200], de = null, espessura = 2.2, quantos = 2 } = opcoes;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'raios');
  svg.setAttribute('aria-hidden', 'true');
  el.appendChild(svg);
  let parado = false;
  let timer = null;

  function descarga() {
    if (parado || !svg.isConnected) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const passos = 5 + Math.floor(Math.random() * 3);
    let n = 0;
    const desenhar = () => {
      if (parado) return;
      svg.replaceChildren();
      if (n < passos) {
        for (let i = 0; i < quantos; i++) {
          const [x1, y1] = de ? [de[0] * w, de[1] * h] : pontoNaBorda(w, h);
          const [x2, y2] = pontoNaBorda(w, h);
          const d = caminho(x1, y1, x2, y2);
          for (const [classe, larg] of [['brilho', espessura * 4], ['nucleo', espessura]]) {
            const p = document.createElementNS(NS, 'path');
            p.setAttribute('d', d);
            p.setAttribute('class', classe);
            p.setAttribute('stroke-width', larg);
            svg.appendChild(p);
          }
        }
        svg.style.opacity = n % 2 ? 0.55 : 1;
        n++;
        setTimeout(desenhar, 55 + Math.random() * 45);
      } else {
        svg.style.opacity = 0;
        timer = setTimeout(descarga, intervalo[0] + Math.random() * (intervalo[1] - intervalo[0]));
      }
    };
    desenhar();
  }
  timer = setTimeout(descarga, 300 + Math.random() * intervalo[0]);
  return () => { parado = true; clearTimeout(timer); svg.remove(); };
}
