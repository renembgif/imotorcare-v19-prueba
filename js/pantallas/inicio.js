/* Inicio: resumen del negocio y accesos rápidos (equivale al "Inicio" de V18_4). Usa solo acciones del motor. */
(function () {
  'use strict';
  var h = U.h;
  App.pantalla({ id: 'inicio', titulo: 'Inicio', roles: ['A', 'O'], render: function (cont) {
    var A = App.rol() === 'A', u = API.usuario(), kpis = h('div', { class: 'stat-grid tarjetas', 'data-lista': 'inicio' });
    cont.appendChild(h('div', { class: 'topline' }, h('h2', {}, 'Inicio'), h('span', { style: 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;' }, h('span', { class: 'caja-pill', id: 'estado-conexion' }, h('span', { class: 'dot' }), 'Conectado · ' + (u ? u.nombre : '')), h('button', { type: 'button', class: 'btn-sm', 'data-accion': 'actualizar', onclick: function () { App.recargar(); } }, '↻ Actualizar'))));
    var per = 'hoy', datosHero = null, hero = h('div', { class: 'hero-band', 'data-hero': '1' }), PER = [['hoy', 'Hoy', 'Hoy'], ['semana', 'Esta semana', 'Esta semana'], ['mes', 'Este mes', 'Este mes']];
    var perEl = h('div', { class: 'x-per', 'data-per': '1' }, h('i', {}), PER.map(function (x, i) { return h('button', { type: 'button', class: i === 0 ? 'on' : '', 'data-p': x[0], onclick: function () { per = x[0]; perEl.className = 'x-per' + (i ? ' p' + i : ''); [].slice.call(perEl.querySelectorAll('button')).forEach(function (b) { b.classList.toggle('on', b === this); }, this); pintarHero(); } }, x[1]); }));
    cont.appendChild(perEl); cont.appendChild(hero);
    function heroStat(titulo, valor, ico) { var ic = h('div', { class: 'hs-icon' }); ic.innerHTML = (window.ICONOS_V19 && ICONOS_V19[ico]) || ''; return h('div', { class: 'hero-stat' }, ic, h('div', {}, h('div', { class: 'hs-label' }, titulo), h('div', { class: 'hs-value' }, valor))); }
    function pintarHero() { if (!datosHero) return; var d = datosHero, t = d[per], et = PER.filter(function (x) { return x[0] === per; })[0];
      U.vacio(hero); hero.appendChild(h('div', { class: 'hero-title' }, h('div', { class: 'ht-label' }, et[2]), h('div', { class: 'ht-sub' }, 'Resumen del negocio')));
      hero.appendChild(h('div', { class: 'hero-stats' }, heroStat('Ventas', 'S/ ' + U.money(t.total), 'ventas'), heroStat('Por cobrar', 'S/ ' + U.money(d.porCobrar), 'deudores'), heroStat('Stock bajo', String(d.stockBajo.length), 'productos'))); }
    cont.appendChild(h('div', { class: 'acceso-rapido' }, h('button', { class: 'btn-primary primario', 'data-accion': 'inicio-vender', type: 'button', onclick: function () { App.irA('ventas'); VentasUI.dialogoVenta(function () { App.recargar(); }); } }, '🛒 Nueva venta'),
      h('button', { class: 'btn-sm', 'data-accion': 'inicio-cotizar', type: 'button', onclick: function () { App.irA('cotizaciones'); } }, '📝 Cotizar'), h('button', { class: 'btn-sm', 'data-accion': 'inicio-stock', type: 'button', onclick: function () { App.irA('productos'); } }, '📦 Stock')));
    cont.appendChild(kpis); K.cargando(kpis);
    var hoy = U.hoy(), mes = hoy.slice(0, 7);
    var jobs = [K.leer('ventas.listar', { desde: hoy, hasta: hoy, limite: 1000 }), K.leer('caja.ventas_resumen', { tipo: 'semana' }), K.leer('caja.ventas_resumen', { tipo: 'mes', mes: mes }), K.leer('deudores.listar', {}), K.leer('productos.listar', { stock_bajo: true })];
    if (A) jobs.push(K.leer('caja.resumen', {}), K.leer('compromisos.listar', {}));
    Promise.all(jobs).then(function (r) {
      var hoyTot = r[0].datos.ventas.filter(function (v) { return !v.anulada; }).reduce(function (a, v) { return a + v.subtotal; }, 0), nHoy = r[0].datos.ventas.filter(function (v) { return !v.anulada; }).length;
      var ICO = { 'ventas-hoy': 'ventas', 'ventas-semana': 'ventas', 'ventas-mes': 'ventas', deudores: 'deudores', 'stock-bajo': 'productos', caja: 'caja', 'por-pagar': 'compromisos', vencidos: 'compromisos', proximos: 'compromisos', integridad: '_config' };
      function kpi(id, titulo, valor, detalle, destino, clase) { var ic = h('div', { class: 'sc-icon' }); ic.innerHTML = (window.ICONOS_V19 && (ICONOS_V19[ICO[id]] || ICONOS_V19._config)) || '';
        return h('button', { class: 'dato stat-card enlace-kpi ' + (clase || ''), 'data-kpi': id, type: 'button', onclick: function () { App.irA(destino); } }, h('div', { class: 'sc-head' }, ic, h('div', { class: 'sc-label' }, titulo)), h('div', { class: 'sc-value' }, valor), detalle ? h('div', { class: 'sc-note' }, detalle) : null); }
      datosHero = { hoy: { total: hoyTot }, semana: { total: r[1].datos.resumen.ventas_totales }, mes: { total: r[2].datos.resumen.ventas_totales }, porCobrar: r[3].datos.total_pendiente, stockBajo: r[4].datos.productos }; pintarHero();
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
      // Panel "Stock bajo" como en V18_4 (nombre, barra y cantidad), con los productos reales en o bajo su mínimo
      var sb = r[4].datos.productos; var panel = h('div', { class: 'panel', 'data-panel': 'stock-bajo' }, h('div', { class: 'panel-head' }, 'Stock bajo'),
        sb.length ? h('div', {}, sb.slice(0, 12).map(function (pr) { var mn = Number(pr.stock_minimo) || 0, st = Number(pr.stock_actual) || 0, pc = mn > 0 ? Math.max(4, Math.min(100, Math.round(st / mn * 100))) : 4;
          return h('div', { class: 'dipstick-row' }, h('div', { class: 'dipstick-name', title: pr.nombre }, pr.nombre), h('div', { class: 'dipstick' }, h('div', { class: 'dipstick-fill', style: 'width:' + pc + '%' })), h('span', { class: 'dipstick-num' }, st + (mn ? ' / ' + mn : ''))); }))
          : h('div', { class: 'empty-note' }, 'Ningún producto bajo su mínimo.'));
      cont.appendChild(panel);
      var al = sb.slice(0, 6).map(function (pr) { return { t: 'Stock bajo', s: pr.nombre, k: 'bad' }; });
      if (r[3].datos.deudores.length) al.push({ t: 'Por cobrar', s: r[3].datos.deudores.length + ' deuda(s) · S/ ' + U.money(r[3].datos.total_pendiente), k: 'warn' });
      if (A) { if (venc.length) al.push({ t: 'Próximos pagos', s: venc.length + ' vencido(s)', k: 'bad' }); if (prox.length) al.push({ t: 'Próximos pagos', s: prox.length + ' vencen pronto', k: 'warn' }); }
      if (window.Cabecera) Cabecera.alertas(al);
      if (A) K.leer('mantenimiento.verificar', {}).then(function (v) {   // Fase 10: control diario de integridad a la vista del Administrador (no frena el Inicio)
        var n = v.datos.problemas.length; kpis.appendChild(kpi('integridad', 'Integridad del sistema', n ? n + ' diferencia(s)' : 'Sin diferencias', n ? 'revisa la pantalla Control' : 'stock, Caja, compromisos y capas FIFO', 'control', n ? 'alerta' : 'bien'));
      }, function () { /* si falla, el Inicio sigue; el error real se ve en Control */ });
    }, function (e) { U.vacio(kpis); U.error(e); });
  } });
})();
