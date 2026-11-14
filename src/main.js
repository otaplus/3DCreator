// Creador 3D — aplicación principal.
// Une la escena de Three.js con la interfaz, las herramientas y el guardado.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { icon } from './icons.js';
import { audio } from './audio.js';
import {
  COLORS, DEFAULT_COLOR, colorName, PATTERNS, patternPreview,
  createPaintLayer, drawPaintStroke, uvToPixel,
} from './textures.js';
import {
  PRIMITIVES, MATERIAL_PRESETS, createPrimitive, createTextMesh,
  createEmojiSticker, createImageSticker, createImagePlane, createDoodle,
  fitToGround, centerXZ, emojiForObject, kindLabel, materialPreset,
  serializeMaterial, applyMaterialSpec, createMaterial,
} from './shapes.js';
import { TEMPLATES, STICKERS, buildTemplate } from './templates.js';
import {
  serializeScene, createProjectData, parseProjectData, restoreProject,
  disposeTree, cloneObject, countMeshes,
} from './project.js';
import { History } from './history.js';
import {
  openProjectFile, saveProjectFile, saveBinaryFile, saveTextFile,
  saveDataUrlFile, openImageFile, toggleFullscreen, displayPath,
  isDesktopApp, appInfo,
} from './io.js';
import { exportGLB, exportOBJ, exportSTL, renderScreenshot } from './exporters.js';
import { openEditor2D } from './editor2d.js';
import { saveAutosave, loadAutosave } from './autosave.js';

// ===== Referencias del documento =====
const dom = {
  canvas: document.getElementById('scene'),
  viewport: document.getElementById('viewport'),
  toolbar: document.getElementById('toolbar'),
  options: document.getElementById('options'),
  optionsInner: document.getElementById('optionsInner'),
  inspector: document.getElementById('inspector'),
  inspectorInner: document.getElementById('inspectorInner'),
  topActions: document.getElementById('topActions'),
  projectName: document.getElementById('projectName'),
  saveState: document.getElementById('saveState'),
  modeBar: document.getElementById('modeBar'),
  selectionChip: document.getElementById('selectionChip'),
  hintBar: document.getElementById('hintBar'),
  zoomBar: document.getElementById('zoomBar'),
  statusLeft: document.getElementById('statusLeft'),
  statusRight: document.getElementById('statusRight'),
  toasts: document.getElementById('toasts'),
  loading: document.getElementById('loading'),
  modalRoot: document.getElementById('modalRoot'),
  title: document.querySelector('title'),
};

// ===== Ambientes =====
const ENVIRONMENTS = [
  {
    id: 'estudio', name: 'Estudio', emoji: '🎨',
    top: '#eaf1ff', bottom: '#faf4e9', ground: '#e7e0d2',
    hemiSky: '#ffffff', hemiGround: '#b8afa0', key: '#fff3df', keyI: 2.15,
    fill: '#bcd4ff', fillI: 0.75, rim: '#ffe3ef', rimI: 0.55, exposure: 1.0,
  },
  {
    id: 'atardecer', name: 'Atardecer', emoji: '🌅',
    top: '#ffcdaa', bottom: '#f7a9bf', ground: '#daa99a',
    hemiSky: '#ffe2cf', hemiGround: '#8f6a6a', key: '#ffcf9b', keyI: 2.35,
    fill: '#c79bff', fillI: 0.6, rim: '#ff9db0', rimI: 0.7, exposure: 1.02,
  },
  {
    id: 'oceano', name: 'Océano', emoji: '🌊',
    top: '#a9e2ff', bottom: '#e2f8ff', ground: '#bfe6e4',
    hemiSky: '#e6f9ff', hemiGround: '#7aa4a8', key: '#fff8e8', keyI: 2.1,
    fill: '#8fd4ff', fillI: 0.85, rim: '#b9fff2', rimI: 0.55, exposure: 1.0,
  },
  {
    id: 'bosque', name: 'Bosque', emoji: '🌳',
    top: '#bfe8c2', bottom: '#f0f7d8', ground: '#cbdbb1',
    hemiSky: '#e9ffe4', hemiGround: '#6f8158', key: '#fff4d6', keyI: 2.05,
    fill: '#b4e6a8', fillI: 0.75, rim: '#e2ffcf', rimI: 0.5, exposure: 1.0,
  },
  {
    id: 'espacio', name: 'Espacio', emoji: '🌌',
    top: '#0d1233', bottom: '#2b1a4e', ground: '#1b1c33',
    hemiSky: '#9aabff', hemiGround: '#19162c', key: '#d8e2ff', keyI: 2.0,
    fill: '#7c6bff', fillI: 0.95, rim: '#ff8ad4', rimI: 0.85, exposure: 1.06,
    stars: true,
  },
  {
    id: 'nieve', name: 'Nieve', emoji: '❄️',
    top: '#e4f2ff', bottom: '#ffffff', ground: '#f3f8ff',
    hemiSky: '#ffffff', hemiGround: '#b7c5d8', key: '#fffaf0', keyI: 2.1,
    fill: '#cfe6ff', fillI: 0.85, rim: '#eaf6ff', rimI: 0.5, exposure: 1.0,
  },
];

const VIEWS = {
  inicio: { name: 'Vista 3/4', emoji: '🧊', pos: [7.4, 5.8, 8.9], target: [0, 1.25, 0] },
  frente: { name: 'Frontal', emoji: '🙂', pos: [0, 3.4, 11.2], target: [0, 1.5, 0] },
  superior: { name: 'Superior', emoji: '🛸', pos: [0.01, 12.5, 0.01], target: [0, 0, 0] },
  lateral: { name: 'Lateral', emoji: '📐', pos: [11.4, 3.6, 0], target: [0, 1.5, 0] },
  cerca: { name: 'De cerca', emoji: '🔎', pos: [4.3, 3.1, 4.9], target: [0, 1.15, 0] },
};

// ===== Estado de la aplicación =====
const state = {
  tool: 'select',
  mode: 'translate',
  color: DEFAULT_COLOR,
  materialId: 'mate',
  pattern: null,
  brush: 22,
  paintErase: false,
  doodleSize: 0.09,
  textSize: 1.1,
  textDepth: 0.28,
  sticker: STICKERS[0],
  environment: 'estudio',
  showGrid: true,
  showFloor: true,
  snap: false,
  view: 'inicio',
  selected: null,
  name: 'Mi creación',
  sound: true,
  projectPath: null,
  busy: false,
  historyReady: false,
};

// ===== Escena =====
const renderer = new THREE.WebGLRenderer({
  canvas: dom.canvas,
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(44, 1, 0.08, 300);
camera.position.set(7.4, 5.8, 8.9);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.25, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.rotateSpeed = 0.82;
controls.zoomSpeed = 0.9;
controls.panSpeed = 0.8;
controls.minDistance = 2.4;
controls.maxDistance = 42;
controls.maxPolarAngle = Math.PI * 0.495;
controls.screenSpacePanning = true;

// Un entorno suave ayuda a que los metales y el cristal se vean bonitos.
try {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
} catch (err) {
  console.warn('Sin entorno prefiltrado:', err);
}

const hemi = new THREE.HemisphereLight('#ffffff', '#b8afa0', 1.15);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight('#fff3df', 2.15);
keyLight.position.set(8.5, 12, 7);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 45;
keyLight.shadow.camera.left = -14;
keyLight.shadow.camera.right = 14;
keyLight.shadow.camera.top = 14;
keyLight.shadow.camera.bottom = -14;
keyLight.shadow.bias = -0.0005;
keyLight.shadow.normalBias = 0.025;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight('#bcd4ff', 0.75);
fillLight.position.set(-7.5, 6, -7);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight('#ffe3ef', 0.55);
rimLight.position.set(-4, 3.5, 9);
scene.add(rimLight);

// Escenario: suelo y cuadrícula.
const stage = new THREE.Group();
stage.name = 'Escenario';
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(60, 96),
  new THREE.MeshStandardMaterial({ color: '#e7e0d2', roughness: 0.96, metalness: 0 })
);
floor.name = 'Suelo';
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
const grid = new THREE.GridHelper(24, 24, '#b9b2c7', '#d9d2c5');
grid.name = 'Cuadrícula';
grid.position.y = 0.004;
grid.material.transparent = true;
grid.material.opacity = 0.38;
stage.add(floor, grid);
scene.add(stage);

// Estrellas para el ambiente espacial.
const starGeometry = new THREE.BufferGeometry();
{
  const positions = [];
  let seed = 918273;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 900; i++) {
    const u = rnd() * 2 - 1;
    const a = rnd() * Math.PI * 2;
    const r = 44 + rnd() * 40;
    const s = Math.sqrt(1 - u * u);
    positions.push(Math.cos(a) * s * r, Math.abs(u) * r * 0.85 + 2, Math.sin(a) * s * r);
  }
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
}
const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({ color: '#ffffff', size: 0.42, transparent: true, opacity: 0.9, sizeAttenuation: true, depthWrite: false })
);
stars.name = 'Estrellas';
stars.visible = false;
scene.add(stars);

const content = new THREE.Group();
content.name = 'Creaciones';
scene.add(content);

// El gizmo de transformación.
const gizmo = new TransformControls(camera, renderer.domElement);
gizmo.setSize(0.86);
gizmo.setSpace('world');
const gizmoHelper = gizmo.getHelper();
gizmoHelper.visible = false;
gizmoHelper.renderOrder = 999;
scene.add(gizmoHelper);

// Recuadro de selección.
const selectionBox = new THREE.BoxHelper(new THREE.Object3D(), 0x6c5ce7);
selectionBox.material.depthTest = false;
selectionBox.material.transparent = true;
selectionBox.material.opacity = 0.88;
selectionBox.renderOrder = 998;
selectionBox.visible = false;
scene.add(selectionBox);

// Línea de vista previa mientras se dibuja un doodle.
const doodlePreview = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: '#6c5ce7', transparent: true, opacity: 0.95, depthTest: false, linewidth: 3 })
);
doodlePreview.frustumCulled = false;
doodlePreview.renderOrder = 997;
doodlePreview.visible = false;
scene.add(doodlePreview);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const timer = new THREE.Timer();
timer.connect(document);
let camTween = null;

// ===== Utilidades generales =====
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function fmt(n, digits = 1) {
  return Number(n).toFixed(digits).replace(/\.0$/, '');
}

function currentSpec() {
  return {
    color: state.color,
    materialId: state.materialId,
    pattern: state.pattern,
  };
}

function currentSettings() {
  return {
    environment: state.environment,
    grid: state.showGrid,
    floor: state.showFloor,
    snap: state.snap,
  };
}

function setSaveState(text, mode = '') {
  dom.saveState.textContent = text;
  dom.saveState.className = 'save-state' + (mode ? ' ' + mode : '');
}

let toastCounter = 0;
function toast(message, type = 'info', sub = '') {
  if (!dom.toasts) return;
  const el = document.createElement('div');
  el.className = 'toast ' + (type === 'success' || type === 'error' ? type : '');
  const glyph = type === 'success' ? '✓' : type === 'error' ? '!' : '✨';
  el.innerHTML = `<span class="toast-icon">${glyph}</span><span class="toast-text">${esc(message)}${sub ? `<span class="toast-sub">${esc(sub)}</span>` : ''}</span>`;
  el.dataset.id = String(++toastCounter);
  dom.toasts.appendChild(el);
  while (dom.toasts.children.length > 4) dom.toasts.firstElementChild.remove();
  setTimeout(() => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 240);
  }, type === 'error' ? 4600 : 3300);
}

function setHint(text) {
  if (dom.hintBar) dom.hintBar.innerHTML = text || '';
}

function makeGradient(top, bottom) {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 8, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function applyEnvironment(id, { silent = false } = {}) {
  const env = ENVIRONMENTS.find((e) => e.id === id) || ENVIRONMENTS[0];
  state.environment = env.id;
  if (scene.background && scene.background.isTexture) scene.background.dispose();
  scene.background = makeGradient(env.top, env.bottom);
  floor.material.color.set(env.ground);
  hemi.color.set(env.hemiSky);
  hemi.groundColor.set(env.hemiGround);
  hemi.intensity = env.id === 'espacio' ? 0.7 : 1.15;
  keyLight.color.set(env.key);
  keyLight.intensity = env.keyI;
  fillLight.color.set(env.fill);
  fillLight.intensity = env.fillI;
  rimLight.color.set(env.rim);
  rimLight.intensity = env.rimI;
  renderer.toneMappingExposure = env.exposure;
  stars.visible = !!env.stars;
  if (!silent) scheduleAutosave();
}

function applySceneFlags() {
  stage.visible = state.showFloor;
  grid.visible = state.showFloor && state.showGrid;
  gizmo.setTranslationSnap(state.snap ? 0.25 : null);
  gizmo.setRotationSnap(state.snap ? Math.PI / 12 : null);
  gizmo.setScaleSnap(state.snap ? 0.1 : null);
}

function applySettings(settings = {}) {
  applyEnvironment(settings.environment || 'estudio', { silent: true });
  state.showGrid = settings.grid !== false;
  state.showFloor = settings.floor !== false;
  state.snap = !!settings.snap;
  applySceneFlags();
}

function flyTo(viewId) {
  const view = VIEWS[viewId] || VIEWS.inicio;
  state.view = viewId;
  camTween = {
    t: 0,
    fromPos: camera.position.clone(),
    toPos: new THREE.Vector3(...view.pos),
    fromTarget: controls.target.clone(),
    toTarget: new THREE.Vector3(...view.target),
  };
}

function dolly(factor) {
  const offset = camera.position.clone().sub(controls.target);
  const distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
  offset.setLength(distance);
  camera.position.copy(controls.target).add(offset);
  controls.update();
}

function focusCameraOnObject(obj) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (!isFinite(box.min.x)) return;
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  const radius = Math.max(1.5, size.length() * 0.85);
  const dir = camera.position.clone().sub(controls.target).normalize();
  const distance = THREE.MathUtils.clamp(radius * 2.1, controls.minDistance, controls.maxDistance);
  camTween = {
    t: 0,
    fromPos: camera.position.clone(),
    toPos: center.clone().add(dir.multiplyScalar(distance)),
    fromTarget: controls.target.clone(),
    toTarget: center,
  };
}

