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
  createEmojiDecal, createImageDecal,
  fitToGround, centerXZ, emojiForObject, kindLabel, materialPreset,
  serializeMaterial, applyMaterialSpec, createMaterial,
} from './shapes.js';
import { TEMPLATES, STICKERS, buildTemplate } from './templates.js';
import {
  serializeScene, createProjectData, parseProjectData, restoreProject,
  disposeTree, cloneObject, countMeshes, serializeNode, deserializeNode,
} from './project.js';
import { History } from './history.js';
import { AnimationSystem, ensureUid, reassignUids } from './animation.js';
import { SelectionManipulator } from './manipulator.js';
import { Timeline } from './timeline.js';
import {
  openProjectFile, saveProjectFile, saveBinaryFile, saveTextFile,
  saveDataUrlFile, openImageFile, toggleFullscreen, displayPath,
  isDesktopApp, appInfo, checkForUpdates, installUpdate, cancelUpdate,
  onUpdateProgress, openReleasesPage,
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
  timeline: document.getElementById('timeline'),
  marquee: document.getElementById('selectionMarquee'),
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
  selection: [],
  gizmoStyle: 'paint',
  showTimeline: false,
  recording: false,
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
// El botón izquierdo queda para seleccionar/arrastrar objetos; la vista se
// gira con el botón central (rueda) y se desplaza con el derecho.
controls.mouseButtons = {
  LEFT: null,
  MIDDLE: THREE.MOUSE.ROTATE,
  RIGHT: THREE.MOUSE.PAN,
};

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

// Recuadro de selección. Sirve para un objeto o para varios a la vez.
const selectionBox = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
  new THREE.LineBasicMaterial({ color: 0x6c5ce7, transparent: true, opacity: 0.88, depthTest: false, depthWrite: false, toneMapped: false })
);
selectionBox.name = 'Recuadro de selección';
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

// ===== Animación y manipulador =====
const animation = new AnimationSystem();
const manipBounds = new THREE.Box3();
let timelineUI = null;

const manipulator = new SelectionManipulator({
  scene,
  camera,
  canvas: dom.canvas,
  getSelection: () => selectionList(),
  getBounds: () => computeSelectionBounds(manipBounds),
  onStart: () => {
    if (animation.playing) pauseAnimation();
  },
  onChange: () => {
    updateSelectionBox();
    updateSelectionChip();
  },
  onEnd: (info) => {
    if (!info.changed) return;
    const label = info.handle === 'rotate' ? 'Girar objeto'
      : info.handle === 'rotate-x' ? 'Girar en X'
        : info.handle === 'rotate-y' ? 'Girar en Y'
          : info.handle === 'rotate-z' ? 'Girar en Z'
            : info.handle === 'scale' ? 'Cambiar tamaño'
              : info.handle === 'box-resize' ? 'Cambiar tamaño'
                : info.handle === 'lift' ? 'Subir objeto'
                  : info.handle === 'depth' ? 'Cambiar profundidad'
                    : 'Mover objeto';
    if (animation.autoKey) autoKeySelection();
    commit(label);
    renderInspector();
    timelineUI?.render();
  },
});

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
  manipulator.setSnap(state.snap ? 0.25 : 0);
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
  if (state.recording) return;
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

  if (animation.playing) {
    animation.advance(dt);
    applyAnimationPose();
    timelineUI?.updatePlayhead();
    if (!animation.playing) updateGizmoForTool();
  }

  if (state.recording) {
    selectionBox.visible = false;
    manipulator.overlay.visible = false;
    objectControlsRoot?.classList.add('hidden');
  } else if (state.gizmoStyle === 'paint' || selectionList().length > 1) {
    // Modo Paint 3D: caja 2D con cuadraditos y cuatro círculos.
    selectionBox.visible = false;
    manipulator.update();
    manipulator.overlay.visible = false;
    updateObjectControls();
  } else {
    // Gizmo clásico: recuadro 3D y flechas.
    updateSelectionBox();
    manipulator.update();
    manipulator.overlay.visible = false;
    objectControlsRoot?.classList.add('hidden');
  }

  renderer.render(scene, camera);
}

// ===== Selección múltiple =====
const uiBounds = new THREE.Box3();
const selCenter = new THREE.Vector3();
const selSize = new THREE.Vector3();

function selectionList() {
  const list = state.selection && state.selection.length ? state.selection : (state.selected ? [state.selected] : []);
  return list.filter((obj) => obj && isDescendantOfContent(obj) && obj.visible !== false);
}

// Para los fotogramas clave también vale un objeto oculto que siga elegido:
// así se puede animar su visibilidad (ocultar en un segundo, mostrar en otro).
function keyTargets() {
  const list = selectionList();
  if (list.length) return list;
  if (state.selected && isDescendantOfContent(state.selected)) return [state.selected];
  return [];
}

function computeSelectionBounds(target) {
  target.makeEmpty();
  selectionList().forEach((obj) => target.expandByObject(obj));
  return target;
}

function updateSelectionBox() {
  if (state.gizmoStyle === 'paint' || selectionList().length > 1) {
    selectionBox.visible = false;
    return;
  }
  const list = selectionList();
  if (!list.length) {
    selectionBox.visible = false;
    return;
  }
  if (computeSelectionBounds(uiBounds).isEmpty()) {
    selectionBox.visible = false;
    return;
  }
  uiBounds.getCenter(selCenter);
  uiBounds.getSize(selSize);
  selectionBox.position.copy(selCenter);
  selectionBox.scale.set(
    Math.max(0.02, selSize.x),
    Math.max(0.02, selSize.y),
    Math.max(0.02, selSize.z)
  );
  selectionBox.visible = true;
}

// ===== Selección con recuadro =====
const marqueeBounds = new THREE.Box3();
const marqueeProjected = new THREE.Vector3();

function screenRectOfObject(obj) {
  obj.updateWorldMatrix(true, true);
  marqueeBounds.setFromObject(obj);
  if (marqueeBounds.isEmpty()) return null;
  const min = marqueeBounds.min;
  const max = marqueeBounds.max;
  const corners = [
    [min.x, min.y, min.z], [min.x, min.y, max.z], [min.x, max.y, min.z], [min.x, max.y, max.z],
    [max.x, min.y, min.z], [max.x, min.y, max.z], [max.x, max.y, min.z], [max.x, max.y, max.z],
  ];
  const width = Math.max(1, dom.viewport.clientWidth);
  const height = Math.max(1, dom.viewport.clientHeight);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y, z] of corners) {
    marqueeProjected.set(x, y, z).project(camera);
    if (!Number.isFinite(marqueeProjected.x) || !Number.isFinite(marqueeProjected.y) || marqueeProjected.z > 1) return null;
    const screenX = (marqueeProjected.x * 0.5 + 0.5) * width;
    const screenY = (-marqueeProjected.y * 0.5 + 0.5) * height;
    minX = Math.min(minX, screenX);
    maxX = Math.max(maxX, screenX);
    minY = Math.min(minY, screenY);
    maxY = Math.max(maxY, screenY);
  }
  return { minX, minY, maxX, maxY };
}

function objectsInMarquee(rect) {
  const hits = [];
  content.children.forEach((obj) => {
    if (obj.visible === false) return;
    const r = screenRectOfObject(obj);
    if (!r) return;
    const outside = r.maxX < rect.x || r.minX > rect.x + rect.w || r.maxY < rect.y || r.minY > rect.y + rect.h;
    if (!outside) hits.push(obj);
  });
  return hits;
}

function findObjectByUid(uid) {
  if (!uid) return null;
  let found = null;
  content.traverse((obj) => {
    if (!found && obj.userData && obj.userData.uid === uid) found = obj;
  });
  return found;
}

function applyAnimationPose() {
  if (!animation.trackCount) return;
  const map = new Map();
  content.traverse((obj) => {
    const uid = obj.userData && obj.userData.uid;
    if (uid) map.set(uid, obj);
  });
  animation.sample(animation.time, (uid) => map.get(uid) || null);
}

// ===== Controles circulares estilo Paint 3D =====
let objectControlsRoot = null;
let objectControlButtons = null;
let objectControlDrag = null;
let boxHandleDrag = null;
let paintBoxEls = null;
let paintBoxScreen = null;
const ocBounds = new THREE.Box3();
const ocProjected = new THREE.Vector3();

function initObjectControls() {
  objectControlsRoot = document.getElementById('objectControls');
  if (!objectControlsRoot) return;
  objectControlsRoot.innerHTML = `
    <div class="pb-frame"></div>
    <div class="oc-link oc-link-top"></div>
    <div class="oc-link oc-link-right"></div>
    <div class="oc-link oc-link-bottom"></div>
    <div class="oc-link oc-link-left"></div>
    <button class="pb-handle" data-pb="nw" title="Redimensionar"></button>
    <button class="pb-handle" data-pb="n" title="Redimensionar"></button>
    <button class="pb-handle" data-pb="ne" title="Redimensionar"></button>
    <button class="pb-handle" data-pb="e" title="Redimensionar"></button>
    <button class="pb-handle" data-pb="se" title="Redimensionar"></button>
    <button class="pb-handle" data-pb="s" title="Redimensionar"></button>
    <button class="pb-handle" data-pb="sw" title="Redimensionar"></button>
    <button class="pb-handle" data-pb="w" title="Redimensionar"></button>
    <button class="oc-btn" data-oc="rotate-z" title="Girar en el eje Z (en el plano)" aria-label="Girar en el eje Z">${icon('rotateZ')}<span class="oc-axis">Z</span></button>
    <button class="oc-btn" data-oc="rotate-x" title="Girar en el eje X" aria-label="Girar en el eje X">${icon('rotateX')}<span class="oc-axis">X</span></button>
    <button class="oc-btn" data-oc="rotate-y" title="Girar en el eje Y" aria-label="Girar en el eje Y">${icon('rotateY')}<span class="oc-axis">Y</span></button>
    <button class="oc-btn" data-oc="depth" title="Profundidad: acercar o alejar" aria-label="Profundidad">${icon('depth')}</button>`;
  objectControlButtons = {
    top: objectControlsRoot.querySelector('[data-oc="rotate-z"]'),
    right: objectControlsRoot.querySelector('[data-oc="rotate-x"]'),
    bottom: objectControlsRoot.querySelector('[data-oc="rotate-y"]'),
    left: objectControlsRoot.querySelector('[data-oc="depth"]'),
  };
  paintBoxEls = {
    frame: objectControlsRoot.querySelector('.pb-frame'),
    links: {
      top: objectControlsRoot.querySelector('.oc-link-top'),
      right: objectControlsRoot.querySelector('.oc-link-right'),
      bottom: objectControlsRoot.querySelector('.oc-link-bottom'),
      left: objectControlsRoot.querySelector('.oc-link-left'),
    },
    handles: {
      nw: objectControlsRoot.querySelector('[data-pb="nw"]'),
      n: objectControlsRoot.querySelector('[data-pb="n"]'),
      ne: objectControlsRoot.querySelector('[data-pb="ne"]'),
      e: objectControlsRoot.querySelector('[data-pb="e"]'),
      se: objectControlsRoot.querySelector('[data-pb="se"]'),
      s: objectControlsRoot.querySelector('[data-pb="s"]'),
      sw: objectControlsRoot.querySelector('[data-pb="sw"]'),
      w: objectControlsRoot.querySelector('[data-pb="w"]'),
    },
  };

  objectControlsRoot.querySelectorAll('[data-oc]').forEach((btn) => {
    btn.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (animation.playing) pauseAnimation();
      try { btn.setPointerCapture(event.pointerId); } catch { /* nada */ }
      objectControlDrag = { btn, pointerId: event.pointerId };
      objectControlsRoot.classList.add('dragging');
      if (!manipulator.beginObjectControl(btn.dataset.oc, event)) {
        objectControlDrag = null;
        objectControlsRoot.classList.remove('dragging');
      }
    });

    btn.addEventListener('pointermove', (event) => {
      if (!objectControlDrag || objectControlDrag.btn !== btn) return;
      event.preventDefault();
      manipulator.moveObjectControl(event);
    });

    const finish = (event) => {
      if (!objectControlDrag || objectControlDrag.btn !== btn) return;
      try { btn.releasePointerCapture(event.pointerId); } catch { /* nada */ }
      manipulator.end();
      objectControlDrag = null;
      objectControlsRoot.classList.remove('dragging');
      updateObjectControls();
    };
    btn.addEventListener('pointerup', finish);
    btn.addEventListener('pointercancel', finish);
    btn.addEventListener('contextmenu', (event) => event.preventDefault());
  });

  objectControlsRoot.querySelectorAll('[data-pb]').forEach((btn) => {
    btn.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !paintBoxScreen) return;
      event.preventDefault();
      event.stopPropagation();
      if (animation.playing) pauseAnimation();
      const viewportRect = dom.viewport.getBoundingClientRect();
      const centerX = viewportRect.left + (paintBoxScreen.minX + paintBoxScreen.maxX) / 2;
      const centerY = viewportRect.top + (paintBoxScreen.minY + paintBoxScreen.maxY) / 2;
      try { btn.setPointerCapture(event.pointerId); } catch { /* nada */ }
      boxHandleDrag = { btn, pointerId: event.pointerId };
      objectControlsRoot.classList.add('dragging');
      if (!manipulator.beginBoxResize(btn.dataset.pb, event, { centerX, centerY })) {
        boxHandleDrag = null;
        objectControlsRoot.classList.remove('dragging');
      }
    });

    btn.addEventListener('pointermove', (event) => {
      if (!boxHandleDrag || boxHandleDrag.btn !== btn) return;
      event.preventDefault();
      manipulator.moveBoxResize(event);
    });

    const finish = (event) => {
      if (!boxHandleDrag || boxHandleDrag.btn !== btn) return;
      try { btn.releasePointerCapture(event.pointerId); } catch { /* nada */ }
      manipulator.end();
      boxHandleDrag = null;
      objectControlsRoot.classList.remove('dragging');
      updateObjectControls();
    };
    btn.addEventListener('pointerup', finish);
    btn.addEventListener('pointercancel', finish);
    btn.addEventListener('contextmenu', (event) => event.preventDefault());
  });
}

