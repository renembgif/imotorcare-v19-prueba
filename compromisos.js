/* Compromisos de pago, pagos y movimientos de socios. Solo Administrador. */
(function () {
  'use strict';
  var h = U.h;
  function plazoCampos(def) { return [{ n: 'plazo_modo', l: 'Plazo', t: 'select', req: true, opciones: [{ v: 'dias', l: 'En N días' }, { v: 'fecha', l: 'En una fecha exacta' }, { v: 'sin', l: 'Sin plazo' }], def: def || 'dias' },
    { n: 'plazo_dias', l: 'Días', t: 'number', req: true, visible: function (v) { return v.plazo_modo === 'dias'; } }, { n: 'plazo_fecha', l: 'Vence el', t: 'date', req: true, visible: function (v) { return v.plazo_modo === 'fecha'; } }]; }
  function plazoDe(v) { return v.plazo_modo === 'dias' ? { dias: v.plazo_dias } : v.plazo_modo === 'fecha' ? { vencimiento: v.plazo_fecha } : { sin: true }; }
  function nuevo(alTerminar) {
    F.dialogo('Nuevo compromiso (sin compra)', [{ n: 'tipo', l: 'Tipo', t: 'select', req: true, opciones: function () { return Datos.catalogo('tipo_compromiso'); } }, { n: 'beneficiario', l: 'Beneficiario', t: 'text', req: true }, { n: 'categoria', l: 'Categoría', t: 'text' }, { n: 'origen', l: 'Origen / comprobante', t: 'text' },
      { n: 'monto_total', l: 'Monto total (S/)', t: 'number', req: true, paso: '0.01' }, { n: 'fecha', l: 'Fecha de registro', t: 'date', req: true, def: U.hoy }].concat(plazoCampos(), [{ n: 'observacion', l: 'Observación', t: 'text' }]), {},
      function (v) { var d = { tipo: v.tipo, beneficiario: v.beneficiario, categoria: v.categoria, origen: v.origen, monto_total: v.monto_total, fecha: v.fecha, observacion: v.observacion, plazo: plazoDe(v) }; return K.escribir('compromisos.registrar', d); },
      { ancho: true, alTerminar: function () { U.toast('Compromiso registrado.', 'ok'); alTerminar(); } });
  }
  function editar(c, alTerminar) {
    var libre = !c.de_compra, campos = [{ n: 'categoria', l: 'Categoría', t: 'text' }, { n: 'vencimiento', l: 'Vencimiento', t: 'date' }, { n: 'sin_plazo', l: 'Sin plazo', t: 'check' }, { n: 'observacion', l: 'Observación', t: 'text' }];
    if (libre) campos = [{ n: 'tipo', l: 'Tipo', t: 'select', opciones: function () { return Datos.catalogo('tipo_compromiso'); } }, { n: 'beneficiario', l: 'Beneficiario', t: 'text' }, { n: 'origen', l: 'Origen', t: 'text' }, { n: 'monto_total', l: 'Monto total', t: 'number', paso: '0.01' }].concat(campos);
    else campos.unshift({ n: '_', l: '', t: 'text', visible: function () { return false; } });
    F.dialogo('Editar compromiso ' + c.id, campos, Object.assign({}, c, { sin_plazo: !c.vencimiento }), function (v) {
      var cam = K.cambios(v, c, libre ? ['tipo', 'beneficiario', 'origen', 'monto_total', 'categoria', 'observacion'] : ['categoria', 'observacion']);
      if (v.sin_plazo) { if (c.vencimiento) cam.vencimiento = null; } else if (v.vencimiento && v.vencimiento !== c.vencimiento) cam.vencimiento = v.vencimiento;
      if (!Object.keys(cam).length) throw new Error('No hay cambios que guardar.'); return K.escribir('compromisos.editar', { id: c.id, version: c.version, cambios: cam });
    }, { ancho: true, alTerminar: function () { U.toast('Compromiso actualizado.', 'ok'); alTerminar(); } });
  }
  function pagar(c, alTerminar) {
    F.dialogo('Pagar ' + c.id + ' · saldo S/ ' + U.money(c.saldo), [{ n: 'fecha', l: 'Fecha', t: 'date', req: true, def: U.hoy }, { n: 'monto', l: 'Monto (S/)', t: 'number', req: true, paso: '0.01', def: c.saldo }, { n: 'medio', l: 'Medio', t: 'select', req: true, opciones: function () { return Datos.catalogo('medio_pago'); }, def: 'Efectivo' }, { n: 'observacion', l: 'Observación', t: 'text' }, K.campoIdTemporal], {},
      function (v) { var opId = K.idTemporal(v); v.compromiso_id = c.id; return K.escribir('compromisos.pagar', v, opId); }, { alTerminar: function (r) { U.toast('Pago registrado.' + (c.tipo === 'Socio' ? ' Se generó la devolución al socio.' : ''), 'ok'); alTerminar(); } });
  }
  function historial(c, alTerminar) {
    var cuerpo = h('div', {}); var m = U.modal('Pagos de ' + c.id, cuerpo, [{ texto: 'Cerrar', cerrar: true }], { ancho: true });
    function cargar() { K.leer('compromisos.historial', { compromiso_id: c.id, todos: true }).then(function (r) { U.vacio(cuerpo).appendChild(U.tabla([{ t: 'ID', f: function (p) { return p.id; } }, { t: 'Fecha', f: function (p) { return U.fecha(p.fecha); } }, { t: 'Monto', cls: 'num', f: function (p) { return U.money(p.monto); } }, { t: 'Medio', f: function (p) { return p.medio; } }, { t: 'Observación', f: function (p) { return p.observacion; } }, { t: '', f: K.estadoReg }], r.datos.pagos,
      function (p) { return p.estado === 'Anulado' ? [] : [{ texto: 'Editar', id: 'editar-pago', onclick: function () { F.dialogo('Editar pago ' + p.id, [{ n: 'fecha', l: 'Fecha', t: 'date', req: true }, { n: 'monto', l: 'Monto', t: 'number', req: true, paso: '0.01' }, { n: 'medio', l: 'Medio', t: 'select', req: true, opciones: function () { return Datos.catalogo('medio_pago'); } }, { n: 'observacion', l: 'Observación', t: 'text' }], p,
        function (v) { var cam = K.cambios(v, p, ['fecha', 'monto', 'medio', 'observacion']); if (!Object.keys(cam).length) throw new Error('No hay cambios que guardar.'); return K.escribir('pagos.editar', { id: p.id, version: p.version, cambios: cam }); }, { alTerminar: function () { cargar(); alTerminar(); } }); } },
        { texto: 'Anular', id: 'anular-pago', onclick: function () { K.pedirMotivo('Anular pago ' + p.id).then(function (mot) { if (mot) K.escribir('pagos.anular', { id: p.id, version: p.version, motivo: mot }).then(function () { U.toast('Pago anulado.', 'ok'); cargar(); alTerminar(); }, U.error); }); } }]; }, 'Este compromiso no tiene pagos.')); }, U.error); }
    cargar();
  }
  App.pantalla({ id: 'compromisos', titulo: 'Compromisos', roles: ['A'], render: function (cont) {
    var lista = h('div', { 'data-lista': 'compromisos' }), fil = K.filtros([{ n: 'q', l: 'Beneficiario u origen', t: 'text' }, { n: 'estado_pago', l: 'Estado', t: 'select', vacio: 'Todos', opciones: ['Pendiente', 'Parcial', 'Vencido', 'Pagado'] }, { n: 'tipo', l: 'Tipo', t: 'select', vacio: 'Todos', opciones: function () { return Datos.catalogo('tipo_compromiso'); } }], {}, cargar);
    cont.appendChild(h('div', { class: 'barra-acc' }, h('button', { class: 'primario', 'data-accion': 'nuevo-compromiso', type: 'button', onclick: function () { nuevo(cargar); } }, '➕ Nuevo compromiso'))); cont.appendChild(fil.el); cont.appendChild(lista);
    function cargar() { K.cargando(lista); K.leer('compromisos.listar', fil.valores()).then(function (r) {
      U.vacio(lista).appendChild(h('p', { class: 'suave', 'data-total-saldo': '1' }, 'Saldo pendiente total: S/ ' + U.money(r.datos.total_saldo)));
      lista.appendChild(U.tabla([{ t: '', f: function (c) { return c.semaforo; } }, { t: 'ID', f: function (c) { return c.id; } }, { t: 'Beneficiario', f: function (c) { return c.beneficiario; } }, { t: 'Origen', f: function (c) { return c.origen; } }, { t: 'Total', cls: 'num', f: function (c) { return U.money(c.monto_total); } }, { t: 'Pagado', cls: 'num', f: function (c) { return U.money(c.monto_pagado); } },
        { t: 'Saldo', cls: 'num', f: function (c) { return U.money(c.saldo); } }, { t: 'Vence', f: function (c) { return c.vencimiento ? U.fecha(c.vencimiento) : 'Sin plazo'; } }, { t: 'Estado', f: function (c) { return c.estado_pago + (c.dias_para_vencer ? ' · ' + c.dias_para_vencer : ''); } }, { t: 'Socio', f: function (c) { return c.socio_nombre; } }],
        r.datos.compromisos, function (c) { return [c.estado_pago !== 'Pagado' ? { texto: 'Pagar', id: 'pagar', onclick: function () { pagar(c, cargar); } } : null, { texto: 'Pagos', id: 'historial', onclick: function () { historial(c, cargar); } }, { texto: 'Editar', id: 'editar', onclick: function () { editar(c, cargar); } },
          !c.de_compra && !c.monto_pagado ? { texto: 'Anular', id: 'anular', onclick: function () { K.pedirMotivo('Anular compromiso ' + c.id).then(function (m) { if (m) K.escribir('compromisos.anular', { id: c.id, version: c.version, motivo: m }).then(function () { U.toast('Compromiso anulado.', 'ok'); cargar(); }, U.error); }); } } : null]; })); }, U.error); }
    cargar();
  } });

  // ---------- Socios y financiamiento ----------
  var CAMPOS_MOV = ['fecha', 'socio_id', 'tipo', 'monto', 'ingresa_a_caja', 'compromiso_id', 'observacion'];
  function movimiento(m, alTerminar) {
    var campos = [{ n: 'fecha', l: 'Fecha', t: 'date', req: true, def: U.hoy }, { n: 'socio_id', l: 'Socio', t: 'socio', req: true }, { n: 'tipo', l: 'Tipo', t: 'select', req: true, opciones: function () { return Datos.catalogo('tipo_movimiento_socio'); } }, { n: 'monto', l: 'Monto (S/)', t: 'number', req: true, paso: '0.01' },
      { n: 'ingresa_a_caja', l: '¿Ingresa a Caja?', t: 'select', opciones: ['Sí', 'No'], def: 'Sí', visible: function (v) { return v.tipo === 'Aporte' || v.tipo === 'Préstamo'; } }, { n: 'observacion', l: 'Observación', t: 'text' }].concat(m ? [] : [K.campoIdTemporal]);
    F.dialogo(m ? 'Editar movimiento ' + m.id : 'Nuevo movimiento de socio', campos, m || {}, function (v) {
      if (!m) { var opId = K.idTemporal(v); return K.escribir('socios.movimientos.registrar', v, opId); }
      var cam = K.cambios(v, m, CAMPOS_MOV); if (!Object.keys(cam).length) throw new Error('No hay cambios que guardar.'); return K.escribir('socios.movimientos.editar', { id: m.id, version: m.version, cambios: cam });
    }, { ancho: true, alTerminar: function () { U.toast('Movimiento guardado.', 'ok'); alTerminar(); } });
  }
  App.pantalla({ id: 'socios', titulo: 'Socios', roles: ['A'], render: function (cont) {
    var resumen = h('div', { 'data-lista': 'socios-resumen' }), lista = h('div', { 'data-lista': 'socios-mov' }), maestro = h('div', { 'data-lista': 'socios-lista' });
    var fil = K.filtros([{ n: 'socio_id', l: 'Socio', t: 'socio' }, { n: 'tipo', l: 'Tipo', t: 'select', vacio: 'Todos', opciones: function () { return Datos.catalogo('tipo_movimiento_socio'); } }], {}, cargar);
    cont.appendChild(h('div', { class: 'barra-acc' }, h('button', { class: 'primario', 'data-accion': 'nuevo-movimiento', type: 'button', onclick: function () { movimiento(null, cargar); } }, '➕ Nuevo movimiento'), h('button', { 'data-accion': 'nuevo-socio', type: 'button', onclick: function () {
      F.dialogo('Nuevo socio', [{ n: 'nombre', l: 'Nombre', t: 'text', req: true }], {}, function (v) { return K.escribir('socios.crear', v); }, { alTerminar: function () { U.toast('Socio creado.', 'ok'); App.recargarDatos().then(cargar); } }); } }, 'Nuevo socio')));
    cont.appendChild(resumen); cont.appendChild(maestro); cont.appendChild(fil.el); cont.appendChild(lista);
    function cargar() {
      K.leer('socios.listar', {}).then(function (r) { U.vacio(maestro).appendChild(U.tabla([{ t: 'ID', f: function (s) { return s.id; } }, { t: 'Nombre', f: function (s) { return s.nombre; } }, { t: 'Activo', f: function (s) { return s.activo ? 'Sí' : 'No'; } }], r.datos.socios, function (s) { return [{ texto: 'Renombrar', id: 'editar-socio', onclick: function () { F.dialogo('Editar socio ' + s.id, [{ n: 'nombre', l: 'Nombre', t: 'text', req: true }], s, function (v) { return K.escribir('socios.editar', { id: s.id, version: s.version, nombre: v.nombre }); }, { alTerminar: function () { App.recargarDatos().then(cargar); } }); } },
        s.activo ? { texto: 'Desactivar', id: 'desactivar-socio', onclick: function () { K.escribir('socios.desactivar', { id: s.id, version: s.version }).then(function () { App.recargarDatos().then(cargar); }, U.error); } } : null]; })); });
      K.cargando(lista); K.leer('socios.movimientos.listar', fil.valores()).then(function (r) {
        U.vacio(resumen).appendChild(h('div', { class: 'tarjetas' }, r.datos.socios.map(function (s) { return h('div', { class: 'dato', 'data-socio': s.socio }, h('small', {}, s.socio), h('strong', {}, 'Pendiente S/ ' + U.money(s.pendiente)), h('span', {}, 'Financiado ' + U.money(s.total_financiado) + ' · Recuperado ' + U.money(s.total_recuperado) + ' · Retiros ' + U.money(s.retiros))); }).concat([h('div', { class: 'dato' }, h('small', {}, 'Pendiente del negocio'), h('strong', { 'data-dato': 'pendiente-negocio' }, 'S/ ' + U.money(r.datos.pendiente_negocio)))])));
        U.vacio(lista).appendChild(U.tabla([{ t: 'ID', f: function (m) { return m.id; } }, { t: 'Fecha', f: function (m) { return U.fecha(m.fecha); } }, { t: 'Socio', f: function (m) { return m.socio_nombre; } }, { t: 'Tipo', f: function (m) { return m.tipo; } }, { t: 'Monto', cls: 'num', f: function (m) { return U.money(m.monto); } }, { t: 'A Caja', f: function (m) { return m.ingresa_a_caja; } }, { t: 'Compromiso', f: function (m) { return m.compromiso_id; } }, { t: 'Observación', f: function (m) { return m.observacion; } }, { t: '', f: K.estadoReg }],
          r.datos.movimientos, function (m) { return (m.estado === 'Anulado') ? [] : m.derivado ? [{ texto: 'Se edita desde la compra o el pago', id: 'derivado', onclick: function () { U.toast(m.pago_id ? 'Nace de un pago de compromiso: edita el pago.' : 'Nace de una compra pagada por el socio: edita la compra.', 'warn'); } }]
            : [{ texto: 'Editar', id: 'editar', onclick: function () { movimiento(m, cargar); } }, { texto: 'Anular', id: 'anular', onclick: function () { K.pedirMotivo('Anular movimiento ' + m.id).then(function (mo) { if (mo) K.escribir('socios.movimientos.anular', { id: m.id, version: m.version, motivo: mo }).then(function () { U.toast('Movimiento anulado.', 'ok'); cargar(); }, U.error); }); } }]; })); }, U.error);
    }
    cargar();
  } });
})();
