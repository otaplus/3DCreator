import * as THREE from 'three';

// ===== Paleta infantil =====
export const COLORS = [
  { hex: '#ff5e6c', name: 'Fresa' },
  { hex: '#ff8a5c', name: 'Naranja' },
  { hex: '#ffc94d', name: 'Amarillo' },
  { hex: '#ffe66d', name: 'Limón' },
  { hex: '#7bd88f', name: 'Menta' },
  { hex: '#2ecc71', name: 'Verde' },
  { hex: '#17c3a2', name: 'Turquesa' },
  { hex: '#4cc9f0', name: 'Cielo' },
  { hex: '#3a86ff', name: 'Azul' },
  { hex: '#7c6bff', name: 'Violeta' },
  { hex: '#c77dff', name: 'Lila' },
  { hex: '#ff6b9d', name: 'Rosa' },
  { hex: '#ffb3c7', name: 'Rosado' },
  { hex: '#f6f1e7', name: 'Blanco' },
  { hex: '#b9b2c7', name: 'Gris' },
  { hex: '#5c566e', name: 'Grafito' },
  { hex: '#8b5e3c', name: 'Marrón' },
  { hex: '#2b2340', name: 'Negro' },
];

export const DEFAULT_COLOR = '#7c6bff';

export function colorName(hex) {
  if (!hex) return '';
  const found = COLORS.find((c) => c.hex.toLowerCase() === String(hex).toLowerCase());
  return found ? found.name : 'Personalizado';
}

// ===== Ruido determinista para texturas =====
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

