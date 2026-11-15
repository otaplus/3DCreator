import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fontData from '../assets/fonts/noto_sans_bold.typeface.json';
import { getPatternTexture, textureFromDataURL, textureFromCanvas, emojiTexture } from './textures.js';

const FONT = new FontLoader().parse(fontData);

export const MATERIAL_PRESETS = [
  { id: 'mate', name: 'Mate', emoji: '🧱', roughness: 0.92, metalness: 0.02 },
  { id: 'satinado', name: 'Satinado', emoji: '✨', roughness: 0.48, metalness: 0.06 },
  { id: 'brillante', name: 'Brillante', emoji: '🌟', roughness: 0.16, metalness: 0.18 },
  { id: 'metal', name: 'Metal', emoji: '⚙️', roughness: 0.2, metalness: 1 },
  { id: 'cristal', name: 'Cristal', emoji: '🪟', roughness: 0.06, metalness: 0.12, opacity: 0.38, transparent: true, depthWrite: false },
  { id: 'neon', name: 'Neón', emoji: '💡', roughness: 0.35, metalness: 0, emissive: true },
];

export function materialPreset(id) {
  return MATERIAL_PRESETS.find((m) => m.id === id) || MATERIAL_PRESETS[0];
}

// ===== Materiales =====
export function createMaterial(spec = {}) {
  const preset = spec.materialId ? materialPreset(spec.materialId) : null;
  const color = spec.color || '#7c6bff';
  const emissive = spec.emissive ?? (preset ? !!preset.emissive : false);
  const opacity = spec.opacity ?? (preset && preset.opacity !== undefined ? preset.opacity : 1);
  const transparent = spec.transparent ?? (preset ? !!preset.transparent : false);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: spec.roughness ?? (preset && preset.roughness !== undefined ? preset.roughness : 0.62),
    metalness: spec.metalness ?? (preset && preset.metalness !== undefined ? preset.metalness : 0.04),
    opacity,
    transparent: !!transparent || opacity < 1,
    depthWrite: spec.depthWrite ?? (preset && preset.depthWrite !== undefined ? preset.depthWrite : true),
    flatShading: !!spec.flatShading,
    side: spec.side ?? THREE.FrontSide,
    emissive: emissive ? color : '#000000',
    emissiveIntensity: emissive ? 0.55 : 0,
  });
  mat.userData.baseColor = color;
  mat.userData.preset = spec.materialId || 'mate';
  mat.userData.pattern = spec.pattern || null;
  if (spec.pattern) {
    mat.map = getPatternTexture(spec.pattern);
    mat.color.set('#ffffff');
    mat.roughness = Math.max(0.4, mat.roughness);
    mat.metalness = Math.min(mat.metalness, 0.25);
  }
  return mat;
}

export function serializeMaterial(mat) {
  if (!mat) return {};
  const emissive = !!mat.emissive && mat.emissiveIntensity > 0 && mat.emissive.getHex() !== 0;
  return {
    color: mat.userData.baseColor || '#' + mat.color.getHexString(),
    roughness: mat.roughness,
    metalness: mat.metalness,
    opacity: mat.opacity,
    transparent: mat.transparent,
    depthWrite: mat.depthWrite,
    flatShading: mat.flatShading,
    preset: mat.userData.preset || 'mate',
    pattern: mat.userData.pattern || null,
    emissive,
  };
}

export function applyMaterialSpec(mesh, spec, presetId) {
  const old = mesh.material;
  const mat = createMaterial({ ...spec, materialId: presetId });
  mat.userData.baseColor = spec.color || mat.userData.baseColor;
  mesh.material = mat;
  old.dispose?.();
  mesh.userData.paint = null;
  return mat;
}

// ===== Primitivas =====
function starShape(outer = 1.22, inner = 0.53) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -1.02);
  s.bezierCurveTo(0.18, -0.72, 1.28, -0.16, 1.24, 0.54);
  s.bezierCurveTo(1.2, 1.08, 0.58, 1.24, 0.16, 1.0);
  s.bezierCurveTo(0.06, 0.94, 0.01, 0.86, 0, 0.8);
  s.bezierCurveTo(-0.01, 0.86, -0.06, 0.94, -0.16, 1.0);
  s.bezierCurveTo(-0.58, 1.24, -1.2, 1.08, -1.24, 0.54);
  s.bezierCurveTo(-1.28, -0.16, -0.18, -0.72, 0, -1.02);
  return s;
}

function wedgeGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.9, -0.9);
  shape.lineTo(0.9, -0.9);
  shape.lineTo(0.9, 0.9);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.8, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2,
  });
  geo.center();
  return geo;
}

