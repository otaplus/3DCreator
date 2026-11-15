import * as THREE from 'three';
import {
  createPrimitive, createTextMesh, createEmojiSticker, createImageSticker,
  createImagePlane, createDoodle, serializeMaterial, createMaterial,
  createEmojiDecal, createImageDecal,
} from './shapes.js';
import { createPaintLayer } from './textures.js';
import { ensureUid } from './animation.js';

const round = (n) => Math.round(n * 1000) / 1000;

function serializePaint(layer) {
  if (!layer) return null;
  return {
    baseColor: layer.baseColor,
    strokes: layer.strokes.map((s) => ({
      c: s.color,
      e: s.erase ? 1 : 0,
      w: round(s.size),
      p: s.points.map((pt) => [Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10]),
    })),
  };
}

function deserializePaint(data) {
  if (!data) return null;
  return {
    baseColor: data.baseColor,
    strokes: (data.strokes || []).map((s) => ({
      color: s.c,
      erase: !!s.e,
      size: s.w,
      points: (s.p || []).map((pt) => ({ x: pt[0], y: pt[1] })),
    })),
  };
}

export function serializeNode(obj) {
  const meta = obj.userData.meta;
  if (!meta) return null;
  const node = {
    uid: ensureUid(obj),
    name: obj.name,
    meta: { ...meta },
    pos: [round(obj.position.x), round(obj.position.y), round(obj.position.z)],
    quat: [obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w].map((n) => Math.round(n * 10000) / 10000),
    scale: [round(obj.scale.x), round(obj.scale.y), round(obj.scale.z)],
  };
  if (obj.visible === false) node.hidden = true;
  if (obj.isMesh && !meta.decal) {
    node.material = serializeMaterial(obj.material);
    if (obj.userData.paint) node.paint = serializePaint(obj.userData.paint);
  }
  if (obj.children && obj.children.length) {
    node.children = obj.children.map(serializeNode).filter(Boolean);
  }
  return node;
}

function materialSpec(node) {
  const m = node.material || {};
  return {
    color: m.color || '#7c6bff',
    roughness: m.roughness,
    metalness: m.metalness,
    opacity: m.opacity,
    transparent: m.transparent,
    depthWrite: m.depthWrite,
    flatShading: m.flatShading,
    emissive: m.emissive,
    pattern: m.pattern || null,
    materialId: m.preset || 'mate',
  };
}

function attachPaint(mesh, data) {
  if (!data) return;
  const layer = createPaintLayer(data.baseColor, data.strokes);
  mesh.material.map = layer.texture;
  mesh.material.color.set('#ffffff');
  mesh.material.userData.paint = true;
  mesh.material.needsUpdate = true;
  mesh.userData.paint = layer;
}

export function deserializeNode(node) {
  if (!node || !node.meta) return null;
  const meta = node.meta;
  let obj = null;
  try {
    switch (meta.kind) {
      case 'primitive': {
        obj = createPrimitive(meta.primitive, materialSpec(node));
        break;
      }
      case 'text': {
        obj = createTextMesh(meta.text, { ...materialSpec(node), size: meta.size, depth: meta.depth });
        break;
      }
      case 'doodle': {
        const pts = (meta.points || []).map((p) => new THREE.Vector3(p[0], p[1], p[2]));
        obj = createDoodle(pts, meta.radius || 0.08, materialSpec(node));
        break;
      }
      case 'sticker': {
        if (meta.decal) {
          if (meta.emoji) obj = createEmojiDecal(meta.emoji, { size: meta.size });
          else if (meta.dataUrl) obj = createImageDecal(meta.dataUrl, { aspect: meta.aspect || 1, size: meta.size, name: node.name });
        } else if (meta.emoji) obj = createEmojiSticker(meta.emoji, { scale: node.scale?.[0] || 1.35 });
        else if (meta.dataUrl) obj = createImageSticker(meta.dataUrl, { aspect: meta.aspect || 1, scale: node.scale?.[1] || 1.8 });
        break;
      }
      case 'image': {
        obj = createImagePlane(meta.dataUrl, { aspect: meta.aspect, height: meta.height, name: node.name });
        break;
      }
      case 'template':
      case 'group': {
        obj = new THREE.Group();
        obj.userData.meta = { ...meta };
        break;
      }
      default:
        return null;
    }
  } catch (err) {
    console.warn('No se pudo reconstruir un objeto', err);
    return null;
  }
  if (!obj) return null;
  obj.name = node.name || obj.name;
  if (node.uid) obj.userData.uid = node.uid;
  else ensureUid(obj);
  if (node.pos) obj.position.fromArray(node.pos);
  if (node.quat) obj.quaternion.fromArray(node.quat);
  if (node.scale) obj.scale.fromArray(node.scale);
  if (node.hidden) obj.visible = false;
  if (node.paint) attachPaint(obj, deserializePaint(node.paint));
  if (node.children && node.children.length) {
    node.children.forEach((child) => {
      const c = deserializeNode(child);
      if (c) obj.add(c);
    });
  }
  return obj;
}

