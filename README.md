# jpshadereditorInclude

**Un `<script>` en el header y tu página tiene de fondo una composición hecha con el nodeeditor.**
En vivo, y **se actualiza sola**: si volvés a guardar la composición en el nodeeditor, la página
que la embebe la toma al instante.

> ⚠️ Esta carpeta es **sólo el front de ejemplo**: su `index.html` no tiene más que el
> `<script>` del engine (ni un `div`, ni un `.js` propio). El sistema de verdad vive en el
> **backend** de jpshadereditor: el servidor resuelve la fuente a un *plan de render* y el
> engine embebido únicamente lo aplica. Toda la interfaz (panel, pestañas, buscador, HUD)
> la construye el engine.

---

## Salida limpia (player) para otras apps

Si lo que necesitás es un fondo/salida **sin ninguna interfaz** (para meterlo en un iframe, en
un sistema de proyección, en un secuenciador, etc.) usá el player del repo del editor:

```
https://vps-4455523-x.dattaweb.com/jpshadereditor/include-player.html?shader=vuelapelucas-fondo
      &base=https%3A%2F%2Fvps-4455523-x.dattaweb.com%2Fjpshadereditor     ← absoluta, obligatoria si la página va proxeada
```

Acepta `?shader=` / `?comp=[&pass=]` / `?session=`. Panel desactivado (una tecla no puede abrir
un panel encima de la salida). El LidarGrid del lidar lo usa así: cada shader/composición/
performance es una FUENTE que se arrastra a una celda y se proyecta con esta página.

⚠ Si la página que embebe el player la **proxea** un servidor (así lo hace el lidar para
inyectarle los eventos del lidar), los parámetros de la fuente quedan dentro de `?url=` y
`location.origin` NO es el del editor: por eso el player parsea la url interna y la base va
absoluta en `&base=`.

## Uso (30 segundos)

Pegá esto en el `<head>` de cualquier página:

```html
<script src="https://vps-4455523-x.dattaweb.com/jpshadereditor/include.js"
        data-comp="nodeeditor-0857"
        data-pass="ndlf4r28qv"></script>
```

> ⚠️ **El `src` apunta al BACKEND (VPS), no a `fullscreencode.com`.**
> El front de `fullscreencode.com` es Apache/estático y el engine lo sirve Node:
> `fullscreencode.com/jpshadereditor/include.js` da **404**. El engine manda
> `Access-Control-Allow-Origin: *`, así que se puede embeber desde cualquier dominio
> (incluido `fullscreencode.com`).

### Las 3 fuentes que acepta (se elige con el link / el atributo)

| Fuente | Atributo | Link del que se saca |
|---|---|---|
| **Composición del NodeEditor** | `data-comp="<nombre>"` (+ `data-pass`) | `nodeeditor.html?output=1&comp=<nombre>&pass=<uid>` |
| **Un shader de la galería** | `data-shader="<nombre>"` | `shader.html?shader=<nombre>` |
| **Output de una sesión de performance** | `data-performance="<sesionId>"` | `performanceoutput.html?session=<sesionId>` |

```html
<!-- un shader suelto (1 o varios pases: si tiene buffers, el backend los arma solo) -->
<script src="…/include.js" data-shader="vuelapelucas-fondo"></script>

<!-- el stack de capas de una sesion de performance (blend modes incluidos) -->
<script src="…/include.js" data-performance="jpupper_mnhy0m84"></script>
```

- `data-comp` → composición guardada en el nodeeditor.
- `data-pass` → uid de la caja que se ve de fondo (opcional; si falta, usa el `output`).
- `data-shader` → nombre del shader en la galería (`shader.html?shader=…`).
- `data-performance` → id de la sesión (`performanceoutput.html?session=…`).

La **sesión de performance** se renderiza tal como quedó guardada: una capa por fila
(con su opacidad y su blend mode, los 25 de siempre), usando el paso en el que estaba
cada fila (`currentStep`). No reproduce el timeline/transiciones ni los FX por celda.