const GEO = {
  box: () => new THREE.BoxGeometry(1.9, 1.9, 1.9, 1, 1, 1),
  sphere: () => new THREE.SphereGeometry(1.15, 48, 32),
  cylinder: () => new THREE.CylinderGeometry(0.9, 0.9, 2, 48),
  cone: () => new THREE.ConeGeometry(1.1, 2.2, 48),
  torus: () => {
    const g = new THREE.TorusGeometry(0.95, 0.38, 28, 64);
    g.rotateX(Math.PI / 2);
    return g;
  },
  capsule: () => new THREE.CapsuleGeometry(0.65, 1.1, 14, 32),
  pyramid: () => {
    const g = new THREE.ConeGeometry(1.25, 2, 4);
    g.rotateY(Math.PI / 4);
    return g;
  },
  prism: () => new THREE.CylinderGeometry(1.1, 1.1, 1.8, 6),
  star: () => {
    const g = new THREE.ExtrudeGeometry(starShape(), {
      depth: 0.55, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 3, curveSegments: 2,
    });
    g.center();
    return g;
  },
  heart: () => {
    const g = new THREE.ExtrudeGeometry(heartShape(), {
      depth: 0.62, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 4, curveSegments: 18,
    });
    g.center();
    return g;
  },
  gem: () => new THREE.OctahedronGeometry(1.3, 0),
  wedge: wedgeGeometry,
};

export const PRIMITIVES = [
  { id: 'box', name: 'Cubo', emoji: '🧊' },
  { id: 'sphere', name: 'Esfera', emoji: '🔴' },
  { id: 'cylinder', name: 'Cilindro', emoji: '🥫' },
  { id: 'cone', name: 'Cono', emoji: '🍦' },
  { id: 'torus', name: 'Dona', emoji: '🍩' },
  { id: 'capsule', name: 'Cápsula', emoji: '💊' },
  { id: 'pyramid', name: 'Pirámide', emoji: '🔺' },
  { id: 'prism', name: 'Prisma', emoji: '🔷' },
  { id: 'star', name: 'Estrella', emoji: '⭐' },
  { id: 'heart', name: 'Corazón', emoji: '❤️' },
  { id: 'gem', name: 'Diamante', emoji: '💎' },
  { id: 'wedge', name: 'Rampa', emoji: '📐' },
];

const FLAT_TYPES = new Set(['pyramid', 'prism', 'gem', 'star', 'wedge']);

export function createPrimitive(type, spec = {}) {
  const def = PRIMITIVES.find((p) => p.id === type) || PRIMITIVES[0];
  const make = GEO[def.id];
  if (!make) throw new Error('Primitiva desconocida: ' + type);
  const geo = make();
  const mat = createMaterial({
    ...spec,
    flatShading: spec.flatShading ?? FLAT_TYPES.has(def.id),
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = spec.name || def.name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.meta = { kind: 'primitive', primitive: def.id };
  return mesh;
}

// ===== Texto 3D =====
export function createTextMesh(text, spec = {}) {
  const size = spec.size ?? 1.1;
  const depth = spec.depth ?? 0.26;
  const clean = String(text || 'Hola').slice(0, 120);
  const lines = clean.split(/\n/).slice(0, 4);
  const geos = [];
  const lineHeight = size * 1.28;
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    const geo = new TextGeometry(line, {
      font: FONT,
      size,
      depth,
      curveSegments: 10,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.014,
      bevelSegments: 2,
    });
    geo.computeBoundingBox();
    const width = geo.boundingBox.max.x - geo.boundingBox.min.x;
    geo.translate(-width / 2 - geo.boundingBox.min.x, -i * lineHeight, 0);
    geos.push(geo);
  });

  let geometry;
  if (!geos.length) {
    geometry = new THREE.BoxGeometry(size, size, depth);
  } else if (geos.length === 1) {
    geometry = geos[0];
  } else {
    geometry = mergeGeometries(geos);
    geos.forEach((g) => g.dispose());
  }
  geometry.computeBoundingBox();
  const c = new THREE.Vector3();
  geometry.boundingBox.getCenter(c);
  geometry.translate(-c.x, -c.y, -c.z);

  const mat = createMaterial(spec);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'Texto: ' + (clean.replace(/\s+/g, ' ').slice(0, 18) || 'Hola');
  mesh.userData.meta = { kind: 'text', text: clean, size, depth };
  return mesh;
}

