/* ============================================================================
   jp-standalone-boot.js — arranca un PLAN ya horneado, SIN backend ni panel.
   ----------------------------------------------------------------------------
   Lo usa el export "HTML" del editor y las páginas standalone: el plan (pases con
   su GLSL completo, uniforms, orden y pase visible) viaja en `window.__JP_PLAN`,
   y acá se monta con el MISMO motor que el editor/include (WebGLRenderer +
   JPNodeGraph.VERTEX). No pide nada por red: anda offline, en file:// y en el FTP.

   Requiere que antes se hayan cargado:
     js/lib/jp-pointers.js · js/lib/jp-node-graph.js · js/lib/uniform-types.js
     js/shadereditor/webglrenderer.js

   Config opcional en `window.__JP_PLAN_CFG`:
     { maxDpr: 1.5, zIndex: -1, bpm: 120, pointerEvents: 'none' }
   ============================================================================ */
(function (root) {
    'use strict';

    var PLAN = root.__JP_PLAN;
    var CFG = root.__JP_PLAN_CFG || {};

    function arrancar() {
        if (!PLAN || !Array.isArray(PLAN.passes) || !PLAN.passes.length) {
            console.error('[jp-standalone] falta window.__JP_PLAN (pases)');
            return;
        }
        var RC = (typeof WebGLRenderer === 'function') ? WebGLRenderer : root.WebGLRenderer;
        var NG = root.JPNodeGraph;
        if (!RC || !NG) { console.error('[jp-standalone] falta el motor (WebGLRenderer / JPNodeGraph)'); return; }

        var maxDpr = Number(CFG.maxDpr) > 0 ? Number(CFG.maxDpr) : 1.5;

        // canvas de fondo (detrás del contenido, igual que el include)
        var c = document.createElement('canvas');
        c.id = 'jp-standalone-canvas';
        c.style.cssText =
            'position:fixed;left:0;top:0;width:100vw;height:100vh;display:block;background:#000;' +
            'z-index:' + (CFG.zIndex === undefined ? -1 : Number(CFG.zIndex)) + ';' +
            'pointer-events:' + (CFG.pointerEvents || 'none') + ';';
        (document.body || document.documentElement).appendChild(c);

        var R = new RC(c, function (t, m) {
            var e = ((t || '') + (m ? ': ' + m : '')).trim();
            if (e) console.warn('[jp-standalone]', e);
        }, {});
        if (!R.inicializarContexto()) { console.error('[jp-standalone] sin WebGL'); return; }

        // El tamaño va ANTES de armar los pases: los render targets se crean con él.
        var dpr0 = Math.min(root.devicePixelRatio || 1, maxDpr);
        c.width = Math.max(1, Math.floor(root.innerWidth * dpr0));
        c.height = Math.max(1, Math.floor(root.innerHeight * dpr0));
        R.parameters.screenWidth = c.width;
        R.parameters.screenHeight = c.height;

        PLAN.passes.forEach(function (p) {
            var pass = R.addPass(p.id, p.name, 'buffer');
            pass.inputAliases = p.aliases || {};
            R.compilePass(p.id, p.source, NG.VERTEX, null);
            var slots = NG.SLOTS || 4;
            for (var i = 0; i < slots; i++) {
                var inp = (p.inputs || [])[i];
                pass.inputs[i] = inp || null;
            }
            Object.keys(p.uniforms || {}).forEach(function (n) {
                try { R.setPassUniform(p.id, n, p.uniforms[n]); } catch (e) { }
            });
        });

        R.passOrder = (PLAN.order || Object.keys(PLAN.passes)).slice();
        R.displayPassId = PLAN.displayPassId || R.passOrder[R.passOrder.length - 1];
        R.parameters.bpm = CFG.bpm || 120;

        // ---------------------------------------------------------- mouse / touch
        var M = { x: 0.5, y: 0.5, down: 0 };
        function mover(x, y) {
            M.x = x / Math.max(1, root.innerWidth);
            M.y = 1 - y / Math.max(1, root.innerHeight);
        }
        root.addEventListener('mousemove', function (e) { mover(e.clientX, e.clientY); }, { passive: true });
        root.addEventListener('mousedown', function (e) { M.down = 1; mover(e.clientX, e.clientY); }, { passive: true });
        root.addEventListener('mouseup', function () { M.down = 0; }, { passive: true });
        function tpos(e) {
            var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
            if (t) mover(t.clientX, t.clientY);
        }
        root.addEventListener('touchstart', function (e) { M.down = 1; tpos(e); }, { passive: true });
        root.addEventListener('touchmove', tpos, { passive: true });
        root.addEventListener('touchend', function (e) {
            if (!e.touches || !e.touches.length) M.down = 0; else tpos(e);
        }, { passive: true });
        root.addEventListener('touchcancel', function () { M.down = 0; }, { passive: true });

        // ---------------------------------------------------------- resize
        root.addEventListener('resize', function () {
            if (!R || !R.gl) return;
            var d = Math.min(root.devicePixelRatio || 1, maxDpr);
            var w = Math.max(1, Math.floor(root.innerWidth * d));
            var h = Math.max(1, Math.floor(root.innerHeight * d));
            if (w === c.width && h === c.height) return;
            c.width = w; c.height = h;
            R.parameters.screenWidth = w;
            R.parameters.screenHeight = h;
            R.passes.forEach(function (pass) {
                pass.renderTargets.forEach(function (t, i) {
                    if (t) { try { R.gl.deleteFramebuffer(t.framebuffer); R.gl.deleteTexture(t.texture); } catch (e) { } }
                    pass.renderTargets[i] = R.createTarget(w, h, 'LINEAR');
                });
            });
        }, { passive: true });

        // ---------------------------------------------------------- loop
        var lidarPts = [];
        function frame() {
            root.requestAnimationFrame(frame);
            try {
                R.updateMouse(M.x * root.innerWidth, M.y * root.innerHeight, M.down, 0);
                if (R.parameters.pointers !== undefined) {
                    R.parameters.pointers = M.down ? [{ x: M.x, y: M.y }] : [];
                }
                if (R.parameters.lidarPointers !== undefined) {
                    R.parameters.lidarPointers = lidarPts;
                }
                R.render(null);
            } catch (e) {
                if (!frame._err) { frame._err = 1; console.warn('[jp-standalone]', (e && e.message) || e); }
            }
        }
        root.requestAnimationFrame(frame);

        root.JPStandalone = {
            renderer: R,
            canvas: c,
            plan: PLAN,
            config: CFG,
            setLidarPoints: function (a) { lidarPts = Array.isArray(a) ? a : []; },
            destroy: function () {
                try { R.gl.getExtension('WEBGL_lose_context').loseContext(); } catch (e) { }
                if (c.parentNode) c.parentNode.removeChild(c);
            }
        };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
    else arrancar();
})(window);
