import { icon } from './icons.js';
import { COLORS } from './textures.js';
import { STICKERS } from './templates.js';
import { openImageFile, saveDataUrlFile, displayPath } from './io.js';

const W = 1200;
const H = 760;

function hexToRgba(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
}

export function openEditor2D({ onUseIn3D, toast, initialColor = '#7c6bff' } = {}) {
  const root = document.createElement('div');
  root.className = 'modal-root';
  root.innerHTML = `
    <div class="modal-card full" role="dialog" aria-modal="true" aria-label="Editor de dibujo 2D">
      <div class="e2d">
        <div class="e2d-top">
          <div class="e2d-title">
            <span class="e2d-badge">${icon('draw2d')}</span>
            <span>Dibujo 2D</span>
          </div>
          <div class="e2d-toolbar" id="e2dTools">
            <button class="e2d-tool active" data-tool="brush" title="Pincel">${icon('brush')}</button>
            <button class="e2d-tool" data-tool="eraser" title="Borrador">${icon('eraser')}</button>
            <button class="e2d-tool" data-tool="fill" title="Rellenar">${icon('fill')}</button>
            <button class="e2d-tool" data-tool="stamp" title="Sellos y emojis">${icon('sticker')}</button>
            <button class="e2d-tool" data-tool="text" title="Texto">${icon('text')}</button>
            <button class="e2d-tool" data-tool="magic" title="Recorte mágico: quita un fondo">${icon('magic')}</button>
          </div>
          <input type="color" class="e2d-color" id="e2dColor" value="${initialColor}" title="Color">
          <div class="e2d-range">Grosor <input type="range" id="e2dSize" min="2" max="70" value="14"></div>
          <button class="icon-btn" id="e2dUndo" title="Deshacer">${icon('undo')}</button>
          <button class="icon-btn" id="e2dRedo" title="Rehacer">${icon('redo')}</button>
          <button class="icon-btn" id="e2dClear" title="Borrar todo">${icon('trash')}</button>
          <button class="icon-btn" id="e2dClose" title="Cerrar">${icon('close')}</button>
        </div>

        <div class="e2d-main">
          <div class="e2d-canvas-wrap">
            <div class="e2d-frame checker" id="e2dFrame">
              <canvas class="e2d-canvas" id="e2dCanvas" width="${W}" height="${H}"></canvas>
            </div>
          </div>
          <aside class="e2d-side">
            <div class="e2d-card">
              <h4>Color</h4>
              <div class="color-grid" id="e2dPalette"></div>
            </div>
            <div class="e2d-card">
              <h4>Sellos</h4>
              <div class="e2d-stickers" id="e2dStickers"></div>
              <p class="e2d-note" style="margin:7px 0 0">Elige un sello y toca el lienzo.</p>
            </div>
            <div class="e2d-card">
              <h4>Texto</h4>
              <input class="field" id="e2dText" type="text" maxlength="40" placeholder="Escribe una palabra…" style="height:34px">
              <p class="e2d-note" style="margin:6px 0 0">Con la herramienta T, toca el lienzo para colocarlo.</p>
            </div>
            <div class="e2d-card">
              <h4>Imagen</h4>
              <div class="e2d-actions">
                <button class="btn small wide" id="e2dImport">${icon('image')} Importar imagen</button>
                <button class="btn small wide" id="e2dFillBg">${icon('fill')} Rellenar fondo</button>
              </div>
            </div>
            <div class="e2d-actions">
              <button class="btn primary wide" id="e2dUse">${icon('cube')} Llevar a la escena 3D</button>
              <button class="btn wide" id="e2dSave">${icon('download')} Guardar PNG</button>
            </div>
            <p class="e2d-note">Los dibujos se guardan con fondo transparente, por eso ves el cuadriculado. Puedes pintar un fondo con «Rellenar fondo».</p>
          </aside>
        </div>
      </div>
    </div>`;
  document.body.appendChild(root);

  const canvas = root.querySelector('#e2dCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const palette = root.querySelector('#e2dPalette');
  const stickersBox = root.querySelector('#e2dStickers');
  const colorInput = root.querySelector('#e2dColor');
  const sizeInput = root.querySelector('#e2dSize');
  const undoBtn = root.querySelector('#e2dUndo');
  const redoBtn = root.querySelector('#e2dRedo');
  const textInput = root.querySelector('#e2dText');

  let tool = 'brush';
  let color = initialColor;
  let size = 14;
  let stamp = '⭐';
  let drawing = false;
  let last = null;
  let dirtyStroke = false;

  const undoStack = [];
  let undoIndex = -1;

  function snapshot() {
    if (undoIndex < undoStack.length - 1) undoStack.splice(undoIndex + 1);
    undoStack.push(canvas.toDataURL('image/png'));
    if (undoStack.length > 22) undoStack.shift();
    undoIndex = undoStack.length - 1;
    updateUndoButtons();
  }

  function restore(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);
        resolve();
      };
      img.src = url;
    });
  }

  function updateUndoButtons() {
    undoBtn.disabled = undoIndex <= 0;
    redoBtn.disabled = undoIndex >= undoStack.length - 1;
  }

  function setColor(c) {
    color = c;
    colorInput.value = c;
    palette.querySelectorAll('.swatch').forEach((el) => el.classList.toggle('selected', el.dataset.color === c));
  }

  COLORS.forEach((c) => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.style.background = c.hex;
    b.dataset.color = c.hex;
    b.title = c.name;
    b.addEventListener('click', () => setColor(c.hex));
    palette.appendChild(b);
  });
  setColor(color);

  STICKERS.slice(0, 30).forEach((s) => {
    const b = document.createElement('button');
    b.className = 'e2d-sticker';
    b.textContent = s;
    b.title = 'Usar este sello';
    b.addEventListener('click', () => {
      stamp = s;
      setTool('stamp');
      stickersBox.querySelectorAll('.e2d-sticker').forEach((el) => el.classList.toggle('active', el === b));
    });
    stickersBox.appendChild(b);
  });

  function setTool(next) {
    tool = next;
    root.querySelectorAll('.e2d-tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === next));
    canvas.style.cursor = next === 'fill' || next === 'magic' ? 'cell' : next === 'text' ? 'text' : 'crosshair';
    root.querySelector('#e2dFrame').classList.toggle('checker', next !== 'fill');
  }

  root.querySelector('#e2dTools').addEventListener('click', (e) => {
    const b = e.target.closest('.e2d-tool');
    if (b) setTool(b.dataset.tool);
  });

  colorInput.addEventListener('input', () => setColor(colorInput.value));
  sizeInput.addEventListener('input', () => {
    size = +sizeInput.value;
    sizeInput.style.setProperty('--fill', `${((size - 2) / 68) * 100}%`);
  });
  sizeInput.dispatchEvent(new Event('input'));

  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  }

  function floodFill(x, y, rgba, tolerance = 38, makeTransparent = false) {
    const img = ctx.getImageData(0, 0, W, H);
    const data = img.data;
    const ix = Math.max(0, Math.min(W - 1, Math.floor(x)));
    const iy = Math.max(0, Math.min(H - 1, Math.floor(y)));
    const start = (iy * W + ix) * 4;
    const target = [data[start], data[start + 1], data[start + 2], data[start + 3]];
    const fill = makeTransparent ? [0, 0, 0, 0] : rgba;
    if (!makeTransparent) {
      if (Math.abs(target[0] - fill[0]) < 2 && Math.abs(target[1] - fill[1]) < 2 && Math.abs(target[2] - fill[2]) < 2 && target[3] === fill[3]) return false;
    } else if (target[3] === 0) return false;

    const match = (i) => {
      if (makeTransparent && data[i + 3] === 0) return false;
      return Math.abs(data[i] - target[0]) <= tolerance
        && Math.abs(data[i + 1] - target[1]) <= tolerance
        && Math.abs(data[i + 2] - target[2]) <= tolerance
        && Math.abs(data[i + 3] - target[3]) <= tolerance;
    };

    const stack = [[ix, iy]];
    const seen = new Uint8Array(W * H);
    let touched = false;
    while (stack.length) {
      const [px, py] = stack.pop();
      let x0 = px;
      while (x0 >= 0) {
        const idx = py * W + x0;
        if (seen[idx] || !match(idx * 4)) break;
        x0--;
      }
      x0++;
      let x1 = px;
      while (x1 < W) {
        const idx = py * W + x1;
        if (seen[idx] || !match(idx * 4)) break;
        x1++;
      }
      x1--;
      if (x0 > x1) continue;
      touched = true;
      for (let sx = x0; sx <= x1; sx++) {
        const idx = py * W + sx;
        seen[idx] = 1;
        const i = idx * 4;
        data[i] = fill[0]; data[i + 1] = fill[1]; data[i + 2] = fill[2]; data[i + 3] = fill[3];
        if (py > 0) {
          const up = (py - 1) * W + sx;
          if (!seen[up] && match(up * 4)) stack.push([sx, py - 1]);
        }
        if (py < H - 1) {
          const dn = (py + 1) * W + sx;
          if (!seen[dn] && match(dn * 4)) stack.push([sx, py + 1]);
        }
      }
    }
    if (touched) ctx.putImageData(img, 0, 0);
    return touched;
  }

  function drawStamp(x, y) {
    ctx.save();
    ctx.font = `${Math.max(34, size * 3)}px "Noto Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stamp, x, y);
    ctx.restore();
    snapshot();
  }

  function drawText(x, y) {
    const text = textInput.value.trim();
    if (!text) {
      textInput.focus();
      return;
    }
    ctx.save();
    ctx.font = `800 ${Math.max(22, size * 2.4)}px "Noto Sans", "DejaVu Sans", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
    snapshot();
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const p = pointerPos(e);
    if (tool === 'fill') {
      if (floodFill(p.x, p.y, hexToRgba(color))) snapshot();
      return;
    }
    if (tool === 'magic') {
      if (floodFill(p.x, p.y, [0, 0, 0, 0], 46, true)) snapshot();
      return;
    }
    if (tool === 'stamp') { drawStamp(p.x, p.y); return; }
    if (tool === 'text') { drawText(p.x, p.y); return; }

    drawing = true;
    dirtyStroke = false;
    last = p;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* puntero sintético o ya liberado */ }
    ctx.save();
    if (tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    dirtyStroke = true;
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const p = pointerPos(e);
    ctx.save();
    if (tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
    last = p;
    dirtyStroke = true;
  });

  function endStroke(e) {
    if (!drawing) return;
    drawing = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* nada */ }
    if (dirtyStroke) snapshot();
    dirtyStroke = false;
  }
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('pointerleave', (e) => { if (drawing && e.buttons === 0) endStroke(e); });

  undoBtn.addEventListener('click', async () => {
    if (undoIndex <= 0) return;
    undoIndex--;
    await restore(undoStack[undoIndex]);
    updateUndoButtons();
  });
  redoBtn.addEventListener('click', async () => {
    if (undoIndex >= undoStack.length - 1) return;
    undoIndex++;
    await restore(undoStack[undoIndex]);
    updateUndoButtons();
  });
  root.querySelector('#e2dClear').addEventListener('click', () => {
    ctx.clearRect(0, 0, W, H);
    snapshot();
  });
  root.querySelector('#e2dFillBg').addEventListener('click', () => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    snapshot();
  });

  root.querySelector('#e2dImport').addEventListener('click', async () => {
    const res = await openImageFile();
    if (!res || res.canceled || !res.dataUrl) return;
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(W / img.width, H / img.height) * 0.9;
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      snapshot();
      toast && toast('Imagen añadida. Usa «Recorte mágico» para quitar el fondo.', 'success');
    };
    img.src = res.dataUrl;
  });

  root.querySelector('#e2dSave').addEventListener('click', async () => {
    const res = await saveDataUrlFile(canvas.toDataURL('image/png'), 'mi-dibujo.png');
    if (!res.canceled) toast && toast('Dibujo guardado' + (res.path ? ': ' + displayPath(res.path) : ''), 'success');
  });

  root.querySelector('#e2dUse').addEventListener('click', () => {
    const dataUrl = canvas.toDataURL('image/png');
    onUseIn3D && onUseIn3D({ dataUrl, canvas, aspect: W / H });
    close();
  });

  root.querySelector('#e2dClose').addEventListener('click', close);
  root.addEventListener('pointerdown', (e) => { if (e.target === root) close(); });

  function keyHandler(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      (e.shiftKey ? redoBtn : undoBtn).click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      root.querySelector('#e2dSave').click();
    }
  }
  window.addEventListener('keydown', keyHandler);

  function close() {
    window.removeEventListener('keydown', keyHandler);
    root.remove();
  }

  // Estado inicial: lienzo transparente.
  snapshot();
  setTimeout(() => { sizeInput.focus(); }, 60);
}
