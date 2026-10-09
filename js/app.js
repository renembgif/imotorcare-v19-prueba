/* Web V19 — armazón: inicio de sesión, menú por rol y enrutador. Interfaz TÉCNICA de prueba: no es el diseño final. */
(function (root) {
  'use strict';
  var h = U.h, App = { pantallas: [], actual: null }, $ = function (s) { return document.querySelector(s); };
  App.pantalla = function (p) { App.pantallas.push(p); };
  App.rol = function () { var u = API.usuario(); return u ? (u.rol === 'Administrador' ? 'A' : 'O') : ''; };
  App.aviso = function (msg, tipo) { var a = $('#aviso'); a.hidden = !msg; a.className = 'aviso ' + (tipo || ''); a.textContent = msg || ''; };

  function pantallaLogin(msg) {
    $('#salir').hidden = true; $('#quien').textContent = ''; $('#menu').hidden = true; $('#navbaja').hidden = true; document.body.classList.remove('menu-abierto'); $('#titulo-m').textContent = 'iMotor Care';
    var vista = U.vacio($('#vista')), u = h('input', { id: 'lu', autocomplete: 'username', 'data-n': 'usuario' }), c = h('input', { id: 'lc', type: 'password', autocomplete: 'current-password', 'data-n': 'clave' });
    var entrar = function () { var b = $('#lb'); b.disabled = true; API.login(u.value, c.value).then(function () { App.aviso(''); iniciar(); }, function (e) { App.aviso(e.message, 'error'); b.disabled = false; }); };
    vista.appendChild(h('div', { class: 'login-pantalla' }, h('div', { class: 'tarjeta login' }, h('img', { src: 'img/logo-192.png', alt: 'iMotor Care', width: 96, height: 96 }), h('h2', {}, 'Iniciar sesión'), h('label', {}, 'Usuario'), u, h('label', {}, 'Clave'), c, h('p', {}, h('button', { id: 'lb', class: 'primario', type: 'button', onclick: entrar }, 'Entrar')))));
    c.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') entrar(); }); if (msg) App.aviso(msg, 'warn');
  }
  function iniciar() {
    var u = API.usuario(); if (!u || !API.token()) return pantallaLogin();
    $('#quien').textContent = u.nombre + ' · ' + u.rol; $('#salir').hidden = false;
    U.vacio($('#vista')).appendChild(h('p', { class: 'suave' }, 'Cargando datos…'));
    Datos.cargar().then(function () { pintarMenu(); irA(location.hash.slice(1) || 'inicio'); }, function (e) { App.aviso(e.message, 'error'); });
  }
  function pintarMenu() {
    var rol = App.rol(), menu = U.vacio($('#menu')), baja = U.vacio($('#navbaja')); menu.hidden = false; baja.hidden = false;
    var visibles = App.pantallas.filter(function (p) { return p.roles.indexOf(rol) >= 0; });
    visibles.forEach(function (p) { menu.appendChild(h('button', { 'data-pantalla': p.id, type: 'button', onclick: function () { document.body.classList.remove('menu-abierto'); irA(p.id); } }, p.titulo)); });
    // Barra inferior (celular), como en V18_4: Inicio · Vender · Cotizar · Stock · Más
    [['inicio', '🏠', 'Inicio'], ['vender', '🛒', 'Vender'], ['cotizaciones', '📝', 'Cotizar'], ['productos', '📦', 'Stock'], ['mas', '☰', 'Más']].forEach(function (x) {
      baja.appendChild(h('button', { 'data-baja': x[0], type: 'button', onclick: function () {
        if (x[0] === 'mas') { document.body.classList.toggle('menu-abierto'); return; }
        document.body.classList.remove('menu-abierto'); if (x[0] === 'vender') { irA('ventas'); VentasUI.dialogoVenta(function () { App.recargar(); }); } else irA(x[0]);
      } }, h('span', { class: 'ico' }, x[1]), x[2]));
    });
  }
  function irA(id) {
    var rol = App.rol(), p = App.pantallas.filter(function (x) { return x.id === id && x.roles.indexOf(rol) >= 0; })[0] || App.pantallas.filter(function (x) { return x.roles.indexOf(rol) >= 0; })[0];
    if (!p) return; App.actual = p.id; location.hash = p.id;
    document.querySelectorAll('#menu button').forEach(function (b) { b.classList.toggle('act', b.getAttribute('data-pantalla') === p.id); });
    document.querySelectorAll('#navbaja button').forEach(function (b) { b.classList.toggle('act', b.getAttribute('data-baja') === p.id); }); $('#titulo-m').textContent = p.titulo;
    var cont = U.vacio($('#vista')); cont.setAttribute('data-vista', p.id); p.render(cont);
  }
  App.irA = irA; App.recargar = function () { irA(App.actual); };
  App.recargarDatos = function () { return Datos.cargar(); };

  function menuUsuario() {
    F.dialogo('Cambiar mi clave', [{ n: 'clave_actual', l: 'Clave actual', t: 'password', req: true }, { n: 'clave_nueva', l: 'Clave nueva (mínimo 8 caracteres)', t: 'password', req: true }], {},
      function (v) { return K.escribir('auth.cambiar_clave', v); }, { alTerminar: function () { U.toast('Clave cambiada. Tus otras sesiones se cerraron.', 'ok'); } });
  }
  $('#salir').onclick = function () { API.logout().then(function () { pantallaLogin(); }); };
  $('#quien').onclick = menuUsuario;
  document.addEventListener('click', function (ev) { if (document.body.classList.contains('menu-abierto') && !ev.target.closest('#lateral') && !ev.target.closest('#navbaja')) document.body.classList.remove('menu-abierto'); });
  window.addEventListener('v19-sesion-vencida', function () { pantallaLogin('Tu sesión venció. Inicia sesión de nuevo.'); });
  window.addEventListener('hashchange', function () { var id = location.hash.slice(1); if (id && id !== App.actual && API.token()) irA(id); });
  App.arrancar = function () {
    if (!window.V19_CONFIG || /PEGA_AQUI/.test(window.V19_CONFIG.API_URL)) { U.vacio($('#vista')).appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, 'Falta configurar'), h('p', {}, 'Edita js/config.js y pega la URL de la implementación del Apps Script de V19.'))); return; }
    U.vacio($('#vista')).appendChild(h('p', { class: 'suave' }, 'Comprobando el servidor…'));
    API.ping().then(function () { iniciar(); }, function (e) { U.vacio($('#vista')).appendChild(h('div', { class: 'tarjeta' }, h('h2', {}, 'No se pudo conectar'), h('p', {}, e.message), h('p', {}, h('button', { id: 'rein', type: 'button', onclick: function () { location.reload(); } }, 'Reintentar')))); });
  };
  root.App = App;
})(window);
