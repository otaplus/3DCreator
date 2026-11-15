import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, 'dist');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  outfile: path.join(out, 'app.js'),
  format: 'iife',
  target: ['chrome120'],
  minify: true,
  sourcemap: false,
  loader: { '.json': 'json' },
  logLevel: 'info',
  define: { 'process.env.NODE_ENV': '"production"' },
});

await cp(path.join(root, 'src/index.html'), path.join(out, 'index.html'));
await cp(path.join(root, 'src/styles.css'), path.join(out, 'styles.css'));
await cp(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });
await cp(path.join(root, 'build/icon-256.png'), path.join(out, 'assets/icon-256.png')).catch(() => {});
await cp(path.join(root, 'build/icon.png'), path.join(out, 'assets/icon.png')).catch(() => {});

console.log('✔ Aplicación compilada en dist/');
