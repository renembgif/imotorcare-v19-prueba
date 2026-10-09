/* Productos (Operador: solo lectura), proveedores y catálogos. */
(function () {
  'use strict';
  var h = U.h;
  function dialogoProducto(p, alTerminar) {
    var campos = [{ n: 'nombre', l: 'Nombre', t: 'text', req: true }, { n: 'ubicacion', l: 'Ubicación', t: 'text' }, { n: 'precio_compra', l: 'Costo actual (S/)', t: 'number', req: true, paso: '0.01', ayuda: 'No cambia las ventas ya registradas.' }, { n: 'precio_venta', l: 'Precio de venta (S/)', t: 'number', req: true, paso: '0.01' }, { n: 'stock_minimo', l: 'Stock mínimo', t: 'number', paso: '0.001' }];
    if (!p) campos.unshift({ n: 'tipo', l: 'Tipo', t: 'select', req: true, opciones: function () { return Datos.catalogo('tipo_producto'); }, def: 'Producto' });
    F.dialogo(p ? 'Editar ' + p.codigo : 'Nuevo producto', campos, p || {}, function (v) {
      if (!p) return K.escribir('productos.crear', v);
      var cam = K.cambios(v, p, ['nombre', 'ubicacion', 'precio_compra', 'precio_venta', 'stock_minimo']); if (!Object.keys(cam).length) throw new Error('No hay cambios que guardar.'); cam.codigo = p.codigo; cam.version = p.version; return K.escribir('productos.editar', cam);
    }, { ancho: true, alTerminar: function () { U.toast('Producto guardado.', 'ok'); App.recargarDatos().then(alTerminar); } });
  }
  function ajustar(p, alTerminar) {
    F.dialogo('Ajustar stock de ' + p.codigo, [{ n: 'cantidad', l: 'Cantidad (+ entra, − sale)', t: 'number', req: true, paso: '0.001' }, { n: 'fecha', l: 'Fecha', t: 'date', req: true, def: U.hoy }, { n: 'motivo', l: 'Motivo', t: 'text', req: true }], {},
      function (v) { v.producto_codigo = p.codigo; return K.escribir('productos.ajustar_stock', v); }, { alTerminar: function () { U.toast('Stock ajustado.', 'ok'); App.recargarDatos().then(alTerminar); } });
  }
  App.pantalla({ id: 'productos', titulo: 'Productos', roles: ['A', 'O'], render: function (cont) {
    var lista = h('div', { 'data-lista': 'productos' }), fil = K.filtros([{ n: 'q', l: 'Código, nombre o ubicación', t: 'text' }, { n: 'tipo', l: 'Tipo', t: 'select', vacio: 'Todos', opciones: function () { return Datos.catalogo('tipo_producto'); } }, { n: 'stock_bajo', l: 'Solo stock bajo', t: 'check' }], {}, cargar), A = App.rol() === 'A';
    if (A) cont.appendChild(h('div', { class: 'barra-acc' }, h('button', { class: 'primario', 'data-accion': 'nuevo-producto', type: 'button', onclick: function () { dialogoProducto(null, cargar); } }, '➕ Nuevo producto'))); cont.appendChild(fil.el); cont.appendChild(lista);
    function cargar() { K.cargando(lista); var f = fil.valores(); if (!f.stock_bajo) delete f.stock_bajo; K.leer('productos.listar', f).then(function (r) { U.vacio(lista).appendChild(h('p', { class: 'suave' }, r.datos.productos.length + ' producto(s)'));
      lista.appendChild(U.tabla([{ t: 'Código', f: function (p) { return p.codigo; } }, { t: 'Nombre', f: function (p) { return p.nombre; } }, { t: 'Tipo', f: function (p) { return p.tipo; } }, { t: 'Ubicación', f: function (p) { return p.ubicacion; } }, { t: 'Costo', cls: 'num', f: function (p) { return U.money(p.precio_compra); } }, { t: 'Precio', cls: 'num', f: function (p) { return U.money(p.precio_venta); } },
        { t: 'Stock', cls: 'num', f: function (p) { return p.tipo === 'Producto' ? U.num(p.stock_actual) : '—'; } }, { t: 'Mín.', cls: 'num', f: function (p) { return U.num(p.stock_minimo); } }, { t: 'Activo', f: function (p) { return p.activo ? 'Sí' : U.chip('No', 'dec'); } }],
        r.datos.productos, A ? function (p) { return [{ texto: 'Editar', id: 'editar', onclick: function () { dialogoProducto(p, cargar); } }, p.tipo === 'Producto' ? { texto: 'Ajustar stock', id: 'ajustar', onclick: function () { ajustar(p, cargar); } } : null, p.tipo === 'Producto' ? { texto: 'Ver capas', id: 'ver-capas', onclick: function () { CapasUI.ver(p.codigo); } } : null,
          p.activo ? { texto: 'Desactivar', id: 'desactivar', onclick: function () { K.escribir('productos.desactivar', { codigo: p.codigo, version: p.version }).then(function () { App.recargarDatos().then(cargar); }, U.error); } } : { texto: 'Activar', id: 'activar', onclick: function () { K.escribir('productos.editar', { codigo: p.codigo, version: p.version, activo: true }).then(function () { App.recargarDatos().then(cargar); }, U.error); } }]; } : null)); }, U.error); }
    cargar();
  } });

  App.pantalla({ id: 'proveedores', titulo: 'Proveedores', roles: ['A'], render: function (cont) {
    var lista = h('div', { 'data-lista': 'proveedores' });
    function dlg(p) { F.dialogo(p ? 'Editar proveedor ' + p.id : 'Nuevo proveedor', [{ n: 'nombre', l: 'Nombre', t: 'text', req: true }, { n: 'ruc', l: 'RUC', t: 'text' }, { n: 'tipo', l: 'Tipo', t: 'select', req: true, opciones: ['Proveedor', 'Beneficiario'], def: 'Proveedor' }], p || {}, function (v) {
      if (!p) return K.escribir('proveedores.crear', v); var cam = K.cambios(v, p, ['nombre', 'ruc', 'tipo']); if (!Object.keys(cam).length) throw new Error('No hay cambios que guardar.'); cam.id = p.id; cam.version = p.version; return K.escribir('proveedores.editar', cam);
    }, { alTerminar: function () { U.toast('Proveedor guardado.', 'ok'); App.recargarDatos().then(cargar); } }); }
    cont.appendChild(h('div', { class: 'barra-acc' }, h('button', { class: 'primario', 'data-accion': 'nuevo-proveedor', type: 'button', onclick: function () { dlg(null); } }, '➕ Nuevo proveedor'))); cont.appendChild(lista);
    function cargar() { K.cargando(lista); K.leer('proveedores.listar', {}).then(function (r) { U.vacio(lista).appendChild(U.tabla([{ t: 'ID', f: function (p) { return p.id; } }, { t: 'Nombre', f: function (p) { return p.nombre; } }, { t: 'RUC', f: function (p) { return p.ruc; } }, { t: 'Tipo', f: function (p) { return p.tipo; } }, { t: 'Compras', cls: 'num', f: function (p) { return p.compras; } }, { t: 'Última', f: function (p) { return U.fecha(p.ultima_fecha); } }, { t: 'Activo', f: function (p) { return p.activo ? 'Sí' : U.chip('No', 'dec'); } }],
      r.datos.proveedores, function (p) { return [{ texto: 'Editar', id: 'editar', onclick: function () { dlg(p); } }, p.activo ? { texto: 'Desactivar', id: 'desactivar', onclick: function () { K.escribir('proveedores.desactivar', { id: p.id, version: p.version }).then(function () { App.recargarDatos().then(cargar); }, U.error); } } : null]; })); }, U.error); }
    cargar();
  } });

  App.pantalla({ id: 'catalogos', titulo: 'Catálogos', roles: ['A'], render: function (cont) {
    var lista = h('div', { 'data-lista': 'catalogos' });
    cont.appendChild(h('div', { class: 'barra-acc' }, h('button', { class: 'primario', 'data-accion': 'nuevo-valor', type: 'button', onclick: function () {
      var nombres = Array.from(new Set(Datos.catalogos.map(function (c) { return c.catalogo; })));
      F.dialogo('Agregar valor a un catálogo', [{ n: 'catalogo', l: 'Catálogo', t: 'select', req: true, opciones: nombres }, { n: 'valor', l: 'Valor', t: 'text', req: true }], {}, function (v) { return K.escribir('catalogos.agregar', v); }, { alTerminar: function () { App.recargarDatos().then(cargar); } }); } }, '➕ Agregar valor')));
    cont.appendChild(h('p', { class: 'suave' }, 'Los valores del sistema (los que usan las reglas de negocio) no se renombran ni se desactivan.')); cont.appendChild(lista);
    function cargar() { K.leer('catalogos.listar', {}).then(function (r) { U.vacio(lista).appendChild(U.tabla([{ t: 'Catálogo', f: function (c) { return c.catalogo; } }, { t: 'Valor', f: function (c) { return c.valor; } }, { t: 'Orden', cls: 'num', f: function (c) { return c.orden; } }, { t: 'Activo', f: function (c) { return c.activo ? 'Sí' : U.chip('No', 'dec'); } }],
      r.datos.catalogos, function (c) { return [{ texto: 'Renombrar', id: 'renombrar', onclick: function () { F.dialogo('Renombrar valor', [{ n: 'valor', l: 'Valor', t: 'text', req: true }], c, function (v) { return K.escribir('catalogos.editar', { id: c.id, valor: v.valor }); }, { alTerminar: function () { App.recargarDatos().then(cargar); } }); } },
        c.activo ? { texto: 'Desactivar', id: 'desactivar', onclick: function () { K.escribir('catalogos.desactivar', { id: c.id }).then(function () { App.recargarDatos().then(cargar); }, U.error); } } : null]; })); }, U.error); }
    cargar();
  } });
})();
