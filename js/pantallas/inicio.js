/* Inicio: resumen del negocio y accesos rápidos (equivale al "Inicio" de V18_4). Usa solo acciones del motor. */
(function () {
  'use strict';
  var h = U.h;
  App.pantalla({ id: 'inicio', titulo: 'Inicio', roles: ['A', 'O'], render: function (cont) {
    var A = App.rol() === 'A', u = API.usuario(), kpis = h('div', { class: 'tarjetas', 'data-lista': 'inicio' });
    cont.appendChild(h('div', { class: 'saludo' }, h('h2', {}, 'Hola, ' + (u ? u.nombre : '')), h('span', { class: 'suave' }, U.fecha(U.hoy()))));
    cont.appendChild(h('div', { class: 'acceso-rapido' }, h('button', { class: 'primario', 'data-accion': 'inicio-vender', type: 'button', onclick: function () { App.irA('ventas'); VentasUI.dialogoVenta(function () { App.recargar(); }); } }, '🛒 Nueva venta'),
      h('button', { 'data-accion': 'inicio-cotizar', type: 'button', onclick: function () { App.irA('cotizaciones'); } }, '📝 Cotizar'), h('button', { 'data-accion': 'inicio-stock', type: 'button', onclick: function () { App.irA('productos'); } }, '📦 Stock')));
    cont.appendChild(kpis); K.cargando(kpis);
    var hoy = U.hoy(), mes = hoy.slice(0, 7);
    var jobs = [K.leer('ventas.listar', { desde: hoy, hasta: hoy, limite: 1000 }), K.leer('caja.ventas_resumen', { tipo: 'semana' }), K.leer('caja.ventas_resumen', { tipo: 'mes', mes: mes }), K.leer('deudores.listar', {}), K.leer('productos.listar', { stock_bajo: true })];
    if (A) jobs.push(K.leer('caja.resumen', {}), K.leer('compromisos.listar', {}));
    Promise.all(jobs).then(function (r) {
      var hoyTot = r[0].datos.ventas.filter(function (v) { return !v.anulada; }).reduce(function (a, v) { return a + v.subtotal; }, 0), nHoy = r[0].datos.ventas.filter(function (v) { return !v.anulada; }).length;
      function kpi(id, titulo, valor, detalle, destino, clase) { return h('button', { class: 'dato enlace-kpi ' + (clase || ''), 'data-kpi': id, type: 'button', onclick: function () { App.irA(destino); } }, h('small', {}, titulo), h('strong', {}, valor), detalle ? h('span', {}, detalle) : null); }
      var lista = [kpi('ventas-hoy', 'Ventas de hoy', 'S/ ' + U.money(hoyTot), nHoy + ' línea(s)', 'ventas'), kpi('ventas-semana', 'Ventas de la semana', 'S/ ' + U.money(r[1].datos.resumen.ventas_totales), r[1].datos.label, 'cajaventas'),
        kpi('ventas-mes', 'Ventas del mes', 'S/ ' + U.money(r[2].datos.resumen.ventas_totales), r[2].datos.resumen.num_ventas + ' línea(s)', 'cajaventas'),
        kpi('deudores', 'Por cobrar', 'S/ ' + U.money(r[3].datos.total_pendiente), r[3].datos.deudores.length + ' deuda(s)', 'deudores', r[3].datos.deudores.length ? 'alerta' : 'bien'),
        kpi('stock-bajo', 'Stock bajo', String(r[4].datos.productos.length), 'productos en o bajo su mínimo', 'productos', r[4].datos.productos.length ? 'alerta' : 'bien')];
      if (A) {
        var cps = r[6].datos.compromisos.filter(function (c) { return c.estado_pago !== 'Pagado'; }), venc = cps.filter(function (c) { return c.estado_pago === 'Vencido'; }), prox = cps.filter(function (c) { return c.estado_pago !== 'Vencido' && c.semaforo !== '🟢'; });
        lista.push(kpi('caja', 'Saldo de Caja', 'S/ ' + U.money(r[5].datos.saldo), 'entradas ' + U.money(r[5].datos.entradas) + ' · salidas ' + U.money(r[5].datos.salidas), 'caja'),
          kpi('por-pagar', 'Por pagar (compromisos)', 'S/ ' + U.money(r[6].datos.total_saldo), cps.length + ' pendiente(s)', 'compromisos'),
          kpi('vencidos', 'Vencidos', String(venc.length), 'S/ ' + U.money(venc.reduce(function (a, c) { return a + c.saldo; }, 0)), 'compromisos', venc.length ? 'alerta' : 'bien'),
          kpi('proximos', 'Vencen pronto (≤ 7 días)', String(prox.length), 'S/ ' + U.money(prox.reduce(function (a, c) { return a + c.saldo; }, 0)), 'compromisos', prox.length ? 'alerta' : 'bien'));
      }
      U.vacio(kpis); lista.forEach(function (x) { kpis.appendChild(x); });
      if (A) K.leer('mantenimiento.verificar', {}).then(function (v) {   // Fase 10: control diario de integridad a la vista del Administrador (no frena el Inicio)
        var n = v.datos.problemas.length; kpis.appendChild(kpi('integridad', 'Integridad del sistema', n ? n + ' diferencia(s)' : 'Sin diferencias', n ? 'revisa la pantalla Control' : 'stock, Caja, compromisos y capas FIFO', 'control', n ? 'alerta' : 'bien'));
      }, function () { /* si falla, el Inicio sigue; el error real se ve en Control */ });
    }, function (e) { U.vacio(kpis); U.error(e); });
  } });
})();