Y ya está. No hay que programar nada más: el engine crea el canvas, carga el renderer,
pide el plan, lo renderiza y se mantiene al día.

---

## Panel (tecla `S`) — toda la interfaz la arma el engine

En **cualquier página** que tenga el include, la tecla <kbd>S</kbd> abre el panel. **No hay que
agregar ni un `div` a la página**: el HTML del include es sólo el `<script>`, y el engine
construye el canvas, el HUD, el panel, las listas y el buscador.

El panel tiene **3 pestañas indexadas con miniatura**, para elegir la fuente de un click:

| Pestaña | Qué lista | Se aplica como |
|---|---|---|
| **SHADERS** | la galería completa (nombre, autor, pases, miniatura) | `data-shader` |
| **NODE PRESETS** | las composiciones guardadas en el nodeeditor (título, autor, cajas) | `data-comp` (+ `data-pass`) |
| **PERFORMANCE** | las sesiones guardadas del modo performance (nombre, usuario) | `data-performance` |

- **Buscador directo por nombre** (filtra la pestaña activa; ignora mayúsculas y acentos).
- Cada tarjeta: **Usar** (le pone ese fondo a la página) y **↗** (abre la fuente en el editor).
- **Link directo**: pegá cualquier link de salida y aplicá con **Enter** o con el botón.
  Detecta solo el tipo:
  ```
  /jpshadereditor/nodeeditor.html?output=1&comp=nodeeditor-0857&pass=ndlf4r28qv
  /jpshadereditor/shader.html?shader=vuelapelucas-fondo
  /jpshadereditor/performanceoutput.html?session=jpupper_mnhy0m84
  ```
  (o el nombre con prefijo: `shader:miShader` · `perf:jpupper_xxx` · `comp:miComp`;
  un nombre pelado se toma como composición; tolera comillas y espacios).
- **fuente actual**: muestra el link de la fuente en uso con un botón **↗ ir al link**.
- **cómo se usa**: el `<script>` listo con la fuente elegida y un botón **Copiar script**.
- Estado real: fuente, valor, pase, cantidad de pases, FPS y errores.

Lo elegido queda guardado en `localStorage` (`jpsi:config`), así la próxima vez la página
arranca con esa fuente. El orden de prioridad es:

```
?comp= / ?shader= / ?session= en la URL  →  data-* del <script>  →  panel / localStorage
```

Eso significa que **podés compartir un link** `https://tu-pagina/?shader=vuelapelucas-fondo`
y el fondo cambia sin tocar el código.

### HUD

Abajo a la derecha hay un badge chiquito (`✦ jpshadereditorInclude · N fps · [S]`) — así una
página que sólo tiene el `<script>` no queda "vacía" y se ve que hay un panel. Se apaga con
`data-hud="0"` o con el `✕` (queda recordado).

---

## 📌 El fondo de cada PÁGINA se guarda en el servidor (y se trackea)

**El problema que resuelve.** El panel ya guardaba la elección en `localStorage`, pero una
página que trae `data-comp` / `data-shader` en el `<script>` tiene una fuente **explícita**, y
esa gana sobre lo guardado: aplicabas un fondo, apretabas **F5** y volvía la fuente del HTML.
Ahora lo elegido se fija **en el servidor, por página**.

**Cómo funciona:**

1. **Cada carga se registra.** Al arrancar, el engine se presenta en
   `POST /api/include/register` con su identidad: `host + path` (o `data-page="alias"`, o
   `?page=alias`), el título, qué **declara** su HTML y qué fondo está **usando**. Nada más.
2. **Aplicar un fondo lo fija para esa página** ("esta página va a usar SIEMPRE esto"). Queda
   en la DB: sobrevive al F5, **vale para todos los visitantes** y pisa el `data-*` del HTML.
   El botón **💾 Guardar para esta página** hace lo mismo sin cambiar la fuente, y **Soltar**
   vuelve a lo que declara el HTML.
