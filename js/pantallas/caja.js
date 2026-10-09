/* Caja real (libro de movimientos), Nuevo gasto de Caja y ajuste manual. Solo Administrador. */
(function () {
  'use strict';
  var h = U.h;
  function gasto(alTerminar) {
    var campos = [{ n: 'fecha', l: 'Fecha', t: 'date', req: true, def: U.hoy }, { n: 'categoria_gasto', l: 'Categoría', t: 'select', req: true, opciones: function () { return Datos.catalogo('categoria_gasto'); } },
      { n: 'proveedor', l: 'Pagado a (beneficiario)', t: 'proveedor', req: true }, { n: 'descripcion', l: 'Descripción', t: 'text' }, { n: 'monto', l: 'Monto (S/)', t: 'number', req: true, paso: '0.01' },
      { n: 'medio', l: 'Medio de pago', t: 'select', req: true, opciones: ['Efectivo', 'Yape', 'Transferencia'], def: 'Efectivo' },
      { n: 'doc_tipo', l: 'Documento', t: 'select', req: true, opciones: ['Sin documento', 'Factura'], def: 'Sin documento' }, { n: 'doc_comprobante', l: 'N° de factura', t: 'text', req: true, visible: function (v) { return v.doc_tipo === 'Factura'; } }, K.campoIdTemporal];
    F.dialogo('Nuevo gasto de Caja', campos, {}, function (v) {
      var d = { fecha: v.fecha, categoria_gasto: v.categoria_gasto, descripcion: v.descripcion, monto: v.monto, medio: v.medio, proveedor_id: v.proveedor_id, proveedor_nuevo: v.proveedor_nuevo, documento: { tipo: v.doc_tipo, comprobante: v.doc_comprobante } };
      return K.escribir('gastos.caja_registrar', d, K.idTemporal(v));
    }, { ancho: true, alTerminar: function () { U.toast('Gasto registrado y salida de Caja generada.', 'ok'); App.recargarDatos().then(alTerminar); } });
  }
  function ajuste(alTerminar) {
    F.dialogo('Ajuste manual de Caja', [{ n: 'fecha', l: 'Fecha', t: 'date', req: true, def: U.hoy }, { n: 'tipo', l: 'Tipo', t: 'select', req: true, opciones: ['Entrada', 'Salida'] }, { n: 'monto', l: 'Monto (S/)', t: 'number', req: true, paso: '0.01' },
      { n: 'medio', l: 'Medio', t: 'select', opciones: ['Efectivo', 'Yape', 'Transferencia'], vacio: '—' }, { n: 'motivo', l: 'Motivo', t: 'text', req: true }], {}, function (v) { return K.escribir('caja.ajuste', v); }, { alTerminar: function () { U.toast('Ajuste registrado.', 'ok'); alTerminar(); } });
  }
  App.pantalla({ id: 'caja', titulo: 'Caja', roles: ['A'], render: function (cont) {
    var resumen = h('div', { 'data-lista': 'caja-resumen' }), lista = h('div', { 'data-lista': 'caja' });
    var fil = K.filtros([{ n: 'desde', l: 'Desde', t: 'date' }, { n: 'hasta', l: 'Hasta', t: 'date' }, { n: 'tipo', l: 'Tipo', t: 'select', opciones: ['Entrada', 'Salida'], vacio: 'Todos' }, { n: 'origen', l: 'Origen', t: 'select', vacio: 'Todos',
      opciones: ['Venta cobrada', 'Compra/Gasto pagado', 'Pago de compromiso', 'Aporte/Préstamo de socio', 'Pago/Retiro de socio', 'Ajuste'] }], {}, cargar);
    cont.appendChild(h('div', { class: 'barra-acc' }, h('button', { class: 'primario', 'data-accion': 'nuevo-gasto', type: 'button', onclick: function () { gasto(cargar); } }, '➕ Nuevo gasto de Caja'), h('button', { 'data-accion': 'ajuste', type: 'button', onclick: function () { ajuste(cargar); } }, 'Ajuste manual')));
    cont.appendChild(resumen); cont.appendChild(fil.el); cont.appendChild(lista);
    function cargar() {
      K.leer('caja.resumen', {}).then(function (r) { var d = r.datos; U.vacio(resumen).appendChild(h('div', { class: 'tarjetas' },
        [['Entradas', d.entradas, 'entradas'], ['Salidas', d.salidas, 'salidas'], ['Saldo', d.saldo, 'saldo']].map(function (x) { return h('div', { class: 'dato' }, h('small', {}, x[0]), h('strong', { 'data-dato': x[2] }, 'S/ ' + U.money(x[1]))); }),
        Object.keys(d.por_medio).map(function (m) { var x = d.por_medio[m]; return h('div', { class: 'dato' }, h('small', {}, m), h('span', {}, '↑ ' + U.money(x.entradas) + '  ↓ ' + U.money(x.salidas))); }))); }, U.error);
      K.cargando(lista); K.leer('caja.movimientos', Object.assign({ limite: 200 }, fil.valores())).then(function (r) { U.vacio(lista).appendChild(U.tabla([{ t: 'Fecha', f: function (m) { return U.fecha(m.fecha); } }, { t: 'Tipo', f: function (m) { return U.chip(m.tipo, m.tipo === 'Entrada' ? 'ab' : 'dec'); } }, { t: 'Origen', f: function (m) { return m.origen; } },
        { t: 'Concepto', f: function (m) { return m.concepto; } }, { t: 'Detalle', f: function (m) { return m.detalle; } }, { t: 'Medio', f: function (m) { return m.medio; } }, { t: 'Monto', cls: 'num', f: function (m) { return U.money(m.monto); } }, { t: 'Saldo', cls: 'num', f: function (m) { return U.money(m.saldo_acumulado); } },
        { t: '', f: function (m) { return m.revertido_por ? U.chip('revertido', 'dec') : (m.revierte_id ? U.chip('reversa', '') : ''); } }], r.datos.movimientos)); }, U.error);
    }
    cargar();
  } });
})();
