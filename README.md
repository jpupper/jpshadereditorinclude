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

En **cualquier página** que tenga el include, la tecla <kbd>S</kbd> abre el panel de control. **No hay que agregar ni un `div` a la página**: el HTML del include es sólo el `<script>`, y el engine construye el canvas, el HUD, el panel, las listas, los sliders y el buscador.

### 🔒 Autenticación con FSCAuth (Protección por defecto)
- **Para cambiar el fondo o abrir el panel:** Por defecto, el usuario debe haber iniciado sesión con su cuenta de **FSCAuth**.
- **Si el usuario no está logueado:** Al pulsar <kbd>S</kbd> (o hacer click en el badge HUD), se abre un modal emergente que indica que se requiere inicio de sesión con FSCAuth y un botón directo que redirige a `https://fullscreencode.com/fscauth/login.html`. Al completar el login, el usuario vuelve a la página y el panel se abre automáticamente.
- **VISITANTES PÚBLICOS (Sin fricción):** Si en el sitio quedó guardado o fijado un shader/composición, **se renderiza siempre libremente** para cualquier visitante público. La autenticación sólo se exige para *abrir el panel o cambiar la configuración/fondo*.
- **Desactivar exigencia:** Si en desarrollo no se desea login, se puede usar `data-auth="0"` en la etiqueta `<script>`.

### Las 5 pestañas del panel

| Pestaña | Qué hace | Se aplica como |
|---|---|---|
| **SHADERS** | Galería completa de shaders (autor, pases, miniatura) | `data-shader` |
| **NODE PRESETS** | Composiciones del nodeeditor (cajas, autor, miniatura) | `data-comp` (+ `data-pass`) |
| **PERFORMANCE** | Sesiones guardadas de performance (nombre, usuario) | `data-performance` |
| **WEBSITES** | **Gestor de sitios web asociados**: lista qué usuario/owner registró cada sitio, filtros (Todos vs. Mis sitios), botón para vincular el sitio actual a tu usuario, registrar nuevos dominios y asignar fondos | — |
| **CONFIG** | Ajustes del include: HUD badge [S], contador FPS, transparencia, refresco automático y reset de caché | — |

- **Buscador directo por nombre** (filtra la pestaña activa; ignora mayúsculas y acentos).
- Cada tarjeta: **Usar** (le pone ese fondo a la página) y **↗** (abre la fuente en el editor).
- **Link directo**: pegá cualquier link de salida y aplicá con **Enter** o con el botón.
  Detecta solo el tipo:
  ```
  /jpshadereditor/nodeeditor.html?output=1&comp=nodeeditor-0857&pass=ndlf4r28qv
  /jpshadereditor/shader.html?shader=vuelapelucas-fondo
  /jpshadereditor/performanceoutput.html?session=jpupper_mnhy0m84
  ```
- **Calibración en vivo por shader y por nodo:** Podés mover los sliders de uniforms y de cada nodo de la composición en tiempo real; los cambios se aplican inmediatamente sobre la página y se guardan con **💾 Guardar calibración para esta página**.
- **fuente actual**: muestra el link de la fuente en uso con un botón **↗ ir al link**.
- **cómo se usa**: el `<script>` listo con la fuente elegida y un botón **Copiar script**.
- Estado real: fuente, valor, pase, cantidad de pases, FPS y errores.

Lo elegido queda guardado en el servidor (`include_pages`) y en `localStorage` (`jpsi:config`), de modo que sobrevive al F5. El orden de prioridad es:

```
?comp= / ?shader= / ?session= en la URL  →  fuente FIJADA en servidor  →  data-* del <script>  →  localStorage
```

Eso significa que **podés compartir un link** `https://tu-pagina/?shader=vuelapelucas-fondo`
y el fondo cambia sin tocar el código.

### HUD

**Por defecto NO se muestra nada**: una página que sólo tiene el include queda **limpia**
(así lo pidió el dueño del sistema). Existe un badge chiquito
(`✦ jpshadereditorInclude · N fps · [S]`) que se activa con **`data-hud="1"`** — útil en
desarrollo para ver que el engine cargó — y se apaga con el `✕` (queda recordado). El panel
(tecla `S`) funciona igual: **sólo el panel muestra interfaz**.

**Rendimiento (02-Oct-2026).** Abrir el panel pedía los 3 catálogos a Mongo y podía tardar
**de 15 s a minutos** si Atlas se ponía lento (y el panel quedaba vacío). Ahora: el server los
sirve **cacheados** (memoria + snapshot en disco, 45 s) y se **precalienta solo** al arrancar,
el engine los pide **de a uno y empezando por la pestaña activa**, y la lista de composiciones
ya **no manda el grafo** (`boxes`, que eran 616 de los 622 KB). Medido en un navegador real:
página 156 ms · panel 49 ms · catálogo de shaders 84 ms · composiciones 43 ms.
Las miniaturas son **URLs de Cloudflare R2** (nunca base64 en la base) y el preview de una
tarjeta **sólo se renderiza al pasar el mouse**, de a una: no se "indexa" ninguna preview.