export function serializeScene(objects, settings) {
  return {
    objects: objects.map(serializeNode).filter(Boolean),
    settings: { ...settings },
  };
}

export function createProjectData(name, objects, settings, camera, target, animation = null) {
  const sceneData = serializeScene(objects, settings);
  if (animation) sceneData.animation = animation;
  return {
    format: 'creador3d',
    version: 1,
    app: 'Creador 3D',
    name: name || 'Mi creación',
    savedAt: new Date().toISOString(),
    scene: sceneData,
    camera: camera ? {
      position: camera.position.toArray().map((n) => Math.round(n * 1000) / 1000),
      target: target ? target.toArray() : [0, 1.1, 0],
    } : null,
  };
}

export function parseProjectData(text) {
  let data;
  try {
    data = typeof text === 'string' ? JSON.parse(text) : text;
  } catch {
    throw new Error('El archivo no es una creación válida.');
  }
  if (!data || data.format !== 'creador3d' || !data.scene || !Array.isArray(data.scene.objects)) {
    throw new Error('Este archivo no parece una creación de Creador 3D.');
  }
  return data;
}

export function restoreProject(data, contentGroup) {
  while (contentGroup.children.length) {
    const child = contentGroup.children.pop();
    disposeTree(child);
  }
  let count = 0;
  for (const node of data.scene.objects) {
    const obj = deserializeNode(node);
    if (obj) {
      contentGroup.add(obj);
      count++;
    }
  }
  return { objects: count, settings: data.scene.settings || {}, camera: data.camera || null };
}

export function disposeTree(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        if (m.map && !(m.map.userData && m.map.userData.shared)) m.map.dispose();
        m.dispose();
      });
    }
  });
}

export function cloneObject(obj) {
  obj.traverse((child) => ensureUid(child));
  const clone = obj.clone(true);
  // Los materiales deben ser independientes para poder recolorear cada copia.
  // Además, cada copia recibe identificadores nuevos para su propia animación.
  clone.traverse((child) => {
    if (child.userData) {
      child.userData.uid = null;
      ensureUid(child);
    }
    if (child.isMesh && child.userData.isDecal) {
      child.material = child.material.clone();
      if (child.material.map) {
        child.material.map = child.material.map.clone();
        child.material.map.needsUpdate = true;
      }
      child.castShadow = false;
      child.receiveShadow = false;
    } else if (child.isMesh && !child.userData.isImage) {
      child.material = createMaterial(serializeMaterial(child.material));
      if (child.userData.paint) {
        const data = serializePaint(child.userData.paint);
        attachPaint(child, deserializePaint(data));
      }
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  clone.position.x += 0.55;
  clone.position.z += 0.55;
  return clone;
}

export function countMeshes(objects) {
  let n = 0;
  objects.forEach((o) => o.traverse((c) => { if (c.isMesh || c.isSprite) n++; }));
  return n;
}
