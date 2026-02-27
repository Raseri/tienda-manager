// repartidor.js — Módulo del Repartidor (Vista de Entregas)
import './repartidor.css';
import { getCurrentUser } from '../../services/authService.js';

const API = 'http://localhost:3000/api';
let repMap = null;
let repLeafletReady = false;
let repPedidos = [];
let repTabActual = 'pendiente';
const repMarkers = {};

// =====================================================================
// RENDER PRINCIPAL
// =====================================================================
export function renderRepartidor(container) {
    container.innerHTML = '';
    const user = getCurrentUser();

    container.innerHTML =
        '<div class="rep-container">' +
        '<div class="rep-header">' +
        '<div class="rep-header-info">' +
        '<h3>🛵 Panel del Repartidor</h3>' +
        '<p>Acepta y gestiona tus entregas del día</p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;">' +
        '<button id="rep-refresh" style="padding:9px 14px;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-lg);color:var(--text-secondary);font-family:var(--font-family);font-size:13px;cursor:pointer;">🔄 Actualizar</button>' +
        '</div>' +
        '</div>' +

        '<div class="rep-stats">' +
        '<div class="rstat"><span class="rstat-val" id="rstat-pend">0</span><span class="rstat-lbl">Disponibles</span></div>' +
        '<div class="rstat"><span class="rstat-val" id="rstat-camino">0</span><span class="rstat-lbl">En camino</span></div>' +
        '<div class="rstat"><span class="rstat-val" id="rstat-hoy">0</span><span class="rstat-lbl">Hoy entregados</span></div>' +
        '</div>' +

        '<div class="rep-body">' +
        '<div class="rep-mapa-card">' +
        '<div class="rep-mapa-title">🗺️ Pedidos activos — haz clic en 📦 para ver detalles</div>' +
        '<div id="rep-map"></div>' +
        '</div>' +

        '<div class="rep-panel">' +
        '<div class="rep-tabs">' +
        '<button class="rtab activo" data-tab="pendiente">📋 Pendientes</button>' +
        '<button class="rtab" data-tab="en_camino">🛵 Mis rutas</button>' +
        '<button class="rtab" data-tab="entregado">✅ Historial</button>' +
        '</div>' +
        '<div class="rep-lista" id="rep-lista"></div>' +
        '</div>' +
        '</div>' +
        '</div>';

    // Botón refresh
    container.querySelector('#rep-refresh').addEventListener('click', cargarPedidosRep);

    // Tabs
    container.querySelectorAll('.rtab').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.rtab').forEach(b => b.classList.remove('activo'));
            btn.classList.add('activo');
            repTabActual = btn.dataset.tab;
            renderListaRep();
        });
    });

    // Cargar mapa y datos
    cargarLeafletRep().then(() => {
        setTimeout(() => {
            inicializarMapaRep();
            if (repMap) repMap.invalidateSize();
        }, 150);
    });
    cargarPedidosRep();
}

// =====================================================================
// CARGAR PEDIDOS
// =====================================================================
async function cargarPedidosRep() {
    const user = getCurrentUser();
    try {
        const r = await fetch(API + '/pedidos?rol=repartidor&id=' + (user?.id || 3));
        if (r.ok) {
            const j = await r.json();
            repPedidos = j.data || [];
        } else throw new Error();
    } catch {
        // Leer de localStorage (compartido con envios.js)
        try {
            const raw = localStorage.getItem('tienda_pedidos_demo');
            repPedidos = raw ? JSON.parse(raw) : [];
        } catch { repPedidos = []; }
    }
    actualizarEstadisticasRep();
    renderListaRep();
    if (repMap) renderMarcadoresRep();
}

// =====================================================================
// ESTADÍSTICAS
// =====================================================================
function actualizarEstadisticasRep() {
    const el = id => document.querySelector('#' + id);
    const disponibles = repPedidos.filter(p => p.estado === 'pendiente');
    const camino = repPedidos.filter(p => p.estado === 'en_camino');
    const hoy = repPedidos.filter(p => p.estado === 'entregado');
    if (el('rstat-pend')) el('rstat-pend').textContent = disponibles.length;
    if (el('rstat-camino')) el('rstat-camino').textContent = camino.length;
    if (el('rstat-hoy')) el('rstat-hoy').textContent = hoy.length;
}

