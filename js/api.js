/* Cliente de la API V19. Reglas: todo es JSON; una respuesta que no es JSON se explica con un mensaje claro;
 * las escrituras llevan opId y se reintentan con el MISMO opId (el backend no duplica); si tras los reintentos no se sabe
 * qué pasó, se pregunta al backend con operaciones.estado antes de dar un error. */
(function (root) {
  'use strict';
  var TOKEN_KEY = 'v19_token', USER_KEY = 'v19_usuario';
  var cfg = function () { return root.V19_CONFIG || {}; };
  var almacen = function () { try { return root.sessionStorage; } catch (e) { return null; } };
  var leer = function (k) { var a = almacen(); return a ? a.getItem(k) : null; };
  var guardar = function (k, v) { var a = almacen(); if (a) { if (v == null) a.removeItem(k); else a.setItem(k, v); } };

  function ErrorApi(codigo, mensaje, detalle) { var e = new Error(mensaje); e.codigo = codigo; e.detalle = detalle || null; e.esApi = true; return e; }
  function uuid() {
    if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
    return 'op-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function dormir(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* Un intento HTTP. Lanza ErrorApi('RED') si no hay conexión y ErrorApi('RESPUESTA_INVALIDA') si no llega JSON. */
  function intentar(url, opciones, timeoutMs) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var t = ctl ? setTimeout(function () { ctl.abort(); }, timeoutMs) : null;
    if (ctl) opciones.signal = ctl.signal;
    return root.fetch(url, opciones).then(function (resp) { return resp.text(); }, function (e) {
      throw ErrorApi('RED', 'No hay conexión con el servidor o tardó demasiado en responder.', { causa: String(e && e.message || e) });
    }).then(function (texto) {
      if (t) clearTimeout(t);
      try { return JSON.parse(texto); }
      catch (e) { throw ErrorApi('RESPUESTA_INVALIDA', 'El servidor respondió algo que no es JSON (puede ser un error del script, un límite de Google o una sesión de Google vencida).', { inicio: String(texto).slice(0, 160) }); }
    }, function (e) { if (t) clearTimeout(t); throw e; });
  }

  var API = {
    ErrorApi: ErrorApi,
    token: function () { return leer(TOKEN_KEY); },
    usuario: function () { try { return JSON.parse(leer(USER_KEY) || 'null'); } catch (e) { return null; } },
    _cerrarLocal: function () { guardar(TOKEN_KEY, null); guardar(USER_KEY, null); },

    /* Comprueba que el backend está instalado y es compatible con esta Web. */
    ping: function () {
      var url = cfg().API_URL + (cfg().API_URL.indexOf('?') >= 0 ? '&' : '?') + 'accion=ping';
      return intentar(url, { method: 'GET' }, 20000).then(function (r) {
        if (!r.ok) throw ErrorApi(r.error && r.error.codigo || 'INTERNO', r.error && r.error.mensaje || 'Error al comprobar el servidor.');
        if (r.datos.esquema !== cfg().VERSION_API) throw ErrorApi('VERSION_INCOMPATIBLE', 'El backend (' + r.datos.v + ') no es compatible con esta Web. Actualiza los archivos del Apps Script o de la Web.', r.datos);
        if (!r.datos.instalado) throw ErrorApi('NO_INSTALADO', 'El backend aún no está instalado: ejecuta instalarV19() en el Apps Script.');
        return r.datos;
      });
    },

    /* Llama a una acción. opciones: { escritura:true, opId, reintentos, timeoutMs }. */
    llamar: function (accion, datos, opciones) {
      opciones = opciones || {};
      var escritura = !!opciones.escritura, opId = escritura ? (opciones.opId || uuid()) : undefined;
      var cuerpo = { v: cfg().VERSION_API, accion: accion, token: API.token() || undefined, opId: opId, datos: datos || {} };
      var reintentos = opciones.reintentos != null ? opciones.reintentos : (escritura ? 3 : 2), intento = 0;
      var envio = { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cuerpo) };

      function procesar(r) {
        if (r && r.ok) return r;
        var e = (r && r.error) || {};
        if (e.codigo === 'SESION_VENCIDA' || e.codigo === 'NO_AUTENTICADO') { API._cerrarLocal(); if (root.dispatchEvent && root.CustomEvent) root.dispatchEvent(new root.CustomEvent('v19-sesion-vencida')); }
        throw ErrorApi(e.codigo || 'INTERNO', e.mensaje || 'Error desconocido.', e.detalle);
      }
      function ciclo() {
        return intentar(cfg().API_URL, Object.assign({}, envio), opciones.timeoutMs || 60000).then(procesar, function (e) {
          if (!e.esApi || (e.codigo !== 'RED' && e.codigo !== 'RESPUESTA_INVALIDA')) throw e;
          if (intento < reintentos) { intento++; return dormir(opciones.esperaMs != null ? opciones.esperaMs : 600 * intento).then(ciclo); }
          if (!escritura) throw e;
          // No sabemos si se guardó: preguntamos antes de rendirnos.
          return intentar(cfg().API_URL, { method: 'POST', headers: envio.headers, body: JSON.stringify({ v: cfg().VERSION_API, accion: 'operaciones.estado', token: API.token() || undefined, datos: { op_id: opId } }) }, 30000)
            .then(function (r) {
              if (r && r.ok && r.datos.procesada) return { ok: true, datos: {}, avisos: ['La operación sí se guardó, pero no llegó la confirmación. Actualiza la pantalla para ver el resultado.'], repetida: true, sinResultado: true };
              throw ErrorApi('NO_CONFIRMADA', 'No se pudo confirmar la operación y no consta como guardada. Puedes reintentar con seguridad.', { opId: opId, causa: e.codigo });
            }, function () { throw ErrorApi('NO_CONFIRMADA', 'No se pudo confirmar la operación. Antes de repetirla, revisa si ya aparece registrada.', { opId: opId, causa: e.codigo }); });
        });
      }
      return ciclo();
    },

    login: function (usuario, clave) {
      return API.llamar('auth.login', { usuario: usuario, clave: clave, dispositivo: (root.navigator && root.navigator.userAgent || '').slice(0, 100) }, { escritura: true, reintentos: 1 })
        .then(function (r) { guardar(TOKEN_KEY, r.datos.token); guardar(USER_KEY, JSON.stringify(r.datos.usuario)); return r.datos.usuario; });
    },
    logout: function () {
      return API.llamar('auth.logout', {}, { escritura: true, reintentos: 0 }).then(function () { API._cerrarLocal(); }, function () { API._cerrarLocal(); });
    }
  };
  root.API = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