function resizeRenderer() {
  const width = Math.max(1, dom.viewport.clientWidth);
  const height = Math.max(1, dom.viewport.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function pointerToNdc(event) {
  const rect = dom.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  return pointer;
}

function raycastContent(event, { recursive = true, objects = null } = {}) {
  pointerToNdc(event);
  return raycaster.intersectObjects(objects || content.children, recursive);
}

function topLevelOf(obj) {
  let node = obj;
  while (node && node.parent && node.parent !== content) node = node.parent;
  return node && node.parent === content ? node : null;
}

function metaParentOf(obj) {
  let node = obj.parent;
  while (node && node !== content) {
    if (node.userData && node.userData.meta) return node;
    node = node.parent;
  }
  return null;
}

function isMeshLike(obj) {
  return !!(obj && (obj.isMesh || obj.isSprite));
}

function isPainted(obj) {
  let painted = false;
  obj.traverse((child) => {
    if (child.isMesh && child.userData.paint) painted = true;
  });
  return painted;
}

function syncLookFromObject(obj) {
  let found = null;
  obj.traverse((child) => {
    if (!found && child.isMesh && child.material && child.material.isMeshStandardMaterial) found = child;
  });
  if (!found) return;
  const mat = found.material;
  if (mat.userData.baseColor) state.color = mat.userData.baseColor;
  state.materialId = mat.userData.preset || 'mate';
  state.pattern = mat.userData.pattern || null;
}

// Animación principal.
function animate(timestamp) {
  requestAnimationFrame(animate);
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), 0.05);

  if (camTween) {
    camTween.t = Math.min(1, camTween.t + dt * 2.6);
    const t = camTween.t < 0.5
      ? 2 * camTween.t * camTween.t
      : 1 - Math.pow(-2 * camTween.t + 2, 2) / 2;
    camera.position.lerpVectors(camTween.fromPos, camTween.toPos, t);
    controls.target.lerpVectors(camTween.fromTarget, camTween.toTarget, t);
    if (camTween.t >= 1) camTween = null;
  }

  controls.update();

  if (state.selected && selectionBox.visible) {
    selectionBox.setFromObject(state.selected);
    selectionBox.visible = state.selected.visible !== false && state.selected.parent === content
      ? true
      : isDescendantOfContent(state.selected);
  }

  renderer.render(scene, camera);
}

function isDescendantOfContent(obj) {
  let node = obj;
  while (node) {
    if (node === content) return true;
    node = node.parent;
  }
  return false;
}

controls.addEventListener('start', () => {
  camTween = null;
});

// ===== Herramientas y barra superior =====
const TOOL_DEFS = [
  { id: 'select', label: 'Elegir', icon: 'cursor', emoji: '👆', hint: 'Haz clic en un objeto para elegirlo. Arrastra para girar la vista y usa la rueda para acercarte.' },
  { id: 'shape', label: 'Formas', icon: 'cube', emoji: '🧊', hint: 'Toca una forma para añadirla. Después elígela para moverla o pintarla.' },
  { id: 'templates', label: 'Plantillas', icon: 'templates', emoji: '🏠', hint: 'Elige una plantilla. Cada pieza se puede pintar y cambiar por separado.' },
  { id: 'paint', label: 'Pintar', icon: 'brush', emoji: '🖌️', hint: 'Mantén pulsado sobre un objeto y arrastra para pintarlo. Con el borrador quitas pintura.' },
  { id: 'doodle', label: 'Doodle', icon: 'doodle', emoji: '✏️', hint: 'Mantén pulsado y dibuja en el aire. Suelta para crear tu doodle 3D.' },
  { id: 'sticker', label: 'Stickers', icon: 'sticker', emoji: '😀', hint: 'Toca un emoji para añadirlo a la escena. También puedes subir tus imágenes.' },
  { id: 'text', label: 'Texto', icon: 'text', emoji: '🔤', hint: 'Escribe tus palabras, elige el color y pulsa «Añadir texto 3D».' },
  { id: 'scene', label: 'Escena', icon: 'scene', emoji: '🌈', hint: 'Cambia el ambiente, la luz y la cámara. Tu escena se guarda sola.' },
  { id: 'draw2d', label: 'Dibujo', icon: 'draw2d', emoji: '🎨', hint: 'Abre el editor 2D para dibujar y llevar tu dibujo a la escena 3D.', dividerBefore: true, special: true },
];

const TOOL_HINTS = Object.fromEntries(TOOL_DEFS.map((t) => [t.id, t.hint]));
let appVersion = '1.0.0';

// ===== Barra superior =====
function renderTopActions() {
  dom.topActions.innerHTML = `
    <button class="icon-btn" id="undoBtn" title="Deshacer (Ctrl+Z)" disabled>${icon('undo')}</button>
    <button class="icon-btn" id="redoBtn" title="Rehacer (Ctrl+Mayús+Z)" disabled>${icon('redo')}</button>
    <span class="top-sep"></span>
    <button class="icon-btn" id="newBtn" title="Nueva creación">${icon('plus')}</button>
    <button class="icon-btn has-label" id="openBtn" title="Abrir un proyecto (Ctrl+O)">${icon('folder')}<span>Abrir</span></button>
    <button class="icon-btn has-label" id="saveBtn" title="Guardar proyecto (Ctrl+S)">${icon('save')}<span>Guardar</span></button>
    <div class="dropdown" id="exportDropdown">
      <button class="icon-btn has-label" id="exportBtn" title="Exportar tu creación">${icon('export')}<span>Exportar</span></button>
      <div class="dropdown-menu hidden" id="exportMenu">
        <button class="menu-item" data-export="png">${icon('image')}<span class="mi-text"><span class="mi-title">Imagen PNG</span><span class="mi-sub">Una foto de tu escena en 1920×1200</span></span></button>
        <button class="menu-item" data-export="glb">${icon('cube')}<span class="mi-text"><span class="mi-title">Modelo GLB</span><span class="mi-sub">Para otros programas 3D y juegos</span></span></button>
        <button class="menu-item" data-export="obj">${icon('layers')}<span class="mi-text"><span class="mi-title">Modelo OBJ</span><span class="mi-sub">Formato 3D clásico, con materiales</span></span></button>
        <button class="menu-item" data-export="stl">${icon('download')}<span class="mi-text"><span class="mi-title">Modelo STL</span><span class="mi-sub">Ideal para imprimir en 3D</span></span></button>
        <div class="menu-sep"></div>
        <div class="menu-note">Los stickers no se incluyen en los modelos 3D, pero sí en la imagen PNG.</div>
      </div>
    </div>
    <span class="top-sep"></span>
    <button class="icon-btn" id="helpBtn" title="Ayuda y atajos">${icon('help')}</button>
    <button class="icon-btn" id="soundBtn" title="Activar o silenciar los sonidos">${icon(state.sound ? 'sound' : 'mute')}</button>
    <button class="icon-btn" id="fullBtn" title="Pantalla completa (F11)">${icon('fullscreen')}</button>`;

  dom.topActions.querySelector('#undoBtn').addEventListener('click', undo);
  dom.topActions.querySelector('#redoBtn').addEventListener('click', redo);
  dom.topActions.querySelector('#newBtn').addEventListener('click', newProject);
  dom.topActions.querySelector('#openBtn').addEventListener('click', openProject);
  dom.topActions.querySelector('#saveBtn').addEventListener('click', saveProject);
  dom.topActions.querySelector('#helpBtn').addEventListener('click', openHelp);
  dom.topActions.querySelector('#fullBtn').addEventListener('click', async () => {
    audio.click();
    await toggleFullscreen();
  });
  dom.topActions.querySelector('#soundBtn').addEventListener('click', () => {
    state.sound = !state.sound;
    audio.setEnabled(state.sound);
    try { localStorage.setItem('creador3d.sound', state.sound ? '1' : '0'); } catch { /* nada */ }
    const btn = dom.topActions.querySelector('#soundBtn');
    btn.innerHTML = icon(state.sound ? 'sound' : 'mute');
    btn.title = state.sound ? 'Silenciar los sonidos' : 'Activar los sonidos';
    if (state.sound) audio.pop();
    toast(state.sound ? 'Sonidos activados' : 'Sonidos silenciados', 'info');
  });

  const exportBtn = dom.topActions.querySelector('#exportBtn');
  const exportMenu = dom.topActions.querySelector('#exportMenu');
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    audio.click();
    exportMenu.classList.toggle('hidden');
  });
  exportMenu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-export]');
    if (!item) return;
    exportMenu.classList.add('hidden');
    exportKind(item.dataset.export);
  });
  document.addEventListener('pointerdown', (e) => {
    if (!exportMenu.contains(e.target) && !exportBtn.contains(e.target)) exportMenu.classList.add('hidden');
  });
}

function updateUndoButtons() {
  const undoBtn = dom.topActions.querySelector('#undoBtn');
  const redoBtn = dom.topActions.querySelector('#redoBtn');
  if (undoBtn) undoBtn.disabled = !(state.historyReady && history.canUndo);
  if (redoBtn) redoBtn.disabled = !(state.historyReady && history.canRedo);
}

// ===== Barra de herramientas =====
function renderToolbar() {
  dom.toolbar.innerHTML = TOOL_DEFS.map((t) => `
    ${t.dividerBefore ? '<div class="tool-divider"></div>' : ''}
    <button class="tool-btn${t.special ? ' special' : ''}" data-tool="${t.id}" title="${esc(t.label)}">
      ${icon(t.icon)}
      <span class="tool-label">${esc(t.label)}</span>
    </button>`).join('');
  dom.toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tool]');
    if (btn) setTool(btn.dataset.tool);
  });
}

function updateToolbar() {
  dom.toolbar.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tool === state.tool);
  });
}

function updateGizmoForTool() {
  const canUse = state.tool === 'select' && state.selected && isDescendantOfContent(state.selected);
  if (canUse) {
    gizmo.attach(state.selected);
    gizmoHelper.visible = true;
  } else {
    gizmo.detach();
    gizmoHelper.visible = false;
  }
}

function setTool(toolId) {
  const def = TOOL_DEFS.find((t) => t.id === toolId);
  if (!def) return;
  if (state.tool !== toolId) audio.click();
  state.tool = toolId;
  updateToolbar();
  updateGizmoForTool();
  updateHint();
  renderOptions();
  if (toolId === 'select' && state.selected) focusSelectionChip();
}

// ===== Barra de modo y cámara =====
function renderModeBar() {
  const modes = [
    { id: 'translate', label: 'Mover', icon: 'move' },
    { id: 'rotate', label: 'Girar', icon: 'rotate' },
    { id: 'scale', label: 'Escalar', icon: 'scale' },
  ];
  dom.modeBar.innerHTML = modes.map((m) => `<button data-mode="${m.id}" title="${m.label}">${icon(m.icon)}<span>${m.label}</span></button>`).join('');
  dom.modeBar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (btn) setMode(btn.dataset.mode);
  });
  updateModeBar();
}

function setMode(mode) {
  if (!['translate', 'rotate', 'scale'].includes(mode)) return;
  state.mode = mode;
  gizmo.setMode(mode);
  if (state.tool !== 'select') {
    state.tool = 'select';
    updateToolbar();
    renderOptions();
  }
  updateGizmoForTool();
  updateModeBar();
  updateHint();
  audio.click();
}

function updateModeBar() {
  dom.modeBar.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === state.mode);
    btn.disabled = !state.selected;
  });
}

