import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

function stripForExport(obj, keepSprites) {
  const clone = obj.clone(true);
  const toRemove = [];
  clone.traverse((child) => {
    if (child.isSprite && !keepSprites) toRemove.push(child);
    if (child.userData && child.userData.isHelper) toRemove.push(child);
  });
  toRemove.forEach((child) => child.parent && child.parent.remove(child));
  return clone;
}

export function buildExportGroup(contentGroup, keepSprites = false) {
  const group = new THREE.Group();
  group.name = 'Creador3D';
  contentGroup.children.forEach((obj) => {
    if (obj.visible === false) return;
    const clone = stripForExport(obj, keepSprites);
    clone.position.copy(obj.position);
    clone.quaternion.copy(obj.quaternion);
    clone.scale.copy(obj.scale);
    group.add(clone);
  });
  return group;
}

export async function exportGLB(contentGroup) {
  const group = buildExportGroup(contentGroup, false);
  group.updateMatrixWorld(true);
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(group, {
    binary: true,
    onlyVisible: true,
    maxTextureSize: 2048,
    includeCustomExtensions: false,
  });
  return new Uint8Array(result);
}

export function exportOBJ(contentGroup) {
  const group = buildExportGroup(contentGroup, false);
  group.updateMatrixWorld(true);
  const exporter = new OBJExporter();
  return exporter.parse(group);
}

export function exportSTL(contentGroup) {
  const group = buildExportGroup(contentGroup, false);
  group.updateMatrixWorld(true);
  const exporter = new STLExporter();
  const result = exporter.parse(group, { binary: true });
  // En Three.js reciente el modo binario devuelve un DataView, no un ArrayBuffer.
  if (result instanceof DataView) return new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
  if (result instanceof ArrayBuffer) return new Uint8Array(result);
  return new Uint8Array(result);
}

export function renderScreenshot(renderer, scene, camera, helpers, width = 1920, height = 1200) {
  const oldSize = renderer.getSize(new THREE.Vector2());
  const oldRatio = renderer.getPixelRatio();
  const oldAspect = camera.aspect;
  const helperVisibility = helpers.map((h) => [h, h.visible]);
  const gridVisible = helpers.grid ? helpers.grid.visible : null;

  helpers.forEach((h) => { if (h) h.visible = false; });
  if (helpers.grid) helpers.grid.visible = false;

  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL('image/png');

  renderer.setPixelRatio(oldRatio);
  renderer.setSize(oldSize.x, oldSize.y, false);
  camera.aspect = oldAspect;
  camera.updateProjectionMatrix();
  helperVisibility.forEach(([h, v]) => { if (h) h.visible = v; });
  if (helpers.grid && gridVisible !== null) helpers.grid.visible = gridVisible;
  renderer.render(scene, camera);
  return dataUrl;
}