// ===== Stickers =====
export function createEmojiSticker(emoji, spec = {}) {
  const mat = new THREE.SpriteMaterial({
    map: emojiTexture(emoji),
    transparent: true,
    depthWrite: false,
    alphaTest: 0.02,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(spec.scale ?? 1.35);
  sprite.name = 'Sticker ' + emoji;
  sprite.center.set(0.5, 0.5);
  sprite.userData.meta = { kind: 'sticker', emoji };
  return sprite;
}

export function createImageSticker(dataUrl, spec = {}) {
  const map = textureFromDataURL(dataUrl);
  const mat = new THREE.SpriteMaterial({
    map,
    transparent: true,
    depthWrite: false,
    alphaTest: 0.02,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  const base = spec.scale ?? 1.8;
  const aspect = spec.aspect || 1;
  sprite.scale.set(base * aspect, base, 1);
  sprite.name = 'Sticker de imagen';
  sprite.userData.meta = { kind: 'sticker', emoji: null, dataUrl, aspect };
  return sprite;
}

export function createImagePlane(canvasOrDataUrl, spec = {}) {
  const aspect = spec.aspect || 1.5;
  const height = spec.height || 2.4;
  const geo = new THREE.PlaneGeometry(height * aspect, height);
  const map = typeof canvasOrDataUrl === 'string'
    ? textureFromDataURL(canvasOrDataUrl)
    : textureFromCanvas(canvasOrDataUrl);
  const mat = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    side: THREE.DoubleSide,
    toneMapped: false,
    alphaTest: 0.01,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = spec.name || 'Dibujo 2D';
  mesh.userData.meta = { kind: 'image', dataUrl: spec.dataUrl || canvasOrDataUrl, aspect, height };
  mesh.userData.isImage = true;
  return mesh;
}

// Pegatinas pegadas a la superficie de un objeto: un plano orientado a la
// normal de la cara. Se mueven con el objeto y se pueden arrastrar por encima.
export function createEmojiDecal(emoji, spec = {}) {
  const size = spec.size || 0.8;
  const mat = new THREE.MeshBasicMaterial({
    map: emojiTexture(emoji),
    transparent: true,
    side: THREE.DoubleSide,
    toneMapped: false,
    alphaTest: 0.01,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.scale.setScalar(size);
  mesh.name = 'Pegatina ' + emoji;
  mesh.userData.meta = { kind: 'sticker', emoji, decal: true, size };
  mesh.userData.isDecal = true;
  mesh.userData.isStickerDecal = true;
  return mesh;
}

export function createImageDecal(dataUrl, spec = {}) {
  const aspect = spec.aspect || 1;
  const height = spec.size || 1.2;
  const width = height * aspect;
  const mat = new THREE.MeshBasicMaterial({
    map: textureFromDataURL(dataUrl),
    transparent: true,
    side: THREE.DoubleSide,
    toneMapped: false,
    alphaTest: 0.01,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  mesh.name = spec.name || 'Pegatina de imagen';
  mesh.userData.meta = { kind: 'sticker', emoji: null, dataUrl, aspect, decal: true, size: height };
  mesh.userData.isDecal = true;
  mesh.userData.isStickerDecal = true;
  return mesh;
}

// ===== Doodles =====
export function createDoodle(points, radius, spec = {}) {
  const pts = points.map((p) => (p.isVector3 ? p.clone() : new THREE.Vector3(p.x, p.y, p.z)));
  let geometry;
  if (pts.length < 2) {
    geometry = new THREE.SphereGeometry(Math.max(radius * 1.15, 0.06), 16, 12);
    if (pts.length === 1) geometry.translate(pts[0].x, pts[0].y, pts[0].z);
  } else {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.35);
    const tubular = Math.max(24, Math.min(240, pts.length * 5));
    const tube = new THREE.TubeGeometry(curve, tubular, Math.max(0.025, radius), 10, false);
    const capA = new THREE.SphereGeometry(Math.max(0.025, radius), 10, 8);
    capA.translate(pts[0].x, pts[0].y, pts[0].z);
    const capB = new THREE.SphereGeometry(Math.max(0.025, radius), 10, 8);
    const last = pts[pts.length - 1];
    capB.translate(last.x, last.y, last.z);
    geometry = mergeGeometries([tube, capA, capB]) || tube;
    tube.dispose();
    capA.dispose();
    capB.dispose();
  }
  const mat = createMaterial(spec);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = spec.name || 'Doodle 3D';
  mesh.userData.meta = {
    kind: 'doodle',
    points: pts.map((p) => [Math.round(p.x * 1000) / 1000, Math.round(p.y * 1000) / 1000, Math.round(p.z * 1000) / 1000]),
    radius,
  };
  return mesh;
}

// ===== Utilidades =====
export function fitToGround(obj) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (!isFinite(box.min.y)) return;
  obj.position.y -= box.min.y;
  obj.updateMatrixWorld(true);
}

export function centerXZ(obj) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (!isFinite(box.min.x)) return;
  const c = new THREE.Vector3();
  box.getCenter(c);
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  obj.updateMatrixWorld(true);
}

export function objectSize(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3();
  box.getSize(size);
  return size;
}

export function emojiForObject(obj) {
  const meta = obj.userData.meta;
  if (meta) {
    if (meta.kind === 'primitive') {
      const p = PRIMITIVES.find((x) => x.id === meta.primitive);
      return p ? p.emoji : '🧊';
    }
    if (meta.kind === 'template') return meta.emoji || '🏠';
    if (meta.kind === 'text') return '🔤';
    if (meta.kind === 'sticker') return meta.emoji || '🖼️';
    if (meta.kind === 'image') return '🖼️';
    if (meta.kind === 'doodle') return '✏️';
    if (meta.kind === 'group') return meta.emoji || '🧩';
  }
  if (obj.isGroup) return '📦';
  return '🧊';
}

export function kindLabel(obj) {
  const meta = obj.userData.meta;
  switch (meta && meta.kind) {
    case 'primitive': return 'Forma';
    case 'template': return 'Plantilla';
    case 'text': return 'Texto';
    case 'sticker': return 'Sticker';
    case 'image': return 'Dibujo';
    case 'doodle': return 'Doodle';
    case 'group': return 'Grupo';
    default: return 'Objeto';
  }
}
