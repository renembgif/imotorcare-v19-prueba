/* Selector de tema Claro / Auto / Oscuro, igual que V18_4/V28 (se guarda en localStorage 'theme'; por defecto Claro). */
(function (root) {
  'use strict';
  var T = {}, doc = document.documentElement, mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  var IC = { light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', auto: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', dark: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>' }, LB = { light: 'Claro', auto: 'Auto', dark: 'Oscuro' };
  function modo() { try { return localStorage.getItem('theme') || 'light'; } catch (e) { return 'light'; } }
  function efectivo(m) { return m === 'auto' ? (mq && mq.matches ? 'dark' : 'light') : m; }
  function pintar(m) { var t = efectivo(m); doc.setAttribute('data-theme', t); doc.setAttribute('data-mode', m); doc.classList.toggle('dark', t === 'dark'); doc.style.colorScheme = t;
    var tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.content = t === 'dark' ? '#06151B' : '#f6f7f9';
    document.querySelectorAll('.theme-switch button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === m); }); }
  function poner(m) { try { localStorage.setItem('theme', m); } catch (e) { /* sin almacenamiento: el cambio vale solo en esta sesión */ } pintar(m); }
  function selector() {
    var d = document.createElement('div'); d.className = 'theme-switch'; d.setAttribute('role', 'group'); d.setAttribute('aria-label', 'Tema');
    d.innerHTML = ['light', 'auto', 'dark'].map(function (m) { return '<button type="button" class="tema-btn" data-mode="' + m + '" aria-label="Tema ' + LB[m] + '"><svg viewBox="0 0 24 24">' + IC[m] + '</svg>' + LB[m] + '</button>'; }).join('');
    d.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { poner(b.getAttribute('data-mode')); e.stopPropagation(); } }); return d;
  }
  T.enBarraLateral = function () { var foot = document.querySelector('.sidebar-foot'); if (foot && !foot.querySelector('.theme-switch')) foot.insertBefore(selector(), document.getElementById('salir')); pintar(modo()); };
  T.enMas = function (menu) { var w = document.createElement('div'); w.className = 'mas-theme'; var l = document.createElement('div'); l.className = 'lbl'; l.textContent = 'Tema'; w.appendChild(l); w.appendChild(selector()); menu.appendChild(w); pintar(modo()); };
  if (mq) { var f = function () { if (modo() === 'auto') pintar('auto'); }; if (mq.addEventListener) mq.addEventListener('change', f); else if (mq.addListener) mq.addListener(f); }
  pintar(modo()); root.Temas = T;
})(window);