function renderZoomBar() {
  dom.zoomBar.innerHTML = `
    <button id="zoomIn" title="Acercar">${icon('plus')}</button>
    <button id="zoomOut" title="Alejar">${icon('minus')}</button>
    <div class="zoom-sep"></div>
    <button id="zoomHome" title="Vista 3/4">${icon('home')}</button>
    <button id="zoomTop" title="Vista superior">${icon('camera')}</button>
    <button id="zoomGrid" title="Mostrar u ocultar la cuadrícula">${icon('grid')}</button>`;
  dom.zoomBar.querySelector('#zoomIn').addEventListener('click', () => { audio.click(); dolly(0.82); });
  dom.zoomBar.querySelector('#zoomOut').addEventListener('click', () => { audio.click(); dolly(1.22); });
  dom.zoomBar.querySelector('#zoomHome').addEventListener('click', () => { audio.click(); flyTo('inicio'); });
  dom.zoomBar.querySelector('#zoomTop').addEventListener('click', () => { audio.click(); flyTo('superior'); });
  dom.zoomBar.querySelector('#zoomGrid').addEventListener('click', () => {
    state.showGrid = !state.showGrid;
    applySceneFlags();
    updateZoomBar();
    scheduleAutosave();
    audio.click();
  });
  updateZoomBar();
}

function updateZoomBar() {
  const btn = dom.zoomBar.querySelector('#zoomGrid');
  if (btn) btn.style.opacity = state.showGrid ? '1' : '0.45';
}

// ===== Piezas de interfaz reutilizables =====
function panelHead({ kicker = 'Herramienta', title, sub = '', emoji = '' }) {
  return `<div class="panel-head">
    <div class="panel-kicker">${emoji ? `<span class="k-emoji">${emoji}</span>` : ''}${esc(kicker)}</div>
    <h2 class="panel-title">${esc(title)}</h2>
    ${sub ? `<p class="panel-sub">${sub}</p>` : ''}
  </div>`;
}

function paletteMarkup(selected) {
  return `<div class="color-grid">
    ${COLORS.map((c) => `<button class="swatch${c.hex === selected ? ' selected' : ''}" data-color="${c.hex}" title="${esc(c.name)}" style="background:${c.hex}"></button>`).join('')}
    <label class="swatch custom" title="Elegir otro color">+<input class="js-custom-color" type="color" value="${selected}" aria-label="Otro color"></label>
  </div>
  <div class="color-current" style="margin-top:9px">
    <span class="cc-dot" style="background:${selected}"></span>
    <span class="cc-name">${esc(colorName(selected) || 'Color')}</span>
    <span class="cc-code">${selected.toUpperCase()}</span>
  </div>`;
}

function bindPalette(root, onPick) {
  root.querySelectorAll('.swatch[data-color]').forEach((btn) => {
    btn.addEventListener('click', () => onPick(btn.dataset.color));
  });
  const custom = root.querySelector('.js-custom-color');
  if (custom) {
    custom.addEventListener('change', () => onPick(custom.value));
  }
}

function materialMarkup(selected) {
  return `<div class="chip-row">${MATERIAL_PRESETS.map((m) => `<button class="chip${m.id === selected ? ' active' : ''}" data-material="${m.id}">${m.emoji} ${esc(m.name)}</button>`).join('')}</div>`;
}

function bindMaterial(root, onPick) {
  root.querySelectorAll('[data-material]').forEach((btn) => {
    btn.addEventListener('click', () => onPick(btn.dataset.material));
  });
}

function patternMarkup(selected) {
  return `<div class="pattern-grid">
    <button class="pattern-card none${!selected ? ' selected' : ''}" data-pattern="" title="Sin textura">Sin<br>textura</button>
    ${PATTERNS.map((p) => `<button class="pattern-card${selected === p.id ? ' selected' : ''}" data-pattern="${p.id}" title="${esc(p.name)}" style="background-image:url('${patternPreview(p.id)}')"><span>${esc(p.name)}</span></button>`).join('')}
  </div>`;
}

function bindPattern(root, onPick) {
  root.querySelectorAll('[data-pattern]').forEach((btn) => {
    btn.addEventListener('click', () => onPick(btn.dataset.pattern || null));
  });
}

function rangeMarkup(id, label, min, max, step, value) {
  return `<div class="range-row">
    <label for="${id}">${esc(label)}</label>
    <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">
    <output id="${id}Out">${value}</output>
  </div>`;
}

function bindRange(input, { onInput, onChange, format } = {}) {
  if (!input) return;
  const output = document.getElementById(input.id + 'Out');
  const update = () => {
    const min = +input.min;
    const max = +input.max;
    const value = +input.value;
    const pct = max > min ? ((value - min) / (max - min)) * 100 : 50;
    input.style.setProperty('--fill', pct + '%');
    if (output) output.textContent = format ? format(value) : String(value);
  };
  update();
  input.addEventListener('input', () => {
    update();
    if (onInput) onInput(+input.value);
  });
  input.addEventListener('change', () => {
    if (onChange) onChange(+input.value);
  });
}

function switchMarkup(id, on, title = '') {
  return `<button class="switch${on ? ' on' : ''}" id="${id}" role="switch" aria-checked="${on}" title="${esc(title)}"></button>`;
}

function bindSwitch(el, onChange) {
  if (!el) return;
  el.addEventListener('click', () => {
    const on = !el.classList.contains('on');
    el.classList.toggle('on', on);
    el.setAttribute('aria-checked', String(on));
    audio.click();
    onChange(on);
  });
}

function outlinerMarkup() {
  if (!content.children.length) {
    return `<div class="panel-note">${icon('info')}<span>Aún no hay nada en la escena. ¡Añade una forma o elige una plantilla!</span></div>`;
  }
  const rows = [];
  for (let i = content.children.length - 1; i >= 0; i--) {
    const obj = content.children[i];
    const top = state.selected ? topLevelOf(state.selected) : null;
    rows.push(`<button class="out-row${top === obj ? ' active' : ''}" data-out-index="${i}">
      <span class="out-emoji">${emojiForObject(obj)}</span>
      <span class="out-name">${esc(obj.name || 'Objeto')}</span>
      <span class="out-kind">${esc(kindLabel(obj))}</span>
    </button>`);
  }
  return `<div class="outliner">${rows.join('')}</div>`;
}

function bindOutliner(root) {
  root.querySelectorAll('[data-out-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const obj = content.children[+btn.dataset.outIndex];
      if (!obj) return;
      selectObject(obj);
      if (state.tool !== 'select') setTool('select');
    });
  });
}

function viewsMarkup() {
  return `<div class="chip-row">${Object.entries(VIEWS).map(([id, v]) => `<button class="chip${state.view === id ? ' active' : ''}" data-view="${id}">${v.emoji} ${esc(v.name)}</button>`).join('')}</div>`;
}

function bindViews(root) {
  root.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      flyTo(btn.dataset.view);
      root.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b === btn));
      audio.click();
    });
  });
}

// ===== Panel de opciones =====
function renderOptions() {
  const box = dom.optionsInner;
  switch (state.tool) {
    case 'shape': renderShapeOptions(box); break;
    case 'templates': renderTemplateOptions(box); break;
    case 'paint': renderPaintOptions(box); break;
    case 'doodle': renderDoodleOptions(box); break;
    case 'sticker': renderStickerOptions(box); break;
    case 'text': renderTextOptions(box); break;
    case 'scene': renderSceneOptions(box); break;
    case 'draw2d': renderDraw2DOptions(box); break;
    default: renderSelectOptions(box); break;
  }
}

function renderSelectOptions(box) {
  box.innerHTML = panelHead({
    kicker: 'Herramienta', title: 'Seleccionar', emoji: '👆',
    sub: 'Toca un objeto en la escena o en la lista. Doble clic elige el grupo completo.',
  }) + `<div class="panel-body">
    <section class="section">
      <div class="section-title"><span>Objetos en la escena</span><span class="st-note">${content.children.length}</span></div>
      ${outlinerMarkup()}
      <button class="btn small wide" id="optAddShape" style="margin-top:9px">${icon('plus')} Añadir una forma</button>
    </section>
    <section class="section">
      <div class="section-title"><span>Vistas de cámara</span></div>
      ${viewsMarkup()}
    </section>
    <section class="section">
      <div class="panel-note">${icon('info')}<span><strong>Arrastra</strong> con el botón izquierdo para girar la vista, con el derecho para moverte y usa la <strong>rueda</strong> para acercarte.</span></div>
    </section>
  </div>`;
  bindOutliner(box);
  bindViews(box);
  box.querySelector('#optAddShape').addEventListener('click', () => setTool('shape'));
}

function renderShapeOptions(box) {
  box.innerHTML = panelHead({
    kicker: 'Crear', title: 'Formas', emoji: '🧊',
    sub: 'Toca una forma para añadirla. Podrás pintarla y decorarla después.',
  }) + `<div class="panel-body">
    <section class="section">
      <div class="section-title"><span>Formas básicas</span><span class="st-note">toca para añadir</span></div>
      <div class="shape-grid">
        ${PRIMITIVES.map((p) => `<button class="shape-card" data-shape="${p.id}"><span class="shape-emoji">${p.emoji}</span><span class="shape-name">${esc(p.name)}</span></button>`).join('')}
      </div>
    </section>
    <section class="section">
      <div class="section-title"><span>Color</span></div>
      ${paletteMarkup(state.color)}
    </section>
    <section class="section">
      <div class="section-title"><span>Acabado</span></div>
      ${materialMarkup(state.materialId)}
    </section>
    <section class="section">
      <div class="section-title"><span>Textura</span><span class="st-note">opcional</span></div>
      ${patternMarkup(state.pattern)}
    </section>
    <section class="section">
      <div class="panel-note">${icon('sparkles')}<span>Las formas nuevas usan este color y acabado. También puedes cambiarlos cuando quieras.</span></div>
    </section>
  </div>`;
  box.querySelectorAll('[data-shape]').forEach((btn) => btn.addEventListener('click', () => addPrimitive(btn.dataset.shape)));
  bindPalette(box, (color) => { state.color = color; audio.click(); renderOptions(); });
  bindMaterial(box, (id) => { state.materialId = id; audio.click(); renderOptions(); });
  bindPattern(box, (id) => { state.pattern = id; audio.click(); renderOptions(); });
}

function renderTemplateOptions(box) {
  box.innerHTML = panelHead({
    kicker: 'Explorar', title: 'Plantillas', emoji: '🏠',
    sub: 'Empieza con un modelo y personalízalo: cada pieza se puede pintar y recolorear.',
  }) + `<div class="panel-body">
    <section class="section">
      <div class="template-grid">
        ${TEMPLATES.map((t) => `<button class="template-card" data-template="${t.id}"><span class="template-thumb">${t.emoji}</span><span class="template-name">${esc(t.name)}</span></button>`).join('')}
      </div>
    </section>
    <section class="section">
      <button class="btn wide soft" id="optRandomTemplate">${icon('sparkles')} Sorpréndeme con una plantilla</button>
    </section>
    <section class="section">
      <div class="panel-note">${icon('info')}<span>Puedes elegir una parte con un clic o el grupo entero con doble clic o desde la lista.</span></div>
    </section>
  </div>`;
  box.querySelectorAll('[data-template]').forEach((btn) => btn.addEventListener('click', () => addTemplate(btn.dataset.template)));
  box.querySelector('#optRandomTemplate').addEventListener('click', () => {
    const pick = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
    addTemplate(pick.id);
  });
}

function renderPaintOptions(box) {
  box.innerHTML = panelHead({
    kicker: 'Decorar', title: 'Pincel', emoji: '🖌️',
    sub: 'Mantén pulsado sobre un objeto y arrastra para pintarlo por encima.',
  }) + `<div class="panel-body">
    <section class="section">
      <div class="section-title"><span>Color de pintura</span></div>
      ${paletteMarkup(state.color)}
    </section>
    <section class="section">
      <div class="section-title"><span>Herramienta</span></div>
      <div class="chip-row">
        <button class="chip${!state.paintErase ? ' active' : ''}" data-paintmode="brush">🖌️ Pincel</button>
        <button class="chip${state.paintErase ? ' active' : ''}" data-paintmode="erase">🧽 Borrador</button>
      </div>
      ${rangeMarkup('optBrush', 'Grosor', 2, 80, 1, state.brush)}
    </section>
    <section class="section">
      <button class="btn small wide danger" id="optClearPaint">${icon('trash')} Quitar la pintura del objeto elegido</button>
    </section>
    <section class="section">
      <div class="panel-note">${icon('brush')}<span>La pintura se guarda con el objeto. Puedes deshacer con <kbd>Ctrl+Z</kbd>.</span></div>
    </section>
  </div>`;
  bindPalette(box, (color) => { state.color = color; audio.click(); renderOptions(); });
  box.querySelectorAll('[data-paintmode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.paintErase = btn.dataset.paintmode === 'erase';
      audio.click();
      renderOptions();
    });
  });
  bindRange(box.querySelector('#optBrush'), {
    onInput: (v) => { state.brush = v; },
  });
  box.querySelector('#optClearPaint').addEventListener('click', clearPaintOnSelected);
}

