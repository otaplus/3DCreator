# Creador 3D

Un estudio de creación 3D para **Linux y Windows**, en español y pensado para que cualquiera —también un niño de 12 años— pueda empezar a crear sin instrucciones complicadas. Toma lo mejor de Paint 3D para seleccionar y transformar objetos, y añade una línea de tiempo con fotogramas clave inspirada en Blender para animarlos. No necesita cuenta, conexión a internet ni conocimientos de modelado.

![Hecho con Electron y Three.js](https://img.shields.io/badge/Electron%20%2B%20Three.js-3D-6c5ce7) ![Linux y Windows](https://img.shields.io/badge/Linux%20%2B%20Windows-escritorio-17c3a2) ![Idioma: español](https://img.shields.io/badge/Idioma-espa%C3%B1ol-ff8a5c) ![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-17c3a2)

## Descargar e instalar

### Windows

Descarga el instalador para **Windows 10/11 de 64 bits**:

**[Creador3D-1.0.0-Setup.exe](https://github.com/otaplus/3DCreator/releases/download/windows-1.0.0/Creador3D-1.0.0-Setup.exe)** · [todas las versiones](https://github.com/otaplus/3DCreator/releases)

El instalador se instala para el usuario actual, crea accesos en el escritorio y el menú Inicio y no necesita Node.js ni permisos de administrador. No está firmado digitalmente: si Windows SmartScreen muestra un aviso, pulsa **Más información → Ejecutar de todos modos**.

### Linux

En Linux puedes ejecutarlo desde el código con `npm start`, crear e instalar el AppImage con `npm run install:local`, o abrir la interfaz en el navegador. Los detalles están más abajo.

## Qué puedes hacer

- **Empezar con una plantilla:** casa, robot, coche, cohete, gato, unicornio, árbol, castillo, dinosaurio, avión, muñeco de nieve, muñeca, muñeco y flor. Cada pieza se puede seleccionar, pintar y cambiar por separado.
- **Añadir formas:** 12 primitivas (cubo, esfera, cilindro, cono, dona, cápsula, pirámide, prisma, estrella, corazón, diamante y rampa), todas redimensionables.
- **Pintar en 3D:** pinta directamente sobre los objetos con pincel o borrador, elige colores, patrones y materiales (mate, satinado, brillante, metal, cristal y neón).
- **Dibujar en el aire:** crea tubos 3D con la herramienta Doodle.
- **Decorar:** añade pegatinas con emojis o tus propias imágenes **sobre la superficie de los objetos**; se quedan pegadas, se mueven con el objeto y puedes arrastrarlas por encima para colocarlas. También puedes escribir texto 3D con tildes y eñes.
- **Editor de dibujo 2D:** dibuja con pincel, rellena el fondo, añade stickers y texto, quita el fondo mágicamente y lleva el dibujo a la escena como un objeto 3D.
- **Seleccionar y transformar como en Paint 3D:** arrastra con el botón izquierdo en el vacío para dibujar un recuadro y elegir varios objetos; el botón central (rueda) gira la vista. Al seleccionar aparece una **caja 2D** con 8 cuadraditos para redimensionar y cuatro círculos: **Z arriba**, **X derecha**, **Y abajo** y **profundidad a la izquierda**. Mantén `Shift` al girar para ajustar a 15°.
- **Editar como en Paint 3D:** cortar, copiar, pegar, girar 90° a izquierda/derecha, espejo horizontal, espejo vertical, agrupar y separar. Con varios objetos elegidos, todo se transforma como si fuera uno solo.
- **Animar con línea de tiempo:** fotogramas clave de posición, giro, tamaño y visibilidad; reproducción con bucle, velocidad y auto-clave; pistas por objeto; control de **FPS**; navegación fotograma a fotograma; **fotogramas en blanco** para espaciar la animación y claves que se arrastran en el tiempo.
- **Cambiar la escena:** seis ambientes (estudio, atardecer, océano, bosque, espacio y nieve), suelo, cuadrícula y vistas de cámara.
- **Guardar sin miedo:** autoguardado en el equipo, deshacer y rehacer, y proyectos `.c3d` que puedes abrir cuando quieras (también guardan la animación).
- **Exportar:** imagen PNG, modelo GLB, modelo OBJ, modelo STL para imprimir en 3D o un vídeo WebM de la animación.
- **Sonidos suaves y ayuda integrada**, con una interfaz grande, colorida y en español.

## Requisitos

- Linux de 64 bits (probado en Linux Mint 22.3 X11) o **Windows 10/11 de 64 bits**.
- Node.js 18 o superior y npm solo si ejecutas desde el código o compilas; los instaladores no los necesitan.
- Unos 900 MB libres para dependencias y compilación; la aplicación instalada ocupa unos 130-200 MB.
- No hace falta tarjeta gráfica dedicada; funciona con aceleración por software.

## Ejecutarlo desde el código

Funciona en Linux y en Windows (PowerShell o CMD):

```bash
git clone https://github.com/otaplus/3DCreator.git
cd 3DCreator
npm install
npm start
```

`npm start` compila la interfaz y abre la aplicación de escritorio. Para desarrollo con las herramientas de Chromium:

```bash
npm run dev
```

## Instalarlo en Linux (AppImage)

El instalador no usa `sudo`: crea el AppImage, lo copia a `~/Applications` y añade el lanzador y el icono para tu usuario. Para abrir el AppImage necesitas FUSE 2.

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

## Instalarlo en Windows

Descarga el instalador desde [Releases](https://github.com/otaplus/3DCreator/releases) o directamente:

**[Creador3D-1.0.0-Setup.exe](https://github.com/otaplus/3DCreator/releases/download/windows-1.0.0/Creador3D-1.0.0-Setup.exe)**

- Windows 10/11 de 64 bits.
- Se instala para el usuario actual y crea accesos en el escritorio y el menú Inicio; no necesita permisos de administrador.
- Tus proyectos y el autoguardado se guardan en `%APPDATA%\creador-3d` y se conservan al desinstalar.
- El instalador no está firmado: si SmartScreen avisa, pulsa **Más información → Ejecutar de todos modos**.
- Para desinstalar: **Configuración → Aplicaciones → Creador 3D**.
- SHA-256 del instalador: `7f87e2e5b588b6cdcf792c2ccab72964cdbb00e5e981040613bd6cf716ab74f0`.

La publicación de Windows está marcada como **pre-release** porque el instalador aún no tiene firma de código.

## Crear el AppImage de Linux a mano

```bash
npm run dist
```

El resultado queda en `release/Creador 3D-1.0.0.AppImage`. Es un único archivo ejecutable: puedes copiarlo a un pendrive, darle permisos de ejecución y abrirlo en otro Linux compatible.

```bash
chmod +x "release/Creador 3D-1.0.0.AppImage"
"./release/Creador 3D-1.0.0.AppImage"
```

> Si el sistema no tiene FUSE 2, el AppImage se puede abrir con `--appimage-extract-and-run`.

## Crear el instalador de Windows

En un equipo Windows con Node.js:

```bash
npm install
npm run dist:win
```

El resultado queda en `release/Creador3D-1.0.0-Setup.exe` y no está firmado digitalmente.

También puedes lanzar el workflow **Build Windows installer** desde la pestaña **Actions** de GitHub (o con `gh workflow run build-windows.yml`) y descargar el artefacto `creador-3d-windows`. Compilar NSIS desde Linux requiere Wine; lo más sencillo es usar Windows o GitHub Actions.

## Usar sin instalar (modo navegador)

La interfaz también funciona en Linux y Windows abriendo `dist/index.html` en un navegador moderno, sin Electron. En ese modo no hay diálogos nativos de archivo: las descargas y la apertura de proyectos usan las funciones del navegador. Para generarlo:

```bash
npm run build
```

## Atajos de teclado

| Acción | Atajo |
| --- | --- |
| Elegir / seleccionar | `V` |
| Mover / girar / escalar con el gizmo clásico | `G` / `R` / `S` |
| Herramientas de la barra | `1` … `9` |
| Elegir todo | `Ctrl` + `A` |
| Copiar / cortar / pegar | `Ctrl` + `C` / `Ctrl` + `X` / `Ctrl` + `V` |
| Duplicar lo seleccionado | `Ctrl` + `D` |
| Agrupar / separar | `Ctrl` + `G` / `Ctrl` + `Mayús` + `G` |
| Mover lo elegido con las flechas | `←` `→` `↑` `↓` |
| Enfocar la cámara en lo elegido | `F` |
| Reproducir o pausar la animación | `Espacio` |
| Añadir un fotograma clave | `K` |
| Borrar lo seleccionado | `Supr` |
| Deshacer | `Ctrl` + `Z` |
| Rehacer | `Ctrl` + `Mayús` + `Z` o `Ctrl` + `Y` |
| Guardar proyecto | `Ctrl` + `S` |
| Abrir proyecto | `Ctrl` + `O` |
| Cerrar diálogo / quitar selección | `Esc` |
| Pantalla completa | `F11` |

Con el ratón: **arrastra en el vacío con el botón izquierdo para dibujar un recuadro y seleccionar varios objetos**, y arrastra un objeto para moverlo arriba/abajo e izquierda/derecha. El **botón central** (rueda) gira la vista, la rueda acerca o aleja y el botón derecho desplaza. Al elegir un objeto aparece la caja 2D de Paint 3D: los cuadraditos redimensionan, el círculo **Z** de arriba gira en el plano, el **X** de la derecha inclina, el **Y** de abajo gira a izquierda/derecha y el círculo **izquierdo** cambia la profundidad. En el panel de propiedades tienes además **girar 90°**, **espejo H/V**, **cortar/copiar/pegar** y **agrupar**. Con `Ctrl` o `Mayús` y un clic añades o quitas objetos de la selección.

## Animar en cuatro pasos

1. Elige un objeto y pulsa **Animar** en la barra superior. Aparece la línea de tiempo.
2. Con el cabezal en `0 s`, pulsa **◆ Clave**. Ese es el primer fotograma.
3. Mueve el cabezal a otro segundo, mueve, gira o escala el objeto y pulsa otra vez **◆ Clave**.
4. Pulsa **Espacio** para verlo. Puedes arrastrar las claves, borrarlas con doble clic, activar **Auto** para que se graben solas o exportar **Animación WebM** desde el menú **Exportar**. En la barra inferior tienes **FPS**, el campo **Fotograma**, los botones **⏮ ◀ ▶ ⏭**, **◆ Clave**, **+ Fotograma** (añade un fotograma en blanco al final) y **Blanco** (inserta un fotograma en blanco en la posición actual y desplaza el resto).

La animación se guarda dentro del proyecto `.c3d` y del autoguardado; también entra en el historial de deshacer.

## Formatos de archivo

| Formato | Para qué sirve |
| --- | --- |
| `.c3d` | Proyecto completo de Creador 3D (escena, pintura, materiales, cámara y animación). Se abre con **Abrir**. |
| `.png` | Foto de la escena en 1920 × 1200, con stickers y fondo. |
| `.glb` | Modelo 3D con materiales y texturas, para otros programas y motores de juegos. |
| `.obj` | Formato 3D clásico de geometría y materiales básicos. |
| `.stl` | Geometría binaria lista para laminar e imprimir en 3D. |
| `.webm` | Vídeo de la animación, con la cámara y los fotogramas clave actuales. |

Los stickers e imágenes decorativas se incluyen en el PNG y en el vídeo WebM, pero no en los modelos 3D exportados.

## Dónde se guarda todo

- El **autoguardado** vive en el almacenamiento local de la aplicación. En Linux está en `~/.config/creador-3d`; en Windows, en `%APPDATA%\creador-3d`. Al volver a abrirla, tu última creación aparece sola.
- Los proyectos `.c3d` y las exportaciones se guardan donde tú elijas.
- No hay cuentas, servidores ni telemetría: todo se queda en tu equipo.

## Actualizaciones

- **Linux (AppImage):** la aplicación integra un actualizador que consulta GitHub Releases y descarga el nuevo AppImage.
- **Windows:** descarga el instalador nuevo desde [Releases](https://github.com/otaplus/3DCreator/releases). La actualización automática integrada está pensada para el AppImage de Linux; en Windows se instala la versión nueva encima de la anterior.

## Estructura del proyecto

```
3DCreator/
├── .github/workflows/   Compilación automática del instalador de Windows
├── src/                 Interfaz, escena Three.js y herramientas
│   ├── main.js          Arranque, UI, selección, pintura, historial y pruebas
│   ├── animation.js     Motor de animación: pistas, claves e interpolación
│   ├── manipulator.js   Caja 2D, giros Z/X/Y, profundidad y redimensionado
│   ├── timeline.js      Línea de tiempo, FPS, fotogramas y edición de claves
│   ├── shapes.js        Primitivas, materiales, texto, stickers y doodles
│   ├── templates.js     Las 14 plantillas y sus piezas
│   ├── textures.js      Paleta, patrones, emojis y capa de pintura UV
│   ├── project.js       Serialización y restauración de proyectos
│   ├── exporters.js     Exportación GLB, OBJ, STL y PNG
│   ├── editor2d.js      Editor de dibujo 2D y recorte mágico de fondo
│   └── io.js            Archivos nativos (Electron) o descargas (navegador)
├── electron/            Ventana de escritorio, IPC, actualizador y pruebas
├── assets/fonts/        Fuente 3D con tildes y eñes
├── build/               Iconos de la aplicación (PNG e ICO)
├── scripts/             Instalador de Linux y utilidades
├── dist/                Resultado de la compilación (se genera)
└── release/             AppImage de Linux e instalador de Windows (se genera)
```

## Pruebas

```bash
npm run test:ui
```

El comando compila la app, la abre en Electron, recorre plantillas, formas, pintura, doodles, texto, deshacer/rehacer, guardado, exportaciones y el editor 2D, y escribe capturas y un informe en la carpeta temporal del sistema: `/tmp/opencode/c3d-test` en Linux y `%TEMP%\opencode\c3d-test` en Windows. Puedes cambiarla con `C3D_TEST_DIR`. La API interna `window.__C3D__` también permite probar la selección múltiple, el manipulador, los fotogramas clave y la reproducción. Las pruebas usan un perfil temporal aparte, así que no tocan tus creaciones guardadas. También se puede abrir `dist/index.html` directamente para comprobar el modo navegador.

## Problemas frecuentes

- **Windows SmartScreen avisa al abrir el instalador:** es porque aún no está firmado digitalmente. Pulsa **Más información → Ejecutar de todos modos**.
- **El AppImage no arranca:** comprueba que tiene permisos de ejecución (`chmod +x`) y que FUSE 2 está instalado. Como alternativa, ejecútalo con `--appimage-extract-and-run`.
- **No aparecen actualizaciones automáticas en Windows:** es normal; descarga el instalador nuevo desde [Releases](https://github.com/otaplus/3DCreator/releases).
- **La ventana se ve pequeña:** el tamaño mínimo es 1080 × 680; usa `F11` para pantalla completa o maximiza la ventana.
- **Va lento en un equipo antiguo:** baja el tamaño de la ventana, oculta la cuadrícula y evita el ambiente de nieve, que tiene más partículas.
- **Quiero empezar de cero:** usa **Nueva creación**. La escena anterior se puede recuperar con `Ctrl` + `Z` mientras no cierres la aplicación.
- **He borrado algo sin querer:** pulsa `Ctrl` + `Z`. El historial guarda muchos pasos y nada es definitivo.

## Licencia

MIT. Hecho con cariño para crear, aprender y divertirse.
