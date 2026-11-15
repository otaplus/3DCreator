// Línea de tiempo de animación, con pistas por objeto y fotogramas clave.
import { icon } from './icons.js';
import { emojiForObject } from './shapes.js';
import { ensureUid } from './animation.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export class Timeline {
  constructor(options) {
    this.root = options.root;
    this.animation = options.animation;
    this.resolve = options.resolve;
    this.getSelected = options.getSelected;
    this.onSeek = options.onSeek || (() => {});
    this.onPlayToggle = options.onPlayToggle || (() => {});
    this.onStop = options.onStop || (() => {});
    this.onAddKey = options.onAddKey || (() => {});
    this.onDeleteKey = options.onDeleteKey || (() => {});
    this.onCommit = options.onCommit || (() => {});
    this.onSelectObject = options.onSelectObject || (() => {});
    this.onClose = options.onClose || (() => {});
    this.onSettings = options.onSettings || (() => {});
    this.onNotice = options.onNotice || (() => {});
    this.el = null;
    this.rows = [];
    this.seeking = false;
    this.keyDrag = null;
    this._playing = null;
    this.bind();
    this.bindPointers();
  }

  bind() {
    this.root.addEventListener('click', (event) => {
      const action = event.target.closest('[data-tl]');
      if (action) {
        const kind = action.dataset.tl;
        if (kind === 'toggleplay') this.onPlayToggle();
        else if (kind === 'stop') this.onStop();
        else if (kind === 'first') this.onSeek(0);
        else if (kind === 'prev') this.stepFrames(-1);
        else if (kind === 'next') this.stepFrames(1);
        else if (kind === 'last') this.onSeek(this.animation.duration);
        else if (kind === 'loop') {
          this.animation.loop = !this.animation.loop;
          this.syncControls();
          this.onSettings();
        } else if (kind === 'autokey') {
          this.animation.autoKey = !this.animation.autoKey;
          this.syncControls();
          this.onSettings();
        } else if (kind === 'addkey') this.onAddKey();
        else if (kind === 'addblank') this.addBlankFrame();
        else if (kind === 'insertblank') this.insertBlankFrame();
        else if (kind === 'delkey') this.onDeleteKey();
        else if (kind === 'close') this.onClose();
        return;
      }

      const addButton = event.target.closest('[data-add-uid]');
      if (addButton) {
        const obj = this.objForUid(addButton.dataset.addUid);
        if (obj) this.onAddKey(obj);
        return;
      }

      const nameRow = event.target.closest('[data-row-uid]');
      if (nameRow) {
        const obj = this.objForUid(nameRow.dataset.rowUid);
        if (obj) this.onSelectObject(obj);
      }
    });

    this.root.addEventListener('change', (event) => {
      const speed = event.target.closest('[data-tl-speed]');
      if (speed) {
        this.animation.speed = clamp(Number(speed.value) || 1, 0.1, 4);
        this.onSettings();
        return;
      }
      const duration = event.target.closest('[data-tl-duration]');
      if (duration) {
        this.animation.setDuration(Number(duration.value));
        this.onSeek(Math.min(this.animation.time, this.animation.duration));
        this.onCommit('Cambiar duración');
        this.onSettings();
        this.render();
        return;
      }
      const fps = event.target.closest('[data-tl-fps]');
      if (fps) {
        this.animation.setFps(Number(fps.value));
        this.onSeek(this.animation.time);
        this.onCommit('Cambiar los FPS');
        this.onSettings();
        this.render();
        return;
      }
      const frame = event.target.closest('[data-tl-frame-input]');
      if (frame) {
        this.animation.setFrame(Number(frame.value));
        frame.value = String(this.animation.currentFrame);
        this.onSeek(this.animation.time);
        this.updatePlayhead();
      }
    });
  }

  stepFrames(delta) {
    this.animation.setFrame(this.animation.currentFrame + delta);
    this.onSeek(this.animation.time);
    this.updatePlayhead();
  }

  addBlankFrame() {
    if (!this.animation.addBlankFrame()) {
      this.onNotice('La animación ya dura 120 segundos.');
      return;
    }
    this.onSeek(this.animation.time);
    this.onCommit('Añadir fotograma en blanco');
    this.onSettings();
    this.render();
  }

  insertBlankFrame() {
    if (!this.animation.insertBlankFrame()) {
      this.onNotice('La animación ya dura 120 segundos.');
      return;
    }
    this.onSeek(this.animation.time);
    this.onCommit('Insertar fotograma en blanco');
    this.onSettings();
    this.render();
  }

  objForUid(uid) {
    return this.resolve ? this.resolve(uid) : null;
  }

  timeFromClientX(clientX) {
    if (!this.el) return 0;
    const rect = (this.el.track || this.el.inner).getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return this.animation.snapTime(ratio * this.animation.duration);
  }

  seekToClientX(clientX) {
    this.onSeek(this.timeFromClientX(clientX));
    this.updatePlayhead();
  }

  bindPointers() {
    this.root.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !this.el) return;
      const keyButton = event.target.closest('.tl-key');
      if (keyButton) {
        event.preventDefault();
        event.stopPropagation();
        this.beginKeyDrag(event, keyButton);
        return;
      }
      if (event.target.closest('[data-tl]') || event.target.closest('[data-add-uid]') || event.target.closest('[data-row-uid]')) return;
      this.seeking = true;
      try { this.el.inner.setPointerCapture(event.pointerId); } catch { /* nada */ }
      this.seekToClientX(event.clientX);
    });

    this.root.addEventListener('pointermove', (event) => {
      if (this.keyDrag) {
        this.moveKeyDrag(event);
        return;
      }
      if (this.seeking) this.seekToClientX(event.clientX);
    });

    const finish = () => {
      if (this.keyDrag) {
        const drag = this.keyDrag;
        this.keyDrag = null;
        if (drag.moved) {
          this.onSeek(drag.key.time);
          this.onCommit('Mover fotograma clave');
          this.render();
        } else {
          this.onSeek(drag.key.time);
          const obj = this.objForUid(drag.uid);
          if (obj) this.onSelectObject(obj);
        }
      }
      this.seeking = false;
    };
    this.root.addEventListener('pointerup', finish);
    this.root.addEventListener('pointercancel', finish);

    this.root.addEventListener('dblclick', (event) => {
      const keyButton = event.target.closest('.tl-key');
      if (!keyButton) return;
      event.preventDefault();
      event.stopPropagation();
      this.onDeleteKey(keyButton.dataset.uid, Number(keyButton.dataset.time));
    });
  }

  beginKeyDrag(event, button) {
    const uid = button.dataset.uid;
    const time = Number(button.dataset.time);
    const track = this.animation.trackForUid(uid);
    const key = track ? track.keys.find((item) => Math.abs(item.time - time) < 0.5 / this.animation.fps) : null;
    if (!key) return;
    this.keyDrag = { uid, key, button, startX: event.clientX, moved: false };
    try { button.setPointerCapture(event.pointerId); } catch { /* nada */ }
  }

  moveKeyDrag(event) {
    const drag = this.keyDrag;
    if (!drag) return;
    if (!drag.moved && Math.abs(event.clientX - drag.startX) < 3) return;
    drag.moved = true;
    const time = this.timeFromClientX(event.clientX);
    const moved = this.animation.moveKey(drag.uid, drag.key.time, time);
    if (!moved) return;
    drag.key = moved;
    drag.button.dataset.time = String(moved.time);
    const pct = this.animation.duration > 0 ? (moved.time / this.animation.duration) * 100 : 0;
    drag.button.style.left = pct.toFixed(3) + '%';
    drag.button.title = 'Clave en ' + moved.time.toFixed(2) + ' s · doble clic para borrar';
    this.onSeek(moved.time);
    this.updatePlayhead();
  }

  collectRows() {
    const rows = [];
    const seen = new Set();
    this.animation.tracks.forEach((track) => {
      const obj = this.objForUid(track.id);
      if (!obj) return;
      rows.push({ uid: track.id, obj, keys: track.keys });
      seen.add(track.id);
    });
    (this.getSelected ? this.getSelected() : []).forEach((obj) => {
      const uid = ensureUid(obj);
      if (seen.has(uid)) return;
      seen.add(uid);
      rows.push({ uid, obj, keys: [] });
    });
    return rows;
  }

  ticksMarkup() {
    const duration = this.animation.duration || 1;
    const step = duration <= 8 ? 1 : duration <= 20 ? 2 : 5;
    const ticks = [];
    for (let t = 0; t <= duration + 1e-6; t += step) {
      ticks.push(`<div class="tl-tick" style="left:${((t / duration) * 100).toFixed(3)}%"><span>${t}s</span></div>`);
      const mid = t + step / 2;
      if (mid < duration) ticks.push(`<div class="tl-tick minor" style="left:${((mid / duration) * 100).toFixed(3)}%"></div>`);
    }
    return ticks.join('');
  }

  render() {
    if (!this.root) return;
    const oldScroll = this.root.querySelector('.tl-scroll');
    const scrollTop = oldScroll ? oldScroll.scrollTop : 0;
    const rows = this.collectRows();
    const duration = this.animation.duration;
    const selectedSet = new Set((this.getSelected ? this.getSelected() : []).map((obj) => ensureUid(obj)));
    this.rows = rows;

    const nameRows = rows.map((row) => {
      const active = selectedSet.has(row.uid);
      const emoji = emojiForObject(row.obj);
      const name = row.obj.name || 'Objeto';
      return `<div class="tl-name-row${active ? ' active' : ''}">
        <button class="tl-name-btn" data-row-uid="${row.uid}" title="Elegir ${esc(name)}">
          <span class="tl-emoji">${emoji}</span><span class="tl-name">${esc(name)}</span>
        </button>
        <button class="tl-name-add" data-add-uid="${row.uid}" title="Añadir un fotograma clave aquí">◆＋</button>
      </div>`;
    }).join('');

    const laneRows = rows.map((row) => {
      const keys = row.keys.map((key) => {
        const pct = duration > 0 ? (key.time / duration) * 100 : 0;
        return `<button class="tl-key" data-uid="${row.uid}" data-time="${key.time}" style="left:${pct.toFixed(3)}%" title="Clave en ${key.time.toFixed(2)} s · doble clic para borrar"></button>`;
      }).join('');
      return `<div class="tl-lane-row" data-lane-uid="${row.uid}">${keys || '<span class="tl-row-hint">Sin claves · pulsa ◆＋</span>'}</div>`;
    }).join('');

    const empty = rows.length
      ? ''
      : '<div class="tl-empty">Elige un objeto en la escena y pulsa <strong>◆＋ Clave</strong> para empezar su animación.</div>';
    const totalKeys = this.animation.keyCount;

    const fpsOptions = Array.from(new Set([12, 15, 24, 25, 30, 60, this.animation.fps])).sort((a, b) => a - b);
    const totalFrames = Math.max(1, Math.round(this.animation.duration * this.animation.fps));
    const currentFrame = Math.round(this.animation.time * this.animation.fps);
    this.root.innerHTML = `
      <div class="tl-head">
        <div class="tl-brand">
          <span class="tl-brand-icon">🎬</span>
          <div><strong>Animación</strong><small>${totalKeys} ${totalKeys === 1 ? 'clave' : 'claves'} · ${rows.length} ${rows.length === 1 ? 'pista' : 'pistas'}</small></div>
        </div>
        <div class="tl-controls">
          <button class="tl-btn" data-tl="first" title="Ir al primer fotograma">${icon('skipStart')}</button>
          <button class="tl-btn" data-tl="prev" title="Fotograma anterior">${icon('stepBack')}</button>
          <button class="tl-btn play" data-tl="toggleplay" title="Reproducir o pausar (Espacio)">${icon(this.animation.playing ? 'pause' : 'play')}</button>
          <button class="tl-btn" data-tl="next" title="Fotograma siguiente">${icon('stepForward')}</button>
          <button class="tl-btn" data-tl="last" title="Ir al último fotograma">${icon('skipEnd')}</button>
          <button class="tl-btn toggle${this.animation.loop ? ' on' : ''}" data-tl="loop" title="Repetir la animación en bucle">${icon('loop')}</button>
          <button class="tl-btn toggle${this.animation.autoKey ? ' on' : ''}" data-tl="autokey" title="Grabar un fotograma clave al mover el objeto"><span class="tl-dot"></span>Auto</button>
          <label class="tl-field">Velocidad
            <select data-tl-speed>${[0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4].map((v) => `<option value="${v}"${Math.abs(this.animation.speed - v) < 1e-6 ? ' selected' : ''}>${v}×</option>`).join('')}</select>
          </label>
          <div class="tl-time"><strong data-tl-time>${this.animation.time.toFixed(2)} s</strong><span data-tl-frame></span></div>
          <label class="tl-field">Duración
            <input type="number" min="1" max="120" step="any" value="${duration}" data-tl-duration> s
          </label>
          <button class="tl-btn close" data-tl="close" title="Cerrar la animación">${icon('close')}</button>
        </div>
      </div>
      <div class="tl-subbar">
        <div class="tl-frame-nav">
          <span class="tl-sub-label">Fotograma</span>
          <input class="tl-frame-input" data-tl-frame-input type="number" min="0" max="${totalFrames}" step="1" value="${currentFrame}">
          <span class="tl-frame-total">/ ${totalFrames}</span>
        </div>
        <label class="tl-field">FPS
          <select data-tl-fps>${fpsOptions.map((v) => `<option value="${v}"${v === this.animation.fps ? ' selected' : ''}>${v}</option>`).join('')}</select>
        </label>
        <button class="tl-btn key" data-tl="addkey" title="Añadir un fotograma clave al objeto elegido">${icon('keyframe')}<span>Clave</span></button>
        <button class="tl-btn" data-tl="addblank" title="Añadir un fotograma en blanco al final">${icon('plus')}<span>Fotograma</span></button>
        <button class="tl-btn" data-tl="insertblank" title="Insertar un fotograma en blanco aquí y desplazar el resto">${icon('blankFrame')}<span>Blanco</span></button>
        <button class="tl-btn" data-tl="delkey" title="Borrar el fotograma clave de este instante">${icon('trash')}</button>
        <div class="tl-spacer"></div>
        <span class="tl-hint">Un fotograma en blanco no tiene clave: mantiene la pose anterior.</span>
      </div>
      <div class="tl-body">
        <div class="tl-scroll">
          <div class="tl-names">
            <div class="tl-name-head"><span>Objetos</span><span>${rows.length}</span></div>
            ${nameRows || '<div class="tl-name-row empty"><span class="tl-name">Sin objetos</span></div>'}
          </div>
          <div class="tl-lane">
            <div class="tl-inner">
              <div class="tl-ruler">${this.ticksMarkup()}</div>
              <div class="tl-rows">${laneRows}</div>
              ${empty}
              <div class="tl-playhead-track"><div class="tl-playhead"><span></span></div></div>
            </div>
          </div>
        </div>
      </div>`;

    this.el = {
      inner: this.root.querySelector('.tl-inner'),
      track: this.root.querySelector('.tl-playhead-track'),
      playhead: this.root.querySelector('.tl-playhead'),
      time: this.root.querySelector('[data-tl-time]'),
      frame: this.root.querySelector('[data-tl-frame]'),
      frameInput: this.root.querySelector('[data-tl-frame-input]'),
      play: this.root.querySelector('[data-tl="toggleplay"]'),
    };
    this._playing = null;
    this.updatePlayhead();
    this.syncControls();
    const scroll = this.root.querySelector('.tl-scroll');
    if (scroll) scroll.scrollTop = scrollTop;
  }

  syncControls() {
    if (!this.root) return;
    const loop = this.root.querySelector('[data-tl="loop"]');
    if (loop) loop.classList.toggle('on', this.animation.loop);
    const auto = this.root.querySelector('[data-tl="autokey"]');
    if (auto) auto.classList.toggle('on', this.animation.autoKey);
    const duration = this.root.querySelector('[data-tl-duration]');
    if (duration && document.activeElement !== duration) duration.value = this.animation.duration;
    const speed = this.root.querySelector('[data-tl-speed]');
    if (speed) speed.value = String(this.animation.speed);
    const fps = this.root.querySelector('[data-tl-fps]');
    if (fps) fps.value = String(this.animation.fps);
    if (this.el && this.el.frameInput && document.activeElement !== this.el.frameInput) {
      this.el.frameInput.value = String(this.animation.currentFrame);
    }
    this.updatePlayhead();
  }

  updatePlayhead() {
    if (!this.el) return;
    const duration = this.animation.duration || 1;
    const pct = (this.animation.time / duration) * 100;
    if (this.el.playhead) this.el.playhead.style.left = clamp(pct, 0, 100).toFixed(3) + '%';
    if (this.el.time) this.el.time.textContent = this.animation.time.toFixed(2) + ' s';
    if (this.el.frameInput && document.activeElement !== this.el.frameInput) {
      this.el.frameInput.value = String(this.animation.currentFrame);
    }
    if (this.el.frame) {
      const frame = Math.round(this.animation.time * this.animation.fps);
      const total = Math.round(duration * this.animation.fps);
      this.el.frame.textContent = `fotograma ${frame} / ${total}`;
    }
    if (this._playing !== this.animation.playing && this.el.play) {
      this._playing = this.animation.playing;
      this.el.play.innerHTML = icon(this.animation.playing ? 'pause' : 'play');
    }
  }

  open() {
    this.root.classList.remove('hidden');
    this.render();
  }

  close() {
    this.root.classList.add('hidden');
  }
}

