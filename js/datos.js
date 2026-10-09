/* Caché de listas para los desplegables (catálogos, productos, socios, proveedores, periodos). */
(function (root) {
  'use strict';
  var D = { catalogos: [], productos: [], socios: [], proveedores: [], periodos: [] };
  D.esAdmin = function () { var u = API.usuario(); return !!u && u.rol === 'Administrador'; };
  D.cargar = function () {
    var jobs = [API.llamar('catalogos.listar', {}), API.llamar('productos.listar', {}), API.llamar('socios.listar', {}), API.llamar('periodos.listar', {})];
    if (D.esAdmin()) jobs.push(API.llamar('proveedores.listar', {}));
    return Promise.all(jobs).then(function (r) { D.catalogos = r[0].datos.catalogos; D.productos = r[1].datos.productos; D.socios = r[2].datos.socios; D.periodos = r[3].datos.periodos; D.proveedores = r[4] ? r[4].datos.proveedores : []; });
  };
  D.catalogo = function (n) { return D.catalogos.filter(function (c) { return c.catalogo === n && c.activo; }).sort(function (a, b) { return a.orden - b.orden; }).map(function (c) { return c.valor; }); };
  D.producto = function (cod) { return D.productos.filter(function (p) { return p.codigo === cod; })[0] || null; };
  D.proveedor = function (id) { return D.proveedores.filter(function (p) { return p.id === id; })[0] || null; };
  D.socio = function (id) { return D.socios.filter(function (s) { return s.id === id; })[0] || null; };
  D.periodoDeclarado = function (iso) { var p = D.periodos.filter(function (x) { return x.periodo === String(iso).slice(0, 7); })[0]; return !!p && p.estado === 'Declarado'; };
  root.Datos = D;
})(window);
