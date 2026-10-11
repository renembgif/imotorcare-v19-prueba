/* Web V19 — armazón: inicio de sesión, menú por rol y enrutador. Diseño visual de V18_4 (menú, login, barra inferior). */
(function (root) {
  'use strict';
  var h = U.h, App = { pantallas: [], actual: null }, $ = function (s) { return document.querySelector(s); };
  App.pantalla = function (p) { App.pantallas.push(p); };
  App.rol = function () { var u = API.usuario(); return u ? (u.rol === 'Administrador' ? 'A' : 'O') : ''; };
  App.aviso = function (msg, tipo) { var a = $('#aviso'); a.hidden = !msg; a.className = 'aviso ' + (tipo || ''); a.textContent = msg || ''; };

  var ORDEN = ['inicio', 'vender', 'cotizaciones', 'servicios', 'ventas', 'productos', 'compras', 'caja', 'compromisos', 'socios', 'conversiones', 'deudores', 'sunat', 'capas', 'proveedores'];   // mismo orden del menú de V18_4; lo propio de V19 va después
  function icono(id) { var t = document.createElement('span'); t.className = 'ic'; t.innerHTML = (window.ICONOS_V19 && (ICONOS_V19[id] || ICONOS_V19._config)) || ''; return t; }
  function login(nodos) { var c = $('#login-card'); U.vacio(c); nodos.forEach(function (n) { c.appendChild(n); }); $('#login-screen').hidden = false; document.documentElement.classList.add('login-abierto'); }
  function cerrarLogin() { $('#login-screen').hidden = true; document.documentElement.classList.remove('login-abierto'); var av = $('#aviso'); if (av.parentNode !== $('#principal')) $('#principal').insertBefore(av, $('#vista')); }
  App.mensajeCentral = function (titulo, nodos) { login([h('h1', {}, titulo)].concat(nodos || [])); };
  function pantallaLogin(msg) {
    $('#salir').hidden = true; $('#quien').textContent = ''; $('#user-av').textContent = ''; $('#menu').hidden = true; $('#navbaja').hidden = true; $('#mas-menu').classList.remove('show'); document.body.classList.remove('menu-abierto'); $('#titulo-m').textContent = 'iMotor Care';
    U.vacio($('#vista'));
    var u = h('input', { id: 'lu', autocomplete: 'username', 'data-n': 'usuario', placeholder: 'Tu usuario' }), c = h('input', { id: 'lc', type: 'password', autocomplete: 'current-password', 'data-n': 'clave', placeholder: '••••••••' });
    var entrar = function () { var b = $('#lb'); b.disabled = true; API.login(u.value, c.value).then(function () { App.aviso(''); iniciar(); }, function (e) { App.aviso(e.message, 'error'); b.disabled = false; }); };
    var av = $('#aviso'); av.hidden = true;
    var ojo = h('button', { type: 'button', class: 'pw-toggle', 'aria-label': 'Mostrar clave', onclick: function () { c.type = c.type === 'password' ? 'text' : 'password'; } }); ojo.innerHTML = "<svg id=\"pw-eye-icon\" viewBox=\"0 0 24 24\" width=\"19\" height=\"19\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M1.5 12s3.8-7 10.5-7 10.5 7 10.5 7-3.8 7-10.5 7-10.5-7-10.5-7z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg>";
    login([h('h1', {}, 'Bienvenido'), h('p', { class: 'sub' }, 'Ingresa para continuar · V19 (PRUEBA).'), h('div', { class: 'field' }, h('label', {}, 'ID de usuario'), u), h('div', { class: 'field' }, h('label', {}, 'Clave de acceso'), h('div', { class: 'field-pw' }, c, ojo)), h('button', { id: 'lb', class: 'btn-primary primario', type: 'button', onclick: entrar }, 'Entrar'), av, h('p', { class: 'login-hint' }, 'Este sistema es de uso interno. Si no tienes la clave, pídesela al administrador.')]);
    c.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') entrar(); }); u.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') c.focus(); }); if (msg) App.aviso(msg, 'warn');
  }
  function iniciar() {
    var u = API.usuario(); if (!u || !API.token()) return pantallaLogin();
    $('#quien').textContent = u.nombre + ' · ' + u.rol; $('#user-av').textContent = String(u.nombre || '?').replace(/[^A-Za-zÁÉÍÓÚÑ ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (x) { return x.charAt(0).toUpperCase(); }).join('') || '?'; $('#salir').hidden = false;
    cerrarLogin(); U.vacio($('#vista')).appendChild(h('p', { class: 'empty-note' }, 'Cargando datos…'));
    Datos.cargar().then(function () { pintarMenu(); irA(location.hash.slice(1) || 'inicio'); }, function (e) { App.aviso(e.message, 'error'); });
  }
  function abrirVenta() { irA('ventas'); VentasUI.dialogoVenta(function () { App.recargar(); }); }
  function pintarMenu() {
    var rol = App.rol(), menu = U.vacio($('#menu')), baja = U.vacio($('#navbaja')), mas = U.vacio($('#mas-menu')); menu.hidden = false; baja.hidden = false;
    var visibles = App.pantallas.filter(function (p) { return p.roles.indexOf(rol) >= 0; });
    var pos = function (p) { var i = ORDEN.indexOf(p.id); return i < 0 ? 999 : i; };
    var libres = visibles.filter(function (p) { return !p.grupo; }).sort(function (a, b) { return pos(a) - pos(b); }), config = visibles.filter(function (p) { return p.grupo; });   // Configuración va junta al final
    var items = libres.map(function (p) { return { id: p.id, titulo: p.titulo, ir: function () { irA(p.id); } }; });
    items.splice(1, 0, { id: 'vender', titulo: 'Nueva venta', ir: abrirVenta, accion: 'menu-vender' });   // como V18_4: "Nueva venta" es la 2.ª entrada
    function boton(it, clase) { var attrs = { type: 'button', class: clase, onclick: function () { document.body.classList.remove('menu-abierto'); mas.classList.remove('show'); it.ir(); } }; if (it.accion) attrs['data-accion'] = it.accion; else attrs['data-pantalla'] = it.id; return h('button', attrs, clase === 'nav-item' ? [icono(it.id), it.titulo] : [it.titulo]); }
    items.forEach(function (it) { menu.appendChild(boton(it, 'nav-item')); if (it.id !== 'vender') mas.appendChild(boton(it, 'mas-item')); });
    if (config.length) { menu.appendChild(h('div', { class: 'grupo-menu', 'data-grupo': config[0].grupo }, config[0].grupo)); mas.appendChild(h('div', { class: 'grupo-menu' }, config[0].grupo));
      config.forEach(function (p) { var it = { id: p.id, titulo: p.titulo, ir: function () { irA(p.id); } }; menu.appendChild(boton(it, 'nav-item')); mas.appendChild(boton(it, 'mas-item')); }); }
    if (window.Temas) { Temas.enBarraLateral(); Temas.enMas(mas); }
    // Barra inferior (celular), como en V18_4: Inicio · Vender · Cotizar · Stock · Más
    [['inicio', 'inicio', 'Inicio'], ['vender', 'vender', 'Vender'], ['cotizaciones', 'cotizaciones', 'Cotizar'], ['productos', 'productos', 'Stock'], ['mas', '', 'Más']].forEach(function (x) {
      var ic = x[0] === 'mas' ? h('span', { class: 'ic' }, '⋮') : icono(x[1]);
      baja.appendChild(h('button', { class: 'bn-item' + (x[0] === 'mas' ? ' bn-mas-btn' : ''), 'data-baja': x[0], type: 'button', onclick: function (ev) {
        if (x[0] === 'mas') { ev.stopPropagation(); document.body.classList.toggle('menu-abierto'); mas.classList.toggle('show'); return; }
        document.body.classList.remove('menu-abierto'); mas.classList.remove('show'); if (x[0] === 'vender') abrirVenta(); else irA(x[0]);
      } }, ic, x[2]));
    });
  }
  function irA(id) {
    var rol = App.rol(), p = App.pantallas.filter(function (x) { return x.id === id && x.roles.indexOf(rol) >= 0; })[0] || App.pantallas.filter(function (x) { return x.roles.indexOf(rol) >= 0; })[0];
    if (!p) return; App.actual = p.id; location.hash = p.id;
    document.querySelectorAll('#menu .nav-item').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-pantalla') === p.id); b.classList.toggle('act', b.getAttribute('data-pantalla') === p.id); });
    document.querySelectorAll('#navbaja .bn-item').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-baja') === p.id); b.classList.toggle('act', b.getAttribute('data-baja') === p.id); });
    document.querySelectorAll('#mas-menu .mas-item').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-pantalla') === p.id); }); $('#titulo-m').textContent = p.titulo;
    var cont = U.vacio($('#vista')); cont.setAttribute('data-vista', p.id);
    if (p.id !== 'inicio') cont.appendChild(h('div', { class: 'topline' }, h('h2', {}, p.titulo), h('button', { type: 'button', class: 'btn-sm', 'data-accion': 'actualizar', title: 'Vuelve a leer los datos desde el servidor', onclick: function () { App.recargar(); } }, '↻ Actualizar')));
    p.render(cont);
  }
  App.irA = irA; App.recargar = function () { irA(App.actual); };
  App.recargarDatos = function () { return Datos.cargar(); };

  function menuUsuario() {
    F.dialogo('Cambiar mi clave', [{ n: 'clave_actual', l: 'Clave actual', t: 'password', req: true }, { n: 'clave_nueva', l: 'Clave nueva (mínimo 8 caracteres)', t: 'password', req: true }], {},
      function (v) { return K.escribir('auth.cambiar_clave', v); }, { alTerminar: function () { U.toast('Clave cambiada. Tus otras sesiones se cerraron.', 'ok'); } });
  }
  $('#salir').onclick = function () { API.logout().then(function () { pantallaLogin(); }); };
  $('#quien').onclick = menuUsuario;
  document.addEventListener('click', function (ev) { if (document.body.classList.contains('menu-abierto') && !ev.target.closest('#mas-menu') && !ev.target.closest('#navbaja')) { document.body.classList.remove('menu-abierto'); $('#mas-menu').classList.remove('show'); } });
  window.addEventListener('v19-sesion-vencida', function () { pantallaLogin('Tu sesión venció. Inicia sesión de nuevo.'); });
  window.addEventListener('hashchange', function () { var id = location.hash.slice(1); if (id && id !== App.actual && API.token()) irA(id); });
  App.arrancar = function () {
    if (!window.V19_CONFIG || /PEGA_AQUI/.test(window.V19_CONFIG.API_URL)) { App.mensajeCentral('Falta configurar', [h('p', { class: 'sub' }, 'Edita js/config.js y pega la URL de la implementación del Apps Script de V19.')]); return; }
    App.mensajeCentral('iMotor Care', [h('p', { class: 'sub' }, 'Comprobando el servidor…')]);
    API.ping().then(function () { iniciar(); }, function (e) { App.mensajeCentral('No se pudo conectar', [h('p', { class: 'sub' }, e.message), h('button', { id: 'rein', class: 'btn-primary', type: 'button', onclick: function () { location.reload(); } }, 'Reintentar')]); });
  };
  root.App = App;
})(window);