**Fondo FIJADO y base caída (02-Oct-2026).** Una página cuyo fondo está fijado **sólo en el
server** (su HTML no declara `data-*`, ej. `vuelapelucas3000.com.ar`) no puede depender de la
base para arrancar: si el registro tardaba (Atlas en un bache) la página **quedaba sin fondo**.
Ahora el registro sirve la fuente fijada desde el **caché** (memoria + snapshot en disco), el
engine aplica el **pin guardado en `localStorage`** al instante —sin esperar al server— y
reintenta una vez si la respuesta no llega. Probado con Mongo inalcanzable: la página carga
igual.

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

## Uniforms y MAPEOS de eventos (nuevo — 10-Oct-2026)

Con el panel abierto (**tecla `S`**) hay dos secciones nuevas, las dos **por página**:

### 1. `uniforms de la fuente`

Un control por cada uniform que declara la fuente (shader / composición / performance),
con el **mismo módulo de controles que el editor** (`js/lib/uniform-controls.js`):

| tipo | controles posibles (se elige en el selector de cada fila) |
|---|---|
| `float` / `int` | slider |
| `bool` | **switch** o **bang** (pulso) |
| `vec2` | **pad XY** o 2 sliders |
| `vec3` | color picker o 3 sliders |
| `vec4` | color + alpha o 4 sliders |

Los valores **se ven al instante** (se suben al pase que declara el uniform) y con
**💾 Guardar uniforms** quedan en el servidor para todos los visitantes.
**Restablecer** vuelve a los valores que trae la fuente.

### 2. `mapeos: eventos de la página → uniforms`

Cada fila dice: **cuando pasa este evento**, **este uniform va de `desde` a `hasta`**.

```
[evento ▾]  [uniform]   desde  hasta  [curva ▾]  suav  [✓]  0.42 → 0.76  [✕]
   scroll      drag        0     1.8    suave     0.15        (en vivo)
```

| evento | qué entrega (0 → 1) |
|---|---|
| `scroll` / `scrollY` | scroll vertical de la página (`scrollX` = horizontal) |
| `visible` | progreso de un elemento (selector CSS): 1 = centrado en pantalla |
| `mouseX` / `mouseY` | puntero (0 = arriba/izquierda) |
| `down` | mouse/touch apretado (0 / 1) |
| `click` | pulso 1 → 0 (decae en ~0.45 s) |
| `time` | reloj cíclico (período configurable, 8 s) |
| `tiltX` / `tiltY` | inclinación del teléfono |
| `random` | ruido suave, siempre vivo |

Extras por fila: **curva** (`lineal`, `suave`, `acelera al final`, `frena al final`,
`suave en los dos`), **suavizado** (`0` = directo, `0.9` = muy sedoso) y **activo**.
El campo `uniform` acepta una componente: `u_pos.x`, `u_drag.y`…
El numerito de la derecha muestra **valor del evento → valor escrito** en vivo.

**Ejemplo (el caso real):** `sancarlopoliroso4` es el fondo de artedigitaldata y su
`uniform float drag` mueve el arrastre del shader. Para que suba al scrollear:

```
scroll → drag,  desde 0,  hasta 1.8,  curva suave,  suavizado 0.15   → 💾 Guardar mapeos
```

**Dónde se guarda:** config de la **página** (no del shader), en el servidor
(`include_pages` → `uniforms` / `uniformFormats` / `mappings`) y espejada en
`localStorage` (`jpsi:uni:<clave de página>`) para que arranque al instante. El
registro (`/api/include/register`) las devuelve y el engine las aplica solo: sobrevive
al F5, vale para todos los visitantes y **el mismo shader puede tener otro `drag` en otra
página** (que es lo que hace falta: es un comportamiento de la página, no del shader).

**Arranque limpio (semilla estable).** El shader usa `fxrand` para sortear su posición
inicial. La semilla es **una por carga de página** y el motor **no rearma** un plan que no
cambió (aunque el pedido sea forzado): antes se volvía a sortear en cada aplicación del plan
y al cargar hay más de una (registro → fuente fijada → primer refresco), así que se veía un
fotograma con una posición y al siguiente la corregida. Tampoco se dibuja mientras se rearma.

**API nueva** (consola):

