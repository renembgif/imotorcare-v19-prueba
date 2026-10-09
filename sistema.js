/* Periodos, usuarios y control del sistema (verificar, recalcular, auditoría). */
(function () {
  'use strict';
  var h = U.h;
  App.pantalla({ id: 'periodos', titulo: 'Periodos', roles: ['A', 'O'], render: function (cont) {
    var lista = h('div', { 'data-lista': 'periodos' }), A = App.rol() === 'A';
    cont.appendChild(h('p', { class: 'suave' }, 'Un periodo declarado a SUNAT solo lo modifica un Administrador, con motivo (queda en auditoría).'));
    if (A) cont.appendChild(h('div', { class: 'barra-acc' }, h('button', { 'data-accion': 'marcar-periodo', type: 'button', onclick: function () { F.dialogo('Declarar un periodo', [{ n: 'periodo', l: 'Periodo (AAAA-MM)', t: 'text', req: true }, { n: 'motivo', l: 'Motivo / nota', t: 'text', req: true }], {}, function (v) { return K.escribir('periodos.declarar', v); }, { alTerminar: function () { App.recargarDatos().then(cargar); } }); } }, 'Declarar un periodo')));
    cont.appendChild(lista);
    function cargar() { K.leer('periodos.listar', {}).then(function (r) { U.vacio(lista).appendChild(U.tabla([{ t: 'Periodo', f: function (p) { return p.periodo; } }, { t: 'Estado', f: function (p) { return U.chip(p.estado, p.estado === 'Declarado' ? 'dec' : 'ab'); } }, { t: 'Nota', f: function (p) { return p.nota; } }],
      r.datos.periodos, A ? function (p) { return [p.estado === 'Declarado' ? { texto: 'Reabrir', id: 'reabrir', onclick: function () { K.pedirMotivo('Reabrir periodo ' + p.periodo).then(function (m) { if (m) K.escribir('periodos.reabrir', { periodo: p.periodo, motivo: m }).then(function () { App.recargarDatos().then(cargar); }, U.error); }); } }
        : { texto: 'Declarar', id: 'declarar', onclick: function () { K.pedirMotivo('Declarar periodo ' + p.periodo).then(function (m) { if (m) K.escribir('periodos.declarar', { periodo: p.periodo, motivo: m }).then(function () { App.recargarDatos().then(cargar); }, U.error); }); } }]; } : null)); }, U.error); }
    cargar();
  } });

  App.pantalla({ id: 'usuarios', titulo: 'Usuarios', roles: ['A'], render: function (cont) {
    var lista = h('div', { 'data-lista': 'usuarios' });
    cont.appendChild(h('div', { class: 'barra-acc' }, h('button', { class: 'primario', 'data-accion': 'nuevo-usuario', type: 'button', onclick: function () {
      F.dialogo('Nuevo usuario', [{ n: 'usuario', l: 'Usuario', t: 'text', req: true }, { n: 'nombre', l: 'Nombre', t: 'text', req: true }, { n: 'rol', l: 'Rol', t: 'select', req: true, opciones: ['Operador', 'Administrador'], def: 'Operador' }, { n: 'clave', l: 'Clave (mínimo 8 caracteres)', t: 'password', req: true }], {}, function (v) { return K.escribir('usuarios.crear', v); }, { alTerminar: cargar }); } }, '➕ Nuevo usuario'))); cont.appendChild(lista);
    function cargar() { K.leer('usuarios.listar', {}).then(function (r) { U.vacio(lista).appendChild(U.tabla([{ t: 'ID', f: function (u) { return u.id; } }, { t: 'Usuario', f: function (u) { return u.usuario; } }, { t: 'Nombre', f: function (u) { return u.nombre; } }, { t: 'Rol', f: function (u) { return u.rol; } }, { t: 'Activo', f: function (u) { return u.activo ? 'Sí' : U.chip('No', 'dec'); } }, { t: 'Último acceso', f: function (u) { return String(u.ultimo_acceso || '').slice(0, 16).replace('T', ' '); } }],
      r.datos.usuarios, function (u) { return [{ texto: 'Editar', id: 'editar', onclick: function () { F.dialogo('Editar usuario ' + u.usuario, [{ n: 'nombre', l: 'Nombre', t: 'text', req: true }, { n: 'rol', l: 'Rol', t: 'select', req: true, opciones: ['Operador', 'Administrador'] }, { n: 'clave', l: 'Nueva clave (vacío = no cambiar)', t: 'password' }], u, function (v) { var d = { id: u.id, version: u.version, nombre: v.nombre, rol: v.rol }; if (v.clave) d.clave = v.clave; return K.escribir('usuarios.editar', d); }, { alTerminar: cargar }); } },
        u.activo ? { texto: 'Desactivar', id: 'desactivar', onclick: function () { K.escribir('usuarios.desactivar', { id: u.id, version: u.version }).then(cargar, U.error); } } : { texto: 'Activar', id: 'activar', onclick: function () { K.escribir('usuarios.editar', { id: u.id, version: u.version, activo: true }).then(cargar, U.error); } }]; })); }, U.error); }
    cargar();
  } });

  App.pantalla({ id: 'control', titulo: 'Control', roles: ['A'], render: function (cont) {
    var res = h('div', { 'data-lista': 'control' }), aud = h('div', { 'data-lista': 'auditoria' });
    function verificar() { K.cargando(res); K.leer('mantenimiento.verificar', {}).then(function (r) { U.vacio(res).appendChild(h('p', { 'data-resumen': '1' }, h('strong', {}, r.datos.resumen))); res.appendChild(U.tabla([{ t: 'Tipo', f: function (p) { return p.tipo; } }, { t: 'Tabla', f: function (p) { return p.tabla; } }, { t: 'ID', f: function (p) { return p.id; } }, { t: 'Detalle', f: function (p) { return p.detalle; } }], r.datos.problemas, null, 'Sin diferencias.')); }, U.error); }
    function recalcular(que) { U.confirmar('¿Recalcular ' + que + ' desde los libros y documentos? Solo corrige los valores derivados.').then(function (ok) { if (ok) K.escribir('mantenimiento.recalcular', { que: que }).then(function (r) { U.toast('Recalculado: ' + r.datos.corregidos + ' corrección(es).', 'ok'); verificar(); App.recargarDatos(); }, U.error); }); }
    cont.appendChild(h('div', { class: 'barra-acc' }, h('button', { class: 'primario', 'data-accion': 'verificar', type: 'button', onclick: verificar }, 'Verificar integridad'), ['stock', 'caja', 'compromisos'].map(function (q) { return h('button', { 'data-accion': 'recalcular-' + q, type: 'button', onclick: function () { recalcular(q); } }, 'Recalcular ' + q); })));
    cont.appendChild(res); cont.appendChild(h('h3', {}, 'Auditoría')); cont.appendChild(K.filtros([{ n: 'tabla', l: 'Tabla', t: 'text' }, { n: 'registro_id', l: 'ID de registro', t: 'text' }], {}, function (f) { cargarAud(f); }).el); cont.appendChild(aud);
    function cargarAud(f) { K.cargando(aud); K.leer('auditoria.listar', Object.assign({ limite: 100 }, f || {})).then(function (r) { U.vacio(aud).appendChild(U.tabla([{ t: 'Cuándo', f: function (a) { return String(a.ts).slice(0, 16).replace('T', ' '); } }, { t: 'Usuario', f: function (a) { return a.usuario_id; } }, { t: 'Acción', f: function (a) { return a.accion; } }, { t: 'Tabla', f: function (a) { return a.tabla; } }, { t: 'Registro', f: function (a) { return a.registro_id; } }, { t: 'Motivo', f: function (a) { return a.motivo; } }], r.datos.auditoria)); }, U.error); }
    verificar(); cargarAud({});
  } });
})();
