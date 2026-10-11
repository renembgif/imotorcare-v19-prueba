/* Impresión: PDF de cotización y sticker de próximo cambio. Código y plantillas copiados de V18_4 (no se rediseñan).
 * Solo muestra datos del cliente: nunca costos ni capas de inventario (regla 2.18 de FIFO). */
var Impresion = (function () {
  'use strict';
  /* Nombre de archivo a prueba de codificación: si este archivo se leyó mal (UTF-8 leído como Latin-1: "CotizaciÃ³n"), se repara; y los nombres se escriben con \u para no depender de la codificación del servidor. */
  function nombreSeguro(n) { n = String(n); try { if (/[\u00c2\u00c3][\u0080-\u00bf]/.test(n)) return decodeURIComponent(escape(n)); } catch (e) { /* ya estaba bien */ } return n; }
  async function compartirArchivo(blob, filename, mensaje, mime) {
    filename = nombreSeguro(filename);
    try {
      const file = new File([blob], filename, { type: mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: mensaje });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return; // el usuario cerró el share sheet, no hacer nada más
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  const MENSAJE_WHATSAPP_DEFAULT = 'iMotor Care | Mantenimiento / Cambio de aceite';
  function generarPDF(numero, fechaStr, cliente, items, total, igv) {
    const { jsPDF } = window.jspdf;
    const pageW = 595, margin = 30;
    const NAVY = [4, 17, 22], INK = [17, 25, 28], GRAY = [85, 99, 104];
    const JADE = [0, 202, 190], JADE_BRIGHT = [0, 202, 190], LINE = [180, 220, 216], WHITE = [255, 255, 255];
    const colCantR = pageW - 220, colUnitR = pageW - 140, colSubR = pageW - 38;
    const prodX = 38, prodMaxW = (colCantR - 24) - prodX;
  
    // --- Paso 1: medir con una hoja temporal, para que ningún nombre largo descuadre la tabla ---
    const meas = new jsPDF({ unit: 'pt' });
    meas.setFont(undefined, 'normal'); meas.setFontSize(9.5);
    const filas = items.map(it => {
      const lineas = meas.splitTextToSize(it.nombre, prodMaxW);
      return { it, lineas, h: Math.max(24, lineas.length * 12 + 12) };
    });
    const alturaFilas = filas.reduce((s, f) => s + f.h, 0);
  
    const headerH = 120, infoH = 94, clienteH = 68, tableHeadH = 26, totalsH = 108;
    const footerImgW = pageW - margin * 2;
    const footerImgH = footerImgW * (405 / 1015); // proporción real del PNG del pie
    const footerH = 26 + footerImgH;
    const tableTop = headerH + infoH + clienteH;
    const tableBottom = tableTop + tableHeadH + alturaFilas;
    const pageH = Math.max(842, tableBottom + totalsH + footerH + margin); // A4 vertical (595x842pt) por defecto
  
    const doc = new jsPDF({ unit: 'pt', format: [pageW, pageH] });
  
    // Franjas diagonales tipo isotipo, en la esquina del encabezado
    function chevron(x, y, w, h, skew, color) {
      doc.setFillColor(...color);
      doc.triangle(x, y, x + w, y, x + w - skew, y + h, 'F');
      doc.triangle(x, y, x + w - skew, y + h, x - skew, y + h, 'F');
    }
  
    // Íconos lineales simples (ubicación, teléfono, documento, cliente)
    function iconPin(x, y, s, color) {
      doc.setFillColor(...color);
      doc.circle(x, y - s * 0.12, s * 0.42, 'F');
      doc.triangle(x - s * 0.3, y, x + s * 0.3, y, x, y + s * 0.55, 'F');
      doc.setFillColor(255, 255, 255); doc.circle(x, y - s * 0.12, s * 0.16, 'F');
    }
    function iconPhone(x, y, s, color) {
      doc.setFillColor(...color);
      doc.roundedRect(x - s * 0.28, y - s * 0.4, s * 0.56, s * 0.8, s * 0.18, s * 0.18, 'F');
      doc.setFillColor(255, 255, 255); doc.rect(x - s * 0.18, y - s * 0.24, s * 0.36, s * 0.42, 'F');
    }
    function iconDoc(x, y, s, color) {
      doc.setDrawColor(...color); doc.setLineWidth(1.2);
      doc.roundedRect(x - s * 0.32, y - s * 0.42, s * 0.64, s * 0.84, 2, 2, 'S');
      doc.line(x - s * 0.16, y - s * 0.1, x + s * 0.16, y - s * 0.1);
      doc.line(x - s * 0.16, y + s * 0.08, x + s * 0.16, y + s * 0.08);
      doc.line(x - s * 0.16, y + s * 0.26, x + s * 0.02, y + s * 0.26);
    }
    function iconPerson(x, y, s, color) {
      doc.setFillColor(...color);
      doc.circle(x, y - s * 0.26, s * 0.24, 'F');
      doc.roundedRect(x - s * 0.38, y + s * 0.02, s * 0.76, s * 0.5, s * 0.2, s * 0.2, 'F');
    }
    // Insignias de redes/pago: PNG reales, limpios (fondo transparente, sin recortes ni bordes)
    function badgeImg(b64, x, y, s) {
      try { doc.addImage('data:image/png;base64,' + b64, 'PNG', x, y, s, s); } catch (e) {}
    }
    function badgeYape(x, y, w, h) { badgeImg(ICON_YAPE_B64, x, y, w, w); }
    function badgeTikTok(x, y, s) { badgeImg(ICON_TIKTOK_B64, x, y, s); }
    function badgeInstagram(x, y, s) { badgeImg(ICON_INSTAGRAM_B64, x, y, s); }
    function badgeFacebook(x, y, s) { badgeImg(ICON_FACEBOOK_B64, x, y, s); }
    function badgeTransferencia(x, y, s) { badgeImg(ICON_TARJETA_B64, x, y, s); }
  
    // ---------- Encabezado (azul noche) ----------
    doc.setFillColor(...NAVY); doc.rect(0, 0, pageW, headerH, 'F');
  
    try { doc.addImage('data:image/png;base64,' + WEB_LOGO_B64, 'PNG', 26, 26, 150, 84); } catch (e) {}
  
    doc.setDrawColor(...JADE); doc.setLineWidth(1); doc.line(pageW - 190, 24, pageW - 190, headerH - 21);
    doc.setTextColor(...JADE); doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.text('COTIZACIÓN', pageW - 30, 37, { align: 'right' });
    doc.setTextColor(...WHITE); doc.setFontSize(28); doc.setFont(undefined, 'bold');
    doc.text('N.° ' + String(numero).replace(/^N\.?\s*°?\s*/i, ''), pageW - 30, 62, { align: 'right' });
    doc.setFontSize(9.5); doc.setFont(undefined, 'normal'); doc.setTextColor(190, 205, 202);
    doc.text(fechaStr, pageW - 30, 78, { align: 'right' });
  
    // ---------- Barra de datos del negocio ----------
    let iy = headerH + 24;
    doc.setTextColor(...INK); doc.setFontSize(9.5); doc.setFont(undefined, 'normal');
    iconPin(prodX + 5, iy - 4, 13, JADE);
    doc.text('Av. Carretera Central Km. 11 Mz. A Lt. 2 U.C. 10780, Ate, Lima', prodX + 20, iy);
    iy += 17;
    doc.text('Ref. Pasando UTP, paradero Caseta', prodX + 20, iy);
    iy += 17;
    iconPhone(prodX + 5, iy - 4, 12, JADE);
    doc.text('Tel: 922 145 441', prodX + 20, iy);
    iy += 17;
    iconDoc(prodX + 5, iy - 4, 13, JADE);
    doc.text('RUC: 10744462628', prodX + 20, iy);
    doc.setDrawColor(...LINE); doc.setLineWidth(1);
    doc.line(margin, headerH + infoH, pageW - margin, headerH + infoH);
  
    // ---------- Cliente ----------
    let cy = headerH + infoH + 14;
    doc.setFillColor(244, 250, 249); doc.roundedRect(margin, cy, pageW - margin * 2, 44, 8, 8, 'F');
    iconPerson(prodX + 11, cy + 22, 26, JADE);
    doc.setTextColor(...JADE); doc.setFontSize(9.5); doc.setFont(undefined, 'bold');
    doc.text('CLIENTE', prodX + 32, cy + 18);
    doc.setTextColor(...INK); doc.setFontSize(12.5); doc.setFont(undefined, 'normal');
    doc.text(cliente, prodX + 32, cy + 34);
  
    // ---------- Tabla ----------
    const tTop = tableTop;
    doc.setFillColor(...NAVY); doc.rect(margin, tTop, pageW - margin * 2, tableHeadH, 'F');
    doc.setTextColor(...WHITE); doc.setFontSize(9.5); doc.setFont(undefined, 'bold');
    doc.text('PRODUCTO', prodX, tTop + 17);
    doc.text('CANT.', colCantR, tTop + 17, { align: 'right' });
    doc.text('P. UNIT.', colUnitR, tTop + 17, { align: 'right' });
    doc.text('SUBTOTAL', colSubR, tTop + 17, { align: 'right' });
  
    let ry = tTop + tableHeadH;
    doc.setFont(undefined, 'normal'); doc.setTextColor(...INK); doc.setFontSize(9.5);
    filas.forEach(f => {
      doc.setDrawColor(...LINE); doc.setLineWidth(0.8);
      doc.line(margin, ry + f.h, pageW - margin, ry + f.h);
      const baseY = f.h <= 24 ? ry + 15 : ry + f.h / 2 + 4;
      doc.text(f.lineas, prodX, baseY);
      doc.text(String(f.it.cantidad), colCantR, baseY, { align: 'right' });
      doc.text('S/ ' + f.it.precioVenta.toFixed(2), colUnitR, baseY, { align: 'right' });
      doc.text('S/ ' + (f.it.precioVenta * f.it.cantidad).toFixed(2), colSubR, baseY, { align: 'right' });
      ry += f.h;
    });
  
    // ---------- Totales ----------
    let ty = ry + 24;
    doc.setFontSize(9.5); doc.setTextColor(...GRAY); doc.setFont(undefined, 'normal');
    const baseImponible = total - igv;
    doc.text('Subtotal', colCantR, ty); doc.text('S/ ' + baseImponible.toFixed(2), colSubR, ty, { align: 'right' });
    ty += 17;
    doc.text('IGV Incluido (18%)', colCantR, ty); doc.text('S/ ' + igv.toFixed(2), colSubR, ty, { align: 'right' });
    ty += 26;
    doc.setFillColor(...NAVY); doc.rect(colCantR - 12, ty - 19, (pageW - margin) - (colCantR - 12), 34, 'F');
    doc.setTextColor(...WHITE); doc.setFontSize(15); doc.setFont(undefined, 'bold');
    doc.text('TOTAL', colCantR, ty + 3);
    doc.setTextColor(...JADE_BRIGHT); doc.setFontSize(16);
    doc.text('S/ ' + total.toFixed(2), colSubR, ty + 3, { align: 'right' });
  
    // ---------- Pie: imagen única con el diseño final, pegada al fondo real de la hoja (bloques 5+6+7 = 69mm) ----------
    let fy = pageH - margin - footerImgH;
    try { doc.addImage('data:image/png;base64,' + FOOTER_IMG_B64, 'PNG', margin, fy, footerImgW, footerImgH); } catch (e) {}
  
    const numLimpio = String(numero).replace(/[^0-9]/g, '').padStart(4, '0');
    return { blob: doc.output('blob'), filename: `Cotizaci\u00f3n_N. ${numLimpio}.pdf`, doc: doc };
  }
  function fechaCorta_(fecha){
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return String(fecha||'');
    const dd = String(d.getDate()).padStart(2,'0'), mm = String(d.getMonth()+1).padStart(2,'0');
    return `${dd} / ${mm} / ${d.getFullYear()}`;
  }
  let _plantillaStickerImg = null;
  function cargarPlantillaSticker(){
    if (_plantillaStickerImg) return Promise.resolve(_plantillaStickerImg);
    return new Promise((resolve,reject)=>{
      const img = new Image();
      img.onload = () => { _plantillaStickerImg = img; resolve(img); };
      img.onerror = reject;
      img.src = 'data:image/webp;base64,' + STICKER_TEMPLATE_B64;
    });
  }
  // Coordenadas de las cajas de valor, medidas sobre la plantilla oficial (1024x1536 px).
  // La plantilla no se toca: solo se escribe texto dentro de estas cajas ya existentes.
  const STICKER_CAJAS = [
    { key:'fecha',         top:496,  bottom:563,  doble:false },
    { key:'aceite',        top:595,  bottom:660,  doble:false },
    { key:'cantidad',      top:694,  bottom:758,  doble:false },
    { key:'filtroAceite',  top:790,  bottom:856,  doble:false, check:true },
    { key:'filtroAire',    top:886,  bottom:952,  doble:false, check:true },
    { key:'km',            top:985,  bottom:1051, doble:false },
    { key:'proxCambio',    top:1085, bottom:1152, doble:false },
    { key:'observaciones', top:1184, bottom:1263, doble:true  },
  ];
  const STICKER_CAJA_X = 487, STICKER_CAJA_W = 452; // izquierda y ancho de todas las cajas de la plantilla
  function partirEnDosLineas_(ctx, texto, anchoDisponible){
    const palabras = texto.split(/\s+/);
    let l1='', l2='';
    for (const w of palabras) {
      const candidato = l1 ? l1+' '+w : w;
      if (ctx.measureText(candidato).width <= anchoDisponible || !l1) l1 = candidato;
      else l2 = l2 ? l2+' '+w : w;
    }
    return l2 ? [l1,l2] : [l1];
  }
  // Escribe el valor DENTRO de la caja: reduce la fuente automáticamente hasta que quepa
  // (y en la caja de Observaciones permite 2 líneas). Nunca se sale ni se corta.
  function dibujarTextoEnCaja_(ctx, texto, top, bottom, doble, dejarEspacioCheck){
    texto = String(texto||'').trim();
    if (!texto) return;
    const padX = 24;
    const anchoDisponible = STICKER_CAJA_W - padX*2 - (dejarEspacioCheck?54:0);
    const cx = STICKER_CAJA_X + padX;
    const midY = (top+bottom)/2;
    ctx.fillStyle = '#001737'; ctx.textAlign='left'; ctx.textBaseline='middle';
    let size = 30; const min = 16;
    ctx.font = `500 ${size}px Arial`;
    if (!doble) {
      while (ctx.measureText(texto).width > anchoDisponible && size > min) { size--; ctx.font = `500 ${size}px Arial`; }
      ctx.fillText(texto, cx, midY);
      return;
    }
    let partes = [texto];
    while (size > min) {
      ctx.font = `500 ${size}px Arial`;
      if (ctx.measureText(texto).width <= anchoDisponible) { partes = [texto]; break; }
      partes = partirEnDosLineas_(ctx, texto, anchoDisponible);
      if (partes.every(p => ctx.measureText(p).width <= anchoDisponible)) break;
      size--;
    }
    if (partes.length === 1) ctx.fillText(partes[0], cx, midY);
    else { ctx.fillText(partes[0], cx, midY - size*0.62); ctx.fillText(partes[1], cx, midY + size*0.62); }
  }
  function dibujarCheckSticker_(ctx, top, bottom){
    const cy = (top+bottom)/2, cxCheck = STICKER_CAJA_X + STICKER_CAJA_W - 45;
    ctx.beginPath(); ctx.arc(cxCheck, cy, 20, 0, Math.PI*2); ctx.fillStyle = '#1f9d6b'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.4; ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.beginPath(); ctx.moveTo(cxCheck-9,cy); ctx.lineTo(cxCheck-2,cy+8); ctx.lineTo(cxCheck+10,cy-9); ctx.stroke();
  }
  async function construirCanvasSticker(s){
    const img = await cargarPlantillaSticker();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0); // plantilla maestra, sin ningún cambio
    const datos = {
      fecha: fechaCorta_(s.fecha),
      aceite: s.aceite || '—',
      cantidad: s.cantidad || '—',
      filtroAceite: s.filtroAceite || 'No',
      filtroAire: s.filtroAire || 'No',
      km: s.km ? Number(s.km).toLocaleString('es-PE') : '—',
      proxCambio: s.proxCambio ? Number(s.proxCambio).toLocaleString('es-PE') : '—',
      observaciones: s.observaciones || '—',
    };
    STICKER_CAJAS.forEach(caja => {
      const esSi = caja.check && /^s[ií]$/i.test(String(datos[caja.key]).trim());
      dibujarTextoEnCaja_(ctx, esSi ? 'Sí' : datos[caja.key], caja.top, caja.bottom, caja.doble, caja.check);
      if (caja.check && esSi) dibujarCheckSticker_(ctx, caja.top, caja.bottom);
    });
    return canvas;
  }

  function soloDigitos_(v) { return String(v == null ? '' : v).replace(/[^\d]/g, ''); }
  function fechaDe_(f) { var s = String(f || ''); return new Date(s.length === 10 ? s + 'T12:00:00' : s); }
  /* Cotización de V19 → PDF de V18_4. Las cotizaciones migradas sin ítems no se pueden dibujar (no hay detalle estructurado). */
  function construirPDFCotizacion(c) {
    if (!window.jspdf) throw new Error('No se cargó la librería de PDF (jsPDF). Revisa tu conexión a internet y recarga la página.');
    if (!c.items || !c.items.length) throw new Error('Esta cotización viene de V18_4 sin ítems estructurados: no se puede generar el PDF.');
    var items = c.items.map(function (i) { return { nombre: i.nombre, cantidad: i.cantidad, precioVenta: Number(i.precio) }; }), total = Number(c.total), igv = total - total / 1.18;
    var fechaStr = fechaDe_(c.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
    return generarPDF(c.numero_formateado || c.numero, fechaStr, c.cliente || 'Cliente genérico', items, total, igv);
  }
  function cotizacionPDF(c) { var r = construirPDFCotizacion(c); return compartirArchivo(r.blob, r.filename, MENSAJE_WHATSAPP_DEFAULT, 'application/pdf'); }
  /* Servicio de V19 → datos del sticker de V18_4 (Km y próximo cambio solo dígitos, como en V18_4). */
  function servicioASticker(s) {
    return { fecha: s.fecha ? String(s.fecha).slice(0, 10) + 'T00:00:00' : '', aceite: s.aceite_utilizado, cantidad: s.cantidad_aceite, filtroAceite: s.filtro_aceite, filtroAire: s.filtro_aire,
      km: soloDigitos_(s.kilometraje_actual), proxCambio: soloDigitos_(s.proximo_cambio), observaciones: s.observaciones, placa: s.placa };
  }
  async function stickerPNG(s) { var canvas = await construirCanvasSticker(servicioASticker(s)); return new Promise(function (res) { canvas.toBlob(res, 'image/png'); }); }
  async function sticker(s) {
    var blob = await stickerPNG(s), placa = (s.placa || '').toString().trim().toUpperCase().replace(/\s+/g, '');
    return compartirArchivo(blob, placa ? 'iMotor_Care_' + placa + '_Proximo_Cambio.png' : 'iMotor_Care_Proximo_Cambio.png', MENSAJE_WHATSAPP_DEFAULT, 'image/png');
  }
  return { cotizacionPDF: cotizacionPDF, construirPDFCotizacion: construirPDFCotizacion, sticker: sticker, stickerPNG: stickerPNG, servicioASticker: servicioASticker, construirCanvasSticker: construirCanvasSticker };
})();
