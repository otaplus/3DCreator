// Capa de entrada/salida: usa diálogos nativos en Electron y descargas en navegador.
const desktop = typeof window !== 'undefined' ? window.desktop : null;

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function safeName(name) {
  return String(name || 'creacion').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'creacion';
}

function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept || '';
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files && input.files[0];
      input.remove();
      if (!file) return resolve(null);
      resolve(file);
    };
    document.body.appendChild(input);
    input.click();
  });
}

export function toBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function saveProjectFile(json, name) {
  const fileName = safeName(name) + '.c3d';
  if (desktop && desktop.isDesktop) {
    const res = await desktop.saveProject(json, safeName(name));
    return res;
  }
  downloadBlob(new Blob([json], { type: 'application/json' }), fileName);
  return { canceled: false, path: fileName, downloaded: true };
}

export async function openProjectFile() {
  if (desktop && desktop.isDesktop) return desktop.openProject();
  const file = await pickFile('.c3d,.json,application/json');
  if (!file) return { canceled: true };
  return { canceled: false, content: await file.text(), path: file.name, downloaded: true };
}

export async function saveBinaryFile(bytes, suggestedName, filters, title) {
  if (desktop && desktop.isDesktop) {
    return desktop.saveFile({ base64: toBase64(bytes), suggestedName, filters, title });
  }
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  downloadBlob(blob, safeName(suggestedName));
  return { canceled: false, path: suggestedName, downloaded: true };
}

export async function saveTextFile(text, suggestedName, filters, title) {
  const bytes = new TextEncoder().encode(text);
  return saveBinaryFile(bytes, suggestedName, filters, title);
}

export async function saveDataUrlFile(dataUrl, suggestedName) {
  const [head, data] = String(dataUrl).split(',');
  const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/png';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  if (desktop && desktop.isDesktop) {
    return desktop.saveFile({
      base64: data,
      suggestedName,
      filters: [{ name: 'Imagen PNG', extensions: ['png'] }],
      title: 'Guardar imagen',
    });
  }
  downloadBlob(new Blob([bytes], { type: mime }), safeName(suggestedName));
  return { canceled: false, path: suggestedName, downloaded: true };
}

export async function openImageFile() {
  if (desktop && desktop.isDesktop) return desktop.openImage();
  const file = await pickFile('image/*');
  if (!file) return { canceled: true };
  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  return { canceled: false, dataUrl, name: file.name };
}

export async function toggleFullscreen() {
  if (desktop && desktop.isDesktop) return desktop.toggleFullscreen();
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch { /* el navegador puede bloquearlo */ }
  return !!document.fullscreenElement;
}

export async function appInfo() {
  if (desktop && desktop.isDesktop && desktop.appInfo) return desktop.appInfo();
  return { version: '1.0.0', browser: true };
}

export async function checkForUpdates() {
  if (desktop && desktop.isDesktop && desktop.checkUpdates) return desktop.checkUpdates();
  return {
    status: 'browser',
    currentVersion: '1.0.0',
    message: 'Las actualizaciones automáticas están disponibles en la aplicación de escritorio.',
  };
}

export async function installUpdate() {
  if (desktop && desktop.isDesktop && desktop.installUpdate) return desktop.installUpdate();
  return { ok: false, reason: 'browser', message: 'Instala la versión de escritorio para actualizar automáticamente.' };
}

export async function cancelUpdate() {
  if (desktop && desktop.isDesktop && desktop.cancelUpdate) return desktop.cancelUpdate();
  return { ok: false };
}

export function onUpdateProgress(callback) {
  if (desktop && desktop.isDesktop && desktop.onUpdateProgress) return desktop.onUpdateProgress(callback);
  return () => {};
}

export async function openReleasesPage() {
  if (desktop && desktop.isDesktop && desktop.openReleases) return desktop.openReleases();
  window.open('https://github.com/otaplus/3DCreator/releases', '_blank', 'noopener');
  return { ok: true };
}

export function displayPath(filePath) {
  if (!filePath) return '';
  const parts = String(filePath).split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
}

export function isDesktopApp() {
  return !!(desktop && desktop.isDesktop);
}
