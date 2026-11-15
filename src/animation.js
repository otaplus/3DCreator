// Motor de animación: pistas por objeto, fotogramas clave e interpolación suave.
// Cada objeto de la escena puede tener su propia pista con posición, rotación,
// escala y visibilidad. Los fotogramas se guardan dentro del proyecto.
import * as THREE from 'three';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value) => Math.round(value * 10000) / 10000;
const smooth = (t) => t * t * (3 - 2 * t);

let uidSeed = 0;

// Cada objeto recibe un identificador estable para que la animación siga
// funcionando aunque se renombre o se mueva dentro de un grupo.
export function ensureUid(obj) {
  if (!obj) return null;
  if (!obj.userData) obj.userData = {};
  if (!obj.userData.uid) {
    uidSeed += 1;
    obj.userData.uid = 'o' + uidSeed.toString(36) + Math.random().toString(36).slice(2, 7);
  }
  return obj.userData.uid;
}

export function assignUids(root) {
  if (!root) return;
  root.traverse((child) => ensureUid(child));
}

// Da identificadores nuevos a un objeto reconstruido (por ejemplo al pegar).
export function reassignUids(root) {
  if (!root) return;
  root.traverse((child) => {
    if (child.userData) {
      child.userData.uid = null;
      ensureUid(child);
    }
  });
}

function roundVec(values) {
  return values.map((n) => Math.round(n * 10000) / 10000);
}

function keyFromObject(obj, time) {
  return {
    time: round(time),
    pos: roundVec([obj.position.x, obj.position.y, obj.position.z]),
    quat: roundVec([obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w]),
    scl: roundVec([obj.scale.x, obj.scale.y, obj.scale.z]),
    vis: obj.visible !== false ? 1 : 0,
  };
}

function applyKey(target, key) {
  target.pos.set(key.pos[0], key.pos[1], key.pos[2]);
  target.quat.set(key.quat[0], key.quat[1], key.quat[2], key.quat[3]);
  target.scl.set(key.scl[0], key.scl[1], key.scl[2]);
}

const tmpA = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scl: new THREE.Vector3() };
const tmpB = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scl: new THREE.Vector3() };

export class AnimationSystem {
  constructor() {
    this.duration = 6;
    this.fps = 30;
    this.loop = true;
    this.speed = 1;
    this.autoKey = false;
    this.time = 0;
    this.playing = false;
    this.tracks = new Map();
  }

  snapTime(time) {
    const safe = clamp(Number(time) || 0, 0, this.duration);
    return Math.round(safe * this.fps) / this.fps;
  }

  setDuration(seconds) {
    let lastKey = 0;
    this.tracks.forEach((track) => {
      track.keys.forEach((key) => { if (key.time > lastKey) lastKey = key.time; });
    });
    const value = clamp(Number(seconds) || 6, 1, 120);
    // La duración nunca puede ser menor que el último fotograma: así no se pierde nada.
    this.duration = Math.max(Math.round(value * 1000) / 1000, Math.ceil(lastKey * 1000) / 1000);
    this.time = clamp(this.time, 0, this.duration);
    return this.duration;
  }

  get frameCount() {
    return Math.max(1, Math.round(this.duration * this.fps));
  }

  get currentFrame() {
    return Math.round(this.time * this.fps);
  }

  setFps(value) {
    this.fps = clamp(Math.round(Number(value) || 30), 1, 120);
    this.time = clamp(this.time, 0, this.duration);
    return this.fps;
  }

  setFrame(frame) {
    const total = this.frameCount;
    const safe = clamp(Math.round(Number(frame) || 0), 0, total);
    this.time = safe / this.fps;
    return this.time;
  }

  stepFrame(delta) {
    return this.setFrame(this.currentFrame + delta);
  }

  // Añade un fotograma en blanco al final (la animación dura un fotograma más).
  addBlankFrame({ seekToEnd = true } = {}) {
    const step = 1 / this.fps;
    if (this.duration + step > 120.0001) return false;
    this.duration = round(this.duration + step);
    if (seekToEnd) this.time = this.duration;
    return true;
  }