function renderDoodleOptions(box) {
  const thickness = Math.round(state.doodleSize * 100);
  box.innerHTML = panelHead({
    kicker: 'Dibujar', title: 'Doodle 3D', emoji: '✏️',
    sub: 'Dibuja en el aire: mantén pulsado y arrastra. Suelta para crear el trazo.',
  }) + `<div class="panel-body">
    <section class="section">
      <div class="section-title"><span>Color</span></div>
      ${paletteMarkup(state.color)}
    </section>
    <section class="section">
      <div class="section-title"><span>Trazo</span></div>
      ${rangeMarkup('optDoodleSize', 'Grosor', 3, 24, 1, thickness)}
    </section>
    <section class="section">
      <button class="btn small wide danger" id="optClearDoodles">${icon('trash')} Borrar todos los doodles</button>
    </section>
    <section class="section">
      <div class="panel-note">${icon('doodle')}<span>Consejo: gira la escena primero para dibujar desde otro ángulo. Cada trazo es un objeto que puedes mover.</span></div>
    </section>
  </div>`;
  bindPalette(box, (color) => { state.color = color; audio.click(); renderOptions(); });
  bindRange(box.querySelector('#optDoodleSize'), {
    onInput: (v) => { state.doodleSize = v / 100; },
    format: (v) => String(v),
  });
  box.querySelector('#optClearDoodles').addEventListener('click', clearDoodles);
}

function renderStickerOptions(box) {
  box.innerHTML = panelHead({
    kicker: 'Decorar', title: 'Stickers', emoji: '😀',
    sub: 'Toca un emoji y aparecerá en la escena. Luego muévelo a tu gusto.',
  }) + `<div class="panel-body">
    <section class="section">
      <div class="sticker-grid">
        ${STICKERS.map((s) => `<button class="sticker-card" data-sticker="${s}" title="Añadir ${esc(s)}">${s}</button>`).join('')}
      </div>
    </section>
    <section class="section">
      <div class="section-title"><span>Más opciones</span></div>
      <div style="display:flex;flex-direction:column;gap:7px">
        <button class="btn wide" id="optImageSticker">${icon('image')} Subir una imagen</button>
        <button class="btn wide soft" id="optSticker2D">${icon('draw2d')} Crear un dibujo 2D</button>
      </div>
    </section>
    <section class="section">
      <div class="panel-note">${icon('info')}<span>Los stickers siempre miran hacia la cámara. Puedes cambiar su tamaño desde las propiedades.</span></div>
    </section>
  </div>`;
  box.querySelectorAll('[data-sticker]').forEach((btn) => {
    btn.addEventListener('click', () => addSticker(btn.dataset.sticker));
  });
  box.querySelector('#optImageSticker').addEventListener('click', addImageStickerFromFile);
  box.querySelector('#optSticker2D').addEventListener('click', () => openEditor2D({
    onUseIn3D: (dibujo) => addImagePlaneFromDataUrl(dibujo.dataUrl, dibujo.aspect),
    toast,
    initialColor: state.color,
  }));
}

function renderTextOptions(box) {
  if (state.textValue === undefined) state.textValue = '¡Hola!';
  box.innerHTML = panelHead({
    kicker: 'Escribir', title: 'Texto 3D', emoji: '🔤',
    sub: 'Convierte tus palabras en letras con volumen.',
  }) + `<div class="panel-body">
    <section class="section">
      <div class="section-title"><span>Tu mensaje</span></div>
      <textarea class="field" id="optTextValue" maxlength="120" placeholder="Escribe algo bonito…">${esc(state.textValue)}</textarea>
    </section>
    <section class="section">
      <div class="section-title"><span>Forma de las letras</span></div>
      ${rangeMarkup('optTextSize', 'Tamaño', 50, 220, 5, Math.round(state.textSize * 100))}
      ${rangeMarkup('optTextDepth', 'Grosor', 5, 80, 1, Math.round(state.textDepth * 100))}
    </section>
    <section class="section">
      <div class="section-title"><span>Color</span></div>
      ${paletteMarkup(state.color)}
    </section>
    <section class="section">
      <div class="section-title"><span>Acabado</span></div>
      ${materialMarkup(state.materialId)}
    </section>
    <section class="section">
      <button class="btn primary wide" id="optAddText">${icon('plus')} Añadir texto 3D</button>
    </section>
    <section class="section">
      <div class="panel-note">${icon('text')}<span>Puedes escribir hasta 4 líneas usando <kbd>Enter</kbd>.</span></div>
    </section>
  </div>`;
  const ta = box.querySelector('#optTextValue');
  ta.addEventListener('input', () => { state.textValue = ta.value; });
  bindRange(box.querySelector('#optTextSize'), {
    onInput: (v) => { state.textSize = v / 100; },
    format: (v) => v + '%',
  });
  bindRange(box.querySelector('#optTextDepth'), {
    onInput: (v) => { state.textDepth = v / 100; },
    format: (v) => v + '%',
  });
  bindPalette(box, (color) => { state.color = color; state.textValue = ta.value; audio.click(); renderOptions(); });
  bindMaterial(box, (id) => { state.materialId = id; state.textValue = ta.value; audio.click(); renderOptions(); });
  box.querySelector('#optAddText').addEventListener('click', () => addTextMesh(ta.value));
}

function renderSceneOptions(box) {
  box.innerHTML = panelHead({
    kicker: 'Ambiente', title: 'Escena', emoji: '🌈',
    sub: 'Elige un fondo, cambia la cámara y ajusta la ayuda para mover objetos.',
  }) + `<div class="panel-body">
    <section class="section">
      <div class="section-title"><span>Ambientes</span></div>
      <div class="template-grid">
        ${ENVIRONMENTS.map((env) => `<button class="template-card" data-env="${env.id}" style="${state.environment === env.id ? 'border-color:#6c5ce7;box-shadow:0 0 0 2px #eeeafe inset' : ''}">
          <span class="template-thumb" style="background:linear-gradient(160deg, ${env.top}, ${env.bottom})">${env.emoji}</span>
          <span class="template-name">${esc(env.name)}</span>
        </button>`).join('')}
      </div>
    </section>
    <section class="section">
      <div class="section-title"><span>Vistas de cámara</span></div>
      ${viewsMarkup()}
    </section>
    <section class="section">
      <div class="section-title"><span>Ayudas</span></div>
      <div class="toggle-row">
        <div class="toggle-text"><span class="toggle-title">Cuadrícula</span><span class="toggle-sub">Líneas para orientarte</span></div>
        ${switchMarkup('optGrid', state.showGrid, 'Mostrar la cuadrícula')}
      </div>
      <div class="toggle-row">
        <div class="toggle-text"><span class="toggle-title">Suelo</span><span class="toggle-sub">Una base para tus objetos</span></div>
        ${switchMarkup('optFloor', state.showFloor, 'Mostrar el suelo')}
      </div>
      <div class="toggle-row">
        <div class="toggle-text"><span class="toggle-title">Imán</span><span class="toggle-sub">Mover en pasos pequeños</span></div>
        ${switchMarkup('optSnap', state.snap, 'Activar el imán')}
      </div>
    </section>
    <section class="section">
      <button class="btn small wide danger" id="optClearScene">${icon('trash')} Vaciar la escena</button>
    </section>
    <section class="section">
      <div class="panel-note">${icon('sparkles')}<span>El ambiente y las ayudas se guardan con tu creación.</span></div>
    </section>
  </div>`;
  box.querySelectorAll('[data-env]').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyEnvironment(btn.dataset.env);
      audio.whoosh();
      renderOptions();
    });
  });
  bindViews(box);
  bindSwitch(box.querySelector('#optGrid'), (on) => {
    state.showGrid = on;
    applySceneFlags();
    updateZoomBar();
    scheduleAutosave();
  });
  bindSwitch(box.querySelector('#optFloor'), (on) => {
    state.showFloor = on;
    applySceneFlags();
    scheduleAutosave();
  });
  bindSwitch(box.querySelector('#optSnap'), (on) => {
    state.snap = on;
    applySceneFlags();
    scheduleAutosave();
  });
  box.querySelector('#optClearScene').addEventListener('click', clearSceneWithConfirm);
}

function renderDraw2DOptions(box) {
  box.innerHTML = panelHead({
    kicker: 'Pintar', title: 'Dibujo 2D', emoji: '🎨',
    sub: 'Dibuja con pincel, sellos y recorte mágico. Después llévalo a tu escena.',
  }) + `<div class="panel-body">
    <section class="section">
      <button class="btn primary wide" id="optOpen2D" style="height:46px">${icon('draw2d')} Abrir el editor de dibujo</button>
    </section>
    <section class="section">
      <button class="btn wide" id="optPlaneImage">${icon('image')} Usar una imagen como dibujo</button>
    </section>
    <section class="section">
      <div class="section-title"><span>Qué puedes hacer</span></div>
      <div class="panel-note" style="flex-direction:column;gap:6px">
        <span>🖌️ Pintar con pincel y borrador</span>
        <span>🌟 Añadir sellos y emojis</span>
        <span>✂️ Quitar el fondo con el recorte mágico</span>
        <span>🖼️ Llevar el dibujo a la escena 3D</span>
      </div>
    </section>
    <section class="section">
      <div class="panel-note">${icon('info')}<span>Los dibujos se guardan con fondo transparente para que se vean genial en 3D.</span></div>
    </section>
  </div>`;
  const open = () => openEditor2D({
    onUseIn3D: (dibujo) => addImagePlaneFromDataUrl(dibujo.dataUrl, dibujo.aspect),
    toast,
    initialColor: state.color,
  });
  box.querySelector('#optOpen2D').addEventListener('click', open);
  box.querySelector('#optPlaneImage').addEventListener('click', addImageStickerFromFile);
}