function updateObjectControls() {
  if (!objectControlsRoot || !objectControlButtons || !paintBoxEls) return;
  const list = selectionList();
  const many = list.length > 1;
  const show = state.tool === 'select' && list.length > 0 && (state.gizmoStyle === 'paint' || many) && !animation.playing && !state.recording;
  if (!show) {
    objectControlsRoot.classList.add('hidden');
    return;
  }
  if (objectControlDrag || boxHandleDrag) {
    objectControlsRoot.classList.remove('hidden');
    return;
  }
  computeSelectionBounds(ocBounds);
  if (ocBounds.isEmpty()) {
    objectControlsRoot.classList.add('hidden');
    return;
  }

  const width = Math.max(1, dom.viewport.clientWidth);
  const height = Math.max(1, dom.viewport.clientHeight);
  const min = ocBounds.min;
  const max = ocBounds.max;
  const corners = [
    [min.x, min.y, min.z], [min.x, min.y, max.z], [min.x, max.y, min.z], [min.x, max.y, max.z],
    [max.x, min.y, min.z], [max.x, min.y, max.z], [max.x, max.y, min.z], [max.x, max.y, max.z],
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y, z] of corners) {
    ocProjected.set(x, y, z).project(camera);
    if (!Number.isFinite(ocProjected.x) || !Number.isFinite(ocProjected.y) || ocProjected.z > 1) {
      objectControlsRoot.classList.add('hidden');
      return;
    }
    const screenX = (ocProjected.x * 0.5 + 0.5) * width;
    const screenY = (-ocProjected.y * 0.5 + 0.5) * height;
    minX = Math.min(minX, screenX);
    maxX = Math.max(maxX, screenX);
    minY = Math.min(minY, screenY);
    maxY = Math.max(maxY, screenY);
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  paintBoxScreen = { minX, minY, maxX, maxY };

  const frame = paintBoxEls.frame;
  frame.style.left = minX + 'px';
  frame.style.top = minY + 'px';
  frame.style.width = Math.max(0, maxX - minX) + 'px';
  frame.style.height = Math.max(0, maxY - minY) + 'px';

  const setPos = (el, x, y) => {
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  };
  const handles = paintBoxEls.handles;
  setPos(handles.nw, minX, minY);
  setPos(handles.n, cx, minY);
  setPos(handles.ne, maxX, minY);
  setPos(handles.e, maxX, cy);
  setPos(handles.se, maxX, maxY);
  setPos(handles.s, cx, maxY);
  setPos(handles.sw, minX, maxY);
  setPos(handles.w, minX, cy);

  const gap = 32;
  const clampX = (value) => Math.max(20, Math.min(width - 20, value));
  const clampY = (value) => Math.max(20, Math.min(height - 20, value));
  setPos(objectControlButtons.top, clampX(cx), clampY(minY - gap));
  setPos(objectControlButtons.right, clampX(maxX + gap), clampY(cy));
  setPos(objectControlButtons.bottom, clampX(cx), clampY(maxY + gap));
  setPos(objectControlButtons.left, clampX(minX - gap), clampY(cy));

  const linkLen = 14;
  const links = paintBoxEls.links;
  links.top.style.left = cx + 'px';
  links.top.style.top = (minY - linkLen) + 'px';
  links.top.style.width = '1px';
  links.top.style.height = linkLen + 'px';
  links.bottom.style.left = cx + 'px';
  links.bottom.style.top = maxY + 'px';
  links.bottom.style.width = '1px';
  links.bottom.style.height = linkLen + 'px';
  links.left.style.left = (minX - linkLen) + 'px';
  links.left.style.top = cy + 'px';
  links.left.style.width = linkLen + 'px';
  links.left.style.height = '1px';
  links.right.style.left = maxX + 'px';
  links.right.style.top = cy + 'px';
  links.right.style.width = linkLen + 'px';
  links.right.style.height = '1px';

  objectControlsRoot.classList.remove('hidden');
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
  { id: 'select', label: 'Elegir', icon: 'cursor', emoji: '👆', hint: 'Haz clic o arrastra un recuadro para elegir objetos. El botón central gira la vista y la rueda acerca.' },
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
        <button class="menu-item" data-export="webm">${icon('film')}<span class="mi-text"><span class="mi-title">Animación WebM</span><span class="mi-sub">Un vídeo con tus fotogramas clave</span></span></button>
        <div class="menu-sep"></div>
        <div class="menu-note">Los stickers e imágenes salen en el PNG y el vídeo WebM, pero no en los modelos 3D.</div>
      </div>
    </div>
    <button class="icon-btn has-label anim-btn" id="animBtn" title="Abrir o cerrar la línea de tiempo de animación">${icon('timeline')}<span>Animar</span><span class="anim-badge" id="animBadge">0</span></button>
    <span class="top-sep"></span>
    ${isDesktopApp() ? `<button class="icon-btn" id="updateBtn" title="Buscar actualizaciones">${icon('refresh')}</button>` : ''}
    <button class="icon-btn" id="helpBtn" title="Ayuda y atajos">${icon('help')}</button>
    <button class="icon-btn" id="soundBtn" title="Activar o silenciar los sonidos">${icon(state.sound ? 'sound' : 'mute')}</button>
    <button class="icon-btn" id="fullBtn" title="Pantalla completa (F11)">${icon('fullscreen')}</button>`;

  dom.topActions.querySelector('#undoBtn').addEventListener('click', undo);
  dom.topActions.querySelector('#redoBtn').addEventListener('click', redo);
  dom.topActions.querySelector('#newBtn').addEventListener('click', newProject);
  dom.topActions.querySelector('#openBtn').addEventListener('click', openProject);
  dom.topActions.querySelector('#saveBtn').addEventListener('click', saveProject);
  dom.topActions.querySelector('#helpBtn').addEventListener('click', openHelp);
  const animBtn = dom.topActions.querySelector('#animBtn');
  if (animBtn) {
    animBtn.addEventListener('click', () => {
      audio.click();
      openTimeline(dom.timeline.classList.contains('hidden'));
    });
  }
  const updateBtn = dom.topActions.querySelector('#updateBtn');
  if (updateBtn) {
    updateBtn.addEventListener('click', () => {
      audio.click();
      openUpdates();
    });
  }
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

function paintManipulatorActive() {
  return state.gizmoStyle === 'paint' || selectionList().length > 1;
}

function updateGizmoForTool() {
  const list = selectionList();
  const many = list.length > 1;
  const canUse = state.tool === 'select' && !!state.selected && state.selected.visible !== false && isDescendantOfContent(state.selected);
  const paintMode = state.gizmoStyle === 'paint' || many;
  const classic = canUse && state.gizmoStyle === 'clasico' && !many && !state.recording && !animation.playing;
  gizmo.enabled = classic;
  if (classic) {
    gizmo.attach(state.selected);
    gizmoHelper.visible = true;
  } else {
    gizmo.detach();
    gizmoHelper.visible = false;
  }
  manipulator.setEnabled(canUse && paintMode && !animation.playing && !state.recording);
  if (!paintMode || state.tool !== 'select') dom.canvas.style.cursor = '';
  if (dom.modeBar) dom.modeBar.classList.toggle('hidden', state.gizmoStyle !== 'clasico' || many);
}

function setTool(toolId) {
  const def = TOOL_DEFS.find((t) => t.id === toolId);
  if (!def) return;
  if (animation.playing && toolId !== 'select') pauseAnimation();
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
    btn.disabled = !state.selected || state.gizmoStyle !== 'clasico';
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
  const current = state.selection && state.selection.length ? state.selection : (state.selected ? [state.selected] : []);
  const tops = new Set(current.map((obj) => topLevelOf(obj)).filter(Boolean));
  for (let i = content.children.length - 1; i >= 0; i--) {
    const obj = content.children[i];
    rows.push(`<button class="out-row${tops.has(obj) ? ' active' : ''}" data-out-index="${i}">
      <span class="out-emoji">${emojiForObject(obj)}</span>
      <span class="out-name">${esc(obj.name || 'Objeto')}</span>
      <span class="out-kind">${esc(kindLabel(obj))}</span>
    </button>`);
  }
  return `<div class="outliner">${rows.join('')}</div>`;
}

function bindOutliner(root) {
  root.querySelectorAll('[data-out-index]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      const obj = content.children[+btn.dataset.outIndex];
      if (!obj) return;
      const additive = event.ctrlKey || event.metaKey || event.shiftKey;
      selectObject(obj, { additive, allowHidden: obj.visible === false });
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
    sub: 'Toca un objeto para elegirlo y arrástralo para moverlo. Con Ctrl o Mayús eliges varios; doble clic elige el grupo completo.',
  }) + `<div class="panel-body">
    <section class="section">
      <div class="section-title"><span>Objetos en la escena</span><span class="st-note">${content.children.length}</span></div>
      ${outlinerMarkup()}
      <button class="btn small wide" id="optAddShape" style="margin-top:9px">${icon('plus')} Añadir una forma</button>
      <button class="btn small wide soft" id="optPaste" style="margin-top:7px">${icon('paste')} Pegar lo copiado</button>
    </section>
    <section class="section">
      <div class="section-title"><span>Manipulador</span></div>
      <div class="toggle-row">
        <div class="toggle-text"><span class="toggle-title">Gizmo de flechas</span><span class="toggle-sub">El clásico; si está apagado usas la caja 2D de Paint 3D. Con varios objetos se usa la caja 2D para todos.</span></div>
        ${switchMarkup('optClassicGizmo', state.gizmoStyle === 'clasico', 'Cambiar entre el manipulador de Paint 3D y el gizmo clásico')}
      </div>
      <div class="panel-note" style="margin-top:9px">${icon('cursor')}<span><strong>Arrastra el objeto</strong> para moverlo arriba/abajo e izquierda/derecha · <strong>Z</strong> arriba, <strong>X</strong> derecha y <strong>Y</strong> abajo giran · círculo <strong>izquierdo</strong>: profundidad · <strong>cuadraditos</strong>: tamaño · <kbd>Shift</kbd> ajusta el giro.</span></div>
    </section>
    <section class="section">
      <div class="section-title"><span>Vistas de cámara</span></div>
      ${viewsMarkup()}
    </section>
    <section class="section">
      <div class="panel-note">${icon('info')}<span>Arrastra en el vacío para seleccionar varios objetos. El <strong>botón central</strong> (rueda) gira la vista, la rueda acerca y el botón derecho desplaza. <kbd>Ctrl</kbd>+<kbd>A</kbd> elige todo.</span></div>
    </section>
  </div>`;
  bindOutliner(box);
  bindViews(box);
  bindSwitch(box.querySelector('#optClassicGizmo'), (on) => {
    state.gizmoStyle = on ? 'clasico' : 'paint';
    updateGizmoForTool();
    updateModeBar();
    renderOptions();
  });
  box.querySelector('#optAddShape').addEventListener('click', () => setTool('shape'));
  box.querySelector('#optPaste').addEventListener('click', pasteClipboard);
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
  const hasTarget = !!stickerTarget();
  box.innerHTML = panelHead({
    kicker: 'Decorar', title: 'Stickers', emoji: '😀',
    sub: hasTarget ? 'Toca un emoji: se pegará a la superficie del objeto elegido.' : 'Elige un objeto para pegar el sticker sobre él; si no, aparecerá flotando.',
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
      <div class="panel-note">${icon('info')}<span>Con un objeto elegido, la pegatina se aplica a su superficie. Arrástrala sobre el objeto para acomodarla; los tiradores la giran y redimensionan.</span></div>
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
  const many = selectionList();
  if (many.length > 1) {
    renderMultiInspector(box, many);
    return;
  }
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
          <tr><td>Girar la vista</td><td><kbd>Botón central</kbd></td></tr>
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
      <div class="field-row" style="margin-top:7px">
        <button class="btn small" id="insCut">${icon('cut')} Cortar</button>
        <button class="btn small" id="insCopy">${icon('duplicate')} Copiar</button>
        <button class="btn small soft" id="insPaste">${icon('paste')} Pegar</button>
      </div>
      ${parent ? `<button class="btn small soft wide" id="insSelectParent" style="margin-top:7px">${icon('layers')} Seleccionar todo el grupo</button>` : ''}
      ${isGroup ? `<button class="btn small soft wide" id="insUngroup" style="margin-top:7px">${icon('ungroup')} Separar el grupo</button>` : ''}
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
        <button class="chip" id="insFocus">${icon('eye')} Enfocar</button>
      </div>
    </section>

    <section class="section">
      <div class="section-title"><span>Transformaciones</span></div>
      <div class="field-row">
        <button class="btn small" id="insRotLeft" title="Girar 90° a la izquierda">↺ 90°</button>
        <button class="btn small" id="insRotRight" title="Girar 90° a la derecha">↻ 90°</button>
      </div>
      <div class="field-row" style="margin-top:7px">
        <button class="btn small soft" id="insMirrorH" title="Espejo horizontal">${icon('flip')} Espejo H</button>
        <button class="btn small soft" id="insMirrorV" title="Espejo vertical">${icon('flipV')} Espejo V</button>
      </div>
    </section>

    <div class="toggle-row">
      <div class="toggle-text"><span class="toggle-title">Visible</span><span class="toggle-sub">Mostrar u ocultar</span></div>
      ${switchMarkup('insVisible', obj.visible !== false, 'Mostrar u ocultar el objeto')}
    </div>

    <section class="section">
      <div class="section-title"><span>Animación</span>${animation.isAnimated(obj) ? '<span class="st-note">con claves</span>' : ''}</div>
      <div class="field-row">
        <button class="btn small" id="insAddKey">${icon('keyframe')} Clave aquí</button>
        <button class="btn small soft" id="insOpenTimeline">${icon('timeline')} Línea de tiempo</button>
      </div>
    </section>

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
  box.querySelector('#insCut').addEventListener('click', cutSelected);
  box.querySelector('#insCopy').addEventListener('click', copySelected);
  box.querySelector('#insPaste').addEventListener('click', pasteClipboard);
  box.querySelector('#insRotLeft').addEventListener('click', () => rotateSelection90(-1));
  box.querySelector('#insRotRight').addEventListener('click', () => rotateSelection90(1));
  box.querySelector('#insMirrorH').addEventListener('click', () => mirrorSelection('horizontal'));
  box.querySelector('#insMirrorV').addEventListener('click', () => mirrorSelection('vertical'));
  const parentBtn = box.querySelector('#insSelectParent');
  if (parentBtn) parentBtn.addEventListener('click', () => selectObject(parent));
  const ungroupBtn = box.querySelector('#insUngroup');
  if (ungroupBtn) ungroupBtn.addEventListener('click', ungroupSelected);
  const addKeyBtn = box.querySelector('#insAddKey');
  if (addKeyBtn) addKeyBtn.addEventListener('click', () => addKeyframes([obj]));
  const openTlBtn = box.querySelector('#insOpenTimeline');
  if (openTlBtn) openTlBtn.addEventListener('click', () => openTimeline(true));

  ['X', 'Y', 'Z'].forEach((axis) => {
    const input = box.querySelector('#ins' + axis);
    const apply = () => {
      const value = parseFloat(input.value);
      if (!isFinite(value)) return;
      obj.position[axis.toLowerCase()] = value;
      updateSelectionChip();
      commitTransform('Mover objeto');
    };
    input.addEventListener('change', apply);
    input.addEventListener('blur', () => { if (isFinite(parseFloat(input.value))) apply(); });
  });

  bindRange(box.querySelector('#insRotate'), {
    onInput: (v) => { obj.rotation.y = THREE.MathUtils.degToRad(v); },
    onChange: () => commitTransform('Girar objeto'),
    format: (v) => v + '°',
  });
  bindRange(box.querySelector('#insScale'), {
    onInput: (v) => { const f = v / 100; obj.scale.set(scaleBase.x * f, scaleBase.y * f, scaleBase.z * f); },
    onChange: () => commitTransform('Cambiar tamaño'),
    format: (v) => v + '%',
  });

  box.querySelector('#insGround').addEventListener('click', () => {
    fitToGround(obj);
    commitTransform('Aterrizar objeto');
    renderInspector();
    audio.pop();
  });
  box.querySelector('#insCenter').addEventListener('click', () => {
    centerXZ(obj);
    commitTransform('Centrar objeto');
    renderInspector();
    audio.pop();
  });
  box.querySelector('#insFocus').addEventListener('click', () => {
    focusCameraOnObject(obj);
    audio.click();
  });
  bindSwitch(box.querySelector('#insVisible'), (on) => {
    obj.visible = on;
    commitTransform(on ? 'Mostrar objeto' : 'Ocultar objeto');
    updateSelectionBox();
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

function renderMultiInspector(box, list) {
  const paintable = list.some((obj) => hasStandardMaterial(obj));
  const names = list.map((obj) => `<div class="multi-item">
    <span class="out-emoji">${emojiForObject(obj)}</span>
    <span class="out-name">${esc(obj.name || 'Objeto')}</span>
    <span class="out-kind">${esc(kindLabel(obj))}</span>
  </div>`).join('');
  box.innerHTML = panelHead({
    kicker: 'Selección', title: `${list.length} objetos`, emoji: '🧩',
    sub: 'Se transforman juntos. Mantén Ctrl o Mayús para añadir o quitar objetos.',
  }) + `<div class="panel-body">
    <section class="section">
      <div class="field-row">
        <button class="btn small" id="insMultiDuplicate">${icon('duplicate')} Duplicar</button>
        <button class="btn small danger" id="insMultiDelete">${icon('trash')} Borrar</button>
      </div>
      <div class="field-row" style="margin-top:7px">
        <button class="btn small soft" id="insMultiGroup">${icon('group')} Agrupar</button>
        <button class="btn small soft" id="insMultiKey">${icon('keyframe')} Clave aquí</button>
      </div>
      <div class="field-row" style="margin-top:7px">
        <button class="btn small" id="insMultiCut">${icon('cut')} Cortar</button>
        <button class="btn small" id="insMultiCopy">${icon('duplicate')} Copiar</button>
        <button class="btn small soft" id="insMultiPaste">${icon('paste')} Pegar</button>
      </div>
    </section>
    <section class="section">
      <div class="section-title"><span>Transformaciones</span></div>
      <div class="field-row">
        <button class="btn small" id="insMultiRotLeft" title="Girar 90° a la izquierda">↺ 90°</button>
        <button class="btn small" id="insMultiRotRight" title="Girar 90° a la derecha">↻ 90°</button>
      </div>
      <div class="field-row" style="margin-top:7px">
        <button class="btn small soft" id="insMultiMirrorH" title="Espejo horizontal">${icon('flip')} Espejo H</button>
        <button class="btn small soft" id="insMultiMirrorV" title="Espejo vertical">${icon('flipV')} Espejo V</button>
      </div>
    </section>
    ${paintable ? `
    <section class="section">
      <div class="section-title"><span>Color</span></div>
      ${paletteMarkup(state.color)}
    </section>
    <section class="section">
      <div class="section-title"><span>Acabado</span></div>
      ${materialMarkup(state.materialId)}
    </section>
    <section class="section">
      <div class="section-title"><span>Textura</span></div>
      ${patternMarkup(state.pattern)}
    </section>` : ''}
    <section class="section">
      <div class="section-title"><span>Elegidos</span><span class="st-note">${list.length}</span></div>
      <div class="outliner">${names}</div>
    </section>
    <section class="section">
      <div class="panel-note">${icon('cursor')}<span>Arrastra cualquiera de ellos para mover el grupo. Los círculos giran y cambian la profundidad; los cuadraditos redimensionan.</span></div>
    </section>
  </div>`;
  box.querySelector('#insMultiDuplicate').addEventListener('click', duplicateSelected);
  box.querySelector('#insMultiDelete').addEventListener('click', deleteSelected);
  box.querySelector('#insMultiGroup').addEventListener('click', groupSelected);
  box.querySelector('#insMultiKey').addEventListener('click', () => addKeyframes(list));
  box.querySelector('#insMultiCut').addEventListener('click', cutSelected);
  box.querySelector('#insMultiCopy').addEventListener('click', copySelected);
  box.querySelector('#insMultiPaste').addEventListener('click', pasteClipboard);
  box.querySelector('#insMultiRotLeft').addEventListener('click', () => rotateSelection90(-1));
  box.querySelector('#insMultiRotRight').addEventListener('click', () => rotateSelection90(1));
  box.querySelector('#insMultiMirrorH').addEventListener('click', () => mirrorSelection('horizontal'));
  box.querySelector('#insMultiMirrorV').addEventListener('click', () => mirrorSelection('vertical'));
  bindPalette(box, (hex) => applyColorToSelection(hex));
  bindMaterial(box, (id) => applyMaterialToSelection(id));
  bindPattern(box, (id) => applyPatternToSelection(id));
}

function hasStandardMaterial(obj) {
  let found = false;
  obj.traverse((child) => {
    if (child.isMesh && child.material && child.material.isMeshStandardMaterial) found = true;
  });
  return found;
}

function updateSelectionChip() {
  const list = selectionList();
  if (!list.length) {
    dom.selectionChip.classList.add('hidden');
    dom.selectionChip.innerHTML = '';
    return;
  }
  dom.selectionChip.classList.remove('hidden');
  if (list.length > 1) {
    dom.selectionChip.innerHTML = `
      <span>🧩</span>
      <span class="sc-name">${list.length} objetos elegidos</span>
      <button class="sc-parent" id="chipMultiKey" title="Añadir un fotograma clave a todos">◆ Clave</button>
      <button class="icon-btn sc-close" id="chipClose" title="Quitar la selección">${icon('close')}</button>`;
    dom.selectionChip.querySelector('#chipClose').addEventListener('click', (e) => { e.stopPropagation(); clearSelection(); });
    dom.selectionChip.querySelector('#chipMultiKey').addEventListener('click', (e) => {
      e.stopPropagation();
      addKeyframes(list);
    });
    return;
  }
  const obj = list.includes(state.selected) ? state.selected : list[0];
  const parent = metaParentOf(obj);
  dom.selectionChip.innerHTML = `
    <span>${emojiForObject(obj)}</span>
    <span class="sc-name">${esc(obj.name || 'Objeto')}</span>
    ${animation.isAnimated(obj) ? `<span class="sc-anim" title="Este objeto tiene fotogramas clave">◆</span>` : ''}
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
  if (state.tool === 'select' && !state.selected) {
    setHint('Haz clic en un objeto o arrastra un recuadro para elegir varios · botón central para girar la vista · <kbd>Espacio</kbd> reproduce la animación');
  } else if (state.tool === 'select') {
    const extra = animation.autoKey ? ' · <strong>Auto-clave activada</strong>' : '';
    setHint('Arrastra para mover · Z/X/Y giran · izquierda: profundidad · cuadraditos: tamaño · <kbd>Shift</kbd> ajusta el giro' + extra);
  } else {
    setHint(TOOL_HINTS[state.tool] || '');
  }
}

