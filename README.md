# jpshadereditorInclude

**Un `<script>` en el header y tu página tiene de fondo una composición hecha con el nodeeditor.**
En vivo, y **se actualiza sola**: si volvés a guardar la composición en el nodeeditor, la página
que la embebe la toma al instante.

> ⚠️ Esta carpeta es **sólo el front de ejemplo**. El sistema de verdad vive en el
> **backend** de jpshadereditor: el servidor resuelve la composición a un *plan de render*
> y el engine embebido únicamente lo aplica.

---

## Uso (30 segundos)

Pegá esto en el `<head>` de cualquier página:

```html
<script src="https://fullscreencode.com/jpshadereditor/include.js"
        data-comp="nodeeditor-0857"
        data-pass="ndlf4r28qv"></script>
```

- `data-comp` → nombre de la composición guardada en el nodeeditor (obligatorio).
- `data-pass` → uid de la caja que se ve de fondo (opcional; si falta, usa el `output` de la composición).

Y ya está. No hay que programar nada más: el engine crea el canvas, carga el renderer,
pide el plan, lo renderiza y se mantiene al día.

---

## Panel secreto (tecla `S`)

En **cualquier página** que tenga el include, la tecla <kbd>S</kbd> abre un panel donde podés:

- **Pegar el link de salida del nodeeditor** y aplicarlo a esa página al instante.
  ```
  /jpshadereditor/nodeeditor.html?output=1&comp=nodeeditor-0857&pass=ndlf4r28qv
  ```
  (también acepta sólo el nombre de la composición).
- Ver las **composiciones guardadas** y cambiar de una a otra con un click.
- Copiar el **`<script>` listo** para pegar en la página.
- Ver el estado real: composición, pase, cantidad de pases, FPS y errores.

Lo elegido queda guardado en `localStorage` (`jpsi:config`), así la próxima vez la página
arranca con esa composición. El orden de prioridad es:

```
?comp= en la URL de la página  →  data-comp del <script>  →  panel / localStorage
```

Eso significa que **podés compartir un link** `https://tu-pagina/?comp=nodeeditor-0857&pass=ndlf4r28qv`
y el fondo cambia sin tocar el código.

---

## API desde consola / desde JS

```js
JPShaderInclude.set('nodeeditor-0857', 'ndlf4r28qv'); // cambia el fondo
JPShaderInclude.clear();                              // lo saca
JPShaderInclude.reload();                             // fuerza recargar el plan
JPShaderInclude.state();                              // { ready, fps, comp, pass, passes, order, canvas, err }
JPShaderInclude.config();                             // configuración efectiva
JPShaderInclude.renderer();                           // el WebGLRenderer (para tocar uniforms en vivo)
JPShaderInclude.setBpm(128);                          // BPM global del shader
JPShaderInclude.openPanel();                          // abre el panel (igual que la tecla S)
```

---

## Atributos del `<script>`

| Atributo | Default | Qué hace |
|---|---|---|
| `data-comp` | — | composición a renderizar |
| `data-pass` | `output` de la composición | caja que se ve de fondo |
| `data-base` | se deduce del `src` | base del app (si lo servís desde otro host) |
| `data-refresh` | `20` | segundos entre chequeos de cambios (`0` = no chequear) |
| `data-bpm` | `120` | BPM global |
| `data-panel` | `1` | `0` desactiva el panel secreto |
| `data-keep-bg` | `0` | `1` no toca el fondo del `body` (si tu CSS ya lo maneja) |
| `data-fps` | `1` | `0` no actualiza el contador de FPS del panel |
| `data-max-dpr` | `2` | tope de devicePixelRatio (calidad vs. performance) |
| `data-debug` | `0` | `1` loguea en consola lo que va haciendo |

---

## Cómo funciona (reparto backend / front)

```
   ┌──────────── PÁGINA DEL USUARIO ────────────┐
   │ <script src="…/include.js" data-comp=…>    │
   │   └─ engine (front): canvas + loop + panel │
   └───────────────┬────────────────────────────┘
                   │ GET /api/include/plan?comp=…&pass=…
                   ▼
   ┌──────────── BACKEND (jpshadereditor) ──────┐
   │ · lee la composición de Mongo               │
   │ · resuelve el grafo → GLSL FINAL:           │
   │     header de globales + common + wrapper   │
   │     de mainImage + iChannel inyectados      │
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
| `GET /jpshadereditor/jpshadereditorinclude/` | **este** front de ejemplo, servido por el app |

---

## Probar en local

```bash
cd D:/Programacion/sistemasfullscreen/jpshadereditor
node server.js                 # localhost:3250
```

Luego abrí `http://localhost:3250/jpshadereditor/jpshadereditorinclude/`
(el `index.html` detecta el host solo y apunta al server local).

También funciona abriendo el `index.html` con doble click (`file://`), porque el backend
manda `Access-Control-Allow-Origin: *`.

---

## Problemas comunes

| Síntoma | Causa / solución |
|---|---|
| Fondo negro, sin error | la composición no tiene cajas renderizables, o `data-comp` está mal escrito |
| `Composición no encontrada` | el nombre no coincide con el guardado (mirá el panel, lista las reales) |
| No se ve nada y el body quedó de color | tu CSS pinta el `body` con `!important`: usá `data-keep-bg="1"` y hacé el fondo transparente vos |
| Anda en local pero no en producción | el `include.js` de producción es viejo: se actualiza solo (cache 60 s) — refrescá con Ctrl+F5 |
| Un shader con cámara no muestra video | el navegador pide permiso de cámara; los sitios necesitan HTTPS para `getUserMedia` |