// ===== Inspector de propiedades =====
function renderInspector() {
  const obj = state.selected;
  const box = dom.inspectorInner;
  if (!obj || !isDescendantOfContent(obj)) {
    box.innerHTML = panelHead({
      kicker: 'Propiedades', title: 'Nada seleccionado', emoji: '🪄',
      sub: 'Elige un objeto de la escena para cambiar su color, tamaño o acabado.',
    }) + `<div class="panel-body">
      <section class="section">
        <div class="panel-note">${icon('cursor')}<span>Con la herramienta <strong>Elegir</strong> puedes tocar cualquier objeto. Doble clic elige el grupo completo.</span></div>
      </section>
      <section class="section">
        <div class="section-title"><span>Resumen</span></div>
        <div class="color-current"><span class="cc-dot" style="background:var(--accent)"></span><span class="cc-name">${content.children.length} ${content.children.length === 1 ? 'objeto' : 'objetos'}</span><span class="cc-code">${countMeshes(content.children)} piezas</span></div>
      </section>
      <section class="section">
        <div class="section-title"><span>Atajos útiles</span></div>
        <table class="shortcut-table">
          <tr><td>Girar la vista</td><td><kbd>Arrastrar</kbd></td></tr>
          <tr><td>Acercar o alejar</td><td><kbd>Rueda</kbd></td></tr>
          <tr><td>Deshacer</td><td><kbd>Ctrl</kbd> + <kbd>Z</kbd></td></tr>
          <tr><td>Borrar lo elegido</td><td><kbd>Supr</kbd></td></tr>
        </table>
      </section>
      <section class="section">
        <button class="btn soft wide" id="insHelp">${icon('help')} Ver la ayuda completa</button>
      </section>
    </div>`;
    const help = box.querySelector('#insHelp');
    if (help) help.addEventListener('click', openHelp);
    return;
  }

  const parent = metaParentOf(obj);
  const isGroup = obj.isGroup;
  const paintable = Object.values(obj.children || {}).length >= 0 && hasStandardMaterial(obj);
  const meta = obj.userData.meta || {};
  const scaleBase = obj.scale.clone();
  const rotY = THREE.MathUtils.radToDeg(obj.rotation.y);
  const color = state.color;

  box.innerHTML = panelHead({
    kicker: kindLabel(obj), title: obj.name || 'Objeto', emoji: emojiForObject(obj),
    sub: isGroup ? `Grupo con ${obj.children.length} piezas.` : (parent ? `Parte de ${parent.name}.` : 'Objeto de la escena.'),
  }) + `<div class="panel-body">
    <section class="section">
      <div class="field-row">
        <button class="btn small" id="insDuplicate">${icon('duplicate')} Duplicar</button>
        <button class="btn small danger" id="insDelete">${icon('trash')} Borrar</button>
      </div>
      ${parent ? `<button class="btn small soft wide" id="insSelectParent" style="margin-top:7px">${icon('layers')} Seleccionar todo el grupo</button>` : ''}
    </section>

    <section class="section">
      <div class="section-title"><span>Posición</span><span class="st-note">metros</span></div>
      <div class="field-row" style="gap:6px">
        <div><span class="field-label" style="margin:0 0 4px">X</span><input class="field" id="insX" type="number" step="0.1" value="${fmt(obj.position.x)}"></div>
        <div><span class="field-label" style="margin:0 0 4px">Y</span><input class="field" id="insY" type="number" step="0.1" value="${fmt(obj.position.y)}"></div>
        <div><span class="field-label" style="margin:0 0 4px">Z</span><input class="field" id="insZ" type="number" step="0.1" value="${fmt(obj.position.z)}"></div>
      </div>
      ${rangeMarkup('insRotate', 'Girar', 0, 360, 1, Math.round(rotY))}
      ${rangeMarkup('insScale', 'Tamaño', 25, 300, 1, 100)}
      <div class="chip-row" style="margin-top:6px">
        <button class="chip" id="insGround">${icon('snap')} Aterrizar</button>
        <button class="chip" id="insCenter">${icon('move')} Centrar</button>
        <button class="chip" id="insFlip">${icon('flip')} Voltear</button>
        <button class="chip" id="insFocus">${icon('eye')} Enfocar</button>
      </div>
    </section>

    <div class="toggle-row">
      <div class="toggle-text"><span class="toggle-title">Visible</span><span class="toggle-sub">Mostrar u ocultar</span></div>
      ${switchMarkup('insVisible', obj.visible !== false, 'Mostrar u ocultar el objeto')}
    </div>

    ${paintable ? `
    <section class="section">
      <div class="section-title"><span>Color</span>${isPainted(obj) ? '<span class="st-note">pintado</span>' : ''}</div>
      ${isPainted(obj) ? `<div class="panel-note" style="margin-bottom:9px">${icon('brush')}<span>Este objeto tiene pintura. Puedes <strong>quitar la pintura</strong> para volver a su color liso.</span></div>` : ''}
      ${paletteMarkup(color)}
    </section>
    <section class="section">
      <div class="section-title"><span>Acabado</span></div>
      ${materialMarkup(state.materialId)}
    </section>
    <section class="section">
      <div class="section-title"><span>Textura</span></div>
      ${patternMarkup(state.pattern)}
    </section>` : ''}

    ${meta.kind === 'text' ? `
    <section class="section">
      <div class="section-title"><span>Editar el texto</span></div>
      <textarea class="field" id="insTextValue" maxlength="120">${esc(meta.text || '')}</textarea>
      <button class="btn small wide" id="insUpdateText" style="margin-top:7px">${icon('check')} Actualizar texto</button>
    </section>` : ''}

    ${isPainted(obj) ? `
    <section class="section">
      <button class="btn small wide danger" id="insClearPaint">${icon('eraser')} Quitar la pintura</button>
    </section>` : ''}

    <section class="section">
      <div class="panel-note">${icon('info')}<span>Usa el gizmo de la escena para mover, girar o escalar. Todo se puede deshacer.</span></div>
    </section>
  </div>`;

  box.querySelector('#insDuplicate').addEventListener('click', duplicateSelected);
  box.querySelector('#insDelete').addEventListener('click', deleteSelected);
  const parentBtn = box.querySelector('#insSelectParent');
  if (parentBtn) parentBtn.addEventListener('click', () => selectObject(parent));

  ['X', 'Y', 'Z'].forEach((axis) => {
    const input = box.querySelector('#ins' + axis);
    const apply = () => {
      const value = parseFloat(input.value);
      if (!isFinite(value)) return;
      obj.position[axis.toLowerCase()] = value;
      updateSelectionChip();
      commit('Mover objeto');
    };
    input.addEventListener('change', apply);
    input.addEventListener('blur', () => { if (isFinite(parseFloat(input.value))) apply(); });
  });

  bindRange(box.querySelector('#insRotate'), {
    onInput: (v) => { obj.rotation.y = THREE.MathUtils.degToRad(v); },
    onChange: () => commit('Girar objeto'),
    format: (v) => v + '°',
  });
  bindRange(box.querySelector('#insScale'), {
    onInput: (v) => { const f = v / 100; obj.scale.set(scaleBase.x * f, scaleBase.y * f, scaleBase.z * f); },
    onChange: () => commit('Cambiar tamaño'),
    format: (v) => v + '%',
  });

  box.querySelector('#insGround').addEventListener('click', () => {
    fitToGround(obj);
    commit('Aterrizar objeto');
    renderInspector();
    audio.pop();
  });
  box.querySelector('#insCenter').addEventListener('click', () => {
    centerXZ(obj);
    commit('Centrar objeto');
    renderInspector();
    audio.pop();
  });
  box.querySelector('#insFlip').addEventListener('click', () => {
    obj.scale.x *= -1;
    commit('Voltear objeto');
    renderInspector();
    audio.click();
  });
  box.querySelector('#insFocus').addEventListener('click', () => {
    focusCameraOnObject(obj);
    audio.click();
  });
  bindSwitch(box.querySelector('#insVisible'), (on) => {
    obj.visible = on;
    commit(on ? 'Mostrar objeto' : 'Ocultar objeto');
    selectionBox.visible = on;
  });

  bindPalette(box, (hex) => applyColorToObject(obj, hex));
  bindMaterial(box, (id) => applyMaterialToObject(obj, id));
  bindPattern(box, (id) => applyPatternToObject(obj, id));

  const textValue = box.querySelector('#insTextValue');
  const updateText = box.querySelector('#insUpdateText');
  if (textValue && updateText) updateText.addEventListener('click', () => updateTextObject(obj, textValue.value));
  const clearPaintBtn = box.querySelector('#insClearPaint');
  if (clearPaintBtn) clearPaintBtn.addEventListener('click', () => {
    clearPaintOnSelected();
    renderInspector();
  });
}

function hasStandardMaterial(obj) {
  let found = false;
  obj.traverse((child) => {
    if (child.isMesh && child.material && child.material.isMeshStandardMaterial) found = true;
  });
  return found;
}

function updateSelectionChip() {
  const obj = state.selected;
  if (!obj || !isDescendantOfContent(obj)) {
    dom.selectionChip.classList.add('hidden');
    dom.selectionChip.innerHTML = '';
    return;
  }
  const parent = metaParentOf(obj);
  dom.selectionChip.classList.remove('hidden');
  dom.selectionChip.innerHTML = `
    <span>${emojiForObject(obj)}</span>
    <span class="sc-name">${esc(obj.name || 'Objeto')}</span>
    ${parent ? `<button class="sc-parent" id="chipParent" title="Seleccionar ${esc(parent.name)}">${icon('layers')} ${esc(parent.name)}</button>` : ''}
    <button class="icon-btn sc-close" id="chipClose" title="Quitar la selección">${icon('close')}</button>`;
  dom.selectionChip.querySelector('#chipClose').addEventListener('click', (e) => { e.stopPropagation(); clearSelection(); });
  const parentBtn = dom.selectionChip.querySelector('#chipParent');
  if (parentBtn) parentBtn.addEventListener('click', (e) => { e.stopPropagation(); selectObject(parent); });
}

function focusSelectionChip() {
  const chip = dom.selectionChip;
  if (!chip || chip.classList.contains('hidden')) return;
  chip.style.transform = 'scale(1.03)';
  setTimeout(() => { chip.style.transform = ''; }, 160);
}

function updateHint() {
  if (state.tool === 'select' && state.selected) {
    setHint('Arrastra las flechas para mover · doble clic elige el grupo · <kbd>Supr</kbd> borra · <kbd>Ctrl+Z</kbd> deshace');
  } else {
    setHint(TOOL_HINTS[state.tool] || '');
  }
}

function updateStatus() {
  const objects = content.children.length;
  const pieces = countMeshes(content.children);
  const selectedName = state.selected ? state.selected.name : 'Listo';
  dom.statusLeft.innerHTML = `
    <span class="status-item"><span class="status-dot${state.busy ? ' busy' : ''}"></span>${esc(selectedName)}</span>
    <span class="status-item">${icon('cube')} ${objects} ${objects === 1 ? 'objeto' : 'objetos'} · ${pieces} piezas</span>
    <span class="status-item">${icon('snap')} ${state.snap ? 'Imán activo' : 'Movimiento libre'}</span>`;
  dom.statusRight.innerHTML = `
    <span class="status-item">${icon(isDesktopApp() ? 'save' : 'download')} ${isDesktopApp() ? 'Aplicación de escritorio' : 'Navegador'}</span>
    <span class="status-item">Creador 3D v${esc(appVersion)}</span>`;
}

function renderAll() {
  updateToolbar();
  updateModeBar();
  updateUndoButtons();
  updateZoomBar();
  updateSelectionChip();
  renderOptions();
  renderInspector();
  updateStatus();
  updateHint();
  updateGizmoForTool();
}

// ===== Selección =====
function selectObject(obj, { quiet = false } = {}) {
  if (!obj || !isDescendantOfContent(obj) || obj.visible === false) {
    clearSelection();
    return;
  }
  state.selected = obj;
  syncLookFromObject(obj);
  selectionBox.visible = true;
  selectionBox.setFromObject(obj);
  updateGizmoForTool();
  updateSelectionChip();
  updateModeBar();
  renderInspector();
  updateStatus();
  updateHint();
  if (state.tool === 'select') renderOptions();
  if (!quiet) audio.click();
  focusSelectionChip();
}

function clearSelection() {
  state.selected = null;
  gizmo.detach();
  gizmoHelper.visible = false;
  selectionBox.visible = false;
  dom.selectionChip.classList.add('hidden');
  dom.selectionChip.innerHTML = '';
  updateModeBar();
  renderInspector();
  updateStatus();
  updateHint();
  if (state.tool === 'select') renderOptions();
}

function pickAt(event) {
  const hits = raycastContent(event).filter((h) => h.object && h.object.visible !== false);
  if (!hits.length) {
    clearSelection();
    return;
  }
  let node = hits[0].object;
  while (node && node !== content && !(node.userData && node.userData.meta)) node = node.parent;
  if (node && node !== content && (node.userData && node.userData.meta)) selectObject(node);
  else selectObject(topLevelOf(hits[0].object));
}

// ===== Crear objetos =====
function placeNewObject(obj) {
  fitToGround(obj);
  centerXZ(obj);
  const n = content.children.length;
  if (n > 0) {
    const angle = n * 2.39996;
    const radius = 1.35 + (n % 4) * 0.5;
    obj.position.x += Math.cos(angle) * radius;
    obj.position.z += Math.sin(angle) * radius;
    obj.updateMatrixWorld(true);
  }
}

function addPrimitive(type) {
  const def = PRIMITIVES.find((p) => p.id === type);
  if (!def) return null;
  const mesh = createPrimitive(type, currentSpec());
  placeNewObject(mesh);
  content.add(mesh);
  selectObject(mesh, { quiet: true });
  commit('Añadir ' + mesh.name);
  audio.add();
  toast(`${mesh.name} añadido`, 'success', 'Puedes moverlo con el gizmo o pintarlo con el pincel.');
  return mesh;
}

function addTemplate(id) {
  const def = TEMPLATES.find((t) => t.id === id);
  const group = buildTemplate(id);
  if (!group) {
    toast('No se pudo crear la plantilla.', 'error');
    audio.error();
    return null;
  }
  placeNewObject(group);
  content.add(group);
  selectObject(group, { quiet: true });
  commit('Añadir plantilla ' + (def ? def.name : id));
  audio.success();
  toast(`Plantilla ${def ? def.name : ''} añadida`, 'success', 'Cada pieza se puede pintar y recolorear por separado.');
  return group;
}

function addTextMesh(text) {
  const clean = String(text || '').replace(/\s+$/, '');
  if (!clean.trim()) {
    toast('Escribe algo para crear el texto 3D.', 'error');
    audio.error();
    return null;
  }
  const mesh = createTextMesh(clean, {
    ...currentSpec(),
    size: state.textSize,
    depth: state.textDepth,
  });
  placeNewObject(mesh);
  content.add(mesh);
  selectObject(mesh, { quiet: true });
  commit('Añadir texto 3D');
  audio.add();
  toast('Texto 3D añadido', 'success', 'Cámbialo de color desde las propiedades.');
  return mesh;
}

function stickerPlacement() {
  const base = controls.target.clone();
  base.y += 1.55;
  base.x += (Math.random() - 0.5) * 1.8;
  base.z += (Math.random() - 0.5) * 1.8;
  return base;
}

function addSticker(emoji) {
  const sprite = createEmojiSticker(emoji, { scale: 1.35 });
  sprite.position.copy(stickerPlacement());
  content.add(sprite);
  selectObject(sprite, { quiet: true });
  commit('Añadir sticker');
  audio.pop();
  toast(`Sticker ${emoji} añadido`, 'success', 'Muévelo con el gizmo o cámbiale el tamaño.');
  return sprite;
}

function loadImageAspect(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width / Math.max(1, img.height));
    img.onerror = () => resolve(1);
    img.src = dataUrl;
  });
}

async function addImageStickerFromFile() {
  const res = await openImageFile();
  if (!res || res.canceled || !res.dataUrl) return;
  const aspect = await loadImageAspect(res.dataUrl);
  const sprite = createImageSticker(res.dataUrl, { scale: 1.9, aspect });
  sprite.name = res.name ? res.name.replace(/\.[a-z0-9]+$/i, '') : 'Sticker de imagen';
  sprite.position.copy(stickerPlacement());
  content.add(sprite);
  selectObject(sprite, { quiet: true });
  commit('Añadir sticker de imagen');
  audio.add();
  toast('Imagen añadida como sticker', 'success', 'Los stickers miran siempre hacia la cámara.');
}

