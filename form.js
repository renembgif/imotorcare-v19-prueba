/* Formularios declarativos. Campo: { n, l, t, req, def, opciones, visible(vals), ayuda, paso }
 * Tipos: text, textarea, number, date, select, producto, proveedor, socio, check, hora. */
(function (root) {
  'use strict';
  var h = U.h, F = {}, seq = 0;
  function opcionesDe(c) { var o = typeof c.opciones === 'function' ? c.opciones() : (c.opciones || []); return o.map(function (x) { return typeof x === 'object' ? x : { v: x, l: x }; }); }
  F.crear = function (campos, inicial) {
    inicial = inicial || {}; var refs = {}, raiz = h('div', { class: 'form' }), id = ++seq;
    campos.forEach(function (c) {
      var ctrl, extra = null, v0 = inicial[c.n] !== undefined && inicial[c.n] !== null ? inicial[c.n] : (c.def !== undefined ? (typeof c.def === 'function' ? c.def() : c.def) : '');
      if (c.t === 'select' || c.t === 'socio') {
        var ops = c.t === 'socio' ? (Datos.socios || []).filter(function (s) { return s.activo || s.id === v0; }).map(function (s) { return { v: s.id, l: s.nombre }; }) : opcionesDe(c);
        ctrl = h('select', { 'data-n': c.n }, (c.req && c.t !== 'socio' && v0 !== '' ? [] : h('option', { value: '' }, c.t === 'socio' ? '— elegir socio —' : (c.vacio || '—'))), ops.map(function (o) { return h('option', { value: o.v }, o.l); })); ctrl.value = v0 === null ? '' : String(v0);
      } else if (c.t === 'proveedor') {
        var provs = (Datos.proveedores || []).filter(function (p) { return p.activo || p.id === v0; });
        ctrl = h('select', { 'data-n': c.n }, h('option', { value: '' }, '— elegir —'), provs.map(function (p) { return h('option', { value: p.id }, p.nombre); }), h('option', { value: '__nuevo' }, '➕ Nuevo…')); ctrl.value = v0 || '';
        extra = h('input', { type: 'text', placeholder: 'Nombre del nuevo proveedor/beneficiario', 'data-n': c.n + '__nuevo', hidden: true });
        ctrl.addEventListener('change', function () { extra.hidden = ctrl.value !== '__nuevo'; });
      } else if (c.t === 'producto') {
        var dl = h('datalist', { id: 'dl-' + id + '-' + c.n }, (Datos.productos || []).filter(function (p) { return p.activo || p.codigo === v0; }).map(function (p) { return h('option', { value: p.codigo + ' · ' + p.nombre }); }));
        var pv = v0 ? ((Datos.productos || []).filter(function (p) { return p.codigo === v0; })[0]) : null;
        ctrl = h('input', { type: 'text', list: 'dl-' + id + '-' + c.n, 'data-n': c.n, autocomplete: 'off', placeholder: 'Código o nombre', value: pv ? pv.codigo + ' · ' + pv.nombre : '' }); extra = dl;
      } else if (c.t === 'capa') {   // capa de la mercadería (se llena según el producto elegido)
        ctrl = h('select', { 'data-n': c.n }, h('option', { value: '' }, '— elegir la capa —')); ctrl.__prod = ''; ctrl.__v0 = v0;
      } else if (c.t === 'textarea') { ctrl = h('textarea', { 'data-n': c.n, rows: 2 }, v0 === null ? '' : v0);
      } else if (c.t === 'check') { ctrl = h('input', { type: 'checkbox', 'data-n': c.n, checked: !!v0 });
      } else { ctrl = h('input', { type: c.t === 'hora' ? 'time' : (c.t || 'text'), 'data-n': c.n, step: c.paso || (c.t === 'number' ? 'any' : null), value: v0 === null ? '' : v0 }); }
      var wrap = h('div', { class: 'campo', 'data-campo': c.n }, h('label', {}, c.l + (c.req ? ' *' : '')), ctrl, extra, c.ayuda ? h('small', { class: 'suave' }, c.ayuda) : null);
      refs[c.n] = { c: c, ctrl: ctrl, extra: extra, wrap: wrap }; raiz.appendChild(wrap);
      ctrl.addEventListener('input', refrescar); ctrl.addEventListener('change', refrescar);
    });
    function codigoDe(txt) { txt = String(txt || '').trim(); if (!txt) return ''; var m = txt.match(/^([A-Za-z]\d+)\b/); if (m) return m[1].toUpperCase(); var p = (Datos.productos || []).filter(function (x) { return x.nombre.toUpperCase() === txt.toUpperCase(); })[0]; return p ? p.codigo : txt; }
    function leerCampo(r, out) {
      var c = r.c, el = r.ctrl, v;
      if (c.t === 'check') v = el.checked; else if (c.t === 'number') v = el.value === '' ? undefined : Number(el.value); else if (c.t === 'producto') v = codigoDe(el.value) || undefined;
      else if (c.t === 'proveedor') { if (el.value === '__nuevo') { var nn = r.extra.value.trim(); if (nn) out[c.n + '_nuevo'] = nn; } else if (el.value) out[c.n + '_id'] = el.value; return; }
      else v = el.value === '' ? undefined : (typeof el.value === 'string' ? el.value.trim() : el.value);
      if (v !== undefined) out[c.n] = v;
    }
    function leer() { var out = {}; campos.forEach(function (c) { leerCampo(refs[c.n], out); }); return out; }
    function refrescar() { var v = leer(); campos.forEach(function (c) { var r = refs[c.n]; r.wrap.hidden = !!(c.visible && !c.visible(v)); if (c.t === 'capa' && !r.wrap.hidden) cargarCapas(c, r, v); }); }
    function cargarCapas(c, r, v) {
      var cod = v[c.producto] || ''; if (r.ctrl.__prod === cod) return; r.ctrl.__prod = cod; var sel = r.ctrl;
      while (sel.options.length > 1) sel.remove(1); if (!cod) return;
      c.cargar(cod).then(function (ops) { if (sel.__prod !== cod) return; ops.forEach(function (o) { sel.appendChild(h('option', { value: o.v }, o.l)); }); if (sel.__v0) { sel.value = sel.__v0; sel.__v0 = ''; } }, function () { /* sin capas: el servidor lo avisará */ });
    }
    function valores() { var v = leer(), out = {}; campos.forEach(function (c) { if (refs[c.n].wrap.hidden) return; leerCampo(refs[c.n], out); }); return out; }
    function faltante() { var v = valores(); for (var i = 0; i < campos.length; i++) { var c = campos[i]; if (!c.req || refs[c.n].wrap.hidden) continue;
      var k = c.t === 'proveedor' ? (v[c.n + '_id'] || v[c.n + '_nuevo']) : v[c.n]; if (k === undefined || k === '') return c.l; } return null; }
    refrescar(); return { el: raiz, valores: valores, faltante: faltante, refs: refs, refrescar: refrescar };
  };
  /* Abre un formulario en un modal. alGuardar(valores) debe devolver una promesa; si falla, el error se muestra y el modal sigue abierto. */
  F.dialogo = function (titulo, campos, inicial, alGuardar, opts) {
    opts = opts || {}; var f = F.crear(campos, inicial), m;
    m = U.modal(titulo, f.el, [{ texto: 'Cancelar', cerrar: true }, { texto: opts.textoGuardar || 'Guardar', id: 'guardar', clase: 'primario', onclick: function (mm) {
      var fl = f.faltante(); if (fl) { mm.error('Falta: ' + fl + '.'); return; } mm.error(''); mm.ocupado(true);
      Promise.resolve().then(function () { return alGuardar(f.valores(), f); }).then(function (r) { mm.cerrar(); if (opts.alTerminar) opts.alTerminar(r); }, function (e) { mm.ocupado(false); mm.error((e && e.message) || 'Error.'); });
    } }], { ancho: opts.ancho });
    return { form: f, modal: m };
  };
  root.F = F;
})(window);
