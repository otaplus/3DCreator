// Manipulador de selección al estilo Paint 3D: recuadro con anillo para girar,
// esquinas para escalar y una flecha para subir o bajar el objeto. También
// permite arrastrar el propio objeto para moverlo por la escena.
import * as THREE from 'three';

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;

function visibleMaterial(color) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.96,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
}

function pickMaterial() {
  return new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  });
}

export class SelectionManipulator {
  constructor({ scene, camera, canvas, getSelection, getBounds, onStart, onChange, onEnd }) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.getSelection = getSelection;
    this.getBounds = getBounds;
    this.onStart = onStart || (() => {});
    this.onChange = onChange || (() => {});
    this.onEnd = onEnd || (() => {});

    this.enabled = true;
    this.dragging = false;
    this.handle = null;
    this.start = null;
    this.snap = 0;
    this.worldPerPx = 0.01;
    this.center = new THREE.Vector3();
    this.size = new THREE.Vector3();
    this.bounds = new THREE.Box3();
    this.raycaster = new THREE.Raycaster();
    this.plane = new THREE.Plane();
    this.tmpPoint = new THREE.Vector3();

    this.overlay = new THREE.Group();
    this.overlay.name = 'Manipulador de selección';
    this.overlay.renderOrder = 1000;
    this.overlay.visible = false;
    scene.add(this.overlay);

    this.pickables = [];