function addImagePlaneFromDataUrl(dataUrl, aspect = 1.5) {
  if (!dataUrl) return null;
  const plane = createImagePlane(dataUrl, { aspect: aspect || 1.5, height: 2.7, dataUrl });
  plane.rotation.y = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
  placeNewObject(plane);
  content.add(plane);
  selectObject(plane, { quiet: true });
  commit('Añadir dibujo 2D');
  audio.add();
  toast('Dibujo llevado a la escena', 'success', 'Puedes moverlo, girarlo y escalarlo como cualquier objeto.');
  return plane;
}

function duplicateSelected() {
  const obj = state.selected;
  if (!obj) {
    toast('Elige un objeto para duplicarlo.', 'info');
    return;
  }
  const copy = cloneObject(obj);
  content.add(copy);
  selectObject(copy, { quiet: true });
  commit('Duplicar objeto');
  audio.pop();
  toast('Objeto duplicado', 'success', 'Ctrl+Z si quieres deshacerlo.');
}

function deleteSelected() {
  const obj = state.selected;
  if (!obj) {
    toast('No hay nada seleccionado.', 'info');
    return;
  }
  const parent = obj.parent;
  if (!parent) return;
  parent.remove(obj);
  disposeTree(obj);
  clearSelection();
  commit('Borrar objeto');
  audio.whoosh();
  toast('Objeto borrado', 'success', 'Puedes recuperarlo con Ctrl+Z.');
}

function clearScene() {
  if (!content.children.length) {
    toast('La escena ya está vacía.', 'info');
    return;
  }
  while (content.children.length) {
    const child = content.children.pop();
    disposeTree(child);
  }
  clearSelection();
  commit('Vaciar la escena');
  audio.whoosh();
  toast('Escena vacía', 'success', 'Ctrl+Z para recuperar lo anterior.');
}

async function clearSceneWithConfirm() {
  if (!content.children.length) {
    toast('La escena ya está vacía.', 'info');
    return;
  }
  const ok = await confirmDialog({
    title: '¿Vaciar la escena?',
    message: 'Se quitarán todos los objetos. Todavía podrás recuperarlos con Ctrl+Z.',
    confirmLabel: 'Sí, vaciar',
    danger: true,
  });
  if (ok) clearScene();
}

// ===== Colores, materiales y texturas =====
function removePaintFromMesh(mesh, { restoreColor = true } = {}) {
  const layer = mesh.userData.paint;
  if (!layer) return;
  if (mesh.material) {
    if (mesh.material.map === layer.texture) mesh.material.map = null;
    mesh.material.userData.paint = false;
    const base = mesh.material.userData.baseColor || '#ffffff';
    if (restoreColor) {
      mesh.material.color.set(base);
      if (mesh.material.emissiveIntensity > 0) mesh.material.emissive.set(base);
    }
    mesh.material.needsUpdate = true;
  }
  try { layer.texture.dispose(); } catch { /* nada */ }
  mesh.userData.paint = null;
}

function clearPaintOnSelected() {
  const obj = state.selected;
  if (!obj) {
    toast('Elige primero el objeto pintado.', 'info');
    return;
  }
  let had = false;
  obj.traverse((mesh) => {
    if (mesh.userData.paint) {
      removePaintFromMesh(mesh, { restoreColor: true });
      had = true;
    }
  });
  if (!had) {
    toast('El objeto elegido no tiene pintura.', 'info');
    return;
  }
  commit('Quitar pintura');
  renderInspector();
  audio.pop();
  toast('Pintura quitada', 'success');
}

function clearDoodles() {
  const doodles = content.children.filter((child) => child.userData.meta && child.userData.meta.kind === 'doodle');
  if (!doodles.length) {
    toast('Todavía no hay doodles.', 'info');
    return;
  }
  doodles.forEach((d) => {
    content.remove(d);
    disposeTree(d);
  });
  if (state.selected && !isDescendantOfContent(state.selected)) clearSelection();
  commit('Borrar doodles');
  renderOptions();
  audio.whoosh();
  toast('Doodles borrados', 'success', 'Ctrl+Z si te arrepientes.');
}

function applyColorToObject(obj, hex) {
  obj.traverse((mesh) => {
    if (mesh.isMesh && !mesh.userData.isImage && mesh.material && mesh.material.isMeshStandardMaterial) {
      removePaintFromMesh(mesh, { restoreColor: false });
      mesh.material.map = null;
      mesh.material.userData.pattern = null;
      mesh.material.color.set(hex);
      mesh.material.userData.baseColor = hex;
      if (mesh.material.emissiveIntensity > 0) mesh.material.emissive.set(hex);
      mesh.material.needsUpdate = true;
    }
  });
  state.color = hex;
  state.pattern = null;
  commit('Cambiar color');
  renderInspector();
  audio.pop();
}

function applyMaterialToObject(obj, materialId) {
  if (!materialPreset(materialId)) return;
  obj.traverse((mesh) => {
    if (mesh.isMesh && !mesh.userData.isImage && mesh.material && mesh.material.isMeshStandardMaterial) {
      removePaintFromMesh(mesh, { restoreColor: false });
      const spec = serializeMaterial(mesh.material);
      applyMaterialSpec(mesh, spec, materialId);
    }
  });
  state.materialId = materialId;
  const preset = materialPreset(materialId);
  commit('Cambiar acabado');
  renderInspector();
  audio.click();
  toast(`Acabado: ${preset.name}`, 'info');
}

function applyPatternToObject(obj, patternId) {
  obj.traverse((mesh) => {
    if (mesh.isMesh && !mesh.userData.isImage && mesh.material && mesh.material.isMeshStandardMaterial) {
      removePaintFromMesh(mesh, { restoreColor: false });
      const spec = serializeMaterial(mesh.material);
      spec.pattern = patternId;
      applyMaterialSpec(mesh, spec, spec.preset);
    }
  });
  state.pattern = patternId;
  commit('Cambiar textura');
  renderInspector();
  audio.pop();
  const def = PATTERNS.find((p) => p.id === patternId);
  toast(patternId ? `Textura: ${def ? def.name : patternId}` : 'Textura quitada', 'info');
}

function updateTextObject(obj, text) {
  const meta = obj.userData.meta;
  if (!meta || meta.kind !== 'text') return;
  const clean = String(text || '').replace(/\s+$/, '');
  if (!clean.trim()) {
    toast('El texto no puede estar vacío.', 'error');
    return;
  }
  const spec = serializeMaterial(obj.material);
  const fresh = createTextMesh(clean, { ...spec, size: meta.size, depth: meta.depth });
  removePaintFromMesh(obj, { restoreColor: false });
  obj.geometry.dispose();
  obj.geometry = fresh.geometry;
  fresh.material.dispose();
  obj.userData.meta = { ...meta, text: clean };
  obj.name = fresh.name;
  commit('Editar texto');
  renderInspector();
  audio.pop();
  toast('Texto actualizado', 'success');
}

// ===== Pintura =====
function ensurePaintLayer(mesh) {
  if (mesh.userData.paint) return mesh.userData.paint;
  const base = (mesh.material.userData && mesh.material.userData.baseColor) || '#ffffff';
  const layer = createPaintLayer(base, []);
  mesh.material.map = layer.texture;
  mesh.material.color.set('#ffffff');
  mesh.material.userData.paint = true;
  mesh.material.needsUpdate = true;
  mesh.userData.paint = layer;
  return layer;
}

let paintingStroke = null;
let doodleStroke = null;
let pointerDownInfo = null;

function beginPaint(event) {
  const hits = raycastContent(event).filter((hit) => {
    const obj = hit.object;
    return obj && obj.isMesh && !obj.userData.isImage && obj.material && obj.material.isMeshStandardMaterial && hit.uv;
  });
  if (!hits.length) {
    controls.enabled = true;
    return;
  }
  const hit = hits[0];
  const mesh = hit.object;
  if (state.selected !== mesh) selectObject(mesh, { quiet: true });
  const layer = ensurePaintLayer(mesh);
  const stroke = {
    color: state.color,
    erase: state.paintErase,
    size: state.brush,
    points: [uvToPixel(hit.uv)],
  };
  layer.strokes.push(stroke);
  drawPaintStroke(layer, stroke, 0);
  paintingStroke = { mesh, layer, stroke, pointerId: event.pointerId };
  try { dom.canvas.setPointerCapture(event.pointerId); } catch { /* nada */ }
  audio.paint();
}

function continuePaint(event) {
  if (!paintingStroke) return;
  const { mesh, layer, stroke } = paintingStroke;
  const hits = raycastContent(event, { objects: [mesh], recursive: false });
  const hit = hits.find((h) => h.uv);
  if (!hit) return;
  const point = uvToPixel(hit.uv);
  const last = stroke.points[stroke.points.length - 1];
  if (Math.hypot(point.x - last.x, point.y - last.y) < 1.5) return;
  const previousLength = stroke.points.length;
  stroke.points.push(point);
  drawPaintStroke(layer, stroke, previousLength);
  if (Math.random() < 0.16) audio.paint();
}

function endPaint() {
  if (!paintingStroke) return;
  const { stroke } = paintingStroke;
  paintingStroke = null;
  controls.enabled = true;
  if (stroke.points.length) commit('Pintar objeto');
  updateStatus();
}

// ===== Doodles =====
function beginDoodle(event) {
  const hits = raycastContent(event);
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  let start = null;
  if (hits.length && hits[0].point) {
    start = hits[0].point.clone().addScaledVector(dir, -0.22);
  } else {
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(dir, controls.target);
    const point = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, point)) start = point;
  }
  if (!start) {
    controls.enabled = true;
    return;
  }
  start.y = Math.max(0.12, start.y);
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(dir.clone(), start);
  doodleStroke = {
    points: [start],
    plane,
    color: state.color,
    size: state.doodleSize,
    pointerId: event.pointerId,
  };
  doodlePreview.geometry.dispose();
  doodlePreview.geometry = new THREE.BufferGeometry().setFromPoints([start]);
  doodlePreview.material.color.set(state.color);
  doodlePreview.visible = true;
  try { dom.canvas.setPointerCapture(event.pointerId); } catch { /* nada */ }
  audio.paint();
}

function continueDoodle(event) {
  if (!doodleStroke) return;
  pointerToNdc(event);
  const point = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(doodleStroke.plane, point)) return;
  point.y = Math.max(0.08, point.y);
  const last = doodleStroke.points[doodleStroke.points.length - 1];
  if (point.distanceTo(last) < 0.035) return;
  doodleStroke.points.push(point.clone());
  doodlePreview.geometry.dispose();
  doodlePreview.geometry = new THREE.BufferGeometry().setFromPoints(doodleStroke.points);
}

function endDoodle() {
  if (!doodleStroke) return;
  const { points, color, size } = doodleStroke;
  doodleStroke = null;
  doodlePreview.visible = false;
  controls.enabled = true;
  if (!points.length) return;
  const mesh = createDoodle(points, size, {
    color,
    materialId: state.materialId,
    pattern: state.pattern,
  });
  content.add(mesh);
  selectObject(mesh, { quiet: true });
  commit('Doodle 3D');
  audio.pop();
  toast('¡Doodle creado!', 'success', 'Muévelo, gíralo o píntalo como cualquier objeto.');
}

// ===== Eventos del lienzo =====
function canvasPoint(event) {
  const rect = dom.canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
    y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
  };
}

function finishPointer(event) {
  if (paintingStroke) endPaint();
  if (doodleStroke) endDoodle();
  try { dom.canvas.releasePointerCapture(event.pointerId); } catch { /* nada */ }
}

dom.canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  pointerDownInfo = { x: event.clientX, y: event.clientY, time: performance.now() };
  if (state.tool === 'paint') {
    controls.enabled = false;
    beginPaint(event);
  } else if (state.tool === 'doodle') {
    controls.enabled = false;
    beginDoodle(event);
  }
}, true);

dom.canvas.addEventListener('pointermove', (event) => {
  if (paintingStroke) continuePaint(event);
  else if (doodleStroke) continueDoodle(event);
});

dom.canvas.addEventListener('pointerup', (event) => {
  const wasPainting = !!paintingStroke;
  const wasDoodling = !!doodleStroke;
  finishPointer(event);
  if (state.tool === 'select' && !wasPainting && !wasDoodling && !gizmo.dragging && pointerDownInfo) {
    const dx = event.clientX - pointerDownInfo.x;
    const dy = event.clientY - pointerDownInfo.y;
    if (Math.hypot(dx, dy) < 5 && performance.now() - pointerDownInfo.time < 900) pickAt(event);
  }
  pointerDownInfo = null;
  controls.enabled = true;
});

dom.canvas.addEventListener('pointercancel', (event) => {
  finishPointer(event);
  pointerDownInfo = null;
  controls.enabled = true;
});

dom.canvas.addEventListener('dblclick', (event) => {
  if (state.tool !== 'select') return;
  const hits = raycastContent(event).filter((h) => h.object && h.object.visible !== false);
  if (!hits.length) return;
  let node = hits[0].object;
  while (node && node !== content && !(node.userData && node.userData.meta)) node = node.parent;
  const parent = node ? metaParentOf(node) : null;
  if (parent) selectObject(parent);
  else if (node && node !== content) selectObject(node);
});