3. **El server manda.** Al cargar, la respuesta del registro incluye la fuente fijada (si hay)
   y el engine la aplica antes de pedir el plan. El orden de prioridad queda:
   ```
   ?comp= / ?shader= / ?performance= en la URL   (override manual, para probar)
     → fuente FIJADA en el servidor para esta página
     → data-* del <script>
     → localStorage
   ```
4. **En vivo, sin recargar.** El engine se une a un room de socket
   (`includePageHello {key}`) y el server le empuja `includePageUpdate`: si el admin cambia el
   fondo de esa página, la página lo cambia al instante.

**Panel del admin** (`jpshadereditor/admin.html` → pestaña **INCLUDE**): la lista de páginas
que usan el include, con **de dónde se conectan** (host, IP, user-agent, visitas, última vez),
qué declara su HTML, qué fondo están usando y **cuál está fijado** — con un selector para
fijar/cambiar/soltar la fuente de cada una (se aplica en vivo) y un 🗑️ para olvidar una página.

**Consola:** `JPShaderInclude.pageInfo()` (clave, declarado, en uso, fijado, registro del
server) · `JPShaderInclude.pin()` / `.unpin()` · `JPShaderInclude.register(true)`.

Backend: colección `include_pages` · `POST /api/include/register` (público) ·
`GET|POST /api/include/pages` y `DELETE /api/include/pages/:key` (admin).

> Atributo nuevo: **`data-page="alias"`** — clave linda y estable para la página (si no, se usa
> `host + path`). Útil cuando la URL cambia (subcarpetas, `index.html`, etc.).

---

## API desde consola / desde JS

```js
JPShaderInclude.setLink('/jpshadereditor/shader.html?shader=vuelapelucas-fondo'); // detecta el tipo solo
JPShaderInclude.setSource('shader', 'vuelapelucas-fondo');  // 'shader' | 'performance' | 'comp'
JPShaderInclude.setSource('performance', 'jpupper_mnhy0m84');
JPShaderInclude.setSource('comp', 'nodeeditor-0857', 'ndlf4r28qv');
JPShaderInclude.set('nodeeditor-0857', 'ndlf4r28qv');       // atajo = setSource('comp', …)
JPShaderInclude.clear();                              // lo saca
JPShaderInclude.reload();                             // fuerza recargar el plan
JPShaderInclude.state();                              // { ready, fuente, valor, passes, order, canvas, err }
JPShaderInclude.config();                             // configuración efectiva
JPShaderInclude.renderer();                           // el WebGLRenderer (para tocar uniforms en vivo)
JPShaderInclude.setBpm(128);                          // BPM global del shader
JPShaderInclude.openPanel();                          // abre el panel (igual que la tecla S)
```

---

## Atributos del `<script>`

| Atributo | Default | Qué hace |
|---|---|---|
| `data-comp` | — | composición del nodeeditor a renderizar |
| `data-pass` | `output` de la composición | caja que se ve de fondo |
| `data-shader` | — | un shader de la galería (por nombre) |
| `data-performance` | — | el output de una sesión de performance (por sessionId) |
| `data-base` | se deduce del `src` | base del app (si lo servís desde otro host) |
| `data-front` | el front público | base de las páginas del editor (los links que abre el panel) |
| `data-refresh` | `20` | segundos entre chequeos de cambios (`0` = no chequear) |
| `data-bpm` | `120` | BPM global |
| `data-panel` | `1` | `0` desactiva el panel (tecla `S`) |
| `data-hud` | `1` | `0` no muestra el badge de abajo a la derecha |
| `data-keep-bg` | `0` | `1` no toca el fondo del `body` (si tu CSS ya lo maneja) |
| `data-fps` | `1` | `0` no actualiza el contador de FPS del panel |
| `data-max-dpr` | `2` | tope de devicePixelRatio (calidad vs. performance) |
| `data-debug` | `0` | `1` loguea en consola lo que va haciendo |

---

## Cómo funciona (reparto backend / front)

