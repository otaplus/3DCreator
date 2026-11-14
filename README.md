# Creador 3D

Un estudio de creación 3D para Linux, en español y pensado para que cualquiera —también un niño de 12 años— pueda empezar a crear sin instrucciones complicadas. Está inspirado en Paint 3D, pero no necesita cuenta, conexión a internet ni conocimientos de modelado.

![Hecho con Electron y Three.js](https://img.shields.io/badge/Electron%20%2B%20Three.js-3D-6c5ce7) ![Idioma: español](https://img.shields.io/badge/Idioma-espa%C3%B1ol-ff8a5c) ![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-17c3a2)

## Qué puedes hacer

- **Empezar con una plantilla:** casa, robot, coche, cohete, gato, unicornio, árbol, castillo, dinosaurio, avión, muñeco de nieve y flor. Cada pieza se puede seleccionar, pintar y cambiar por separado.
- **Añadir formas:** 12 primitivas (cubo, esfera, cilindro, cono, dona, cápsula, pirámide, prisma, estrella, corazón, diamante y rampa), todas redimensionables.
- **Pintar en 3D:** pinta directamente sobre los objetos con pincel o borrador, elige colores, patrones y materiales (mate, satinado, brillante, metal, cristal y neón).
- **Dibujar en el aire:** crea tubos 3D con la herramienta Doodle.
- **Decorar:** añade stickers con emojis o sube tus propias imágenes, y escribe texto 3D con tildes y eñes.
- **Editor de dibujo 2D:** dibuja con pincel, rellena el fondo, añade stickers y texto, quita el fondo mágicamente y lleva el dibujo a la escena como un objeto 3D.
- **Mover, girar y escalar:** con un gizmo de flechas, anillos y cuadros; también puedes duplicar, borrar y cambiar de color.
- **Cambiar la escena:** seis ambientes (estudio, atardecer, océano, bosque, espacio y nieve), suelo, cuadrícula y vistas de cámara.
- **Guardar sin miedo:** autoguardado en el equipo, deshacer y rehacer, y proyectos `.c3d` que puedes abrir cuando quieras.
- **Exportar:** imagen PNG, modelo GLB, modelo OBJ o modelo STL para imprimir en 3D.
- **Sonidos suaves y ayuda integrada**, con una interfaz grande, colorida y en español.

## Requisitos

- Linux de 64 bits (probado en Linux Mint 22.3 X11).
- Node.js 18 o superior y npm para ejecutarlo desde el código.
- Unos 900 MB libres para dependencias y compilación; la aplicación instalada ocupa unos 130 MB.
- No hace falta tarjeta gráfica dedicada; funciona con aceleración por software.

## Ejecutarlo desde el código

```bash
cd 3DCreator
npm install
npm start
```

`npm start` compila la interfaz y abre la aplicación de escritorio. Para desarrollo con las herramientas de Chromium:

```bash
npm run dev
```

## Instalarlo en el menú de aplicaciones

El instalador no usa `sudo`: crea el AppImage, lo copia a `~/Applications` y añade el lanzador y el icono para tu usuario.

```bash
npm run install:local
```

Al terminar, busca **Creador 3D** en el menú de aplicaciones (categoría Gráficos) o ejecuta `creador-3d` en una terminal si `~/.local/bin` está en tu `PATH`.

- Aplicación: `~/Applications/Creador3D.AppImage`
- Lanzador: `~/.local/share/applications/creador-3d.desktop`
- Icono: `~/.local/share/icons/hicolor/512x512/apps/creador-3d.png`

Para reconstruir el AppImage antes de instalar:

```bash
bash scripts/instalar.sh --build
```

Para desinstalarlo (tus archivos `.c3d` no se tocan):

```bash
npm run uninstall:local
```

Si además quieres borrar el autoguardado y la caché de la app, usa `bash scripts/desinstalar.sh --borrar-datos` y confirma escribiendo `SI`.

## Crear el AppImage a mano

```bash
npm run dist
```

El resultado queda en `release/Creador 3D-1.0.0.AppImage`. Es un único archivo ejecutable: puedes copiarlo a un pendrive, darle permisos de ejecución y abrirlo en otro Linux compatible.

```bash
chmod +x "release/Creador 3D-1.0.0.AppImage"
"./release/Creador 3D-1.0.0.AppImage"
```

> Si el sistema no tiene FUSE 2, el AppImage se puede abrir con `--appimage-extract-and-run`.

## Usar sin instalar (modo navegador)

La interfaz también funciona abriendo `dist/index.html` en un navegador moderno, sin Electron. En ese modo no hay diálogos nativos de archivo: las descargas y la apertura de proyectos usan las funciones del navegador. Para generarlo:

```bash
npm run build
```

## Atajos de teclado

| Acción | Atajo |
| --- | --- |
| Elegir / seleccionar | `V` |
| Mover / girar / escalar | `G` / `R` / `S` |
| Herramientas de la barra | `1` … `9` |
| Duplicar lo seleccionado | `Ctrl` + `D` |
| Borrar lo seleccionado | `Supr` |
| Deshacer | `Ctrl` + `Z` |
| Rehacer | `Ctrl` + `Mayús` + `Z` o `Ctrl` + `Y` |
| Guardar proyecto | `Ctrl` + `S` |
| Abrir proyecto | `Ctrl` + `O` |
| Cerrar diálogo / quitar selección | `Esc` |
| Pantalla completa | `F11` |

Con el ratón: arrastra con el botón izquierdo para girar la vista, usa la rueda para acercar o alejar y el botón derecho para desplazarte.

## Formatos de archivo

| Formato | Para qué sirve |
| --- | --- |
| `.c3d` | Proyecto completo de Creador 3D (escena, pintura, materiales y cámara). Se abre con **Abrir**. |
| `.png` | Foto de la escena en 1920 × 1200, con stickers y fondo. |
| `.glb` | Modelo 3D con materiales y texturas, para otros programas y motores de juegos. |
| `.obj` | Formato 3D clásico de geometría y materiales básicos. |
| `.stl` | Geometría binaria lista para laminar e imprimir en 3D. |

Los stickers e imágenes decorativas se incluyen en el PNG, pero no en los modelos 3D exportados.

## Dónde se guarda todo

- El **autoguardado** vive en el almacenamiento local de la aplicación (`~/.config/creador-3d`). Al volver a abrirla, tu última creación aparece sola.
- Los proyectos `.c3d` y las exportaciones se guardan donde tú elijas.
- No hay cuentas, servidores ni telemetría: todo se queda en tu equipo.

## Estructura del proyecto

```
3DCreator/
├── src/                 Interfaz, escena Three.js y herramientas
│   ├── main.js          Arranque, UI, selección, pintura, historial y pruebas
│   ├── shapes.js        Primitivas, materiales, texto, stickers y doodles
│   ├── templates.js     Las 12 plantillas y sus piezas
│   ├── textures.js      Paleta, patrones, emojis y capa de pintura UV
│   ├── project.js       Serialización y restauración de proyectos
│   ├── exporters.js     Exportación GLB, OBJ, STL y PNG
│   ├── editor2d.js      Editor de dibujo 2D y recorte mágico de fondo
│   └── io.js            Archivos nativos (Electron) o descargas (navegador)
├── electron/            Ventana de escritorio, IPC y pruebas automáticas
├── assets/fonts/        Fuente 3D con tildes y eñes
├── build/               Iconos de la aplicación
├── scripts/             Instalador, desinstalador y utilidades
├── dist/                Resultado de la compilación (se genera)
└── release/             AppImage y paquete Linux (se genera)
```

## Pruebas

```bash
npm run test:ui
```

El comando compila la app, la abre en Electron, recorre plantillas, formas, pintura, doodles, texto, deshacer/rehacer, guardado, exportaciones y el editor 2D, y escribe capturas y un informe en `/tmp/opencode/c3d-test`. También se puede abrir `dist/index.html` directamente para comprobar el modo navegador.

## Problemas frecuentes

- **El AppImage no arranca:** comprueba que tiene permisos de ejecución (`chmod +x`) y que FUSE 2 está instalado. Como alternativa, ejecútalo con `--appimage-extract-and-run`.
- **La ventana se ve pequeña:** el tamaño mínimo es 1080 × 680; usa `F11` para pantalla completa o maximiza la ventana.
- **Va lento en un equipo antiguo:** baja el tamaño de la ventana, oculta la cuadrícula y evita el ambiente de nieve, que tiene más partículas.
- **Quiero empezar de cero:** usa **Nueva creación**. La escena anterior se puede recuperar con `Ctrl` + `Z` mientras no cierres la aplicación.
- **He borrado algo sin querer:** pulsa `Ctrl` + `Z`. El historial guarda muchos pasos y nada es definitivo.

## Licencia

MIT. Hecho con cariño para crear, aprender y divertirse.