dom.canvas.addEventListener('contextmenu', (event) => event.preventDefault());

// Movimiento del gizmo.
gizmo.addEventListener('dragging-changed', (event) => {
  controls.enabled = !event.value;
  if (!event.value && state.selected && isDescendantOfContent(state.selected)) {
    selectionBox.setFromObject(state.selected);
    commit('Transformar objeto');
    renderInspector();
  }
});

gizmo.addEventListener('objectChange', () => {
  if (state.selected) {
    selectionBox.setFromObject(state.selected);
    if (state.tool === 'select') updateSelectionChip();
  }
});

// Mantener el recuadro al día tras cambios de tamaño.
setInterval(() => {
  if (state.selected && selectionBox.visible) {
    try { selectionBox.setFromObject(state.selected); } catch { /* nada */ }
  }
}, 450);

// ===== Historial y guardado automático =====
const history = new History(40);
let autosaveTimer = 0;
let autosaveInFlight = false;

function snapshotState() {
  return serializeScene(content.children, currentSettings());
}

function commit(label = 'Cambio') {
  if (!state.historyReady) return;
  history.push(snapshotState(), label);
  updateUndoButtons();
  updateStatus();
  scheduleAutosave();
}

function restoreSceneState(sceneState) {
  const result = restoreProject({ scene: sceneState }, content);
  applySettings(result.settings || {});
  clearSelection();
  renderAll();
}

function undo() {
  if (!state.historyReady || !history.canUndo) {
    toast('No hay nada que deshacer.', 'info');
    return;
  }
  const entry = history.undo();
  if (!entry) return;
  restoreSceneState(entry.state);
  updateUndoButtons();
  scheduleAutosave();
  audio.whoosh();
  toast('Deshecho: ' + entry.label, 'info');
}

function redo() {
  if (!state.historyReady || !history.canRedo) {
    toast('No hay nada que rehacer.', 'info');
    return;
  }
  const entry = history.redo();
  if (!entry) return;
  restoreSceneState(entry.state);
  updateUndoButtons();
  scheduleAutosave();
  audio.whoosh();
  toast('Rehecho: ' + entry.label, 'info');
}

function scheduleAutosave() {
  if (!state.historyReady) return;
  setSaveState('Guardando…', 'saving');
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(doAutosave, 950);
}

async function doAutosave() {
  if (autosaveInFlight || !state.historyReady) return;
  autosaveInFlight = true;
  try {
    const payload = JSON.stringify(createProjectData(state.name, content.children, currentSettings(), camera, controls.target));
    const res = await saveAutosave(payload);
    if (res && res.ok) setSaveState('Guardado');
    else setSaveState('Sin guardar', 'error');
  } catch (err) {
    console.warn('No se pudo guardar automáticamente', err);
    setSaveState('Sin guardar', 'error');
  } finally {
    autosaveInFlight = false;
  }
}

// ===== Proyectos =====
async function saveProject() {
  if (state.busy) return;
  state.busy = true;
  updateStatus();
  setSaveState('Guardando…', 'saving');
  try {
    const data = createProjectData(state.name, content.children, currentSettings(), camera, controls.target);
    const res = await saveProjectFile(JSON.stringify(data, null, 2), state.name);
    if (res && !res.canceled) {
      state.projectPath = res.path || null;
      setSaveState('Guardado');
      audio.success();
      toast('Creación guardada', 'success', res.path ? displayPath(res.path) : 'Archivo descargado');
      scheduleAutosave();
    } else {
      setSaveState('Guardado');
    }
  } catch (err) {
    console.error(err);
    setSaveState('Sin guardar', 'error');
    audio.error();
    toast('No se pudo guardar', 'error', err.message || String(err));
  } finally {
    state.busy = false;
    updateStatus();
  }
}

function setProjectName(name) {
  state.name = (name || '').trim() || 'Mi creación';
  dom.projectName.value = state.name;
  dom.title.textContent = `${state.name} — Creador 3D`;
}

function loadProjectData(data, filePath = null, { quiet = false } = {}) {
  const result = restoreProject({ scene: data.scene }, content);
  applySettings(result.settings || {});
  if (data.camera && Array.isArray(data.camera.position)) {
    camera.position.fromArray(data.camera.position);
    const target = Array.isArray(data.camera.target) ? data.camera.target : [0, 1.1, 0];
    controls.target.fromArray(target);
    camTween = null;
    controls.update();
  }
  setProjectName(data.name || 'Mi creación');
  state.projectPath = filePath;
  clearSelection();
  history.reset(snapshotState(), quiet ? 'Inicio' : 'Proyecto abierto');
  state.historyReady = true;
  updateUndoButtons();
  renderAll();
  setSaveState('Guardado');
  scheduleAutosave();
  if (!quiet) {
    audio.success();
    toast('Proyecto abierto', 'success', filePath ? displayPath(filePath) : 'Listo para seguir creando');
  }
}

async function openProject() {
  if (state.busy) return;
  try {
    const res = await openProjectFile();
    if (!res || res.canceled) return;
    let data;
    try {
      data = parseProjectData(res.content);
    } catch (parseError) {
      audio.error();
      toast('No se pudo abrir el archivo', 'error', parseError.message);
      return;
    }
    loadProjectData(data, res.path || null);
  } catch (err) {
    console.error(err);
    audio.error();
    toast('No se pudo abrir el archivo', 'error', err.message || String(err));
  }
}

async function newProject() {
  const ok = await confirmDialog({
    title: '¿Empezar una creación nueva?',
    message: 'Se vaciará la escena actual. Puedes recuperarla con Ctrl+Z mientras no cierres la aplicación.',
    confirmLabel: 'Sí, empezar',
    danger: true,
  });
  if (!ok) return;
  while (content.children.length) {
    const child = content.children.pop();
    disposeTree(child);
  }
  applySettings({ environment: 'estudio', grid: true, floor: true, snap: false });
  setProjectName('Mi creación');
  state.projectPath = null;
  clearSelection();
  history.reset(snapshotState(), 'Nueva creación');
  state.historyReady = true;
  updateUndoButtons();
  renderAll();
  scheduleAutosave();
  setTool('shape');
  audio.success();
  toast('Nueva creación lista', 'success', 'Elige una forma o una plantilla para empezar.');
}

// ===== Exportar =====
async function exportKind(kind) {
  if (state.busy) return;
  if (!content.children.length) {
    toast('Tu escena está vacía', 'error', 'Añade algún objeto antes de exportar.');
    audio.error();
    return;
  }
  state.busy = true;
  updateStatus();
  try {
    const baseName = (state.name || 'creacion').replace(/[\\/:*?"<>|]+/g, '-');
    if (kind === 'png') {
      const dataUrl = renderScreenshot(renderer, scene, camera, [gizmoHelper, selectionBox, grid, doodlePreview], 1920, 1200);
      const res = await saveDataUrlFile(dataUrl, `${baseName}.png`);
      if (!res.canceled) {
        audio.success();
        toast('Imagen exportada', 'success', res.path ? displayPath(res.path) : 'PNG descargado');
      }
    } else if (kind === 'glb') {
      const bytes = await exportGLB(content);
      const res = await saveBinaryFile(bytes, `${baseName}.glb`, [{ name: 'Modelo GLB', extensions: ['glb'] }], 'Exportar modelo 3D');
      if (!res.canceled) {
        audio.success();
        toast('Modelo GLB exportado', 'success', res.path ? displayPath(res.path) : 'Archivo descargado');
      }
    } else if (kind === 'obj') {
      const text = exportOBJ(content);
      const res = await saveTextFile(text, `${baseName}.obj`, [{ name: 'Modelo OBJ', extensions: ['obj'] }], 'Exportar modelo 3D');
      if (!res.canceled) {
        audio.success();
        toast('Modelo OBJ exportado', 'success', res.path ? displayPath(res.path) : 'Archivo descargado');
      }
    } else if (kind === 'stl') {
      const bytes = exportSTL(content);
      const res = await saveBinaryFile(bytes, `${baseName}.stl`, [{ name: 'Modelo STL', extensions: ['stl'] }], 'Exportar para imprimir en 3D');
      if (!res.canceled) {
        audio.success();
        toast('Modelo STL exportado', 'success', res.path ? displayPath(res.path) : 'Archivo descargado');
      }
    }
  } catch (err) {
    console.error(err);
    audio.error();
    toast('No se pudo exportar', 'error', err.message || String(err));
  } finally {
    state.busy = false;
    updateStatus();
  }
}

// ===== Modales =====
let activeModal = null;

function openModal({ title = '', subtitle = '', iconName = 'info', body = '', actions = [], wide = false, dismissable = true, onClose = null }) {
  closeModal({ silent: true });
  const root = dom.modalRoot;
  root.classList.remove('hidden');
  const actionsHtml = actions.length
    ? `<div class="modal-actions">${actions.map((a, i) => `<button class="btn ${a.kind || ''}" data-modal-action="${i}">${a.icon ? icon(a.icon) : ''}${esc(a.label)}</button>`).join('')}</div>`
    : '';
  root.innerHTML = `<div class="modal-card${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title || 'Diálogo')}">
    ${title ? `<div class="modal-head">
      <div class="modal-head-icon">${icon(iconName)}</div>
      <div class="modal-head-text"><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
      <button class="icon-btn modal-close" id="modalClose" title="Cerrar">${icon('close')}</button>
    </div>` : ''}
    <div class="modal-body">${body}</div>
    ${actionsHtml}
  </div>`;

  const onKey = (event) => {
    if (event.key === 'Escape' && dismissable) {
      event.preventDefault();
      closeModal();
    }
  };
  const onRootDown = (event) => {
    if (event.target === root && dismissable) closeModal();
  };
  window.addEventListener('keydown', onKey);
  root.addEventListener('pointerdown', onRootDown);
  activeModal = { onKey, onRootDown, onClose };

  const closeBtn = root.querySelector('#modalClose');
  if (closeBtn) closeBtn.addEventListener('click', () => closeModal());

  root.querySelectorAll('[data-modal-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = actions[+btn.dataset.modalAction];
      try { if (action && action.action) action.action(); } catch (err) { console.error(err); }
      if (!action || action.close !== false) closeModal();
    });
  });

  return {
    root,
    body: root.querySelector('.modal-body'),
    card: root.querySelector('.modal-card'),
  };
}

function closeModal({ silent = false } = {}) {
  const modal = activeModal;
  activeModal = null;
  if (modal) {
    window.removeEventListener('keydown', modal.onKey);
    dom.modalRoot.removeEventListener('pointerdown', modal.onRootDown);
  }
  dom.modalRoot.classList.add('hidden');
  dom.modalRoot.innerHTML = '';
  if (modal && !silent && modal.onClose) modal.onClose();
}

function rememberWelcomeSeen() {
  try { localStorage.setItem('creador3d.welcomeSeen', '1'); } catch { /* nada */ }
}

function openWelcome() {
  const modal = openModal({
    title: '¡Hola! Soy Creador 3D',
    subtitle: 'Tu estudio de creación 3D en español, para toda la familia. Todo se guarda solo en este equipo.',
    iconName: 'sparkles',
    dismissable: true,
    onClose: rememberWelcomeSeen,
    body: `
      <div class="welcome-features">
        <div class="wf-card"><div class="wf-emoji">🏠</div><div class="wf-title">12 plantillas</div><div class="wf-sub">Casas, robots, dinosaurios, unicornios y mucho más.</div></div>
        <div class="wf-card"><div class="wf-emoji">🖌️</div><div class="wf-title">Pinta y decora</div><div class="wf-sub">Pincel, doodles 3D, stickers, texto y texturas.</div></div>
        <div class="wf-card"><div class="wf-emoji">🚀</div><div class="wf-title">Llévatelo</div><div class="wf-sub">Exporta en PNG, GLB, OBJ o STL y sigue creando.</div></div>
      </div>
      <div class="welcome-actions">
        <button class="btn primary" data-welcome="templates">🏠 Elegir una plantilla</button>
        <button class="btn" data-welcome="blank">✨ Crear desde cero</button>
        <button class="btn soft" data-welcome="help">❓ Cómo funciona</button>
      </div>
      <p class="welcome-note">Consejo: arrastra con el ratón para girar la escena, usa la rueda para acercarte y el botón derecho para moverte.</p>`,
  });
  modal.root.querySelectorAll('[data-welcome]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.welcome;
      closeModal();
      if (action === 'templates') setTool('templates');
      else if (action === 'blank') setTool('shape');
      else if (action === 'help') setTimeout(openHelp, 60);
    });
  });
}

