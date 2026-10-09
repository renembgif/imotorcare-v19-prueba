/* Utilidades de interfaz (sin librerías). La Web no calcula reglas: muestra lo que devuelve el backend. */
(function (root) {
  'use strict';
  var U = {};
  function add(el, c) { if (c == null || c === false) return; if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); } else if (c.nodeType) el.appendChild(c); else el.appendChild(document.createTextNode(String(c))); }
  U.h = function (tag, attrs) {
    var el = document.createElement(tag); attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) { var v = attrs[k]; if (v == null || v === false) return;
      if (k === 'class') el.className = v; else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v); else if (k === 'value') el.value = v; else if (k === 'checked') el.checked = !!v; else el.setAttribute(k, v === true ? '' : v); });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]); return el;
  };
  U.money = function (n) { return (n === null || n === undefined || n === '') ? '' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  U.num = function (n) { return (n === null || n === undefined || n === '') ? '' : String(Math.round(Number(n) * 1000) / 1000); };
  U.fecha = function (iso) { return iso ? String(iso).slice(8, 10) + '/' + String(iso).slice(5, 7) + '/' + String(iso).slice(0, 4) : ''; };
  U.hoy = function () { return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10); };
  U.vacio = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  var toastEl = null;
  U.toast = function (msg, tipo) {
    if (!toastEl) { toastEl = U.h('div', { id: 'toast', class: 'toast' }); document.body.appendChild(toastEl); }
    var t = U.h('div', { class: 'aviso ' + (tipo || ''), role: 'status' }, msg); toastEl.appendChild(t); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, tipo === 'error' ? 9000 : 4500);
  };
  U.error = function (e) { U.toast((e && e.message) || 'Error desconocido.', 'error'); };

  /* Ventana modal. Devuelve { el, cuerpo, cerrar(), error(msg), ocupado(bool) } */
  U.modal = function (titulo, contenido, botones, opts) {
    opts = opts || {};
    var cuerpo = U.h('div', { class: 'modal-cuerpo' }, contenido), err = U.h('div', { class: 'aviso error', hidden: true, 'data-err': '1' }), pie = U.h('div', { class: 'modal-pie' });
    var caja = U.h('div', { class: 'modal-caja' + (opts.ancho ? ' ancho' : ''), role: 'dialog', 'aria-label': titulo }, U.h('h3', {}, titulo), cuerpo, err, pie);
    var fondo = U.h('div', { class: 'modal-fondo' }, caja);
    var m = { el: fondo, cuerpo: cuerpo, cerrar: function () { if (fondo.parentNode) fondo.parentNode.removeChild(fondo); },
      error: function (msg) { err.hidden = !msg; err.textContent = msg || ''; },
      ocupado: function (s) { pie.querySelectorAll('button').forEach(function (b) { b.disabled = !!s; }); } };
    (botones || []).forEach(function (b) {
      pie.appendChild(U.h('button', { class: b.clase || '', 'data-boton': b.id || b.texto, type: 'button', onclick: function () { if (b.cerrar) { m.cerrar(); if (b.onclick) b.onclick(); } else b.onclick(m); } }, b.texto));
    });
    document.body.appendChild(fondo); return m;
  };
  U.confirmar = function (mensaje, textoOk) {
    return new Promise(function (res) { U.modal('Confirmar', U.h('p', {}, mensaje), [{ texto: 'Cancelar', cerrar: true, onclick: function () { res(false); } }, { texto: textoOk || 'Aceptar', id: 'ok', clase: 'primario', cerrar: true, onclick: function () { res(true); } }]); });
  };
  U.pedirTexto = function (titulo, etiqueta, opts) {
    opts = opts || {};
    return new Promise(function (res) {
      var inp = U.h('input', { type: 'text', 'data-campo-texto': '1', value: opts.valor || '' });
      var m = U.modal(titulo, [U.h('label', {}, etiqueta), inp], [{ texto: 'Cancelar', cerrar: true, onclick: function () { res(null); } },
        { texto: 'Aceptar', id: 'ok', clase: 'primario', onclick: function (mm) { var v = inp.value.trim(); if (!v && opts.requerido !== false) { mm.error('Este dato es obligatorio.'); return; } mm.cerrar(); res(v); } }]);
      setTimeout(function () { inp.focus(); }, 0);
    });
  };
  /* Tabla. cols: [{ t, f(fila), cls, html }] · acciones(fila) → [{ texto, id, onclick, clase }] */
  U.tabla = function (cols, filas, acciones, vacio) {
    if (!filas.length) return U.h('p', { class: 'suave' }, vacio || 'Sin registros.');
    var thead = U.h('tr', {}, cols.map(function (c) { return U.h('th', { class: c.cls || '' }, c.t); }), acciones ? U.h('th', {}, '') : null);
    var tbody = filas.map(function (f) {
      return U.h('tr', { class: f && (f.estado === 'Anulado' || f.anulada) ? 'anulado' : '', 'data-fila': f && (f.id || f.codigo || f.llave || f.periodo || ''), }, cols.map(function (c) { var v = c.f(f); return U.h('td', { class: c.cls || '' }, v == null ? '' : v); }),
        acciones ? U.h('td', { class: 'acciones' }, acciones(f).filter(Boolean).map(function (a) { return U.h('button', { class: 'chico ' + (a.clase || ''), 'data-accion': a.id || a.texto, type: 'button', onclick: a.onclick }, a.texto); })) : null);
    });
    return U.h('div', { class: 'tabla' }, U.h('table', {}, U.h('thead', {}, thead), U.h('tbody', {}, tbody)));
  };
  U.chip = function (txt, tipo) { return U.h('span', { class: 'chip ' + (tipo || '') }, txt); };
  root.U = U;
})(window);
