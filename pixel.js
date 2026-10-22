// Sprites em pixel art e utilitários de desenho em baixa resolução.
// Cada sprite é uma lista de linhas; cada letra vira uma cor da paleta e "." é transparente.
(() => {
  'use strict';

  const SPR = {
    apple: [
      '...s.ll.',
      '...sll..',
      '.rrsrrr.',
      'rhhrrrrr',
      'rhrrrrrr',
      'rrrrrrrd',
      '.rrrrrd.',
      '..rddd..',
    ],
    rotten: [
      '...s....',
      '...sl...',
      '.rrsrrr.',
      'rhrrrkrr',
      'rrrkrrrr',
      'rrrrrkrd',
      '.rkrrrd.',
      '..rddd..',
    ],
    pw_slow: [
      '.aaaaaa.',
      '.abbbba.',
      '..ayya..',
      '...ya...',
      '...ab...',
      '..abya..',
      '.ayyyya.',
      '.aaaaaa.',
    ],
    pw_magnet: [
      '.ww..ww.',
      '.rr..rr.',
      '.rr..rr.',
      '.rr..rr.',
      '.rd..rd.',
      '.rrrrrd.',
      '..rddd..',
      '........',
    ],
    pw_ghost: [
      '..wwww..',
      '.wwwwww.',
      '.wkwwkw.',
      '.wkwwkw.',
      '.wwwwww.',
      '.wwwwww.',
      '.wwwwww.',
      '.w.ww.w.',
    ],
    pw_double: [
      '..aaaa..',
      '.ayyyya.',
      'ayykkyya',
      'ayyyykya',
      'ayyykyya',
      'ayykyyya',
      '.aykkka.',
      '..aaaa..',
    ],
    pw_trim: [
      'w.....w.',
      'ww...ww.',
      '.ww.ww..',
      '..www...',
      '..r.r...',
      '.rr.rr..',
      'r..r..r.',
      '.rr.rr..',
    ],
    bolt: [
      '....yy..',
      '...yy...',
      '..yy....',
      '.yyyyyy.',
      '....yy..',
      '...yy...',
      '..yy....',
      '..y.....',
    ],
    // barreiras (a = sombra, b = base, c = luz, d = detalhe)
    hedge: [
      '.cbcbcb.',
      'cbbcbbba',
      'bcbbbcba',
      'bbbcbbba',
      'cbbbbcba',
      'bbcbbbba',
      'abbbbbba',
      '.aaaaaa.',
    ],
    rock: [
      '..cccb..',
      '.ccbbbb.',
      'cccbbbba',
      'cbbbbbba',
      'cbbbdbba',
      'bbbbbbda',
      '.bbbdda.',
      '..aaaa..',
    ],
    tree: [
      '..cccb..',
      '.ccbbbb.',
      'cbbcbbba',
      'bbbbbcba',
      '.bbbbba.',
      '...dd...',
      '...dd...',
      '..dddd..',
    ],
    candy: [
      '.cdccdc.',
      'cdccdccd',
      'dccdccdc',
      'ccdccdcc',
      'cdccdccd',
      'dccdccdc',
      'ccdccdcc',
      '.bbbbbb.',
    ],
    metal: [
      'cccccccb',
      'cdbbbbda',
      'cbbbbbba',
      'cbbbbbba',
      'cbbbbbba',
      'cbbbbbba',
      'cdbbbbda',
      'baaaaaaa',
    ],
    cactus: [
      '...cb...',
      '...bb...',
      'c..bb...',
      'cb.bb.cb',
      'bbbbb.bb',
      '...bbbb.',
      '...bb...',
      '..aaaa..',
    ],
    asteroid: [
      '..bbbb..',
      '.bcbbab.',
      'bccbbbab',
      'bbbbaabb',
      'bbabbbbb',
      'babbbcbb',
      '.bbbbbb.',
      '..aaaa..',
    ],
    obsidian: [
      'abbbbbba',
      'bbbdbbbb',
      'bbdbbbcb',
      'bbbbdbbb',
      'bcbbbdbb',
      'bbbbbbdb',
      'bdbbbbbb',
      'aaaaaaaa',
    ],
    brick: [
      'cccbcccc',
      'bbbabbbb',
      'aaaaaaaa',
      'cccccbcc',
      'bbbbbabb',
      'aaaaaaaa',
      'cccbcccc',
      'bbbabbbb',
    ],
    // corvo olhando para a esquerda: asas para cima e para baixo
    crowA: [
      '....kk......kk..',
      '.....kkk..kkk...',
      '......kkkkkk....',
      '.kk..kkkkkk.....',
      'bkekkkkkkkkkk...',
      '.kkkkkkkkkkkkkk.',
      '...kkkkkkkkk..kk',
      '.....kgkgk......',
      '....k...k.......',
      '................',
    ],
    crowB: [
      '................',
      '................',
      '................',
      '.kk.............',
      'bkekkkkkkkkkk...',
      '.kkkkkkkkkkkkkk.',
      '...kkkkkkkkk..kk',
      '.....kkkkkk.....',
      '....kkk..kkk....',
      '...kk......kk...',
    ],
  };

  const PAL = {
    apple: { s: '#6b3b1f', l: '#4fe06b', r: '#ff2d55', h: '#ffd0d8', d: '#b30f36' },
    golden: { s: '#6b3b1f', l: '#4fe06b', r: '#ffd84a', h: '#fffbd6', d: '#d68a00' },
    rotten: { s: '#3d2a10', l: '#5a5a2a', r: '#7d7a2e', h: '#c7c06b', d: '#3d3a1a', k: '#2a2010' },
    pw_slow: { a: '#1a3a5a', b: '#9cf9ff', y: '#ffd84a' },
    pw_magnet: { w: '#ffffff', r: '#ff3b5c', d: '#a8102e' },
    pw_ghost: { w: '#f4f0ff', k: '#2a1a4a' },
    pw_double: { a: '#8a5a00', y: '#ffd84a', k: '#8a5a00' },
    pw_trim: { w: '#e8f0ff', r: '#b07bff' },
    bolt: { y: '#fff36b' },
    crow: { k: '#2a2a3a', g: '#555566', e: '#ff3b3b', b: '#ffb02e' },
  };

  const cache = new Map();

  // transforma um sprite + paleta num canvas pequeno (fica em cache)
  function sprite(name, pal, key) {
    const k = name + '|' + (key || '');
    let c = cache.get(k);
    if (c) return c;
    const rows = SPR[name];
    c = document.createElement('canvas');
    c.width = rows[0].length;
    c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const col = pal[row[x]];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    });
    cache.set(k, c);
    return c;
  }

  // imagem ampliada para usar no HTML (<img>)
  function dataURL(name, pal, key, scale = 4) {
    const s = sprite(name, pal, key);
    const c = document.createElement('canvas');
    c.width = s.width * scale;
    c.height = s.height * scale;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(s, 0, 0, c.width, c.height);
    return c.toDataURL();
  }

  // cópia em tons de cinza (usada no "mundo sem cor")
  function greyCopy(src, amount = 1, dim = 0.85) {
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    if (!c.width || !c.height) return c;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    const img = g.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * dim;
      d[i] = d[i] + (l - d[i]) * amount;
      d[i + 1] = d[i + 1] + (l - d[i + 1]) * amount;
      d[i + 2] = d[i + 2] + (l - d[i + 2]) * amount;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // bloco "arredondado" de pixel art (cantos cortados)
  function block(g, x, y, s, color) {
    g.fillStyle = color;
    if (s <= 2) { g.fillRect(x, y, s, s); return; }
    g.fillRect(x + 1, y, s - 2, s);
    g.fillRect(x, y + 1, s, s - 2);
  }

  // círculo feito só de pixels (sem antisserrilhado)
  function ring(g, cx, cy, r, color, from = 0, to = Math.PI * 2) {
    if (r < 0.5) return;
    g.fillStyle = color;
    const steps = Math.max(8, Math.ceil(r * 6));
    let lx = null;
    let ly = null;
    for (let i = 0; i <= steps; i++) {
      const a = from + ((to - from) * i) / steps;
      const x = Math.round(cx + Math.cos(a) * r);
      const y = Math.round(cy + Math.sin(a) * r);
      if (x === lx && y === ly) continue;
      g.fillRect(x, y, 1, 1);
      lx = x;
      ly = y;
    }
  }

  const OUTLINE = '#1a1028';

  // pinta de escuro os pixels da borda de um desenho (o "contorninho")
  function outlineInner(c, color = OUTLINE) {
    const w = c.width;
    const h = c.height;
    const g = c.getContext('2d');
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
    const edge = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (a(x, y) > 0 && (!a(x - 1, y) || !a(x + 1, y) || !a(x, y - 1) || !a(x, y + 1))) edge.push(x, y);
      }
    }
    g.fillStyle = color;
    for (let i = 0; i < edge.length; i += 2) g.fillRect(edge[i], edge[i + 1], 1, 1);
    return c;
  }

  // sprite ampliado (2x por padrão) com contorno escuro
  function big(name, pal, key, scale = 2, outline = OUTLINE) {
    const k = 'big|' + name + '|' + key + '|' + scale;
    let c = cache.get(k);
    if (c) return c;
    const s = sprite(name, pal, key);
    c = document.createElement('canvas');
    c.width = s.width * scale;
    c.height = s.height * scale;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(s, 0, 0, c.width, c.height);
    if (outline) outlineInner(c, outline);
    cache.set(k, c);
    return c;
  }

  // maçã 16x16 desenhada por código (com sombra, brilho, folha e contorno)
  const APPLE_PALS = {
    red: { r: '#e8393f', d: '#b3263f', h: '#f6787c', w: '#ffffff', s: '#5a2e1e', l: '#62c84f', L: '#3a8f3a' },
    golden: { r: '#ffcc33', d: '#d68a00', h: '#fff1a0', w: '#ffffff', s: '#5a2e1e', l: '#62c84f', L: '#3a8f3a' },
    rotten: { r: '#8a8a3a', d: '#5a5626', h: '#b8b46a', w: '#d8d49a', s: '#3a2a14', l: '#6a6a2a', L: '#4a4a1e', k: '#3a3014' },
  };

  function apple(kind = 'red') {
    const k = 'apple16|' + kind;
    let c = cache.get(k);
    if (c) return c;
    const p = APPLE_PALS[kind];
    c = document.createElement('canvas');
    c.width = c.height = 16;
    const g = c.getContext('2d');
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const dx = (x + 0.5 - 8) / 6.9;
        const dy = (y + 0.5 - 9.4) / 6.2;
        let inside = dx * dx + dy * dy <= 1;
        if (y < 5 && Math.abs(x + 0.5 - 8) < 1.6) inside = false; // covinha do cabinho
        if (!inside) continue;
        const light = -(dx * 0.55 + dy * 0.75);
        let col = light < -0.4 ? p.d : p.r;
        if ((x - 4.5) ** 2 + (y - 6.5) ** 2 < 2.2) col = p.h;
        if (x === 4 && y === 6) col = p.w;
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
    // folha
    for (let y = 0; y < 6; y++) {
      for (let x = 8; x < 16; x++) {
        const lx = x + 0.5 - 11.3;
        const ly = y + 0.5 - 2.8;
        const rx = lx * Math.cos(0.5) + ly * Math.sin(0.5);
        const ry = -lx * Math.sin(0.5) + ly * Math.cos(0.5);
        if ((rx / 3.2) ** 2 + (ry / 1.6) ** 2 <= 1) { g.fillStyle = ry > 0.2 ? p.L : p.l; g.fillRect(x, y, 1, 1); }
      }
    }
    outlineInner(c);
    g.fillStyle = p.s;
    g.fillRect(7, 2, 2, 3);
    g.fillRect(8, 1, 1, 1);
    if (kind === 'rotten') {
      g.fillStyle = p.k;
      [[10, 9], [11, 9], [6, 12], [5, 11], [9, 13]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
    }
    cache.set(k, c);
    return c;
  }

  // gerador de números aleatórios com semente (mapas e músicas sempre iguais)
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

  window.Cobra = window.Cobra || {};
  // bloco arredondado maior (cantos de 2 pixels), usado no corpo da cobra
  function blob(g, x, y, s, color) {
    g.fillStyle = color;
    if (s < 8) { block(g, x, y, s, color); return; }
    g.fillRect(x + 2, y, s - 4, s);
    g.fillRect(x + 1, y + 1, s - 2, s - 2);
    g.fillRect(x, y + 2, s, s - 4);
  }

  function canvasURL(c, scale = 4) {
    const o = document.createElement('canvas');
    o.width = c.width * scale;
    o.height = c.height * scale;
    const g = o.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(c, 0, 0, o.width, o.height);
    return o.toDataURL();
  }

  window.Cobra.pixel = { SPR, PAL, OUTLINE, sprite, big, apple, outlineInner, dataURL, canvasURL, greyCopy, block, blob, ring, rng };
})();
