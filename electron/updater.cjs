// Actualizador de Creador 3D basado en GitHub Releases.
// Solo instala AppImages y comprueba la huella SHA-256 publicada por GitHub.
const { app, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { spawn } = require('node:child_process');

const OWNER = 'otaplus';
const REPO_NAME = '3DCreator';
const RELEASES_URL = `https://github.com/${OWNER}/${REPO_NAME}/releases`;
const LATEST_API = `https://api.github.com/repos/${OWNER}/${REPO_NAME}/releases/latest`;
const USER_AGENT = `Creador3D/${app.getVersion()} (Linux)`;

let abortController = null;
let installing = false;

function normalizeVersion(value) {
  return String(value || '').trim().replace(/^v/i, '');
}

function parseVersion(value) {
  const match = normalizeVersion(value).match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] || '',
  };
}

function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) {
    if (pa.numbers[i] !== pb.numbers[i]) return pa.numbers[i] > pb.numbers[i] ? 1 : -1;
  }
  if (pa.prerelease === pb.prerelease) return 0;
  if (!pa.prerelease) return 1;
  if (!pb.prerelease) return -1;
  return pa.prerelease.localeCompare(pb.prerelease);
}

function isNewer(candidate, current) {
  return compareVersions(candidate, current) > 0;
}

function getAppImagePath() {
  const candidate = process.env.APPIMAGE;
  if (!candidate || !path.isAbsolute(candidate)) return null;
  return candidate;
}

function canSelfUpdate() {
  return process.platform === 'linux' && Boolean(getAppImagePath());
}

function friendlyNetworkError(err) {
  if (err && err.name === 'AbortError') return 'La conexión con GitHub tardó demasiado.';
  const text = String(err && err.message ? err.message : err);
  if (/ENOTFOUND|EAI_AGAIN|fetch failed/i.test(text)) {
    return 'No se pudo conectar con GitHub. Revisa tu conexión a internet.';
  }
  if (/rate limit|403/i.test(text)) {
    return 'GitHub ha limitado las consultas por ahora. Inténtalo más tarde.';
  }
  return text || 'No se pudo comprobar si hay actualizaciones.';
}