```js
JPShaderInclude.uniforms();                    // valores puestos desde el panel
JPShaderInclude.setUniform('drag', 1.2);       // o 'u_pos.x'
JPShaderInclude.mappings();                    // los mapeos
JPShaderInclude.addMapping('scroll', 'drag', 0, 1.8, { curva: 'smooth', suav: 0.15 });
JPShaderInclude.setMappings([{ evento: 'visible', uniform: 'u_reveal', sel: '#seccion2', desde: 0, hasta: 1 }]);
JPShaderInclude.sources();                     // lectura actual de los eventos (debug)
JPShaderInclude.saveConfig();                  // guarda todo para esta página
```

**Backend:** `POST /api/include/page-config` (público, CORS `*`, como el register):
body `{ key, uniforms?, uniformFormats?, mappings? }` — sólo pisa lo que viene.

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
JPShaderInclude.openPanel();                          // abre el panel (pide login FSCAuth si no está logueado)
JPShaderInclude.closePanel();                         // cierra el panel
JPShaderInclude.isOpen();                             // boolean: panel abierto?

// FSCAuth
JPShaderInclude.user();                               // usuario logueado en FSCAuth (o '')
JPShaderInclude.isLoggedIn();                         // boolean: está logueado en FSCAuth?
JPShaderInclude.login();                              // redirige al login de FSCAuth SSO
JPShaderInclude.logout();                             // cierra la sesión de FSCAuth

// Nodos y calibración
JPShaderInclude.nodes();                              // lista de pases/nodos del plan con sus params y uniforms
JPShaderInclude.setNodeUniform(passId, 'speed', 1.5); // setea uniform de un nodo específico
JPShaderInclude.calibrations();                       // calibraciones por fuente de esta página
```

---

## Atributos del `<script>`

| Atributo | Default | Qué hace |
|---|---|---|
| `data-comp` | — | composición del nodeeditor a renderizar |
| `data-pass` | `output` de la composición | caja que se ve de fondo |
| `data-shader` | — | un shader de la galería (por nombre) |
| `data-performance` | — | el output de una sesión de performance (por sessionId) |
| `data-auth` | `1` | `0` desactiva la exigencia de estar logueado en FSCAuth para cambiar fondo/abrir panel |
| `data-base` | se deduce del `src` | base del app (si lo servís desde otro host) |
| `data-front` | el front público | base de las páginas del editor (los links que abre el panel) |
| `data-refresh` | `20` | segundos entre chequeos de cambios (`0` = no chequear) |
| `data-bpm` | `120` | BPM global |
| `data-panel` | `1` | `0` desactiva el panel (tecla `S`) |
| `data-hud` | `0` | `1` muestra el badge de abajo a la derecha (por defecto **no**; una página con el include queda limpia) |
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


* * *

## Modo STANDALONE (sin backend)

`engine/` tiene el **motor de shaders** —los mismos archivos que sirve el editor:
`jp-pointers.js`, `jp-node-graph.js`, `uniform-types.js`, `webglrenderer.js`— más
`jp-standalone-boot.js`, que monta un **PLAN ya resuelto** y lo anima.

Un *plan* es lo que devuelve `GET /jpshadereditor/api/include/plan?shader=…`
(pases con su GLSL completo, uniforms, orden y pase visible). Se guarda como
`plans/<algo>.json` **una vez** y después no hace falta backend nunca más.

```
standalone.html?plan=plans/tekweek-v15.json      ← demo incluida
```

- `standalone.html` carga `engine/*.js` + el plan y renderiza (servilo por http,
  con `file://` el `fetch` del plan está bloqueado).
- Para un **archivo único** que abra con doble click: exportá el HTML autocontenido
  (motor + plan incrustados) desde el editor → **SAVE → Exportar → ⬇ HTML standalone**,
  o por API:

```
GET https://vps-4455523-x.dattaweb.com/jpshadereditor/api/export/standalone?shader=<nombre>&download=1
GET …?comp=<nombre>[&pass=<uid>]      GET …?performance=<id>
```

Ese HTML no hace ni una petición de red: anda en `file://`, en el FTP, en un pendrive.

### En el panel del include

- **RED** muestra si contesta el **VPS** (`WEB ●/○`) y el **server local**
  (`LOCAL ●/○`): se les pega `/api/include/info` a los dos con 2,5 s de tope.
- Botón **STANDALONE**: la página queda **sólo con el shader** (desaparecen
  ASSETS, USO, FONDO, CÓMO SE USA y CALIBRACIÓN). El plan queda guardado en
  `localStorage` (`jpsi:standalonePlan`) y se reusa aunque el backend esté caído.
- **SYNC desde WEB / SYNC desde LOCAL**: trae la última versión del shader desde
  el backend elegido y la guarda como plan por defecto del standalone.