function updateStatus() {
  const objects = content.children.length;
  const pieces = countMeshes(content.children);
  const list = selectionList();
  const selectedName = list.length > 1 ? `${list.length} objetos elegidos` : (state.selected ? state.selected.name : 'Listo');
  dom.statusLeft.innerHTML = `
    <span class="status-item"><span class="status-dot${state.busy ? ' busy' : ''}"></span>${esc(selectedName)}</span>
    <span class="status-item">${icon('cube')} ${objects} ${objects === 1 ? 'objeto' : 'objetos'} · ${pieces} piezas</span>
    ${animation.keyCount ? `<span class="status-item">${icon('keyframe')} ${animation.keyCount} claves</span>` : ''}
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
  updateAnimBadge();
  timelineUI?.syncControls();
}

// ===== Selección =====
function normalizeSelection(list) {
  const set = new Set(list);
  return list.filter((obj) => {
    let node = obj.parent;
    while (node && node !== content) {
      if (set.has(node)) return false;
      node = node.parent;
    }
    return true;
  });
}

function applySelection(list, { quiet = false, allowHidden = false } = {}) {
  state.selection = normalizeSelection((list || []).filter((obj) => obj && isDescendantOfContent(obj) && (allowHidden || obj.visible !== false)));
  state.selected = state.selection[state.selection.length - 1] || null;
  if (!state.selected) {
    clearSelection();
    return;
  }
  syncLookFromObject(state.selected);
  updateSelectionBox();
  updateGizmoForTool();
  updateSelectionChip();
  updateModeBar();
  renderInspector();
  updateStatus();
  updateHint();
  if (state.tool === 'select') renderOptions();
  timelineUI?.render();
  if (!quiet) audio.click();
  focusSelectionChip();
}

function selectObject(obj, { quiet = false, additive = false, allowHidden = false } = {}) {
  if (!obj || !isDescendantOfContent(obj) || (!allowHidden && obj.visible === false)) {
    if (!additive) clearSelection();
    return;
  }
  if (additive) {
    const list = state.selection.slice();
    const index = list.indexOf(obj);
    if (index >= 0) list.splice(index, 1);
    else list.push(obj);
    applySelection(list, { quiet, allowHidden });
  } else {
    applySelection([obj], { quiet, allowHidden });
  }
}

function selectMany(list, options = {}) {
  applySelection(list, options);
}

function selectAllObjects() {
  const all = content.children.filter((obj) => obj.visible !== false);
  if (!all.length) {
    toast('La escena está vacía.', 'info');
    return;
  }
  selectMany(all);
}

function useClassicGizmo(mode) {
  const switching = state.gizmoStyle !== 'clasico';
  state.gizmoStyle = 'clasico';
  setMode(mode);
  updateGizmoForTool();
  if (state.tool === 'select') renderOptions();
  if (switching) {
    const many = selectionList().length > 1;
    toast(
      many ? 'Varios objetos: usa la caja 2D y sus tiradores' : 'Gizmo de flechas activado',
      'info',
      many ? 'El gizmo clásico se usa con un solo objeto; para varios, la caja 2D de Paint 3D.' : 'Puedes volver a la caja 2D desde el panel Elegir.'
    );
  }
}

function clearSelection() {
  state.selection = [];
  state.selected = null;
  gizmo.detach();
  gizmoHelper.visible = false;
  selectionBox.visible = false;
  manipulator.overlay.visible = false;
  objectControlsRoot?.classList.add('hidden');
  dom.selectionChip.classList.add('hidden');
  dom.selectionChip.innerHTML = '';
  updateModeBar();
  renderInspector();
  updateStatus();
  updateHint();
  if (state.tool === 'select') renderOptions();
  timelineUI?.render();
}

function selectableNodeFromHit(obj) {
  let node = obj;
  while (node && node !== content && !(node.userData && node.userData.meta)) node = node.parent;
  if (node && node !== content && node.userData && node.userData.meta) return node;
  return topLevelOf(obj);
}

function pickAt(event, { additive = false } = {}) {
  const hits = raycastContent(event).filter((h) => h.object && h.object.visible !== false);
  if (!hits.length) {
    if (!additive) clearSelection();
    return null;
  }
  const node = selectableNodeFromHit(hits[0].object);
  if (node) selectObject(node, { additive });
  return node;
}

// ===== Crear objetos =====
function placeNewObject(obj) {
  ensureUid(obj);
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

function stickerTarget() {
  let target = state.selected;
  if (target && target.userData && target.userData.isDecal) target = metaParentOf(target) || target.parent;
  if (!target || !isDescendantOfContent(target) || target.visible === false) return null;
  let hasSurface = target.isMesh && !target.userData.isDecal;
  if (!hasSurface) {
    target.traverse((obj) => {
      if (!hasSurface && obj.isMesh && !obj.userData.isDecal && obj.visible !== false) hasSurface = true;
    });
  }
  return hasSurface ? target : null;
}

function findStickerSurface(target) {
  const meshes = [];
  target.traverse((obj) => {
    if (obj.isMesh && !obj.userData.isDecal && obj.visible !== false) meshes.push(obj);
  });
  if (!meshes.length) return null;

  const raycaster = new THREE.Raycaster();
  const width = Math.max(1, dom.viewport.clientWidth);
  const height = Math.max(1, dom.viewport.clientHeight);
  const samples = [];

  const rect = screenRectOfObject(target);
  if (rect) {
    const w = Math.max(1, rect.maxX - rect.minX);
    const h = Math.max(1, rect.maxY - rect.minY);
    [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5], [0.5, 0.25], [0.5, 0.75], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]
      .forEach(([fx, fy]) => {
        const x = rect.minX + w * fx;
        const y = rect.minY + h * fy;
        samples.push(new THREE.Vector2((x / width) * 2 - 1, -(y / height) * 2 + 1));
      });
  }

  const targetBox = new THREE.Box3().setFromObject(target);
  if (!targetBox.isEmpty()) {
    const center = targetBox.getCenter(new THREE.Vector3()).project(camera);
    if (Number.isFinite(center.x) && Number.isFinite(center.y)) samples.push(new THREE.Vector2(center.x, center.y));
  }
  meshes.forEach((mesh) => {
    mesh.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3()).project(camera);
    if (Number.isFinite(center.x) && Number.isFinite(center.y)) samples.push(new THREE.Vector2(center.x, center.y));
  });

  const hits = [];
  for (const ndc of samples) {
    raycaster.setFromCamera(ndc, camera);
    const found = raycaster.intersectObjects(meshes, false).filter((hit) => hit.face);
    if (found.length) hits.push(found[0]);
  }
  if (!hits.length) return null;
  hits.sort((a, b) => a.distance - b.distance);
  return hits[0];
}

function localMeshSize(mesh) {
  if (!mesh.geometry) return 1;
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;
  if (!box) return 1;
  return Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z, 0.05);
}

function decalOffset(mesh) {
  return Math.max(0.004, localMeshSize(mesh) * 0.008);
}

function attachStickerToObject({ emoji = '', dataUrl = '', aspect = 1, name = '' } = {}, target = stickerTarget()) {
  if (!target) return null;
  const hit = findStickerSurface(target);
  if (!hit) {
    toast('No se pudo pegar la pegatina', 'error', 'Gira un poco la vista y vuelve a intentarlo.');
    return null;
  }
  const mesh = hit.object;
  const size = Math.max(0.08, localMeshSize(mesh) * 0.34);
  let decal = null;
  if (emoji) decal = createEmojiDecal(emoji, { size });
  else if (dataUrl) decal = createImageDecal(dataUrl, { aspect, size, name });
  if (!decal) return null;

  const localPoint = mesh.worldToLocal(hit.point.clone());
  const normal = hit.face.normal.clone().normalize();
  decal.position.copy(localPoint).addScaledVector(normal, decalOffset(mesh));
  decal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  mesh.add(decal);
  ensureUid(decal);
  selectObject(decal, { quiet: true });
  commit('Añadir pegatina');
  audio.pop();
  toast('Pegatina aplicada al objeto', 'success', 'Arrástrala sobre el objeto para acomodarla.');
  return decal;
}

function addSticker(emoji) {
  const target = stickerTarget();
  if (target) {
    const decal = attachStickerToObject({ emoji }, target);
    if (decal) return decal;
    return null;
  }
  const sprite = createEmojiSticker(emoji, { scale: 1.35 });
  ensureUid(sprite);
  sprite.position.copy(stickerPlacement());
  content.add(sprite);
  selectObject(sprite, { quiet: true });
  commit('Añadir sticker');
  audio.pop();
  toast(`Sticker ${emoji} añadido`, 'success', 'Elige un objeto antes de añadir una pegatina para pegarla sobre él.');
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
  const name = res.name ? res.name.replace(/\.[a-z0-9]+$/i, '') : 'Pegatina de imagen';
  const target = stickerTarget();
  if (target) {
    attachStickerToObject({ dataUrl: res.dataUrl, aspect, name }, target);
    return;
  }
  const sprite = createImageSticker(res.dataUrl, { scale: 1.9, aspect });
  ensureUid(sprite);
  sprite.name = name;
  sprite.position.copy(stickerPlacement());
  content.add(sprite);
  selectObject(sprite, { quiet: true });
  commit('Añadir sticker de imagen');
  audio.add();
  toast('Imagen añadida como sticker', 'success', 'Elige un objeto para pegarla sobre su superficie.');
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

function copyAnimationToClone(source, clone, offset) {
  const srcNodes = [];
  const dstNodes = [];
  source.traverse((child) => srcNodes.push(child));
  clone.traverse((child) => dstNodes.push(child));
  const total = Math.min(srcNodes.length, dstNodes.length);
  // Solo la pista del objeto superior se desplaza: al copiar un grupo, mover
  // el grupo ya arrastra a sus hijos y sus claves locales no deben cambiar.
  for (let i = 0; i < total; i++) animation.copyTrack(srcNodes[i], dstNodes[i], i === 0 ? offset : null);
}

function duplicateSelected() {
  const list = selectionList();
  if (!list.length) {
    toast('Elige un objeto para duplicarlo.', 'info');
    return;
  }
  const copies = [];
  list.forEach((obj) => {
    const copy = cloneObject(obj);
    content.add(copy);
    copyAnimationToClone(obj, copy, [0.55, 0, 0.55]);
    copies.push(copy);
  });
  selectMany(copies, { quiet: true });
  updateMaterialSides();
  commit('Duplicar objeto');
  audio.pop();
  timelineUI?.render();
  updateAnimBadge();
  toast(copies.length > 1 ? `${copies.length} objetos duplicados` : 'Objeto duplicado', 'success', 'Ctrl+Z si quieres deshacerlo.');
}

function deleteSelected() {
  const list = selectionList();
  if (!list.length) {
    toast('No hay nada seleccionado.', 'info');
    return;
  }
  list.forEach((obj) => {
    if (obj.parent) {
      obj.parent.remove(obj);
      disposeTree(obj);
    }
  });
  const total = list.length;
  clearSelection();
  syncAnimationTracks();
  commit(total > 1 ? 'Borrar objetos' : 'Borrar objeto');
  audio.whoosh();
  timelineUI?.render();
  toast(total > 1 ? `${total} objetos borrados` : 'Objeto borrado', 'success', 'Puedes recuperarlo con Ctrl+Z.');
}

function collectUids() {
  const set = new Set();
  content.traverse((obj) => {
    if (obj.userData && obj.userData.uid) set.add(obj.userData.uid);
  });
  return set;
}

function syncAnimationTracks() {
  animation.prune(collectUids());
  updateAnimBadge();
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
  animation.clear();
  clearSelection();
  commit('Vaciar la escena');
  timelineUI?.render();
  updateAnimBadge();
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

// ===== Portapapeles, grupos y atajos de colocación =====
let clipboard = [];

function copySelected() {
  const list = selectionList();
  if (!list.length) {
    toast('Elige algo para copiar.', 'info');
    return;
  }
  clipboard = list.map((obj) => serializeNode(obj)).filter(Boolean);
  audio.click();
  toast(list.length > 1 ? `${list.length} objetos copiados` : 'Objeto copiado', 'success', 'Pulsa Ctrl+V para pegar.');
}

function cutSelected() {
  const list = selectionList();
  if (!list.length) {
    toast('Elige algo para cortar.', 'info');
    return;
  }
  clipboard = list.map((obj) => serializeNode(obj)).filter(Boolean);
  const total = list.length;
  list.forEach((obj) => {
    if (obj.parent) {
      obj.parent.remove(obj);
      disposeTree(obj);
    }
  });
  clearSelection();
  syncAnimationTracks();
  commit('Cortar objetos');
  timelineUI?.render();
  audio.whoosh();
  toast(total > 1 ? `${total} objetos cortados` : 'Objeto cortado', 'success', 'Pega con Ctrl+V cuando quieras.');
}

function pasteClipboard() {
  const nodes = clipboard.filter(Boolean);
  if (!nodes.length) {
    toast('El portapapeles está vacío.', 'info');
    return;
  }
  const copies = [];
  nodes.forEach((node) => {
    const obj = deserializeNode(node);
    if (!obj) return;
    reassignUids(obj);
    obj.position.x += 0.55;
    obj.position.z += 0.55;
    content.add(obj);
    copies.push(obj);
  });
  if (!copies.length) {
    toast('No se pudo pegar el objeto.', 'error');
    return;
  }
  selectMany(copies, { quiet: true });
  updateMaterialSides();
  commit('Pegar objetos');
  audio.pop();
  timelineUI?.render();
  updateAnimBadge();
  toast(copies.length > 1 ? `${copies.length} objetos pegados` : 'Objeto pegado', 'success', 'Mueve la copia a su sitio.');
}

// ===== Transformaciones de la selección como un solo objeto =====
function selectionCenter() {
  const center = new THREE.Vector3();
  computeSelectionBounds(new THREE.Box3()).getCenter(center);
  return center;
}

function reflectionMatrix(normal) {
  const n = normal.clone().normalize();
  return new THREE.Matrix4().set(
    1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.z, 0,
    -2 * n.y * n.x, 1 - 2 * n.y * n.y, -2 * n.y * n.z, 0,
    -2 * n.z * n.x, -2 * n.z * n.y, 1 - 2 * n.z * n.z, 0,
    0, 0, 0, 1
  );
}

function matrixAround(center, matrix) {
  return new THREE.Matrix4()
    .makeTranslation(center.x, center.y, center.z)
    .multiply(matrix)
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));
}

function applySelectionMatrix(matrix, label) {
  const list = selectionList();
  if (!list.length) return false;
  const local = new THREE.Matrix4();
  const parentInv = new THREE.Matrix4();
  list.forEach((obj) => {
    obj.updateWorldMatrix(true, false);
    const parent = obj.parent || content;
    parent.updateWorldMatrix(true, false);
    const oldWorld = obj.matrixWorld.clone();
    parentInv.copy(parent.matrixWorld).invert();
    local.copy(parentInv).multiply(matrix).multiply(oldWorld);
    local.decompose(obj.position, obj.quaternion, obj.scale);
  });
  updateMaterialSides();
  updateSelectionBox();
  updateObjectControls();
  commitTransform(label);
  renderInspector();
  timelineUI?.render();
  return true;
}

// Un espejo deja el determinante de la matriz en negativo. En ese caso hay que
// dibujar las dos caras para que la iluminación y el color sigan viéndose bien.
function updateMaterialSides(root = content) {
  root.updateWorldMatrix(true, true);
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material || !obj.material.isMeshStandardMaterial) return;
    const side = obj.matrixWorld.determinant() < 0 ? THREE.DoubleSide : THREE.FrontSide;
    if (obj.material.side !== side) {
      obj.material.side = side;
      obj.material.needsUpdate = true;
    }
  });
}

function rotateSelection90(direction) {
  const list = selectionList();
  if (!list.length) {
    toast('Elige un objeto para girarlo.', 'info');
    return;
  }
  const center = selectionCenter();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  const rotation = new THREE.Matrix4().makeRotationAxis(forward, direction * Math.PI / 2);
  applySelectionMatrix(matrixAround(center, rotation), direction > 0 ? 'Girar 90° derecha' : 'Girar 90° izquierda');
  audio.click();
  toast(direction > 0 ? 'Giro de 90° a la derecha' : 'Giro de 90° a la izquierda', 'success');
}

function mirrorSelection(kind) {
  const list = selectionList();
  if (!list.length) {
    toast('Elige un objeto para reflejarlo.', 'info');
    return;
  }
  const center = selectionCenter();
  const normal = new THREE.Vector3();
  if (kind === 'horizontal') normal.setFromMatrixColumn(camera.matrixWorld, 0);
  else normal.setFromMatrixColumn(camera.matrixWorld, 1);
  normal.normalize();
  applySelectionMatrix(
    matrixAround(center, reflectionMatrix(normal)),
    kind === 'horizontal' ? 'Espejo horizontal' : 'Espejo vertical'
  );
  audio.pop();
  toast(kind === 'horizontal' ? 'Espejo horizontal aplicado' : 'Espejo vertical aplicado', 'success');
}

function groupSelected() {
  const list = selectionList();
  if (list.length < 2) {
    toast('Elige al menos dos objetos para agrupar.', 'info');
    return;
  }
  const group = new THREE.Group();
  group.name = 'Grupo';
  group.userData.meta = { kind: 'group', emoji: '🧩' };
  ensureUid(group);
  content.add(group);
  const oldParents = new Set();
  list.forEach((obj) => {
    if (obj.parent) oldParents.add(obj.parent);
    group.attach(obj);
  });
  oldParents.forEach((parent) => {
    if (parent && parent !== content && parent.isGroup && !parent.children.length) {
      animation.removeTrack(parent);
      parent.removeFromParent();
    }
  });
  selectMany([group], { quiet: true });
  commit('Agrupar objetos');
  audio.success();
  toast(`Grupo creado con ${list.length} objetos`, 'success', 'Se mueve, pinta y anima como una sola pieza.');
}

function ungroupSelected() {
  const list = selectionList().filter((obj) => obj.isGroup);
  if (!list.length) {
    toast('Elige un grupo para separarlo.', 'info');
    return;
  }
  const freed = [];
  list.forEach((group) => {
    group.children.slice().forEach((child) => {
      content.attach(child);
      freed.push(child);
    });
    animation.removeTrack(group);
    group.removeFromParent();
  });
  selectMany(freed, { quiet: true });
  syncAnimationTracks();
  commit('Separar grupo');
  timelineUI?.render();
  audio.pop();
  toast('Grupo separado', 'success', 'Ya puedes mover cada pieza por separado.');
}

function nudgeSelection(dx, dz) {
  const list = selectionList();
  if (!list.length) return;
  list.forEach((obj) => {
    obj.position.x += dx;
    obj.position.z += dz;
  });
  updateSelectionBox();
  commitTransform('Mover con flechas');
  renderInspector();
}

function focusSelection() {
  const list = selectionList();
  if (!list.length) {
    flyTo('inicio');
    return;
  }
  const box = computeSelectionBounds(new THREE.Box3());
  if (box.isEmpty()) return;
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
  audio.click();
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
  syncAnimationTracks();
  commit('Borrar doodles');
  renderOptions();
  timelineUI?.render();
  audio.whoosh();
  toast('Doodles borrados', 'success', 'Ctrl+Z si te arrepientes.');
}

function applyColorToObject(obj, hex, { silent = false } = {}) {
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
  if (silent) return;
  commit('Cambiar color');
  renderInspector();
  audio.pop();
}

function applyMaterialToObject(obj, materialId, { silent = false } = {}) {
  if (!materialPreset(materialId)) return;
  obj.traverse((mesh) => {
    if (mesh.isMesh && !mesh.userData.isImage && mesh.material && mesh.material.isMeshStandardMaterial) {
      removePaintFromMesh(mesh, { restoreColor: false });
      const spec = serializeMaterial(mesh.material);
      applyMaterialSpec(mesh, spec, materialId);
    }
  });
  state.materialId = materialId;
  if (silent) return;
  const preset = materialPreset(materialId);
  commit('Cambiar acabado');
  renderInspector();
  audio.click();
  toast(`Acabado: ${preset.name}`, 'info');
}

function applyPatternToObject(obj, patternId, { silent = false } = {}) {
  obj.traverse((mesh) => {
    if (mesh.isMesh && !mesh.userData.isImage && mesh.material && mesh.material.isMeshStandardMaterial) {
      removePaintFromMesh(mesh, { restoreColor: false });
      const spec = serializeMaterial(mesh.material);
      spec.pattern = patternId;
      applyMaterialSpec(mesh, spec, spec.preset);
    }
  });
  state.pattern = patternId;
  if (silent) return;
  commit('Cambiar textura');
  renderInspector();
  audio.pop();
  const def = PATTERNS.find((p) => p.id === patternId);
  toast(patternId ? `Textura: ${def ? def.name : patternId}` : 'Textura quitada', 'info');
}

function applyColorToSelection(hex) {
  const list = selectionList();
  if (!list.length) return;
  list.forEach((obj) => applyColorToObject(obj, hex, { silent: true }));
  commit('Cambiar color');
  renderInspector();
  audio.pop();
}

function applyMaterialToSelection(materialId) {
  const list = selectionList();
  if (!list.length || !materialPreset(materialId)) return;
  list.forEach((obj) => applyMaterialToObject(obj, materialId, { silent: true }));
  state.materialId = materialId;
  commit('Cambiar acabado');
  renderInspector();
  audio.click();
  toast(`Acabado: ${materialPreset(materialId).name}`, 'info');
}

function applyPatternToSelection(patternId) {
  const list = selectionList();
  if (!list.length) return;
  list.forEach((obj) => applyPatternToObject(obj, patternId, { silent: true }));
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
  ensureUid(mesh);
  content.add(mesh);
  selectObject(mesh, { quiet: true });
  commit('Doodle 3D');
  audio.pop();
  toast('¡Doodle creado!', 'success', 'Muévelo, gíralo o píntalo como cualquier objeto.');
}

// ===== Eventos del lienzo =====
let bodyDrag = null;
let marquee = null;
let decalDrag = null;
const tmpNdc = new THREE.Vector2();

function moveDecalOnSurface(event) {
  if (!decalDrag) return;
  const { decal, mesh } = decalDrag;
  pointerToNdc(event);
  const hits = raycaster.intersectObject(mesh, false).filter((hit) => hit.face);
  if (!hits.length) return;
  const hit = hits[0];
  const localPoint = mesh.worldToLocal(hit.point.clone());
  const normal = hit.face.normal.clone().normalize();
  decal.position.copy(localPoint).addScaledVector(normal, decalOffset(mesh));
  decal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  updateSelectionBox();
  updateObjectControls();
}

function updateMarquee(event) {
  if (!marquee) return;
  const rect = dom.viewport.getBoundingClientRect();
  const x = Math.min(marquee.startX, event.clientX) - rect.left;
  const y = Math.min(marquee.startY, event.clientY) - rect.top;
  const w = Math.abs(event.clientX - marquee.startX);
  const h = Math.abs(event.clientY - marquee.startY);
  if (w < 4 && h < 4) return;
  marquee.moved = true;
  marquee.rect = { x, y, w, h };
  const el = dom.marquee;
  if (!el) return;
  el.classList.remove('hidden');
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.width = w + 'px';
  el.style.height = h + 'px';
}

function ndcFromEvent(event) {
  const rect = dom.canvas.getBoundingClientRect();
  tmpNdc.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  return tmpNdc;
}

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
  if (state.recording) return;
  pointerDownInfo = {
    x: event.clientX,
    y: event.clientY,
    time: performance.now(),
    empty: false,
    additive: event.ctrlKey || event.metaKey || event.shiftKey,
  };

  if (state.tool === 'paint') {
    if (animation.playing) pauseAnimation();
    controls.enabled = false;
    beginPaint(event);
    return;
  }
  if (state.tool === 'doodle') {
    if (animation.playing) pauseAnimation();
    controls.enabled = false;
    beginDoodle(event);
    return;
  }
  if (state.tool !== 'select') return;
  if (animation.playing) pauseAnimation();

  const ndc = ndcFromEvent(event);
  const additive = pointerDownInfo.additive;

  const hits = raycastContent(event).filter((h) => h.object && h.object.visible !== false);
  const node = hits.length ? selectableNodeFromHit(hits[0].object) : null;
  pointerDownInfo.empty = !node;

  if (!node) {
    // Arrastrar en el vacío dibuja el recuadro de selección.
    marquee = {
      startX: event.clientX,
      startY: event.clientY,
      additive,
      moved: false,
      pointerId: event.pointerId,
    };
    controls.enabled = false;
    try { dom.canvas.setPointerCapture(event.pointerId); } catch { /* nada */ }
    return;
  }

  if (additive) {
    selectObject(node, { additive: true });
    controls.enabled = false;
    return;
  }

  if (!state.selection.includes(node)) {
    selectObject(node);
  } else if (state.selected !== node) {
    state.selected = node;
    syncLookFromObject(node);
    updateSelectionChip();
    renderInspector();
    updateGizmoForTool();
    updateModeBar();
    updateStatus();
    updateHint();
  }

  if (node.userData.isDecal && node.parent && node.parent.isMesh) {
    controls.enabled = false;
    try { dom.canvas.setPointerCapture(event.pointerId); } catch { /* nada */ }
    decalDrag = {
      decal: node,
      mesh: node.parent,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    return;
  }

  if (paintManipulatorActive()) {
    controls.enabled = false;
    try { dom.canvas.setPointerCapture(event.pointerId); } catch { /* nada */ }
    bodyDrag = { startX: event.clientX, startY: event.clientY, moved: false };
    manipulator.beginBodyDrag(ndc, hits[0].point, event);
  }
}, true);

dom.canvas.addEventListener('pointermove', (event) => {
  if (paintingStroke) {
    continuePaint(event);
    return;
  }
  if (doodleStroke) {
    continueDoodle(event);
    return;
  }
  if (marquee) {
    updateMarquee(event);
    return;
  }
  if (decalDrag) {
    if (!decalDrag.moved && Math.hypot(event.clientX - decalDrag.startX, event.clientY - decalDrag.startY) < 3) return;
    decalDrag.moved = true;
    moveDecalOnSurface(event);
    return;
  }
  if (manipulator.isDragging) {
    if (bodyDrag && !bodyDrag.moved) {
      if (Math.hypot(event.clientX - bodyDrag.startX, event.clientY - bodyDrag.startY) < 3) return;
      bodyDrag.moved = true;
    }
    manipulator.move(ndcFromEvent(event), event);
    return;
  }
  if (state.tool === 'select' && paintManipulatorActive()) {
    const hits = raycastContent(event).filter((h) => h.object && h.object.visible !== false);
    dom.canvas.style.cursor = hits.length ? 'move' : 'crosshair';
  } else if (state.tool !== 'select' || state.gizmoStyle !== 'clasico') {
    dom.canvas.style.cursor = '';
  }
});

dom.canvas.addEventListener('pointerup', (event) => {
  const wasPainting = !!paintingStroke;
  const wasDoodling = !!doodleStroke;
  const wasManipulating = manipulator.isDragging;
  const info = pointerDownInfo;

  if (marquee) {
    const current = marquee;
    marquee = null;
    dom.marquee?.classList.add('hidden');
    try { dom.canvas.releasePointerCapture(event.pointerId); } catch { /* nada */ }
    controls.enabled = !state.recording;
    if (current.moved && current.rect) {
      const hits = objectsInMarquee(current.rect);
      const list = current.additive ? [...state.selection, ...hits] : hits;
      if (list.length) {
        selectMany(list);
        audio.pop();
      } else if (!current.additive) {
        clearSelection();
      }
    } else if (!current.additive) {
      clearSelection();
    }
    pointerDownInfo = null;
    bodyDrag = null;
    return;
  }

  if (decalDrag) {
    const moved = decalDrag.moved;
    decalDrag = null;
    try { dom.canvas.releasePointerCapture(event.pointerId); } catch { /* nada */ }
    controls.enabled = !state.recording;
    if (moved) {
      commitTransform('Mover pegatina');
      renderInspector();
      timelineUI?.render();
    }
    pointerDownInfo = null;
    bodyDrag = null;
    return;
  }

  if (wasManipulating) {
    try { dom.canvas.releasePointerCapture(event.pointerId); } catch { /* nada */ }
    manipulator.end();
    bodyDrag = null;
    pointerDownInfo = null;
    controls.enabled = !state.recording;
    return;
  }

  finishPointer(event);
  if (state.tool === 'select' && !wasPainting && !wasDoodling && !gizmo.dragging && info) {
    const dx = event.clientX - info.x;
    const dy = event.clientY - info.y;
    if (Math.hypot(dx, dy) < 5 && performance.now() - info.time < 900 && info.empty && !info.additive) {
      clearSelection();
    }
  }
  pointerDownInfo = null;
  bodyDrag = null;
  controls.enabled = !state.recording;
});

dom.canvas.addEventListener('pointercancel', (event) => {
  if (marquee) {
    marquee = null;
    dom.marquee?.classList.add('hidden');
  }
  decalDrag = null;
  if (manipulator.isDragging) {
    manipulator.end();
  }
  finishPointer(event);
  pointerDownInfo = null;
  bodyDrag = null;
  controls.enabled = !state.recording;
});

dom.canvas.addEventListener('dblclick', (event) => {
  if (state.tool !== 'select') return;
  if (animation.playing) pauseAnimation();
  const hits = raycastContent(event).filter((h) => h.object && h.object.visible !== false);
  if (!hits.length) return;
  const node = selectableNodeFromHit(hits[0].object);
  const parent = node ? metaParentOf(node) : null;
  if (parent) selectObject(parent);
  else if (node) selectObject(node);
});

dom.canvas.addEventListener('contextmenu', (event) => event.preventDefault());

// Movimiento del gizmo clásico.
gizmo.addEventListener('dragging-changed', (event) => {
  controls.enabled = !event.value;
  if (!event.value && state.selected && isDescendantOfContent(state.selected)) {
    updateSelectionBox();
    commitTransform('Transformar objeto');
    renderInspector();
    timelineUI?.render();
  }
});

gizmo.addEventListener('objectChange', () => {
  if (state.selected) {
    updateSelectionBox();
    if (state.tool === 'select') updateSelectionChip();
  }
});

// ===== Historial y guardado automático =====
const history = new History(40);
let autosaveTimer = 0;
let autosaveInFlight = false;

function snapshotState() {
  return { ...serializeScene(content.children, currentSettings()), animation: animation.serialize() };
}

function autoKeySelection() {
  const list = keyTargets();
  if (!list.length) return false;
  list.forEach((obj) => animation.setKey(obj, animation.time));
  updateAnimBadge();
  timelineUI?.render();
  return true;
}

function commitTransform(label = 'Cambio') {
  if (animation.autoKey) autoKeySelection();
  commit(label);
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
  if (sceneState.animation) animation.load(sceneState.animation);
  else animation.reset();
  animation.playing = false;
  animation.prune(collectUids());
  clearSelection();
  renderAll();
  applyAnimationPose();
  updateMaterialSides();
  timelineUI?.render();
  updateAnimBadge();
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
    const payload = JSON.stringify(createProjectData(state.name, content.children, currentSettings(), camera, controls.target, animation.serialize()));
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
    const data = createProjectData(state.name, content.children, currentSettings(), camera, controls.target, animation.serialize());
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
  if (data.scene.animation) animation.load(data.scene.animation);
  else animation.reset();
  animation.playing = false;
  animation.prune(collectUids());
  applyAnimationPose();
  updateMaterialSides();
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
  timelineUI?.render();
  updateAnimBadge();
  if (animation.keyCount && dom.timeline.classList.contains('hidden')) openTimeline(true);
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
  animation.reset();
  applySettings({ environment: 'estudio', grid: true, floor: true, snap: false });
  setProjectName('Mi creación');
  state.projectPath = null;
  clearSelection();
  history.reset(snapshotState(), 'Nueva creación');
  state.historyReady = true;
  updateUndoButtons();
  renderAll();
  timelineUI?.render();
  updateAnimBadge();
  scheduleAutosave();
  setTool('shape');
  audio.success();
  toast('Nueva creación lista', 'success', 'Elige una forma o una plantilla para empezar.');
}

// ===== Exportar =====
async function exportKind(kind) {
  if (state.busy) return;
  if (kind === 'webm') {
    await exportAnimationVideo();
    return;
  }
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
      const dataUrl = renderScreenshot(renderer, scene, camera, [gizmoHelper, selectionBox, manipulator.overlay, grid, doodlePreview], 1920, 1200);
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

// ===== Línea de tiempo y reproducción =====
function updateAnimBadge() {
  const badge = document.getElementById('animBadge');
  if (badge) {
    const total = animation.keyCount;
    badge.textContent = String(total);
    badge.classList.toggle('on', total > 0);
  }
  const btn = document.getElementById('animBtn');
  if (btn) btn.classList.toggle('active', state.showTimeline);
}

function openTimeline(open = true) {
  if (!open && animation.playing) pauseAnimation();
  state.showTimeline = !!open;
  dom.timeline.classList.toggle('hidden', !open);
  document.body.classList.toggle('timeline-open', !!open);
  if (open) timelineUI?.open();
  else timelineUI?.close();
  updateAnimBadge();
  resizeRenderer();
}

function pauseAnimation() {
  animation.playing = false;
  updateGizmoForTool();
  timelineUI?.syncControls();
}

function playAnimation() {
  if (!animation.keyCount) {
    openTimeline(true);
    toast('Todavía no hay fotogramas clave', 'info', 'Elige un objeto y pulsa «Clave» en la línea de tiempo.');
    return;
  }
  openTimeline(true);
  if (animation.time >= animation.duration - 0.002) animation.time = 0;
  animation.playing = true;
  updateGizmoForTool();
  applyAnimationPose();
  timelineUI?.syncControls();
  audio.click();
}

function togglePlayback() {
  if (animation.playing) pauseAnimation();
  else playAnimation();
}

function stopPlayback() {
  pauseAnimation();
  animation.time = 0;
  applyAnimationPose();
  updateSelectionBox();
  timelineUI?.updatePlayhead();
  audio.click();
}

function addKeyframes(objects) {
  const list = (objects && objects.length ? objects : keyTargets()).filter(Boolean);
  if (!list.length) {
    openTimeline(true);
    toast('Elige un objeto para guardar su fotograma', 'info', 'Toca un objeto de la escena y vuelve a pulsar «Clave».');
    return;
  }
  if (animation.playing) pauseAnimation();
  if (dom.timeline.classList.contains('hidden')) openTimeline(true);
  list.forEach((obj) => animation.setKey(obj, animation.time));
  commit('Añadir fotograma clave');
  timelineUI?.render();
  updateAnimBadge();
  audio.pop();
  toast(
    list.length === 1 ? 'Fotograma clave añadido' : `${list.length} fotogramas clave añadidos`,
    'success',
    `En ${animation.time.toFixed(2)} s · mueve el objeto y añade otro para animarlo.`
  );
}

function deleteKeyframes(uid, time) {
  let removed = 0;
  if (uid) {
    const target = time === undefined ? animation.time : time;
    if (animation.removeKey(uid, target)) removed += 1;
  } else {
    const list = keyTargets();
    if (!list.length) {
      toast('Elige el objeto cuyo fotograma quieres borrar.', 'info');
      return;
    }
    list.forEach((obj) => {
      if (animation.removeKey(ensureUid(obj), animation.time)) removed += 1;
    });
  }
  if (!removed) {
    toast('No hay ningún fotograma clave en este instante.', 'info', 'Mueve el cabezal de la línea de tiempo a otro segundo.');
    return;
  }
  commit('Borrar fotograma clave');
  timelineUI?.render();
  updateAnimBadge();
  audio.whoosh();
  toast(removed === 1 ? 'Fotograma clave borrado' : `${removed} fotogramas clave borrados`, 'success', 'Ctrl+Z si te arrepientes.');
}

async function exportAnimationVideo({ save = true } = {}) {
  if (!animation.keyCount) {
    openTimeline(true);
    toast('No hay nada que grabar todavía', 'error', 'Crea fotogramas clave en la línea de tiempo antes de exportar.');
    audio.error();
    return { ok: false, reason: 'no-keys' };
  }
  if (typeof MediaRecorder === 'undefined' || typeof dom.canvas.captureStream !== 'function') {
    toast('Este equipo no puede grabar vídeo', 'error', 'Puedes exportar una imagen PNG de la escena.');
    audio.error();
    return { ok: false, reason: 'unsupported' };
  }
  if (state.busy) return { ok: false, reason: 'busy' };
  state.busy = true;
  state.recording = true;
  document.body.classList.add('recording');
  updateStatus();
  const prevTime = animation.time;
  const prevLoop = animation.loop;
  const gridWas = grid.visible;
  const stageWas = stage.visible;
  const floorWas = floor.visible;
  const boxWas = selectionBox.visible;
  const controlsWere = controls.enabled;
  controls.enabled = false;
  manipulator.setEnabled(false);
  selectionBox.visible = false;
  grid.visible = false;
  renderer.setPixelRatio(1);
  renderer.setSize(1280, 720, false);
  camera.aspect = 1280 / 720;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  pauseAnimation();
  animation.time = 0;
  animation.loop = false;
  applyAnimationPose();
  toast('Grabando animación…', 'info', `Dura ${animation.duration.toFixed(1)} s. No cierres la ventana.`);
  try {
    const stream = dom.canvas.captureStream(animation.fps);
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find((type) => MediaRecorder.isTypeSupported(type)) || 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 });
    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size) chunks.push(event.data);
    };
    const finished = new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
    });
    recorder.start(120);
    animation.playing = true;
    timelineUI?.updatePlayhead();
    await new Promise((resolve) => setTimeout(resolve, Math.max(800, animation.duration * 1000 + 350)));
    animation.playing = false;
    recorder.stop();
    stream.getTracks().forEach((track) => track.stop());
    const blob = await finished;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (!save) {
      return { ok: true, bytes: bytes.length, mime };
    }
    const baseName = (state.name || 'creacion').replace(/[\\/:*?"<>|]+/g, '-');
    const res = await saveBinaryFile(bytes, `${baseName}.webm`, [{ name: 'Vídeo WebM', extensions: ['webm'] }], 'Guardar la animación');
    if (!res.canceled) {
      audio.success();
      toast('Animación exportada', 'success', res.path ? displayPath(res.path) : 'Vídeo descargado');
    }
    return { ok: true, bytes: bytes.length, mime, saved: !res.canceled };
  } catch (err) {
    console.error(err);
    audio.error();
    toast('No se pudo grabar el vídeo', 'error', err.message || String(err));
    return { ok: false, reason: 'error', message: err.message || String(err) };
  } finally {
    animation.playing = false;
    animation.loop = prevLoop;
    animation.time = prevTime;
    applyAnimationPose();
    grid.visible = gridWas;
    stage.visible = stageWas;
    floor.visible = floorWas;
    selectionBox.visible = boxWas;
    controls.enabled = controlsWere;
    state.recording = false;
    state.busy = false;
    document.body.classList.remove('recording');
    resizeRenderer();
    updateGizmoForTool();
    updateStatus();
    timelineUI?.syncControls();
    scheduleAutosave();
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
        <div class="wf-card"><div class="wf-emoji">🖌️</div><div class="wf-title">Elige y transforma</div><div class="wf-sub">Caja 2D con tiradores: gira en Z, X e Y, cambia la profundidad y redimensiona.</div></div>
        <div class="wf-card"><div class="wf-emoji">🎬</div><div class="wf-title">Anima y comparte</div><div class="wf-sub">Línea de tiempo con fotogramas clave y vídeo WebM.</div></div>
      </div>
      <div class="welcome-actions">
        <button class="btn primary" data-welcome="templates">🏠 Elegir una plantilla</button>
        <button class="btn" data-welcome="blank">✨ Crear desde cero</button>
        <button class="btn soft" data-welcome="help">❓ Cómo funciona</button>
      </div>
      <p class="welcome-note">Consejo: arrastra un objeto para moverlo; los círculos <strong>Z</strong>, <strong>X</strong> e <strong>Y</strong> lo giran, el de la izquierda cambia la profundidad y los cuadraditos lo redimensionan. Pulsa <strong>Animar</strong> para crear tu primera película.</p>`,
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
          <li><span class="hl-icon">👆</span><span>Con <strong>Elegir</strong> tocas un objeto y lo <strong>arrastras</strong> para moverlo arriba/abajo e izquierda/derecha. La <strong>caja 2D</strong> tiene cuadraditos en las esquinas y puntos medios para redimensionar. Arriba (<strong>Z</strong>), derecha (<strong>X</strong>) y abajo (<strong>Y</strong>) giran; el círculo <strong>izquierdo</strong> cambia la profundidad. Mantén <kbd>Shift</kbd> para ajustar el giro a 15°.</span></li>
          <li><span class="hl-icon">⬚</span><span><strong>Arrastra en el vacío</strong> con el botón izquierdo para dibujar un recuadro y elegir varios objetos. El <strong>botón central</strong> (rueda) gira la vista.</span></li>
          <li><span class="hl-icon">➕</span><span>Con <kbd>Ctrl</kbd> o <kbd>Mayús</kbd> y un clic eliges varios objetos. Con varios elegidos, <strong>girar 90°</strong>, <strong>espejo H/V</strong>, <strong>cortar</strong>, <strong>copiar</strong> y <strong>pegar</strong> actúan sobre todo el grupo como si fuera uno solo.</span></li>
          <li><span class="hl-icon">⭐</span><span>En <strong>Stickers</strong>, elige un objeto y toca un emoji: la pegatina se pega a su superficie. Arrástrala sobre el objeto para colocarla.</span></li>
          <li><span class="hl-icon">🧊</span><span>En <strong>Formas</strong> añades cubos, esferas, estrellas y más.</span></li>
          <li><span class="hl-icon">🏠</span><span>En <strong>Plantillas</strong> empiezas con un modelo. Cada pieza se pinta por separado y doble clic elige el grupo entero.</span></li>
          <li><span class="hl-icon">🖌️</span><span>Con <strong>Pintar</strong> mantienes pulsado sobre un objeto y arrastras. <strong>Doodle</strong> dibuja tubos 3D en el aire.</span></li>
        </ul>
      </div>
      <div class="help-block">
        <h3>Atajos de teclado</h3>
        <table class="shortcut-table">
          <tr><td>Seleccionar</td><td><kbd>V</kbd></td></tr>
          <tr><td>Mover / Girar / Escalar (gizmo clásico)</td><td><kbd>G</kbd> <kbd>R</kbd> <kbd>S</kbd></td></tr>
          <tr><td>Herramientas</td><td><kbd>1</kbd>…<kbd>9</kbd></td></tr>
          <tr><td>Elegir todo</td><td><kbd>Ctrl</kbd> + <kbd>A</kbd></td></tr>
          <tr><td>Copiar / cortar / pegar</td><td><kbd>Ctrl</kbd> + <kbd>C</kbd> / <kbd>X</kbd> / <kbd>V</kbd></td></tr>
          <tr><td>Seleccionar varios</td><td><kbd>Arrastrar en el vacío</kbd></td></tr>
          <tr><td>Girar la vista</td><td><kbd>Botón central</kbd></td></tr>
          <tr><td>Duplicar / Agrupar</td><td><kbd>Ctrl</kbd> + <kbd>D</kbd> / <kbd>G</kbd></td></tr>
          <tr><td>Mover con flechas</td><td><kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd></td></tr>
          <tr><td>Enfocar lo elegido</td><td><kbd>F</kbd></td></tr>
          <tr><td>Reproducir animación</td><td><kbd>Espacio</kbd></td></tr>
          <tr><td>Añadir fotograma clave</td><td><kbd>K</kbd></td></tr>
          <tr><td>Borrar lo elegido</td><td><kbd>Supr</kbd></td></tr>
          <tr><td>Deshacer / Rehacer</td><td><kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>Ctrl</kbd> + <kbd>Mayús</kbd> + <kbd>Z</kbd></td></tr>
          <tr><td>Guardar / Abrir</td><td><kbd>Ctrl</kbd> + <kbd>S</kbd> / <kbd>Ctrl</kbd> + <kbd>O</kbd></td></tr>
          <tr><td>Cerrar diálogos</td><td><kbd>Esc</kbd></td></tr>
        </table>
      </div>
      <div class="help-block">
        <h3>La cámara</h3>
        <ul class="help-list">
          <li><span class="hl-icon">🖱️</span><span>El <strong>botón central</strong> (rueda) gira la vista; el <strong>izquierdo</strong> selecciona y arrastra objetos; el <strong>derecho</strong> desplaza la vista.</span></li>
          <li><span class="hl-icon">🔍</span><span>La <strong>rueda</strong> acerca y aleja. Los botones <strong>+</strong> y <strong>−</strong> también sirven.</span></li>
          <li><span class="hl-icon">✋</span><span>El botón derecho desplaza la vista. La casita vuelve a la vista 3/4.</span></li>
          <li><span class="hl-icon">🌅</span><span>En <strong>Escena</strong> cambias el ambiente, el suelo y la cuadrícula.</span></li>
      </ul>
      </div>
      <div class="help-block">
        <h3>Animación con fotogramas clave</h3>
        <ul class="help-list">
          <li><span class="hl-icon">🎬</span><span>Pulsa <strong>Animar</strong> (arriba) para abrir la línea de tiempo.</span></li>
          <li><span class="hl-icon">◆</span><span>Elige un objeto, coloca el cabezal en un fotograma y pulsa <strong>Clave</strong>. Mueve, gira o escala el objeto y añade otra clave: ¡ya tienes movimiento!</span></li>
          <li><span class="hl-icon">🎞️</span><span>Muévete con <strong>⏮ ◀ ▶ ⏭</strong> o escribe el número en el campo <strong>Fotograma</strong>. Elige la <strong>tasa de FPS</strong> (12, 24, 30…).</span></li>
          <li><span class="hl-icon">⬜</span><span><strong>+ Fotograma</strong> añade un fotograma en blanco al final. <strong>Blanco</strong> inserta uno en la posición actual y desplaza el resto. Un fotograma en blanco no tiene clave: mantiene la pose anterior.</span></li>
          <li><span class="hl-icon">⏵</span><span>Con <strong>Espacio</strong> reproduces o pausas. El bucle, la velocidad y la duración se cambian en la misma barra.</span></li>
          <li><span class="hl-icon">🔴</span><span>Con <strong>Auto</strong> activado, cada cambio guarda su fotograma automáticamente.</span></li>
          <li><span class="hl-icon">🎥</span><span>En <strong>Exportar</strong> eliges <strong>Animación WebM</strong> para guardar tu película.</span></li>
        </ul>
      </div>
      <div class="help-block">
        <h3>Guardado y exportación</h3>
        <ul class="help-list">
          <li><span class="hl-icon">💾</span><span>Tu creación se guarda automáticamente en este equipo, con sus fotogramas clave. El texto <strong>Guardado</strong> indica que todo está a salvo.</span></li>
          <li><span class="hl-icon">📂</span><span>Con <strong>Guardar</strong> creas un archivo <strong>.c3d</strong> que puedes abrir en otro momento.</span></li>
          <li><span class="hl-icon">🖼️</span><span><strong>PNG</strong> es una foto de tu escena; <strong>GLB</strong>, <strong>OBJ</strong> y <strong>STL</strong> son modelos 3D; <strong>WebM</strong> es un vídeo de la animación.</span></li>
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

// ===== Actualizaciones =====
const UPDATE_CACHE_KEY = 'creador3d.updateInfo';
const UPDATE_CHECK_MS = 24 * 60 * 60 * 1000;
let updateProgressCleanup = null;
let updateInstalling = false;

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024 * 1024) return `${Math.max(0, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function getUpdateCache() {
  try {
    const raw = localStorage.getItem(UPDATE_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.result) return null;
    return data;
  } catch {
    return null;
  }
}

function saveUpdateCache(result) {
  if (!result || result.status === 'error' || result.status === 'browser') return;
  try {
    localStorage.setItem(UPDATE_CACHE_KEY, JSON.stringify({ at: Date.now(), result }));
  } catch { /* almacenamiento lleno o bloqueado */ }
}

function setUpdateBadge(result) {
  const btn = dom.topActions.querySelector('#updateBtn');
  if (!btn) return;
  const available = result && result.status === 'available';
  btn.classList.toggle('has-update', available);
  btn.title = available ? `Actualización disponible: v${result.latestVersion}` : 'Buscar actualizaciones';
  btn.setAttribute('aria-label', btn.title);
}

function maybeNotifyUpdate(result) {
  if (!result || result.status !== 'available') return;
  try {
    if (localStorage.getItem('creador3d.updateNotified') === result.latestVersion) return;
    localStorage.setItem('creador3d.updateNotified', result.latestVersion);
  } catch { /* nada */ }
  toast(
    `Nueva versión v${result.latestVersion} disponible`,
    'info',
    'Pulsa el botón de actualizaciones, arriba a la derecha, para instalarla.'
  );
}

async function autoCheckUpdates() {
  if (!isDesktopApp()) return;
  const cached = getUpdateCache();
  if (cached) setUpdateBadge(cached.result);
  if (cached && Date.now() - cached.at < UPDATE_CHECK_MS) {
    maybeNotifyUpdate(cached.result);
    return;
  }
  const result = await checkForUpdates();
  saveUpdateCache(result);
  setUpdateBadge(result);
  maybeNotifyUpdate(result);
}

function openUpdates() {
  const modal = openModal({
    title: 'Actualizaciones',
    subtitle: 'Creador 3D revisa GitHub y puede instalarse solo, sin salir de la aplicación.',
    iconName: 'refresh',
    onClose: () => {
      if (updateProgressCleanup) {
        updateProgressCleanup();
        updateProgressCleanup = null;
      }
    },
    actions: [{ label: 'Cerrar', kind: '' }],
    body: `<div class="update-panel">
      <div class="update-current">
        <div class="update-current-icon">${icon('refresh')}</div>
        <div class="update-current-text">
          <span class="update-label">Versión instalada</span>
          <strong>v${esc(appVersion)}</strong>
        </div>
        <span class="update-channel">GitHub · estable</span>
      </div>
      <div class="update-status" id="updateStatus">
        <span class="update-spinner"></span><span>Buscando actualizaciones en GitHub…</span>
      </div>
      <div class="update-progress hidden" id="updateProgressBox">
        <div class="update-track"><div class="update-fill" id="updateFill"></div></div>
        <div class="update-progress-text" id="updateProgressText"></div>
      </div>
      <div class="update-notes hidden" id="updateNotes"></div>
      <p class="update-hint hidden" id="updateHint"></p>
      <div class="update-buttons">
        <button class="btn" id="updateCheckBtn">${icon('refresh')}<span>Buscar actualizaciones</span></button>
        <button class="btn primary hidden" id="updateInstallBtn">${icon('download')}<span>Instalar</span></button>
        <button class="btn soft hidden" id="updateReleasesBtn">${icon('download')}<span>Ver en GitHub</span></button>
      </div>
      <p class="update-note">Se descarga el AppImage oficial y se comprueba su firma SHA-256 antes de instalar. Nada se instala sin tu permiso.</p>
    </div>`,
  });

  const q = (selector) => modal.body.querySelector(selector);
  const statusEl = q('#updateStatus');
  const checkBtn = q('#updateCheckBtn');
  const installBtn = q('#updateInstallBtn');
  const releasesBtn = q('#updateReleasesBtn');
  const progressBox = q('#updateProgressBox');
  const progressText = q('#updateProgressText');
  const fill = q('#updateFill');
  const notesEl = q('#updateNotes');
  const hintEl = q('#updateHint');

  const setStatus = (html, kind = '') => {
    statusEl.className = 'update-status' + (kind ? ' ' + kind : '');
    statusEl.innerHTML = html;
  };

  const resetExtras = () => {
    installBtn.classList.add('hidden');
    releasesBtn.classList.add('hidden');
    notesEl.classList.add('hidden');
    hintEl.classList.add('hidden');
    progressBox.classList.add('hidden');
    fill.style.width = '0%';
    progressText.textContent = '';
    installBtn.disabled = false;
  };

  const renderResult = (result) => {
    resetExtras();
    checkBtn.disabled = false;
    if (!result) {
      setStatus('No se pudo consultar GitHub.', 'error');
      releasesBtn.classList.remove('hidden');
      return;
    }

    if (result.status === 'available') {
      const when = result.publishedAt
        ? ` · ${new Date(result.publishedAt).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}`
        : '';
      const weight = result.size ? ` · ${formatBytes(result.size)}` : '';
      setStatus(
        `<span class="us-emoji">🎉</span><div><strong>¡Hay una versión nueva!</strong><div class="us-sub">v${esc(result.latestVersion)}${when}${weight}</div></div>`,
        'available'
      );
      if (result.notes) {
        notesEl.classList.remove('hidden');
        notesEl.innerHTML = `<strong>Novedades</strong><div>${esc(result.notes).replace(/\n/g, '<br>')}</div>`;
      }
      if (result.canInstall) {
        installBtn.classList.remove('hidden');
        installBtn.querySelector('span').textContent = `Instalar v${result.latestVersion}`;
      } else {
        hintEl.textContent = 'Esta copia no es un AppImage instalado. Puedes descargar la versión nueva desde GitHub.';
        hintEl.classList.remove('hidden');
      }
      releasesBtn.classList.remove('hidden');
      return;
    }

    if (result.status === 'current') {
      setStatus(
        `<span class="us-emoji">✅</span><div><strong>Todo al día</strong><div class="us-sub">Tienes la última versión publicada (v${esc(result.currentVersion)}).</div></div>`,
        'success'
      );
      releasesBtn.classList.remove('hidden');
      return;
    }

    if (result.status === 'no-releases') {
      setStatus(
        '<span class="us-emoji">🌱</span><div><strong>Aún no hay versiones publicadas</strong><div class="us-sub">Cuando se publique la primera versión aparecerá aquí.</div></div>',
        ''
      );
      releasesBtn.classList.remove('hidden');
      return;
    }

    if (result.status === 'no-asset') {
      setStatus(
        '<span class="us-emoji">📦</span><div><strong>La versión nueva no tiene instalador</strong><div class="us-sub">Puedes descargarla manualmente desde GitHub.</div></div>',
        ''
      );
      releasesBtn.classList.remove('hidden');
      return;
    }

    if (result.status === 'browser') {
      setStatus(
        '<span class="us-emoji">🌐</span><div><strong>Estás en el navegador</strong><div class="us-sub">Abre la aplicación de escritorio para actualizar automáticamente.</div></div>',
        ''
      );
      return;
    }

    setStatus(
      `<span class="us-emoji">⚠️</span><div><strong>No se pudo comprobar</strong><div class="us-sub">${esc(result.message || 'Inténtalo de nuevo.')}</div></div>`,
      'error'
    );
    releasesBtn.classList.remove('hidden');
  };

  const runCheck = async ({ announce = true } = {}) => {
    if (updateInstalling) return;
    checkBtn.disabled = true;
    if (announce) {
      setStatus('<span class="update-spinner"></span><span>Buscando actualizaciones en GitHub…</span>', 'loading');
    }
    const result = await checkForUpdates();
    saveUpdateCache(result);
    setUpdateBadge(result);
    renderResult(result);
  };

  const handleProgress = (progress) => {
    progressBox.classList.remove('hidden');
    const percent = Math.max(0, Math.min(100, Number(progress.percent) || 0));
    fill.style.width = `${percent}%`;
    if (progress.phase === 'downloading') {
      progressText.textContent = `${percent}% · ${formatBytes(progress.downloaded)} de ${formatBytes(progress.total)}`;
    } else if (progress.phase === 'verifying') {
      progressText.textContent = 'Comprobando la firma de seguridad…';
    } else if (progress.phase === 'installing') {
      progressText.textContent = 'Instalando la nueva versión…';
    } else if (progress.phase === 'ready') {
      progressText.textContent = 'Lista. Reiniciando Creador 3D…';
    } else if (progress.phase === 'launching') {
      progressText.textContent = 'Abriendo la nueva versión…';
    }
  };

  checkBtn.addEventListener('click', () => {
    audio.click();
    runCheck();
  });

  releasesBtn.addEventListener('click', () => {
    audio.click();
    openReleasesPage();
  });

  installBtn.addEventListener('click', async () => {
    if (updateInstalling) return;
    updateInstalling = true;
    checkBtn.disabled = true;
    installBtn.disabled = true;
    releasesBtn.classList.add('hidden');
    progressBox.classList.remove('hidden');
    fill.style.width = '0%';
    progressText.textContent = 'Preparando la descarga…';
    setStatus('<span class="update-spinner"></span><span>Descargando la actualización…</span>', 'loading');
    updateProgressCleanup = onUpdateProgress(handleProgress);

    let result;
    try {
      result = await installUpdate();
    } catch (err) {
      result = { ok: false, message: err && err.message ? err.message : String(err) };
    }

    if (result && result.ok) {
      setStatus(
        '<span class="us-emoji">✅</span><div><strong>Actualización instalada</strong><div class="us-sub">Creador 3D se reiniciará con la versión nueva.</div></div>',
        'success'
      );
      progressText.textContent = 'Abriendo la nueva versión…';
      return;
    }

    updateInstalling = false;
    checkBtn.disabled = false;
    installBtn.disabled = false;
    if (updateProgressCleanup) {
      updateProgressCleanup();
      updateProgressCleanup = null;
    }
    setStatus(
      `<span class="us-emoji">⚠️</span><div><strong>No se pudo actualizar</strong><div class="us-sub">${esc((result && result.message) || 'Inténtalo de nuevo.')}</div></div>`,
      'error'
    );
    releasesBtn.classList.remove('hidden');
  });

  const cached = getUpdateCache();
  if (cached && cached.result) {
    renderResult(cached.result);
    runCheck({ announce: false });
  } else {
    runCheck();
  }
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
  if (state.recording) return;
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
  if (mod && lower === 'a') {
    event.preventDefault();
    selectAllObjects();
    return;
  }
  if (mod && lower === 'c') {
    event.preventDefault();
    copySelected();
    return;
  }
  if (mod && lower === 'x') {
    event.preventDefault();
    cutSelected();
    return;
  }
  if (mod && lower === 'v') {
    event.preventDefault();
    pasteClipboard();
    return;
  }
  if (mod && lower === 'g') {
    event.preventDefault();
    if (event.shiftKey) ungroupSelected(); else groupSelected();
    return;
  }
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
  if (key === ' ' || key === 'Spacebar') {
    event.preventDefault();
    togglePlayback();
    return;
  }
  if (lower === 'k' || lower === 'i') {
    event.preventDefault();
    addKeyframes();
    return;
  }
  if (key === 'Delete' || key === 'Backspace') {
    event.preventDefault();
    deleteSelected();
    return;
  }
  if (key === 'Escape') {
    if (animation.playing) pauseAnimation();
    if (state.selected) clearSelection();
    else if (state.tool !== 'select') setTool('select');
    return;
  }
  if (key === 'Home') {
    event.preventDefault();
    flyTo('inicio');
    return;
  }
  if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
    event.preventDefault();
    const step = event.shiftKey ? 0.6 : 0.15;
    if (key === 'ArrowLeft') nudgeSelection(-step, 0);
    else if (key === 'ArrowRight') nudgeSelection(step, 0);
    else if (key === 'ArrowUp') nudgeSelection(0, -step);
    else nudgeSelection(0, step);
    return;
  }
  if (lower === 'v') { setTool('select'); return; }
  if (lower === 'f') { focusSelection(); return; }
  if (lower === 'g') { useClassicGizmo('translate'); return; }
  if (lower === 'r') { useClassicGizmo('rotate'); return; }
  if (lower === 's') { useClassicGizmo('scale'); return; }
  if (/^[1-9]$/.test(key)) {
    const def = TOOL_DEFS[+key - 1];
    if (def) setTool(def.id);
  }
});

window.addEventListener('beforeunload', () => {
  if (!state.historyReady) return;
  try {
    const payload = JSON.stringify(createProjectData(state.name, content.children, currentSettings(), camera, controls.target, animation.serialize()));
    localStorage.setItem('creador3d.autosave.latest', payload);
  } catch { /* nada */ }
});

// ===== Inicio =====
async function boot() {
  try {
    const soundPref = localStorage.getItem('creador3d.sound');
    if (soundPref !== null) state.sound = soundPref === '1';
    if (localStorage.getItem('creador3d.autokey') === '1') animation.autoKey = true;
  } catch { /* nada */ }
  audio.setEnabled(state.sound);

  resizeRenderer();
  applySettings(currentSettings());
  renderTopActions();
  renderToolbar();
  renderModeBar();
  renderZoomBar();
  initObjectControls();
  timelineUI = new Timeline({
    root: dom.timeline,
    animation,
    resolve: findObjectByUid,
    getSelected: selectionList,
    onSeek: (time) => {
      if (animation.playing) pauseAnimation();
      animation.time = Math.max(0, Math.min(animation.duration, time));
      applyAnimationPose();
      updateMaterialSides();
      updateSelectionBox();
      updateGizmoForTool();
      timelineUI?.updatePlayhead();
    },
    onPlayToggle: togglePlayback,
    onStop: stopPlayback,
    onAddKey: (obj) => addKeyframes(obj ? [obj] : undefined),
    onDeleteKey: (uid, time) => deleteKeyframes(uid, time),
    onCommit: (label) => commit(label),
    onSelectObject: (obj) => {
      setTool('select');
      selectObject(obj, { allowHidden: obj.visible === false });
    },
    onClose: () => openTimeline(false),
    onNotice: (message) => toast(message, 'info'),
    onSettings: () => {
      try { localStorage.setItem('creador3d.autokey', animation.autoKey ? '1' : '0'); } catch { /* nada */ }
      scheduleAutosave();
    },
  });
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
      animation.load(data.scene.animation || null);
      animation.playing = false;
      animation.prune(collectUids());
      applyAnimationPose();
      updateMaterialSides();
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
  updateAnimBadge();
  if (animation.keyCount) openTimeline(true);
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
  manipulator,
  THREE,
  getStats() {
    return {
      objects: content.children.length,
      meshes: countMeshes(content.children),
      selected: state.selected ? state.selected.name : null,
      selection: selectionList().map((obj) => obj.name),
      selectionCount: selectionList().length,
      tool: state.tool,
      mode: state.mode,
      gizmoStyle: state.gizmoStyle,
      environment: state.environment,
      grid: state.showGrid,
      floor: state.showFloor,
      historyIndex: history.index,
      historyLength: history.stack.length,
      canUndo: history.canUndo,
      canRedo: history.canRedo,
      saveState: dom.saveState.textContent,
      modalOpen: !dom.modalRoot.classList.contains('hidden'),
      timelineOpen: !dom.timeline.classList.contains('hidden'),
      keyframes: animation.keyCount,
      tracks: animation.trackCount,
      animationTime: Math.round(animation.time * 1000) / 1000,
      animationPlaying: animation.playing,
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
  selectIndices(indices) {
    const list = (indices || []).map((i) => content.children[i]).filter(Boolean);
    if (list.length) selectMany(list);
    return list.map((obj) => obj.name);
  },
  selectObject,
  selectMany,
  getSelectedNames: () => selectionList().map((obj) => obj.name),
  animation,
  openTimeline,
  addKeyframe(index) {
    const obj = index === undefined ? state.selected : content.children[index];
    if (!obj) return false;
    addKeyframes([obj]);
    return true;
  },
  addKeyframes,
  deleteKeyframes,
  setAnimationTime(time) {
    pauseAnimation();
    animation.time = Math.max(0, Math.min(animation.duration, Number(time) || 0));
    applyAnimationPose();
    updateMaterialSides();
    updateSelectionBox();
    updateGizmoForTool();
    timelineUI?.updatePlayhead();
    return animation.time;
  },
  playAnimation,
  pauseAnimation,
  stopPlayback,
  togglePlayback,
  applyAnimationPose() {
    applyAnimationPose();
    updateSelectionBox();
    return animation.time;
  },
  animationStats() {
    return {
      duration: animation.duration,
      fps: animation.fps,
      time: animation.time,
      playing: animation.playing,
      loop: animation.loop,
      speed: animation.speed,
      autoKey: animation.autoKey,
      keys: animation.keyCount,
      tracks: animation.trackCount,
    };
  },
  selectAll: selectAllObjects,
  duplicateSelected,
  deleteSelected,
  cutSelected,
  copySelected,
  pasteClipboard,
  rotateSelection90,
  mirrorSelection,
  groupSelected,
  ungroupSelected,
  focusSelection,
  useClassicGizmo,
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
  projectJSON: () => JSON.stringify(createProjectData(state.name, content.children, currentSettings(), camera, controls.target, animation.serialize())),
  loadProjectJSON(text) {
    const data = parseProjectData(text);
    loadProjectData(data, null);
    return true;
  },
  paintOn: testPaint,
  renderPNG: () => renderScreenshot(renderer, scene, camera, [gizmoHelper, selectionBox, manipulator.overlay, grid, doodlePreview], 1920, 1200),
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
  recordAnimation: (options) => exportAnimationVideo(options),
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




