/* Piezas compartidas por las pantallas. */
(function (root) {
  'use strict';
  var h = U.h, K = {};
  /* Escritura con reintento por motivo: si el backend dice que el periodo está declarado y falta el motivo, lo pide. */
  /* opId opcional: el "N° de operación temporal" (OT-0001) que el usuario anotó en el Excel temporal. Con el mismo opId el sistema no duplica la operación. */
  K.idTemporal = function (v) { var t = String(v && v.id_temporal || '').trim().toUpperCase(); if (v) delete v.id_temporal; return t || undefined; };
  K.campoIdTemporal = { n: 'id_temporal', l: 'N° de operación temporal (opcional)', t: 'text', ayuda: 'Solo si esta operación estaba anotada en el Excel temporal (OT-0001…): evita cargarla dos veces.' };
  K.escribir = function (accion, datos, opId) {
    return API.llamar(accion, datos, { escritura: true, opId: opId }).catch(function (e) {
      if (e && e.codigo === 'VALIDACION' && e.detalle && e.detalle.requiereMotivo) {
        return U.pedirTexto('Periodo declarado a SUNAT', 'Motivo del cambio (obligatorio, queda en auditoría)').then(function (m) {
          if (!m) throw e; return API.llamar(accion, Object.assign({}, datos, { motivo: m }), { escritura: true, opId: opId });
        });
      }
      throw e;
    }).then(function (r) { (r.avisos || []).forEach(function (a) { U.toast(a, 'warn'); }); if (r.repetida && opId) U.toast('La operación ' + opId + ' ya se había cargado antes: no se duplicó.', 'warn'); return r; });
  };
  K.leer = function (accion, datos) { return API.llamar(accion, datos || {}); };
  /* Barra de filtros: campos [{ n, l, t, opciones }]; devuelve { el, valores() } y llama alCambiar al pulsar Buscar. */
  K.filtros = function (campos, inicial, alBuscar) {
    var f = F.crear(campos, inicial); var barra = h('div', { class: 'filtros' }, f.el, h('button', { class: 'primario', 'data-accion': 'buscar', type: 'button', onclick: function () { alBuscar(f.valores()); } }, 'Buscar'));
    return { el: barra, valores: f.valores };
  };
  K.cargando = function (el) { U.vacio(el); el.appendChild(h('p', { class: 'suave' }, 'Cargando…')); };
  K.estadoPago = function (e) { return U.chip(e, e === 'Cobrado' ? 'ab' : 'dec'); };
  K.estadoReg = function (f) { return f.estado === 'Anulado' ? U.chip('Anulado', 'dec') : ''; };
  K.pedirMotivo = function (titulo) { return U.pedirTexto(titulo || 'Motivo', 'Motivo (obligatorio, queda en auditoría)'); };
  /* Compara valores del formulario con los del registro y devuelve solo lo que cambió. */
  K.cambios = function (nuevo, viejo, claves) { var c = {}; claves.forEach(function (k) { var a = nuevo[k], b = viejo[k]; if (a === undefined && (b === null || b === undefined || b === '')) return; if (a !== undefined && String(a) !== String(b === null ? '' : b)) c[k] = a; else if (a === undefined && b !== null && b !== undefined && b !== '') c[k] = null; }); return c; };
  K.lineasTotal = function (lineas) { return lineas.reduce(function (a, l) { return a + (Number(l.cantidad) || 0) * (Number(l.precio) || 0); }, 0); };
  /* Editor de líneas de producto (ventas y cotizaciones). cols: [{n,l,t,paso}] además del producto. */
  K.lineasEditor = function (extras, inicial, alCambiar) {
    var cont = h('div', { class: 'lineas', 'data-lineas': '1' }), filas = [];
    function nueva(v) {
      var campos = [{ n: 'producto_codigo', l: 'Producto', t: 'producto', req: true }, { n: 'cantidad', l: 'Cantidad', t: 'number', req: true, paso: '0.001', def: 1 }].concat(extras);
      var f = F.crear(campos, v || {}), fila = { f: f }, quitar = h('button', { type: 'button', class: 'chico', 'data-accion': 'quitar-linea', onclick: function () { filas = filas.filter(function (x) { return x !== fila; }); cont.removeChild(fila.el); if (alCambiar) alCambiar(); } }, '✕');
      fila.el = h('div', { class: 'linea' }, f.el, quitar); filas.push(fila); cont.appendChild(fila.el); f.el.addEventListener('input', function () { if (alCambiar) alCambiar(); }); f.el.addEventListener('change', function () { if (alCambiar) alCambiar(); });
    }
    (inicial && inicial.length ? inicial : [{}]).forEach(nueva);
    var el = h('div', {}, cont, h('button', { type: 'button', 'data-accion': 'agregar-linea', onclick: function () { nueva(); } }, '➕ Agregar producto'));
    return { el: el, valores: function () { return filas.map(function (x) { return x.f.valores(); }); }, faltante: function () { for (var i = 0; i < filas.length; i++) { var fl = filas[i].f.faltante(); if (fl) return fl + ' (línea ' + (i + 1) + ')'; } return null; } };
  };
  root.K = K;
})(window);
