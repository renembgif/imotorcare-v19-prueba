/* Cotizaciones y servicios de vehículo. */
(function () {
  'use strict';
  var h = U.h;
  var CAMPOS_SRV = [['fecha', 'Fecha', 'date'], ['placa', 'Placa', 'text'], ['nombre_cliente', 'Nombre del cliente', 'text'], ['aceite_utilizado', 'Aceite utilizado', 'text'], ['filtro_aceite', 'Filtro de aceite', 'text'], ['filtro_aire', 'Filtro de aire', 'text'], ['filtro_petroleo', 'Filtro de petróleo', 'text'],
    ['kilometraje_actual', 'Kilometraje actual', 'text'], ['proximo_cambio', 'Próximo cambio', 'text'], ['observaciones', 'Observaciones', 'text'], ['cantidad_aceite', 'Cantidad de aceite usado', 'text']];
  function generarSticker(s) { Impresion.sticker(s).catch(function (e) { U.toast('No se pudo crear el sticker: ' + (e && e.message || e), 'error'); }); }
  function ofrecerSticker(s) {   // como en V18_4: al terminar el servicio, botón para generar el sticker
    U.modal('Servicio ' + s.id + ' registrado', h('p', {}, 'Placa ' + (s.placa || '—') + '. ¿Quieres generar el sticker de próximo cambio?'), [{ texto: 'Ahora no', id: 'cerrar', cerrar: true }, { texto: '🏷️ Generar sticker', id: 'generar-sticker', clase: 'primario', onclick: function (mm) { mm.cerrar(); generarSticker(s); } }]);
  }
  function generarPDF(c) { try { var p = Impresion.cotizacionPDF(c); if (p && p.catch) p.catch(function (e) { U.toast('No se pudo crear el PDF: ' + (e && e.message || e), 'error'); }); } catch (e) { U.toast('No se pudo crear el PDF: ' + e.message, 'error'); } }
  function dialogoServicio(s, alTerminar, preset) {
    var campos = CAMPOS_SRV.map(function (c) { return { n: c[0], l: c[1], t: c[2], req: c[0] === 'fecha', def: c[0] === 'fecha' ? U.hoy : undefined }; });
    var editando = !!(s && s.id), ini = Object.assign({}, preset || {}, s || {});
    F.dialogo(editando ? 'Editar servicio ' + s.id : 'Nuevo servicio', campos, ini, function (v) {
      if (!editando) { if (preset && preset.cotizacion_numero) v.cotizacion_numero = preset.cotizacion_numero; return K.escribir('servicios.registrar', v); }
      var cam = K.cambios(v, s, CAMPOS_SRV.map(function (c) { return c[0]; })); if (!Object.keys(cam).length) throw new Error('No hay cambios que guardar.');
      return K.escribir('servicios.editar', { id: s.id, version: s.version, cambios: cam });
    }, { ancho: true, alTerminar: function (r) { U.toast('Servicio guardado.', 'ok'); if (alTerminar) alTerminar(); if (!editando && r && r.datos && r.datos.servicio) ofrecerSticker(r.datos.servicio); } });
  }
  /* Precio vigente al elegir el producto, subtotal por línea y total en vivo (como en Ventas). El precio se puede corregir a mano. */
  function vincularPrecios(cont, totalEl) {
    function codigoDe(v) { return String(v || '').split(' · ')[0].trim(); }
    function refrescar() {
      var total = 0;
      Array.prototype.forEach.call(cont.querySelectorAll('.linea'), function (fila) {
        var pi = fila.querySelector('[data-n="producto_codigo"]'), ci = fila.querySelector('[data-n="cantidad"]'), ri = fila.querySelector('[data-n="precio"]'); if (!pi || !ci || !ri) return;
        var cod = codigoDe(pi.value), p = Datos.producto(cod), sub = fila.querySelector('.sub-linea');
        if (!sub) { sub = h('small', { class: 'sub-linea suave', 'data-sub': '1' }); fila.insertBefore(sub, fila.lastChild); }
        if (cod !== fila.__cod) { fila.__cod = cod; if (p) ri.value = Number(p.precio_venta) > 0 ? String(p.precio_venta) : ''; }   // producto nuevo → su precio de venta vigente (si no tiene, queda vacío y se avisa)
        var cant = Number(ci.value), precio = ri.value === '' ? NaN : Number(ri.value), importe = isFinite(cant) && isFinite(precio) ? Math.round(cant * precio * 100) / 100 : 0;
        if (p && !(Number(p.precio_venta) > 0) && ri.value === '') sub.textContent = '⚠ Este producto no tiene precio de venta registrado: escribe el precio.';
        else sub.textContent = p ? 'Subtotal: S/ ' + U.money(importe) : '';
        total += importe;
      });
      totalEl.textContent = 'Total: S/ ' + U.money(total);
    }
    cont.addEventListener('input', refrescar); cont.addEventListener('change', refrescar); cont.addEventListener('click', function () { setTimeout(refrescar, 0); }); refrescar();
  }
  function abrirCot(c, alTerminar) { Datos.cargar().then(function () { dialogoCot(c, alTerminar); }, function () { dialogoCot(c, alTerminar); }); }   // precios vigentes al abrir
  function dialogoCot(c, alTerminar) {
    var editando = !!c, cab = F.crear([{ n: 'cliente', l: 'Cliente (puede incluir la placa)', t: 'text' }], c ? { cliente: c.cliente } : {}), bloqueada = editando && c.venta_generada;
    var lin = K.lineasEditor([{ n: 'precio', l: 'Precio unitario (S/)', t: 'number', paso: '0.01' }], c ? c.items.map(function (i) { return { producto_codigo: i.codigo, cantidad: i.cantidad, precio: i.precio }; }) : null);
    var totalEl = h('p', { class: 'total-cot', 'data-total-cot': '1' }), cont = h('div', {}, cab.el, bloqueada ? h('p', { class: 'aviso warn' }, 'Esta cotización ya generó una venta: solo se puede cambiar el cliente.') : [h('h4', {}, 'Productos'), lin.el, totalEl]);
    if (!bloqueada) vincularPrecios(lin.el, totalEl);
    U.modal(editando ? 'Editar cotización ' + c.numero_formateado : 'Nueva cotización', cont, [{ texto: 'Cancelar', cerrar: true }, { texto: 'Guardar', id: 'guardar', clase: 'primario', onclick: function (mm) {
      var fl = bloqueada ? null : lin.faltante(); if (fl) { mm.error('Falta: ' + fl + '.'); return; }
      var sinPrecio = bloqueada ? null : lin.valores().filter(function (l) { return !(Number(l.precio) > 0); })[0]; if (sinPrecio) { mm.error('Indica un precio mayor que 0 para ' + sinPrecio.producto_codigo + '.'); return; } mm.error(''); mm.ocupado(true);
      var p = editando ? K.escribir('cotizaciones.editar', { id: c.id, version: c.version, cambios: bloqueada ? { cliente: cab.valores().cliente || '' } : { cliente: cab.valores().cliente || '', items: lin.valores() } }) : K.escribir('cotizaciones.registrar', { cliente: cab.valores().cliente, items: lin.valores() });
      p.then(function (r) { mm.cerrar(); U.toast('Cotización ' + r.datos.cotizacion.numero_formateado + ' guardada. Total S/ ' + U.money(r.datos.cotizacion.total), 'ok'); alTerminar(); if (!editando) generarPDF(r.datos.cotizacion); }, function (e) { mm.ocupado(false); mm.error(e.message); });
    } }], { ancho: true });
  }
  App.pantalla({ id: 'cotizaciones', titulo: 'Cotizaciones', roles: ['A', 'O'], render: function (cont) {
    var lista = h('div', { 'data-lista': 'cotizaciones' }), fil = K.filtros([{ n: 'desde', l: 'Desde', t: 'date' }, { n: 'hasta', l: 'Hasta', t: 'date' }, { n: 'q', l: 'Cliente o número', t: 'text' }], {}, cargar);
    cont.appendChild(h('div', { class: 'barra-acc' }, h('button', { class: 'primario', 'data-accion': 'nueva-cotizacion', type: 'button', onclick: function () { abrirCot(null, cargar); } }, '➕ Nueva cotización'))); cont.appendChild(fil.el); cont.appendChild(lista);
    function generarVenta(c) {
      if (!c.items.length) { U.toast('Esta cotización viene de V18_4 sin ítems estructurados: no se puede generar la venta automáticamente. Registra la venta manualmente.', 'warn'); return; }
      VentasUI.dialogoVenta(function () { cargar(); }, { cliente: c.cliente_limpio || c.cliente, cotizacion_numero: c.numero, titulo: 'Cada producto se vende al precio cotizado; la diferencia con el precio vigente queda como descuento o ajuste.',
        lineas: c.items.map(function (i) { return { producto_codigo: i.codigo, cantidad: i.cantidad, precio_cotizado: i.precio }; }) });
    }
    function servicio(c) { dialogoServicio(null, null, { placa: c.placa, nombre_cliente: c.cliente_limpio, aceite_utilizado: c.aceite_nombre, cantidad_aceite: c.aceite_cantidad, filtro_aceite: c.filtro_aceite, filtro_aire: c.filtro_aire, filtro_petroleo: c.filtro_petroleo, cotizacion_numero: c.numero }); }
    function cargar() {
      K.cargando(lista); K.leer('cotizaciones.listar', fil.valores()).then(function (r) { var A = App.rol() === 'A';
        U.vacio(lista).appendChild(U.tabla([{ t: 'N°', f: function (c) { return c.numero_formateado; } }, { t: 'Fecha', f: function (c) { return U.fecha(String(c.fecha).slice(0, 10)); } }, { t: 'Cliente', f: function (c) { return c.cliente; } },
          { t: 'Detalle', f: function (c) { var d = c.detalle || ''; return d.length > 70 ? d.slice(0, 70) + '…' : d; } }, { t: 'Total', cls: 'num', f: function (c) { return U.money(c.total); } },
          { t: 'Estado', f: function (c) { return c.estado === 'Anulado' ? U.chip('Anulada', 'dec') : (c.venta_generada ? U.chip('Venta generada', 'ab') : ''); } }],
          r.datos.cotizaciones, function (c) { return c.estado === 'Anulado' ? [A ? { texto: 'Eliminar', id: 'eliminar', onclick: function () { eliminar(c); } } : null] : [{ texto: 'Editar', id: 'editar', onclick: function () { abrirCot(c, cargar); } },
            { texto: 'Generar venta', id: 'generar-venta', onclick: function () { generarVenta(c); } }, { texto: 'PDF', id: 'pdf', onclick: function () { generarPDF(c); } }, { texto: 'Servicio', id: 'servicio', onclick: function () { servicio(c); } }, { texto: 'Anular', id: 'anular', onclick: function () { anular(c); } }, A ? { texto: 'Eliminar', id: 'eliminar', onclick: function () { eliminar(c); } } : null]; })); }, U.error);
    }
    function anular(c) { K.pedirMotivo('Anular cotización ' + c.numero_formateado).then(function (m) { if (m) K.escribir('cotizaciones.anular', { id: c.id, version: c.version, motivo: m }).then(function () { U.toast('Cotización anulada.', 'ok'); cargar(); }, U.error); }); }
    function eliminar(c) { K.pedirMotivo('Eliminar cotización ' + c.numero_formateado).then(function (m) { if (m) K.escribir('cotizaciones.eliminar', { id: c.id, version: c.version, motivo: m }).then(function () { U.toast('Cotización eliminada.', 'ok'); cargar(); }, U.error); }); }
    cargar();
  } });

  App.pantalla({ id: 'servicios', titulo: 'Clientes y vehículos', roles: ['A', 'O'], render: function (cont) {
    var lista = h('div', { 'data-lista': 'servicios' }), fil = K.filtros([{ n: 'q', l: 'Placa o cliente', t: 'text' }], {}, cargar);
    cont.appendChild(h('div', { class: 'barra-acc' }, h('button', { class: 'primario', 'data-accion': 'nuevo-servicio', type: 'button', onclick: function () { dialogoServicio(null, cargar); } }, '➕ Nuevo servicio'))); cont.appendChild(fil.el); cont.appendChild(lista);
    function cargar() { K.cargando(lista); K.leer('servicios.listar', fil.valores()).then(function (r) {
      U.vacio(lista).appendChild(U.tabla([{ t: 'Fecha', f: function (s) { return U.fecha(s.fecha); } }, { t: 'Placa', f: function (s) { return s.placa; } }, { t: 'Cliente', f: function (s) { return s.nombre_cliente; } }, { t: 'Aceite', f: function (s) { return s.aceite_utilizado; } },
        { t: 'Filtros (aceite/aire/petr.)', f: function (s) { return [s.filtro_aceite, s.filtro_aire, s.filtro_petroleo].join(' / '); } }, { t: 'Km', f: function (s) { return s.kilometraje_actual; } }, { t: 'Próximo', f: function (s) { return s.proximo_cambio; } }, { t: '', f: K.estadoReg }],
        r.datos.servicios, function (s) { return s.estado === 'Anulado' ? [] : [{ texto: 'Sticker', id: 'sticker', onclick: function () { generarSticker(s); } }, { texto: 'Editar', id: 'editar', onclick: function () { dialogoServicio(s, cargar); } }, { texto: 'Anular', id: 'anular', onclick: function () { K.pedirMotivo('Anular servicio ' + s.id).then(function (m) { if (m) K.escribir('servicios.anular', { id: s.id, version: s.version, motivo: m }).then(function () { U.toast('Servicio anulado.', 'ok'); cargar(); }, U.error); }); } }]; })); }, U.error); }
    cargar();
  } });
})();
