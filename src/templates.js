import * as THREE from 'three';
import { createPrimitive } from './shapes.js';

// Las plantillas se construyen con formas normales, así que cada pieza se
// puede seleccionar, pintar, mover y cambiar de color por separado.

function p(type, color, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], name, material = 'mate', pattern = null } = {}) {
  const mesh = createPrimitive(type, { color, materialId: material, pattern, name });
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  return mesh;
}

function group(id, name, emoji, parts) {
  const g = new THREE.Group();
  g.name = name;
  g.userData.meta = { kind: 'template', templateId: id, emoji };
  parts.forEach((part) => g.add(part));
  return g;
}

const TEMPLATE_BUILDERS = {
  casa: () => {
    const parts = [];
    parts.push(p('box', '#f6e3c5', { pos: [0, 1.42, 0], scale: [2.2, 1.5, 1.9], name: 'Paredes' }));
    parts.push(p('pyramid', '#e85d5d', { pos: [0, 3.65, 0], scale: [2.4, 0.8, 2.4], name: 'Tejado' }));
    parts.push(p('box', '#d27c5a', { pos: [1.3, 3.95, -0.85], scale: [0.32, 0.55, 0.32], name: 'Chimenea' }));
    parts.push(p('box', '#a9714b', { pos: [0, 0.9, 1.84], scale: [0.45, 0.95, 0.08], name: 'Puerta' }));
    parts.push(p('sphere', '#ffd166', { pos: [0.23, 0.95, 1.96], scale: [0.1, 0.1, 0.1], name: 'Picaporte' }));
    parts.push(p('box', '#7cd4ff', { pos: [-1.25, 1.95, 1.84], scale: [0.45, 0.4, 0.06], name: 'Ventana' }));
    parts.push(p('box', '#7cd4ff', { pos: [1.25, 1.95, 1.84], scale: [0.45, 0.4, 0.06], name: 'Ventana' }));
    parts.push(p('box', '#fff4e0', { pos: [-1.25, 1.95, 1.79], scale: [0.52, 0.47, 0.03], name: 'Marco' }));
    parts.push(p('box', '#fff4e0', { pos: [1.25, 1.95, 1.79], scale: [0.52, 0.47, 0.03], name: 'Marco' }));
    return group('casa', 'Casa', '🏠', parts);
  },

  arbol: () => {
    const parts = [];
    parts.push(p('cylinder', '#8b5e3c', { pos: [0, 1.2, 0], scale: [0.4, 1.2, 0.4], name: 'Tronco' }));
    parts.push(p('sphere', '#4caf6d', { pos: [0, 3.15, 0], scale: [1.15, 1.0, 1.15], name: 'Copa' }));
    parts.push(p('sphere', '#63c96b', { pos: [-0.8, 2.55, 0.15], scale: [0.85, 0.78, 0.85], name: 'Copa' }));
    parts.push(p('sphere', '#3f9e5b', { pos: [0.85, 2.7, -0.1], scale: [0.9, 0.82, 0.9], name: 'Copa' }));
    parts.push(p('sphere', '#ff5e6c', { pos: [-0.45, 3.1, 0.95], scale: [0.13, 0.13, 0.13], name: 'Manzana' }));
    parts.push(p('sphere', '#ff5e6c', { pos: [0.55, 3.45, 0.8], scale: [0.12, 0.12, 0.12], name: 'Manzana' }));
    parts.push(p('sphere', '#ffc94d', { pos: [0.25, 2.35, 0.85], scale: [0.11, 0.11, 0.11], name: 'Fruta' }));
    return group('arbol', 'Árbol', '🌳', parts);
  },

  robot: () => {
    const parts = [];
    parts.push(p('cylinder', '#7c6bff', { pos: [-0.55, 0.5, 0], scale: [0.28, 0.5, 0.28], name: 'Pierna' }));
    parts.push(p('cylinder', '#7c6bff', { pos: [0.55, 0.5, 0], scale: [0.28, 0.5, 0.28], name: 'Pierna' }));
    parts.push(p('box', '#4a3f7a', { pos: [-0.55, 0.17, 0.18], scale: [0.42, 0.18, 0.6], name: 'Pie' }));
    parts.push(p('box', '#4a3f7a', { pos: [0.55, 0.17, 0.18], scale: [0.42, 0.18, 0.6], name: 'Pie' }));
    parts.push(p('box', '#17c3a2', { pos: [0, 1.55, 0], scale: [0.95, 0.9, 0.65], name: 'Cuerpo' }));
    parts.push(p('box', '#0e8f7d', { pos: [0, 1.62, 0.63], scale: [0.45, 0.35, 0.05], name: 'Panel' }));
    parts.push(p('sphere', '#ffc94d', { pos: [-0.15, 1.62, 0.68], scale: [0.06, 0.06, 0.06], name: 'Luz' }));
    parts.push(p('sphere', '#ff5e6c', { pos: [0.1, 1.62, 0.68], scale: [0.06, 0.06, 0.06], name: 'Luz' }));
    parts.push(p('box', '#d9f7f0', { pos: [0, 3.0, 0], scale: [0.8, 0.62, 0.6], name: 'Cabeza' }));
    parts.push(p('sphere', '#ffffff', { pos: [-0.3, 3.08, 0.62], scale: [0.18, 0.18, 0.1], name: 'Ojo' }));
    parts.push(p('sphere', '#ffffff', { pos: [0.3, 3.08, 0.62], scale: [0.18, 0.18, 0.1], name: 'Ojo' }));
    parts.push(p('sphere', '#2b2340', { pos: [-0.3, 3.08, 0.69], scale: [0.08, 0.08, 0.05], name: 'Pupila' }));
    parts.push(p('sphere', '#2b2340', { pos: [0.3, 3.08, 0.69], scale: [0.08, 0.08, 0.05], name: 'Pupila' }));
    parts.push(p('cylinder', '#ff8a5c', { pos: [0, 3.9, 0], scale: [0.04, 0.25, 0.04], name: 'Antena' }));
    parts.push(p('sphere', '#ff8a5c', { pos: [0, 4.17, 0], scale: [0.13, 0.13, 0.13], name: 'Antena' }));
    parts.push(p('cylinder', '#7c6bff', { pos: [-1.12, 2.15, 0], scale: [0.18, 0.55, 0.18], rot: [0, 0, 0.16], name: 'Brazo' }));
    parts.push(p('cylinder', '#7c6bff', { pos: [1.12, 2.15, 0], scale: [0.18, 0.55, 0.18], rot: [0, 0, -0.16], name: 'Brazo' }));
    parts.push(p('sphere', '#ff8a5c', { pos: [-1.2, 1.55, 0], scale: [0.22, 0.22, 0.22], name: 'Mano' }));
    parts.push(p('sphere', '#ff8a5c', { pos: [1.2, 1.55, 0], scale: [0.22, 0.22, 0.22], name: 'Mano' }));
    return group('robot', 'Robot', '🤖', parts);
  },

  coche: () => {
    const parts = [];
    parts.push(p('box', '#ff5e6c', { pos: [0, 0.95, 0], scale: [1.55, 0.55, 0.85], name: 'Carrocería' }));
    parts.push(p('box', '#bfe9ff', { pos: [-0.18, 1.67, 0], scale: [0.85, 0.5, 0.72], name: 'Cabina' }));
    parts.push(p('box', '#8fd4ff', { pos: [0.23, 1.67, 0], scale: [0.05, 0.44, 0.7], name: 'Ventana' }));
    const wheelPositions = [[-1.0, -0.82], [-1.0, 0.82], [1.0, -0.82], [1.0, 0.82]];
    wheelPositions.forEach(([x, z]) => {
      parts.push(p('cylinder', '#2b2340', { pos: [x, 0.5, z], scale: [0.55, 0.32, 0.55], rot: [0, 0, Math.PI / 2], name: 'Rueda' }));
      parts.push(p('cylinder', '#b9b2c7', { pos: [x + 0.34, 0.5, z], scale: [0.28, 0.03, 0.28], rot: [0, 0, Math.PI / 2], name: 'Llanta' }));
    });
    parts.push(p('sphere', '#ffe66d', { pos: [1.45, 0.95, 0.45], scale: [0.12, 0.12, 0.12], name: 'Faro' }));
    parts.push(p('sphere', '#ffe66d', { pos: [1.45, 0.95, -0.45], scale: [0.12, 0.12, 0.12], name: 'Faro' }));
    parts.push(p('box', '#d9d2c5', { pos: [-1.42, 0.7, 0], scale: [0.1, 0.3, 0.6], name: 'Parachoques' }));
    return group('coche', 'Coche', '🚗', parts);
  },

  cohete: () => {
    const parts = [];
    parts.push(p('cylinder', '#f6f1e7', { pos: [0, 1.75, 0], scale: [0.8, 1.25, 0.8], name: 'Fuselaje' }));
    parts.push(p('cone', '#ff5e6c', { pos: [0, 3.77, 0], scale: [0.8, 0.7, 0.8], name: 'Punta' }));
    parts.push(p('torus', '#4cc9f0', { pos: [0, 2.3, 0.7], scale: [0.36, 0.36, 0.36], name: 'Ventana' }));
    parts.push(p('sphere', '#bfe9ff', { pos: [0, 2.3, 0.72], scale: [0.24, 0.24, 0.1], name: 'Cristal' }));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      parts.push(p('wedge', '#ff5e6c', {
        pos: [Math.cos(a) * 0.75, 0.85, Math.sin(a) * 0.75],
        rot: [0, -a, 0],
        scale: [0.45, 0.55, 0.45],
        name: 'Aleta',
      }));
    }
    parts.push(p('cone', '#ffc94d', { pos: [0, 0.18, 0], scale: [0.35, 0.42, 0.35], rot: [0, 0, Math.PI], name: 'Llama' }));
    parts.push(p('cone', '#ff8a5c', { pos: [0, 0.05, 0], scale: [0.2, 0.25, 0.2], rot: [0, 0, Math.PI], name: 'Llama' }));
    return group('cohete', 'Cohete', '🚀', parts);
  },

  gato: () => {
    const parts = [];
    parts.push(p('capsule', '#f6b26b', { pos: [0, 1.2, 0], scale: [1.0, 1.0, 1.0], name: 'Cuerpo' }));
    parts.push(p('sphere', '#ffe3b3', { pos: [0, 1.25, 0.52], scale: [0.55, 0.7, 0.35], name: 'Pecho' }));
    parts.push(p('sphere', '#f6b26b', { pos: [0, 2.78, 0.04], scale: [0.72, 0.65, 0.7], name: 'Cabeza' }));
    parts.push(p('cone', '#f6b26b', { pos: [-0.5, 3.5, 0.05], scale: [0.3, 0.32, 0.3], rot: [0, 0, 0.16], name: 'Oreja' }));
    parts.push(p('cone', '#f6b26b', { pos: [0.5, 3.5, 0.05], scale: [0.3, 0.32, 0.3], rot: [0, 0, -0.16], name: 'Oreja' }));
    parts.push(p('cone', '#ffb3c7', { pos: [-0.5, 3.45, 0.16], scale: [0.16, 0.18, 0.16], rot: [0, 0, 0.16], name: 'Oreja' }));
    parts.push(p('cone', '#ffb3c7', { pos: [0.5, 3.45, 0.16], scale: [0.16, 0.18, 0.16], rot: [0, 0, -0.16], name: 'Oreja' }));
    parts.push(p('sphere', '#ffffff', { pos: [-0.3, 2.9, 0.62], scale: [0.17, 0.18, 0.1], name: 'Ojo' }));
    parts.push(p('sphere', '#ffffff', { pos: [0.3, 2.9, 0.62], scale: [0.17, 0.18, 0.1], name: 'Ojo' }));
    parts.push(p('sphere', '#2b2340', { pos: [-0.3, 2.9, 0.69], scale: [0.08, 0.1, 0.05], name: 'Pupila' }));
    parts.push(p('sphere', '#2b2340', { pos: [0.3, 2.9, 0.69], scale: [0.08, 0.1, 0.05], name: 'Pupila' }));
    parts.push(p('sphere', '#ff8fab', { pos: [0, 2.68, 0.79], scale: [0.09, 0.07, 0.06], name: 'Nariz' }));
    [-1, 1].forEach((side) => {
      parts.push(p('cylinder', '#7a5c45', { pos: [side * 0.82, 2.64, 0.7], scale: [0.014, 0.36, 0.014], rot: [0, 0, Math.PI / 2], name: 'Bigote' }));
      parts.push(p('cylinder', '#7a5c45', { pos: [side * 0.82, 2.54, 0.7], scale: [0.014, 0.32, 0.014], rot: [0, 0, Math.PI / 2 - side * 0.12], name: 'Bigote' }));
    });
    parts.push(p('capsule', '#f6b26b', { pos: [0.95, 1.15, -0.35], scale: [0.16, 0.55, 0.16], rot: [0, 0, -0.85], name: 'Cola' }));
    return group('gato', 'Gato', '🐱', parts);
  },

  castillo: () => {
    const parts = [];
    parts.push(p('box', '#e8dcc6', { pos: [0, 0.95, 0], scale: [2.0, 1.0, 1.3], name: 'Muralla' }));
    for (let i = -2; i <= 2; i++) {
      parts.push(p('box', '#d9cbb3', { pos: [i * 0.75, 2.0, 1.2], scale: [0.25, 0.3, 0.22], name: 'Almena' }));
    }
    const towers = [[-1.6, 1.0], [-1.6, -1.0], [1.6, 1.0], [1.6, -1.0]];
    towers.forEach(([x, z], i) => {
      parts.push(p('cylinder', '#e8dcc6', { pos: [x, 1.5, z], scale: [0.55, 1.5, 0.55], name: 'Torre' }));
      parts.push(p('cone', i % 2 ? '#6c5ce7' : '#ff6b9d', { pos: [x, 3.65, z], scale: [0.65, 0.62, 0.65], name: 'Tejado' }));
      parts.push(p('box', '#5c566e', { pos: [x, 2.2, z + 0.52], scale: [0.16, 0.3, 0.05], name: 'Ventana' }));
    });
    parts.push(p('cylinder', '#e8dcc6', { pos: [0, 2.0, -0.4], scale: [0.62, 2.0, 0.62], name: 'Torre central' }));
    parts.push(p('cone', '#ffc94d', { pos: [0, 4.55, -0.4], scale: [0.72, 0.75, 0.72], name: 'Tejado' }));
    parts.push(p('box', '#8b5e3c', { pos: [0, 0.95, 1.28], scale: [0.55, 0.9, 0.09], name: 'Puerta' }));
    parts.push(p('cone', '#8b5e3c', { pos: [0, 1.9, 1.28], scale: [0.4, 0.35, 0.09], name: 'Arco' }));
    parts.push(p('cylinder', '#5c566e', { pos: [0, 5.5, -0.4], scale: [0.035, 0.5, 0.035], name: 'Mástil' }));
    parts.push(p('box', '#17c3a2', { pos: [0.32, 5.75, -0.4], scale: [0.55, 0.3, 0.02], name: 'Bandera' }));
    return group('castillo', 'Castillo', '🏰', parts);
  },

  nieve: () => {
    const parts = [];
    parts.push(p('sphere', '#f7fbff', { pos: [0, 1.32, 0], scale: [1.15, 1.05, 1.15], name: 'Bola' }));
    parts.push(p('sphere', '#f7fbff', { pos: [0, 2.95, 0], scale: [0.85, 0.82, 0.85], name: 'Bola' }));
    parts.push(p('sphere', '#f7fbff', { pos: [0, 4.1, 0], scale: [0.62, 0.6, 0.62], name: 'Cabeza' }));
    parts.push(p('sphere', '#2b2340', { pos: [-0.2, 4.2, 0.53], scale: [0.075, 0.085, 0.05], name: 'Ojo' }));
    parts.push(p('sphere', '#2b2340', { pos: [0.2, 4.2, 0.53], scale: [0.075, 0.085, 0.05], name: 'Ojo' }));
    parts.push(p('cone', '#ff8a5c', { pos: [0, 4.05, 0.72], scale: [0.12, 0.32, 0.12], rot: [Math.PI / 2, 0, 0], name: 'Nariz' }));
    parts.push(p('sphere', '#2b2340', { pos: [0, 2.95, 0.82], scale: [0.075, 0.075, 0.04], name: 'Botón' }));
    parts.push(p('sphere', '#2b2340', { pos: [0, 2.7, 0.88], scale: [0.075, 0.075, 0.04], name: 'Botón' }));
    parts.push(p('sphere', '#2b2340', { pos: [0, 3.2, 0.72], scale: [0.075, 0.075, 0.04], name: 'Botón' }));
    parts.push(p('torus', '#ff5e6c', { pos: [0, 3.52, 0], scale: [0.55, 0.45, 0.55], name: 'Bufanda' }));
    parts.push(p('cylinder', '#5c566e', { pos: [0, 4.65, 0], scale: [0.45, 0.1, 0.45], name: 'Sombrero' }));
    parts.push(p('cylinder', '#2b2340', { pos: [0, 4.88, 0], scale: [0.31, 0.3, 0.31], name: 'Sombrero' }));
    parts.push(p('capsule', '#8b5e3c', { pos: [-1.05, 3.05, 0], scale: [0.08, 0.55, 0.08], rot: [0, 0, 1.1], name: 'Brazo' }));
    parts.push(p('capsule', '#8b5e3c', { pos: [1.05, 3.05, 0], scale: [0.08, 0.55, 0.08], rot: [0, 0, -1.1], name: 'Brazo' }));
    return group('nieve', 'Muñeco de nieve', '⛄', parts);
  },

  muneca: () => {
    const parts = [];
    const skin = '#f3c9a6';
    const hair = '#6b4226';
    const dress = '#ff6b9d';
    const shoes = '#e2506a';
    const accent = '#ffc94d';

    [-0.26, 0.26].forEach((x) => {
      parts.push(p('cylinder', skin, { pos: [x, 0.8, 0], scale: [0.13, 0.42, 0.13], name: 'Pierna' }));
      parts.push(p('box', shoes, { pos: [x, 0.12, 0.08], scale: [0.2, 0.12, 0.3], name: 'Zapato' }));
    });
    parts.push(p('cone', dress, { pos: [0, 1.55, 0], scale: [0.8, 0.55, 0.8], name: 'Falda' }));
    parts.push(p('box', dress, { pos: [0, 2.2, 0], scale: [0.36, 0.3, 0.26], name: 'Vestido' }));
    parts.push(p('box', accent, { pos: [0, 1.98, 0], scale: [0.37, 0.04, 0.27], name: 'Cinturón' }));
    parts.push(p('cylinder', skin, { pos: [0, 2.5, 0], scale: [0.08, 0.1, 0.08], name: 'Cuello' }));

    [-0.48, 0.48].forEach((x, index) => {
      const side = index === 0 ? -1 : 1;
      parts.push(p('sphere', dress, { pos: [x, 2.36, 0], scale: [0.15, 0.12, 0.15], name: 'Manga' }));
      parts.push(p('capsule', skin, { pos: [x, 2.1, 0], scale: [0.1, 0.3, 0.1], rot: [0, 0, side * 0.2], name: 'Brazo' }));
      parts.push(p('sphere', skin, { pos: [x + side * 0.11, 1.67, 0.02], scale: [0.09, 0.09, 0.09], name: 'Mano' }));
    });

    parts.push(p('sphere', skin, { pos: [0, 2.85, 0], scale: [0.33, 0.36, 0.33], name: 'Cabeza' }));
    parts.push(p('sphere', hair, { pos: [0, 2.88, -0.08], scale: [0.37, 0.4, 0.36], name: 'Pelo' }));
    parts.push(p('capsule', hair, { pos: [0, 2.2, -0.3], scale: [0.16, 0.4, 0.14], name: 'Coleta' }));
    parts.push(p('sphere', dress, { pos: [0, 2.68, -0.3], scale: [0.08, 0.06, 0.08], name: 'Goma del pelo' }));
    [-0.31, 0.31].forEach((x) => {
      parts.push(p('cylinder', hair, { pos: [x, 2.65, 0.04], scale: [0.06, 0.22, 0.06], name: 'Mechón' }));
    });
    parts.push(p('sphere', hair, { pos: [0, 3.12, 0.18], scale: [0.3, 0.14, 0.2], name: 'Flequillo' }));

    [-0.13, 0.13].forEach((x) => {
      parts.push(p('sphere', '#2b2340', { pos: [x, 2.89, 0.37], scale: [0.045, 0.06, 0.04], name: 'Ojo' }));
      parts.push(p('box', hair, { pos: [x, 2.98, 0.37], scale: [0.09, 0.015, 0.02], name: 'Ceja' }));
    });
    parts.push(p('sphere', skin, { pos: [0, 2.82, 0.4], scale: [0.035, 0.05, 0.04], name: 'Nariz' }));
    parts.push(p('sphere', '#e2506a', { pos: [0, 2.72, 0.39], scale: [0.09, 0.025, 0.03], name: 'Boca' }));

    [-0.3, 0.3].forEach((x) => {
      parts.push(p('sphere', accent, { pos: [x, 3.18, 0.02], scale: [0.06, 0.05, 0.04], name: 'Lazo' }));
    });
    parts.push(p('sphere', '#ff8a5c', { pos: [0, 3.18, 0.03], scale: [0.045, 0.045, 0.04], name: 'Lazo' }));

    return group('muneca', 'Muñeca', '👩', parts);
  },

  muneco: () => {
    const parts = [];
    const skin = '#e8b98f';
    const hair = '#3a2b22';
    const shirt = '#3a9dff';
    const pants = '#2b3a55';
    const shoes = '#2b2340';
    const cap = '#ff8a5c';

    [-0.28, 0.28].forEach((x) => {
      parts.push(p('cylinder', pants, { pos: [x, 0.85, 0], scale: [0.14, 0.45, 0.14], name: 'Pierna' }));
      parts.push(p('box', shoes, { pos: [x, 0.12, 0.09], scale: [0.22, 0.12, 0.32], name: 'Zapato' }));
    });
    parts.push(p('box', shirt, { pos: [0, 1.85, 0], scale: [0.46, 0.42, 0.28], name: 'Camiseta' }));
    parts.push(p('box', pants, { pos: [0, 1.43, 0], scale: [0.47, 0.05, 0.3], name: 'Cinturón' }));
    parts.push(p('box', '#ffffff', { pos: [0, 1.92, 0.285], scale: [0.05, 0.08, 0.02], name: 'Botón' }));
    parts.push(p('box', '#2b6ea8', { pos: [0.22, 1.75, 0.285], scale: [0.12, 0.08, 0.02], name: 'Bolsillo' }));

    [-0.62, 0.62].forEach((x, index) => {
      const side = index === 0 ? -1 : 1;
      parts.push(p('capsule', shirt, { pos: [x, 1.85, 0], scale: [0.11, 0.32, 0.11], rot: [0, 0, side * 0.12], name: 'Brazo' }));
      parts.push(p('sphere', skin, { pos: [x + side * 0.06, 1.41, 0.02], scale: [0.1, 0.1, 0.1], name: 'Mano' }));
    });

    parts.push(p('cylinder', skin, { pos: [0, 2.35, 0], scale: [0.09, 0.1, 0.09], name: 'Cuello' }));
    parts.push(p('sphere', skin, { pos: [0, 2.75, 0], scale: [0.35, 0.38, 0.35], name: 'Cabeza' }));
    parts.push(p('sphere', hair, { pos: [0, 2.86, -0.05], scale: [0.36, 0.24, 0.36], name: 'Pelo' }));
    parts.push(p('sphere', cap, { pos: [0, 3.06, -0.02], scale: [0.36, 0.18, 0.36], name: 'Gorra' }));
    parts.push(p('box', '#e26b3d', { pos: [0, 3.0, 0.27], scale: [0.34, 0.04, 0.24], name: 'Visera' }));

    [-0.14, 0.14].forEach((x) => {
      parts.push(p('sphere', '#2b2340', { pos: [x, 2.8, 0.38], scale: [0.045, 0.06, 0.04], name: 'Ojo' }));
      parts.push(p('box', hair, { pos: [x, 2.9, 0.38], scale: [0.09, 0.015, 0.02], name: 'Ceja' }));
    });
    parts.push(p('sphere', skin, { pos: [0, 2.72, 0.41], scale: [0.035, 0.05, 0.04], name: 'Nariz' }));
    parts.push(p('sphere', '#9c4a3c', { pos: [0, 2.62, 0.4], scale: [0.09, 0.025, 0.03], name: 'Boca' }));

    return group('muneco', 'Muñeco', '👨', parts);
  },

  avion: () => {
    const parts = [];
    parts.push(p('capsule', '#f7f9ff', { pos: [0, 1.8, 0], scale: [0.55, 1.6, 0.55], rot: [0, 0, Math.PI / 2], name: 'Fuselaje' }));
    parts.push(p('cone', '#ff5e6c', { pos: [2.08, 1.8, 0], scale: [0.36, 0.35, 0.36], rot: [0, 0, -Math.PI / 2], name: 'Morro' }));
    parts.push(p('box', '#ff5e6c', { pos: [-0.1, 1.8, 0], scale: [0.65, 0.06, 1.9], name: 'Ala' }));
    parts.push(p('box', '#ff5e6c', { pos: [-1.6, 2.5, 0], scale: [0.5, 0.55, 0.06], name: 'Cola' }));
    parts.push(p('box', '#ff5e6c', { pos: [-1.6, 1.9, 0], scale: [0.45, 0.06, 1.0], name: 'Cola' }));
    parts.push(p('sphere', '#7cd4ff', { pos: [0.55, 2.2, 0], scale: [0.32, 0.28, 0.2], name: 'Cabina' }));
    parts.push(p('box', '#5c566e', { pos: [2.32, 1.8, 0], scale: [0.04, 0.55, 0.05], name: 'Hélice' }));
    parts.push(p('box', '#5c566e', { pos: [2.32, 1.8, 0], scale: [0.04, 0.05, 0.55], name: 'Hélice' }));
    parts.push(p('sphere', '#ffc94d', { pos: [2.4, 1.8, 0], scale: [0.08, 0.08, 0.08], name: 'Eje' }));
    parts.push(p('cylinder', '#b9b2c7', { pos: [0, 1.42, 0.55], scale: [0.16, 0.15, 0.16], rot: [Math.PI / 2, 0, 0], name: 'Rueda' }));
    parts.push(p('cylinder', '#b9b2c7', { pos: [0, 1.42, -0.55], scale: [0.16, 0.15, 0.16], rot: [Math.PI / 2, 0, 0], name: 'Rueda' }));
    return group('avion', 'Avión', '✈️', parts);
  },

  flor: () => {
    const parts = [];
    parts.push(p('cylinder', '#ff8a5c', { pos: [0, 0.45, 0], scale: [0.65, 0.45, 0.65], name: 'Maceta' }));
    parts.push(p('torus', '#ff5e6c', { pos: [0, 0.9, 0], scale: [0.38, 0.38, 0.38], name: 'Borde' }));
    parts.push(p('cylinder', '#4caf6d', { pos: [0, 2.15, 0], scale: [0.08, 1.3, 0.08], name: 'Tallo' }));
    parts.push(p('sphere', '#63c96b', { pos: [-0.38, 1.75, 0], scale: [0.4, 0.16, 0.22], rot: [0, 0, 0.45], name: 'Hoja' }));
    parts.push(p('sphere', '#63c96b', { pos: [0.38, 1.55, 0], scale: [0.4, 0.16, 0.22], rot: [0, 0, -0.45], name: 'Hoja' }));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      parts.push(p('sphere', '#ff6b9d', {
        pos: [Math.cos(a) * 0.58, 3.65 + Math.sin(a) * 0.5, 0.2],
        scale: [0.42, 0.34, 0.34],
        name: 'Pétalo',
      }));
    }
    parts.push(p('sphere', '#ffc94d', { pos: [0, 3.65, 0.38], scale: [0.36, 0.36, 0.3], name: 'Centro' }));
    return group('flor', 'Flor', '🌸', parts);
  },

  dino: () => {
    const parts = [];
    parts.push(p('sphere', '#7bd88f', { pos: [0, 2.2, 0], scale: [1.3, 1.0, 1.0], name: 'Cuerpo' }));
    parts.push(p('sphere', '#c8f5c8', { pos: [0, 1.95, 0.62], scale: [0.85, 0.68, 0.45], name: 'Barriga' }));
    parts.push(p('cylinder', '#63c96b', { pos: [-0.6, 0.6, 0.1], scale: [0.26, 0.6, 0.26], name: 'Pata' }));
    parts.push(p('cylinder', '#63c96b', { pos: [0.6, 0.6, 0.1], scale: [0.26, 0.6, 0.26], name: 'Pata' }));
    parts.push(p('cone', '#4caf6d', { pos: [-1.72, 2.2, 0], scale: [0.38, 0.9, 0.38], rot: [0, 0, Math.PI / 2], name: 'Cola' }));
    parts.push(p('cylinder', '#63c96b', { pos: [1.05, 3.0, 0], scale: [0.3, 0.75, 0.3], rot: [0, 0, -0.45], name: 'Cuello' }));
    parts.push(p('sphere', '#7bd88f', { pos: [1.5, 3.85, 0], scale: [0.58, 0.52, 0.52], name: 'Cabeza' }));
    parts.push(p('sphere', '#ffffff', { pos: [1.68, 3.96, 0.42], scale: [0.12, 0.12, 0.08], name: 'Ojo' }));
    parts.push(p('sphere', '#2b2340', { pos: [1.7, 3.96, 0.49], scale: [0.055, 0.06, 0.04], name: 'Pupila' }));
    parts.push(p('sphere', '#2b2340', { pos: [1.95, 3.68, 0.35], scale: [0.04, 0.04, 0.03], name: 'Fosa nasal' }));
    parts.push(p('cylinder', '#63c96b', { pos: [1.45, 2.2, 0.35], scale: [0.13, 0.35, 0.13], rot: [0.5, 0, -0.3], name: 'Brazo' }));
    for (let i = 0; i < 5; i++) {
      const x = -1.0 + i * 0.48;
      const y = 3.05 - Math.abs(i - 1.8) * 0.09;
      parts.push(p('cone', '#ff8a5c', { pos: [x, y, 0], scale: [0.16, 0.24, 0.14], name: 'Púa' }));
    }
    return group('dino', 'Dinosaurio', '🦕', parts);
  },

  unicornio: () => {
    const parts = [];
    parts.push(p('capsule', '#fbf7ff', { pos: [0, 2.1, 0], scale: [1.0, 1.0, 1.0], rot: [0, 0, Math.PI / 2], name: 'Cuerpo' }));
    const legPositions = [[-0.65, -0.35], [-0.65, 0.35], [0.65, -0.35], [0.65, 0.35]];
    legPositions.forEach(([x, z], i) => {
      parts.push(p('cylinder', '#fbf7ff', { pos: [x, 0.72, z], scale: [0.2, 0.72, 0.2], name: 'Pata' }));
      parts.push(p('cylinder', '#ffb3c7', { pos: [x, 0.08, z], scale: [0.22, 0.08, 0.22], name: 'Casco' }));
      if (i === 0) parts.push(p('capsule', '#fbf7ff', { pos: [0.95, 3.0, 0], scale: [0.5, 0.6, 0.5], rot: [0, 0, -0.55], name: 'Cuello' }));
    });
    parts.push(p('sphere', '#fbf7ff', { pos: [1.52, 3.68, 0], scale: [0.48, 0.5, 0.44], name: 'Cabeza' }));
    parts.push(p('sphere', '#fbf7ff', { pos: [1.85, 3.5, 0], scale: [0.3, 0.28, 0.27], name: 'Hocico' }));
    parts.push(p('sphere', '#ffb3c7', { pos: [2.03, 3.45, 0], scale: [0.1, 0.08, 0.08], name: 'Nariz' }));
    parts.push(p('cone', '#fbf7ff', { pos: [1.5, 4.15, 0.14], scale: [0.14, 0.25, 0.14], rot: [0.1, 0, 0.12], name: 'Oreja' }));
    parts.push(p('cone', '#fbf7ff', { pos: [1.5, 4.15, -0.14], scale: [0.14, 0.25, 0.14], rot: [-0.1, 0, 0.12], name: 'Oreja' }));
    parts.push(p('cone', '#ffc94d', { pos: [1.62, 4.28, 0], scale: [0.15, 0.5, 0.15], rot: [0, 0, -0.2], name: 'Cuerno' }));
    parts.push(p('sphere', '#2b2340', { pos: [1.76, 3.8, 0.3], scale: [0.07, 0.09, 0.05], name: 'Ojo' }));
    parts.push(p('sphere', '#2b2340', { pos: [1.76, 3.8, -0.3], scale: [0.07, 0.09, 0.05], name: 'Ojo' }));
    const maneColors = ['#ff6b9d', '#c77dff', '#4cc9f0', '#ffc94d', '#ff6b9d'];
    maneColors.forEach((c, i) => {
      parts.push(p('sphere', c, {
        pos: [0.95 + i * 0.14, 3.45 + i * 0.13, 0.2 - (i % 2) * 0.02],
        scale: [0.22, 0.24, 0.2],
        name: 'Melena',
      }));
    });
    ['#ff6b9d', '#c77dff', '#4cc9f0'].forEach((c, i) => {
      parts.push(p('sphere', c, {
        pos: [-1.25 - i * 0.13, 2.5 - i * 0.22, 0],
        scale: [0.28 - i * 0.04, 0.3 - i * 0.04, 0.26 - i * 0.04],
        name: 'Cola',
      }));
    });
    return group('unicornio', 'Unicornio', '🦄', parts);
  },
};