function openHelp() {
  openModal({
    title: 'Ayuda y atajos',
    subtitle: 'Todo lo que necesitas para empezar a crear. Ningún dato sale de tu equipo.',
    iconName: 'help',
    wide: true,
    actions: [{ label: '¡Entendido!', kind: 'primary', icon: 'check' }],
    body: `<div class="help-grid">
      <div class="help-block">
        <h3>Primeros pasos</h3>
        <ul class="help-list">
          <li><span class="hl-icon">👆</span><span>Elige <strong>Elegir</strong> y toca un objeto. Con el gizmo puedes mover, girar y escalar.</span></li>
          <li><span class="hl-icon">🧊</span><span>En <strong>Formas</strong> añades cubos, esferas, estrellas y más.</span></li>
          <li><span class="hl-icon">🏠</span><span>En <strong>Plantillas</strong> empiezas con un modelo. Cada pieza se pinta por separado.</span></li>
          <li><span class="hl-icon">🖌️</span><span>Con <strong>Pintar</strong> mantienes pulsado sobre un objeto y arrastras.</span></li>
          <li><span class="hl-icon">✏️</span><span>Con <strong>Doodle</strong> dibujas en el aire y creas tubos 3D.</span></li>
        </ul>
      </div>
      <div class="help-block">
        <h3>Atajos de teclado</h3>
        <table class="shortcut-table">
          <tr><td>Seleccionar</td><td><kbd>V</kbd></td></tr>
          <tr><td>Mover / Girar / Escalar</td><td><kbd>G</kbd> <kbd>R</kbd> <kbd>S</kbd></td></tr>
          <tr><td>Herramientas</td><td><kbd>1</kbd>…<kbd>9</kbd></td></tr>
          <tr><td>Duplicar</td><td><kbd>Ctrl</kbd> + <kbd>D</kbd></td></tr>
          <tr><td>Borrar lo elegido</td><td><kbd>Supr</kbd></td></tr>
          <tr><td>Deshacer / Rehacer</td><td><kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>Ctrl</kbd> + <kbd>Mayús</kbd> + <kbd>Z</kbd></td></tr>
          <tr><td>Guardar / Abrir</td><td><kbd>Ctrl</kbd> + <kbd>S</kbd> / <kbd>Ctrl</kbd> + <kbd>O</kbd></td></tr>
          <tr><td>Cerrar diálogos</td><td><kbd>Esc</kbd></td></tr>
        </table>
      </div>
      <div class="help-block">
        <h3>La cámara</h3>
        <ul class="help-list">
          <li><span class="hl-icon">🖱️</span><span><strong>Arrastrar</strong> con el botón izquierdo gira la vista.</span></li>
          <li><span class="hl-icon">🔍</span><span>La <strong>rueda</strong> acerca y aleja. Los botones <strong>+</strong> y <strong>−</strong> también sirven.</span></li>
          <li><span class="hl-icon">✋</span><span>El botón derecho desplaza la vista. La casita vuelve a la vista 3/4.</span></li>
          <li><span class="hl-icon">🌅</span><span>En <strong>Escena</strong> cambias el ambiente, el suelo y la cuadrícula.</span></li>
        </ul>
      </div>
      <div class="help-block">
        <h3>Guardado y exportación</h3>
        <ul class="help-list">
          <li><span class="hl-icon">💾</span><span>Tu creación se guarda automáticamente en este equipo. El texto <strong>Guardado</strong> indica que todo está a salvo.</span></li>
          <li><span class="hl-icon">📂</span><span>Con <strong>Guardar</strong> creas un archivo <strong>.c3d</strong> que puedes abrir en otro momento.</span></li>
          <li><span class="hl-icon">🖼️</span><span><strong>PNG</strong> es una foto de tu escena; <strong>GLB</strong>, <strong>OBJ</strong> y <strong>STL</strong> son modelos 3D.</span></li>
          <li><span class="hl-icon">🧽</span><span>Si algo sale mal, pulsa <kbd>Ctrl</kbd> + <kbd>Z</kbd>. ¡Nada es definitivo!</span></li>
        </ul>
      </div>
    </div>
    <div class="help-footer">
      <span>Creador 3D v${esc(appVersion)} · Inspirado en Paint 3D</span>
      <span>Hecho para crear, aprender y divertirse.</span>
    </div>`,
  });
}

function confirmDialog({ title, message, confirmLabel = 'Aceptar', cancelLabel = 'Cancelar', danger = false }) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    openModal({
      title,
      iconName: 'help',
      dismissable: true,
      onClose: () => finish(false),
      body: `<p style="margin:0;font-size:13px;line-height:1.55;color:var(--ink-soft)">${esc(message)}</p>`,
      actions: [
        { label: cancelLabel, action: () => finish(false) },
        { label: confirmLabel, kind: danger ? 'danger' : 'primary', action: () => finish(true) },
      ],
    });
  });
}

// ===== Teclado =====
function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

window.addEventListener('keydown', (event) => {
  if (activeModal) return;
  if (document.querySelector('.modal-root:not(#modalRoot)')) return;

  const typing = isTypingTarget(event.target);
  const key = event.key;
  const lower = key.toLowerCase();
  const mod = event.ctrlKey || event.metaKey;

  if (mod && lower === 's') {
    event.preventDefault();
    saveProject();
    return;
  }
  if (mod && lower === 'o') {
    event.preventDefault();
    openProject();
    return;
  }
  if (typing) return;
  if (mod && lower === 'z') {
    event.preventDefault();
    if (event.shiftKey) redo(); else undo();
    return;
  }
  if (mod && lower === 'y') {
    event.preventDefault();
    redo();
    return;
  }
  if (mod && lower === 'd') {
    event.preventDefault();
    duplicateSelected();
    return;
  }
  if (key === 'Delete' || key === 'Backspace') {
    event.preventDefault();
    deleteSelected();
    return;
  }
  if (key === 'Escape') {
    if (state.selected) clearSelection();
    else if (state.tool !== 'select') setTool('select');
    return;
  }
  if (lower === 'v') { setTool('select'); return; }
  if (lower === 'g') { setMode('translate'); return; }
  if (lower === 'r') { setMode('rotate'); return; }
  if (lower === 's') { setMode('scale'); return; }
  if (/^[1-9]$/.test(key)) {
    const def = TOOL_DEFS[+key - 1];
    if (def) setTool(def.id);
  }
});

window.addEventListener('beforeunload', () => {
  if (!state.historyReady) return;
  try {
    const payload = JSON.stringify(createProjectData(state.name, content.children, currentSettings(), camera, controls.target));
    localStorage.setItem('creador3d.autosave.latest', payload);
  } catch { /* nada */ }
});

// ===== Inicio =====
async function boot() {
  try {
    const soundPref = localStorage.getItem('creador3d.sound');
    if (soundPref !== null) state.sound = soundPref === '1';
  } catch { /* nada */ }
  audio.setEnabled(state.sound);

  resizeRenderer();
  applySettings(currentSettings());
  renderTopActions();
  renderToolbar();
  renderModeBar();
  renderZoomBar();
  renderAll();
  setProjectName(state.name);
  setSaveState('Guardado');

  dom.projectName.addEventListener('input', () => {
    state.name = dom.projectName.value;
    document.title = `${state.name || 'Mi creación'} — Creador 3D`;
    scheduleAutosave();
  });
  dom.projectName.addEventListener('change', () => {
    if (!dom.projectName.value.trim()) setProjectName('Mi creación');
    else setProjectName(dom.projectName.value);
    scheduleAutosave();
  });

  let restored = false;
  try {
    const saved = await loadAutosave();
    if (saved) {
      const data = parseProjectData(saved);
      restoreProject({ scene: data.scene }, content);
      applySettings(data.scene.settings || {});
      if (data.camera && Array.isArray(data.camera.position)) {
        camera.position.fromArray(data.camera.position);
        controls.target.fromArray(Array.isArray(data.camera.target) ? data.camera.target : [0, 1.1, 0]);
        controls.update();
      }
      setProjectName(data.name || 'Mi creación');
      restored = true;
    }
  } catch (err) {
    console.warn('No se pudo recuperar el guardado automático:', err);
  }

  history.reset(snapshotState(), restored ? 'Sesión recuperada' : 'Inicio');
  state.historyReady = true;
  updateUndoButtons();
  renderAll();
  setSaveState(restored ? 'Recuperado' : 'Guardado');

  let welcomeSeen = false;
  try { welcomeSeen = localStorage.getItem('creador3d.welcomeSeen') === '1'; } catch { /* nada */ }
  if (!restored && !welcomeSeen) setTimeout(openWelcome, 380);

  appInfo().then((info) => {
    if (info && info.version) {
      appVersion = info.version;
      updateStatus();
    }
  }).catch(() => {});

  new ResizeObserver(() => resizeRenderer()).observe(dom.viewport);
  window.addEventListener('resize', resizeRenderer);

  resizeRenderer();
  animate();
  setTimeout(() => dom.loading.classList.add('done'), 320);
  window.__C3D_READY__ = true;
}

// ===== API para pruebas automáticas =====
function testPaint(index, uvPoints, { color = state.color, size = state.brush, erase = false } = {}) {
  const obj = content.children[index];
  if (!obj) return false;
  let mesh = null;
  obj.traverse((child) => { if (!mesh && child.isMesh && !child.userData.isImage) mesh = child; });
  if (!mesh) return false;
  const layer = ensurePaintLayer(mesh);
  const stroke = {
    color,
    erase,
    size,
    points: uvPoints.map(([u, v]) => uvToPixel({ x: u, y: v })),
  };
  layer.strokes.push(stroke);
  drawPaintStroke(layer, stroke, 0);
  selectObject(obj, { quiet: true });
  commit('Pintar objeto');
  renderInspector();
  return true;
}

const api = {
  ready: false,
  get state() { return state; },
  get history() { return history; },
  scene,
  camera,
  renderer,
  content,
  controls,
  gizmo,
  getStats() {
    return {
      objects: content.children.length,
      meshes: countMeshes(content.children),
      selected: state.selected ? state.selected.name : null,
      tool: state.tool,
      mode: state.mode,
      environment: state.environment,
      grid: state.showGrid,
      floor: state.showFloor,
      historyIndex: history.index,
      historyLength: history.stack.length,
      canUndo: history.canUndo,
      canRedo: history.canRedo,
      saveState: dom.saveState.textContent,
      modalOpen: !dom.modalRoot.classList.contains('hidden'),
      camera: camera.position.toArray().map((n) => Math.round(n * 100) / 100),
      triangles: renderer.info.render.triangles,
      canvas: { width: renderer.domElement.width, height: renderer.domElement.height },
      names: content.children.map((o) => o.name),
    };
  },
  addPrimitive,
  addTemplate,
  addSticker,
  addText: (text) => addTextMesh(text === undefined ? state.textValue : text),
  addDoodle(points, radius = 0.09) {
    const mesh = createDoodle(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])), radius, currentSpec());
    placeNewObject(mesh);
    content.add(mesh);
    selectObject(mesh, { quiet: true });
    commit('Doodle 3D');
    return mesh.name;
  },
  addImagePlane: addImagePlaneFromDataUrl,
  selectIndex(index) {
    const obj = content.children[index];
    if (obj) selectObject(obj);
    return obj ? obj.name : null;
  },
  selectByName(part) {
    const obj = content.children.find((o) => o.name && o.name.toLowerCase().includes(String(part).toLowerCase()));
    if (obj) selectObject(obj);
    return obj ? obj.name : null;
  },
  clearSelection,
  clearScene,
  setTool,
  setMode,
  setEnvironment(id) {
    applyEnvironment(id);
    renderAll();
    scheduleAutosave();
  },
  setView: flyTo,
  undo,
  redo,
  commit,
  snapshot: () => snapshotState(),
  projectJSON: () => JSON.stringify(createProjectData(state.name, content.children, currentSettings(), camera, controls.target)),
  loadProjectJSON(text) {
    const data = parseProjectData(text);
    loadProjectData(data, null);
    return true;
  },
  paintOn: testPaint,
  renderPNG: () => renderScreenshot(renderer, scene, camera, [gizmoHelper, selectionBox, grid, doodlePreview], 1920, 1200),
  async testExport(kind) {
    if (kind === 'obj') {
      const text = exportOBJ(content);
      return { kind, length: text.length, head: text.slice(0, 80) };
    }
    if (kind === 'stl') {
      const bytes = exportSTL(content);
      return { kind, length: bytes.length, head: Array.from(bytes.slice(0, 16)) };
    }
    if (kind === 'glb') {
      const bytes = await exportGLB(content);
      return { kind, length: bytes.length, head: Array.from(bytes.slice(0, 12)) };
    }
    return null;
  },
  async autosaveNow() { await doAutosave(); return dom.saveState.textContent; },
  openWelcome,
  openHelp,
  closeModal,
  toast,
  click(selector) {
    const el = document.querySelector(selector);
    if (!el) return false;
    el.click();
    return true;
  },
  getObject(index) {
    return content.children[index] || null;
  },
};

window.__C3D__ = api;
window.addEventListener('error', (event) => {
  console.error('Error en la ventana:', event.message, event.filename, event.lineno);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Promesa rechazada:', event.reason);
});

boot().then(() => {
  api.ready = true;
}).catch((err) => {
  console.error('Error al iniciar Creador 3D:', err);
  const msg = dom.loading.querySelector('p');
  if (msg) msg.textContent = 'No se pudo iniciar el estudio. Revisa la consola.';
  dom.loading.classList.remove('done');
});




