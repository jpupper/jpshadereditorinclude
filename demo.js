/* ============================================================
   demo.js — EJEMPLO DE FRONT (lo único que programa la página)
   ------------------------------------------------------------
   Muestra cómo se consume la librería desde una página cualquiera:
   acá NO hay nada de WebGL, sólo se usa el API de window.JPShaderInclude.
   El fondo, el panel secreto, el refresco y el loop viven en el engine
   (que a su vez le pide el plan resuelto al BACKEND).
   ============================================================ */
(function () {
    'use strict';

    function badge() {
        var b = document.createElement('div');
        b.id = 'jp-demo-badge';
        b.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:50;' +
            'background:rgba(8,10,16,.72);border:1px solid rgba(255,255,255,.12);border-radius:10px;' +
            'padding:8px 12px;font:12px ui-monospace,Menlo,Consolas,monospace;color:#9fb2d0;' +
            'backdrop-filter:blur(8px);display:flex;gap:12px;align-items:center';
        b.innerHTML = '<span id="jp-demo-comp">—</span><span id="jp-demo-fps">— fps</span>' +
            '<span style="color:#ffd34d">[S] panel</span>';
        document.body.appendChild(b);
        return b;
    }

    function tick(b) {
        var api = window.JPShaderInclude;
        if (!api) return;
        var st = api.state();
        var c = b.querySelector('#jp-demo-comp');
        var f = b.querySelector('#jp-demo-fps');
        if (c) c.textContent = st.comp ? (st.comp + (st.pass ? ' · ' + st.pass : '') + ' · ' + st.passes + ' pases') : 'sin composición';
        if (f) f.textContent = (st.fps || 0) + ' fps' + (st.err ? ' ⚠' : '');
    }

    window.addEventListener('load', function () {
        var b = badge();
        if (!window.JPShaderInclude) {
            b.innerHTML = '<span style="color:#ff8f8f">el engine no se cargó (¿include.js accesible?)</span>';
            return;
        }
        tick(b);
        setInterval(function () { tick(b); }, 1000);

        console.log('[demo] base:', window.JPShaderInclude.config().base);
        console.log('[demo] estado:', window.JPShaderInclude.state());
    });
})();