  // Inserta un fotograma en blanco en la posición actual y desplaza el resto.
  insertBlankFrame() {
    const step = 1 / this.fps;
    if (this.duration + step > 120.0001) return false;
    const at = this.time;
    const epsilon = 1e-6;
    this.tracks.forEach((track) => {
      track.keys.forEach((key) => {
        if (key.time >= at - epsilon) key.time = round(key.time + step);
      });
      track.keys.sort((a, b) => a.time - b.time);
    });
    this.duration = round(this.duration + step);
    this.time = at;
    return true;
  }

  get keyCount() {
    let total = 0;
    this.tracks.forEach((track) => { total += track.keys.length; });
    return total;
  }

  get trackCount() {
    return this.tracks.size;
  }

  trackForUid(uid) {
    return this.tracks.get(uid) || null;
  }

  trackFor(obj) {
    if (!obj) return null;
    return this.tracks.get(obj.userData && obj.userData.uid) || null;
  }

  isAnimated(obj) {
    const track = this.trackFor(obj);
    return !!(track && track.keys.length);
  }

  keyAt(uid, time) {
    const track = this.tracks.get(uid);
    if (!track) return null;
    const target = this.snapTime(time);
    return track.keys.find((key) => Math.abs(key.time - target) < 0.5 / this.fps) || null;
  }

  ensureTrack(obj) {
    const uid = ensureUid(obj);
    let track = this.tracks.get(uid);
    if (!track) {
      track = { id: uid, name: obj.name || 'Objeto', keys: [] };
      this.tracks.set(uid, track);
    }
    return track;
  }

  setKey(obj, time = this.time) {
    if (!obj) return null;
    const track = this.ensureTrack(obj);
    const target = this.snapTime(time);
    const fresh = keyFromObject(obj, target);
    const existing = track.keys.find((key) => Math.abs(key.time - target) < 0.5 / this.fps);
    if (existing) Object.assign(existing, fresh);
    else track.keys.push(fresh);
    track.keys.sort((a, b) => a.time - b.time);
    track.name = obj.name || track.name;
    return { uid: track.id, key: existing || fresh };
  }

  removeKey(uid, time) {
    const track = this.tracks.get(uid);
    if (!track) return false;
    const target = this.snapTime(time);
    const index = track.keys.findIndex((key) => Math.abs(key.time - target) < 0.5 / this.fps);
    if (index < 0) return false;
    track.keys.splice(index, 1);
    if (!track.keys.length) this.tracks.delete(uid);
    return true;
  }

  moveKey(uid, fromTime, toTime) {
    const track = this.tracks.get(uid);
    if (!track) return null;
    const from = this.snapTime(fromTime);
    const to = this.snapTime(toTime);
    const key = track.keys.find((k) => Math.abs(k.time - from) < 0.5 / this.fps);
    if (!key) return null;
    if (to === from) return key;
    const occupied = track.keys.find((k) => k !== key && Math.abs(k.time - to) < 0.5 / this.fps);
    if (occupied) return key;
    key.time = to;
    track.keys.sort((a, b) => a.time - b.time);
    return key;
  }

  copyTrack(source, target, offset = null) {
    if (!source || !target) return false;
    const sourceTrack = this.trackFor(source);
    if (!sourceTrack || !sourceTrack.keys.length) return false;
    const targetUid = ensureUid(target);
    const keys = sourceTrack.keys.map((key) => {
      const copy = {
        time: key.time,
        pos: key.pos.slice(),
        quat: key.quat.slice(),
        scl: key.scl.slice(),
        vis: key.vis,
      };
      if (offset) {
        copy.pos[0] = round(copy.pos[0] + offset[0]);
        copy.pos[1] = round(copy.pos[1] + offset[1]);
        copy.pos[2] = round(copy.pos[2] + offset[2]);
      }
      return copy;
    });
    this.tracks.set(targetUid, { id: targetUid, name: target.name || sourceTrack.name, keys });
    return true;
  }

  removeTrack(objOrUid) {
    const uid = typeof objOrUid === 'string' ? objOrUid : (objOrUid && objOrUid.userData && objOrUid.userData.uid);
    if (!uid) return false;
    return this.tracks.delete(uid);
  }

  prune(validUids) {
    let removed = 0;
    this.tracks.forEach((track, uid) => {
      if (!validUids.has(uid)) {
        this.tracks.delete(uid);
        removed += 1;
      }
    });
    return removed;
  }

  clear() {
    this.tracks.clear();
    this.time = 0;
    this.playing = false;
  }

