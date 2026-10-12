/* Web V19 — armazón: inicio de sesión, menú por rol y enrutador. Diseño visual de V18_4 (menú, login, barra inferior). */
(function (root) {
  'use strict';
  var h = U.h, App = { pantallas: [], actual: null, build: '20261011b' }, $ = function (s) { return document.querySelector(s); };
  App.pantalla = function (p) { App.pantallas.push(p); };
  App.rol = function () { var u = API.usuario(); return u ? (u.rol === 'Administrador' ? 'A' : 'O') : ''; };
  App.aviso = function (msg, tipo) { var a = $('#aviso'); a.hidden = !msg; a.className = 'aviso ' + (tipo || ''); a.textContent = msg || ''; };

  /* Animaciones de V18_4: pantalla de apertura y onda de espera al entrar. Se quitan en cuanto el sistema está listo (mínimo ~1 s para que se vean, sin esperas artificiales largas). */
  var T0 = Date.now(), intro = null, onda = null;
  function marca() { var d = document.createElement('div'); d.innerHTML = '<img src="img/logo-web.png" alt="iMotor Care"><div class="x-lb"><i></i></div><small>Abriendo iMotor Care…</small>'; return d; }
  function splashOn() { if (intro) return; document.documentElement.classList.add('x-splash'); intro = document.createElement('div'); intro.id = 'x-intro'; intro.innerHTML = marca().innerHTML; intro.onclick = splashOff_; document.body.appendChild(intro); }
  function splashOff_() { if (!intro || intro.classList.contains('off')) return; var i = intro; intro = null; i.classList.add('off'); document.documentElement.classList.remove('x-splash'); setTimeout(function () { if (i.parentNode) i.parentNode.removeChild(i); }, 700); }
  App.splashOff = function () { setTimeout(splashOff_, Math.max(0, 1100 - (Date.now() - T0))); };
  function ondaOn() { if (!onda) { onda = document.createElement('div'); onda.id = 'x-wv'; onda.innerHTML = marca().innerHTML; document.body.appendChild(onda); } onda.T = Date.now(); onda.classList.add('on'); }
  function ondaOff() { if (!onda) return; var o = onda; setTimeout(function () { o.classList.remove('on'); }, Math.max(0, 700 - (Date.now() - o.T))); }
  var ORDEN = ['inicio', 'vender', 'cotizaciones', 'servicios', 'ventas', 'productos', 'compras', 'caja', 'compromisos', 'socios', 'conversiones', 'deudores', 'sunat', 'capas', 'proveedores'];   // mismo orden del menú de V18_4; lo propio de V19 va después
  function icono(id) { var t = document.createElement('span'); t.className = 'ic'; t.innerHTML = (window.ICONOS_V19 && (ICONOS_V19[id] || ICONOS_V19._config)) || ''; return t; }
  function login(nodos) { App.splashOff(); var c = $('#login-card'); U.vacio(c); nodos.forEach(function (n) { c.appendChild(n); }); $('#login-screen').hidden = false; document.documentElement.classList.add('login-abierto'); }
  function cerrarLogin() { $('#login-screen').hidden = true; document.documentElement.classList.remove('login-abierto'); var av = $('#aviso'); if (av.parentNode !== $('#principal')) $('#principal').insertBefore(av, $('#vista')); }
  App.mensajeCentral = function (titulo, nodos) { login([h('h1', {}, titulo)].concat(nodos || [])); };
  function pantallaLogin(msg) {
    if (window.Cabecera) Cabecera.mostrar(); $('#salir').hidden = true; $('#quien').textContent = ''; $('#user-av').textContent = ''; $('#menu').hidden = true; $('#navbaja').hidden = true; $('#mas-menu').classList.remove('show'); document.body.classList.remove('menu-abierto'); $('#titulo-m').textContent = 'iMotor Care';
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
    $('#quien').textContent = u.nombre; $('#user-av').textContent = String(u.nombre || '?').replace(/[^A-Za-zÁÉÍÓÚÑ ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (x) { return x.charAt(0).toUpperCase(); }).join('') || '?'; $('#salir').hidden = false;
    $('#user-rol').textContent = u.rol + ' · V19 · ' + App.build; if (window.Cabecera) Cabecera.mostrar();
    cerrarLogin(); ondaOn(); U.vacio($('#vista')).appendChild(h('p', { class: 'empty-note' }, 'Cargando datos…'));
    Datos.cargar().then(function () { pintarMenu(); irA(location.hash.slice(1) || 'inicio'); App.splashOff(); ondaOff(); }, function (e) { App.splashOff(); ondaOff(); App.aviso(e.message, 'error'); });
  }
  function abrirVenta() { irA('ventas'); VentasUI.dialogoVenta(function () { App.recargar(); }); }
  function pintarMenu() {
    var rol = App.rol(), menu = U.vacio($('#menu')), baja = U.vacio($('#navbaja')), mas = U.vacio($('#mas-menu')); menu.hidden = false; baja.hidden = false;
    var visibles = App.pantallas.filter(function (p) { return p.roles.indexOf(rol) >= 0; });
    var pos = function (p) { var i = ORDEN.indexOf(p.id); return i < 0 ? 999 : i; };
    var libres = visibles.filter(function (p) { return !p.grupo; }).sort(function (a, b) { return pos(a) - pos(b); }), config = visibles.filter(function (p) { return p.grupo; });   // Configuración va junta al final
    var items = libres.map(function (p) { return { id: p.id, titulo: p.titulo, ir: function () { irA(p.id); } }; });
    items.splice(1, 0, { id: 'vender', titulo: 'Nueva venta', ir: abrirVenta, accion: 'menu-vender' });   // como V18_4: "Nueva venta" es la 2.ª entrada
    function boton(it, clase) { var attrs = { type: 'button', class: clase, onclick: function () { document.body.classList.remove('menu-abierto'); mas.classList.remove('show'); it.ir(); } }; if (it.accion) attrs['data-accion'] = it.accion; else attrs['data-pantalla'] = it.id; return h('button', attrs, clase === 'nav-item' ? [icono(it.id), h('span', { class: 'nv-t' }, it.titulo)] : [it.titulo]); }
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
  /* Chips de periodo de V18_4 (Hoy · Ayer · Esta semana · Este mes · Mes anterior · Rango · Últimos 50) sobre los filtros de fecha propios de V19: rellenan Desde/Hasta y buscan. */
  var CON_CHIPS = ['ventas', 'compras', 'conversiones', 'cotizaciones'];
  function iso(d) { return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2); }
  function rangoChip(k) {
    var h0 = U.hoy(), d = new Date(h0 + 'T00:00:00Z'), y = d.getUTCFullYear(), m = d.getUTCMonth(), dow = (d.getUTCDay() + 6) % 7;
    if (k === 'hoy') return [h0, h0];
    if (k === 'ayer') { var a = new Date(d); a.setUTCDate(a.getUTCDate() - 1); return [iso(a), iso(a)]; }
    if (k === 'semana') { var l = new Date(d); l.setUTCDate(l.getUTCDate() - dow); return [iso(l), h0]; }
    if (k === 'mes') return [iso(new Date(Date.UTC(y, m, 1))), h0];
    if (k === 'mesant') return [iso(new Date(Date.UTC(y, m - 1, 1))), iso(new Date(Date.UTC(y, m, 0)))];
    return ['', ''];
  }
  function chipsFecha(cont, p) {
    if (CON_CHIPS.indexOf(p.id) < 0) return; var panel = cont.querySelector('.filtros'); if (!panel) return;
    var desde = panel.querySelector('[data-n="desde"]'), hasta = panel.querySelector('[data-n="hasta"]'), buscar = panel.querySelector('[data-accion="buscar"]'); if (!desde || !hasta || !buscar) return;
    var DEF = (p.id === 'ventas' || p.id === 'compras') ? 'Últimos 50' : 'Todas', fila = h('div', { class: 'tabs-mini', 'data-chips': p.id });
    function marcar(k) { [].slice.call(fila.querySelectorAll('button')).forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-chip') === k); }); }
    [['hoy', 'Hoy'], ['ayer', 'Ayer'], ['semana', 'Esta semana'], ['mes', 'Este mes'], ['mesant', 'Mes anterior'], ['rango', 'Rango'], ['todo', DEF]].forEach(function (x) {
      fila.appendChild(h('button', { type: 'button', class: 'tab-mini' + (x[0] === 'todo' ? ' active' : ''), 'data-chip': x[0], onclick: function () {
        marcar(x[0]); if (x[0] === 'rango') { desde.focus(); return; }
        var r = rangoChip(x[0]); desde.value = r[0]; hasta.value = r[1]; desde.dispatchEvent(new Event('input', { bubbles: true })); hasta.dispatchEvent(new Event('input', { bubbles: true })); buscar.click(); } }, x[1]));
    });
    [desde, hasta].forEach(function (i) { i.addEventListener('change', function () { marcar('rango'); }); });
    cont.insertBefore(h('div', { class: 'filtro-fecha' }, fila), panel);
  }
  function irA(id) {
    var rol = App.rol(), p = App.pantallas.filter(function (x) { return x.id === id && x.roles.indexOf(rol) >= 0; })[0] || App.pantallas.filter(function (x) { return x.roles.indexOf(rol) >= 0; })[0];
    if (!p) return; App.actual = p.id; location.hash = p.id;
    document.querySelectorAll('#menu .nav-item').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-pantalla') === p.id); b.classList.toggle('act', b.getAttribute('data-pantalla') === p.id); });
    document.querySelectorAll('#navbaja .bn-item').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-baja') === p.id); b.classList.toggle('act', b.getAttribute('data-baja') === p.id); });
    document.querySelectorAll('#mas-menu .mas-item').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-pantalla') === p.id); }); $('#titulo-m').textContent = p.titulo;
    var cont = U.vacio($('#vista')); cont.setAttribute('data-vista', p.id);
    var grupo = h('span', { class: 'acc-grupo' }, h('button', { type: 'button', class: 'btn-sm', 'data-accion': 'actualizar', title: 'Vuelve a leer los datos desde el servidor', onclick: function () { App.recargar(); } }, '↻ Actualizar'));
    if (p.id !== 'inicio') cont.appendChild(h('div', { class: 'topline' }, h('h2', {}, p.titulo), grupo));
    p.render(cont);
    chipsFecha(cont, p);
    var barra = cont.querySelector('.barra-acc');   // los botones principales (Nueva venta, Nuevo producto…) suben a la fila del título
    if (barra && p.id !== 'inicio') { while (barra.firstChild) grupo.appendChild(barra.firstChild); barra.parentNode.removeChild(barra); }
    if (cont.getAttribute('data-vista') !== p.id) console.error('V19: la vista no coincide con la pantalla pedida', p.id);
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
    splashOn(); App.mensajeCentral('iMotor Care', [h('p', { class: 'sub' }, 'Comprobando el servidor…')]);
    API.ping().then(function () { iniciar(); }, function (e) { App.mensajeCentral('No se pudo conectar', [h('p', { class: 'sub' }, e.message), h('button', { id: 'rein', class: 'btn-primary', type: 'button', onclick: function () { location.reload(); } }, 'Reintentar')]); });
  };
  root.App = App;
})(window);
