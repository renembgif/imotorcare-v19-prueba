/* Encabezado superior de V18_4/V28: fecha y hora, buscador rápido (Ctrl K) y campana de alertas. Mismos estilos (#x-ub, .x-chip, .x-btn, .x-ib, .x-np, #x-pv). */
(function (root) {
  'use strict';
  var C = {}, alertas = [], pv, pq, pl, li = [], sl = 0;
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; var e = d.firstChild; document.body.appendChild(e); return e; }
  function $(id) { return document.getElementById(id); }
  function appOn() { return !!(root.API && API.token() && API.usuario()); }
  var ub = el('<div id="x-ub"><span id="x-clk" class="x-chip"></span><button type="button" class="x-btn" id="x-sb">Buscar <kbd>Ctrl K</kbd></button><button type="button" class="x-ib" id="x-bell" aria-label="Alertas"><svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z"/><path d="M10 21h4"/></svg><i id="x-bc"></i></button><div class="x-np" id="x-np"></div></div>');
  pv = el('<div id="x-pv"><div id="x-pbx"><input id="x-pq" placeholder="Buscar módulo o acción…" autocomplete="off"><div id="x-pl"></div></div></div>'); pq = $('x-pq'); pl = $('x-pl');
  function tick() { var d = new Date(); $('x-clk').textContent = d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }); }
  tick(); setInterval(tick, 15000);
  function mostrar() { ub.style.display = appOn() ? 'flex' : 'none'; }
  C.mostrar = mostrar;
  function items() {
    var a = [].slice.call(document.querySelectorAll('#menu .nav-item')).map(function (n) { var t = n.textContent.trim(); return { n: 'Ir a ' + t, f: function () { n.click(); } }; });
    a.push({ n: 'Cerrar sesión', f: function () { var s = $('salir'); if (s) s.click(); } }); return a;
  }
  function pr() {
    li = items().filter(function (i) { return i.n.toLowerCase().indexOf(pq.value.toLowerCase()) >= 0; }); sl = Math.min(sl, Math.max(li.length - 1, 0));
    pl.innerHTML = li.length ? li.map(function (i, x) { return '<div class="x-pi' + (x === sl ? ' on' : '') + '" data-x="' + x + '">' + i.n + '</div>'; }).join('') : '<div class="x-pi">Sin resultados</div>';
  }
  function abrir() { pv.classList.add('on'); pq.value = ''; sl = 0; pr(); pq.focus(); } function cerrar() { pv.classList.remove('on'); }
  $('x-sb').onclick = abrir; pq.oninput = function () { sl = 0; pr(); };
  pq.onkeydown = function (e) { if (e.key === 'ArrowDown') { sl = Math.min(sl + 1, li.length - 1); pr(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sl = Math.max(sl - 1, 0); pr(); e.preventDefault(); } else if (e.key === 'Enter' && li[sl]) { cerrar(); li[sl].f(); } };
  pl.onclick = function (e) { var i = e.target.closest('.x-pi[data-x]'); if (i) { cerrar(); li[+i.getAttribute('data-x')].f(); } };
  pv.addEventListener('click', function (e) { if (e.target === pv) cerrar(); });
  document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && appOn()) { e.preventDefault(); abrir(); } if (e.key === 'Escape') cerrar(); });
  /* campana: las alertas las calcula Inicio con los datos reales del sistema (App.alertas) */
  function campana() {
    var c = $('x-bc'); c.textContent = alertas.length; c.style.display = alertas.length ? 'grid' : 'none';
    $('x-np').innerHTML = '<h4>Alertas</h4>' + (alertas.length ? alertas.map(function (x) { return '<div class="x-ar"><div>' + x.t + '<small>' + x.s + '</small></div><span class="x-pl ' + x.k + '">' + (x.k === 'bad' ? 'Revisar' : 'Pendiente') + '</span></div>'; }).join('') : '<div class="x-ar"><div>Todo en orden</div><span class="x-pl ok">✓</span></div>');
  }
  C.alertas = function (a) { alertas = a || []; campana(); };
  $('x-bell').onclick = function (e) { e.stopPropagation(); campana(); $('x-np').classList.toggle('on'); };
  document.addEventListener('click', function (e) { if (!e.target.closest('#x-ub')) $('x-np').classList.remove('on'); });
  campana(); root.Cabecera = C;
})(window);