  reset() {
    this.duration = 6;
    this.fps = 30;
    this.loop = true;
    this.speed = 1;
    this.time = 0;
    this.playing = false;
    this.tracks.clear();
  }

  advance(dt) {
    if (!this.playing) return;
    this.time += dt * this.speed;
    if (this.time > this.duration) {
      if (this.loop) {
        this.time = this.duration > 0 ? this.time % this.duration : 0;
      } else {
        this.time = this.duration;
        this.playing = false;
      }
    }
  }

  // Aplica la pose interpolada de todos los objetos animados en un instante.
  sample(time, resolve) {
    const t = clamp(Number(time) || 0, 0, this.duration);
    let applied = 0;
    this.tracks.forEach((track) => {
      const obj = resolve ? resolve(track.id) : null;
      if (!obj || !obj.position || !obj.quaternion || !obj.scale) return;
      const keys = track.keys;
      if (!keys.length) return;
      let a = keys[0];
      let b = keys[keys.length - 1];
      let factor = 0;
      if (keys.length > 1 && t > keys[0].time && t < b.time) {
        for (let i = 0; i < keys.length - 1; i++) {
          if (keys[i + 1].time <= t) continue;
          a = keys[i];
          b = keys[i + 1];
          break;
        }
        const span = Math.max(1e-6, b.time - a.time);
        factor = smooth(clamp((t - a.time) / span, 0, 1));
      } else if (t >= b.time) {
        a = b;
      }

      if (a === b || factor <= 0) {
        applyKey(tmpA, a);
        obj.position.copy(tmpA.pos);
        obj.quaternion.copy(tmpA.quat);
        obj.scale.copy(tmpA.scl);
        obj.visible = a.vis !== 0;
      } else {
        applyKey(tmpA, a);
        applyKey(tmpB, b);
        obj.position.copy(tmpA.pos).lerp(tmpB.pos, factor);
        obj.quaternion.copy(tmpA.quat).slerp(tmpB.quat, factor);
        obj.scale.copy(tmpA.scl).lerp(tmpB.scl, factor);
        obj.visible = factor < 0.5 ? a.vis !== 0 : b.vis !== 0;
      }
      applied += 1;
    });
    return applied;
  }

  serialize() {
    return {
      duration: this.duration,
      fps: this.fps,
      loop: this.loop,
      speed: this.speed,
      time: round(this.time),
      tracks: Array.from(this.tracks.values()).map((track) => ({
        id: track.id,
        name: track.name,
        keys: track.keys.map((key) => ({
          t: key.time,
          p: key.pos.map((n) => round(n)),
          q: key.quat.map((n) => round(n)),
          s: key.scl.map((n) => round(n)),
          v: key.vis,
        })),
      })),
    };
  }

  load(data) {
    this.tracks.clear();
    this.playing = false;
    if (!data || typeof data !== 'object') {
      this.reset();
      return false;
    }
    this.duration = clamp(Number(data.duration) || 6, 1, 120);
    this.fps = clamp(Math.round(Number(data.fps) || 30), 1, 120);
    this.loop = data.loop !== false;
    this.speed = clamp(Number(data.speed) || 1, 0.1, 4);
    const rawTracks = Array.isArray(data.tracks) ? data.tracks : [];
    rawTracks.forEach((raw) => {
      (Array.isArray(raw && raw.keys) ? raw.keys : []).forEach((key) => {
        const time = Number(key && key.t) || 0;
        if (time > this.duration) this.duration = Math.min(120, Math.ceil(time * 10) / 10);
      });
    });
    rawTracks.forEach((raw) => {
      if (!raw || !raw.id) return;
      const keys = (Array.isArray(raw.keys) ? raw.keys : [])
        .filter((key) => key && Array.isArray(key.p) && key.p.length === 3 && Array.isArray(key.q) && key.q.length === 4 && Array.isArray(key.s) && key.s.length === 3)
        .map((key) => ({
          time: clamp(Number(key.t) || 0, 0, this.duration),
          pos: key.p.map(Number),
          quat: key.q.map(Number),
          scl: key.s.map(Number),
          vis: key.v === 0 ? 0 : 1,
        }))
        .sort((a, b) => a.time - b.time);
      if (keys.length) this.tracks.set(String(raw.id), { id: String(raw.id), name: String(raw.name || 'Objeto'), keys });
    });
    this.time = clamp(Number(data.time) || 0, 0, this.duration);
    return true;
  }
}

