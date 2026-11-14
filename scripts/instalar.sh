#!/usr/bin/env bash
# Instala Creador 3D para el usuario actual, sin permisos de administrador.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$HOME/Applications"
APP_PATH="$APP_DIR/Creador3D.AppImage"
DESKTOP_DIR="$HOME/.local/share/applications"
DESKTOP_FILE="$DESKTOP_DIR/creador-3d.desktop"
ICON_DIR="$HOME/.local/share/icons/hicolor/512x512/apps"
ICON_PATH="$ICON_DIR/creador-3d.png"
BIN_DIR="$HOME/.local/bin"
BIN_PATH="$BIN_DIR/creador-3d"
FORCE_BUILD=0

for arg in "$@"; do
  case "$arg" in
    --build|--reconstruir) FORCE_BUILD=1 ;;
    -h|--help)
      cat <<'AYUDA'
Uso: scripts/instalar.sh [opciones]

Opciones:
  --build, --reconstruir  Vuelve a crear el AppImage antes de instalar.
  -h, --help              Muestra esta ayuda.

El programa queda instalado en ~/Applications/Creador3D.AppImage y aparece
en el menú de aplicaciones como «Creador 3D». No necesita sudo.
AYUDA
      exit 0
      ;;
    *)
      echo "Opción desconocida: $arg (usa --help para ver las opciones)" >&2
      exit 1
      ;;
  esac
done

say() { printf '\n\033[1;36m%s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m%s\033[0m\n' "$*"; }

fail() {
  printf '\033[1;31mError: %s\033[0m\n' "$*" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail "Falta Node.js. Instálalo desde https://nodejs.org (versión 18 o superior)."
command -v npm >/dev/null 2>&1 || fail "Falta npm. Suele venir junto con Node.js."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Se necesita Node.js 18 o superior. Tienes $(node -v)."
fi

cd "$ROOT"

if [ ! -d node_modules ] || [ ! -d node_modules/electron ]; then
  say "Instalando dependencias (solo la primera vez)…"
  if [ -f package-lock.json ]; then
    npm ci --no-audit --no-fund || npm install --no-audit --no-fund
  else
    npm install --no-audit --no-fund
  fi
fi

find_appimage() {
  find "$ROOT/release" -maxdepth 1 -type f -name '*.AppImage' -print 2>/dev/null | sort | head -n 1
}

APPIMAGE="$(find_appimage)"
NEEDS_BUILD=0
if [ "$FORCE_BUILD" -eq 1 ]; then
  NEEDS_BUILD=1
elif [ -z "$APPIMAGE" ]; then
  NEEDS_BUILD=1
elif [ -n "$(find "$ROOT/src" "$ROOT/electron" "$ROOT/assets" "$ROOT/build" "$ROOT/package.json" "$ROOT/build.mjs" -newer "$APPIMAGE" -print -quit 2>/dev/null)" ]; then
  warn "El AppImage es más antiguo que el código: se volverá a crear."
  NEEDS_BUILD=1
fi

if [ "$NEEDS_BUILD" -eq 1 ]; then
  say "Creando el paquete AppImage… (puede tardar un par de minutos)"
  npm run dist
  APPIMAGE="$(find_appimage)"
fi

[ -n "$APPIMAGE" ] && [ -f "$APPIMAGE" ] || fail "No se encontró ningún AppImage en release/. Ejecuta: npm run dist"

say "Instalando Creador 3D…"
mkdir -p "$APP_DIR" "$DESKTOP_DIR" "$ICON_DIR" "$BIN_DIR"

# Copia atómica para no dejar una instalación a medias.
cp -f "$APPIMAGE" "$APP_PATH.nuevo"
chmod 0755 "$APP_PATH.nuevo"
mv -f "$APP_PATH.nuevo" "$APP_PATH"

if [ -f "$ROOT/build/icon-512.png" ]; then
  install -m 0644 "$ROOT/build/icon-512.png" "$ICON_PATH"
fi

cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Version=1.0
Name=Creador 3D
GenericName=Estudio de creación 3D
Comment=Crea, pinta y decora modelos 3D con plantillas, doodles y stickers
Exec="$APP_PATH" %U
Icon=creador-3d
Terminal=false
Categories=Graphics;3DGraphics;
Keywords=3D;modelar;pintar;dibujar;crear;niños;Paint;
StartupNotify=true
StartupWMClass=creador-3d
EOF
chmod 0644 "$DESKTOP_FILE"

# Lanzador opcional desde la terminal.
ln -sf "$APP_PATH" "$BIN_PATH"

if command -v desktop-file-validate >/dev/null 2>&1; then
  desktop-file-validate "$DESKTOP_FILE" >/dev/null 2>&1 || warn "El archivo .desktop tiene avisos, pero la aplicación sigue instalada."
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" >/dev/null 2>&1 || true
fi

say "¡Listo! Creador 3D ya está instalado."
printf '  Aplicación: %s\n' "$APP_PATH"
printf '  Menú:       «Creador 3D» (categoría Gráficos)\n'
printf '  Terminal:   creador-3d  (si ~/.local/bin está en el PATH)\n'
printf '\nPuedes borrarlo después con: npm run uninstall:local\n'
