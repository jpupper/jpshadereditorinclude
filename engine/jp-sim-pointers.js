/* ============================================================================
   jp-sim-pointers.js — PUNTOS SIMULADOS en JavaScript
   ----------------------------------------------------------------------------
   Los mismos puntos que anima el shader de TekWeek (puntoFantasma: ángulo áureo
   + radio que respira) pero calculados ACÁ y subidos como `simulatedPointers[]`
   — el tercer array global, hermano de `pointers[]` (dedos/mouse) y
   `lidarPointers[]` (sensor).

   Diferencia con la versión del shader: estos puntos son ATRAÍDOS por el mouse
   (con el botón apretado), por los dedos y por los puntos del LIDAR. Al soltar,
   el resorte los devuelve a su recorrido normal.

   Uso:
       JPSimPointers.attach(renderer);     // engancha el loop (idempotente)
       JPSimPointers.detach();
       JPSimPointers.setCount(32);         // cuántos puntos (default 24)

   Convención de `simulatedPointers[]`: PÍXELES con y = 0 ARRIBA (igual que
   `lidarPointers[]`), así los shaders la espejan como la del LIDAR.
   ============================================================================ */
(function (root) {
    'use strict';

    var N = 24;                 // cuántos puntos simulados
    var TAU = Math.PI * 2;

    // --- parámetros del resorte / atracción (en unidades normalizadas) ---
    var SPRING = 9.0;           // qué tan fuerte vuelve a su recorrido
    var DAMP = 3.2;             // rozamiento (más alto = se frena antes)
    var RADIO = 0.24;           // radio de atracción (normalizado al alto)
    var FUERZA = 22.0;          // fuerza del atractor

    var st = {
        renderer: null, raf: 0, t0: 0, last: 0,
        pts: [], vel: [],
        activo: false
    };

    // El recorrido, idéntico al del shader (buffer0 · puntoFantasma):
    //   a = t*1.7 + i*2.399963 · r = 0.17 + 0.13*(0.5+0.5*sin(t*0.7 + i*1.7))
    //   uv = (0.5 + r*cos(a)/aspecto, 0.5 + r*sin(a))
    function puntoFantasma(t, i, aspecto) {
        var a = t * 1.7 + i * 2.399963;
        var r = 0.17 + 0.13 * (0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.7));
        return { x: 0.5 + r * Math.cos(a) / aspecto, y: 0.5 + r * Math.sin(a) };
    }

    function reset() {
        st.pts = []; st.vel = [];
        for (var i = 0; i < N; i++) { st.pts.push({ x: 0.5, y: 0.5 }); st.vel.push({ x: 0, y: 0 }); }
        st.t0 = (root.performance && performance.now) ? performance.now() : Date.now();
        st.last = st.t0;
    }

    function px2uv(x, y, w, h) { return { x: x / w, y: 1 - y / h }; }   // px (y abajo) → uv (y arriba)

    function attractors(R) {
        var out = [];
        var p = R.parameters || {};
        var w = Math.max(1, p.screenWidth || 1), h = Math.max(1, p.screenHeight || 1);

        // mouse (sólo con el botón apretado: mouse.z > 0)
        var m = p.mouse;
        if (m && (m[2] > 0.0001 || m[3] > 0.0001)) {
            var mu = px2uv(m[0], m[1], w, h);
            out.push({ x: mu.x, y: mu.y, f: 1 });
        }
        // dedos / multiusuario (normalizados, y = 0 abajo en la convención de pointers)
        var ptr = p.pointers || [];
        for (var i = 0; i < ptr.length; i++) {
            if (ptr[i] && isFinite(ptr[i].x)) out.push({ x: ptr[i].x, y: ptr[i].y, f: 0.9 });
        }
        // LIDAR (normalizados, y = 0 ARRIBA → se pasa a y arriba)
        var lid = p.lidarPointers || [];
        for (var j = 0; j < lid.length; j++) {
            if (lid[j] && isFinite(lid[j].x)) out.push({ x: lid[j].x, y: 1 - lid[j].y, f: 1 });
        }
        return out;
    }

    function step(now) {
        st.raf = root.requestAnimationFrame(step);
        var R = st.renderer;
        if (!R || !R.parameters) return;

        var dt = Math.min(0.05, Math.max(0.001, (now - st.last) / 1000));
        st.last = now;
        var t = (now - st.t0) / 1000;
        var w = Math.max(1, R.parameters.screenWidth || 1);
        var h = Math.max(1, R.parameters.screenHeight || 1);
        var aspecto = w / h;

        var ats = attractors(R);
        var salida = [];

        for (var i = 0; i < N; i++) {
            var base = puntoFantasma(t * 0.8, i, aspecto);   // mismo t*0.8 que el shader
            var p = st.pts[i], v = st.vel[i];

            // resorte al recorrido
            var ax = (base.x - p.x) * SPRING;
            var ay = (base.y - p.y) * SPRING;

            // atracción (distancia corregida por aspecto para que sea redonda)
            for (var k = 0; k < ats.length; k++) {
                var a = ats[k];
                var dx = a.x - p.x, dy = a.y - p.y;
                var d = Math.sqrt((dx * aspecto) * (dx * aspecto) + dy * dy);
                if (d < RADIO && d > 1e-5) {
                    var f = FUERZA * a.f * (1 - d / RADIO) / d;
                    ax += dx * f;
                    ay += dy * f;
                }
            }

            v.x += ax * dt; v.y += ay * dt;
            v.x -= v.x * DAMP * dt; v.y -= v.y * DAMP * dt;
            p.x += v.x * dt; p.y += v.y * dt;

            // se queda dentro de la pantalla
            if (p.x < 0.02 || p.x > 0.98) { v.x *= -0.35; p.x = Math.min(0.98, Math.max(0.02, p.x)); }
            if (p.y < 0.02 || p.y > 0.98) { v.y *= -0.35; p.y = Math.min(0.98, Math.max(0.02, p.y)); }

            // se publica con y = 0 ARRIBA (como lidarPointers)
            salida.push({ x: p.x, y: 1 - p.y });
        }

        R.parameters.simulatedPointers = salida;
    }

    function attach(renderer) {
        if (!renderer) return false;
        if (st.renderer === renderer && st.raf) return true;
        detach();
        st.renderer = renderer;
        reset();
        st.raf = root.requestAnimationFrame(step);
        return true;
    }

    function detach() {
        if (st.raf) { try { root.cancelAnimationFrame(st.raf); } catch (e) { } }
        st.raf = 0; st.renderer = null;
    }

    root.JPSimPointers = {
        attach: attach,
        detach: detach,
        setCount: function (n) {
            n = Math.max(1, Math.min(64, parseInt(n, 10) || N));
            if (n === N) return N;
            N = n; reset(); return N;
        },
        count: function () { return N; },
        // para tests: posiciones actuales en uv (y arriba)
        posiciones: function () { return st.pts.map(function (p) { return { x: p.x, y: p.y }; }); },
        // el recorrido puro (sin resortes) — el mismo del shader
        recorrido: function (t, i, aspecto) { return puntoFantasma(t, i, aspecto || 1); }
    };
})(window);
