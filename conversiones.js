/* Conversiones: envases abiertos → litros a granel. */
(function () {
  'use strict';
  var h = U.h, CAMPOS = ['fecha', 'codigo_envase', 'envases_abiertos', 'litros_por_envase', 'codigo_granel'];
  function dialogo(c, alTerminar) {
    var campos = [{ n: 'fecha', l: 'Fecha', t: 'date', req: true, def: U.hoy }, { n: 'codigo_envase', l: 'Producto envase (se descuenta)', t: 'producto', req: true }, { n: 'envases_abiertos', l: 'Envases abiertos', t: 'number', req: true, paso: '0.001' },
      { n: 'litros_por_envase', l: 'Litros por envase', t: 'number', req: true, paso: '0.001' }, { n: 'codigo_granel', l: 'Producto a granel (se suma)', t: 'producto', req: true }];
    // los campos "producto" devuelven su valor bajo el nombre del campo (codigo_envase / codigo_granel)
    F.dialogo(c ? 'Editar conversión ' + c.id : 'Nueva conversión', campos, c || {}, function (v) {
      if (!c) return K.escribir('conversiones.registrar', v);
      var cam = K.cambios(v, c, CAMPOS); if (!Object.keys(cam).length) throw new Error('No hay cambios que guardar.'); return K.escribir('conversiones.editar', { id: c.id, version: c.version, cambios: cam });
    }, { ancho: true, alTerminar: function () { U.toast('Conversión guardada.', 'ok'); App.recargarDatos().then(alTerminar); } });
  }
  App.pantalla({ id: 'conversiones', titulo: 'Conversiones', roles: ['A', 'O'], render: function (cont) {
    var lista = h('div', { 'data-lista': 'conversiones' });
    cont.appendChild(h('div', { class: 'barra-acc' }, h('button', { class: 'primario', 'data-accion': 'nueva-conversion', type: 'button', onclick: function () { dialogo(null, cargar); } }, '➕ Nueva conversión'))); cont.appendChild(lista);
    function nombre(c) { var p = Datos.producto(c); return p ? p.nombre : c; }
    function cargar() { K.cargando(lista); K.leer('conversiones.listar', {}).then(function (r) { U.vacio(lista).appendChild(U.tabla([{ t: 'Fecha', f: function (c) { return U.fecha(c.fecha); } }, { t: 'Envase', f: function (c) { return nombre(c.codigo_envase); } }, { t: 'Abiertos', cls: 'num', f: function (c) { return U.num(c.envases_abiertos); } },
      { t: 'Litros/envase', cls: 'num', f: function (c) { return U.num(c.litros_por_envase); } }, { t: 'Granel', f: function (c) { return nombre(c.codigo_granel); } }, { t: 'Litros generados', cls: 'num', f: function (c) { return U.num(c.litros_generados); } }, { t: '', f: K.estadoReg }],
      r.datos.conversiones, function (c) { return c.estado === 'Anulado' ? [] : [{ texto: 'Editar', id: 'editar', onclick: function () { dialogo(c, cargar); } }, { texto: 'Anular', id: 'anular', onclick: function () { K.pedirMotivo('Anular conversión ' + c.id).then(function (m) { if (m) K.escribir('conversiones.anular', { id: c.id, version: c.version, motivo: m }).then(function () { U.toast('Conversión anulada.', 'ok'); App.recargarDatos().then(cargar); }, U.error); }); } }]; })); }, U.error); }
    cargar();
  } });
})();
