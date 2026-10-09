/* Compras y gastos (una fila por línea). Solo Administrador. */
(function () {
  'use strict';
  var h = U.h;
  var CLAVES = ['fecha', 'comprobante', 'producto_codigo', 'cantidad', 'descripcion', 'categoria_gasto', 'moneda', 'monto_original', 'tipo_cambio', 'tipo_movimiento', 'tipo_documento', 'documento_relacionado', 'forma_pago', 'socio_id', 'capa_id', 'lote_fabricante'];
  var esCred = function (v) { return v.forma_pago === 'Socio' || v.forma_pago === 'Crédito Proveedor'; };
  function campos() {
    var gasto = function (v) { return v.tipo_movimiento === 'Gasto'; };
    return [{ n: 'fecha', l: 'Fecha', t: 'date', req: true, def: U.hoy },
      { n: 'tipo_movimiento', l: 'Tipo de movimiento', t: 'select', req: true, opciones: function () { return Datos.catalogo('tipo_movimiento_compra'); }, def: 'Compra' },
      { n: 'tipo_documento', l: 'Documento', t: 'select', req: true, opciones: function () { return Datos.catalogo('tipo_documento_compra'); }, def: 'Factura' },
      { n: 'comprobante', l: 'N° de comprobante (serie-número)', t: 'text', visible: function (v) { return v.tipo_documento !== 'Sin documento'; }, ayuda: 'Ej. F532-0071772. Las líneas pagadas por socio con el mismo número comparten un compromiso.' },
      { n: 'documento_relacionado', l: 'Documento que corrige', t: 'text', req: true, visible: function (v) { return v.tipo_documento === 'Nota de Crédito'; } },
      { n: 'producto_codigo', l: 'Producto', t: 'producto', req: true, visible: function (v) { return !gasto(v); } }, { n: 'cantidad', l: 'Cantidad', t: 'number', req: true, paso: '0.001', visible: function (v) { return !gasto(v); }, ayuda: 'En una Nota de Crédito va en negativo.' },
      { n: 'capa_id', l: 'Capa que se devuelve (compra original)', t: 'capa', req: true, producto: 'producto_codigo', visible: function (v) { return v.tipo_documento === 'Nota de Crédito' && !gasto(v) && !!v.producto_codigo; }, ayuda: 'La devolución al proveedor descuenta de la capa que elijas, hasta su cantidad disponible; nunca salta a otra.',
        cargar: function (cod) { return K.leer('capas.listar', { producto_codigo: cod }).then(function (r) { return r.datos.capas.map(function (c) { return { v: c.id, l: c.id + ' · ' + U.fecha(c.fecha_ingreso) + ' · ' + (c.documento || c.origen) + ' · disp. ' + U.num(c.cantidad_disponible) + ' · S/ ' + U.money(c.costo_unit) }; }); }); } },
      { n: 'lote_fabricante', l: 'Lote del fabricante (opcional)', t: 'text', visible: function (v) { return !gasto(v) && v.tipo_documento !== 'Nota de Crédito'; }, ayuda: 'Déjalo vacío si el producto no tiene lote físico.' },
      { n: 'descripcion', l: 'Descripción', t: 'text' }, { n: 'categoria_gasto', l: 'Categoría del gasto', t: 'select', vacio: 'Sin categoría', opciones: function () { return Datos.catalogo('categoria_gasto'); }, visible: gasto },
      { n: 'proveedor', l: 'Proveedor / beneficiario', t: 'proveedor' },
      { n: 'moneda', l: 'Moneda', t: 'select', req: true, opciones: function () { return Datos.catalogo('moneda'); }, def: 'Soles' },
      { n: 'monto_original', l: 'Monto (con IGV, en la moneda elegida)', t: 'number', req: true, paso: '0.01', visible: function (v) { return v.tipo_movimiento !== 'Bonificación'; } },
      { n: 'tipo_cambio', l: 'Tipo de cambio comercial', t: 'number', req: true, paso: '0.001', visible: function (v) { return v.moneda === 'Dólares'; } }, { n: 'tc_sunat', l: 'Tipo de cambio SUNAT (opcional)', t: 'number', paso: '0.001', visible: function (v) { return v.moneda === 'Dólares'; } },
      { n: 'forma_pago', l: 'Forma de pago', t: 'select', req: true, opciones: function () { return Datos.catalogo('forma_pago_compra'); }, def: 'Efectivo' },
      { n: 'socio_id', l: 'Socio que pagó', t: 'socio', req: true, visible: function (v) { return v.forma_pago === 'Socio'; } },
      { n: 'plazo_modo', l: 'Plazo de pago', t: 'select', vacio: 'Vence en la fecha de la compra', opciones: [{ v: 'dias', l: 'En N días' }, { v: 'fecha', l: 'En una fecha exacta' }, { v: 'sin', l: 'Sin plazo' }], visible: esCred },
      { n: 'plazo_dias', l: 'Días', t: 'number', req: true, visible: function (v) { return esCred(v) && v.plazo_modo === 'dias'; } }, { n: 'plazo_fecha', l: 'Vence el', t: 'date', req: true, visible: function (v) { return esCred(v) && v.plazo_modo === 'fecha'; } }, K.campoIdTemporal];
  }
  /* Convierte los valores del formulario al formato de la API. */
  function payload(v) {
    var d = {}; Object.keys(v).forEach(function (k) { if (['plazo_modo', 'plazo_dias', 'plazo_fecha', 'id_temporal'].indexOf(k) < 0) d[k] = v[k]; });
    if (d.tipo_movimiento === 'Bonificación' && d.monto_original === undefined) d.monto_original = 0;
    if (v.plazo_modo === 'dias') d.plazo = { dias: v.plazo_dias }; else if (v.plazo_modo === 'fecha') d.plazo = { vencimiento: v.plazo_fecha }; else if (v.plazo_modo === 'sin') d.plazo = { sin: true };
    return d;
  }
  function dialogo(c, alTerminar) {
    var editando = !!c, ini = c ? Object.assign({}, c, { proveedor: c.proveedor_id, tc_sunat: c.tc_sunat || '' }) : {};
    F.dialogo(editando ? 'Editar línea ' + c.id : 'Nueva compra / gasto', campos().filter(function (x) { return !(editando && x.n === 'id_temporal'); }), ini, function (v) {
      var d = payload(v), opId = K.idTemporal(v);
      if (!editando) return K.escribir('compras.registrar', d, opId);
      var cam = K.cambios(d, c, CLAVES.concat(['proveedor_id'])); if (d.proveedor_nuevo) cam.proveedor_nuevo = d.proveedor_nuevo; if (d.tc_sunat !== undefined && d.tc_sunat !== c.tc_sunat) cam.tc_sunat = d.tc_sunat;
      var env = { id: c.id, version: c.version, cambios: cam }; if (d.plazo) env.plazo = d.plazo;
      if (!Object.keys(cam).length && !env.plazo) throw new Error('No hay cambios que guardar.'); return K.escribir('compras.editar', env);
    }, { ancho: true, alTerminar: function (r) { U.toast(editando ? 'Línea actualizada.' : 'Registrado' + (r.datos.compromiso_id ? ' · compromiso ' + r.datos.compromiso_id : '') + '.', 'ok'); App.recargarDatos().then(alTerminar); } });
  }
  window.ComprasUI = { payload: payload };
  App.pantalla({ id: 'compras', titulo: 'Compras y gastos', roles: ['A'], render: function (cont) {
    var lista = h('div', { 'data-lista': 'compras' }), fil = K.filtros([{ n: 'desde', l: 'Desde', t: 'date' }, { n: 'hasta', l: 'Hasta', t: 'date' }, { n: 'q', l: 'Comprobante, producto o proveedor', t: 'text' },
      { n: 'forma_pago', l: 'Forma de pago', t: 'select', vacio: 'Todas', opciones: function () { return Datos.catalogo('forma_pago_compra'); } }], {}, cargar);
    cont.appendChild(h('div', { class: 'barra-acc' }, h('button', { class: 'primario', 'data-accion': 'nueva-compra', type: 'button', onclick: function () { dialogo(null, cargar); } }, '➕ Nueva compra / gasto'))); cont.appendChild(fil.el); cont.appendChild(lista);
    function cargar() { K.cargando(lista); K.leer('compras.listar', fil.valores()).then(function (r) { var filas = r.datos.compras;
      U.vacio(lista).appendChild(h('p', { class: 'suave' }, filas.length + ' línea(s) · Total vigente: S/ ' + U.money(filas.filter(function (x) { return x.estado === 'Activo'; }).reduce(function (a, x) { return a + x.monto_total; }, 0))));
      lista.appendChild(U.tabla([{ t: 'Fecha', f: function (c) { return U.fecha(c.fecha); } }, { t: 'Comprobante', f: function (c) { return c.comprobante; } }, { t: 'Proveedor', f: function (c) { return c.proveedor_nombre; } }, { t: 'Producto / descripción', f: function (c) { return c.producto_nombre || c.descripcion; } },
        { t: 'Cant.', cls: 'num', f: function (c) { return U.num(c.cantidad); } }, { t: 'Total S/', cls: 'num', f: function (c) { return U.money(c.monto_total); } }, { t: 'Tipo', f: function (c) { return c.tipo_movimiento + (c.tipo_documento === 'Nota de Crédito' ? ' (NC)' : ''); } },
        { t: 'Pago', f: function (c) { return (c.forma_pago || '—') + (c.socio_nombre ? ' · ' + c.socio_nombre : ''); } }, { t: 'Compromiso', f: function (c) { return c.compromiso_id; } }, { t: '', f: K.estadoReg }],
        filas, function (c) { return c.estado === 'Anulado' ? [] : [{ texto: 'Editar', id: 'editar', onclick: function () { dialogo(c, cargar); } }, { texto: 'Anular', id: 'anular', onclick: function () { K.pedirMotivo('Anular línea ' + c.id).then(function (m) { if (m) K.escribir('compras.anular', { id: c.id, version: c.version, motivo: m }).then(function () { U.toast('Línea anulada.', 'ok'); App.recargarDatos().then(cargar); }, U.error); }); } },
          { texto: 'Eliminar', id: 'eliminar', onclick: function () { K.pedirMotivo('Eliminar línea ' + c.id + ' (no se puede deshacer)').then(function (m) { if (m) K.escribir('compras.eliminar', { id: c.id, version: c.version, motivo: m }).then(function () { U.toast('Línea eliminada. Queda copia en auditoría.', 'ok'); App.recargarDatos().then(cargar); }, U.error); }); } }]; })); }, U.error); }
    cargar();
  } });
})();
