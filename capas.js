/* Capas de inventario (FIFO) — control interno. SOLO Administrador. Nunca se muestran en documentos al cliente. */
(function () {
  'use strict';
  var h = U.h;
  function chipEstado(e) { return U.chip(e, e === 'ACTIVA' ? 'ok' : (e === 'AGOTADA' ? '' : 'dec')); }
  function consumos(capa) {
    K.leer('consumos.listar', { capa_id: capa.id, limite: 500 }).then(function (r) {
      U.modal('Movimientos de la capa ' + capa.id, U.tabla([{ t: 'Fecha', f: function (c) { return U.fecha(c.fecha); } }, { t: 'Operación', f: function (c) { return c.operacion_id; } }, { t: 'Tipo', f: function (c) { return c.tipo_operacion; } },
        { t: 'Movimiento', f: function (c) { return c.tipo_movimiento; } }, { t: 'Cant.', cls: 'num', f: function (c) { return U.num(c.cantidad); } }, { t: 'Costo', cls: 'num', f: function (c) { return U.money(c.costo_unit); } }, { t: 'Total S/', cls: 'num', f: function (c) { return U.money(c.costo_total); } }],
        r.datos.consumos, null, 'Esta capa no tiene movimientos.'), [{ texto: 'Cerrar', id: 'cerrar', cerrar: true }], { ancho: true });
    }, U.error);
  }
  /* Detalle de un producto: sus capas en el orden en que se consumen. */
  function ver(codigo) {
    var cuerpo = h('div', { 'data-capas': codigo }), todas = h('input', { type: 'checkbox', 'data-n': 'incluir_agotadas' });
    var m = U.modal('Capas de ' + codigo, cuerpo, [{ texto: 'Cerrar', id: 'cerrar', cerrar: true }], { ancho: true });
    function cargar() {
      K.cargando(cuerpo);
      K.leer('capas.listar', { producto_codigo: codigo, incluir_agotadas: !!todas.checked }).then(function (r) {
        var d = r.datos, primera = d.capas.filter(function (c) { return c.orden_consumo === 1; })[0];
        U.vacio(cuerpo).appendChild(h('p', {}, h('strong', {}, d.producto.nombre), ' · Stock: ' + U.num(d.producto.stock_actual) + ' · Disponible en capas: ' + U.num(d.disponible_total) + ' · Valor: S/ ' + U.money(d.valor_total)));
        if (d.diferencia_stock) cuerpo.appendChild(h('div', { class: 'aviso warn', 'data-alerta': 'diferencia' }, 'Discrepancia: el stock del producto difiere de la suma de capas en ' + U.num(d.diferencia_stock) + '. Se registra como alerta; no bloquea ventas con capas suficientes.'));
        cuerpo.appendChild(h('p', { class: 'suave' }, primera ? 'Se consume primero: ' + primera.id + ' (ingreso ' + U.fecha(primera.fecha_ingreso) + ', S/ ' + U.money(primera.costo_unit) + ' c/u). La venta elige las capas sola: el vendedor no las selecciona.' : 'No hay capas con stock disponible.'));
        cuerpo.appendChild(h('label', { class: 'chk' }, todas, ' Incluir agotadas y anuladas'));
        cuerpo.appendChild(U.tabla([{ t: 'Orden', cls: 'num', f: function (c) { return c.orden_consumo || '—'; } }, { t: 'Capa', f: function (c) { return c.id; } }, { t: 'Ingreso', f: function (c) { return U.fecha(c.fecha_ingreso); } },
          { t: 'Origen', f: function (c) { return c.origen + (c.costo_migracion ? ' · COSTO DE MIGRACIÓN' : ''); } }, { t: 'Referencia', f: function (c) { return c.referencia; } }, { t: 'Documento', f: function (c) { return c.documento; } }, { t: 'Lote', f: function (c) { return c.lote_fabricante; } },
          { t: 'Ingresó', cls: 'num', f: function (c) { return U.num(c.cantidad_ingresada); } }, { t: 'Disponible', cls: 'num', f: function (c) { return U.num(c.cantidad_disponible); } }, { t: 'Costo S/', cls: 'num', f: function (c) { return U.money(c.costo_unit); } },
          { t: 'Valor S/', cls: 'num', f: function (c) { return U.money(c.valor); } }, { t: 'Estado', f: function (c) { return chipEstado(c.estado); } }],
          d.capas, function (c) { return [{ texto: 'Movimientos', id: 'consumos', onclick: function () { consumos(c); } }]; }, 'Este producto no tiene capas.'));
      }, function (e) { U.vacio(cuerpo).appendChild(h('div', { class: 'aviso error' }, e.message || 'No se pudieron cargar las capas.')); });
    }
    todas.addEventListener('change', cargar); cargar(); return m;
  }
  window.CapasUI = { ver: ver };
  App.pantalla({ id: 'capas', titulo: 'Capas FIFO', roles: ['A'], render: function (cont) {
    var lista = h('div', { 'data-lista': 'capas' }), fil = K.filtros([{ n: 'q', l: 'Código o nombre', t: 'text' }, { n: 'con_diferencia', l: 'Solo con diferencias', t: 'check' }], {}, cargar), datos = null;
    cont.appendChild(h('p', { class: 'suave' }, 'Control interno del inventario por capas (FIFO). Muestra de dónde sale cada unidad y a qué costo. No aparece en cotizaciones, PDF, sticker ni documentos al cliente.'));
    cont.appendChild(fil.el); cont.appendChild(lista);
    function pintar() {
      var f = fil.valores(), q = String(f.q || '').toUpperCase(), filas = datos.productos.filter(function (p) { return (!q || (p.codigo + ' ' + p.nombre).toUpperCase().indexOf(q) >= 0) && (!f.con_diferencia || p.diferencia !== 0); });
      U.vacio(lista).appendChild(h('p', { class: 'suave', 'data-resumen': 'capas' }, filas.length + ' producto(s) · Valor del inventario (suma de capas): S/ ' + U.money(datos.valor_total) + (datos.fecha_corte ? ' · Fecha de corte: ' + U.fecha(datos.fecha_corte) : '')));
      lista.appendChild(U.tabla([{ t: 'Código', f: function (p) { return p.codigo; } }, { t: 'Producto', f: function (p) { return p.nombre; } }, { t: 'Stock', cls: 'num', f: function (p) { return U.num(p.stock_actual); } }, { t: 'En capas', cls: 'num', f: function (p) { return U.num(p.disponible_capas); } },
        { t: 'Capas', cls: 'num', f: function (p) { return p.capas_activas; } }, { t: 'Valor S/', cls: 'num', f: function (p) { return U.money(p.valor); } }, { t: 'Dif.', cls: 'num', f: function (p) { return p.diferencia ? U.chip(U.num(p.diferencia), 'dec') : '—'; } }],
        filas, function (p) { return [{ texto: 'Ver capas', id: 'ver-capas', onclick: function () { ver(p.codigo); } }]; }, 'Sin productos.'));
    }
    function cargar() { if (datos) return pintar(); K.cargando(lista); K.leer('capas.listar', { resumen: true }).then(function (r) { datos = r.datos; pintar(); }, U.error); }
    cargar();
  } });
})();