// ===== Patrones procedurales =====
const PATTERN_DRAW = {
  madera(ctx, s) {
    const r = rng(7);
    ctx.fillStyle = '#c98f5a';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) {
      const y = (i / 26) * s + (r() - 0.5) * 8;
      ctx.strokeStyle = i % 2 ? 'rgba(125,76,38,.22)' : 'rgba(255,225,180,.18)';
      ctx.lineWidth = 1 + r() * 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += s / 8) ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 5 + (r() - 0.5) * 5);
      ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const x = r() * s, y = r() * s;
      ctx.strokeStyle = 'rgba(90,50,25,.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, 14 + r() * 16, 5 + r() * 6, r() * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
  ladrillo(ctx, s) {
    ctx.fillStyle = '#d8c7b2';
    ctx.fillRect(0, 0, s, s);
    const rowH = s / 5;
    const brickW = s / 3;
    const r = rng(12);
    for (let row = 0; row < 5; row++) {
      const offset = row % 2 ? -brickW / 2 : 0;
      for (let col = -1; col < 4; col++) {
        const x = col * brickW + offset + 4;
        const y = row * rowH + 4;
        const shade = 190 + r() * 45;
        ctx.fillStyle = `rgb(${Math.round(shade + 25)},${Math.round(shade * 0.62)},${Math.round(shade * 0.5)})`;
        ctx.beginPath();
        ctx.roundRect(x, y, brickW - 8, rowH - 8, 5);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        ctx.fillRect(x + 3, y + 3, brickW - 14, 4);
      }
    }
  },
  hierba(ctx, s) {
    const r = rng(21);
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#63c96b');
    g.addColorStop(1, '#359c56');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 220; i++) {
      const x = r() * s, y = r() * s, h = 5 + r() * 16;
      ctx.strokeStyle = r() > 0.5 ? 'rgba(25,110,55,.35)' : 'rgba(180,245,160,.38)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (r() - 0.5) * 8, y - h / 2, x + (r() - 0.5) * 12, y - h);
      ctx.stroke();
    }
  },
  agua(ctx, s) {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#4cc9f0');
    g.addColorStop(1, '#2279d4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const r = rng(4);
    for (let i = 0; i < 18; i++) {
      const y = r() * s;
      ctx.strokeStyle = `rgba(255,255,255,${0.12 + r() * 0.3})`;
      ctx.lineWidth = 1.5 + r() * 3;
      ctx.beginPath();
      for (let x = 0; x <= s; x += 6) {
        ctx.lineTo(x, y + Math.sin(x * 0.045 + i) * 7);
      }
      ctx.stroke();
    }
  },
  estrellas(ctx, s) {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#241a5e');
    g.addColorStop(1, '#0d1038');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const r = rng(33);
    for (let i = 0; i < 90; i++) {
      const x = r() * s, y = r() * s, rad = r() * 2.6 + 0.4;
      ctx.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.65})`;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 6; i++) {
      const x = r() * s, y = r() * s, rad = 5 + r() * 7;
      ctx.fillStyle = r() > 0.5 ? '#ffe66d' : '#ffd0f0';
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = k % 2 ? rad * 0.45 : rad;
        ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }
  },
  puntos(ctx, s) {
    ctx.fillStyle = '#fff6e6';
    ctx.fillRect(0, 0, s, s);
    const colors = ['#ff6b9d', '#ffc94d', '#4cc9f0', '#7bd88f', '#c77dff'];
    const r = rng(9);
    const step = s / 6;
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        ctx.fillStyle = colors[(x + y * 2) % colors.length];
        ctx.beginPath();
        ctx.arc(x * step + step / 2, y * step + step / 2, step * (0.19 + r() * 0.06), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  rayas(ctx, s) {
    const colors = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, s, s);
    const w = s / 9;
    ctx.save();
    ctx.translate(-s, 0);
    ctx.rotate(-0.42);
    for (let i = -2; i < 22; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(i * w * 1.6, -s, w, s * 3);
    }
    ctx.restore();
  },
  cuadros(ctx, s) {
    const n = 6, cell = s / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#f6f1e7' : '#ff8a5c';
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  },
  arcoiris(ctx, s) {
    const g = ctx.createLinearGradient(0, 0, s, s);
    ['#ff5e6c', '#ffa94d', '#ffe66d', '#7bd88f', '#4cc9f0', '#7c6bff', '#ff6b9d'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    for (let i = 0; i < 30; i++) {
      const x = (i * 97) % s;
      ctx.beginPath();
      ctx.arc(x, (i * 53) % s, 3 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }
  },
  marmol(ctx, s) {
    ctx.fillStyle = '#f4f1ec';
    ctx.fillRect(0, 0, s, s);
    const r = rng(55);
    for (let i = 0; i < 17; i++) {
      ctx.strokeStyle = `rgba(${120 + r() * 50},${115 + r() * 50},${135 + r() * 40},${0.12 + r() * 0.2})`;
      ctx.lineWidth = 0.8 + r() * 2.4;
      ctx.beginPath();
      let x = r() * s, y = -10;
      ctx.moveTo(x, y);
      while (y < s + 10) {
        x += (r() - 0.5) * 34;
        y += 14 + r() * 20;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },
  lava(ctx, s) {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, '#241016');
    g.addColorStop(1, '#3d1512');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const r = rng(77);
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = r() > 0.4 ? '#ff7a2f' : '#ffd23f';
      ctx.lineWidth = 1.5 + r() * 4;
      ctx.shadowColor = '#ff6a00';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      let x = r() * s, y = r() * s;
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (r() - 0.5) * 70;
        y += (r() - 0.5) * 70;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  },
};

export const PATTERNS = [
  { id: 'madera', name: 'Madera', repeat: 2 },
  { id: 'ladrillo', name: 'Ladrillo', repeat: 2 },
  { id: 'hierba', name: 'Hierba', repeat: 2 },
  { id: 'agua', name: 'Agua', repeat: 1 },
  { id: 'estrellas', name: 'Estrellas', repeat: 1 },
  { id: 'puntos', name: 'Puntos', repeat: 1 },
  { id: 'rayas', name: 'Rayas', repeat: 1 },
  { id: 'cuadros', name: 'Cuadros', repeat: 2 },
  { id: 'arcoiris', name: 'Arcoíris', repeat: 1 },
  { id: 'marmol', name: 'Mármol', repeat: 1 },
  { id: 'lava', name: 'Lava', repeat: 1 },
];

const patternCache = new Map();
const previewCache = new Map();

function drawPattern(id, size) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  (PATTERN_DRAW[id] || PATTERN_DRAW.puntos)(ctx, size);
  return c;
}

export function patternPreview(id) {
  if (!previewCache.has(id)) previewCache.set(id, drawPattern(id, 160).toDataURL('image/png'));
  return previewCache.get(id);
}

export function getPatternTexture(id) {
  if (!patternCache.has(id)) {
    const def = PATTERNS.find((p) => p.id === id);
    const canvas = drawPattern(id, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const rep = def ? def.repeat : 1;
    tex.repeat.set(rep, rep);
    tex.anisotropy = 4;
    tex.userData.shared = true;
    patternCache.set(id, tex);
  }
  return patternCache.get(id);
}

// ===== Emojis como textura =====
const emojiCache = new Map();

export function emojiTexture(emoji) {
  if (emojiCache.has(emoji)) return emojiCache.get(emoji);
  const size = 256;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '190px "Noto Color Emoji", "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.fillText(emoji, size / 2, size / 2 + 10);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.userData.shared = true;
  emojiCache.set(emoji, tex);
  return tex;
}

export function textureFromDataURL(dataUrl, onLoad) {
  const img = new Image();
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  img.onload = () => {
    tex.needsUpdate = true;
    if (onLoad) onLoad(tex);
  };
  img.src = dataUrl;
  return tex;
}

export function textureFromCanvas(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// ===== Capa de pintura por objeto =====
export const PAINT_SIZE = 1024;

export function createPaintLayer(baseColor = '#ffffff', strokes = []) {
  const canvas = makeCanvas(PAINT_SIZE);
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const layer = { canvas, ctx, texture, baseColor, strokes };
  fillPaintBase(layer, baseColor);
  replayPaint(layer);
  return layer;
}

export function fillPaintBase(layer, color) {
  layer.baseColor = color;
  layer.ctx.save();
  layer.ctx.globalAlpha = 1;
  layer.ctx.fillStyle = color;
  layer.ctx.fillRect(0, 0, PAINT_SIZE, PAINT_SIZE);
  layer.ctx.restore();
  layer.texture.needsUpdate = true;
}

function paintPoint(layer, x, y, color, size) {
  const ctx = layer.ctx;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1, size / 2), 0, Math.PI * 2);
  ctx.fill();
}

function paintSegment(layer, a, b, color, size) {
  const ctx = layer.ctx;
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

export function drawPaintStroke(layer, stroke, fromIndex = 0) {
  const pts = stroke.points;
  if (!pts || !pts.length) return;
  const color = stroke.erase ? layer.baseColor : stroke.color;
  if (pts.length === 1) {
    paintPoint(layer, pts[0].x, pts[0].y, color, stroke.size);
  } else {
    const start = Math.max(1, fromIndex);
    if (fromIndex === 0) {
      paintPoint(layer, pts[0].x, pts[0].y, color, stroke.size);
    }
    for (let i = start; i < pts.length; i++) {
      paintSegment(layer, pts[i - 1], pts[i], color, stroke.size);
    }
  }
  layer.texture.needsUpdate = true;
}

export function replayPaint(layer) {
  fillPaintBase(layer, layer.baseColor);
  for (const stroke of layer.strokes) drawPaintStroke(layer, stroke);
  layer.texture.needsUpdate = true;
}

export function uvToPixel(uv) {
  return { x: uv.x * PAINT_SIZE, y: (1 - uv.y) * PAINT_SIZE };
}
