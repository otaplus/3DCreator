// Convierte una fuente TTF del sistema al formato de Three.js incluyendo
// caracteres españoles (á, é, í, ó, ú, ü, ñ, ¿, ¡) y signos habituales.
const fs = require('fs');
const path = require('path');
const opentype = require('opentype.js');

const ttf = process.argv[2] || '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf';
const out = process.argv[3] || path.join(__dirname, '..', 'assets', 'fonts', 'noto_sans_bold.typeface.json');
const font = opentype.parse(fs.readFileSync(ttf).buffer);
const units = font.unitsPerEm;
const scale = 1000 / units;

const chars = new Set();
for (let c = 32; c <= 126; c++) chars.add(String.fromCharCode(c));
for (let c = 160; c <= 255; c++) chars.add(String.fromCharCode(c));
'€“”‘’–—…•·°©®™←↑→↓✓★♥'.split('').forEach((c) => chars.add(c));

function fmt(n, signed = false) {
  const v = Math.round(n * 10) / 10;
  const s = Math.abs(v) < 0.05 ? '0' : String(v);
  return signed && v >= 0 ? s : s;
}

function convertPath(glyph) {
  // getPath devuelve coordenadas con el eje Y hacia arriba (negativas sobre la línea base).
  // El formato de Three.js usa Y positiva hacia arriba.
  const p = glyph.getPath(0, 0, 1000);
  const parts = [];
  for (const cmd of p.commands) {
    if (cmd.type === 'M') parts.push('m', fmt(cmd.x), fmt(-cmd.y));
    else if (cmd.type === 'L') parts.push('l', fmt(cmd.x), fmt(-cmd.y));
    else if (cmd.type === 'Q') {
      // Three.js espera punto final primero y luego el punto de control.
      parts.push('q', fmt(cmd.x), fmt(-cmd.y), fmt(cmd.x1), fmt(-cmd.y1));
    } else if (cmd.type === 'C') {
      parts.push('b', fmt(cmd.x), fmt(-cmd.y), fmt(cmd.x1), fmt(-cmd.y1), fmt(cmd.x2), fmt(-cmd.y2));
    }
    // Z se omite: Three.js cierra cada contorno implícitamente.
  }
  return parts.join(' ');
}

const glyphs = {};
for (const ch of chars) {
  let g;
  try { g = font.charToGlyph(ch); } catch { g = null; }
  if (!g) continue;
  glyphs[ch] = {
    ha: Math.round((g.advanceWidth || 0) * scale * 10) / 10,
    x_min: Math.round((g.xMin || 0) * scale * 10) / 10,
    x_max: Math.round((g.xMax || 0) * scale * 10) / 10,
    o: convertPath(g),
  };
}
// Fallback para caracteres no incluidos (emojis, etc.)
if (!glyphs['?']) throw new Error('La fuente no contiene el glifo ?');

const bbox = {
  xMin: Math.round(font.tables.head.xMin * scale),
  xMax: Math.round(font.tables.head.xMax * scale),
  yMin: Math.round(font.tables.head.yMin * scale),
  yMax: Math.round(font.tables.head.yMax * scale),
};

const json = {
  glyphs,
  familyName: font.getEnglishName('fontFamily') || 'Noto Sans',
  ascender: Math.round(font.ascender * scale),
  descender: Math.round(font.descender * scale),
  underlinePosition: Math.round(-120 * scale),
  underlineThickness: Math.round(60 * scale),
  boundingBox: bbox,
  resolution: 1000,
  cssFontWeight: 'bold',
  cssFontStyle: 'normal',
  original_font_information: {
    font_family_name: font.getEnglishName('fontFamily') || 'Noto Sans',
    full_font_name: font.getEnglishName('fullName') || 'Noto Sans Bold',
    copyright: 'Noto Sans, licencia SIL Open Font License 1.1',
    license_url: 'https://scripts.sil.org/OFL',
  },
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(json));
console.log(`Fuente convertida: ${Object.keys(glyphs).length} caracteres → ${out}`);