export const TEMPLATES = [
  { id: 'casa', name: 'Casa', emoji: '🏠' },
  { id: 'robot', name: 'Robot', emoji: '🤖' },
  { id: 'coche', name: 'Coche', emoji: '🚗' },
  { id: 'cohete', name: 'Cohete', emoji: '🚀' },
  { id: 'gato', name: 'Gato', emoji: '🐱' },
  { id: 'unicornio', name: 'Unicornio', emoji: '🦄' },
  { id: 'arbol', name: 'Árbol', emoji: '🌳' },
  { id: 'castillo', name: 'Castillo', emoji: '🏰' },
  { id: 'dino', name: 'Dinosaurio', emoji: '🦕' },
  { id: 'avion', name: 'Avión', emoji: '✈️' },
  { id: 'nieve', name: 'Muñeco de nieve', emoji: '⛄' },
  { id: 'muneca', name: 'Muñeca', emoji: '👩' },
  { id: 'muneco', name: 'Muñeco', emoji: '👨' },
  { id: 'flor', name: 'Flor', emoji: '🌸' },
];

export function buildTemplate(id) {
  const builder = TEMPLATE_BUILDERS[id];
  if (!builder) return null;
  const group = builder();
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

export const STICKERS = [
  '😀', '😂', '😍', '😎', '🥳', '🤩', '😜', '🤯', '🥰', '😇',
  '🤖', '👽', '👾', '🎃', '🦄', '🐉', '🦖', '🐙', '🦋', '🐝',
  '🐱', '🐶', '🦊', '🐼', '🐸', '🐵', '🦁', '🐯', '🐨', '🐰',
  '⭐', '✨', '❤️', '🔥', '🌈', '☀️', '🌙', '☁️', '⚡', '❄️',
  '🚀', '🎈', '🎁', '👑', '🍕', '🍩', '🍦', '🍎', '🌸', '🌻',
];