    // Anillo para girar.
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.022, 8, 72), visibleMaterial(0x6c5ce7));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.renderOrder = 1001;
    this.ring.userData.handle = 'rotate';
    this.ringPick = new THREE.Mesh(new THREE.TorusGeometry(1, 0.09, 6, 48), pickMaterial());
    this.ringPick.rotation.x = -Math.PI / 2;
    this.ringPick.renderOrder = 1001;
    this.ringPick.userData.handle = 'rotate';
    this.pickables.push(this.ringPick);
    this.overlay.add(this.ring, this.ringPick);

    // Esquinas para escalar.
    const cornerGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.corners = [];
    this.cornerPicks = [];
    for (let i = 0; i < 4; i++) {
      const corner = new THREE.Mesh(cornerGeometry, visibleMaterial(0xffffff));
      corner.renderOrder = 1001;
      corner.userData.handle = 'scale';
      corner.userData.corner = i;
      const pick = new THREE.Mesh(cornerGeometry, pickMaterial());
      pick.renderOrder = 1001;
      pick.userData.handle = 'scale';
      pick.userData.corner = i;
      this.corners.push(corner);
      this.cornerPicks.push(pick);
      this.pickables.push(pick);
      this.overlay.add(corner, pick);
    }

    // Flecha para subir y bajar.
    this.lift = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 18), visibleMaterial(0x17c3a2));
    this.lift.renderOrder = 1001;
    this.lift.userData.handle = 'lift';
    this.liftPick = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 12), pickMaterial());
    this.liftPick.renderOrder = 1001;
    this.liftPick.userData.handle = 'lift';
    const stemGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.stem = new THREE.Line(stemGeometry, new THREE.LineBasicMaterial({
      color: 0x17c3a2, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, toneMapped: false,
    }));
    this.stem.renderOrder = 1001;
    this.overlay.add(this.lift, this.liftPick, this.stem);
    // La flecha verde ya no se usa: el botón «Mover» hace el movimiento vertical.
    this.lift.visible = false;
    this.liftPick.visible = false;
    this.stem.visible = false;

    this.cornerOffsets = [
      [-1, -1], [1, -1], [1, 1], [-1, 1],
    ];
  }

  setEnabled(value) {
    this.enabled = !!value;
    if (!this.enabled) {
      this.overlay.visible = false;
      this.dragging = false;
      this.start = null;
    }
  }

  setSnap(step) {
    this.snap = Number(step) || 0;
  }

  get isDragging() {
    return this.dragging;
  }

  update() {
    if (!this.enabled) {
      this.overlay.visible = false;
      return;
    }
    const bounds = this.getBounds();
    if (!bounds || bounds.isEmpty()) {
      this.overlay.visible = false;
      return;
    }
    this.bounds.copy(bounds);
    bounds.getCenter(this.center);
    bounds.getSize(this.size);

    const distance = this.camera.position.distanceTo(this.center);
    const height = Math.max(1, this.canvas.clientHeight);
    this.worldPerPx = (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * distance) / height;
    const s = clamp(this.worldPerPx * 14, 0.018, 0.55);

    // Anillo en la base.
    const radius = Math.max(this.size.x, this.size.z) * 0.55 + s * 1.7;
    const ringY = bounds.min.y + 0.006;
    this.ring.position.set(this.center.x, ringY, this.center.z);
    this.ring.scale.set(radius, radius, 1);
    this.ringPick.position.copy(this.ring.position);
    this.ringPick.scale.copy(this.ring.scale);

    // Esquinas en la parte superior del recuadro.
    const halfX = Math.max(0.05, this.size.x / 2);
    const halfZ = Math.max(0.05, this.size.z / 2);
    this.cornerOffsets.forEach(([sx, sz], index) => {
      const corner = this.corners[index];
      const pick = this.cornerPicks[index];
      const x = this.center.x + sx * halfX;
      const z = this.center.z + sz * halfZ;
      corner.position.set(x, bounds.max.y, z);
      corner.scale.setScalar(s * 1.05);
      pick.position.copy(corner.position);
      pick.scale.setScalar(s * 2.5);
    });

    // Flecha de altura, por encima del recuadro.
    const gap = s * 3.4 + 0.08;
    const base = bounds.max.y;
    const liftY = base + gap;
    this.lift.position.set(this.center.x, liftY, this.center.z);
    this.lift.scale.set(s, s * 1.5, s);
    this.liftPick.position.copy(this.lift.position);
    this.liftPick.scale.set(s * 2.4, s * 2.6, s * 2.4);
    const positions = this.stem.geometry.attributes.position;
    positions.setXYZ(0, this.center.x, base, this.center.z);
    positions.setXYZ(1, this.center.x, liftY - s * 0.8, this.center.z);
    positions.needsUpdate = true;
    this.stem.geometry.computeBoundingSphere();

    this.overlay.visible = true;
  }

  hitTest(ndc) {
    if (!this.enabled || !this.overlay.visible) return null;
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, false);
    return hits.length ? hits[0].object.userData.handle : null;
  }

  pointOnPlane(ndc, y) {
    this.raycaster.setFromCamera(ndc, this.camera);
    this.plane.set(Y_AXIS, -y);
    return this.raycaster.ray.intersectPlane(this.plane, this.tmpPoint);
  }

  begin(handle, ndc, event) {
    const list = this.getSelection ? this.getSelection().slice() : [];
    if (!list.length) return false;
    this.bounds.copy(this.getBounds());
    if (this.bounds.isEmpty()) return false;
    const center = new THREE.Vector3();
    this.bounds.getCenter(center);
    const items = list.map((obj) => {
      obj.updateWorldMatrix(true, false);
      const parent = obj.parent || this.scene;
      parent.updateWorldMatrix(true, false);
      return {
        obj,
        pos: obj.position.clone(),
        quat: obj.quaternion.clone(),
        scale: obj.scale.clone(),
        worldPos: obj.getWorldPosition(new THREE.Vector3()),
        worldQuat: obj.getWorldQuaternion(new THREE.Quaternion()),
        parentInv: parent.matrixWorld.clone().invert(),
        parentQuatInv: parent.getWorldQuaternion(new THREE.Quaternion()).invert(),
      };
    });
    this.start = {
      handle,
      items,
      center,
      startClientY: event ? event.clientY : 0,
      worldPerPx: this.worldPerPx,
      floorY: this.bounds.min.y,
      changed: false,
    };

    if (handle === 'rotate') {
      this.start.ringY = this.ring.position.y;
      const point = this.pointOnPlane(ndc, this.start.ringY);
      this.start.angle = point ? Math.atan2(point.z - center.z, point.x - center.x) : 0;
    } else if (handle === 'scale') {
      const point = this.pointOnPlane(ndc, center.y);
      this.start.distance = point ? Math.max(0.08, Math.hypot(point.x - center.x, point.z - center.z)) : 1;
    }

    this.handle = handle;
    this.dragging = true;
    this.onStart({ handle });
    return true;
  }

  beginBodyDrag(ndc, point, event) {
    if (!this.begin('move', ndc, event)) return false;
    const start = this.start;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const anchor = point ? point.clone() : start.center.clone();
    // Plano paralelo a la pantalla: el objeto se mueve arriba/abajo e izquierda/derecha,
    // como cuando se arrastra en Paint 3D.
    start.movePlane = new THREE.Plane().setFromNormalAndCoplanarPoint(direction, anchor);
    this.raycaster.setFromCamera(ndc, this.camera);
    start.point = this.raycaster.ray.intersectPlane(start.movePlane, new THREE.Vector3()) || anchor;
    return true;
  }

  // Botones circulares de Paint 3D: Z arriba, X derecha, Y abajo y profundidad a la izquierda.
  beginObjectControl(action, event) {
    if (!this.enabled) return false;
    if (!['rotate-z', 'rotate-x', 'rotate-y', 'depth'].includes(action)) return false;
    if (!this.begin(action, null, event)) return false;
    const start = this.start;
    start.pointerX = event.clientX;
    start.pointerY = event.clientY;
    start.turn = 0;
    if (action === 'depth') {
      start.forward = new THREE.Vector3();
      this.camera.getWorldDirection(start.forward);
      start.depth = 0;
    }
    return true;
  }

  moveObjectControl(event) {
    if (!this.dragging || !this.start) return;
    const start = this.start;

    if (start.handle.startsWith('rotate')) {
      // Arrastre lineal: 0,5° por píxel. Nada de girar alrededor del botón.
      const sensitivity = (0.5 * Math.PI) / 180;
      let turn = 0;
      if (start.handle === 'rotate-z') turn = (event.clientX - start.pointerX) * sensitivity;
      else if (start.handle === 'rotate-x') turn = -(event.clientY - start.pointerY) * sensitivity;
      else if (start.handle === 'rotate-y') turn = (event.clientX - start.pointerX) * sensitivity;
      if (event.shiftKey || this.snap > 0) turn = Math.round(turn / (Math.PI / 12)) * (Math.PI / 12);
      if (Math.abs(turn) < 1e-5 && !start.changed) return;
      this.applyAxisRotation(start.handle, turn);
      start.changed = Math.abs(turn) > 1e-4;
    } else if (start.handle === 'depth') {
      const dy = event.clientY - start.pointerY;
      let offset = -dy * this.worldPerPx * 1.15;
      if (event.shiftKey || this.snap > 0) offset = Math.round(offset / 0.25) * 0.25;
      if (Math.abs(offset) < 1e-5 && !start.changed) return;
      this.applyDepthShift(start.forward, offset);
      start.changed = Math.abs(offset) > 0.002;
    }

    this.onChange({ handle: start.handle });
  }

  applyAxisRotation(action, turn) {
    const start = this.start;
    const axis = new THREE.Vector3(
      action === 'rotate-x' ? 1 : 0,
      action === 'rotate-y' ? 1 : 0,
      action === 'rotate-z' ? 1 : 0
    );
    if (axis.lengthSq() === 0) return;
    // Con un solo objeto usamos sus ejes locales (como Paint 3D); con varios,
    // los ejes del mundo para que el grupo gire de forma coherente.
    if (start.items.length === 1) axis.applyQuaternion(start.items[0].worldQuat);
    axis.normalize();
    const rotation = new THREE.Quaternion().setFromAxisAngle(axis, turn);
    const delta = new THREE.Vector3();
    start.items.forEach((item) => {
      delta.copy(item.worldPos).sub(start.center).applyQuaternion(rotation).add(start.center).applyMatrix4(item.parentInv);
      item.obj.position.copy(delta);
      item.obj.quaternion.copy(item.parentQuatInv).multiply(rotation).multiply(item.worldQuat);
    });
  }

  applyDepthShift(forward, offset) {
    const start = this.start;
    const shift = forward.clone().multiplyScalar(offset);
    const delta = new THREE.Vector3();
    start.items.forEach((item) => {
      delta.copy(item.worldPos).add(shift).applyMatrix4(item.parentInv);
      item.obj.position.copy(delta);
    });
  }

  beginBoxResize(handle, event, { centerX = 0, centerY = 0 } = {}) {
    if (!this.enabled) return false;
    if (!['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].includes(handle)) return false;
    if (!this.begin('box-resize', null, event)) return false;
    this.start.pointerX = event.clientX;
    this.start.pointerY = event.clientY;
    this.start.boxCenter = { x: centerX, y: centerY };
    this.start.startDistance = Math.max(8, Math.hypot(event.clientX - centerX, event.clientY - centerY));
    return true;
  }

  moveBoxResize(event) {
    if (!this.dragging || !this.start || this.start.handle !== 'box-resize') return;
    const start = this.start;
    const distance = Math.hypot(event.clientX - start.boxCenter.x, event.clientY - start.boxCenter.y);
    let factor = clamp(distance / start.startDistance, 0.12, 8);
    if (event.shiftKey || this.snap > 0) factor = Math.round(factor * 10) / 10;
    if (Math.abs(factor - 1) < 1e-4 && !start.changed) return;
    this.applyUniformScale(factor);
    start.changed = Math.abs(factor - 1) > 0.002;
    this.onChange({ handle: 'box-resize' });
  }

  applyUniformScale(factor) {
    const start = this.start;
    const delta = new THREE.Vector3();
    start.items.forEach((item) => {
      delta.copy(item.worldPos).sub(start.center).multiplyScalar(factor).add(start.center).applyMatrix4(item.parentInv);
      item.obj.position.copy(delta);
      item.obj.scale.set(item.scale.x * factor, item.scale.y * factor, item.scale.z * factor);
    });
  }

  move(ndc, event) {
    if (!this.dragging || !this.start) return;
    const start = this.start;
    const snap = this.snap;
    const delta = new THREE.Vector3();

    if (start.handle === 'move') {
      this.raycaster.setFromCamera(ndc, this.camera);
      const point = this.raycaster.ray.intersectPlane(start.movePlane, new THREE.Vector3());
      if (!point) return;
      let dx = point.x - start.point.x;
      let dy = point.y - start.point.y;
      let dz = point.z - start.point.z;
      if (snap > 0) {
        dx = Math.round(dx / snap) * snap;
        dy = Math.round(dy / snap) * snap;
        dz = Math.round(dz / snap) * snap;
      }
      if (Math.hypot(dx, dy, dz) < 1e-4) return;
      start.items.forEach((item) => {
        delta.set(item.worldPos.x + dx, item.worldPos.y + dy, item.worldPos.z + dz).applyMatrix4(item.parentInv);
        item.obj.position.copy(delta);
      });
      start.changed = Math.hypot(dx, dy, dz) > 0.002;
    } else if (start.handle === 'rotate') {
      const point = this.pointOnPlane(ndc, start.ringY);
      if (!point) return;
      const angle = Math.atan2(point.z - start.center.z, point.x - start.center.x);
      let turn = angle - start.angle;
      if (snap > 0) turn = Math.round(turn / (Math.PI / 12)) * (Math.PI / 12);
      if (Math.abs(turn) < 1e-4) return;
      const rotation = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, turn);
      start.items.forEach((item) => {
        delta.copy(item.worldPos).sub(start.center).applyQuaternion(rotation).add(start.center).applyMatrix4(item.parentInv);
        item.obj.position.copy(delta);
        item.obj.quaternion.copy(item.parentQuatInv).multiply(rotation).multiply(item.worldQuat);
      });
      start.changed = true;
    } else if (start.handle === 'scale') {
      const point = this.pointOnPlane(ndc, start.center.y);
      if (!point) return;
      const distance = Math.max(0.08, Math.hypot(point.x - start.center.x, point.z - start.center.z));
      let factor = clamp(distance / start.distance, 0.12, 8);
      if (snap > 0) factor = Math.round(factor * 10) / 10;
      if (Math.abs(factor - 1) < 1e-4) return;
      start.items.forEach((item) => {
        delta.copy(item.worldPos).sub(start.center).multiplyScalar(factor).add(start.center).applyMatrix4(item.parentInv);
        item.obj.position.copy(delta);
        item.obj.scale.set(item.scale.x * factor, item.scale.y * factor, item.scale.z * factor);
      });
      start.changed = true;
    } else if (start.handle === 'lift') {
      const dy = (start.startClientY - (event ? event.clientY : start.startClientY)) * start.worldPerPx;
      let offset = dy;
      if (snap > 0) offset = Math.round(offset / snap) * snap;
      if (Math.abs(offset) < 1e-4) return;
      if (offset < -start.floorY) offset = -start.floorY;
      start.items.forEach((item) => {
        delta.copy(item.worldPos);
        delta.y = Math.max(0, delta.y + offset);
        delta.applyMatrix4(item.parentInv);
        item.obj.position.copy(delta);
      });
      start.changed = true;
    }

    this.onChange({ handle: start.handle });
  }

  end() {
    if (!this.dragging || !this.start) return { handle: this.handle, changed: false };
    const info = { handle: this.start.handle, changed: !!this.start.changed };
    this.dragging = false;
    this.start = null;
    this.handle = null;
    this.onEnd(info);
    return info;
  }
}


