/* Ventas, Deudores y Caja de ventas por periodo. */
(function () {
  'use strict';
  var h = U.h;
  var CAMPOS_VENTA = ['fecha', 'hora', 'producto_codigo', 'cantidad', 'descuento_unit', 'ajuste_unit', 'cliente', 'estado_pago', 'fecha_cobro', 'tipo_comprobante', 'metodo_pago'];
  function camposCab() {
    return [{ n: 'fecha', l: 'Fecha', t: 'date', req: true, def: U.hoy }, { n: 'cliente', l: 'Cliente', t: 'text', ayuda: 'Vacío = Cliente genérico' },
      { n: 'tipo_comprobante', l: 'Comprobante', t: 'select', req: true, opciones: function () { return Datos.catalogo('comprobante_venta'); }, def: 'Nota de Venta / Sin Comprobante' },
      { n: 'metodo_pago', l: 'Método de pago', t: 'select', req: true, opciones: function () { return Datos.catalogo('medio_pago'); }, def: 'Efectivo' },
      { n: 'estado_pago', l: 'Estado de pago', t: 'select', req: true, opciones: function () { return Datos.catalogo('estado_pago_venta'); }, def: 'Cobrado' },
      { n: 'fecha_cobro', l: 'Fecha de cobro', t: 'date', visible: function (v) { return v.estado_pago === 'Cobrado'; }, ayuda: 'Vacío = la fecha de la venta' }, K.campoIdTemporal];
  }
  /* Diálogo "Nueva venta" (carrito de varias líneas). preset: { cliente, lineas, cotizacion_numero, titulo } para "Generar venta" desde una cotización. */
  function dialogoVenta(alTerminar, preset) {
    preset = preset || {}; var cab = F.crear(camposCab(), preset.cliente ? { cliente: preset.cliente } : {}), total = h('p', { class: 'suave', 'data-total': '1' });
    var lin = K.lineasEditor(preset.lineas ? [{ n: 'precio_cotizado', l: 'Precio cotizado (S/ por unidad)', t: 'number', paso: '0.01' }] : [{ n: 'descuento_unit', l: 'Descuento (S/ por unidad)', t: 'number', paso: '0.01' }, { n: 'ajuste_unit', l: 'Ajuste (S/ por unidad)', t: 'number', paso: '0.01' }], preset.lineas, estimar);
    function estimar() {
      var t = 0; lin.valores().forEach(function (l) { var p = Datos.producto(l.producto_codigo); if (!p) return; var precio = preset.lineas ? (l.precio_cotizado !== undefined ? l.precio_cotizado : p.precio_venta) : (p.precio_venta - (l.descuento_unit || 0) + (l.ajuste_unit || 0)); t += (l.cantidad || 0) * precio; });
      total.textContent = 'Total estimado: S/ ' + U.money(t) + ' (el sistema calcula el definitivo con el precio vigente)';
    }
    var cont = h('div', {}, preset.titulo ? h('p', { class: 'suave' }, preset.titulo) : null, cab.el, h('h4', {}, 'Productos'), lin.el, total); estimar();
    var m = U.modal(preset.cotizacion_numero ? 'Generar venta desde la cotización ' + preset.cotizacion_numero : 'Nueva venta', cont, [{ texto: 'Cancelar', cerrar: true }, { texto: 'Registrar venta', id: 'guardar', clase: 'primario', onclick: function (mm) {
      var fl = cab.faltante() || lin.faltante(); if (fl) { mm.error('Falta: ' + fl + '.'); return; } mm.error(''); mm.ocupado(true);
      var d = cab.valores(), opId = K.idTemporal(d); d.lineas = lin.valores(); if (preset.cotizacion_numero) d.cotizacion_numero = preset.cotizacion_numero;
      K.escribir('ventas.registrar', d, opId).then(function (r) { mm.cerrar(); U.toast('Venta registrada: S/ ' + U.money(r.datos.total) + (r.datos.carrito_id ? ' (' + r.datos.carrito_id + ')' : ''), 'ok'); if (alTerminar) alTerminar(r); }, function (e) { mm.ocupado(false); mm.error(e.message); });
    } }], { ancho: true });
    cab.el.addEventListener('input', estimar); return m;
  }
  function editar(v, alTerminar) {
    var campos = [{ n: 'fecha', l: 'Fecha', t: 'date', req: true }].concat(App.rol() === 'A' ? [{ n: 'hora', l: 'Hora', t: 'hora' }] : []).concat([
      { n: 'producto_codigo', l: 'Producto', t: 'producto', req: true, ayuda: 'Cambiar el producto congela el precio y costo vigentes del nuevo.' }, { n: 'cantidad', l: 'Cantidad', t: 'number', req: true, paso: '0.001' },
      { n: 'descuento_unit', l: 'Descuento (por unidad)', t: 'number', paso: '0.01' }, { n: 'ajuste_unit', l: 'Ajuste (por unidad)', t: 'number', paso: '0.01' }, { n: 'cliente', l: 'Cliente', t: 'text' },
      { n: 'tipo_comprobante', l: 'Comprobante', t: 'select', req: true, opciones: function () { return Datos.catalogo('comprobante_venta'); } }, { n: 'metodo_pago', l: 'Método de pago', t: 'select', req: true, opciones: function () { return Datos.catalogo('medio_pago'); } },
      { n: 'estado_pago', l: 'Estado de pago', t: 'select', req: true, opciones: function () { return Datos.catalogo('estado_pago_venta'); } }, { n: 'fecha_cobro', l: 'Fecha de cobro', t: 'date', visible: function (x) { return x.estado_pago === 'Cobrado'; } }]);
    if (App.rol() === 'A') campos.push({ n: 'recongelar', l: 'Re-congelar precio y costo vigentes (solo Administrador)', t: 'check' }, { n: 'motivo_cambio', l: 'Motivo (obligatorio si re-congelas)', t: 'text', visible: function (x) { return x.recongelar; } });
    var ini = Object.assign({}, v);
    F.dialogo('Editar venta ' + v.id, campos, ini, function (val) {
      var cam = K.cambios(val, v, CAMPOS_VENTA); var d = { id: v.id, version: v.version, cambios: cam };
      if (val.recongelar) { d.recongelar_precio = true; d.motivo = val.motivo_cambio; }
      if (!Object.keys(cam).length && !d.recongelar_precio) throw new Error('No hay cambios que guardar.');
      return K.escribir('ventas.editar', d);
    }, { ancho: true, alTerminar: function () { U.toast('Venta actualizada.', 'ok'); alTerminar(); } });
  }
  function cobrar(v, alTerminar) {
    F.dialogo('Cobrar venta ' + v.id, [{ n: 'fecha_cobro', l: 'Fecha de cobro', t: 'date', req: true, def: U.hoy }, { n: 'metodo_pago', l: 'Método de pago', t: 'select', req: true, opciones: function () { return Datos.catalogo('medio_pago'); }, def: v.metodo_pago }],
      {}, function (val) { return K.escribir('ventas.cobrar', { id: v.id, version: v.version, fecha_cobro: val.fecha_cobro, metodo_pago: val.metodo_pago }); }, { alTerminar: function () { U.toast('Cobro registrado.', 'ok'); alTerminar(); } });
  }
  function reactivar(v, alTerminar) {
    F.dialogo('Reactivar venta ' + v.id, [{ n: 'estado_pago', l: 'Estado de pago al reactivar', t: 'select', req: true, opciones: function () { return Datos.catalogo('estado_pago_venta'); }, def: 'Cobrado' }], {},
      function (val) { return K.escribir('ventas.editar', { id: v.id, version: v.version, cambios: { estado_pago: val.estado_pago } }); }, { alTerminar: function () { U.toast('Venta reactivada.', 'ok'); alTerminar(); } });
  }
  function anular(v, alTerminar) { K.pedirMotivo('Anular venta ' + v.id).then(function (m) { if (!m) return; K.escribir('ventas.anular', { id: v.id, version: v.version, motivo: m }).then(function () { U.toast('Venta anulada.', 'ok'); alTerminar(); }, U.error); }); }
  function eliminar(v, alTerminar) { K.pedirMotivo('Eliminar venta ' + v.id + ' (no se puede deshacer)').then(function (m) { if (!m) return; K.escribir('ventas.eliminar', { id: v.id, version: v.version, motivo: m }).then(function () { U.toast('Venta eliminada. Queda copia en auditoría.', 'ok'); alTerminar(); }, U.error); }); }
  window.VentasUI = { dialogoVenta: dialogoVenta };

  App.pantalla({ id: 'ventas', titulo: 'Ventas', roles: ['A', 'O'], render: function (cont) {
    var lista = h('div', { 'data-lista': 'ventas' });
    var fil = K.filtros([{ n: 'desde', l: 'Desde', t: 'date' }, { n: 'hasta', l: 'Hasta', t: 'date' }, { n: 'q', l: 'Cliente o producto', t: 'text' }, { n: 'estado_pago', l: 'Pago', t: 'select', opciones: function () { return Datos.catalogo('estado_pago_venta'); }, vacio: 'Todos' }], {}, cargar);
    cont.appendChild(h('div', { class: 'barra-acc' }, h('button', { class: 'primario', 'data-accion': 'nueva-venta', type: 'button', onclick: function () { dialogoVenta(cargar); } }, '➕ Nueva venta'))); cont.appendChild(fil.el); cont.appendChild(lista);
    function cargar() {
      K.cargando(lista); K.leer('ventas.listar', fil.valores()).then(function (r) {
        var A = App.rol() === 'A', filas = r.datos.ventas;
        U.vacio(lista).appendChild(h('p', { class: 'suave' }, filas.length + ' línea(s) · Total vigente: S/ ' + U.money(filas.filter(function (x) { return !x.anulada; }).reduce(function (a, x) { return a + x.subtotal; }, 0))));
        lista.appendChild(U.tabla([{ t: 'Fecha', f: function (v) { return U.fecha(v.fecha); } }, { t: 'Hora', f: function (v) { return v.hora; } }, { t: 'Cliente', f: function (v) { return v.cliente; } }, { t: 'Producto', f: function (v) { return v.producto_nombre; } },
          { t: 'Cant.', cls: 'num', f: function (v) { return U.num(v.cantidad); } }, { t: 'P. final', cls: 'num', f: function (v) { return U.money(v.precio_final_unit); } }, { t: 'Subtotal', cls: 'num', f: function (v) { return U.money(v.subtotal); } },
          { t: 'Pago', f: function (v) { return v.anulada ? U.chip('Anulada', 'dec') : K.estadoPago(v.estado_pago); } }, { t: 'Comprobante', f: function (v) { return v.tipo_comprobante; } }, { t: 'Método', f: function (v) { return v.metodo_pago; } }],
          filas, function (v) { return v.anulada ? [{ texto: 'Reactivar', id: 'reactivar', onclick: function () { reactivar(v, cargar); } }, A ? { texto: 'Eliminar', id: 'eliminar', onclick: function () { eliminar(v, cargar); } } : null]
            : [{ texto: 'Editar', id: 'editar', onclick: function () { editar(v, cargar); } }, v.estado_pago === 'Pendiente' ? { texto: 'Cobrar', id: 'cobrar', onclick: function () { cobrar(v, cargar); } } : null, { texto: 'Anular', id: 'anular', onclick: function () { anular(v, cargar); } }, A ? { texto: 'Eliminar', id: 'eliminar', onclick: function () { eliminar(v, cargar); } } : null]; }));
      }, function (e) { U.vacio(lista); U.error(e); });
    }
    cargar();
  } });

  App.pantalla({ id: 'deudores', titulo: 'Deudores', roles: ['A', 'O'], render: function (cont) {
    var lista = h('div', { 'data-lista': 'deudores' }), fil = K.filtros([{ n: 'q', l: 'Cliente o producto', t: 'text' }], {}, cargar); cont.appendChild(fil.el); cont.appendChild(lista);
    function cargar() { K.cargando(lista); K.leer('deudores.listar', fil.valores()).then(function (r) { U.vacio(lista).appendChild(h('p', { class: 'suave', 'data-total-pendiente': '1' }, 'Total pendiente: S/ ' + U.money(r.datos.total_pendiente)));
      lista.appendChild(U.tabla([{ t: 'Fecha', f: function (d) { return U.fecha(d.fecha); } }, { t: 'Cliente', f: function (d) { return d.cliente; } }, { t: 'Producto', f: function (d) { return d.producto_nombre; } }, { t: 'Monto', cls: 'num', f: function (d) { return U.money(d.monto); } }, { t: 'Días', cls: 'num', f: function (d) { return d.dias; } }],
        r.datos.deudores, function (d) { return [{ texto: 'Cobrar', id: 'cobrar', onclick: function () { cobrar(d, cargar); } }]; }, 'No hay deudas pendientes.')); }, U.error); }
    cargar();
  } });

  App.pantalla({ id: 'cajaventas', titulo: 'Caja de ventas', roles: ['A', 'O'], render: function (cont) {
    var res = h('div', { 'data-lista': 'cajaventas' });
    var fil = K.filtros([{ n: 'tipo', l: 'Periodo', t: 'select', req: true, opciones: [{ v: 'semana', l: 'Semana (lunes a domingo)' }, { v: 'mes', l: 'Mes' }, { v: 'todo', l: 'Todo' }], def: 'semana' },
      { n: 'semana', l: 'Fecha dentro de la semana', t: 'date', visible: function (v) { return v.tipo === 'semana'; } }, { n: 'mes', l: 'Mes (AAAA-MM)', t: 'text', visible: function (v) { return v.tipo === 'mes'; }, def: function () { return U.hoy().slice(0, 7); } }], {}, cargar);
    cont.appendChild(fil.el); cont.appendChild(h('p', { class: 'suave' }, 'Suma las ventas no anuladas, incluidas las pendientes. No es la Caja real (ver pantalla Caja).')); cont.appendChild(res);
    function cargar() { K.cargando(res); K.leer('caja.ventas_resumen', fil.valores()).then(function (r) { var s = r.datos.resumen;
      U.vacio(res).appendChild(h('div', { class: 'tarjetas' }, [['Periodo', r.datos.label], ['Ventas totales', 'S/ ' + U.money(s.ventas_totales)], ['Efectivo', 'S/ ' + U.money(s.efectivo)], ['Yape', 'S/ ' + U.money(s.yape)]].concat(s.otros.map(function (o) { return [o.metodo, 'S/ ' + U.money(o.total)]; })).concat([['Nº de ventas', s.num_ventas]]).map(function (x) { return h('div', { class: 'dato' }, h('small', {}, x[0]), h('strong', {}, x[1])); })));
      res.appendChild(U.tabla([{ t: 'Fecha', f: function (v) { return U.fecha(v.fecha); } }, { t: 'Cliente', f: function (v) { return v.cliente; } }, { t: 'Comprobante', f: function (v) { return v.comprobante; } }, { t: 'Método', f: function (v) { return v.metodo_pago; } }, { t: 'Total', cls: 'num', f: function (v) { return U.money(v.total); } }], r.datos.ventas)); }, U.error); }
    cargar();
  } });
})();