```
   ┌──────────── PÁGINA DEL USUARIO ────────────┐
   │ <script src="…/include.js" data-*=…>       │
   │   └─ engine (front): canvas + loop + panel │
   └───────────────┬────────────────────────────┘
                   │ GET /api/include/plan?comp=…   (o ?shader=… / ?performance=…)
                   ▼
   ┌──────────── BACKEND (jpshadereditor) ──────┐
   │ · lee de Mongo (composición | shader | sesión) │
   │ · resuelve a GLSL FINAL:                    │
   │     composición: header de globales + common│
   │       + wrapper mainImage + iChannel        │
   │     shader: MISMO header que usa el editor  │
   │       (js/lib/jp-shader-header.js)          │
   │     performance: pase por capa + pase de    │
   │       compositing con los blend modes       │
   │       compartidos (js/lib/jp-blend-glsl.js) │
   │ · calcula orden de pases, alias de samplers │
   │   y valores de uniforms                     │
   │ · devuelve el plan ya listo                 │
   └─────────────────────────────────────────────┘
```


El navegador **no arma ningún grafo**: recibe `passes[]` con el `source` GLSL final,
los `inputs`, los `aliases` y los `uniforms`, y los carga con el **mismo `WebGLRenderer`
del editor** (objeto reusado, no reimplementado).

**Una sola fuente de verdad del grafo:** `public/js/lib/jp-node-graph.js`. Lo usan los dos
lados — el nodeeditor (para el fondo y los previews) y el servidor (para el plan). Si cambia
la forma de armar el GLSL, cambia en un solo lugar y el front embebido queda siempre igual
al render del nodeeditor.

**Auto-actualización:** cada `data-refresh` segundos el engine vuelve a pedir el plan; si la
composición cambió (fecha de modificación, orden de pases o valores de uniforms), recompila
y sigue. No hay que tocar la página.

### Endpoints (backend)

| Endpoint | Para qué |
|---|---|
| `GET /jpshadereditor/include.js` | el engine embebible (cache 60 s + `stale-while-revalidate`) |
| `GET /jpshadereditor/api/include/plan?comp=&pass=` | la composición resuelta a plan de render |
| `GET /jpshadereditor/api/include/info` | versión del engine + base (cache-busting) |

> Este front de ejemplo se publica en el FTP estático (`fullscreencode.com/jpshadereditorinclude/`).
> El backend **no** lo sirve: sólo expone el engine y el plan.

---

## Probar en local

```bash
cd D:/Programacion/sistemasfullscreen/jpshaderszone/jpshadereditor
node server.js                 # localhost:3250 (necesita Mongo)
```

Después abrí **este `index.html`**: si lo servís en `localhost` apunta al server de desarrollo
(`localhost:3250/jpshadereditor`); si lo abrís con doble click (`file://`) apunta directo al
backend del VPS. En los dos casos el backend manda `Access-Control-Allow-Origin: *`, así que
funciona cross-origin sin configurar nada.

Para probar el engine **local contra la DB real sin publicar**: levantá el proxy de
`tmp/uitest/serve_engine_test.js` (sirve el `include.js` de tu disco y proxea el resto al VPS)
y hacé `node tmp/uitest/test_include_panel_v3.js`.

---

## Problemas comunes

| Síntoma | Causa / solución |
|---|---|
| Fondo negro, sin error | la composición no tiene cajas renderizables, o `data-comp` está mal escrito |
| `include.js` da **404** y no aparece el fondo ni el panel (`S`) | estás pidiendo el engine a `fullscreencode.com` (Apache, estático). Tiene que apuntar al **backend del VPS**: `https://vps-4455523-x.dattaweb.com/jpshadereditor/include.js` |
| `Composición no encontrada` | el nombre no coincide con el guardado (mirá el panel, lista las reales) |
| No se ve nada y el body quedó de color | tu CSS pinta el `body` con `!important`: usá `data-keep-bg="1"` y hacé el fondo transparente vos |
| Anda en local pero no en producción | el `include.js` de producción es viejo: se actualiza solo (cache 60 s) — refrescá con Ctrl+F5 |
| Un shader con cámara no muestra video | el navegador pide permiso de cámara; los sitios necesitan HTTPS para `getUserMedia` |