// =====================================================================
// LISTA
// =====================================================================
function renderListaRep() {
    const lista = document.querySelector('#rep-lista');
    if (!lista) return;

    const filtrados = repPedidos.filter(p => p.estado === repTabActual);

    if (!filtrados.length) {
        lista.innerHTML =
            '<div class="rep-empty">' +
            '<span class="rep-empty-icon">' + (repTabActual === 'pendiente' ? '📭' : repTabActual === 'en_camino' ? '🛵' : '✅') + '</span>' +
            '<p>' + (repTabActual === 'pendiente' ? 'No hay pedidos pendientes. ¡Revisa en unos momentos!' : repTabActual === 'en_camino' ? 'No tienes rutas activas' : 'Sin entregas completadas hoy') + '</p>' +
            '</div>';
        return;
    }

    lista.innerHTML = '';
    filtrados.forEach(p => {
        const card = document.createElement('div');
        card.className = 'rep-card';

        const prodHtml = (p.productos || [])
            .map(pr => '<span>📦 ' + pr.nombre + ' ×' + pr.cantidad + ' — $' + parseFloat(pr.subtotal || (pr.precio_unitario * pr.cantidad)).toFixed(2) + '</span>')
            .join('');

        card.innerHTML =
            '<div class="rep-card-top">' +
            '<div>' +
            '<div class="rep-folio">' + p.folio + '</div>' +
            '<div class="rep-cliente">' + p.cliente_nombre + '</div>' +
            (p.cliente_telefono ? '<div style="font-size:12px;color:var(--text-tertiary);">📞 ' + p.cliente_telefono + '</div>' : '') +
            '</div>' +
            '<span class="rep-badge ' + p.estado + '">' + badgeEstado(p.estado) + '</span>' +
            '</div>' +
            '<p class="rep-dir">📍 ' + p.cliente_direccion + '</p>' +
            '<div class="rep-prods">' + (prodHtml || '<span style="color:var(--text-tertiary);">Sin detalle de productos</span>') + '</div>' +
            '<p class="rep-total">Total: $' + parseFloat(p.total).toFixed(2) + ' · ' + iconMetodoRep(p.metodo_pago) + ' ' + (p.metodo_pago || 'efectivo') + '</p>' +
            '<div class="rep-actions">' +
            (p.estado === 'pendiente' ?
                '<button class="rep-btn primary btn-aceptar" data-id="' + p.id + '">✅ Aceptar entrega</button>' : '') +
            (p.estado === 'en_camino' ?
                '<button class="rep-btn nav btn-navegar" data-lat="' + p.cliente_lat + '" data-lng="' + p.cliente_lng + '">🧭 Navegar</button>' +
                '<button class="rep-btn success btn-entregar" data-id="' + p.id + '">📦 Confirmar entrega</button>' : '') +
            (p.estado !== 'entregado' ?
                '<button class="rep-btn btn-ver-en-mapa" data-id="' + p.id + '">🎯 Ver mapa</button>' : '') +
            '</div>';

        // Listeners
        const bAceptar = card.querySelector('.btn-aceptar');
        if (bAceptar) bAceptar.addEventListener('click', () => aceptarEntrega(p.id));

        const bNavegar = card.querySelector('.btn-navegar');
        if (bNavegar) bNavegar.addEventListener('click', (e) => {
            const lat = e.target.dataset.lat, lng = e.target.dataset.lng;
            window.open('https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng + '&travelmode=driving', '_blank');
        });

        const bEntregar = card.querySelector('.btn-entregar');
        if (bEntregar) bEntregar.addEventListener('click', () => mostrarModalEntrega(p));

        const bVerMapa = card.querySelector('.btn-ver-en-mapa');
        if (bVerMapa) bVerMapa.addEventListener('click', () => {
            if (repMap && p.cliente_lat) {
                repMap.flyTo([p.cliente_lat, p.cliente_lng], 16, { animate: true, duration: 0.6 });
                if (repMarkers[p.id]) repMarkers[p.id].openPopup();
            }
        });

        lista.appendChild(card);
    });
}

function badgeEstado(e) {
    return { pendiente: '⏳ Pendiente', en_camino: '🛵 En camino', entregado: '✅ Entregado' }[e] || e;
}
function iconMetodoRep(m) {
    return { efectivo: '💵', tarjeta: '💳', transferencia: '🏦' }[m] || '💵';
}

// =====================================================================
// ACEPTAR ENTREGA → estado en_camino
// =====================================================================
async function aceptarEntrega(id) {
    const user = getCurrentUser();
    try {
        await fetch(API + '/pedidos/' + id + '/estado', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'en_camino', repartidor_id: user?.id || 3 })
        });
    } catch { /* offline */ }

    // Actualizar demo
    repPedidos = repPedidos.map(p => p.id === id ? { ...p, estado: 'en_camino', repartidor_id: user?.id || 3 } : p);
    try { localStorage.setItem('tienda_pedidos_demo', JSON.stringify(repPedidos)); } catch { /* ok */ }
    actualizarEstadisticasRep();
    renderListaRep();
    renderMarcadoresRep();
}

