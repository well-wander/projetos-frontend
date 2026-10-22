// Tela de título e cinemáticas em estilo desenho animado (cel shading): contorno grosso,
// sombra chapada e brilho. Tudo desenhado por código numa tela virtual de 1280x720.
(() => {
  'use strict';

  const AU = window.Cobra.audio;
  const VW = 1280;
  const VH = 720;
  const TAU = Math.PI * 2;
  const OUT = '#1d1430';
  const LW = 5;

  const LAND_COLORS = ['#4caf50', '#2f8ae0', '#2a8b4a', '#e07a3a', '#ff8ac8', '#4af0ff', '#f0c860', '#9a6aff', '#ff5a2a', '#ffd84a'];

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (t) => Math.min(1, Math.max(0, t));
  const easeInOut = (t) => { t = clamp01(t); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
  const easeOutBack = (t) => { t = clamp01(t); return 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2); };
  const seq = (t, a, b) => clamp01((t - a) / (b - a));

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ------------------------------------------------------------
  //  kit de desenho em cel shading
  // ------------------------------------------------------------
  function outlineStroke(g, lw = LW) {
    g.lineWidth = lw;
    g.strokeStyle = OUT;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.stroke();
  }

  // forma com base, sombra recortada dentro dela e contorno
  function cel(g, build, base, shade, shadeBuild, lw = LW) {
    g.beginPath(); build(g); g.fillStyle = base; g.fill();
    if (shade && shadeBuild) {
      g.save();
      g.beginPath(); build(g); g.clip();
      g.beginPath(); shadeBuild(g); g.fillStyle = shade; g.fill();
      g.restore();
    }
    if (lw) { g.beginPath(); build(g); outlineStroke(g, lw); }
  }

  // várias bolas unidas (nuvem, copa de árvore, corpo da cobra) com uma sombra só
  function celBlob(g, circles, base, shade, light, lw = LW) {
    g.fillStyle = OUT;
    for (const c of circles) { g.beginPath(); g.arc(c[0], c[1], c[2] + lw, 0, TAU); g.fill(); }
    g.save();
    g.beginPath();
    for (const c of circles) { g.moveTo(c[0] + c[2], c[1]); g.arc(c[0], c[1], c[2], 0, TAU); }
    g.clip();
    for (const c of circles) { g.beginPath(); g.arc(c[0], c[1], c[2], 0, TAU); g.fillStyle = c[3] || shade; g.fill(); }
    for (const c of circles) { g.beginPath(); g.arc(c[0] - c[2] * 0.16, c[1] - c[2] * 0.22, c[2] * 0.96, 0, TAU); g.fillStyle = c[4] || base; g.fill(); }
    if (light) {
      g.fillStyle = light;
      for (const c of circles) { if (c[2] < 10) continue; g.beginPath(); g.ellipse(c[0] - c[2] * 0.38, c[1] - c[2] * 0.42, c[2] * 0.26, c[2] * 0.15, -0.6, 0, TAU); g.fill(); }
    }
    g.restore();
  }

  function sparkle(g, x, y, s, color = '#fff6c0') {
    g.beginPath();
    g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y);
    g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s, y);
    g.quadraticCurveTo(x, y, x, y - s);
    g.fillStyle = color;
    g.fill();
  }

  function glow(g, x, y, r, color, alpha = 1) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, color);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = alpha;
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.globalAlpha = 1;
  }

  // ------------------------------------------------------------
  //  cenário
  // ------------------------------------------------------------
  function sky(g, stops) {
    const gr = g.createLinearGradient(0, -300, 0, 900);
    stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
    g.fillStyle = gr;
    g.fillRect(-800, -800, VW + 1600, VH + 1600);
  }

  function stars(g, t, seed, n) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const x = r() * (VW + 400) - 200;
      const y = r() * 420 - 150;
      const s = 2 + r() * 4;
      const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + r() * 2) + r() * 6);
      g.globalAlpha = 0.4 + tw * 0.6;
      sparkle(g, x, y, s * (0.6 + tw * 0.6), r() < 0.25 ? '#ffe9a0' : '#ffffff');
    }
    g.globalAlpha = 1;
  }

  function sun(g, x, y, t) {
    glow(g, x, y, 190, 'rgba(255,240,160,0.75)');
    g.save();
    g.translate(x, y);
    g.rotate(t * 0.15);
    g.fillStyle = 'rgba(255,236,150,0.45)';
    for (let i = 0; i < 12; i++) {
      g.rotate(TAU / 12);
      g.beginPath(); g.moveTo(-10, 70); g.lineTo(0, 120 + Math.sin(t * 2 + i) * 8); g.lineTo(10, 70); g.fill();
    }
    g.restore();
    cel(g, (p) => p.arc(x, y, 58, 0, TAU), '#ffe36a', '#ffbe3a', (p) => p.arc(x + 22, y + 26, 58, 0, TAU));
  }

  function moon(g, x, y) {
    glow(g, x, y, 170, 'rgba(200,210,255,0.45)');
    cel(g, (p) => p.arc(x, y, 50, 0, TAU), '#f4f0d8', '#cfc8a8', (p) => p.arc(x + 20, y + 20, 50, 0, TAU));
    g.fillStyle = 'rgba(160,150,120,0.5)';
    [[-15, -10, 9], [14, 12, 6], [-4, 20, 5]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill(); });
  }

  function cloud(g, x, y, s, night) {
    const c = [[x - 60 * s, y + 10 * s, 38 * s], [x, y - 12 * s, 52 * s], [x + 62 * s, y + 8 * s, 40 * s], [x + 20 * s, y + 18 * s, 40 * s], [x - 25 * s, y + 20 * s, 36 * s]];
    celBlob(g, c, night ? '#5a5a8a' : '#ffffff', night ? '#3e3e6a' : '#cfe0f5', night ? null : 'rgba(255,255,255,0.9)', 4);
  }

  function hill(g, y0, amp, freq, phase, base, shade) {
    const top = (x) => y0 - amp * Math.sin(x * freq + phase) - amp * 0.35 * Math.sin(x * freq * 2.3 + phase * 1.7);
    const build = (p) => {
      p.moveTo(-800, 1400);
      for (let x = -800; x <= VW + 800; x += 16) p.lineTo(x, top(x));
      p.lineTo(VW + 800, 1400);
      p.closePath();
    };
    cel(g, build, base, shade, (p) => {
      p.moveTo(-800, 1400);
      for (let x = -800; x <= VW + 800; x += 16) p.lineTo(x, top(x) + 26 + amp * 0.3 * Math.sin(x * 0.01));
      p.lineTo(VW + 800, 1400);
      p.closePath();
    }, 0);
    g.beginPath();
    for (let x = -800; x <= VW + 800; x += 16) { if (x === -800) g.moveTo(x, top(x)); else g.lineTo(x, top(x)); }
    outlineStroke(g, LW);
    return top;
  }

  function bigHill(g, cx, topY, w, base, shade) {
    const build = (p) => { p.moveTo(cx - w, 900); p.bezierCurveTo(cx - w * 0.6, topY - 10, cx + w * 0.6, topY - 10, cx + w, 900); p.closePath(); };
    cel(g, build, base, shade, (p) => { p.moveTo(cx - w * 0.2, 900); p.bezierCurveTo(cx + w * 0.1, topY + 40, cx + w * 0.7, topY + 30, cx + w + 20, 900); p.closePath(); });
  }

  function tree(g, x, y, s, t, crown, crownShade, fruit, grey) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    cel(g, (p) => { p.moveTo(-14, 0); p.lineTo(-10, -90); p.lineTo(10, -90); p.lineTo(16, 0); p.closePath(); }, '#8a5a34', '#6a4024', (p) => { p.rect(2, -95, 20, 100); });
    g.rotate(Math.sin(t * 1.3 + x) * 0.03);
    const c = [[-40, -110, 42], [0, -140, 52], [42, -108, 40], [0, -95, 44], [-22, -150, 34], [26, -150, 32]];
    celBlob(g, c, crown, crownShade, 'rgba(255,255,255,0.25)');
    if (fruit) {
      [[-36, -100], [18, -132], [40, -96], [-6, -160], [-12, -86]].forEach(([fx, fy], i) => {
        celBlob(g, [[fx, fy, 9]], grey ? '#9a9a9a' : fruit[i % fruit.length], grey ? '#6a6a6a' : 'rgba(0,0,0,0.25)', 'rgba(255,255,255,0.7)', 3);
      });
    }
    g.restore();
  }

  function flowers(g, t, seed, y0, n) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const x = r() * (VW + 200) - 100;
      const y = y0 + r() * 120;
      const sw = Math.sin(t * 2 + i) * 4;
      g.beginPath(); g.moveTo(x, y + 20); g.quadraticCurveTo(x + sw, y + 10, x + sw, y);
      outlineStroke(g, 5);
      g.beginPath(); g.moveTo(x, y + 20); g.quadraticCurveTo(x + sw, y + 10, x + sw, y);
      g.strokeStyle = '#3a9a3a'; g.lineWidth = 2.5; g.stroke();
      const col = ['#ff5d9e', '#ffd84a', '#ffffff', '#b07bff', '#4af0ff'][i % 5];
      const petals = [];
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + t * 0.5; petals.push([x + sw + Math.cos(a) * 6, y + Math.sin(a) * 6, 5]); }
      celBlob(g, petals, col, 'rgba(0,0,0,0.15)', null, 3);
      celBlob(g, [[x + sw, y, 3.5]], '#ffb02e', '#e08a00', null, 2);
    }
  }

  function grassTufts(g, t, seed, y0, n) {
    const r = rng(seed);
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = r() * (VW + 300) - 150;
      const y = y0 + r() * 140;
      const sw = Math.sin(t * 1.8 + x * 0.05) * 5;
      for (const k of [-1, 0, 1]) {
        g.beginPath(); g.moveTo(x + k * 6, y); g.quadraticCurveTo(x + k * 8 + sw * 0.5, y - 10, x + k * 10 + sw, y - 22 - (k === 0 ? 8 : 0));
        g.lineWidth = 6; g.strokeStyle = OUT; g.stroke();
        g.lineWidth = 3; g.strokeStyle = '#5fc04a'; g.stroke();
      }
    }
  }

  // pomar completo (dia ou noite)
  function orchard(g, t, o) {
    o = o || {};
    if (o.night) {
      sky(g, ['#0d0a2a', '#1c1650', '#3a2a74', '#5a3a7a']);
      stars(g, t, 3, 70);
      moon(g, 1040, 110);
      cloud(g, 200 + ((t * 10) % 1700) - 300, 140, 0.8, true);
      cloud(g, 820 + ((t * 6) % 1700) - 300, 70, 0.6, true);
    } else {
      sky(g, ['#4fb4ff', '#8fd6ff', '#ffe0f0', '#ffe2b0']);
      sun(g, 1050, 120, t);
      cloud(g, 180 + ((t * 14) % 1700) - 300, 150, 0.9);
      cloud(g, 700 + ((t * 9) % 1700) - 300, 80, 0.7);
      cloud(g, 1300 + ((t * 11) % 1700) - 300, 200, 0.6);
    }
    hill(g, 470, 30, 0.004, 0.5, o.night ? '#2f4a6a' : '#8fd18a', o.night ? '#243a56' : '#73b870');
    bigHill(g, 640, 300, 360, o.night ? '#2f5a40' : '#5cbf55', o.night ? '#22442f' : '#45a046');
    tree(g, 150, 600, 1.2, t, o.night ? '#24543a' : '#3fae4a', o.night ? '#183a28' : '#2d8a3a', o.fruit !== false ? ['#e8393f', '#ffd84a', '#ff9a3c'] : null, o.night && o.greyFruit);
    tree(g, 330, 560, 0.9, t, o.night ? '#285c3e' : '#4cba52', o.night ? '#1a402c' : '#34923e', ['#e8393f', '#b07bff']);
    tree(g, 960, 570, 1.0, t, o.night ? '#24543a' : '#3fae4a', o.night ? '#183a28' : '#2d8a3a', ['#ffd84a', '#e8393f']);
    tree(g, 1150, 610, 1.25, t, o.night ? '#285c3e' : '#4cba52', o.night ? '#1a402c' : '#34923e', ['#4af0ff', '#e8393f', '#ff9a3c']);
    hill(g, 620, 18, 0.006, 2, o.night ? '#2a4a34' : '#6cc95e', o.night ? '#1e3a28' : '#54ae4c');
    grassTufts(g, t, 8, 600, 26);
    if (!o.night) flowers(g, t, 4, 610, 16);
  }

  // ------------------------------------------------------------
  //  personagens
  // ------------------------------------------------------------
  function greatApple(g, x, y, r, t, o) {
    o = o || {};
    if (o.glow !== false) {
      glow(g, x, y, r * 3.2, 'rgba(255,230,140,0.8)', 0.9);
      g.save();
      g.translate(x, y);
      g.rotate(t * 0.4);
      g.fillStyle = 'rgba(255,240,170,0.35)';
      for (let i = 0; i < 14; i++) {
        g.rotate(TAU / 14);
        g.beginPath(); g.moveTo(-r * 0.12, r * 1.2); g.lineTo(0, r * (2.2 + 0.25 * Math.sin(t * 3 + i))); g.lineTo(r * 0.12, r * 1.2); g.fill();
      }
      g.restore();
    }
    // cabinho
    g.beginPath(); g.moveTo(x, y - r * 0.6); g.quadraticCurveTo(x + r * 0.05, y - r * 1.05, x + r * 0.22, y - r * 1.25);
    g.lineWidth = r * 0.16 + LW * 2; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke();
    g.lineWidth = r * 0.16; g.strokeStyle = '#7a4a2a'; g.stroke();
    // folha balançando
    g.save();
    g.translate(x + r * 0.15, y - r * 0.95);
    g.rotate(-0.5 + Math.sin(t * 2) * 0.12);
    cel(g, (p) => p.ellipse(r * 0.42, 0, r * 0.45, r * 0.2, 0, 0, TAU), '#62c84f', '#3a8f3a', (p) => p.rect(0, 0, r, r));
    g.beginPath(); g.moveTo(r * 0.05, 0); g.lineTo(r * 0.75, 0); g.lineWidth = 2.5; g.strokeStyle = '#2a6a2a'; g.stroke();
    g.restore();
    // corpo
    celBlob(g, [[x - r * 0.33, y, r * 0.78], [x + r * 0.33, y, r * 0.78], [x, y + r * 0.22, r * 0.75]], o.base || '#e8393f', o.shade || '#a8203a', null);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath(); g.ellipse(x - r * 0.48, y - r * 0.28, r * 0.17, r * 0.3, 0.5, 0, TAU); g.fill();
    g.beginPath(); g.arc(x - r * 0.62, y + r * 0.08, r * 0.07, 0, TAU); g.fill();
    if (o.glow !== false) {
      for (let i = 0; i < 5; i++) {
        const a = t * 0.8 + i * 1.3;
        const tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 2);
        sparkle(g, x + Math.cos(a) * r * 1.7, y + Math.sin(a) * r * 1.4, 6 + tw * 8);
      }
    }
  }

  // pontos do corpo de uma cobra rastejando (cabeça em x,y, corpo para trás)
  function slither(x, y, n, spacing, t, amp, angle = 0, still = false) {
    const pts = [];
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    for (let i = 0; i < n; i++) {
      const s = i * spacing;
      const off = still ? Math.sin(t * 2 - i * 0.45) * amp * 0.3 * Math.min(1, i / 4) : Math.sin(t * 7 - i * 0.45) * amp * Math.min(1, i / 4);
      pts.push({ x: x - ca * s - sa * off, y: y - sa * s + ca * off });
    }
    return pts;
  }

  function heroSnake(g, pts, r, t, o) {
    o = o || {};
    const n = pts.length;
    const rad = (i) => Math.max(r * 0.32, r * (0.92 - (i / n) * 0.6));
    const hue = (i) => (i * 14 + t * 70) % 360;
    const circles = [];
    for (let i = n - 1; i >= 1; i--) {
      const h = hue(i);
      circles.push([pts[i].x, pts[i].y, rad(i), `hsl(${h} 75% 40%)`, `hsl(${h} 90% 58%)`]);
    }
    celBlob(g, circles, null, null, 'rgba(255,255,255,0.45)');

    // cabeça
    const h0 = pts[0];
    const h1 = pts[1] || { x: h0.x - 10, y: h0.y };
    const ang = o.angle !== undefined ? o.angle : Math.atan2(h0.y - h1.y, h0.x - h1.x);
    g.save();
    g.translate(h0.x, h0.y);
    g.rotate(ang);
    const hc = `hsl(${hue(0)} 90% 58%)`;
    const hs = `hsl(${hue(0)} 75% 40%)`;
    // língua
    if (o.tongue !== false && (t % 1.6) < 0.25) {
      g.beginPath(); g.moveTo(r * 1.1, 0); g.lineTo(r * 1.7, 0); g.lineTo(r * 1.95, -r * 0.18); g.moveTo(r * 1.7, 0); g.lineTo(r * 1.95, r * 0.18);
      g.lineWidth = 9; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke();
      g.lineWidth = 4; g.strokeStyle = '#ff3b5c'; g.stroke();
    }
    celBlob(g, [[0, 0, r * 1.15, hs, hc]], hc, hs, 'rgba(255,255,255,0.5)');
    // bochechas
    g.fillStyle = 'rgba(255,120,160,0.7)';
    g.beginPath(); g.ellipse(r * 0.15, -r * 0.72, r * 0.22, r * 0.12, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(r * 0.15, r * 0.72, r * 0.22, r * 0.12, 0, 0, TAU); g.fill();
    // sorriso
    g.beginPath(); g.arc(r * 0.75, 0, r * 0.28, -0.9, 0.9); g.lineWidth = 3.5; g.strokeStyle = OUT; g.stroke();
    // olhos
    const look = o.look || 0;
    const blink = (t % 3.3) < 0.12;
    for (const s of [-1, 1]) {
      const ex = r * 0.45;
      const ey = s * r * 0.48;
      if (blink) {
        g.beginPath(); g.moveTo(ex - r * 0.2, ey); g.lineTo(ex + r * 0.2, ey); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke();
        continue;
      }
      cel(g, (p) => p.ellipse(ex, ey, r * 0.3, r * 0.34, 0, 0, TAU), '#ffffff', '#dfe6ff', (p) => p.rect(ex - r, ey + r * 0.12, r * 2, r), 3.5);
      const pxx = ex + Math.cos(look) * r * 0.1;
      const pyy = ey + Math.sin(look) * r * 0.12;
      g.fillStyle = OUT; g.beginPath(); g.ellipse(pxx, pyy, r * 0.15, r * 0.19, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(pxx - r * 0.05, pyy - r * 0.07, r * 0.06, 0, TAU); g.fill();
    }
    g.restore();
  }

  function crowWing(g, flap, color, shade) {
    g.save();
    g.translate(8, -18);
    g.rotate(-0.25 - flap * 0.9);
    cel(g, (p) => {
      p.moveTo(-10, 0);
      p.quadraticCurveTo(-20, -60, 20, -110);
      p.lineTo(30, -88); p.lineTo(48, -100); p.lineTo(52, -72); p.lineTo(70, -76); p.lineTo(62, -45); p.lineTo(80, -40);
      p.quadraticCurveTo(60, 0, 30, 12);
      p.closePath();
    }, color, shade, (p) => p.rect(20, -40, 80, 60));
    g.restore();
  }

  // Corvo Cinzento (olha para a esquerda; flip olha para a direita)
  function crowChar(g, x, y, s, t, o) {
    o = o || {};
    const flap = Math.sin(t * (o.flap || 11));
    g.save();
    g.translate(x, y);
    g.scale(o.flip ? -s : s, s);
    g.rotate(o.tilt || 0);
    crowWing(g, flap, '#2c2a44', '#22203a');
    cel(g, (p) => { p.moveTo(40, -8); p.lineTo(108, -32); p.lineTo(114, -6); p.lineTo(104, 22); p.lineTo(40, 18); p.closePath(); }, '#34324e', '#26243e', (p) => p.rect(40, 5, 80, 30));
    if (o.carry) o.carry(g);
    g.beginPath(); g.moveTo(-6, 30); g.lineTo(-12, 52); g.moveTo(10, 30); g.lineTo(8, 52);
    g.lineWidth = 9; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke();
    g.lineWidth = 4; g.strokeStyle = '#ffb02e'; g.stroke();
    cel(g, (p) => p.ellipse(0, 0, 60, 38, 0, 0, TAU), '#4a4768', '#2f2d48', (p) => p.ellipse(18, 22, 64, 34, 0, 0, TAU));
    cel(g, (p) => p.ellipse(-8, 12, 28, 16, 0, 0, TAU), '#5e5a80', null, null, 0);
    // cabeça
    cel(g, (p) => p.arc(-52, -24, 30, 0, TAU), '#4a4768', '#2f2d48', (p) => p.arc(-40, -10, 30, 0, TAU));
    // bico
    cel(g, (p) => { p.moveTo(-74, -34); p.lineTo(-122, -20); p.lineTo(-76, -10); p.closePath(); }, '#ffb02e', '#e07a10', (p) => { p.moveTo(-74, -22); p.lineTo(-122, -20); p.lineTo(-76, -6); p.closePath(); }, 4);
    // olho bravo
    cel(g, (p) => p.ellipse(-58, -30, 10, 9, 0, 0, TAU), '#ffffff', null, null, 3.5);
    g.fillStyle = '#e8203a'; g.beginPath(); g.arc(-61, -29, 5, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-63, -31, 1.8, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-74, -46); g.lineTo(-44, -38); g.lineWidth = 8; g.strokeStyle = OUT; g.stroke();
    crowWing(g, flap * 0.9 + 0.15, '#3c3a5a', '#2a2846');
    if (o.surprised) {
      g.save(); g.scale(o.flip ? -1 : 1, 1);
      g.font = '90px Bangers, sans-serif';
      g.textAlign = 'center';
      g.lineWidth = 10; g.strokeStyle = OUT; g.strokeText('!', o.flip ? 40 : -40, -80);
      g.fillStyle = '#ffd84a'; g.fillText('!', o.flip ? 40 : -40, -80);
      g.restore();
    }
    g.restore();
  }

  function seedOrb(g, x, y, color, t, i) {
    glow(g, x, y, 34, color, 0.6);
    celBlob(g, [[x, y, 11]], color, 'rgba(0,0,0,0.25)', 'rgba(255,255,255,0.8)', 4);
    sparkle(g, x + 12, y - 12, 4 + 3 * Math.sin(t * 8 + i));
  }

  function tower(g, x, y, s) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    cel(g, (p) => { p.moveTo(-180, 400); p.lineTo(-120, 120); p.lineTo(140, 110); p.lineTo(200, 400); p.closePath(); }, '#3a3450', '#2a2540', (p) => p.rect(20, 100, 200, 320));
    cel(g, (p) => { p.rect(-70, -260, 140, 380); }, '#5a5470', '#423c58', (p) => p.rect(10, -270, 80, 400));
    g.strokeStyle = 'rgba(29,20,48,0.5)'; g.lineWidth = 3;
    for (let yy = -230; yy < 110; yy += 34) { g.beginPath(); g.moveTo(-70, yy); g.lineTo(70, yy); g.stroke(); }
    cel(g, (p) => { p.moveTo(-95, -260); p.lineTo(0, -380); p.lineTo(95, -260); p.closePath(); }, '#6a3a6a', '#4a2a50', (p) => p.rect(0, -400, 120, 160));
    cel(g, (p) => { p.moveTo(-18, -150); p.lineTo(-18, -190); p.quadraticCurveTo(0, -215, 18, -190); p.lineTo(18, -150); p.closePath(); }, '#ffd84a', '#e0a020', (p) => p.rect(0, -220, 30, 80), 4);
    g.restore();
  }

  function parchment(g) {
    sky(g, ['#2a1840', '#3a2050']);
    const build = (p) => { p.moveTo(60, 60); p.lineTo(1220, 50); p.lineTo(1230, 670); p.lineTo(50, 675); p.closePath(); };
    cel(g, build, '#f4e2b4', '#e2c88e', (p) => { p.rect(40, 560, 1220, 140); p.rect(1120, 40, 140, 660); }, 6);
    g.strokeStyle = 'rgba(160,120,60,0.25)';
    g.lineWidth = 2;
    const r = rng(77);
    for (let i = 0; i < 14; i++) { g.beginPath(); const x = 90 + r() * 1100; const y = 90 + r() * 540; g.moveTo(x, y); g.quadraticCurveTo(x + 40, y + 10, x + 80, y - 6); g.stroke(); }
  }

  // ------------------------------------------------------------
  //  cenas
  // ------------------------------------------------------------
  const MAP_NODES = [
    [150, 560], [270, 470], [230, 340], [370, 260], [500, 330], [620, 230], [760, 300], [860, 190], [980, 270], [1090, 150],
  ];

  const SCENES = {
    title: [{
      text: '',
      cam: (t) => ({ x: 640, y: 360, z: 1.02 + Math.sin(t * 0.3) * 0.02 }),
      world(g, t) { orchard(g, t, { night: true }); },
      fx(g, t) {
        greatApple(g, 640, 250 + Math.sin(t * 1.6) * 8, 70, t);
        const r = rng(31);
        for (let i = 0; i < 22; i++) {
          const x = (r() * VW + t * (10 + r() * 20)) % VW;
          const y = 380 + r() * 300 + Math.sin(t * 2 + i) * 14;
          glow(g, x, y, 16, 'rgba(255,240,120,0.9)', 0.5 + 0.5 * Math.sin(t * 3 + i));
        }
        const hx = ((t * 160) % 1900) - 300;
        heroSnake(g, slither(hx, 640, 26, 13, t, 14), 26, t);
      },
    }],

    intro: [
      {
        text: 'No Pomar Arco-Íris, a Grande Maçã brilhava no alto da colina e dava cor a tudo o que existia.',
        cam: (t) => ({ x: 640, y: lerp(380, 300, easeInOut(t / 9)), z: lerp(1, 1.18, easeInOut(t / 9)) }),
        world(g, t) { orchard(g, t, {}); },
        fx(g, t) {
          greatApple(g, 640, 235 + Math.sin(t * 1.6) * 8, 72, t);
          for (let i = 0; i < 2; i++) {
            const bx = 300 + i * 600 + Math.sin(t * 0.7 + i) * 120;
            const by = 380 + Math.sin(t * 1.3 + i * 2) * 40;
            const w = Math.abs(Math.sin(t * 14 + i));
            celBlob(g, [[bx - 10 * w, by, 9], [bx + 10 * w, by, 9]], i ? '#ffd84a' : '#ff8ac8', 'rgba(0,0,0,0.2)', null, 3);
          }
        },
      },
      {
        text: 'Até que, numa noite escura, o Corvo Cinzento, que odiava cores, roubou a Grande Maçã.',
        cam: (t, s) => {
          const shake = t > 2.05 && t < 2.5 ? Math.sin(t * 90) * 10 : 0;
          return { x: 640 + shake + (s.cx ? Math.max(-110, Math.min(110, (s.cx - 640) * 0.25)) : 0), y: 330, z: 1.05 };
        },
        world(g, t) { orchard(g, t, { night: true }); },
        fx(g, t, s) {
          if (!s.cawed && t > 0.4) { s.cawed = true; AU.sfx.caw(); }
          let cx;
          let cy;
          let tilt = 0;
          if (t < 2.0) {
            const k = easeInOut(t / 2.0);
            cx = lerp(1500, 690, k);
            cy = lerp(60, 140, k) - Math.sin(k * Math.PI) * 60;
            tilt = -0.15;
          } else if (t < 2.5) {
            cx = 690; cy = 140 + Math.sin(t * 12) * 4;
          } else {
            const k = easeInOut((t - 2.5) / 2.2);
            cx = lerp(690, -400, k); cy = lerp(140, -260, k); tilt = 0.2;
          }
          s.cx = cx;
          const holding = t >= 2.15;
          if (!holding) greatApple(g, 640, 235 + Math.sin(t * 1.6) * 8, 72, t);
          if (t > 2.05 && !s.flash) { s.flash = true; AU.sfx.rotten(); }
          if (t > 2.05 && t < 2.35) { g.fillStyle = `rgba(255,255,255,${0.7 * (1 - (t - 2.05) / 0.3)})`; g.fillRect(-500, -500, 2400, 1800); }
          crowChar(g, cx, cy, 1.05, t, {
            tilt,
            carry: holding ? (gg) => greatApple(gg, -4, 95, 44, t, { glow: false }) : null,
          });
          if (t > 2.1 && t < 5) {
            const r = rng(9);
            for (let i = 0; i < 8; i++) {
              const ft = t - 2.1 - r() * 0.3;
              if (ft < 0) continue;
              const fx = 690 + (r() - 0.5) * 200 + Math.sin(ft * 3 + i) * 30;
              const fy = 150 + ft * 110;
              g.save(); g.translate(fx, fy); g.rotate(Math.sin(ft * 4 + i));
              cel(g, (p) => p.ellipse(0, 0, 16, 6, 0, 0, TAU), '#4a4768', null, null, 3);
              g.restore();
            }
          }
        },
      },
      {
        text: 'Ele partiu a maçã em sementes e as espalhou por dez terras distantes. Sem ela, o mundo inteiro ficou cinza.',
        grey: (t) => easeInOut(seq(t, 0.3, 2.2)),
        cam: (t) => ({ x: lerp(560, 720, easeInOut(t / 8)), y: 330, z: 1.0 }),
        world(g, t) { orchard(g, t, { night: true }); },
        fx(g, t) {
          crowChar(g, lerp(200, -200, t / 6), lerp(110, 40, t / 6), lerp(0.5, 0.3, t / 6), t, {});
          for (let i = 0; i < 10; i++) {
            const tt = Math.max(0, t - 0.2 - i * 0.07);
            const vx = 140 + i * 95;
            const x0 = 200;
            const y0 = 110;
            const pos = (k) => ({ x: x0 + vx * k * 0.9, y: y0 - 260 * k + 300 * k * k });
            const kk = Math.min(tt, 1.6);
            for (let j = 1; j <= 8; j++) {
              const p = pos(Math.max(0, kk - j * 0.04));
              g.globalAlpha = 0.5 * (1 - j / 8);
              g.fillStyle = LAND_COLORS[i];
              g.beginPath(); g.arc(p.x, p.y, 9 - j, 0, TAU); g.fill();
            }
            g.globalAlpha = 1;
            const p = pos(kk);
            seedOrb(g, p.x, p.y, LAND_COLORS[i], t, i);
          }
        },
      },
      {
        text: 'Só uma criatura escapou com suas cores: uma pequena cobrinha. Você!',
        grey: () => 1,
        cam: (t) => {
          const k = easeInOut(seq(t, 2.2, 4.5));
          return { x: lerp(640, 560, k), y: lerp(360, 520, k), z: lerp(1, 1.7, k) };
        },
        world(g, t) { orchard(g, t, { night: true, greyFruit: true }); },
        fx(g, t) {
          const k = easeOut(seq(t, 0, 2.4));
          const hx = lerp(-250, 600, k);
          const moving = k < 0.98;
          const pts = slither(hx, 600, 26, 12, t, 13, 0, !moving);
          if (!moving) {
            glow(g, hx - 120, 590, 260, 'rgba(255,200,255,0.35)');
            for (let i = 0; i < 8; i++) {
              const a = t * 1.2 + (i / 8) * TAU;
              const tw = 0.5 + 0.5 * Math.sin(t * 5 + i);
              sparkle(g, hx - 110 + Math.cos(a) * 200, 570 + Math.sin(a) * 70, 6 + tw * 10, LAND_COLORS[i]);
            }
          }
          heroSnake(g, pts, 26, t, { look: moving ? 0 : Math.sin(t * 1.5) * 2 });
        },
      },
      {
        text: 'Em cada terra, as sementes viraram maçãs. Coma todas, devolva as cores ao mundo... e enfrente o Corvo na torre!',
        cam: (t) => {
          const k = easeInOut(t / 9);
          return { x: lerp(560, 720, k), y: lerp(390, 340, k), z: 1.08 };
        },
        world(g) { parchment(g); },
        fx(g, t) {
          // caminho tracejado
          g.setLineDash([16, 14]);
          g.lineDashOffset = -t * 30;
          g.beginPath();
          MAP_NODES.forEach(([x, y], i) => { if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); });
          g.lineWidth = 6; g.strokeStyle = '#a06a3a'; g.stroke();
          g.setLineDash([]);
          const lit = Math.min(10, Math.floor(t * 1.5));
          MAP_NODES.forEach(([x, y], i) => {
            const on = i < lit;
            const pop = on ? easeOutBack(seq(t, i / 1.5, i / 1.5 + 0.4)) : 1;
            celBlob(g, [[x, y, 26 * pop]], on ? LAND_COLORS[i] : '#9a9a9a', on ? 'rgba(0,0,0,0.25)' : '#7a7a7a', 'rgba(255,255,255,0.5)', 5);
            g.font = '30px Bangers, sans-serif';
            g.textAlign = 'center'; g.textBaseline = 'middle';
            g.lineWidth = 6; g.strokeStyle = OUT; g.strokeText(String(i + 1), x, y + 2);
            g.fillStyle = '#ffffff'; g.fillText(String(i + 1), x, y + 2);
          });
          tower(g, 1150, 330, 0.42);
          crowChar(g, 1150, 140 + Math.sin(t * 2) * 6, 0.45, t, { flap: 5 });
          const hop = Math.abs(Math.sin(t * 4)) * 26;
          heroSnake(g, slither(150, 512 - hop, 6, 10, t, 3, 0, true), 15, t, { angle: 0 });
        },
      },
      {
        text: 'Sua jornada começa na Colina do Pomar. Boa sorte!',
        logo: true,
        cam: (t) => ({ x: 640, y: 380, z: lerp(1.15, 1.0, easeOut(t / 3)) }),
        world(g, t) {
          sky(g, ['#0d0a2a', '#241a5a', '#4a2a7a', '#7a3a7a']);
          stars(g, t, 21, 80);
          hill(g, 560, 20, 0.005, 1, '#2f5a40', '#22442f');
        },
        fx(g, t) {
          greatApple(g, 700, 390 + Math.sin(t * 1.5) * 8, 80, t);
          heroSnake(g, slither(lerp(250, 520, easeOut(t / 2)), 520, 24, 12, t, 10, 0, t > 2), 26, t, { look: -0.4 });
        },
      },
    ],

    ending: [
      {
        text: 'Na Torre do Corvo, as dez sementes se juntaram de novo...',
        cam: (t) => ({ x: 640, y: lerp(420, 330, easeInOut(t / 5)), z: lerp(1, 1.12, easeInOut(t / 5)) }),
        world(g, t) {
          sky(g, ['#1a0f3a', '#3a1f5a', '#7a3a6a', '#c86a5a']);
          stars(g, t, 33, 50);
          tower(g, 640, 360, 0.9);
        },
        fx(g, t, s) {
          const k = easeInOut(seq(t, 0, 2.6));
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU + t * 2;
            const r = 620 * (1 - k);
            seedOrb(g, 640 + Math.cos(a) * r, 140 + Math.sin(a) * r * 0.55, LAND_COLORS[i], t, i);
          }
          if (t > 2.6) {
            if (!s.flash) { s.flash = true; AU.sfx.unlocked(); }
            const f = 1 - seq(t, 2.6, 3.1);
            greatApple(g, 640, 140, 70 * easeOutBack(seq(t, 2.6, 3.2)), t);
            if (f > 0) { g.fillStyle = `rgba(255,255,255,${f})`; g.fillRect(-500, -500, 2400, 1800); }
          }
          const fk = easeInOut(seq(t, 3.0, 5.0));
          crowChar(g, lerp(700, 1600, fk), lerp(10, -300, fk) + (t > 2.6 && t < 3 ? -40 * Math.sin((t - 2.6) * 8) : 0), 0.7, t, { flip: true, surprised: t > 2.6, flap: t > 2.8 ? 16 : 6 });
        },
      },
      {
        text: '...e a Grande Maçã voltou a brilhar! O Corvo fugiu e as cores voltaram para todas as terras.',
        grey: (t) => 1 - easeInOut(seq(t, 0.2, 2.2)),
        cam: (t) => ({ x: 640, y: 340, z: lerp(1.2, 1.0, easeInOut(t / 4)) }),
        world(g, t) { orchard(g, t, {}); },
        fx(g, t, s) {
          greatApple(g, 640, 235 + Math.sin(t * 1.6) * 8, 72, t);
          heroSnake(g, slither(520, 330, 22, 11, t, 8, 0.35, true), 22, t, { look: -0.6 });
          s.fw = s.fw || [];
          if (!s.next || t > s.next) {
            s.next = t + 0.5;
            s.fw.push({ x: 150 + Math.random() * 980, y: 60 + Math.random() * 180, t0: t, c: LAND_COLORS[Math.floor(Math.random() * 10)] });
            AU.sfx.pop(Math.floor(Math.random() * 6));
          }
          for (const f of s.fw) {
            const a = t - f.t0;
            if (a > 1.2) continue;
            const r = easeOut(a / 1.2) * 110;
            g.globalAlpha = 1 - a / 1.2;
            for (let i = 0; i < 14; i++) {
              const ang = (i / 14) * TAU;
              const x1 = f.x + Math.cos(ang) * r * 0.6;
              const y1 = f.y + Math.sin(ang) * r * 0.6 + a * a * 30;
              const x2 = f.x + Math.cos(ang) * r;
              const y2 = f.y + Math.sin(ang) * r + a * a * 30;
              g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
              g.lineWidth = 9; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke();
              g.lineWidth = 5; g.strokeStyle = f.c; g.stroke();
            }
            g.globalAlpha = 1;
          }
        },
      },
      {
        text: 'FIM. Obrigado por jogar, pequena cobrinha!',
        logo: true,
        cam: (t) => ({ x: 640, y: 380, z: 1.0 + Math.sin(t * 0.5) * 0.02 }),
        world(g, t) {
          sky(g, ['#ff9a6a', '#ffb88a', '#ffd8b0', '#fff0d0']);
          sun(g, 640, 560, t);
          hill(g, 550, 24, 0.005, 1, '#6cc95e', '#54ae4c');
          flowers(g, t, 12, 570, 18);
        },
        fx(g, t) {
          greatApple(g, 720, 400 + Math.sin(t * 1.4) * 6, 70, t);
          heroSnake(g, slither(590, 520, 26, 12, t, 10, -0.15, true), 26, t, { look: -0.5 });
          for (let i = 0; i < 8; i++) {
            const k = (t * 0.25 + i / 8) % 1;
            const x = 640 + Math.sin(i * 3 + t) * 260;
            const y = 640 - k * 520;
            g.globalAlpha = 1 - k;
            g.save(); g.translate(x, y); g.scale(0.9 + 0.3 * Math.sin(t * 4 + i), 0.9 + 0.3 * Math.sin(t * 4 + i));
            cel(g, (p) => { p.moveTo(0, 10); p.bezierCurveTo(-26, -8, -10, -26, 0, -12); p.bezierCurveTo(10, -26, 26, -8, 0, 10); }, '#ff5d9e', '#d03a7a', (p) => p.rect(0, -30, 30, 50), 4);
            g.restore();
          }
          g.globalAlpha = 1;
        },
      },
    ],
  };

  // ------------------------------------------------------------
  //  controle
  // ------------------------------------------------------------
  let el, worldCv, fxCv, wg, fg, textEl, boxEl, skipBtn, logoEl, pressEl;
  let run = null;
  let lastGrey = -1;

  function init() {
    el = document.getElementById('story');
    worldCv = document.getElementById('storyWorld');
    fxCv = document.getElementById('storyFx');
    textEl = document.getElementById('storyText');
    boxEl = document.getElementById('storyBox');
    skipBtn = document.getElementById('storySkip');
    logoEl = document.getElementById('storyLogo');
    pressEl = document.getElementById('storyPress');
    wg = worldCv.getContext('2d');
    fg = fxCv.getContext('2d');

    el.addEventListener('click', advance);
    skipBtn.addEventListener('click', (e) => { e.stopPropagation(); finish(); });
    window.addEventListener('keydown', (e) => {
      if (!run) return;
      e.stopImmediatePropagation();
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advance(); }
      else if (e.key === 'Escape') finish();
    }, true);
    window.addEventListener('resize', size);
  }

  function size() {
    const r = worldCv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(320, Math.round(r.width * dpr));
    const h = Math.round((w * 9) / 16);
    if (worldCv.width !== w) {
      worldCv.width = fxCv.width = w;
      worldCv.height = fxCv.height = h;
    }
  }

  function show(i) {
    run.idx = i;
    run.t0 = performance.now();
    run.state = {};
    const sc = run.scenes[i];
    run.full = sc.text;
    run.typed = 0;
    run.doneAt = 0;
    boxEl.hidden = !sc.text;
    textEl.textContent = '';
    logoEl.classList.toggle('show', !!sc.logo || run.kind === 'title');
  }

  function advance() {
    if (!run) return;
    if (run.kind === 'title') { finish(); return; }
    if (run.typed < run.full.length) { run.typed = run.full.length; textEl.textContent = run.full; return; }
    if (run.idx + 1 < run.scenes.length) show(run.idx + 1);
    else finish();
  }

  function finish() {
    if (!run) return;
    const done = run.onDone;
    run = null;
    el.classList.remove('show');
    if (done) done();
  }

  function applyCam(g, cam) {
    const S = g.canvas.width / VW;
    const z = cam.z * S;
    g.setTransform(z, 0, 0, z, g.canvas.width / 2 - cam.x * z, g.canvas.height / 2 - cam.y * z);
  }

  function frame(now) {
    if (!run) return;
    const t = (now - run.t0) / 1000;
    const sc = run.scenes[run.idx];
    const cam = sc.cam ? sc.cam(t, run.state) : { x: 640, y: 360, z: 1 };

    wg.setTransform(1, 0, 0, 1, 0, 0);
    wg.clearRect(0, 0, worldCv.width, worldCv.height);
    fg.setTransform(1, 0, 0, 1, 0, 0);
    fg.clearRect(0, 0, fxCv.width, fxCv.height);

    applyCam(wg, cam);
    sc.world(wg, t, run.state);
    applyCam(fg, cam);
    if (sc.fx) sc.fx(fg, t, run.state);

    // mundo cinza: filtro CSS só na camada do cenário (personagens continuam coloridos)
    const grey = sc.grey ? Math.round(sc.grey(t) * 50) / 50 : 0;
    if (grey !== lastGrey) {
      lastGrey = grey;
      worldCv.style.filter = grey ? `grayscale(${grey}) brightness(${1 - grey * 0.2})` : 'none';
    }

    // entrada de cada cena: abre do preto
    if (t < 0.5) {
      fg.setTransform(1, 0, 0, 1, 0, 0);
      fg.fillStyle = `rgba(10,6,18,${1 - easeOut(t / 0.5)})`;
      fg.fillRect(0, 0, fxCv.width, fxCv.height);
    }

    if (run.typed < run.full.length) {
      const want = Math.min(run.full.length, Math.floor(t * 34));
      if (want > run.typed) {
        if (Math.floor(want / 2) !== Math.floor(run.typed / 2)) AU.sfx.blip();
        run.typed = want;
        textEl.textContent = run.full.slice(0, run.typed);
      }
    } else if (run.full && !run.doneAt) run.doneAt = now;
    if (run.doneAt && now - run.doneAt > 4200 && run.kind !== 'title') advance();
    requestAnimationFrame(frame);
  }

  function play(kind, onDone) {
    if (!el) init();
    run = { kind, scenes: SCENES[kind], onDone };
    pressEl.hidden = kind !== 'title';
    skipBtn.hidden = kind === 'title';
    el.classList.add('show');
    size();
    show(0);
    if (kind === 'intro') AU.music.play('story');
    if (kind === 'ending') AU.music.play('ending');
    requestAnimationFrame(frame);
  }

  window.Cobra.story = {
    play,
    get active() { return !!run; },
  };
})();
