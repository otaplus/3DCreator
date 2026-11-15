/**
 * Prueba visual automatizada.
 *
 * Lanza la app en modo captura, ejecuta un pequeño guion dentro de la
 * ventana y guarda una captura y los mensajes de consola en la carpeta
 * indicada por C3D_TEST_DIR (por defecto /tmp/opencode/c3d-test).
 *
 * Uso:
 *   npm run test:ui
 *   C3D_TEST_SCRIPT=/ruta/guion.js npm run test:ui
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const outDir = process.env.C3D_TEST_DIR || '/tmp/opencode/c3d-test';
fs.mkdirSync(outDir, { recursive: true });

// Perfil temporal limpio: las pruebas no deben tocar las creaciones reales.
const testProfile = path.join(require('node:os').tmpdir(), 'creador-3d-test-profile');
fs.rmSync(testProfile, { recursive: true, force: true });

const defaultScript = `
(async () => {
  const api = window.__C3D__;
  if (!api) return { ok: false, error: 'API de pruebas no disponible' };
  const stats = api.getStats();
  return { ok: true, stats, title: document.title };
})()
`;

if (!process.env.C3D_TEST_SCRIPT) {
  const scriptPath = path.join(outDir, 'smoke.js');
  fs.writeFileSync(scriptPath, defaultScript, 'utf8');
  process.env.C3D_TEST_SCRIPT = scriptPath;
}
process.env.C3D_TEST = '1';
process.env.C3D_TEST_DIR = outDir;
if (!process.env.C3D_TEST_SHOT) process.env.C3D_TEST_SHOT = 'shot.png';

const electronBin = require('electron');
const child = spawn(electronBin, [root, '--no-sandbox'], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  const shot = path.join(outDir, process.env.C3D_TEST_SHOT);
  const consoleFile = path.join(outDir, 'console.json');
  let failed = code !== 0;
  if (!fs.existsSync(shot)) {
    console.error('✖ No se generó la captura en', shot);
    failed = true;
  }
  if (fs.existsSync(consoleFile)) {
    try {
      const logs = JSON.parse(fs.readFileSync(consoleFile, 'utf8'));
      const errors = logs.filter((l) => l.level >= 3);
      if (errors.length) {
        console.error('✖ Errores de consola:');
        for (const err of errors) console.error('  ', err.message);
        failed = true;
      } else {
        console.log('✔ Sin errores de consola');
      }
    } catch (err) {
      console.error('✖ No se pudo leer console.json:', err.message);
      failed = true;
    }
  }
  const resultFile = path.join(outDir, 'result.json');
  if (fs.existsSync(resultFile)) {
    console.log('Resultado:', fs.readFileSync(resultFile, 'utf8'));
  }
  console.log(failed ? '✖ Prueba visual con problemas' : '✔ Prueba visual completada');
  process.exit(failed ? 1 : 0);
});