// =====================================================================
// MODAL DE CONFIRMACIÓN DE ENTREGA
// =====================================================================
function mostrarModalEntrega(pedido) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;';

    const prodChecks = (pedido.productos || []).map((pr, i) =>
        '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg-primary);border-radius:var(--radius-md);cursor:pointer;">' +
        '<input type="checkbox" id="chk-' + i + '" style="width:18px;height:18px;accent-color:#22c55e;" checked />' +
        '<span style="font-size:13px;color:var(--text-primary);">' + pr.nombre + ' ×' + pr.cantidad + '</span>' +
        '<span style="margin-left:auto;font-size:13px;font-weight:700;color:var(--color-primary);">$' + parseFloat(pr.subtotal || pr.precio_unitario * pr.cantidad).toFixed(2) + '</span>' +
        '</label>'
    ).join('');

    overlay.innerHTML =
        '<div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-xl);padding:24px;width:100%;max-width:440px;box-shadow:var(--shadow-xl);">' +
        '<div style="text-align:center;margin-bottom:16px;"><span style="font-size:3rem;">📦</span></div>' +
        '<h3 style="margin:0 0 4px;text-align:center;color:var(--text-primary);">Confirmar Entrega</h3>' +
        '<p style="text-align:center;font-size:13px;color:var(--text-secondary);margin:0 0 20px;">' + pedido.cliente_nombre + ' · ' + pedido.folio + '</p>' +

        '<div style="margin-bottom:16px;">' +
        '<p style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:10px;">✅ ¿Se entregaron todos los productos?</p>' +
        '<div style="display:flex;flex-direction:column;gap:8px;">' + prodChecks + '</div>' +
        '</div>' +

        '<div style="margin-bottom:20px;">' +
        '<p style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">Método de pago cobrado:</p>' +
        '<select id="me-pago" style="width:100%;padding:10px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-md);color:var(--text-primary);font-family:var(--font-family);font-size:14px;">' +
        '<option value="efectivo" ' + (pedido.metodo_pago === 'efectivo' ? 'selected' : '') + '>💵 Efectivo</option>' +
        '<option value="tarjeta" ' + (pedido.metodo_pago === 'tarjeta' ? 'selected' : '') + '>💳 Tarjeta</option>' +
        '<option value="transferencia" ' + (pedido.metodo_pago === 'transferencia' ? 'selected' : '') + '>🏦 Transferencia</option>' +
        '</select>' +
        '</div>' +

        '<div style="background:var(--bg-primary);border-radius:var(--radius-md);padding:12px 16px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">' +
        '<span style="font-size:14px;color:var(--text-secondary);">Total cobrado:</span>' +
        '<span style="font-size:20px;font-weight:700;color:#22c55e;">$' + parseFloat(pedido.total).toFixed(2) + '</span>' +
        '</div>' +

        '<div style="display:flex;gap:12px;">' +
        '<button id="me-cancel" style="flex:1;padding:12px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:var(--radius-lg);color:var(--text-secondary);font-family:var(--font-family);font-size:14px;cursor:pointer;">Cancelar</button>' +
        '<button id="me-confirm" style="flex:2;padding:12px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:var(--radius-lg);color:white;font-family:var(--font-family);font-size:14px;font-weight:700;cursor:pointer;">✅ Confirmar Entrega</button>' +
        '</div>' +
        '</div>';

    document.body.appendChild(overlay);

    overlay.querySelector('#me-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#me-confirm').addEventListener('click', async () => {
        const metodoPago = overlay.querySelector('#me-pago').value;
        const user = getCurrentUser();
        overlay.querySelector('#me-confirm').textContent = '⏳ Procesando...';
        overlay.querySelector('#me-confirm').disabled = true;

        try {
            const r = await fetch(API + '/pedidos/' + pedido.id + '/entregar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repartidor_id: user?.id || 3, metodo_pago: metodoPago })
            });
            if (r.ok) {
                const j = await r.json();
                console.log('Venta registrada:', j.data?.venta_folio);
            }
        } catch { /* offline */ }

        // Actualizar demo local
        repPedidos = repPedidos.map(p => p.id === pedido.id ? { ...p, estado: 'entregado', metodo_pago: metodoPago } : p);
        try { localStorage.setItem('tienda_pedidos_demo', JSON.stringify(repPedidos)); } catch { /* ok */ }
        actualizarEstadisticasRep();
        repTabActual = 'entregado';
        document.querySelectorAll('.rtab').forEach(b => b.classList.toggle('activo', b.dataset.tab === 'entregado'));
        renderListaRep();
        renderMarcadoresRep();
        overlay.remove();

        // Notificación
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#22c55e;color:white;padding:14px 20px;border-radius:var(--radius-lg);font-weight:600;font-size:14px;z-index:3000;box-shadow:0 8px 24px rgba(34,197,94,0.4);animation:slideUp 0.3s ease;font-family:var(--font-family);';
        toast.textContent = '✅ Entrega confirmada. ¡Stock actualizado!';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    });
}

