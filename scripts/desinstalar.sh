#!/usr/bin/env bash
# Desinstala Creador 3D del usuario actual. No toca los archivos del proyecto.
set -euo pipefail

APP_PATH="$HOME/Applications/Creador3D.AppImage"
DESKTOP_FILE="$HOME/.local/share/applications/creador-3d.desktop"
ICON_PATH="$HOME/.local/share/icons/hicolor/512x512/apps/creador-3d.png"
BIN_PATH="$HOME/.local/bin/creador-3d"
DELETE_DATA=0

for arg in "$@"; do
  case "$arg" in
    --borrar-datos) DELETE_DATA=1 ;;
    -h|--help)
      cat <<'AYUDA'
Uso: scripts/desinstalar.sh [--borrar-datos]

Opciones:
  --borrar-datos  Borra también el guardado automático y la caché de la app
                  (~/.config/creador-3d). Esta acción no se puede deshacer.
  -h, --help      Muestra esta ayuda.

Sin opciones solo quita el programa, el lanzador y el icono. Tus archivos
.c3d y los proyectos que hayas exportado no se tocan nunca.
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

if [ "$DELETE_DATA" -eq 1 ]; then
  printf '\033[1;33mSe borrará también el guardado automático en %s\033[0m\n' "$HOME/.config/creador-3d"
  printf 'Escribe SI para continuar: '
  read -r respuesta
  if [ "$respuesta" != "SI" ]; then
    echo "Cancelado. No se borró nada."
    exit 0
  fi
fi

say "Quitando Creador 3D…"
rm -f "$BIN_PATH" "$DESKTOP_FILE" "$ICON_PATH" "$APP_PATH"
rmdir "$HOME/Applications" 2>/dev/null || true

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" >/dev/null 2>&1 || true
fi

if [ "$DELETE_DATA" -eq 1 ]; then
  rm -rf "$HOME/.config/creador-3d"
  printf 'También se borraron los datos locales de la aplicación.\n'
fi

say "Creador 3D se ha desinstalado."
printf 'Tus archivos .c3d y las imágenes exportadas siguen donde los guardaste.\n'
