/* SUNAT: resumen mensual y comprobantes (TC SUNAT por llave). Solo Administrador. */
(function () {
  'use strict';
  var h = U.h;
  function tc(c, alTerminar) {
    F.dialogo('TC SUNAT de ' + c.llave, [{ n: 'tc_sunat', l: 'Tipo de cambio SUNAT (entre 1 y 10)', t: 'number', req: true, paso: '0.0001' }], { tc_sunat: c.tc_sunat || '' },
      function (v) { return K.escribir('sunat.editar_tc', { llave: c.llave, tc_sunat: v.tc_sunat }); }, { alTerminar: function () { U.toast('TC SUNAT guardado.', 'ok'); alTerminar(); } });
  }
  function datos(c, alTerminar) {
    var cs = [['fecha_sunat', 'Fecha SUNAT', 'date'], ['proveedor_sunat', 'Proveedor (SUNAT)', 'text'], ['ruc_sunat', 'RUC', 'text'], ['tipo_doc_sunat', 'Tipo de documento', 'text'], ['serie_sunat', 'Serie', 'text'], ['numero_sunat', 'Número', 'text'], ['base_sunat', 'Base imponible', 'number'], ['igv_sunat', 'IGV', 'number'], ['total_sunat', 'Total', 'number']];
    F.dialogo('Datos SUNAT de ' + c.llave, cs.map(function (x) { return { n: x[0], l: x[1], t: x[2], paso: x[2] === 'number' ? '0.01' : null }; }), c, function (v) {
      var campos = {}; cs.forEach(function (x) { var a = v[x[0]], b = c[x[0]]; if (a !== undefined && String(a) !== String(b === null ? '' : b)) campos[x[0]] = a; else if (a === undefined && b !== null && b !== '') campos[x[0]] = null; });
      if (!Object.keys(campos).length) throw new Error('No hay cambios que guardar.'); var d = { llave: c.llave, campos: campos }; if (c.version) d.version = c.version; return K.escribir('sunat.guardar', d);
    }, { ancho: true, alTerminar: function () { U.toast('Datos SUNAT guardados.', 'ok'); alTerminar(); } });
  }
  App.pantalla({ id: 'sunat', titulo: 'SUNAT', roles: ['A'], render: function (cont) {
    var res = h('div', { 'data-lista': 'sunat-resumen' }), lista = h('div', { 'data-lista': 'sunat' });
    var fil = K.filtros([{ n: 'periodo', l: 'Periodo (AAAA-MM)', t: 'text', req: true, def: function () { return U.hoy().slice(0, 7); } }], {}, cargar); cont.appendChild(fil.el); cont.appendChild(res); cont.appendChild(lista);
    function cargar() {
      var p = fil.valores().periodo; K.cargando(res);
      K.leer('reportes.resumen_sunat', { periodo: p }).then(function (r) { var d = r.datos; U.vacio(res).appendChild(h('div', { class: 'tarjetas' }, [['Periodo', d.periodo + (Datos.periodoDeclarado(d.periodo + '-01') ? ' · DECLARADO' : '')], ['Ventas base (con comprobante)', d.ventas_base], ['IGV ventas', d.igv_ventas], ['Compras base (' + d.fuente_compras + ')', d.compras_base], ['IGV compras', d.igv_compras], ['IGV a pagar', d.igv_a_pagar], ['Renta RER', d.renta_rer], ['Total SUNAT', d.total_sunat], ['Ganancia', d.ganancia]]
        .map(function (x) { return h('div', { class: 'dato' }, h('small', {}, x[0]), h('strong', { 'data-dato': x[0] }, typeof x[1] === 'number' ? 'S/ ' + U.money(x[1]) : x[1])); }))); }, function (e) { U.vacio(res); U.error(e); });
      K.cargando(lista); K.leer('sunat.listar', { periodo: p }).then(function (r) { U.vacio(lista).appendChild(h('p', { class: 'suave' }, r.datos.comprobantes.length + ' comprobante(s) · ' + r.datos.pendientes_tc + ' con TC pendiente'));
        lista.appendChild(U.tabla([{ t: 'Llave', f: function (c) { return c.llave; } }, { t: 'Estado', f: function (c) { return U.chip(c.estado, c.estado === 'CUADRADO' ? 'ab' : 'dec'); } }, { t: 'Moneda', f: function (c) { return c.moneda; } }, { t: 'TC SUNAT', cls: 'num', f: function (c) { return c.tc_sunat || ''; } }, { t: 'Total comercial', cls: 'num', f: function (c) { return U.money(c.total_comercial); } },
          { t: 'Total fiscal', cls: 'num', f: function (c) { return U.money(c.total_fiscal); } }, { t: 'Base SUNAT', cls: 'num', f: function (c) { return U.money(c.base_sunat); } }, { t: 'IGV SUNAT', cls: 'num', f: function (c) { return U.money(c.igv_sunat); } }, { t: 'Doc. relacionado', f: function (c) { return c.documento_relacionado; } }],
          r.datos.comprobantes, function (c) { return [c.moneda === 'Dólares' ? { texto: 'TC SUNAT', id: 'tc', onclick: function () { tc(c, cargar); } } : null, { texto: 'Datos SUNAT', id: 'datos', onclick: function () { datos(c, cargar); } }]; })); }, U.error);
    }
    cargar();
  } });
})();