function cleanNotes(body) {
  return String(body || '')
    .replace(/\r/g, '')
    .replace(/[`*_>#]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 10)
    .join('\n')
    .slice(0, 1400);
}

function pickAsset(assets) {
  return (assets || []).find((asset) => /\.AppImage$/i.test(asset.name || ''))
    || (assets || []).find((asset) => /\.AppImage$/i.test(asset.browser_download_url || ''))
    || null;
}

async function githubJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await net.fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    });
    if (response.status === 404) return { notFound: true, status: 404 };
    if (!response.ok) {
      const message = response.status === 403
        ? 'rate limit'
        : `GitHub respondió con el código ${response.status}.`;
      throw new Error(message);
    }
    return { data: await response.json() };
  } finally {
    clearTimeout(timer);
  }
}

async function checkForUpdates() {
  const currentVersion = app.getVersion();
  try {
    const result = await githubJson(LATEST_API);
    if (result.notFound) {
      return {
        status: 'no-releases',
        currentVersion,
        releasesUrl: RELEASES_URL,
        canInstall: canSelfUpdate(),
      };
    }

    const release = result.data || {};
    const latestVersion = normalizeVersion(release.tag_name || release.name);
    if (!parseVersion(latestVersion)) {
      return {
        status: 'error',
        currentVersion,
        message: 'La última versión publicada no tiene un número válido.',
        releasesUrl: RELEASES_URL,
      };
    }

    const asset = pickAsset(release.assets);
    const base = {
      currentVersion,
      latestVersion,
      releaseName: release.name || `Creador 3D v${latestVersion}`,
      releaseUrl: release.html_url || RELEASES_URL,
      publishedAt: release.published_at || null,
      notes: cleanNotes(release.body),
      canInstall: canSelfUpdate(),
    };

    if (!isNewer(latestVersion, currentVersion)) {
      return { ...base, status: 'current' };
    }
    if (!asset) {
      return { ...base, status: 'no-asset' };
    }
    return {
      ...base,
      status: 'available',
      assetName: asset.name,
      assetUrl: asset.browser_download_url,
      size: Number(asset.size) || 0,
      digest: asset.digest || '',
      downloadCount: Number(asset.download_count) || 0,
    };
  } catch (err) {
    return {
      status: 'error',
      currentVersion,
      message: friendlyNetworkError(err),
      releasesUrl: RELEASES_URL,
    };
  }
}

async function downloadAndInstall(onProgress = () => {}) {
  if (installing) return { ok: false, reason: 'busy', message: 'Ya hay una actualización en curso.' };

  const appImagePath = getAppImagePath();
  if (!appImagePath) {
    return {
      ok: false,
      reason: 'not-appimage',
      message: 'La actualización automática solo está disponible en la versión AppImage instalada.',
    };
  }

  const check = await checkForUpdates();
  if (check.status !== 'available') {
    return { ok: false, reason: check.status, check };
  }
  if (!check.assetUrl) {
    return { ok: false, reason: 'no-asset', check };
  }
  if (!check.digest) {
    return {
      ok: false,
      reason: 'no-checksum',
      check,
      message: 'La versión nueva no incluye una firma de seguridad. Descárgala desde GitHub.',
    };
  }

  const dir = path.dirname(appImagePath);
  const partPath = path.join(dir, `.Creador3D-${check.latestVersion}.part`);
  const targetPath = appImagePath;
  installing = true;
  abortController = new AbortController();

  const report = (payload) => {
    try { onProgress({ ...payload, version: check.latestVersion }); } catch { /* la ventana puede estar cerrándose */ }
  };

  try {
    await fsp.access(dir, fs.constants.W_OK);
    await fsp.rm(partPath, { force: true });

    report({ phase: 'downloading', downloaded: 0, total: check.size, percent: 0 });
    const response = await net.fetch(check.assetUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: abortController.signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`No se pudo descargar la actualización (HTTP ${response.status}).`);
    }

    const total = Number(response.headers.get('content-length')) || check.size || 0;
    const hash = crypto.createHash('sha256');
    let received = 0;
    let lastReport = 0;

    const meter = new Transform({
      transform(chunk, _encoding, callback) {
        hash.update(chunk);
        received += chunk.length;
        const now = Date.now();
        if (now - lastReport > 150) {
          lastReport = now;
          report({
            phase: 'downloading',
            downloaded: received,
            total,
            percent: total ? Math.min(100, Math.round((received / total) * 100)) : 0,
          });
        }
        callback(null, chunk);
      },
    });

    await pipeline(Readable.fromWeb(response.body), meter, fs.createWriteStream(partPath));

    report({ phase: 'verifying', downloaded: received, total, percent: 100 });
    const expected = String(check.digest).replace(/^sha256:/i, '').toLowerCase();
    const actual = hash.digest('hex');
    if (actual !== expected) {
      await fsp.rm(partPath, { force: true }).catch(() => {});
      throw new Error('La descarga no coincide con la firma de seguridad. No se instaló nada.');
    }

    await fsp.chmod(partPath, 0o755);
    report({ phase: 'installing', downloaded: received, total, percent: 100 });
    await fsp.rename(partPath, targetPath);
    report({ phase: 'ready', downloaded: received, total, percent: 100 });

    return { ok: true, version: check.latestVersion, path: targetPath };
  } catch (err) {
    await fsp.rm(partPath, { force: true }).catch(() => {});
    if (err && err.name === 'AbortError') {
      return { ok: false, reason: 'cancelled', message: 'Actualización cancelada.' };
    }
    return { ok: false, reason: 'error', message: friendlyNetworkError(err) };
  } finally {
    installing = false;
    abortController = null;
  }
}

function cancelDownload() {
  if (abortController) abortController.abort();
  return { ok: true };
}

function launchUpdatedApp(appImagePath) {
  const env = { ...process.env };
  // El AppImage antiguo deja variables apuntando a su montaje temporal.
  for (const key of ['APPIMAGE', 'APPDIR', 'ARGV0', 'OWD', 'LD_LIBRARY_PATH', 'LD_PRELOAD', 'DESKTOPINTEGRATION']) {
    delete env[key];
  }
  const child = spawn(appImagePath, [], {
    detached: true,
    stdio: 'ignore',
    cwd: app.getPath('home'),
    env,
  });
  child.unref();
}

module.exports = {
  checkForUpdates,
  downloadAndInstall,
  cancelDownload,
  launchUpdatedApp,
  canSelfUpdate,
  getReleasesUrl: () => RELEASES_URL,
  compareVersions,
  REPO: `${OWNER}/${REPO_NAME}`,
};
