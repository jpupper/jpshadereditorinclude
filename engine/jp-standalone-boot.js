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
        // puntos SIMULADOS (si el bundle trae jp-sim-pointers.js)
        if (root.JPSimPointers) { try { JPSimPointers.attach(R); } catch (e) { } }

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

        // ---------------------------------------------------- panel de sliders (S)
        // Sólo para ajustar los uniforms del shader horneado: nada de assets,
        // fuentes ni calibraciones. Usa el MISMO control que el editor
        // (JPUniformControls) y escribe directo en el renderer.
        function montarPanel() {
            var JUC = root.JPUniformControls;
            if (!JUC || !JUC.crear) return null;
            var FMT = root.__JP_PLAN_FORMATS || {};
            var GLOBALES = /^(time|resolution|mouse|iTime|iMouse|iResolution|iFrame|iChannelTime|fxrand|fxrnd|BPM|bpm|pointers|pointersCount|pointerCount|simPointerCount|lidarPointers|lidarPointersCount|backbuffer|frame|date|sampleRate)$/;

            var css = document.createElement('style');
            css.textContent = [
                '#jp-sa-panel{position:fixed;top:14px;left:14px;z-index:2147483000;width:310px;max-height:calc(100vh - 28px);',
                'display:none;flex-direction:column;background:rgba(10,13,19,.94);border:1px solid #2d3547;border-radius:12px;',
                'box-shadow:0 12px 40px rgba(0,0,0,.6);color:#dfe6f5;font:12px/1.45 system-ui,sans-serif;backdrop-filter:blur(8px)}',
                '#jp-sa-panel.on{display:flex}',
                '#jp-sa-panel .hd{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 11px;',
                'border-bottom:1px solid #232a38;font-size:10.5px;letter-spacing:.8px;text-transform:uppercase;color:#ffd34d}',
                '#jp-sa-panel .hd button{background:#1b2130;color:#cfe0ff;border:1px solid #2d3547;border-radius:7px;padding:2px 8px;cursor:pointer}',
                '#jp-sa-panel .bd{overflow:auto;padding:9px 11px 12px;display:flex;flex-direction:column;gap:8px}',
                '#jp-sa-panel .ps{font-size:10px;letter-spacing:.6px;text-transform:uppercase;color:#7d8ba6;margin:6px 0 2px}',
                '#jp-sa-panel .uniform-slider-row{background:#0b0d13;border:1px solid #232a38;border-radius:9px;padding:6px 8px}',
                '#jp-sa-panel .uniform-label-row{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px}',
                '#jp-sa-panel .uniform-name-label{font-size:11px;color:#cfe0ff;word-break:break-all}',
                '#jp-sa-panel .uniform-pass-tag{font-size:9px;color:#6f7d96}',
                '#jp-sa-panel input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:18px;padding:0;',
                'background:transparent;border:0;cursor:pointer}',
                '#jp-sa-panel input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:#2d3547}',
                '#jp-sa-panel input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;margin-top:-5px;',
                'border-radius:50%;background:#ffd34d;border:1px solid #ffe28f}',
                '#jp-sa-panel input[type=range]::-moz-range-track{height:6px;border-radius:3px;background:#2d3547}',
                '#jp-sa-panel input[type=range]::-moz-range-thumb{width:15px;height:15px;border:0;border-radius:50%;background:#ffd34d}',
                '#jp-sa-panel .uv-slider-val{font-size:10px;color:#ffd34d}',
                '#jp-sa-panel .uniform-switch{display:flex;align-items:center;gap:8px}',
                '#jp-sa-panel .uniform-switch-check{position:absolute;opacity:0;width:0;height:0;pointer-events:none}',
                '#jp-sa-panel .uniform-switch-track{position:relative;width:40px;height:22px;border-radius:11px;background:#2d3547;',
                'border:1px solid #3b465e;cursor:pointer;display:inline-block}',
                '#jp-sa-panel .uniform-switch-track::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;',
                'border-radius:50%;background:#93a3bb;transition:left .16s,background .16s}',
                '#jp-sa-panel .uniform-switch-check:checked + .uniform-switch-track{background:#ffd34d;border-color:#ffe28f}',
                '#jp-sa-panel .uniform-switch-check:checked + .uniform-switch-track::after{left:20px;background:#141414}',
                '#jp-sa-panel .uniform-switch-estado{font-size:9.5px;font-weight:800;color:#8ea0c0;letter-spacing:.06em}',
                '#jp-sa-panel .tabs{display:flex;gap:5px;flex-wrap:wrap;padding:8px 11px 0}',
                '#jp-sa-panel .tabs button{background:#141a26;color:#8ea0c0;border:1px solid #2d3547;border-radius:999px;',
                'padding:3px 9px;font-size:10px;font-weight:700;letter-spacing:.04em;cursor:pointer}',
                '#jp-sa-panel .tabs button.on{background:#ffd34d;border-color:#ffd34d;color:#141414}',
                '#jp-sa-panel .item[hidden]{display:none}',
                '#jp-sa-gear{position:fixed;left:14px;bottom:14px;z-index:2147483000;width:38px;height:38px;border-radius:50%;',
                'background:rgba(10,13,19,.8);border:1px solid #2d3547;color:#ffd34d;font-size:16px;cursor:pointer;',
                'display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)}'
            ].join('\n');
            document.head.appendChild(css);

            var panel = document.createElement('div');
            panel.id = 'jp-sa-panel';
            var hd = document.createElement('div');
            hd.className = 'hd';
            hd.innerHTML = '<span>sliders</span>';
            var x = document.createElement('button');
            x.textContent = '\u2715';
            x.addEventListener('click', function () { panel.classList.remove('on'); });
            hd.appendChild(x);
            var bd = document.createElement('div');
            bd.className = 'bd';
            panel.appendChild(hd);
            panel.appendChild(bd);

            // Tipo REAL de cada uniform según su declaración en el GLSL del pase
            // (los valores del plan son números: sin esto un `bool` saldría como slider).
            var RX = /uniform\s+(?:lowp\s+|mediump\s+|highp\s+)?(float|bool|int|vec2|vec3|vec4)\s+(\w+)\s*;/g;
            var mapa = {};          // nombre -> { tipo, valor, pases: [] }
            (PLAN.passes || []).forEach(function (p) {
                var declarados = {};
                RX.lastIndex = 0;
                var m;
                while ((m = RX.exec(p.source || '')) !== null) declarados[m[2]] = m[1];
                Object.keys(p.uniforms || {}).forEach(function (n) {
                    if (GLOBALES.test(n)) return;
                    // La pertenencia al pase sale de la DECLARACION en su GLSL: el plan
                    // trae todos los uniforms en todos los pases, asi que por `uniforms`
                    // no se puede saber quien declara que.
                    if (!declarados[n]) return;
                    if (!mapa[n]) {
                        mapa[n] = {
                            tipo: declarados[n] || (Array.isArray(p.uniforms[n])
                                ? (p.uniforms[n].length === 2 ? 'vec2' : (p.uniforms[n].length === 4 ? 'vec4' : 'vec3'))
                                : 'float'),
                            valor: p.uniforms[n],
                            pases: []
                        };
                    }
                    mapa[n].pases.push(p.id);
                });
            });

            var nombres = Object.keys(mapa);
            var total = (PLAN.passes || []).length;
            var globales = nombres.filter(function (n) { return total > 1 && mapa[n].pases.length === total; });

            // barra de tabs: TODOS · GLOBAL · un tab por buffer
            var tabs = document.createElement('div');
            tabs.className = 'tabs';
            var opciones = [{ k: 'todos', t: 'TODOS' }];
            if (globales.length) opciones.push({ k: 'global', t: 'GLOBAL · ' + globales.length });
            (PLAN.passes || []).forEach(function (p) {
                var cuantos = nombres.filter(function (n) {
                    return mapa[n].pases.indexOf(p.id) !== -1 && globales.indexOf(n) === -1;
                }).length;
                opciones.push({ k: p.id, t: (p.name || p.id) + ' (' + cuantos + ')' });
            });

            var items = [];
            function filtrar(k) {
                items.forEach(function (it) {
                    var ps = it.getAttribute('data-pases') || '';
                    var esGlobal = it.getAttribute('data-global') === '1';
                    var ver = (k === 'todos') ||
                        (k === 'global' && esGlobal) ||
                        (k !== 'global' && k !== 'todos' && ps.split('|').indexOf(k) !== -1);
                    it.hidden = !ver;
                });
            }

            opciones.forEach(function (o) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'tab' + (o.k === 'todos' ? ' on' : '');
                b.textContent = o.t;
                b.addEventListener('click', function () {
                    Array.prototype.forEach.call(tabs.children, function (x) { x.classList.remove('on'); });
                    b.classList.add('on');
                    filtrar(o.k);
                });
                tabs.appendChild(b);
            });
            panel.insertBefore(tabs, bd);

            if (!nombres.length) {
                var vacio = document.createElement('div');
                vacio.className = 'ps';
                vacio.textContent = 'este shader no tiene uniforms propios';
                bd.appendChild(vacio);
            }
            nombres.forEach(function (n) {
                var info = mapa[n];
                var ctl;
                try {
                    ctl = JUC.crear({
                        nombre: n, tipo: info.tipo, valor: info.valor, mostrarValor: true,
                        formato: FMT[n],
                        passTag: info.pases.join(' · '),
                        onCambio: function (v) {
                            info.pases.forEach(function (pid) {
                                try { R.setPassUniform(pid, n, v); } catch (e) { }
                            });
                        }
                    });
                } catch (e) { return; }
                var item = document.createElement('div');
                item.className = 'item';
                item.setAttribute('data-pases', info.pases.join('|'));
                item.setAttribute('data-global', (total > 1 && info.pases.length === total) ? '1' : '0');
                item.appendChild(ctl.el);
                bd.appendChild(item);
                items.push(item);
            });

            var gear = document.createElement('button');
            gear.id = 'jp-sa-gear';
            gear.title = 'sliders (S)';
            gear.textContent = '\u2699';
            gear.addEventListener('click', function () { panel.classList.toggle('on'); });

            document.body.appendChild(panel);
            document.body.appendChild(gear);
            root.addEventListener('keydown', function (e) {
                if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    panel.classList.toggle('on');
                }
            });
            return panel;
        }

        try { montarPanel(); } catch (e) { console.warn('[jp-standalone] panel:', e && e.message); }

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