// =====================================================================
// MAPA LEAFLET
// =====================================================================
function cargarLeafletRep() {
    if (repLeafletReady && window.L) return Promise.resolve();
    return new Promise((resolve, reject) => {
        if (!document.querySelector('#leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css'; link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }
        if (!document.querySelector('#leaflet-js')) {
            const s = document.createElement('script');
            s.id = 'leaflet-js'; s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            s.onload = () => { repLeafletReady = true; resolve(); };
            s.onerror = reject;
            document.head.appendChild(s);
        } else if (window.L) {
            repLeafletReady = true; resolve();
        } else {
            document.querySelector('#leaflet-js').addEventListener('load', () => { repLeafletReady = true; resolve(); });
        }
    });
}

function inicializarMapaRep() {
    const el = document.querySelector('#rep-map');
    if (!el || !window.L) return;
    if (repMap) { repMap.remove(); repMap = null; }

    repMap = window.L.map('rep-map', {
        center: [19.0413, -98.2062],
        zoom: 12,
        scrollWheelZoom: true
    });
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19
    }).addTo(repMap);

    if (repPedidos.length) renderMarcadoresRep();
}

function renderMarcadoresRep() {
    if (!repMap || !window.L) return;
    Object.values(repMarkers).forEach(m => repMap.removeLayer(m));
    Object.keys(repMarkers).forEach(k => delete repMarkers[k]);

    const activos = repPedidos.filter(p => ['pendiente', 'en_camino'].includes(p.estado) && p.cliente_lat);

    activos.forEach(p => {
        const color = p.estado === 'en_camino' ? '#3b82f6' : '#f59e0b';
        const icon = window.L.divIcon({
            html:
                '<div style="position:relative;width:42px;height:42px;">' +
                '<div style="width:42px;height:42px;background:' + color + ';border-radius:50%;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:20px;">📦</div>' +
                (p.estado === 'en_camino' ? '<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;background:#22c55e;border-radius:50%;border:2px solid white;"></div>' : '') +
                '</div>',
            iconSize: [42, 42],
            iconAnchor: [21, 42],
            popupAnchor: [0, -46],
            className: ''
        });

        const prodsList = (p.productos || []).map(pr => '<span style="display:block;">📦 ' + pr.nombre + ' ×' + pr.cantidad + '</span>').join('');
        const popupContent =
            '<div style="font-family:inherit;min-width:200px;">' +
            '<p style="font-weight:700;margin:0 0 4px;font-size:14px;">' + p.cliente_nombre + '</p>' +
            '<p style="font-size:12px;color:#666;margin:0 0 8px;">📍 ' + p.cliente_direccion + '</p>' +
            '<div style="font-size:12px;margin-bottom:8px;line-height:1.6;">' + prodsList + '</div>' +
            '<p style="font-weight:700;margin:0 0 10px;">$' + parseFloat(p.total).toFixed(2) + '</p>' +
            (p.estado === 'pendiente' ?
                '<button class="popup-aceptar" data-id="' + p.id + '" style="width:100%;padding:8px;background:#f59e0b;border:none;border-radius:8px;color:white;font-weight:700;cursor:pointer;font-size:13px;">✅ Aceptar entrega</button>' :
                '<a href="https://www.google.com/maps/dir/?api=1&destination=' + p.cliente_lat + ',' + p.cliente_lng + '&travelmode=driving" target="_blank" style="display:block;text-align:center;padding:8px;background:#3b82f6;border-radius:8px;color:white;font-weight:700;font-size:13px;text-decoration:none;">🧭 Abrir GPS</a>'
            ) +
            '</div>';

        const marker = window.L.marker([p.cliente_lat, p.cliente_lng], { icon })
            .bindPopup(window.L.popup({ maxWidth: 250 }).setContent(popupContent))
            .addTo(repMap);

        // Listener en popup (botón aceptar dentro del popup)
        marker.on('popupopen', () => {
            const btn = document.querySelector('.popup-aceptar[data-id="' + p.id + '"]');
            if (btn) btn.addEventListener('click', () => { aceptarEntrega(p.id); marker.closePopup(); });
        });

        repMarkers[p.id] = marker;
    });
}

// =====================================================================
// CLEANUP
// =====================================================================
export function cleanupRepartidor() {
    if (repMap) { repMap.remove(); repMap = null; }
    Object.keys(repMarkers).forEach(k => delete repMarkers[k]);
    repPedidos = [];
}
